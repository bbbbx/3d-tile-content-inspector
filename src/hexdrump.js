// const toHexString = require('./toHexString.js');

function hexdrump(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  const length = uint8Array.length;

  const chars = [];
  const hexs = [];

  for (let i = 0; i < length; i++) {
    let charCode = uint8Array[i];
    const char = String.fromCharCode(charCode);
    chars.push(char);

    const hex = toHexString(charCode);
    hexs.push(hex);
  }

  return {
    chars,
    hexs
  };
}

// module.exports = hexdrump;

