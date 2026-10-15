import { inspect } from "./inspect.js";

const infoElem = document.getElementById('info');
const errorElem = document.getElementById('error');
const warningElem = document.getElementById('warning');
const fileElem = document.getElementById('file');
const jsonViewer = document.getElementById('jsonViewer');

let dragging = false;

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

function inspectFromFile(file) {
  setInfo('Loading...', true);

  const fileReader = new FileReader();
  fileReader.onload = () => {
    const arrayBuffer = fileReader.result;
    const filename = file.name;

    return inspectFromArrayBuffer(arrayBuffer, filename);
  };
  fileReader.readAsArrayBuffer(file);
}

function inspectFromArrayBuffer(arrayBuffer, filename) {
  errorElem.innerText = '';
  warningElem.innerText = '';
  setInfo('Parsing...', true);

  return inspect(arrayBuffer, filename)
    .then(result => {
      constructJsonView(result);
      setInfo('Done');
      errorElem.innerText = '';
    })
    .catch(msg => {
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
}
