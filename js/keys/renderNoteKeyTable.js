import { formatFrequency, formatRatio } from '../format.js';

/**
 * Renders the note key map table based on the provided note key map.
 *
 * @param {Object} noteKeyMap - The note key map containing note information.
 */
export function renderNoteKeyTable(noteKeyMap) {
  let noteGridHTML = `
    <div class="grid-container">
      <h2>Note Selectors</h2>
      <div class="note-group">
  `;

  noteKeyMap.forEach(({ key, frequency, definition, periodShift }) => {
    noteGridHTML += `
      <div id="${key}" class="note">
        <div class="degree">${definition.degree} - ${periodShift}</div>
        <div class="key-name">${key}</div>
        <div class="ratio">ratio: ${formatRatio(definition.ratioToRoot)}</div>
        <div class="relationship">${definition.intervalName}</div>
        <div class="note-frequency">${formatFrequency(frequency)}Hz</div>
      </div>
    `;
  });

  noteGridHTML += `</div></div>`;

  document.getElementById('noteKeyTable').innerHTML = noteGridHTML;
}
