import defined from "./defined.js";
import WebGLConstants from "./WebGLConstants.js";

/**
 * WebGL component datatypes.  Components are intrinsics,
 * which form attributes, which form vertices.
 *
 * @enum {Number}
 */
class ComponentDatatype {
  /**
   * 8-bit signed byte corresponding to <code>gl.BYTE</code> and the type
   * of an element in <code>Int8Array</code>.
   *
   * @type {Number}
   * @constant
   */
  static BYTE = WebGLConstants.BYTE;

  /**
   * 8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
   * of an element in <code>Uint8Array</code>.
   *
   * @type {Number}
   * @constant
   */
  static UNSIGNED_BYTE = WebGLConstants.UNSIGNED_BYTE;

  /**
   * 16-bit signed short corresponding to <code>SHORT</code> and the type
   * of an element in <code>Int16Array</code>.
   *
   * @type {Number}
   * @constant
   */
  static SHORT = WebGLConstants.SHORT;

  /**
   * 16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
   * of an element in <code>Uint16Array</code>.
   *
   * @type {Number}
   * @constant
   */
  static UNSIGNED_SHORT = WebGLConstants.UNSIGNED_SHORT;

  /**
   * 32-bit signed int corresponding to <code>INT</code> and the type
   * of an element in <code>Int32Array</code>.
   *
   * @memberOf ComponentDatatype
   *
   * @type {Number}
   * @constant
   */
  static INT = WebGLConstants.INT;

  /**
   * 32-bit unsigned int corresponding to <code>UNSIGNED_INT</code> and the type
   * of an element in <code>Uint32Array</code>.
   *
   * @memberOf ComponentDatatype
   *
   * @type {Number}
   * @constant
   */
  static UNSIGNED_INT = WebGLConstants.UNSIGNED_INT;

  /**
   * 32-bit floating-point corresponding to <code>FLOAT</code> and the type
   * of an element in <code>Float32Array</code>.
   *
   * @type {Number}
   * @constant
   */
  static FLOAT = WebGLConstants.FLOAT;

  /**
   * 64-bit floating-point corresponding to <code>gl.DOUBLE</code> (in Desktop OpenGL;
   * this is not supported in WebGL, and is emulated in Cesium via {@link GeometryPipeline.encodeAttribute})
   * and the type of an element in <code>Float64Array</code>.
   *
   * @memberOf ComponentDatatype
   *
   * @type {Number}
   * @constant
   * @default 0x140A
   */
  static DOUBLE = WebGLConstants.DOUBLE;

  /**
   * 
   * @param {number} componentDatatype 
   * @returns 
   */
  static getSizeInBytes(componentDatatype) {
    if (!defined(componentDatatype)) {
      throw new Error("value is required.");
    }

    switch (componentDatatype) {
      case ComponentDatatype.BYTE:
        return Int8Array.BYTES_PER_ELEMENT;
      case ComponentDatatype.UNSIGNED_BYTE:
        return Uint8Array.BYTES_PER_ELEMENT;
      case ComponentDatatype.SHORT:
        return Int16Array.BYTES_PER_ELEMENT;
      case ComponentDatatype.UNSIGNED_SHORT:
        return Uint16Array.BYTES_PER_ELEMENT;
      case ComponentDatatype.INT:
        return Int32Array.BYTES_PER_ELEMENT;
      case ComponentDatatype.UNSIGNED_INT:
        return Uint32Array.BYTES_PER_ELEMENT;
      case ComponentDatatype.FLOAT:
        return Float32Array.BYTES_PER_ELEMENT;
      case ComponentDatatype.DOUBLE:
        return Float64Array.BYTES_PER_ELEMENT;
      default:
        throw new Error("componentDatatype is not a valid value.");
    }
  }

  /**
   * 
   * @param {Int8Array|Uint8Array|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array} array 
   * @returns 
   */
  static fromTypedArray(array) {
    if (array instanceof Int8Array) {
      return ComponentDatatype.BYTE;
    }
    if (array instanceof Uint8Array) {
      return ComponentDatatype.UNSIGNED_BYTE;
    }
    if (array instanceof Int16Array) {
      return ComponentDatatype.SHORT;
    }
    if (array instanceof Uint16Array) {
      return ComponentDatatype.UNSIGNED_SHORT;
    }
    if (array instanceof Int32Array) {
      return ComponentDatatype.INT;
    }
    if (array instanceof Uint32Array) {
      return ComponentDatatype.UNSIGNED_INT;
    }
    if (array instanceof Float32Array) {
      return ComponentDatatype.FLOAT;
    }
    if (array instanceof Float64Array) {
      return ComponentDatatype.DOUBLE;
    }
  }

};

export default Object.freeze(ComponentDatatype);
