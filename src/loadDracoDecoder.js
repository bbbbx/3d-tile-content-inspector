var decoderModule;

(function() {
var decoderPath = './thirdParty/draco/javascript/';

function createDecoderModule() {
  DracoDecoderModule({}).then((module) => {
    decoderModule = module;
  });
}

function loadJavaScriptFile(path, onLoadFunc) {
  const head = document.getElementsByTagName('head')[0];
  const element = document.createElement('script');
  element.type = 'text/javascript';
  element.src = path;
  if (onLoadFunc !== null)
    element.onload = onLoadFunc;

  head.appendChild(element);
}

function loadDracoDecoder() {
  if (typeof WebAssembly !== 'object') {
    loadJavaScriptFile(decoderPath + 'draco_decoder.js', createDecoderModule);
  } else {
    loadJavaScriptFile(decoderPath + 'draco_wasm_wrapper.js', createDecoderModule);
  }
}

loadDracoDecoder();

})();