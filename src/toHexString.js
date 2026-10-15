function toHexString(number) {
  if (typeof number !== 'number') {
    throw new Error('toBinaryString: the input argument MUST be number');
  }
  return number.toString(16).padStart(2, '0');
}

export {
  toHexString,
};
