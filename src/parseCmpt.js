
function parseCmpt(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);

  const textDecoder = new TextDecoder('utf8');
  const magic = textDecoder.decode(uint8Array.slice(0, 4));

  if (magic !== 'cmpt') {
    throw new Error('the magic number \'' + magic + '\' is not \'cmpt\'');
  }

  const view = new DataView(arrayBuffer);
  let offset = 4;

  const version = view.getUint32(offset, true);
  offset += Uint32Array.BYTES_PER_ELEMENT;

  if (version !== 1) {
    throw new Error(
      "Only tile version 1 is supported.  Version " +
        version +
        " is not."
    );
  }

  const byteLength = view.getUint32(offset, true);
  offset += Uint32Array.BYTES_PER_ELEMENT;

  const tilesLength = view.getUint32(offset, true);
  offset += Uint32Array.BYTES_PER_ELEMENT;

  const tiles = [];

  for (let i = 0; i < tilesLength; i++) {

    const tileMagic = textDecoder.decode(uint8Array.slice(offset, offset + 4));
    offset += 4;
    console.log(tileMagic)

    const tileVersion = view.getUint32(offset, true);
    offset += Uint32Array.BYTES_PER_ELEMENT;
    if (tileVersion !== 1) {
      throw new Error(
        "Only tile version 1 is supported.  Version " +
          tileVersion +
          " is not."
      );
    }

    const tileByteLength = view.getUint32(offset, true);
    offset += Uint32Array.BYTES_PER_ELEMENT;

    const tileOffset = offset - 12;
    const tileContentArrayBuffer = arrayBuffer.slice(tileOffset, tileOffset + tileByteLength);
    let tileContent;
    if (tileMagic === 'pnts') {
      tileContent = parsePnts(tileContentArrayBuffer);
    } else if (tileMagic === 'b3dm') {
      tileContent = parseB3dm(tileContentArrayBuffer);
    } else if (tileMagic === 'i3dm') {
      tileContent = parseI3dm(tileContentArrayBuffer);
    } else if (tileMagic === 'cmpt') {
      tileContentArrayBuffer = parseCmpt(arrayBuffer.slice(tileOffset, tileOffset + tileByteLength));
    } else {
      console.warn('Unsupported content format \'' + tileMagic + '\'');
    }

    if (tileContent) {
      tiles.push(tileContent);
    }

    offset += tileByteLength - Uint32Array.BYTES_PER_ELEMENT * 3;
    
  }

  return {
    magic,
    version,
    byteLength,
    tilesLength,
    tiles
  }
}
