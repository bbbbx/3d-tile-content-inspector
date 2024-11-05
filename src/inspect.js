import { decodePrimitive } from "./parseDraco.js";
import { parseGlb } from "./parseGlb.js";
import { parseB3dm } from "./parseB3dm.js";
import { parseI3dm } from "./parseI3dm.js";
import { parsePnts } from "./parsePnts.js";
import { parseCmpt } from "./parseCmpt.js";
import { parseFeatureTableOrBatchTable } from "./parseFeatureTableOrBatchTable.js";
import { constructHexViewer } from "./constructHexViewer.js";

const hexViewer = document.getElementById('hexViewer');
const ui = document.getElementById('ui');
const warningElem = document.getElementById('warning');

const hexDumpWorker = new Worker('./hexDump.js', { type: 'module' });

function inspect(arrayBuffer, filename) {

  return new Promise((resolve, reject) => {
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

      let result = null;
      if (magic === 'pnts') {
        result = inspectPnts(arrayBuffer);
      } else if (magic === 'cmpt') {
        result = inspectCmpt(arrayBuffer);
      } else if (magic === 'b3dm') {
        result = inspectB3dm(arrayBuffer, filename + '.glb');
      } else if (magic === 'i3dm') {
        result = inspectI3dm(arrayBuffer, filename + '.glb');
      } else if (magic === 'glTF') {
        result = inspectGlb(arrayBuffer);
      } else if (magic === 'DRAC' && textDecoder.decode(new Uint8Array(arrayBuffer, 4, 1)) === 'O') {
        result = inspectDraco(arrayBuffer);
      }

      if (result) {
        resolve(result);
      } else {
        reject(`Unsupported format: "${magic}"`);
      }
    });
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

function createAnchorForDownload(arrayBuffer, filename) {
  const blob = new Blob([ arrayBuffer ]);
  const objectURL = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.innerText = 'Click to download '+ filename;
  anchor.setAttribute('id', 'download');
  anchor.setAttribute('href', objectURL);
  anchor.setAttribute('download', filename);

  // TODO: call URL.revokeObjectURL(objectURL);
  return anchor;
}

function inspectGlb(arrayBuffer) {
  const glb = parseGlb(arrayBuffer);

  return glb;
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

  return decodedDraco;
}

function inspectB3dm(arrayBuffer, filename) {
  let b3dm = parseB3dm(arrayBuffer);

  const oldAnchorELem = document.getElementById('download');
  if (oldAnchorELem) {
    ui.removeChild(oldAnchorELem);
  }

  const anchorElem = createAnchorForDownload(b3dm.glb, filename);
  ui.appendChild(anchorElem);

  const glb = parseGlb(b3dm.glb);
  b3dm.glb = glb;

  b3dm = extractFeatureTableAndBatchTable(b3dm);

  return b3dm;
}

function inspectI3dm(arrayBuffer, filename) {
  let i3dm = parseI3dm(arrayBuffer);

  const urlOrGlb = i3dm.urlOrGlb;
  if (urlOrGlb instanceof ArrayBuffer) {
    const oldAnchorELem = document.getElementById('download');
    if (oldAnchorELem) {
      ui.removeChild(oldAnchorELem);
    }

    const anchorElem = createAnchorForDownload(urlOrGlb, filename);
    ui.appendChild(anchorElem);

    const glb = parseGlb(urlOrGlb);
    i3dm.urlOrGlb = glb;
  }

  i3dm = extractFeatureTableAndBatchTable(i3dm);

  return i3dm;
}

function inspectPnts(arrayBuffer) {

  let pnts = parsePnts(arrayBuffer);
  validatePntsByteLength(pnts);
  pnts = extractFeatureTableAndBatchTable(pnts);

  return pnts;
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

  return cmpt;
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

export {
  inspect,
};
