const dracoWorker = new Worker('./draco.worker.js');

const pendingRequests = new Map();
let nextRequestId = 0;

dracoWorker.onmessage = function(event) {
  const { id, result, error } = event.data;
  const request = pendingRequests.get(id);
  if (!request) {
    return;
  }
  pendingRequests.delete(id);
  if (error) {
    request.reject(error);
  } else {
    request.resolve(result);
  }
};

/**
 * Decodes a Draco primitive in a worker to keep the main thread responsive.
 *
 * @param {Uint8Array} typedArray
 * @param {{ byteLength: number }} bufferView
 * @param {{ [name: string]: number }} compressedAttributes
 * @param {boolean} [useDefaultAttributeId=false]
 * @returns {Promise<object>}
 */
function decodePrimitive(typedArray, bufferView, compressedAttributes, useDefaultAttributeId = false) {
  const requestId = nextRequestId++;
  const transferred = typedArray.slice();

  return new Promise((resolve, reject) => {
    pendingRequests.set(requestId, { resolve, reject });
    dracoWorker.postMessage(
      {
        id: requestId,
        typedArray: transferred,
        compressedAttributes,
        useDefaultAttributeId,
      },
      [transferred.buffer]
    );
  });
}

export {
  decodePrimitive,
};
