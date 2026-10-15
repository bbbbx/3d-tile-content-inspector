import { readMagic, assertMagic, assertVersion, readHeader } from "./tileFormat.js";

function parseI3dm(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const textDecoder = new TextDecoder('utf8');

  const magic = readMagic(uint8Array);
  assertMagic(magic, 'i3dm');

  let byteOffset = 4;
  const header = readHeader(view, byteOffset);
  byteOffset = header.byteOffset;
  const {
    version,
    byteLength,
    featureTableJsonByteLength,
    featureTableBinaryByteLength,
    batchTableJsonByteLength,
    batchTableBinaryByteLength,
  } = header;

  assertVersion(version, 'tile');

  if (featureTableJsonByteLength === 0) {
    throw new Error(
      "Feature table must have a byte length greater than zero"
    );
  }

  // Indicates the format of the glTF field of the body.
  // 0 indicates it is a uri, 1 indicates it is embedded binary glTF.
  const gltfFormat = view.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

  const featureTableString = textDecoder.decode(uint8Array.slice(byteOffset, byteOffset + featureTableJsonByteLength));
  const featureTableJson = JSON.parse(featureTableString);
  byteOffset += featureTableJsonByteLength;

  const featureTableBinary = new Uint8Array(arrayBuffer, byteOffset, featureTableBinaryByteLength);
  byteOffset += featureTableBinaryByteLength;

  let batchTableJson;
  let batchTableBinary;

  if (batchTableJsonByteLength > 0) {
    const batchTableString = textDecoder.decode(uint8Array.slice(byteOffset, byteOffset + batchTableJsonByteLength));
    batchTableJson = JSON.parse(batchTableString);
    byteOffset += batchTableJsonByteLength;

    if (batchTableBinaryByteLength > 0) {
      batchTableBinary = new Uint8Array(arrayBuffer, byteOffset, batchTableBinaryByteLength);
      byteOffset += batchTableBinaryByteLength;
    }
  }

  let urlOrGlb = arrayBuffer.slice(byteOffset, byteLength);

  if (gltfFormat === 0) {
    urlOrGlb = textDecoder.decode(urlOrGlb);
  } else if (gltfFormat !== 1) {
    console.error('i3dm: gltfFormat MUST be either 1 or 0, current is ' + gltfFormat + '.');
  }

  return {
    magic,
    version,
    byteLength,
    featureTableJsonByteLength,
    featureTableBinaryByteLength,
    batchTableJsonByteLength,
    batchTableBinaryByteLength,

    gltfFormat,

    featureTableJson,
    featureTableBinary,
    batchTableJson,
    batchTableBinary,

    urlOrGlb,
  };
}

export {
  parseI3dm,
};
