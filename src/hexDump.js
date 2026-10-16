import { toHexString } from "./toHexString.js";
import { MAX_BYTE_LENGTH } from "./constants.js";

const BYTES_PER_LINE = 16;

const HEX_TABLE = new Array(256);
const CHAR_TABLE = new Array(256);
for (let i = 0; i < 256; i++) {
  HEX_TABLE[i] = toHexString(i);
  CHAR_TABLE[i] = (i >= 32 && i <= 126) ? String.fromCharCode(i) : '.';
}

function hexDump(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  // For performance, only the first MAX_BYTE_LENGTH bytes are dumped.
  const length = Math.min(uint8Array.length, MAX_BYTE_LENGTH);

  const lines = [];

  for (let i = 0; i < length; i += BYTES_PER_LINE) {
    const end = Math.min(i + BYTES_PER_LINE, length);

    let hexText = '';
    let charText = '';
    for (let j = i; j < end; j++) {
      const byte = uint8Array[j];
      hexText += (j === i ? '' : ' ') + HEX_TABLE[byte];
      charText += CHAR_TABLE[byte];
    }

    const numOfSpace = (BYTES_PER_LINE - (end - i)) * 3;
    const offset = toHexString(i).padStart(8, '0');
    lines.push(offset + ': ' + hexText + '\u00a0'.repeat(numOfSpace) + ' ' + charText);
  }

  return { lines };
}

onmessage = function(event) {
  const { id, arrayBuffer } = event.data;
  const hex = hexDump(arrayBuffer);
  postMessage({
    id,
    hex,
    arrayBuffer,
  }, [ arrayBuffer ]);
};
