import { formatFrequency, formatDegree } from '../format.js';

/**
 * Creates a root key table based on the provided musical system.
 * @param {Array} rootNotes - The musical system to create the root key map from.
 */

export const renderRootKeyTable = (rootNotes) => {
  const rootGridHTML = `
    <div class="grid-container">
      <h2>Root Selectors</h2>
      <div class="root-group">
        ${Object.entries(rootNotes).map(([key, value]) => `
          <div id="root${key}" class="root-selector">
            <div class="degree">${formatDegree(value.definition.degree, value.octaveShift)}</div>
            <div class="key-name">${key}</div>
            <div class="root-frequency">${formatFrequency(value.frequency)}Hz</div>
            <div class="root-name">${value.definition.intervalName}</div>
            <div class="root-scale">${value.definition.rootScaleId}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('rootKeyTable').innerHTML = rootGridHTML;
};

/**
 * Marks which root selector the note keys are currently generated from.
 * @param {number} rootIndex
 */
export const displayActiveRootNote = (rootIndex) => {
  document.querySelectorAll('.root-selector.active').forEach((element) => {
    element.classList.remove('active');
  });

  document.getElementById(`root${rootIndex}`)?.classList.add('active');
};
