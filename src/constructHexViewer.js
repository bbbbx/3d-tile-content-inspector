import { toHexString } from "./toHexString.js";

const MAX_BYTE_LENGTH = 524288; // 1024 * 512, 512 Kibibyte

function constructHexViewer(hex, hexViewer) {
  hexViewer.innerHTML = '';
  const { chars, hexs } = hex;
  const length = Math.min(hexs.length, MAX_BYTE_LENGTH);

  const fragment = document.createDocumentFragment();

  const offsetDiv = document.createElement('div');
  offsetDiv.style.fontWeight = 'bold';
  offsetDiv.innerHTML += '&nbsp;&nbspOffset:&nbsp;00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F';
  fragment.appendChild(offsetDiv);

  for (let i = 0; i < length; i += 16) {
    const h = hexs.slice(i, i + 16);
    const c = chars.slice(i, i + 16);
    const div = document.createElement('div');

    let text = '';
    text += toHexString(i).padStart(8, '0');
    text += ': ';
    text += h.join(' ');
    div.innerText = text;

    // last line
    if (i + 16 >= length) {
      const numOfBytes = 16 - h.length;
      const numOfSpace = numOfBytes * 3;
      div.innerHTML += '&nbsp;'.repeat(numOfSpace);
    }

    div.innerText += ' ' + c.join('');

    fragment.appendChild(div);
  }
  hexViewer.appendChild(fragment);

  return hexViewer;
}

export {
  constructHexViewer,
};
