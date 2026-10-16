import { inspect } from "./inspect.js";
import { revealField } from "./constructHexViewer.js";

const infoElem = document.getElementById('info');
const errorElem = document.getElementById('error');
const warningElem = document.getElementById('warning');
const fileElem = document.getElementById('file');
const jsonViewer = document.getElementById('jsonViewer');
const feedbackElem = document.getElementById('feedback');

const ISSUE_URL = 'https://github.com/bbbbx/3d-tile-content-inspector/issues/new';

let dragging = false;
let lastFile;
let latestInspection = 0;

function setInfo(text, loading = false) {
  infoElem.innerText = text;
  infoElem.classList.toggle('loading', loading);
}

window.addEventListener('dragover', event => {
  event.stopPropagation();
  event.preventDefault();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }

  if (!dragging) {
    dragging = true;
    document.body.classList.add('dragging');
    setInfo('Release to parse');
  }
}, false);

window.addEventListener('dragleave', event => {
  event.stopPropagation();
  event.preventDefault();

  // relatedTarget is null when the pointer leaves the window entirely.
  if (event.relatedTarget === null) {
    dragging = false;
    document.body.classList.remove('dragging');
    setInfo('');
  }
}, false);

window.addEventListener('drop', event => {
  event.stopPropagation();
  event.preventDefault();

  dragging = false;
  document.body.classList.remove('dragging');
  setInfo('');

  const dataTransfer = event.dataTransfer;
  let file;
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    file = dataTransfer.items[0].getAsFile();
  } else if (dataTransfer.files && dataTransfer.files.length > 0) {
    file = dataTransfer.files[0];
  }

  if (file) {
    inspectFromFile(file);
  }
}, false);

fileElem.addEventListener('click', () => {
  fileElem.value = '';
});
fileElem.addEventListener('change', event => {
  const files = event.target.files;
  const file = files[0];

  inspectFromFile(file);
});

// Prefill the issue body with context the reporter would otherwise have to
// collect by hand. Nothing is sent until the user submits it on GitHub.
function buildFeedbackUrl() {
  const environment = [
    `- Browser: ${navigator.userAgent}`,
    `- File: ${lastFile ? `${lastFile.name} (${lastFile.size} bytes)` : 'none'}`,
  ];
  if (errorElem.innerText) {
    environment.push(`- Error: ${errorElem.innerText}`);
  }
  if (warningElem.innerText) {
    environment.push(`- Warning: ${warningElem.innerText}`);
  }

  const body = [
    '**Describe the problem**',
    '',
    '',
    '**Steps to reproduce**',
    '1. ',
    '',
    '**Environment**',
    ...environment,
  ].join('\n');

  const url = new URL(ISSUE_URL);
  url.searchParams.set('body', body);
  return url.href;
}

feedbackElem.addEventListener('click', () => {
  feedbackElem.href = buildFeedbackUrl();
});

function inspectFromFile(file) {
  lastFile = { name: file.name, size: file.size };
  setInfo('Loading...', true);

  const fileReader = new FileReader();
  fileReader.onload = () => {
    const arrayBuffer = fileReader.result;
    const filename = file.name;

    return inspectFromArrayBuffer(arrayBuffer, filename);
  };
  fileReader.readAsArrayBuffer(file);
}

async function inspectFromUrl(url) {
  const filename = url.split('/').pop();
  errorElem.innerText = '';
  setInfo('Loading...', true);

  let arrayBuffer;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    arrayBuffer = await response.arrayBuffer();
  } catch (error) {
    setInfo('');
    errorElem.innerText = `Failed to load ${filename}: ${error.message}`;
    return;
  }

  lastFile = { name: filename, size: arrayBuffer.byteLength };
  return inspectFromArrayBuffer(arrayBuffer, filename);
}

for (const sampleElem of document.querySelectorAll('[data-sample]')) {
  sampleElem.addEventListener('click', () => inspectFromUrl(sampleElem.dataset.sample));
}

function inspectFromArrayBuffer(arrayBuffer, filename) {
  // A later file may finish first (e.g. a slow Draco decode); only the most
  // recent one is shown.
  const inspection = ++latestInspection;
  errorElem.innerText = '';
  warningElem.innerText = '';
  setInfo('Parsing...', true);

  return inspect(arrayBuffer, filename)
    .then(result => {
      if (inspection !== latestInspection) {
        return;
      }
      constructJsonView(result);
      setInfo('Done');
      errorElem.innerText = '';
    })
    .catch(msg => {
      if (inspection !== latestInspection) {
        return;
      }
      setInfo('');
      errorElem.innerText = msg;
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
    lineWrapping: false,
    foldGutter: true,
    gutters:["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    foldOptions: {
      widget: (from, to) => {
        let count;

        // Get open / close token
        let startToken = '{';
        let endToken = '}';
        const prevLine = myCodeMirror.getLine(from.line);
        if (prevLine.lastIndexOf('[') > prevLine.lastIndexOf('{')) {
          startToken = '[';
          endToken = ']';
        }

        // Get json content
        const internal = myCodeMirror.getRange(from, to);
        const toParse = startToken + internal + endToken;

        // Get key count
        try {
          const parsed = JSON.parse(toParse);
          count = Object.keys(parsed).length;
        } catch { }

        return count ? `\u21A4${count}\u21A6` : '\u2194';
      }
    },
    fullScreen:true
  });

  // Clicking a field such as "featureTableJson" reveals its bytes in the hex viewer.
  myCodeMirror.on('mousedown', (cm, event) => {
    if (event.target.closest('.CodeMirror-gutters, .CodeMirror-gutter-wrapper')) {
      return;
    }
    const { line } = cm.coordsChar({ left: event.clientX, top: event.clientY }, 'window');
    const match = PROPERTY_LINE.exec(cm.getLine(line));
    if (match) {
      revealField(jsonPathOfLine(cm, line), JSON.parse(`"${match[1]}"`));
    }
  });
}

const PROPERTY_LINE = /^\s*"((?:[^"\\]|\\.)*)":/;
const CONTAINER_OPEN_LINE = /^\s*"((?:[^"\\]|\\.)*)":\s*[[{]\s*$/;

function indentOf(text) {
  return text.length - text.trimStart().length;
}

/**
 * Returns the path (e.g. ['tiles', 1]) of the object containing `line`,
 * relying on the one-entry-per-line layout of JSON.stringify(value, null, 4).
 */
function jsonPathOfLine(cm, line) {
  const path = [];
  let indent = indentOf(cm.getLine(line));
  // Line 0 is the root object itself and adds nothing to the path.
  for (let l = line - 1; l > 0 && indent > 0; l--) {
    const text = cm.getLine(l);
    const lineIndent = indentOf(text);
    if (lineIndent >= indent) {
      continue;
    }
    // `l` opens the container of everything seen so far.
    const match = CONTAINER_OPEN_LINE.exec(text);
    path.unshift(match ? JSON.parse(`"${match[1]}"`) : arrayIndexOfLine(cm, l, lineIndent));
    indent = lineIndent;
  }
  return path;
}

// Index of the array element starting at `line`: counts earlier siblings at
// the same indent, skipping their closing brackets.
function arrayIndexOfLine(cm, line, indent) {
  let index = 0;
  for (let l = line - 1; l >= 0; l--) {
    const text = cm.getLine(l);
    const lineIndent = indentOf(text);
    if (lineIndent < indent) {
      break;
    }
    if (lineIndent === indent && !/^\s*[\]}]/.test(text)) {
      index++;
    }
  }
  return index;
}
