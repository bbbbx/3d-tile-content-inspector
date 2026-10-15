import defined from "./defined.js";
import { decodePrimitive } from "./parseDraco.js";

const FEATURE_SEMANTICS = {
  // common
  POSITION: {
    componentType: 'FLOAT',
    type: 'VEC3',
  },
  POSITION_QUANTIZED: {
    componentType: 'UNSIGNED_SHORT',
    type: 'VEC3',
  },

  // pnts
  RGBA: {
    componentType: 'UNSIGNED_BYTE',
    type: 'VEC4',
  },
  RGB: {
    componentType: 'UNSIGNED_BYTE',
    type: 'VEC3',
  },
  RGB565: {
    componentType: 'UNSIGNED_SHORT',
    type: 'SCALAR',
  },
  NORMAL: {
    componentType: 'FLOAT',
    type: 'VEC3',
  },
  NORMAL_OCT16P: {
    componentType: 'UNSIGNED_BYTE',
    type: 'VEC2',
  },
  BATCH_ID: {
    // uint8, uint16 (default), or uint32
    componentType: 'UNSIGNED_SHORT',
    type: 'SCALAR',
  },

  // i3dm
  NORMAL_UP: {
    componentType: 'FLOAT',
    type: 'VEC3'
  },
  NORMAL_RIGHT: {
    componentType: 'FLOAT',
    type: 'VEC3'
  },
  NORMAL_UP_OCT32P: {
    componentType: 'UNSIGNED_SHORT',
    type: 'VEC2'
  },
  NORMAL_RIGHT_OCT32P: {
    componentType: 'UNSIGNED_SHORT',
    type: 'VEC2'
  },
  SCALE: {
    componentType: 'FLOAT',
    type: 'SCALAR'
  },
  SCALE_NON_UNIFORM: {
    componentType: 'FLOAT',
    type: 'VEC3'
  },
};

const GLOBAL_SEMANTICS = {
  INSTANCES_LENGTH: {
    componentType: 'UNSIGNED_INT',
    type: 'SCALAR'
  },
  RTC_CENTER: {
    componentType: 'FLOAT',
    type: 'VEC3'
  },
  QUANTIZED_VOLUME_OFFSET: {
    componentType: 'FLOAT',
    type: 'VEC3'
  },
  QUANTIZED_VOLUME_SCALE: {
    componentType: 'FLOAT',
    type: 'VEC3'
  },
  EAST_NORTH_UP: {
    componentType: 'UNSIGNED_BYTE',
    type: 'SCALAR'
  },

  BATCH_LENGTH: {
    componentType: 'UNSIGNED_INT',
    type: 'SCALAR'
  },

  POINTS_LENGTH: {
    componentType: 'UNSIGNED_INT',
    type: 'SCALAR'
  },
  CONSTANT_RGBA: {
    componentType: 'UNSIGNED_BYTE',
    type: 'VEC4'  
  }
};

const NUMBER_OF_COMPONENTS = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
};

const COMPONENT_TYPE_TYPED_ARRAY = {
  BYTE: Int8Array,
  UNSIGNED_BYTE: Uint8Array,
  SHORT: Int16Array,
  UNSIGNED_SHORT: Uint16Array,
  INT: Int32Array,
  UNSIGNED_INT: Uint32Array,
  FLOAT: Float32Array,
  DOUBLE: Float64Array,
};

function getSemanticsType(name) {
  return (FEATURE_SEMANTICS[name] && FEATURE_SEMANTICS[name].type) ||
    (GLOBAL_SEMANTICS[name] && GLOBAL_SEMANTICS[name].type);
}

function extractSemanticsValue(semantics, key, uint8ArrayView, length) {
  let value;

  if (Array.isArray(semantics)) {
    value = semantics;
  } else if (typeof semantics === 'number') {
    value = semantics;
  } else if (typeof semantics === 'object' && semantics !== null) {
    let { byteOffset, componentType, type } = semantics;

    if (!defined(componentType)) {
      if (FEATURE_SEMANTICS[key]) {
        componentType = FEATURE_SEMANTICS[key].componentType;
      } else {
        return;
      }
    }
    if (!defined(type)) {
      type = FEATURE_SEMANTICS[key].type;
    }

    const numberOfComponents = NUMBER_OF_COMPONENTS[type];
    const constructor = COMPONENT_TYPE_TYPED_ARRAY[componentType];
    const bytesLengthOfComponent = constructor.BYTES_PER_ELEMENT;
    const bytesLength = bytesLengthOfComponent * numberOfComponents * length;
    const offsetBufferView = new constructor(
      uint8ArrayView.buffer.slice(
        uint8ArrayView.byteOffset + byteOffset,
        uint8ArrayView.byteOffset + byteOffset + bytesLength
      )
    );

    value = [];
    for (let i = 0; i < offsetBufferView.length; i += numberOfComponents) {
      const v = Array.from(offsetBufferView.subarray(i, i + numberOfComponents));
      value.push(v);
    }
  }

  return value;
}

function parseFeatureTableOrBatchTable(featureTableJson, featureTableBinary, featureLength) {

  if (!defined(featureTableJson)) {
    return {
      tableObject: undefined,
      featureLength: featureLength
    };
  }

  featureLength = featureLength || featureTableJson.INSTANCES_LENGTH || featureTableJson.POINTS_LENGTH || featureTableJson.BATCH_LENGTH;
  const featureLengthKey = featureTableJson.INSTANCES_LENGTH ? 'INSTANCES_LENGTH' :
    featureTableJson.POINTS_LENGTH ? 'POINTS_LENGTH' : 
    featureTableJson.BATCH_LENGTH ? 'BATCH_LENGTH' :
    undefined;
  const extractedFeatureTable = {};

  if (!defined(featureLength)) {
    return extractedFeatureTable;
  }

  if (typeof featureLength !== 'number') {
    featureLength = extractSemanticsValue(featureLength, featureLengthKey, featureTableBinary, 1);
  }

  // Performance: up to 100 records
  featureLength = Math.min(featureLength, 100);

  const extensions = featureTableJson.extensions;
  if (extensions) {
    const dracoPointCompressionExtension = extensions['3DTILES_draco_point_compression'];
    if (dracoPointCompressionExtension) {
      const properties = dracoPointCompressionExtension.properties;
      const byteOffset = dracoPointCompressionExtension.byteOffset ?? 0;
      const byteLength = dracoPointCompressionExtension.byteLength ?? featureTableBinary.byteLength;

      const dracoDataArrayBufferView = featureTableBinary.subarray(byteOffset, byteOffset + byteLength);

      const decoded = decodePrimitive(dracoDataArrayBufferView, { byteLength: byteLength }, properties);
      const attributeData = decoded.attributeData;

      for (const attributeName of Object.keys(attributeData)) {
        if (Object.hasOwn(attributeData, attributeName)) {
          extractedFeatureTable[attributeName] = [];

          const attributeArray = attributeData[attributeName].array;
          const semantics = featureTableJson[attributeName];
          let type = semantics.type;
          if (!defined(type)) {
            type = getSemanticsType(attributeName);
          }
          if (!defined(type)) {
            console.warn('Can not find semantics of ' + attributeName + '.');
            continue;
          }

          const numberOfComponents = NUMBER_OF_COMPONENTS[type];
          for (let i = 0; i < featureLength; i++) {
            const feature = [];
            for (let j = 0; j < numberOfComponents; j++) {
              const element = attributeArray[i * numberOfComponents + j];
              feature.push(element);
            }
            extractedFeatureTable[attributeName].push(feature);
          }
        }
      }
    } else {
      console.warn('Only supported 3DTILES_draco_point_compression extension, current extensions is ' + Object.keys(extensions).join(', ') + '.');
    }
  } else {

    for (const key of Object.keys(featureTableJson)) {
      if (Object.hasOwn(featureTableJson, key)) {
        const semantics = featureTableJson[key];
        if (GLOBAL_SEMANTICS[key]) {
          featureTableJson[key] = extractSemanticsValue(semantics, key, featureTableBinary, 1);
          continue;
        }

        // exclude number and array
        if (typeof semantics === 'object' && semantics !== null && !Array.isArray(semantics)) {
          const semanticsValue = extractSemanticsValue(semantics, key, featureTableBinary, featureLength);
          extractedFeatureTable[key] = semanticsValue;
        }
      }
    }
  }

  return {
    tableObject: extractedFeatureTable,
    featureLength
  };
}

export {
  parseFeatureTableOrBatchTable,
};
