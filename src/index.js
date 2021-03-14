const infoElem = document.getElementById('info');
const errorElem = document.getElementById('error');
const jsonViewer = document.getElementById('jsonViewer');
const hexViewer = document.getElementById('hexViewer');
const fileElem = document.getElementById('file');

fileElem.addEventListener('click', event => {
  fileElem.value = '';
})
fileElem.addEventListener('change', event => {
  const files = event.target.files;
  const file = files[0];

  const fileReader = new FileReader();
  fileReader.onload = function(event) {
    if (fileReader.readyState === FileReader.DONE){
      const arrayBuffer = fileReader.result;

      inspect(arrayBuffer);
    }
  };

  fileReader.readAsArrayBuffer(file);
});

const urlElem = document.getElementById('url');
const inspectElem = document.getElementById('inspect');
inspectElem.addEventListener('click', () => {
  const url = urlElem.value;
  inspectFromUrl(url);
});

function fetchArrayBuffer(url) {
  return fetch(url)
    .then(r => r.arrayBuffer());
}

const getNumberOfComponent = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
};
const getComponentType = {
  BYTE: Int8Array,
  UNSIGNED_BYTE: Uint8Array,
  SHORT: Int16Array,
  UNSIGNED_SHORT: Uint16Array,
  INT: Int32Array,
  UNSIGNED_INT: Uint32Array,
  FLOAT: Float32Array,
  DOUBLE: Float64Array,
};

const featureTableSemantics = {
  POSITION: {
    componentType: 'FLOAT',
    type: 'VEC3',
  },
  POSITION_QUANTIZED: {
    componentType: 'UNSIGNED_SHORT',
    type: 'VEC3',
  },
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
  BATCH_ID: {
    // uint8, uint16 (default), or uint32
    componentType: 'UNSIGNED_SHORT',
    type: 'SCALAR',
  }
}

function getBufferBySemantics(buffer, offset, componentType, type, batchLength) {
  const numberOfComponent = getNumberOfComponent[type];
  const constructor = getComponentType[componentType];
  const sizeInBytes = constructor.BYTES_PER_ELEMENT;

  const byteLength = sizeInBytes * numberOfComponent * batchLength;
  const offsetBuffer = new constructor(buffer.slice(offset, offset + byteLength));
  return offsetBuffer;
}

function defaultValue(a, b) {
  if (a !== undefined || a != null) {
    return a;
  }
  return b;
}

function inspectFromUrl(url) {
  infoElem.innerText = 'Loading...';

  fetchArrayBuffer(url)
    .then(arrayBuffer => {
      inspect(arrayBuffer);
    })
    .catch(error => {
      infoElem.innerText = '';
      errorElem.innerText = 'Failed: ' + error.message;
    })
}

function inspect(arrayBuffer) {

  infoElem.innerText = 'Parsing...';
  errorElem.innerText = '';

  // ----- For hex viewer -----
  const hex = hexdrump(arrayBuffer);
  constructHexViewer(hex, hexViewer);

  // ----- For json viewer -----
  const pnts = parsePnts(arrayBuffer);
  const {
    magic,
    version,
    byteLength,
    featureTableJsonByteLength,
    featureTableBinaryByteLength,
    batchTableJsonByteLength,
    batchTableBinaryByteLength,

    featureTableJson,
    featureTableBinary,
    batchTableJson,
    batchTableBinary,
  } = pnts;

  if (magic !== 'pnts') {
    errorElem.innerText = 'Magic number is NOT \'pnts\', current is ' + magic + '.';
    return;
  }

  if (version !== 1) {
    errorElem.innerText = 'Version is NOT 1.0, current is ' + version + '.';
    return;
  }

  const headerByteLength = 28;
  const expectedByteLength = headerByteLength + featureTableJsonByteLength + featureTableBinaryByteLength + batchTableJsonByteLength + batchTableBinaryByteLength;
  if (byteLength !== expectedByteLength) {
    errorElem.innerText = 'pnts content bytes length is NOT equals byteLength field.';
  }

  // FIXME: Pack feature table, up to 100 records can be displayed.
  const pointsLength = Math.min(featureTableJson.POINTS_LENGTH, 100);
  for (const key of Object.keys(featureTableJson)) {
    if (featureTableJson.hasOwnProperty(key)) {
      const semantics = featureTableSemantics[key];
      if (!semantics) {
        continue;
      }

      const featureTableBinary = pnts.featureTableBinary;
      const featureTableBuffer = featureTableBinary.buffer.slice(
        featureTableBinary.byteOffset,
        featureTableBinary.byteOffset + featureTableBinary.byteLength
      );

      const byteOffset = pnts.featureTableJson[key].byteOffset;
      // BATCH_ID may have componentType definition.
      const componentType = key === 'BATCH_ID' && featureTableJson[key].componentType
        ? featureTableJson[key].componentType
        : semantics.componentType;
      const type = semantics.type;

      const fieldBuffer = getBufferBySemantics(
        featureTableBuffer,
        byteOffset,
        componentType,
        type,
        pointsLength
      );

      const fieldValue = [];
      for (let i = 0; i < pointsLength; i++) {
        const numberOfComponent = getNumberOfComponent[type];

        fieldValue[i] = [];
        for (let j = 0; j < numberOfComponent; j++) {
          const component = fieldBuffer[i * numberOfComponent + j];
          fieldValue[i].push(component);
        }
      }
      pnts[key] = fieldValue;
    }
  }

  // Pack batch table, up to 100 records can be displayed.
  const batchLength = Math.min(defaultValue(pnts.featureTableJson.BATCH_LENGTH, pnts.featureTableJson.POINTS_LENGTH), 100);
  for (const key of Object.keys(pnts.batchTableJson)) {
    if (pnts.batchTableJson.hasOwnProperty(key)) {
      const semantics = pnts.batchTableJson[key];

      const batchTableBinary = pnts.batchTableBinary;
      const batchTableBuffer = batchTableBinary.buffer.slice(
        batchTableBinary.byteOffset,
        batchTableBinary.byteOffset + batchTableBinary.byteLength
      );

      const fieldBuffer = getBufferBySemantics(batchTableBuffer, semantics.byteOffset, semantics.componentType, semantics.type, batchLength);

      const fieldValue = [];
      for (let i = 0; i < batchLength; i++) {
        const numberOfComponent = getNumberOfComponent[semantics.type];

        fieldValue[i] = [];
        for (let j = 0; j < numberOfComponent; j++) {
          const component = fieldBuffer[i * numberOfComponent + j];
          fieldValue[i].push(component);
        }
      }

      pnts[key] = fieldValue;
    }
  }

  // delete array buffer
  delete pnts.featureTableBinary;
  delete pnts.batchTableBinary;

  // use CodeMirror to show JSON
  const stringifyPnts = JSON.stringify(pnts, null, 4);

  jsonViewer.innerHTML = '';
  const myCodeMirror = CodeMirror(jsonViewer, {
    value: stringifyPnts,
    mode: {
      name: 'javascript',
      json: true,
    },
    lineNumbers: true,
    readOnly: true,

    // collapse code
    lineWrapping:true,
    foldGutter: true,
    gutters:["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    foldOptions: {
      widget: (from, to) => {
        var count = undefined;

        // Get open / close token
        var startToken = '{', endToken = '}';
        var prevLine = myCodeMirror.getLine(from.line);
        if (prevLine.lastIndexOf('[') > prevLine.lastIndexOf('{')) {
          startToken = '[', endToken = ']';
        }

        // Get json content
        var internal = myCodeMirror.getRange(from, to);
        var toParse = startToken + internal + endToken;

        // Get key count
        try {
          var parsed = JSON.parse(toParse);
          count = Object.keys(parsed).length;
        } catch(e) { }

        return count ? `\u21A4${count}\u21A6` : '\u2194';
      }
    },
    fullScreen:true
  });

  infoElem.innerText = 'Done';
  errorElem.innerText = '';

}
