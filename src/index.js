const infoElem = document.getElementById('info');
const warningElem = document.getElementById('warning');
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
      const filename = file.name;
      inspect(arrayBuffer, filename);
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
      const filename = url.slice(url.lastIndexOf('/') + 1);
      inspect(arrayBuffer, filename);
    })
    .catch(function(error) {
      infoElem.innerText = '';
      errorElem.innerText = 'Failed: ' + error.message;
    })
}

const hexDumpWorker = new Worker('./hexDump.js');

function inspect(arrayBuffer, filename) {

  errorElem.innerText = '';

  // ----- For hex viewer -----
  infoElem.innerText = 'Parsing...';
  hexDumpWorker.postMessage(arrayBuffer, [ arrayBuffer ]);
  hexDumpWorker.addEventListener('message', function resolveHexString(event) {
    // FIXME: cost too expensive
    // use TextEncoder to encode string to arraybuffer,
    // then use TextDecoder to decode arraybuffer.
    // Decoding costs also expensive.
    const { hex, arrayBuffer } = event.data;
    constructHexViewer(hex, hexViewer);

    const textDecoder = new TextDecoder('utf8');
    const magic = textDecoder.decode(new Uint8Array(arrayBuffer, 0, 4));

    if (magic === 'pnts') {
      inspectPnts(arrayBuffer);
    } else if (magic === 'cmpt') {
      inspectCmpt(arrayBuffer);
    } else if (magic === 'b3dm') {
      inspectB3dm(arrayBuffer, filename + '.glb');
    } else if (magic === 'i3dm') {
      inspectI3dm(arrayBuffer, filename + '.glb');
    } else if (magic === 'glTF') {
      inspectGlb(arrayBuffer);
    } else if (magic === 'DRAC' && textDecoder.decode(new Uint8Array(arrayBuffer, 4, 1)) === 'O') {
      inspectDraco(arrayBuffer);
    } else {
      infoElem.innerText = '';
      errorElem.innerText = 'Unsupported format: ' + magic;
    }
  });

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
          startToken = '[';
          endToken = ']';
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

  let binary = parsedTile.batchTableBinary;
  if (parsedTile.magic === 'pnts' && parsedTile.batchTableJson) {
    const extensions = parsedTile.batchTableJson.extensions;
    if (extensions && extensions['3DTILES_draco_point_compression']) {
      binary = parsedTile.featureTableBinary;
    }
  }
  const { tableObject: batchTable } = parseFeatureTableOrBatchTable(parsedTile.batchTableJson, binary, featureLength);

  parsedTile = {
    ...parsedTile,
    ...featureTable,
    ...batchTable,
  };
  delete parsedTile.featureTableBinary;
  delete parsedTile.batchTableBinary;

  return parsedTile;
}

function createAnchorForDownloadGlb(arrayBuffer, filename) {
  const blob = new Blob([ arrayBuffer ]);
  const objectURL = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.innerText = 'Click to download '+ filename;
  anchor.setAttribute('id', 'downloadGlb');
  anchor.setAttribute('href', objectURL);
  anchor.setAttribute('download', filename);

  // TODO: call URL.revokeObjectURL(objectURL);
  return anchor;
}

function inspectGlb(arrayBuffer) {
  const glb = parseGlb(arrayBuffer);

  constructJsonView(glb);

  infoElem.innerText = 'Done';
  errorElem.innerText = '';
}

function inspectDraco(arrayBuffer) {

  const bufferView = {
    byteLength: arrayBuffer.byteLength,
  };
  const decodedDraco = decodePrimitive(arrayBuffer, bufferView, undefined, true);
  const attributeData = decodedDraco.attributeData;

  for (const attributeId in attributeData) {
    if (Object.hasOwnProperty.call(attributeData, attributeId)) {
      const attribute = attributeData[attributeId];
      attribute.array = attribute.array.slice(0, 100);
    }
  }
  decodedDraco.indexArray.typedArray = decodedDraco.indexArray.typedArray.slice(0, 100);

  constructJsonView(decodedDraco);

  infoElem.innerText = 'Done';
  errorElem.innerText = '';
}

function inspectB3dm(arrayBuffer, filename) {
  let b3dm = parseB3dm(arrayBuffer);

  const oldAnchorELem = document.getElementById('downloadGlb');
  if (oldAnchorELem) {
    ui.removeChild(oldAnchorELem);
  }

  const anchorElem = createAnchorForDownloadGlb(b3dm.glb, filename);
  ui.appendChild(anchorElem);

  const glb = parseGlb(b3dm.glb);
  b3dm.glb = glb;

  b3dm = extractFeatureTableAndBatchTable(b3dm);
  constructJsonView(b3dm);

  infoElem.innerText = 'Done';
  errorElem.innerText = '';
}

function inspectI3dm(arrayBuffer, filename) {
  let i3dm = parseI3dm(arrayBuffer);

  const urlOrGlb = i3dm.urlOrGlb;
  if (urlOrGlb instanceof ArrayBuffer) {
    const oldAnchorELem = document.getElementById('downloadGlb');
    if (oldAnchorELem) {
      ui.removeChild(oldAnchorELem);
    }

    const anchorElem = createAnchorForDownloadGlb(urlOrGlb, filename);
    ui.appendChild(anchorElem);

    const glb = parseGlb(urlOrGlb);
    i3dm.urlOrGlb = glb;
  }

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
    } else if (tile.magic === 'b3dm') {
      const glb = parseGlb(tile.glb);
      tile.glb = glb;
    } else if (tile.magic === 'i3dm') {
      const urlOrGlb = tile.urlOrGlb;
      if (urlOrGlb instanceof ArrayBuffer) {
        const glb = parseGlb(urlOrGlb);
        tile.urlOrGlb = glb;
      } else if (typeof urlOrGlb === 'string') {
        tile.urlOrGlb = urlOrGlb;
      } else {
        console.warn('unknown glTF format.')
      }
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
    warningElem.innerText = magic + ' content bytes length is NOT equals byteLength field.';
  }
}
