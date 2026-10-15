import { readMagic, assertMagic, assertVersion, readHeader } from "./tileFormat.js";

function parseB3dm(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const textDecoder = new TextDecoder('utf8');

  const magic = readMagic(uint8Array);
  assertMagic(magic, 'b3dm');

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
    console.warn(
      "Feature table must have a byte length greater than zero"
    );
  }

  let featureTableJson = '';
  if (featureTableJsonByteLength !== 0) {
    const featureTableString = textDecoder.decode(uint8Array.slice(byteOffset, byteOffset + featureTableJsonByteLength));
    featureTableJson = JSON.parse(featureTableString);
  }
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

  const glb = arrayBuffer.slice(byteOffset, byteLength);

  return {
    magic,
    version,
    byteLength,
    featureTableJsonByteLength,
    featureTableBinaryByteLength,
    batchTableJsonByteLength,
    batchTableBinaryByteLength,

    featureTableJson,
    featureTableBinary,
    batchTableJson,
    batchTableBinary,
    glb,
  };
}

export {
  parseB3dm,
};
