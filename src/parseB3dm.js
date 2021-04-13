
function parseB3dm(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);

  const textDecoder = new TextDecoder('utf8');
  const magic = textDecoder.decode(uint8Array.slice(0, 4));

  if (magic !== 'b3dm') {
    throw new Error('the magic number \'' + magic + '\' is not \'b3dm\'');
  }

  const view = new DataView(arrayBuffer);
  let byteOffset = 4;

  const version = view.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

  if (version !== 1) {
    throw new Error(
      "Only tile version 1 is supported.  Version " +
        version +
        " is not."
    );
  }

  const byteLength = view.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

  // 

  const featureTableJsonByteLength = view.getUint32(byteOffset, true);
  if (featureTableJsonByteLength === 0) {
    console.warn(
      "Feature table must have a byte length greater than zero"
    );
  }
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

  const featureTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

  const batchTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;
  const batchTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

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
