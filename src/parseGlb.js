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
  byteOffset += chunk0Length;

  const chunk0TypeString = getChunkType(chunk0Type);

  if (chunk0TypeString === 'JSON') {
    const textDecoder = new TextDecoder();
    const jsonString = textDecoder.decode(chunk0Data);
    const json = JSON.parse(jsonString);
    glb['JSON'] = json;
  }

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
    const meshes = glb.JSON.meshes;
    const meshesLength = meshes.length;
    for (let i = 0; i < meshesLength; i++) {
      const mesh = meshes[i];
      const primitives = mesh.primitives;
      const primitivesLength = primitives.length;
      for (let j = 0; j < primitivesLength; j++) {
        const primitive = primitives[j];
        const attributes = primitive.attributes;

        for (const attributeName of Object.keys(attributes)) {
          if (attributes.hasOwnProperty(attributeName)) {
            const accessorIndex = attributes[attributeName];
            const accessor = glb.JSON.accessors[accessorIndex];
            const elementType = accessor.type;
            const componentType = accessor.componentType;
            const elementCount = accessor.count;

            // store minimum and maximum value for attributes
            attributes['extracted_' + attributeName] = {
              min: accessor.min,
              max: accessor.max,
            };

            let offset = 0;
            offset += accessor.byteOffset;

            const bufferViewIndex = accessor.bufferView;
            const bufferView = glb.JSON.bufferViews[bufferViewIndex];
            offset += bufferView.byteOffset;

            const numberOfComponents = NUMBER_OF_COMPONENTS[elementType];

            let byteStride = bufferView.byteStride;
            if (byteStride === undefined || byteStride === 0) {
              byteStride = numberOfComponents * COMPONENT_TYPE_SIZE_IN_BYTES.get(componentType);
            }

            const bufferIndex = bufferView.buffer;
            const buffer = glb.JSON.buffers[bufferIndex];

            // glTF Buffer referring to GLB-stored BIN chunk, must have buffer.uri property undefined,
            // and it must be the first element of buffers array;
            if (buffer.uri || bufferIndex !== 0) {
              continue;
            }

            const attribute = [];
            const TypedArray = COMPONENT_TYPE_TYPED_ARRAY.get(componentType);

            // only extract 10 elements
            const displayElementCount = Math.min(elementCount, 10);

            for (let ii = 0; ii < displayElementCount; ii++) {
              const data = new TypedArray(binaryArrayBuffer, offset, numberOfComponents);
              attribute[ii] = [ ...data ];

              offset += byteStride;
            }

            attributes['extracted_' + attributeName]['first10Elements'] = attribute;
          }
        }
        
      }
      
    }

    glb.BIN = glb.BIN.byteLength;
  }

  return glb;

}
