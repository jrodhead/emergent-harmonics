import { formatFrequency, formatDegree } from '../format.js';

/**
 * Creates a numeric key table based on the provided musical system.
 * @param {Array} rootNotes - The musical system to create the numeric key map from.
 */

export const renderNumericKeyTable = (rootNotes) => {
  const numericGridHTML = `
    <div class="grid-container">
      <h2>Root Selectors</h2>
      <div class="root-group">
        ${Object.entries(rootNotes).map(([key, value]) => `
          <div id="root${key}" class="root-selector">
            <div class="degree">${formatDegree(value.relationshipToRoot.degree, value.octaveShift)}</div>
            <div class="key-name">${key}</div>
            <div class="root-frequency">${formatFrequency(value.frequency)}Hz</div>
            <div class="root-name">${value.relationshipToRoot.relationshipToRootName}</div>
            <div class="triad-type">${value.relationshipToRoot.triadType}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('numericKeyTable').innerHTML = numericGridHTML;
};

/**
 * Marks which root selector the alpha keys are currently generated from.
 * @param {number} rootIndex
 */
export const displayActiveRootNote = (rootIndex) => {
  document.querySelectorAll('.root-selector.active').forEach((element) => {
    element.classList.remove('active');
  });

  document.getElementById(`root${rootIndex}`)?.classList.add('active');
};
