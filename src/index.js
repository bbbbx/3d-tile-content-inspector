import { inspect } from "./inspect.js";

const infoElem = document.getElementById('info');
const errorElem = document.getElementById('error');
const fileElem = document.getElementById('file');
const jsonViewer = document.getElementById('jsonViewer');

window.addEventListener('dragover', event => {
  event.stopPropagation();
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';

  infoElem.innerText = 'Release to parse';
}, false);

window.addEventListener('drop', event => {
  event.stopPropagation();
  event.preventDefault();

  infoElem.innerText = '';

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

fileElem.addEventListener('click', function() {
  fileElem.value = '';
});
fileElem.addEventListener('change', function(event) {
  const files = event.target.files;
  const file = files[0];

  inspectFromFile(file);
});

const urlElem = document.getElementById('url');
const inspectElem = document.getElementById('inspect');
inspectElem.addEventListener('click', function() {
  const url = urlElem.value.trim();
  if (url) {
    try {
      inspectFromUrl(url);
    } catch (error) {
      errorElem.innerText = error;
    }
  }
});

function inspectFromFile(file) {
  infoElem.innerText = 'Loading...';

  const fileReader = new FileReader();
  fileReader.onload = function(event) {
    if (fileReader.readyState === FileReader.DONE){
      const arrayBuffer = fileReader.result;
      const filename = file.name;

      inspectFromArrayBuffer(arrayBuffer, filename)
    }
  };
  fileReader.readAsArrayBuffer(file);
}

function inspectFromUrl(url) {
  infoElem.innerText = 'Loading...';

  fetch(url)
    .then(r => r.arrayBuffer())
    .then(function(arrayBuffer) {
      const filename = url.slice(url.lastIndexOf('/') + 1);

      inspectFromArrayBuffer(arrayBuffer, filename);
    })
    .catch(function(error) {
      infoElem.innerText = '';
      errorElem.innerText = 'Failed: ' + error.message;
    })
}

function inspectFromArrayBuffer(arrayBuffer, filename) {
  errorElem.innerText = '';
  infoElem.innerText = 'Parsing...';

  return inspect(arrayBuffer, filename)
    .then(result => {
      constructJsonView(result);
      infoElem.innerText = 'Done';
      errorElem.innerText = '';
    })
    .catch(msg => {
      infoElem.innerText = '';
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