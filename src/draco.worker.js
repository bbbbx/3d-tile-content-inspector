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

function createIndexTypedArray(numberOfVertices, length) {
  if (numberOfVertices >= 64 * 1024) {
    return new Uint32Array(length);
  }
  return new Uint16Array(length);
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

function fillTypedArray(attributeData, vertexArray, length) {
  for (let i = 0; i < length; ++i) {
    vertexArray[i] = attributeData.GetValue(i);
  }
}

function decodeQuantizedDracoTypedArray(module, dracoGeometry, dracoDecoder, dracoAttribute, quantization, vertexArrayLength) {
  let vertexArray;
  let attributeData;
  if (quantization.quantizationBits <= 8) {
    attributeData = new module.DracoUInt8Array();
    vertexArray = new Uint8Array(vertexArrayLength);
    dracoDecoder.GetAttributeUInt8ForAllPoints(dracoGeometry, dracoAttribute, attributeData);
  } else if (quantization.quantizationBits <= 16) {
    attributeData = new module.DracoUInt16Array();
    vertexArray = new Uint16Array(vertexArrayLength);
    dracoDecoder.GetAttributeUInt16ForAllPoints(dracoGeometry, dracoAttribute, attributeData);
  } else {
    attributeData = new module.DracoFloat32Array();
    vertexArray = new Float32Array(vertexArrayLength);
    dracoDecoder.GetAttributeFloatForAllPoints(dracoGeometry, dracoAttribute, attributeData);
  }

  fillTypedArray(attributeData, vertexArray, vertexArrayLength);

  module.destroy(attributeData);
  return vertexArray;
}

function decodeDracoTypedArray(module, dracoGeometry, dracoDecoder, dracoAttribute, vertexArrayLength, attributeName) {
  let vertexArray;
  let attributeData;

  switch (dracoAttribute.data_type()) {
    case DRACO_DATA_TYPE.INVALID:
      console.warn(attributeName, 'data type is 0');
      return new Uint8Array(new Array(vertexArrayLength).fill(0));
    case DRACO_DATA_TYPE.INT8:
    case DRACO_DATA_TYPE.BOOL:
      attributeData = new module.DracoInt8Array();
      vertexArray = new Int8Array(vertexArrayLength);
      dracoDecoder.GetAttributeInt8ForAllPoints(dracoGeometry, dracoAttribute, attributeData);
      break;
    case DRACO_DATA_TYPE.UINT8:
      attributeData = new module.DracoUInt8Array();
      vertexArray = new Uint8Array(vertexArrayLength);
      dracoDecoder.GetAttributeUInt8ForAllPoints(dracoGeometry, dracoAttribute, attributeData);
      break;
    case DRACO_DATA_TYPE.INT16:
      attributeData = new module.DracoInt16Array();
      vertexArray = new Int16Array(vertexArrayLength);
      dracoDecoder.GetAttributeInt16ForAllPoints(dracoGeometry, dracoAttribute, attributeData);
      break;
    case DRACO_DATA_TYPE.UINT16:
      attributeData = new module.DracoUInt16Array();
      vertexArray = new Uint16Array(vertexArrayLength);
      dracoDecoder.GetAttributeUInt16ForAllPoints(dracoGeometry, dracoAttribute, attributeData);
      break;
    case DRACO_DATA_TYPE.INT32:
    case DRACO_DATA_TYPE.INT64:
      attributeData = new module.DracoInt32Array();
      vertexArray = new Int32Array(vertexArrayLength);
      dracoDecoder.GetAttributeInt32ForAllPoints(dracoGeometry, dracoAttribute, attributeData);
      break;
    case DRACO_DATA_TYPE.UINT32:
    case DRACO_DATA_TYPE.UINT64:
      attributeData = new module.DracoUInt32Array();
      vertexArray = new Uint32Array(vertexArrayLength);
      dracoDecoder.GetAttributeUInt32ForAllPoints(dracoGeometry, dracoAttribute, attributeData);
      break;
    case DRACO_DATA_TYPE.FLOAT32:
    case DRACO_DATA_TYPE.FLOAT64:
      attributeData = new module.DracoFloat32Array();
      vertexArray = new Float32Array(vertexArrayLength);
      dracoDecoder.GetAttributeFloatForAllPoints(dracoGeometry, dracoAttribute, attributeData);
      break;
  }

  fillTypedArray(attributeData, vertexArray, vertexArrayLength);

  module.destroy(attributeData);
  return vertexArray;
}

function decodeIndexArray(module, dracoGeometry, dracoDecoder) {
  const numPoints = dracoGeometry.num_points();
  const numFaces = dracoGeometry.num_faces();
  const faceIndices = new module.DracoInt32Array();
  const numIndices = numFaces * 3;
  const indexArray = createIndexTypedArray(numPoints, numIndices);

  let offset = 0;
  for (let i = 0; i < numFaces; ++i) {
    dracoDecoder.GetFaceFromMesh(dracoGeometry, i, faceIndices);

    indexArray[offset + 0] = faceIndices.GetValue(0);
    indexArray[offset + 1] = faceIndices.GetValue(1);
    indexArray[offset + 2] = faceIndices.GetValue(2);
    offset += 3;
  }

  module.destroy(faceIndices);

  return {
    typedArray: indexArray,
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
