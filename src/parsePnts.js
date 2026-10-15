import { readMagic, assertMagic, assertVersion, readHeader } from "./tileFormat.js";

function parsePnts(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const textDecoder = new TextDecoder('utf-8');

  const magic = readMagic(uint8Array);
  assertMagic(magic, 'pnts');

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

  assertVersion(version, 'Point Cloud tile');

  if (featureTableJsonByteLength === 0) {
    throw new Error(
      "Feature table must have a byte length greater than zero"
    );
  }

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

  return {
    magic,
    version,
    byteLength,
    featureTableJsonByteLength,
    featureTableBinaryByteLength,
    batchTableJsonByteLength,
    batchTableBinaryByteLength,
    featureTableJson,
    batchTableJson,
    featureTableBinary,
    batchTableBinary
  };
}

export {
  parsePnts,
};
