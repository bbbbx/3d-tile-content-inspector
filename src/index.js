const infoElem = document.getElementById('info');
const errorElem = document.getElementById('error');
const jsonViewer = document.getElementById('jsonViewer');
const hexViewer = document.getElementById('hexViewer');
const ui = document.getElementById('ui');
const fileElem = document.getElementById('file');

function inspectFile(file) {
  infoElem.innerText = 'Loading...';

  const fileReader = new FileReader();
  fileReader.onload = function(event) {
    if (fileReader.readyState === FileReader.DONE){
      const arrayBuffer = fileReader.result;
      inspect(arrayBuffer);
    }
  };
  fileReader.readAsArrayBuffer(file);
}

ui.addEventListener('drop', ev => {
  ev.preventDefault();

  let file;
  if (ev.dataTransfer.items && ev.dataTransfer.items.length > 0) {
    file = ev.dataTransfer.items[0].getAsFile();
  } else if (ev.dataTransfer.files && ev.dataTransfer.files.length > 0) {
    file = ev.dataTransfer.files[0];
  }

  if (file) {
    inspectFile(file);
  }
});

fileElem.addEventListener('click', function() {
  fileElem.value = '';
});
fileElem.addEventListener('change', function(event) {
  const files = event.target.files;
  const file = files[0];

  inspectFile(file);
});

const urlElem = document.getElementById('url');
const inspectElem = document.getElementById('inspect');
inspectElem.addEventListener('click', function() {
  const url = urlElem.value;
  inspectFromUrl(url);
});

function fetchArrayBuffer(url) {
  return fetch(url)
    .then(r => r.arrayBuffer());
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
    .then(function(arrayBuffer) {
      inspect(arrayBuffer);
    })
    .catch(function(error) {
      infoElem.innerText = '';
      errorElem.innerText = 'Failed: ' + error.message;
    })
}

function inspect(arrayBuffer) {

  errorElem.innerText = '';

  // ----- For hex viewer -----
  infoElem.innerText = 'Parsing...';
  const hex = hexDump(arrayBuffer);
  constructHexViewer(hex, hexViewer);

  const textDecoder = new TextDecoder('utf8');
  const magic = textDecoder.decode(new Uint8Array(arrayBuffer, 0, 4));

  if (magic === 'pnts') {
    inspectPnts(arrayBuffer);
  } else if (magic === 'cmpt') {
    inspectCmpt(arrayBuffer);
  } else if (magic === 'b3dm') {
    inspectB3dm(arrayBuffer);
  } else if (magic === 'i3dm') {
    inspectI3dm(arrayBuffer);
  } else {
    infoElem.innerText = '';
    errorElem.innerText = 'Unsupported format: ' + magic;
  }

}

function constructJsonView(object) {
  // use CodeMirror to show JSON
  const stringifyObject = JSON.stringify(object, null, 4);

  jsonViewer.innerHTML = '';
  const myCodeMirror = CodeMirror(jsonViewer, {
    value: stringifyObject,
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
}

function extractFeatureTableAndBatchTable(parsedTile) {
  const { tableObject: featureTable, featureLength } = parseFeatureTableOrBatchTable(parsedTile.featureTableJson, parsedTile.featureTableBinary);
  const { tableObject: batchTable } = parseFeatureTableOrBatchTable(parsedTile.batchTableJson, parsedTile.batchTableBinary, featureLength);

  parsedTile = {
    ...parsedTile,
    ...featureTable,
    ...batchTable,
  };
  delete parsedTile.featureTableBinary;
  delete parsedTile.batchTableBinary;

  return parsedTile;
}

function inspectB3dm(arrayBuffer) {
  let b3dm = parseB3dm(arrayBuffer);

  b3dm = extractFeatureTableAndBatchTable(b3dm);
  constructJsonView(b3dm);

  infoElem.innerText = 'Done';
  errorElem.innerText = '';
}

function inspectI3dm(arrayBuffer) {
  let i3dm = parseI3dm(arrayBuffer);

  i3dm = extractFeatureTableAndBatchTable(i3dm);
  constructJsonView(i3dm);

  infoElem.innerText = 'Done';
  errorElem.innerText = '';
}

function inspectPnts(arrayBuffer) {

  let pnts = parsePnts(arrayBuffer);
  validatePntsByteLength(pnts);
  pnts = extractFeatureTableAndBatchTable(pnts);

  constructJsonView(pnts);

  infoElem.innerText = 'Done';
  errorElem.innerText = '';

}

function inspectCmpt(arrayBuffer) {
  const cmpt = parseCmpt(arrayBuffer);

  const tiles = cmpt.tiles;
  const tilesLength = cmpt.tilesLength;
  for (let i = 0; i < tilesLength; i++) {
    let tile = tiles[i];
    if (tile.magic === 'pnts') {
      validatePntsByteLength(tile);
    }

    tile = extractFeatureTableAndBatchTable(tile);
    tiles[i] = tile;
  }

  constructJsonView(cmpt);

  infoElem.innerText = 'Done';
  errorElem.innerText = '';
}

function validatePntsByteLength(tile) {
  const headerByteLength = 28;
  const {
    magic,
    byteLength,
    featureTableJsonByteLength,
    featureTableBinaryByteLength,
    batchTableJsonByteLength,
    batchTableBinaryByteLength
  } = tile;
  const expectedByteLength = headerByteLength + featureTableJsonByteLength + featureTableBinaryByteLength + batchTableJsonByteLength + batchTableBinaryByteLength;
  if (byteLength !== expectedByteLength) {
    alert(magic + ' content bytes length is NOT equals byteLength field.');
  }
}
