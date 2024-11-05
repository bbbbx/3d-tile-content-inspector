import defined from "./defined.js";
import ComponentDatatype from "./ComponentDatatype.js";
import { IndexDatatype } from "./IndexDatatype.js";

function createDecoderModule() {
  return DracoDecoderModule({});
}

function loadJavaScriptFile(path) {
  return new Promise((resolve) => {
    const head = document.getElementsByTagName('head')[0];
    const element = document.createElement('script');
    element.type = 'text/javascript';
    element.src = path;
    element.onload = () => resolve();

    head.appendChild(element);
  });
}

const decoderPath = './thirdParty/draco/javascript/';
function loadDracoDecoder() {
  if (typeof WebAssembly !== 'object') {
    return loadJavaScriptFile(decoderPath + 'draco_decoder.js').then(createDecoderModule);
  } else {
    return loadJavaScriptFile(decoderPath + 'draco_wasm_wrapper.js').then(createDecoderModule);
  }
}

const decoderModule = await loadDracoDecoder();

function decodeAttribute(dracoGeometry, dracoDecoder, dracoAttribute, attributeName) {
  let numPoints = dracoGeometry.num_points();
  let numComponents = dracoAttribute.num_components();

  let quantization;
  let transform = new decoderModule.AttributeQuantizationTransform();
  if (transform.InitFromAttribute(dracoAttribute)) {
    let minValues = new Array(numComponents);
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
  decoderModule.destroy(transform);

  transform = new decoderModule.AttributeOctahedronTransform();
  if (transform.InitFromAttribute(dracoAttribute)) {
    quantization = {
      quantizationBits: transform.quantization_bits(),
      octEncoded: true,
    };
  }
  decoderModule.destroy(transform);

  const vertexArrayLength = numPoints * numComponents;
  let vertexArray;
  if (defined(quantization)) {
    vertexArray = decodeQuantizedDracoTypedArray(
      dracoGeometry,
      dracoDecoder,
      dracoAttribute,
      quantization,
      vertexArrayLength
    );
  } else {
    vertexArray = decodeDracoTypedArray(
      dracoGeometry,
      dracoDecoder,
      dracoAttribute,
      vertexArrayLength,
      attributeName
    );
  }

  const componentDatatype = ComponentDatatype.fromTypedArray(vertexArray);

  return {
    array: vertexArray,
    data: {
      componentsPerAttribute: numComponents,
      componentDatatype: componentDatatype,
      byteOffset: dracoAttribute.byte_offset(),
      byteStride: ComponentDatatype.getSizeInBytes(componentDatatype) * numComponents,
      normalized: dracoAttribute.normalized(),
      quantization: quantization,
    },
  };
}

/**
 * 
 * @param {Uint8Array} typedArray 
 * @param {{ byteLength: number }} bufferView 
 * @param {{ [name: string]: number }} compressedAttributes 
 * @param {boolean} [useDefaultAttributeId=false] 
 * @returns 
 */
function decodePrimitive(typedArray, bufferView, compressedAttributes, useDefaultAttributeId = false) {
  const decoder = new decoderModule.Decoder();

  // Skip all parameter types except generic
  // let attributesToSkip = ["POSITION", "NORMAL", "COLOR", "TEX_COORD"];
  // const dequantizeInShader = false;
  // if (dequantizeInShader) {
  //   for (let i = 0; i < attributesToSkip.length; ++i) {
  //     decoder.SkipAttributeTransform(decoderModule[attributesToSkip[i]]);
  //   }
  // }

  // Create a buffer to hold the encoded data.
  const buffer = new decoderModule.DecoderBuffer();
  buffer.Init(typedArray, bufferView.byteLength);

  const geometryType = decoder.GetEncodedGeometryType(buffer);

  // Decode the encoded geometry.
  let dracoGeometry;
  let status;
  if (geometryType === decoderModule.TRIANGULAR_MESH) {
    dracoGeometry = new decoderModule.Mesh();
    status = decoder.DecodeBufferToMesh(buffer, dracoGeometry);
  } else if (geometryType === decoderModule.POINT_CLOUD) {
    dracoGeometry = new decoderModule.PointCloud();
    status = decoder.DecodeBufferToPointCloud(buffer, dracoGeometry);
  } else {
    throw new Error(`unknown Draco geometry type: ${geometryType}.`);
  }

  if (!status.ok() || dracoGeometry.ptr === 0) {
    throw new Error('Error decoding draco mesh geometry: ' + status.error_msg());
  }

  decoderModule.destroy(buffer);

  const attributeData = {};

  if (useDefaultAttributeId) {
    const defaultAttributeNames = ['POSITION', 'NORMAL', 'COLOR', 'TEX_COORD', 'GENERIC'];

    for (const defaultAttributeName of defaultAttributeNames) {
      const attributeID = decoder.GetAttributeId(dracoGeometry, decoderModule[defaultAttributeName]);
      if (attributeID === -1) {
        continue;
      }
      const dracoAttribute = decoder.GetAttribute(dracoGeometry, attributeID);
      attributeData[defaultAttributeName] = decodeAttribute(dracoGeometry, decoder, dracoAttribute, defaultAttributeName);
    }

  } else {

    if (compressedAttributes) {
      for (const attributeName in compressedAttributes) {
        if (Object.hasOwnProperty.call(compressedAttributes, attributeName)) {
          const compressedAttribute = compressedAttributes[attributeName];
          const dracoAttribute = decoder.GetAttributeByUniqueId(dracoGeometry, compressedAttribute);
          attributeData[attributeName]= decodeAttribute(dracoGeometry, decoder, dracoAttribute, attributeName);
        }
      }
    }

  }

  const result = {
    geometryType: geometryType === decoderModule.TRIANGULAR_MESH ? 'TRIANGULAR_MESH' : 'POINT_CLOUD',
    attributeData: attributeData,
    indexArray: undefined,
  };
  // only triangle mesh has indices?
  if (geometryType === decoderModule.TRIANGULAR_MESH) {
    result.indexArray = decodeIndexArray(dracoGeometry, decoder);
  }

  decoderModule.destroy(dracoGeometry);
  decoderModule.destroy(decoder);

  const loggedResult = {
    geometryType: result.geometryType,
    attributeData: {},
  };
  for (const attributeName in result.attributeData) {
    if (Object.prototype.hasOwnProperty.call(result.attributeData, attributeName)) {
      const attribute = result.attributeData[attributeName];
      loggedResult.attributeData[attributeName] = {
        array: attribute.array,
        data: attribute.data,
      };
    }
  }
  if (result.indexArray) {
    loggedResult.indexArray = {
      numberOfIndices: result.indexArray.numberOfIndices,
      typedArray: result.indexArray.typedArray,
    };
  }
  console.log(`draco primitive:`, loggedResult);

  return result;
}

function decodeQuantizedDracoTypedArray(
  dracoGeometry,
  dracoDecoder,
  dracoAttribute,
  quantization,
  vertexArrayLength
) {
  let vertexArray;
  let attributeData;
  if (quantization.quantizationBits <= 8) {
    attributeData = new decoderModule.DracoUInt8Array();
    vertexArray = new Uint8Array(vertexArrayLength);
    dracoDecoder.GetAttributeUInt8ForAllPoints(
      dracoGeometry,
      dracoAttribute,
      attributeData
    );
  } else if (quantization.quantizationBits <= 16) {
    attributeData = new decoderModule.DracoUInt16Array();
    vertexArray = new Uint16Array(vertexArrayLength);
    dracoDecoder.GetAttributeUInt16ForAllPoints(
      dracoGeometry,
      dracoAttribute,
      attributeData
    );
  } else {
    attributeData = new decoderModule.DracoFloat32Array();
    vertexArray = new Float32Array(vertexArrayLength);
    dracoDecoder.GetAttributeFloatForAllPoints(
      dracoGeometry,
      dracoAttribute,
      attributeData
    );
  }

  for (let i = 0; i < vertexArrayLength; ++i) {
    vertexArray[i] = attributeData.GetValue(i);
  }

  decoderModule.destroy(attributeData);
  return vertexArray;
}

function decodeDracoTypedArray(
  dracoGeometry,
  dracoDecoder,
  dracoAttribute,
  vertexArrayLength,
  attributeName
) {
  let vertexArray;
  let attributeData;

  // Some attribute types are casted down to 32 bit since Draco only returns 32 bit values
  switch (dracoAttribute.data_type()) {
    case 0:
      // FIXME:
      console.warn(attributeName, 'data type is 0');
      return new Uint8Array(new Array(vertexArrayLength).fill(0));
    case 1:
    case 11: // DT_INT8 or DT_BOOL
      attributeData = new decoderModule.DracoInt8Array();
      vertexArray = new Int8Array(vertexArrayLength);
      dracoDecoder.GetAttributeInt8ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        attributeData
      );
      break;
    case 2: // DT_UINT8
      attributeData = new decoderModule.DracoUInt8Array();
      vertexArray = new Uint8Array(vertexArrayLength);
      dracoDecoder.GetAttributeUInt8ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        attributeData
      );
      break;
    case 3: // DT_INT16
      attributeData = new decoderModule.DracoInt16Array();
      vertexArray = new Int16Array(vertexArrayLength);
      dracoDecoder.GetAttributeInt16ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        attributeData
      );
      break;
    case 4: // DT_UINT16
      attributeData = new decoderModule.DracoUInt16Array();
      vertexArray = new Uint16Array(vertexArrayLength);
      dracoDecoder.GetAttributeUInt16ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        attributeData
      );
      break;
    case 5:
    case 7: // DT_INT32 or DT_INT64
      attributeData = new decoderModule.DracoInt32Array();
      vertexArray = new Int32Array(vertexArrayLength);
      dracoDecoder.GetAttributeInt32ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        attributeData
      );
      break;
    case 6:
    case 8: // DT_UINT32 or DT_UINT64
      attributeData = new decoderModule.DracoUInt32Array();
      vertexArray = new Uint32Array(vertexArrayLength);
      dracoDecoder.GetAttributeUInt32ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        attributeData
      );
      break;
    case 9:
    case 10: // DT_FLOAT32 or DT_FLOAT64
      attributeData = new decoderModule.DracoFloat32Array();
      vertexArray = new Float32Array(vertexArrayLength);
      dracoDecoder.GetAttributeFloatForAllPoints(
        dracoGeometry,
        dracoAttribute,
        attributeData
      );
      break;
  }

  for (let i = 0; i < vertexArrayLength; ++i) {
    vertexArray[i] = attributeData.GetValue(i);
  }

  decoderModule.destroy(attributeData);
  return vertexArray;
}

function decodeIndexArray(dracoGeometry, dracoDecoder) {
  const numPoints = dracoGeometry.num_points();
  const numFaces = dracoGeometry.num_faces();
  const faceIndices = new decoderModule.DracoInt32Array();
  const numIndices = numFaces * 3;
  const indexArray = IndexDatatype.createTypedArray(numPoints, numIndices);

  let offset = 0;
  for (let i = 0; i < numFaces; ++i) {
    dracoDecoder.GetFaceFromMesh(dracoGeometry, i, faceIndices);

    indexArray[offset + 0] = faceIndices.GetValue(0);
    indexArray[offset + 1] = faceIndices.GetValue(1);
    indexArray[offset + 2] = faceIndices.GetValue(2);
    offset += 3;
  }

  decoderModule.destroy(faceIndices);

  return {
    typedArray: indexArray,
    numberOfIndices: numIndices,
  };
}

export {
  decodePrimitive,
};
