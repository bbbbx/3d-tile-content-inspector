import { readMagic, assertMagic, assertVersion } from "./tileFormat.js";
import { parseB3dm } from "./parseB3dm.js";
import { parseI3dm } from "./parseI3dm.js";
import { parsePnts } from "./parsePnts.js";

function parseCmpt(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);

  const magic = readMagic(uint8Array);
  assertMagic(magic, 'cmpt');

  let offset = 4;

  const version = view.getUint32(offset, true);
  offset += Uint32Array.BYTES_PER_ELEMENT;
  assertVersion(version, 'tile');

  const byteLength = view.getUint32(offset, true);
  offset += Uint32Array.BYTES_PER_ELEMENT;

  const tilesLength = view.getUint32(offset, true);
  offset += Uint32Array.BYTES_PER_ELEMENT;

  const tiles = [];

  for (let i = 0; i < tilesLength; i++) {
    const tileMagic = readMagic(uint8Array.slice(offset, offset + 4));
    offset += 4;
    console.log(tileMagic);

    const tileVersion = view.getUint32(offset, true);
    offset += Uint32Array.BYTES_PER_ELEMENT;
    assertVersion(tileVersion, 'tile');

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
      tileContent = parseCmpt(tileContentArrayBuffer);
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
  };
}

export {
  parseCmpt,
};
