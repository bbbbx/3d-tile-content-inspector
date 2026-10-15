function constructHexViewer(hex, hexViewer) {
  hexViewer.replaceChildren();
  const { lines } = hex;

  const fragment = document.createDocumentFragment();

  const offsetDiv = document.createElement('div');
  offsetDiv.style.fontWeight = 'bold';
  offsetDiv.textContent = '\u00a0\u00a0Offset:\u00a000 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F';
  fragment.appendChild(offsetDiv);

  for (const line of lines) {
    const div = document.createElement('div');
    div.textContent = line;
    fragment.appendChild(div);
  }
  hexViewer.appendChild(fragment);

  return hexViewer;
}

export {
  constructHexViewer,
};
