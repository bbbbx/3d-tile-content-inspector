import { decodePrimitive } from "./parseDraco.js";
import { parseGlb } from "./parseGlb.js";
import { parseB3dm } from "./parseB3dm.js";
import { parseI3dm } from "./parseI3dm.js";
import { parsePnts } from "./parsePnts.js";
import { parseCmpt } from "./parseCmpt.js";
import { parseFeatureTableOrBatchTable } from "./parseFeatureTableOrBatchTable.js";
import { constructHexViewer } from "./constructHexViewer.js";
import { getByteLayout } from "./byteLayout.js";

const hexViewer = document.getElementById('hexViewer');
const ui = document.getElementById('ui');
const warningElem = document.getElementById('warning');

const hexDumpWorker = new Worker('./hexDump.js', { type: 'module' });

const textDecoder = new TextDecoder('utf8');

function inspect(arrayBuffer, filename) {
  return new Promise((resolve, reject) => {
    hexDumpWorker.postMessage(arrayBuffer, [ arrayBuffer ]);
    hexDumpWorker.onmessage = async function(event) {
      // FIXME: cost too expensive
      // use TextEncoder to encode string to arraybuffer,
      // then use TextDecoder to decode arraybuffer.
      // Decoding costs also expensive.
      const { hex, arrayBuffer } = event.data;
      constructHexViewer(hex, hexViewer, getByteLayout(arrayBuffer), arrayBuffer.byteLength);

      try {
        const result = await inspectArrayBuffer(arrayBuffer, filename);
        resolve(result);
      } catch (error) {
        reject(error && error.message ? error.message : String(error));
      }
    };
  });
}

function inspectArrayBuffer(arrayBuffer, filename) {
  const magic = textDecoder.decode(new Uint8Array(arrayBuffer, 0, 4));

  if (magic === 'pnts') {
    return inspectPnts(arrayBuffer);
  } else if (magic === 'cmpt') {
    return inspectCmpt(arrayBuffer);
  } else if (magic === 'b3dm') {
    return inspectB3dm(arrayBuffer, filename + '.glb');
  } else if (magic === 'i3dm') {
    return inspectI3dm(arrayBuffer, filename + '.glb');
  } else if (magic === 'glTF') {
    return inspectGlb(arrayBuffer);
  } else if (magic === 'DRAC' && textDecoder.decode(new Uint8Array(arrayBuffer, 4, 1)) === 'O') {
    return inspectDraco(arrayBuffer);
  }

  return Promise.reject(`Unsupported format: "${magic}"`);
}

async function extractFeatureTableAndBatchTable(parsedTile) {
  const { tableObject: featureTable, featureLength } = await parseFeatureTableOrBatchTable(parsedTile.featureTableJson, parsedTile.featureTableBinary);

  let binary = parsedTile.batchTableBinary;
  if (parsedTile.magic === 'pnts' && parsedTile.batchTableJson) {
    const extensions = parsedTile.batchTableJson.extensions;
    if (extensions && extensions['3DTILES_draco_point_compression']) {
      binary = parsedTile.featureTableBinary;
    }
  }
  const { tableObject: batchTable } = await parseFeatureTableOrBatchTable(parsedTile.batchTableJson, binary, featureLength);

  const rest = { ...parsedTile };
  delete rest.featureTableBinary;
  delete rest.batchTableBinary;

  return {
    ...rest,
    ...featureTable,
    ...batchTable,
  };
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

function updateDownloadAnchor(arrayBuffer, filename) {
  const oldAnchorElem = document.getElementById('download');
  if (oldAnchorElem) {
    ui.removeChild(oldAnchorElem);
  }

  const anchorElem = createAnchorForDownload(arrayBuffer, filename);
  ui.appendChild(anchorElem);
}

async function inspectGlb(arrayBuffer) {
  const glb = await parseGlb(arrayBuffer);

  return glb;
}

async function inspectDraco(arrayBuffer) {
  const bufferView = {
    byteLength: arrayBuffer.byteLength,
  };
  const decodedDraco = await decodePrimitive(new Uint8Array(arrayBuffer), bufferView, undefined, true);
  const attributeData = decodedDraco.attributeData;

  for (const attributeId in attributeData) {
    if (Object.hasOwnProperty.call(attributeData, attributeId)) {
      const attribute = attributeData[attributeId];
      attribute.array = attribute.array.slice(0, 100);
    }
  }
  if (decodedDraco.indexArray) {
    decodedDraco.indexArray.typedArray = decodedDraco.indexArray.typedArray?.slice(0, 100);
  }

  return decodedDraco;
}

async function inspectB3dm(arrayBuffer, filename) {
  let b3dm = parseB3dm(arrayBuffer);

  updateDownloadAnchor(b3dm.glb, filename);

  const glb = await parseGlb(b3dm.glb);
  b3dm.glb = glb;

  b3dm = await extractFeatureTableAndBatchTable(b3dm);

  return b3dm;
}

async function inspectI3dm(arrayBuffer, filename) {
  let i3dm = parseI3dm(arrayBuffer);

  const urlOrGlb = i3dm.urlOrGlb;
  if (urlOrGlb instanceof ArrayBuffer) {
    updateDownloadAnchor(urlOrGlb, filename);

    const glb = await parseGlb(urlOrGlb);
    i3dm.urlOrGlb = glb;
  }

  i3dm = await extractFeatureTableAndBatchTable(i3dm);

  return i3dm;
}

async function inspectPnts(arrayBuffer) {

  let pnts = parsePnts(arrayBuffer);
  validatePntsByteLength(pnts);
  pnts = await extractFeatureTableAndBatchTable(pnts);

  return pnts;
}

async function inspectCmpt(arrayBuffer) {
  const cmpt = parseCmpt(arrayBuffer);

  const tiles = cmpt.tiles;
  const tilesLength = cmpt.tilesLength;
  for (let i = 0; i < tilesLength; i++) {
    let tile = tiles[i];
    if (tile.magic === 'pnts') {
      validatePntsByteLength(tile);
    } else if (tile.magic === 'b3dm') {
      const glb = await parseGlb(tile.glb);
      tile.glb = glb;
    } else if (tile.magic === 'i3dm') {
      const urlOrGlb = tile.urlOrGlb;
      if (urlOrGlb instanceof ArrayBuffer) {
        const glb = await parseGlb(urlOrGlb);
        tile.urlOrGlb = glb;
      } else if (typeof urlOrGlb !== 'string') {
        console.warn('unknown glTF format.')
      }
    }

    tile = await extractFeatureTableAndBatchTable(tile);
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
