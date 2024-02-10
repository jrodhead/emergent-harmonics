import { currentDiapasonIndex } from "./arrowKeyHandler.js";
import { alphaKeyHandler } from './alphaKeyHandler.js';

/**
 * Renders the alpha key map table based on the provided alpha key map.
 *
 * @param {Object} alphaKeyMap - The alpha key map containing note information.
 */
export function renderAlphaKeyMapTable(alphaKeyMap) {
  let alphaGridHTML = `
    <div class="grid-container">
      <div class="diapason">
  `;

  Object.entries(alphaKeyMap).map(([noteIndex, { key, frequency, relationshipToRoot }]) => {
    alphaGridHTML += `
      <div id="${frequency}" class="note">
        <div class="degree">${relationshipToRoot.degree} - ${currentDiapasonIndex}</div>
        <div class="key-name">${key}</div>
        <div class="ratio">ratio: ${relationshipToRoot.ratioToRoot}</div>
        <div class="relationship">${relationshipToRoot.relationshipToRootName}</div>
        <div class="triad-type">${relationshipToRoot.triadType}</div>
        <div class="note-frequency">${frequency}Hz</div>
      </div>
    `;
  });

  alphaGridHTML += '</div></div>';

  document.getElementById('alphaKeyTable').innerHTML = alphaGridHTML;

  // Event listeners for keydown and keyup events
  document.body.addEventListener('keydown', alphaKeyHandler);
  document.body.addEventListener('keyup', alphaKeyHandler);
}
