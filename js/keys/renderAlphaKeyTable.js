import { formatFrequency, formatRatio } from '../format.js';

/**
 * Renders the alpha key map table based on the provided alpha key map.
 *
 * @param {Object} alphaKeyMap - The alpha key map containing note information.
 */
export function renderAlphaKeyTable(alphaKeyMap) {
  let alphaGridHTML = `
    <div class="grid-container">
      <h2>Note Selectors</h2>
      <div class="alpha-group">
  `;

  alphaKeyMap.forEach(({ key, frequency, relationshipToRoot, octaveShift }) => {
    alphaGridHTML += `
      <div id="${key}" class="note">
        <div class="degree">${relationshipToRoot.degree} - ${octaveShift}</div>
        <div class="key-name">${key}</div>
        <div class="ratio">ratio: ${formatRatio(relationshipToRoot.ratioToRoot)}</div>
        <div class="relationship">${relationshipToRoot.relationshipToRootName}</div>
        <div class="note-frequency">${formatFrequency(frequency)}Hz</div>
      </div>
    `;
  });

  alphaGridHTML += `</div></div>`;

  document.getElementById('alphaKeyTable').innerHTML = alphaGridHTML;
}
