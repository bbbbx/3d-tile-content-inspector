const WEBGL_CONSTANT = {
  // componentType
  BYTE: 5120,
  UNSIGNED_BYTE: 5121,
  SHORT: 5122,
  UNSIGNED_SHORT: 5123,
  INT: 5124,
  UNSIGNED_INT: 5125,
  FLOAT: 5126,

  // target
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
};

const COMPONENT_TYPE_SIZE_IN_BYTES = new window.Map();
COMPONENT_TYPE_SIZE_IN_BYTES.set(WEBGL_CONSTANT.BYTE, 1);
COMPONENT_TYPE_SIZE_IN_BYTES.set(WEBGL_CONSTANT.UNSIGNED_BYTE, 1);
COMPONENT_TYPE_SIZE_IN_BYTES.set(WEBGL_CONSTANT.SHORT, 2);
COMPONENT_TYPE_SIZE_IN_BYTES.set(WEBGL_CONSTANT.UNSIGNED_SHORT, 2);
COMPONENT_TYPE_SIZE_IN_BYTES.set(WEBGL_CONSTANT.INT, 4);
COMPONENT_TYPE_SIZE_IN_BYTES.set(WEBGL_CONSTANT.UNSIGNED_INT, 4);
COMPONENT_TYPE_SIZE_IN_BYTES.set(WEBGL_CONSTANT.FLOAT, 4);

const COMPONENT_TYPE_TYPED_ARRAY = new window.Map();
COMPONENT_TYPE_TYPED_ARRAY.set(WEBGL_CONSTANT.BYTE, Int8Array);
COMPONENT_TYPE_TYPED_ARRAY.set(WEBGL_CONSTANT.UNSIGNED_BYTE, Uint8Array);
COMPONENT_TYPE_TYPED_ARRAY.set(WEBGL_CONSTANT.SHORT, Int16Array);
COMPONENT_TYPE_TYPED_ARRAY.set(WEBGL_CONSTANT.UNSIGNED_SHORT, Uint16Array);
COMPONENT_TYPE_TYPED_ARRAY.set(WEBGL_CONSTANT.INT, Int32Array);
COMPONENT_TYPE_TYPED_ARRAY.set(WEBGL_CONSTANT.UNSIGNED_INT, Uint32Array);
COMPONENT_TYPE_TYPED_ARRAY.set(WEBGL_CONSTANT.FLOAT, Float32Array);



const NUMBER_OF_COMPONENTS = {
  'SCALAR': 1,
  'VEC2': 2,
  'VEC3': 3,
  'VEC4': 4,
  'MAT2': 4,
  'MAT3': 9,
  'MAT4': 16,
};

function getChunkType(value) {
  if (value === 0x4E4F534A) {
    return 'JSON';
  } else if (value === 0x004E4942) {
    return 'BIN';
  } else {
    return undefined;
  }
}

function parseGlb(arrayBuffer) {
  const dataView = new DataView(arrayBuffer);
  let byteOffset = 0;

  const magic = dataView.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

  if (magic !== 0x46546c67) { // "glTF"
    const textDecoder = new TextDecoder();
    const magicString = textDecoder.decode(new Uint8Array(arrayBuffer, 0, 4));
    console.warn('parseGlb: magic is not glTF, current is ' + magicString);
    return;
  }
  
  const version = dataView.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;
  
  if (version !== 2) {
    console.warn('parseGlb: version is not 2, current is ' + version);
    return;
  }

  const bytesLength = dataView.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

  if (bytesLength !== dataView.byteLength) {
    console.warn('parseGlb: bytes length header is not equals file bytes length.');
  }

  const glb = {};

  const chunk0Length = dataView.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;
  const chunk0Type = dataView.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

  const chunk0Data = new Uint8Array(arrayBuffer, byteOffset, chunk0Length);

  const chunk0TypeString = getChunkType(chunk0Type);

  if (chunk0TypeString === 'JSON') {
    const textDecoder = new TextDecoder();
    const jsonString = textDecoder.decode(chunk0Data);
    const json = JSON.parse(jsonString);
    glb['JSON'] = json;
  }

  byteOffset += chunk0Length;

  if (byteOffset < bytesLength) {
    const chunk1Length = dataView.getUint32(byteOffset, true);
    byteOffset += Uint32Array.BYTES_PER_ELEMENT;
    const chunk1Type = dataView.getUint32(byteOffset, true);
    byteOffset += Uint32Array.BYTES_PER_ELEMENT;

    const chunk1TypeString = getChunkType(chunk1Type);

    if (chunk1TypeString === 'BIN') {
      const chunk1Data = arrayBuffer.slice(byteOffset, byteOffset + chunk1Length);
      byteOffset += chunk1Length;
      glb['BIN'] = chunk1Data;
    }
  }

  // extract attributes buffer
  if (glb.BIN) {
    const binaryArrayBuffer = glb.BIN;
    const accessors = glb.JSON.accessors;
    const bufferViews = glb.JSON.bufferViews;
    const buffers = glb.JSON.buffers;
    
    // meshes may be "null"
    const meshes = glb.JSON.meshes || [];
    const meshesLength = meshes.length;

    const maximumElementCount = 10;

    for (let i = 0; i < meshesLength; i++) {
      const mesh = meshes[i];
      const primitives = mesh.primitives;
      const primitivesLength = primitives.length;
      for (let j = 0; j < primitivesLength; j++) {
        const primitive = primitives[j];
        const extensions = primitive.extensions;

        const dracoExtension = extensions && extensions.KHR_draco_mesh_compression;

        if (dracoExtension) {
          const compressedAttributes = dracoExtension.attributes;
          const bufferView = glb.JSON.bufferViews[dracoExtension.bufferView];
          // const buffer = glb.JSON.buffers[bufferView.buffer];
          const decodedResult = decodePrimitive(
            binaryArrayBuffer.slice(bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength),
            bufferView,
            compressedAttributes
          );

          console.log(`meshes[${i}].primitives[${j}].__decodedDraco:`, decodedResult);
        } else { // extract first 10 elements of attributes
          const attributes = primitive.attributes;

          for (const attributeName of Object.keys(attributes)) {
            if (attributes.hasOwnProperty(attributeName)) {
              const accessorIndex = attributes[attributeName];
              const attribute = extractAttribute(accessorIndex, accessors, bufferViews, buffers, binaryArrayBuffer, maximumElementCount); 

              attributes['__extracted_' + attributeName] = attribute;
            }
          }

          const indicesAccessorIndex = primitive.indices;
          const extractedIndices = extractAttribute(indicesAccessorIndex, accessors, bufferViews, buffers, binaryArrayBuffer, maximumElementCount); 

          primitive['__extracted_indices'] = extractedIndices;
        }
      }
    }

    glb.BIN = glb.BIN.byteLength;
  }

  return glb;

}

function extractAttribute(accessorIndex, accessors, bufferViews, buffers, arrayBuffer, maximumElementCount) {
  const accessor = accessors[accessorIndex];
  const elementType = accessor.type;
  const componentType = accessor.componentType;
  const elementCount = accessor.count;

  let offset = 0;
  offset += defaultValue(accessor.byteOffset, 0);

  const bufferViewIndex = defaultValue(accessor.bufferView, 0);
  const bufferView = bufferViews[bufferViewIndex];
  offset += defaultValue(bufferView.byteOffset, 0);

  const numberOfComponents = NUMBER_OF_COMPONENTS[elementType];

  let byteStride = bufferView.byteStride;
  if (byteStride === undefined || byteStride === 0) {
    byteStride = numberOfComponents * COMPONENT_TYPE_SIZE_IN_BYTES.get(componentType);
  }

  const bufferIndex = bufferView.buffer;
  const buffer = buffers[bufferIndex];

  // glTF Buffer referring to GLB-stored BIN chunk, must have buffer.uri property undefined,
  // and it must be the first element of buffers array;
  if (buffer.uri || bufferIndex !== 0) {
    console.warn('buffer', bufferIndex, 'has uri:', buffer.uri);
    return;
  }

  const attribute = [];
  const TypedArray = COMPONENT_TYPE_TYPED_ARRAY.get(componentType);

  // only extract 10 elements
  maximumElementCount = defaultValue(maximumElementCount, 10);
  const displayElementCount = Math.min(elementCount, maximumElementCount);

  for (let ii = 0; ii < displayElementCount; ii++) {
    const data = new TypedArray(arrayBuffer, offset, numberOfComponents);
    attribute[ii] = [ ...data ];

    offset += byteStride;
  }

  return {
    ['first' + maximumElementCount + 'Elements']: attribute,
    min: accessor.min,
    max: accessor.max,
  };
}

function decodeAttribute(dracoGeometry, dracoDecoder, dracoAttribute, attributeName) {
  var numPoints = dracoGeometry.num_points();
  var numComponents = dracoAttribute.num_components();

  var quantization;
  var transform = new decoderModule.AttributeQuantizationTransform();
  if (transform.InitFromAttribute(dracoAttribute)) {
    var minValues = new Array(numComponents);
    for (var i = 0; i < numComponents; ++i) {
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

  var vertexArrayLength = numPoints * numComponents;
  var vertexArray;
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

  var componentDatatype = ComponentDatatype.fromTypedArray(vertexArray);

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

function decodePrimitive(arrayBuffer, bufferView, compressedAttributes, useDefaultAttributeId) {
  const decoder = new decoderModule.Decoder();

  // Skip all parameter types except generic
  var attributesToSkip = ["POSITION", "NORMAL", "COLOR", "TEX_COORD"];
  const parameters = {
    dequantizeInShader: false
  };
  if (parameters.dequantizeInShader) {
    for (var i = 0; i < attributesToSkip.length; ++i) {
      decoder.SkipAttributeTransform(decoderModule[attributesToSkip[i]]);
    }
  }

  // Create a buffer to hold the encoded data.
  const buffer = new decoderModule.DecoderBuffer();
  const byteArray = new Uint8Array(arrayBuffer);
  buffer.Init(byteArray, bufferView.byteLength);

  const geometryType = decoder.GetEncodedGeometryType(buffer);

  // Decode the encoded geometry.
  let dracoGeometry;
  let status;
  if (geometryType == decoderModule.TRIANGULAR_MESH) {
    dracoGeometry = new decoderModule.Mesh();
    status = decoder.DecodeBufferToMesh(buffer, dracoGeometry);
  } else {
    dracoGeometry = new decoderModule.PointCloud();
    status = decoder.DecodeBufferToPointCloud(buffer, dracoGeometry);
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

    for (const attributeName in compressedAttributes) {
      if (Object.hasOwnProperty.call(compressedAttributes, attributeName)) {
        const compressedAttribute = compressedAttributes[attributeName];
        const dracoAttribute = decoder.GetAttributeByUniqueId(dracoGeometry, compressedAttribute);
        attributeData[attributeName]= decodeAttribute(dracoGeometry, decoder, dracoAttribute, attributeName);
      }
    }

  }

  const result = {
    indexArray: decodeIndexArray(dracoGeometry, decoder),
    attributeData: attributeData,
  };

  decoderModule.destroy(dracoGeometry);
  decoderModule.destroy(decoder);

  return result;
}

function decodeQuantizedDracoTypedArray(
  dracoGeometry,
  dracoDecoder,
  dracoAttribute,
  quantization,
  vertexArrayLength
) {
  var vertexArray;
  var attributeData;
  if (quantization.quantizationBits <= 8) {
    attributeData = new decoderModule.DracoUInt8Array();
    vertexArray = new Uint8Array(vertexArrayLength);
    dracoDecoder.GetAttributeUInt8ForAllPoints(
      dracoGeometry,
      dracoAttribute,
      attributeData
    );
  } else {
    attributeData = new decoderModule.DracoUInt16Array();
    vertexArray = new Uint16Array(vertexArrayLength);
    dracoDecoder.GetAttributeUInt16ForAllPoints(
      dracoGeometry,
      dracoAttribute,
      attributeData
    );
  }

  for (var i = 0; i < vertexArrayLength; ++i) {
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
  var vertexArray;
  var attributeData;

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

  for (var i = 0; i < vertexArrayLength; ++i) {
    vertexArray[i] = attributeData.GetValue(i);
  }

  decoderModule.destroy(attributeData);
  return vertexArray;
}

function decodeIndexArray(dracoGeometry, dracoDecoder) {
  var numPoints = dracoGeometry.num_points();
  var numFaces = dracoGeometry.num_faces();
  var faceIndices = new decoderModule.DracoInt32Array();
  var numIndices = numFaces * 3;
  var indexArray = IndexDatatype.createTypedArray(numPoints, numIndices);

  var offset = 0;
  for (var i = 0; i < numFaces; ++i) {
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