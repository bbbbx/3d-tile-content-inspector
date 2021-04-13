/**
 * Constants for WebGL index datatypes.  These corresponds to the
 * <code>type</code> parameter of {@link http://www.khronos.org/opengles/sdk/docs/man/xhtml/glDrawElements.xml|drawElements}.
 *
 * @enum {Number}
 */
 var IndexDatatype = {
  /**
   * 8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
   * of an element in <code>Uint8Array</code>.
   *
   * @type {Number}
   * @constant
   */
  UNSIGNED_BYTE: WebGLConstants.UNSIGNED_BYTE,

  /**
   * 16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
   * of an element in <code>Uint16Array</code>.
   *
   * @type {Number}
   * @constant
   */
  UNSIGNED_SHORT: WebGLConstants.UNSIGNED_SHORT,

  /**
   * 32-bit unsigned int corresponding to <code>UNSIGNED_INT</code> and the type
   * of an element in <code>Uint32Array</code>.
   *
   * @type {Number}
   * @constant
   */
  UNSIGNED_INT: WebGLConstants.UNSIGNED_INT,
};

const SIXTY_FOUR_KILOBYTES = 64 * 1024;

/**
 * Creates a typed array that will store indices, using either <code><Uint16Array</code>
 * or <code>Uint32Array</code> depending on the number of vertices.
 *
 * @param {Number} numberOfVertices Number of vertices that the indices will reference.
 * @param {Number|Array} indicesLengthOrArray Passed through to the typed array constructor.
 * @returns {Uint16Array|Uint32Array} A <code>Uint16Array</code> or <code>Uint32Array</code> constructed with <code>indicesLengthOrArray</code>.
 */
 IndexDatatype.createTypedArray = function (
  numberOfVertices,
  indicesLengthOrArray
) {
  if (!defined(numberOfVertices)) {
    throw new Error('numberOfVertices is required.');
  }

  if (numberOfVertices >= SIXTY_FOUR_KILOBYTES) {
    return new Uint32Array(indicesLengthOrArray);
  }

  return new Uint16Array(indicesLengthOrArray);
};