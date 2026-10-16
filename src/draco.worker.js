// Classic (non-module) Web Worker so the Emscripten Draco decoder can be
// loaded with importScripts(). Decoding runs off the main thread.

const DECODER_PATH = './thirdParty/draco/javascript/';

const DRACO_DATA_TYPE = {
  INVALID: 0,
  INT8: 1,
  UINT8: 2,
  INT16: 3,
  UINT16: 4,
  INT32: 5,
  UINT32: 6,
  INT64: 7,
  UINT64: 8,
  FLOAT32: 9,
  FLOAT64: 10,
  BOOL: 11,
};

const WEBGL_COMPONENT_TYPE = {
  Int8Array: 0x1400,
  Uint8Array: 0x1401,
  Int16Array: 0x1402,
  Uint16Array: 0x1403,
  Int32Array: 0x1404,
  Uint32Array: 0x1405,
  Float32Array: 0x1406,
  Float64Array: 0x140a,
};

const COMPONENT_TYPE_SIZE_IN_BYTES = {
  0x1400: 1,
  0x1401: 1,
  0x1402: 2,
  0x1403: 2,
  0x1404: 4,
  0x1405: 4,
  0x1406: 4,
  0x140a: 8,
};

function defined(value) {
  return value !== undefined && value !== null;
}

function componentDatatypeFromTypedArray(array) {
  return WEBGL_COMPONENT_TYPE[array.constructor.name];
}

function getSizeInBytes(componentDatatype) {
  const size = COMPONENT_TYPE_SIZE_IN_BYTES[componentDatatype];
  if (size === undefined) {
    throw new Error('componentDatatype is not a valid value.');
  }
  return size;
}

let decoderModulePromise;

function loadDecoderModule() {
  if (!decoderModulePromise) {
    decoderModulePromise = (async () => {
      if (typeof WebAssembly === 'object') {
        importScripts(DECODER_PATH + 'draco_wasm_wrapper.js');
        const wasmBinary = await (await fetch(DECODER_PATH + 'draco_decoder.wasm')).arrayBuffer();
        return DracoDecoderModule({ wasmBinary });
      }
      importScripts(DECODER_PATH + 'draco_decoder.js');
      return DracoDecoderModule({});
    })();
  }
  return decoderModulePromise;
}

/**
 * Copies a WASM-heap array into a new, JS-owned typed array, then frees the
 * heap allocation.
 */
function copyFromHeap(module, ptr, TypedArray, length) {
  // Read HEAPU8.buffer only after decoding: memory growth replaces it.
  const array = new TypedArray(module.HEAPU8.buffer, ptr, length).slice();
  module._free(ptr);
  return array;
}

function decodeAttribute(module, dracoGeometry, dracoDecoder, dracoAttribute, attributeName) {
  const numPoints = dracoGeometry.num_points();
  const numComponents = dracoAttribute.num_components();

  let quantization;
  let transform = new module.AttributeQuantizationTransform();
  if (transform.InitFromAttribute(dracoAttribute)) {
    const minValues = new Array(numComponents);
    for (let i = 0; i < numComponents; ++i) {
      minValues[i] = transform.min_value(i);
    }
    quantization = {
      quantizationBits: transform.quantization_bits(),
      minValues: minValues,
      range: transform.range(),
      octEncoded: false,
    };
  }
  module.destroy(transform);

  transform = new module.AttributeOctahedronTransform();
  if (transform.InitFromAttribute(dracoAttribute)) {
    quantization = {
      quantizationBits: transform.quantization_bits(),
      octEncoded: true,
    };
  }
  module.destroy(transform);

  const vertexArrayLength = numPoints * numComponents;
  let vertexArray;
  if (defined(quantization)) {
    vertexArray = decodeQuantizedDracoTypedArray(
      module,
      dracoGeometry,
      dracoDecoder,
      dracoAttribute,
      quantization,
      vertexArrayLength
    );
  } else {
    vertexArray = decodeDracoTypedArray(
      module,
      dracoGeometry,
      dracoDecoder,
      dracoAttribute,
      vertexArrayLength,
      attributeName
    );
  }

  const componentDatatype = componentDatatypeFromTypedArray(vertexArray);

  return {
    array: vertexArray,
    data: {
      componentsPerAttribute: numComponents,
      componentDatatype: componentDatatype,
      byteOffset: dracoAttribute.byte_offset(),
      byteStride: getSizeInBytes(componentDatatype) * numComponents,
      normalized: dracoAttribute.normalized(),
      quantization: quantization,
    },
  };
}

async function decodePrimitive(typedArray, compressedAttributes, useDefaultAttributeId) {
  const module = await loadDecoderModule();
  const decoder = new module.Decoder();

  const buffer = new module.DecoderBuffer();
  buffer.Init(typedArray, typedArray.length);

  const geometryType = decoder.GetEncodedGeometryType(buffer);

  let dracoGeometry;
  let status;
  if (geometryType === module.TRIANGULAR_MESH) {
    dracoGeometry = new module.Mesh();
    status = decoder.DecodeBufferToMesh(buffer, dracoGeometry);
  } else if (geometryType === module.POINT_CLOUD) {
    dracoGeometry = new module.PointCloud();
    status = decoder.DecodeBufferToPointCloud(buffer, dracoGeometry);
  } else {
    throw new Error(`unknown Draco geometry type: ${geometryType}.`);
  }

  if (!status.ok() || dracoGeometry.ptr === 0) {
    throw new Error('Error decoding draco mesh geometry: ' + status.error_msg());
  }

  module.destroy(buffer);

  const attributeData = {};

  if (useDefaultAttributeId) {
    const defaultAttributeNames = ['POSITION', 'NORMAL', 'COLOR', 'TEX_COORD', 'GENERIC'];

    for (const defaultAttributeName of defaultAttributeNames) {
      const attributeID = decoder.GetAttributeId(dracoGeometry, module[defaultAttributeName]);
      if (attributeID === -1) {
        continue;
      }
      const dracoAttribute = decoder.GetAttribute(dracoGeometry, attributeID);
      attributeData[defaultAttributeName] = decodeAttribute(module, dracoGeometry, decoder, dracoAttribute, defaultAttributeName);
    }
  } else if (compressedAttributes) {
    for (const attributeName in compressedAttributes) {
      if (Object.prototype.hasOwnProperty.call(compressedAttributes, attributeName)) {
        const compressedAttribute = compressedAttributes[attributeName];
        const dracoAttribute = decoder.GetAttributeByUniqueId(dracoGeometry, compressedAttribute);
        attributeData[attributeName] = decodeAttribute(module, dracoGeometry, decoder, dracoAttribute, attributeName);
      }
    }
  }

  const result = {
    geometryType: geometryType === module.TRIANGULAR_MESH ? 'TRIANGULAR_MESH' : 'POINT_CLOUD',
    attributeData: attributeData,
    indexArray: undefined,
  };
  if (geometryType === module.TRIANGULAR_MESH) {
    result.indexArray = decodeIndexArray(module, dracoGeometry, decoder);
  }

  module.destroy(dracoGeometry);
  module.destroy(decoder);

  const loggedResult = {
    geometryType: result.geometryType,
    attributeData: {},
  };
  for (const attributeName in result.attributeData) {
    if (Object.prototype.hasOwnProperty.call(result.attributeData, attributeName)) {
      const attribute = result.attributeData[attributeName];
      loggedResult.attributeData[attributeName] = {
        array: attribute.array.slice(0, 100),
        data: attribute.data,
      };
    }
  }
  if (result.indexArray) {
    loggedResult.indexArray = {
      numberOfIndices: result.indexArray.numberOfIndices,
      typedArray: result.indexArray.typedArray.slice(0, 100),
    };
  }
  console.log(`draco primitive:`, loggedResult);

  return result;
}

/**
 * Decodes all values of an attribute into the WASM heap with one bulk call,
 * then copies it into a JS-owned typed array.
 */
function getAttributeDataArray(module, dracoGeometry, dracoDecoder, dracoAttribute, dracoDataType, TypedArray, vertexArrayLength) {
  const byteLength = vertexArrayLength * TypedArray.BYTES_PER_ELEMENT;
  const ptr = module._malloc(byteLength);
  const ok = dracoDecoder.GetAttributeDataArrayForAllPoints(dracoGeometry, dracoAttribute, dracoDataType, byteLength, ptr);
  if (!ok) {
    module._free(ptr);
    throw new Error('Failed to decode draco attribute data.');
  }
  return copyFromHeap(module, ptr, TypedArray, vertexArrayLength);
}

function decodeQuantizedDracoTypedArray(module, dracoGeometry, dracoDecoder, dracoAttribute, quantization, vertexArrayLength) {
  let dracoDataType;
  let TypedArray;
  if (quantization.quantizationBits <= 8) {
    dracoDataType = module.DT_UINT8;
    TypedArray = Uint8Array;
  } else if (quantization.quantizationBits <= 16) {
    dracoDataType = module.DT_UINT16;
    TypedArray = Uint16Array;
  } else {
    dracoDataType = module.DT_FLOAT32;
    TypedArray = Float32Array;
  }

  return getAttributeDataArray(module, dracoGeometry, dracoDecoder, dracoAttribute, dracoDataType, TypedArray, vertexArrayLength);
}

function decodeDracoTypedArray(module, dracoGeometry, dracoDecoder, dracoAttribute, vertexArrayLength, attributeName) {
  let dracoDataType;
  let TypedArray;

  switch (dracoAttribute.data_type()) {
    case DRACO_DATA_TYPE.INVALID:
      console.warn(attributeName, 'data type is 0');
      return new Uint8Array(vertexArrayLength);
    case DRACO_DATA_TYPE.INT8:
    case DRACO_DATA_TYPE.BOOL:
      dracoDataType = module.DT_INT8;
      TypedArray = Int8Array;
      break;
    case DRACO_DATA_TYPE.UINT8:
      dracoDataType = module.DT_UINT8;
      TypedArray = Uint8Array;
      break;
    case DRACO_DATA_TYPE.INT16:
      dracoDataType = module.DT_INT16;
      TypedArray = Int16Array;
      break;
    case DRACO_DATA_TYPE.UINT16:
      dracoDataType = module.DT_UINT16;
      TypedArray = Uint16Array;
      break;
    case DRACO_DATA_TYPE.INT32:
    case DRACO_DATA_TYPE.INT64:
      dracoDataType = module.DT_INT32;
      TypedArray = Int32Array;
      break;
    case DRACO_DATA_TYPE.UINT32:
    case DRACO_DATA_TYPE.UINT64:
      dracoDataType = module.DT_UINT32;
      TypedArray = Uint32Array;
      break;
    case DRACO_DATA_TYPE.FLOAT32:
    case DRACO_DATA_TYPE.FLOAT64:
      dracoDataType = module.DT_FLOAT32;
      TypedArray = Float32Array;
      break;
    default:
      throw new Error(`unknown Draco data type of ${attributeName}: ${dracoAttribute.data_type()}.`);
  }

  return getAttributeDataArray(module, dracoGeometry, dracoDecoder, dracoAttribute, dracoDataType, TypedArray, vertexArrayLength);
}

function decodeIndexArray(module, dracoGeometry, dracoDecoder) {
  const numPoints = dracoGeometry.num_points();
  const numFaces = dracoGeometry.num_faces();
  const numIndices = numFaces * 3;

  const use32Bit = numPoints >= 64 * 1024;
  const TypedArray = use32Bit ? Uint32Array : Uint16Array;
  const byteLength = numIndices * TypedArray.BYTES_PER_ELEMENT;
  const ptr = module._malloc(byteLength);
  const ok = use32Bit
    ? dracoDecoder.GetTrianglesUInt32Array(dracoGeometry, byteLength, ptr)
    : dracoDecoder.GetTrianglesUInt16Array(dracoGeometry, byteLength, ptr);
  if (!ok) {
    module._free(ptr);
    throw new Error('Failed to decode draco index data.');
  }

  return {
    typedArray: copyFromHeap(module, ptr, TypedArray, numIndices),
    numberOfIndices: numIndices,
  };
}

onmessage = async function(event) {
  const { id, typedArray, compressedAttributes, useDefaultAttributeId } = event.data;
  try {
    const result = await decodePrimitive(typedArray, compressedAttributes, useDefaultAttributeId);

    const transfer = [];
    for (const attributeName in result.attributeData) {
      const array = result.attributeData[attributeName].array;
      if (array && array.buffer) {
        transfer.push(array.buffer);
      }
    }
    if (result.indexArray && result.indexArray.typedArray) {
      transfer.push(result.indexArray.typedArray.buffer);
    }

    postMessage({ id, result }, transfer);
  } catch (error) {
    postMessage({ id, error: error && error.message ? error.message : String(error) });
  }
};
