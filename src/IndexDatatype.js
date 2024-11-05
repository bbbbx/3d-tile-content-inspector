import defined from "./defined.js";
import WebGLConstants from "./WebGLConstants.js";

/**
 * Constants for WebGL index datatypes.  These corresponds to the
 * <code>type</code> parameter of {@link http://www.khronos.org/opengles/sdk/docs/man/xhtml/glDrawElements.xml|drawElements}.
 *
 */
class IndexDatatype {
  /**
   * 8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
   * of an element in <code>Uint8Array</code>.
   *
   * @type {Number}
   * @constant
   */
  static UNSIGNED_BYTE = WebGLConstants.UNSIGNED_BYTE;

  /**
   * 16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
   * of an element in <code>Uint16Array</code>.
   *
   * @type {Number}
   * @constant
   */
  static UNSIGNED_SHORT = WebGLConstants.UNSIGNED_SHORT;

  /**
   * 32-bit unsigned int corresponding to <code>UNSIGNED_INT</code> and the type
   * of an element in <code>Uint32Array</code>.
   *
   * @type {Number}
   * @constant
   */
  static UNSIGNED_INT = WebGLConstants.UNSIGNED_INT;

  /**
   * 
   * @param {number} numberOfVertices 
   * @param {number|number[]} indicesLengthOrArray 
   * @returns 
   */
  static createTypedArray(numberOfVertices, indicesLengthOrArray) {
    if (!defined(numberOfVertices)) {
      throw new Error('numberOfVertices is required.');
    }
  
    if (numberOfVertices >= SIXTY_FOUR_KILOBYTES) {
      return new Uint32Array(indicesLengthOrArray);
    }
  
    return new Uint16Array(indicesLengthOrArray);
  }
};

const SIXTY_FOUR_KILOBYTES = 64 * 1024;

export {
  IndexDatatype,
};
