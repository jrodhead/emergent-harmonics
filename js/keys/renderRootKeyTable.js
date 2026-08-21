import { formatFrequency, formatDegree } from '../format.js';
import { rootScaleLabel } from '../config/rootScales.js';

/**
 * Draws the root keys: the notes the whole system can be built from, and the
 * scale each of them would build.
 *
 * @param {Array} rootNotes - The root notes, in key order.
 */
export const renderRootKeyTable = (rootNotes) => {
  const rootGridHTML = `
    <div class="grid-container">
      <h2>Root keys</h2>
      <div class="root-group">
        ${rootNotes.map((rootNote, key) => `
          <div id="root${key}" class="root-key">
            <div class="degree">${formatDegree(rootNote.definition.degree, rootNote.periodShift)}</div>
            <div class="key-name">${key}</div>
            <div class="frequency">${formatFrequency(rootNote.frequency)}Hz</div>
            <div class="interval-name">${rootNote.definition.intervalName}</div>
            <div class="root-scale">${rootScaleLabel(rootNote.definition.rootScaleId)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('rootKeyTable').innerHTML = rootGridHTML;
};

/**
 * Marks which root key the note keys are currently generated from.
 * @param {number} rootIndex
 */
export const displayActiveRootNote = (rootIndex) => {
  document.querySelectorAll('.root-key.active').forEach((element) => {
    element.classList.remove('active');
  });

  document.getElementById(`root${rootIndex}`)?.classList.add('active');
};
