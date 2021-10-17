const map = new Map();
map.set(0, '0');
map.set(1, '1');
map.set(2, '2');
map.set(3, '3');
map.set(4, '4');
map.set(5, '5');
map.set(6, '6');
map.set(7, '7');
map.set(8, '8');
map.set(9, '9');
map.set(10, 'a');
map.set(11, 'b');
map.set(12, 'c');
map.set(13, 'd');
map.set(14, 'e');
map.set(15, 'f');

function validatePrintable(charCode) {
  return (charCode >= 32 && charCode <= 126);
}

function toHexString(number) {
  if (typeof number !== 'number') {
    throw new Error('toBinaryString: the input argument MUST be number');
  }
  var maskString = map.get(number % 16);
  while ((number = number >> 4) !== 0) {
    maskString = maskString.padStart(maskString.length + 1, map.get(number % 16));
  }

  maskString = maskString.padStart(2, '0');

  return maskString;
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