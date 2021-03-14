const BYTES_OF_UINT32 = Uint32Array.BYTES_PER_ELEMENT;
const BYTES_OF_UINT8 = Uint8Array.BYTES_PER_ELEMENT;
const textDecoder = new TextDecoder('utf-8');

function parsePnts(arraybuffer) {
  let byteOffset = 0;

  const uint8Array = new Uint8Array(arraybuffer);
  const view = new DataView(arraybuffer);

  let magic = '';
  magic += String.fromCharCode(view.getUint8(byteOffset, true));
  byteOffset += BYTES_OF_UINT8;
  magic += String.fromCharCode(view.getUint8(byteOffset, true));
  byteOffset += BYTES_OF_UINT8;
  magic += String.fromCharCode(view.getUint8(byteOffset, true));
  byteOffset += BYTES_OF_UINT8;
  magic += String.fromCharCode(view.getUint8(byteOffset, true));
  byteOffset += BYTES_OF_UINT8;

  if (magic !== 'pnts') {
    throw new Error("the magic number '" + magic + "' is not 'pnts'");
  }

  const version = view.getUint32(byteOffset, true);
  if (version !== 1) {
    throw new Error(
      "Only Point Cloud tile version 1 is supported.  Version " +
        version +
        " is not."
    );
  }
  byteOffset += BYTES_OF_UINT32;

  const byteLength = view.getUint32(byteOffset, true);
  byteOffset += BYTES_OF_UINT32;
  
  const featureTableJsonByteLength = view.getUint32(byteOffset, true);
  if (featureTableJsonByteLength === 0) {
    throw new Error(
      "Feature table must have a byte length greater than zero"
    );
  }
  byteOffset += BYTES_OF_UINT32;

  const featureTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += BYTES_OF_UINT32;

  const batchTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += BYTES_OF_UINT32;
  const batchTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += BYTES_OF_UINT32;

  const featureTableString = textDecoder.decode(uint8Array.slice(byteOffset, byteOffset + featureTableJsonByteLength));
  const featureTableJson = JSON.parse(featureTableString);
  byteOffset += featureTableJsonByteLength;

  const featureTableBinary = new Uint8Array(arraybuffer, byteOffset, featureTableBinaryByteLength);
  byteOffset += featureTableBinaryByteLength;

  let batchTableJson;
  let batchTableBinary;

  if (batchTableJsonByteLength > 0) {
    const batchTableString = textDecoder.decode(uint8Array.slice(byteOffset, byteOffset + batchTableJsonByteLength));
    batchTableJson = JSON.parse(batchTableString);
    byteOffset += batchTableJsonByteLength;

    if (batchTableBinaryByteLength > 0) {
      batchTableBinary = new Uint8Array(arraybuffer, byteOffset, batchTableBinaryByteLength);
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

// module.exports = parsePnts;
