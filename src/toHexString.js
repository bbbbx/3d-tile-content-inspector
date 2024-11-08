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

function toHexString(number) {
  if (typeof number !== 'number') {
    throw new Error('toBinaryString: the input argument MUST be number');
  }
  let maskString = map.get(number % 16);
  while ((number = number >> 4) !== 0) {
    maskString = maskString.padStart(maskString.length + 1, map.get(number % 16));
  }

  if (maskString.length < 2) {
    maskString = maskString.padStart(maskString.length + 1, '0');
  }

  return maskString;
}

export {
  toHexString,
};
