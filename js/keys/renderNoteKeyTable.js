import { formatFrequency, formatRatio, formatDegree } from '../format.js';

/**
 * Draws the note keys: what each one sounds, and where it sits in the scale.
 *
 * @param {Array} noteKeyMap - The keys, with the note each one plays.
 */
export function renderNoteKeyTable(noteKeyMap) {
  let noteGridHTML = `
    <div class="grid-container">
      <h2>Note keys</h2>
      <div class="note-group">
  `;

  noteKeyMap.forEach(({ key, frequency, definition, periodShift }) => {
    noteGridHTML += `
      <div id="${key}" class="note">
        <div class="degree">${formatDegree(definition.degree, periodShift)}</div>
        <div class="key-name">${key}</div>
        <div class="ratio">ratio: ${formatRatio(definition.ratioToRoot)}</div>
        <div class="interval-name">${definition.intervalName}</div>
        <div class="frequency">${formatFrequency(frequency)}Hz</div>
      </div>
    `;
  });

  noteGridHTML += `</div></div>`;

  document.getElementById('noteKeyTable').innerHTML = noteGridHTML;
}
