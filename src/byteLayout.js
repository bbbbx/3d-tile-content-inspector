import { readHeader } from "./tileFormat.js";

// Splits a tile file into labelled byte ranges (header, feature table, glTF
// chunks, ...) so the hex viewer can colour them and the JSON view can jump to
// them. Only headers are read; parsing the content is left to the parsers.

const textDecoder = new TextDecoder('utf-8');

const GLB_HEADER_BYTE_LENGTH = 12;
const GLB_CHUNK_HEADER_BYTE_LENGTH = 8;
const GLB_CHUNK_TYPE_JSON = 0x4E4F534A;
const GLB_CHUNK_TYPE_BIN = 0x004E4942;
const CMPT_HEADER_BYTE_LENGTH = 16;
const CMPT_INNER_HEADER_BYTE_LENGTH = 12;

// JSON property name in the inspect result -> `jsonKey` of the section it
// describes, in the same object.
const KEY_TO_SECTION = {
  magic: 'header',
  version: 'header',
  byteLength: 'header',
  tilesLength: 'header',
  gltfFormat: 'header',
  featureTableJson: 'featureTableJson',
  featureTableJsonByteLength: 'featureTableJson',
  featureTableBinaryByteLength: 'featureTableBinary',
  batchTableJson: 'batchTableJson',
  batchTableJsonByteLength: 'batchTableJson',
  batchTableBinaryByteLength: 'batchTableBinary',
  JSON: 'JSON',
  BIN: 'BIN',
};

// Properties holding an embedded glTF: they jump to that glTF's header.
const NESTED_GLTF_KEYS = new Set(['glb', 'urlOrGlb']);

function magicAt(view, offset) {
  if (offset + 4 > view.byteLength) {
    return undefined;
  }
  return textDecoder.decode(new Uint8Array(view.buffer, view.byteOffset + offset, 4));
}

/**
 * @param {ArrayBuffer} arrayBuffer
 * @returns {{ id: string, kind: string, label: string, start: number, end: number, path: (string|number)[], jsonKey?: string }[]}
 *   Non-overlapping, non-empty sections in file order. `path` is the location
 *   of the owning object in the inspect result, e.g. `['tiles', 0, 'glb']`.
 */
function getByteLayout(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const sections = [];
  try {
    layoutAt(view, 0, view.byteLength, [], '', sections);
  } catch (error) {
    // Malformed header: keep the sections found so far. The parser reports
    // the actual error.
  }
  sections.forEach((section, index) => {
    section.id = 's' + index;
  });
  return sections;
}

function pushSection(sections, kind, label, start, end, limit, path, jsonKey) {
  start = Math.min(start, limit);
  end = Math.min(end, limit);
  if (end > start) {
    sections.push({ kind, label, start, end, path, jsonKey });
  }
  return end;
}

function layoutAt(view, start, end, path, prefix, sections) {
  const magic = magicAt(view, start);
  if (magic === 'b3dm' || magic === 'i3dm' || magic === 'pnts') {
    layoutTile(view, start, end, magic, path, prefix, sections);
  } else if (magic === 'cmpt') {
    layoutCmpt(view, start, end, path, prefix, sections);
  } else if (magic === 'glTF') {
    layoutGlb(view, start, end, path, prefix, sections);
  }
}

function layoutTile(view, start, end, magic, path, prefix, sections) {
  const header = readHeader(view, start + 4);
  const tileEnd = Math.min(start + header.byteLength, end);

  let offset = header.byteOffset;
  let gltfFormat;
  if (magic === 'i3dm') {
    gltfFormat = view.getUint32(offset, true);
    offset += 4;
  }

  offset = pushSection(sections, 'header', prefix + magic + ' header', start, offset, tileEnd, path, 'header');
  offset = pushSection(sections, 'featureTableJson', prefix + 'Feature table JSON',
    offset, offset + header.featureTableJsonByteLength, tileEnd, path, 'featureTableJson');
  offset = pushSection(sections, 'featureTableBinary', prefix + 'Feature table binary',
    offset, offset + header.featureTableBinaryByteLength, tileEnd, path, 'featureTableBinary');
  offset = pushSection(sections, 'batchTableJson', prefix + 'Batch table JSON',
    offset, offset + header.batchTableJsonByteLength, tileEnd, path, 'batchTableJson');
  offset = pushSection(sections, 'batchTableBinary', prefix + 'Batch table binary',
    offset, offset + header.batchTableBinaryByteLength, tileEnd, path, 'batchTableBinary');

  if (magic === 'b3dm') {
    layoutGlb(view, offset, tileEnd, path.concat('glb'), prefix, sections);
  } else if (magic === 'i3dm') {
    if (gltfFormat === 1) {
      layoutGlb(view, offset, tileEnd, path.concat('urlOrGlb'), prefix, sections);
    } else {
      pushSection(sections, 'glbJson', prefix + 'glTF URI', offset, tileEnd, tileEnd, path.concat('urlOrGlb'), 'header');
    }
  }
}

function layoutCmpt(view, start, end, path, prefix, sections) {
  const byteLength = view.getUint32(start + 8, true);
  const tilesLength = view.getUint32(start + 12, true);
  const cmptEnd = Math.min(start + byteLength, end);

  let offset = pushSection(sections, 'header', prefix + 'cmpt header',
    start, start + CMPT_HEADER_BYTE_LENGTH, cmptEnd, path, 'header');

  // Mirrors parseCmpt: unsupported inner tiles are skipped and do not take
  // an index in `tiles`.
  let tileIndex = 0;
  for (let i = 0; i < tilesLength && offset + CMPT_INNER_HEADER_BYTE_LENGTH <= cmptEnd; i++) {
    const tileMagic = magicAt(view, offset);
    const tileByteLength = view.getUint32(offset + 8, true);
    if (tileByteLength === 0) {
      break;
    }
    const tileEnd = Math.min(offset + tileByteLength, cmptEnd);

    if (tileMagic === 'b3dm' || tileMagic === 'i3dm' || tileMagic === 'pnts' || tileMagic === 'cmpt') {
      layoutAt(view, offset, tileEnd, path.concat('tiles', tileIndex), `${prefix}tiles[${tileIndex}] · `, sections);
      tileIndex++;
    } else {
      pushSection(sections, 'header', `${prefix}unsupported tile "${tileMagic}"`, offset, tileEnd, tileEnd, path);
    }
    offset = tileEnd;
  }
}

function layoutGlb(view, start, end, path, prefix, sections) {
  if (magicAt(view, start) !== 'glTF') {
    pushSection(sections, 'glbBin', prefix + 'glTF', start, end, end, path, 'header');
    return;
  }

  const byteLength = view.getUint32(start + 8, true);
  const glbEnd = Math.min(start + byteLength, end);

  let offset = pushSection(sections, 'glbHeader', prefix + 'glTF header',
    start, start + GLB_HEADER_BYTE_LENGTH, glbEnd, path, 'header');

  while (offset + GLB_CHUNK_HEADER_BYTE_LENGTH <= glbEnd) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkEnd = offset + GLB_CHUNK_HEADER_BYTE_LENGTH + chunkLength;

    if (chunkType === GLB_CHUNK_TYPE_JSON) {
      offset = pushSection(sections, 'glbJson', prefix + 'glTF JSON chunk', offset, chunkEnd, glbEnd, path, 'JSON');
    } else if (chunkType === GLB_CHUNK_TYPE_BIN) {
      offset = pushSection(sections, 'glbBin', prefix + 'glTF BIN chunk', offset, chunkEnd, glbEnd, path, 'BIN');
    } else {
      offset = pushSection(sections, 'glbBin', prefix + 'glTF chunk', offset, chunkEnd, glbEnd, path);
    }
  }
}

function isSamePath(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Finds the section described by property `key` of the object at `path` in
 * the inspect result.
 */
function findSectionForField(layout, path, key) {
  let sectionPath = path;
  let jsonKey = KEY_TO_SECTION[key];
  if (NESTED_GLTF_KEYS.has(key)) {
    sectionPath = path.concat(key);
    jsonKey = 'header';
  }
  if (!jsonKey) {
    return undefined;
  }
  return layout.find(section => section.jsonKey === jsonKey && isSamePath(section.path, sectionPath));
}

export {
  getByteLayout,
  findSectionForField,
};
