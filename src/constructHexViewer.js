// const toHexString = require('./toHexString.js');

function validatePrintable(charCode) {
  return (charCode >= 33 && charCode <= 126) ||
    (charCode >= 0x80 && charCode <= 0x82) ||
    (charCode === 0x84) ||
    (charCode >= 0xa1 && charCode <= 0xac) ||
    (charCode >= 0xae && charCode <= 0xff);
}

function constructHexViewer(hex, element) {
  const { chars, hexs } = hex;

  element.innerHTML = '';
  const hexViewer = element;

  const offsetDiv = document.createElement('div');
  offsetDiv.style.fontWeight = 'bold';
  offsetDiv.innerHTML += '&nbsp;&nbspOffset:&nbsp;00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F';
  hexViewer.appendChild(offsetDiv);

  for (let i = 0; i < chars.length; i += 16) {
    const h = hexs.slice(i, i + 16);
    const c = chars.slice(i, i + 16).map((c, j) => {
      const charCode = parseInt(h[j], 16);
      return validatePrintable(charCode) ? c : '.';
    });
    const div = document.createElement('div');

    div.innerText += toHexString(i).padStart(8, '0');
    div.innerText += ': ';
    div.innerText += h.join(' ');
    div.innerText += ' ' + c.join('');

    hexViewer.appendChild(div);
  }

  return hexViewer;
}

// module.exports = constructHexViewer;
