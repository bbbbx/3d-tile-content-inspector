import { toHexString } from "./toHexString.js";

function validatePrintable(charCode) {
  return (charCode >= 32 && charCode <= 126);
}

function hexDump(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  const length = uint8Array.length;

  const chars = [];
  const hexs = [];

  for (let i = 0; i < length; i++) {
    let charCode = uint8Array[i];

    const char = validatePrintable(charCode) ?
      String.fromCharCode(charCode) :
      '.';
    chars.push(char);

    const hex = toHexString(charCode);
    hexs.push(hex);
  }

  return {
    chars,
    hexs
  };
}

onmessage = function(event) {
  const arrayBuffer = event.data;
  const hex = hexDump(arrayBuffer);
  postMessage({
    hex,
    arrayBuffer,
  }, [ arrayBuffer ]);
};