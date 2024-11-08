import { decodePrimitive } from "./parseDraco.js";
import WebGLConstants from "./WebGLConstants.js";

const COMPONENT_TYPE_SIZE_IN_BYTES = new Map();
COMPONENT_TYPE_SIZE_IN_BYTES.set(WebGLConstants.BYTE, 1);
COMPONENT_TYPE_SIZE_IN_BYTES.set(WebGLConstants.UNSIGNED_BYTE, 1);
COMPONENT_TYPE_SIZE_IN_BYTES.set(WebGLConstants.SHORT, 2);
COMPONENT_TYPE_SIZE_IN_BYTES.set(WebGLConstants.UNSIGNED_SHORT, 2);
COMPONENT_TYPE_SIZE_IN_BYTES.set(WebGLConstants.INT, 4);
COMPONENT_TYPE_SIZE_IN_BYTES.set(WebGLConstants.UNSIGNED_INT, 4);
COMPONENT_TYPE_SIZE_IN_BYTES.set(WebGLConstants.FLOAT, 4);

const COMPONENT_TYPE_TYPED_ARRAY = new window.Map();
COMPONENT_TYPE_TYPED_ARRAY.set(WebGLConstants.BYTE, Int8Array);
COMPONENT_TYPE_TYPED_ARRAY.set(WebGLConstants.UNSIGNED_BYTE, Uint8Array);
COMPONENT_TYPE_TYPED_ARRAY.set(WebGLConstants.SHORT, Int16Array);
COMPONENT_TYPE_TYPED_ARRAY.set(WebGLConstants.UNSIGNED_SHORT, Uint16Array);
COMPONENT_TYPE_TYPED_ARRAY.set(WebGLConstants.INT, Int32Array);
COMPONENT_TYPE_TYPED_ARRAY.set(WebGLConstants.UNSIGNED_INT, Uint32Array);
COMPONENT_TYPE_TYPED_ARRAY.set(WebGLConstants.FLOAT, Float32Array);

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

    const maximumElementCount = Number.POSITIVE_INFINITY;

    for (let i = 0; i < meshesLength; i++) {
      const mesh = meshes[i];
      const primitives = mesh.primitives;
      const primitivesLength = primitives.length;
      for (let j = 0; j < primitivesLength; j++) {
        const primitive = primitives[j];
        const extensions = primitive.extensions;

        const dracoExtension = extensions && extensions.KHR_draco_mesh_compression;

        let extractedPrimitive = {};

        if (dracoExtension) {
          const compressedAttributes = dracoExtension.attributes;
          const bufferView = glb.JSON.bufferViews[dracoExtension.bufferView];
          bufferView.byteOffset ??= 0;
          // const buffer = glb.JSON.buffers[bufferView.buffer];
          const decodedResult = decodePrimitive(
            new Uint8Array(binaryArrayBuffer, bufferView.byteOffset, bufferView.byteLength),
            bufferView,
            compressedAttributes
          );

          extractedPrimitive = decodedResult;
        } else {
          const attributes = primitive.attributes;

          for (const attributeName of Object.keys(attributes)) {
            if (attributes.hasOwnProperty(attributeName)) {
              const accessorIndex = attributes[attributeName];
              const attribute = extractAttribute(accessorIndex, accessors, bufferViews, buffers, binaryArrayBuffer, maximumElementCount); 

              extractedPrimitive[attributeName] = attribute;
            }
          }

          const indicesAccessorIndex = primitive.indices;
          const extractedIndices = extractAttribute(indicesAccessorIndex, accessors, bufferViews, buffers, binaryArrayBuffer, maximumElementCount); 

          extractedPrimitive.indices = extractedIndices;
        }

        console.log(`meshes[${i}].primitives[${j}]:`, extractedPrimitive);
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
  offset += accessor.byteOffset ?? 0;

  const bufferViewIndex = accessor.bufferView ?? 0;
  const bufferView = bufferViews[bufferViewIndex];
  offset += bufferView.byteOffset ?? 0;

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
  maximumElementCount = maximumElementCount ?? 10;
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

export {
  parseGlb,
};
