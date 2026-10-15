const BYTES_PER_UINT32 = Uint32Array.BYTES_PER_ELEMENT;

const textDecoder = new TextDecoder('utf-8');

function readMagic(uint8Array) {
  return textDecoder.decode(uint8Array.subarray(0, 4));
}

function assertMagic(actual, expected) {
  if (actual !== expected) {
    throw new Error("the magic number '" + actual + "' is not '" + expected + "'");
  }
}

function assertVersion(version, label) {
  if (version !== 1) {
    throw new Error(
      'Only ' + label + ' version 1 is supported.  Version ' +
        version +
        ' is not.'
    );
  }
}

function readHeader(view, byteOffset) {
  const version = view.getUint32(byteOffset, true);
  byteOffset += BYTES_PER_UINT32;

  const byteLength = view.getUint32(byteOffset, true);
  byteOffset += BYTES_PER_UINT32;

  const featureTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += BYTES_PER_UINT32;

  const featureTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += BYTES_PER_UINT32;

  const batchTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += BYTES_PER_UINT32;

  const batchTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += BYTES_PER_UINT32;

  return {
    version,
    byteLength,
    featureTableJsonByteLength,
    featureTableBinaryByteLength,
    batchTableJsonByteLength,
    batchTableBinaryByteLength,
    byteOffset,
  };
}

export {
  readMagic,
  assertMagic,
  assertVersion,
  readHeader,
};
