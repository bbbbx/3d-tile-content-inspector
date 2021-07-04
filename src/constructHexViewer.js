function validatePrintable(charCode) {
  return (charCode >= 33 && charCode <= 126) ||
    (charCode >= 0x80 && charCode <= 0x82) ||
    (charCode === 0x84) ||
    (charCode >= 0xa1 && charCode <= 0xac) ||
    (charCode >= 0xae && charCode <= 0xff);
}

function constructHexViewer(hex, hexViewer) {
  hexViewer.innerHTML = '';
  const { chars, hexs } = hex;
  const length = Math.min(524288, hexs.length); // maximum length of bytes 1024 * 512

  const fragment = document.createDocumentFragment();

  const offsetDiv = document.createElement('div');
  offsetDiv.style.fontWeight = 'bold';
  offsetDiv.innerHTML += '&nbsp;&nbspOffset:&nbsp;00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F';
  fragment.appendChild(offsetDiv);

  for (let i = 0; i < length; i += 16) {
    const h = hexs.slice(i, i + 16);
    const c = chars.slice(i, i + 16).map((c, j) => {
      const charCode = parseInt(h[j], 16);
      return validatePrintable(charCode) ? c : '.';
    });
    const div = document.createElement('div');

    let text = '';
    text += toHexString(i).padStart(8, '0');
    text += ': ';
    text += h.join(' ');

    // last line
    if (i + 16 >= length) {
      div.innerHTML += '&nbsp;'.repeat((16 - h.length) * 3);
    }

    text += ' ' + c.join('');
    div.innerText = text
    fragment.appendChild(div);
  }
  hexViewer.appendChild(fragment);

  return hexViewer;
}
