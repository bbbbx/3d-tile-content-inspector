import { findSectionForField } from "./byteLayout.js";
import { toHexString } from "./toHexString.js";

const BYTES_PER_LINE = 16;
// Column layout of a line produced by hexDump.js:
// "00000000: 62 33 ... 00  b3dm...." - 8 offset chars + ": ", then each byte as
// 2 hex chars + 1 space, then (always at the same column) the printable chars.
const HEX_COLUMN = 10;
const CHAR_COLUMN = HEX_COLUMN + BYTES_PER_LINE * 3;
const FLASH_DURATION = 1200;

let currentLayout = [];
let currentHexViewer;
let displayedByteLength = 0;
let flashTimer;

const flashStyle = document.createElement('style');
document.head.appendChild(flashStyle);

/**
 * @param {{ lines: string[] }} hex
 * @param {HTMLElement} hexViewer
 * @param {ReturnType<import('./byteLayout.js').getByteLayout>} [layout=[]]
 * @param {number} [fileByteLength=0]
 */
function constructHexViewer(hex, hexViewer, layout = [], fileByteLength = 0) {
  hexViewer.replaceChildren();
  const { lines } = hex;

  currentLayout = layout;
  currentHexViewer = hexViewer;
  displayedByteLength = Math.min(lines.length * BYTES_PER_LINE, fileByteLength);

  const fragment = document.createDocumentFragment();

  // Legend and column header stay visible while scrolling.
  const sticky = document.createElement('div');
  sticky.className = 'hex-sticky';
  if (layout.length > 0) {
    sticky.appendChild(createLegend(layout));
  }
  const offsetDiv = document.createElement('div');
  offsetDiv.className = 'hex-header';
  offsetDiv.textContent = '  Offset: 00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F';
  sticky.appendChild(offsetDiv);
  fragment.appendChild(sticky);

  let sectionIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = i * BYTES_PER_LINE;
    const lineEnd = Math.min(lineStart + BYTES_PER_LINE, fileByteLength || Infinity);

    while (sectionIndex < layout.length && layout[sectionIndex].end <= lineStart) {
      sectionIndex++;
    }

    const div = document.createElement('div');
    const section = layout[sectionIndex];

    if (!section || section.start >= lineEnd) {
      // No section on this line.
      div.className = 'hex-line';
      div.textContent = line;
    } else if (section.start <= lineStart && section.end >= lineEnd) {
      // The common case: the whole line is in one section. No extra nodes.
      div.className = 'hex-line sec-' + section.kind;
      div.setAttribute('data-section', section.id);
      div.textContent = line;
    } else {
      div.className = 'hex-line';
      appendSegments(div, line, lineStart, lineEnd, layout, sectionIndex);
    }
    fragment.appendChild(div);
  }
  hexViewer.appendChild(fragment);
  hexViewer.onmouseover = showSectionTitle;

  return hexViewer;
}

// Section name as a tooltip, set on hover: setting `title` on every line
// up front noticeably slows down rendering large files.
function showSectionTitle(event) {
  const elem = event.target.closest('[data-section]');
  if (elem && !elem.title) {
    const section = currentLayout.find(s => s.id === elem.getAttribute('data-section'));
    elem.title = section ? section.label : '';
  }
}

function markSection(elem, section) {
  elem.className = 'sec-' + section.kind;
  elem.setAttribute('data-section', section.id);
}

// Splits a line that crosses section boundaries into spans, separately for
// the hex columns and the printable-char columns.
function appendSegments(div, line, lineStart, lineEnd, layout, sectionIndex) {
  const segments = [];
  let byte = lineStart;
  for (let k = sectionIndex; byte < lineEnd; k++) {
    const section = layout[k];
    if (!section || section.start >= lineEnd) {
      segments.push({ from: byte, to: lineEnd });
      break;
    }
    if (section.start > byte) {
      segments.push({ from: byte, to: section.start });
    }
    const to = Math.min(section.end, lineEnd);
    segments.push({ from: Math.max(section.start, byte), to, section });
    byte = to;
  }

  const pieces = [];
  for (const { from, to, section } of segments) {
    // The trailing separator space of the last byte stays outside the span.
    pieces.push([HEX_COLUMN + (from - lineStart) * 3, HEX_COLUMN + (to - lineStart) * 3 - 1, section]);
  }
  for (const { from, to, section } of segments) {
    pieces.push([CHAR_COLUMN + (from - lineStart), CHAR_COLUMN + (to - lineStart), section]);
  }

  let column = 0;
  for (const [from, to, section] of pieces) {
    if (from > column) {
      div.append(line.slice(column, from));
    }
    if (section) {
      const span = document.createElement('span');
      span.textContent = line.slice(from, to);
      markSection(span, section);
      div.append(span);
    } else {
      div.append(line.slice(from, to));
    }
    column = to;
  }
  if (column < line.length) {
    div.append(line.slice(column));
  }
}

function createLegend(layout) {
  const legend = document.createElement('div');
  legend.className = 'hex-legend';

  for (const section of layout) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'hex-legend-item';
    item.dataset.target = section.id;

    const swatch = document.createElement('span');
    swatch.className = 'hex-legend-swatch sec-' + section.kind;
    const label = document.createElement('span');
    label.textContent = section.label;
    const range = document.createElement('span');
    range.className = 'hex-legend-range';
    range.textContent = `0x${toHexString(section.start)} · ${section.end - section.start} B`;
    item.append(swatch, label, range);

    if (section.start >= displayedByteLength) {
      item.disabled = true;
      item.title = 'Beyond the displayed range of the hex viewer';
    } else {
      item.title = 'Jump to ' + section.label;
      item.addEventListener('click', () => revealSection(section));
    }
    legend.appendChild(item);
  }

  return legend;
}

/**
 * Scrolls the hex viewer to `section` and briefly highlights it.
 */
function revealSection(section) {
  const hexViewer = currentHexViewer;
  // Hidden on narrow screens; nothing to reveal.
  // (offsetParent is always null for the position: fixed viewer, so check rects.)
  if (!hexViewer || hexViewer.getClientRects().length === 0 || section.start >= displayedByteLength) {
    return;
  }
  const first = hexViewer.querySelector(`.hex-line [data-section="${section.id}"], .hex-line[data-section="${section.id}"]`);
  if (!first) {
    return;
  }
  // Keep the target line just below the sticky legend and offset header.
  const line = first.closest('.hex-line');
  const sticky = hexViewer.querySelector('.hex-sticky');
  hexViewer.scrollTop = line.offsetTop - sticky.offsetHeight - line.offsetHeight;

  // One rule instead of toggling a class on every line of a large section.
  flashStyle.textContent = `#hexViewer .hex-line[data-section="${section.id}"], #hexViewer .hex-line [data-section="${section.id}"] { background-color: var(--sec-flash); }`;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    flashStyle.textContent = '';
  }, FLASH_DURATION);
}

/**
 * Reveals the section described by property `key` of the object at `path`
 * in the inspect result. Returns whether a section was found.
 */
function revealField(path, key) {
  const section = findSectionForField(currentLayout, path, key);
  if (section) {
    revealSection(section);
  }
  return Boolean(section);
}

export {
  constructHexViewer,
  revealField,
};
