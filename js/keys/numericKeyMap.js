/**
 * Creates a numeric key map based on the provided musical system.
 * @param {Array} musicalSystem - The musical system to create the numeric key map from.
 */
export const createNumericKeyMap = (musicalSystem) => {
  let numericKeyMap = {};

  musicalSystem.forEach((system, index) => {
    numericKeyMap[index] = system.rootNote;
  });

  renderNumericKeyMapTable(numericKeyMap);
};

const renderNumericKeyMapTable = (numericKeyMap) => {
  const numericGridHTML = `
    <div class="grid-container">
      <div class="root-group">
        ${Object.entries(numericKeyMap).map(([key, value]) => `
          <div id="root${key}" class="root-selector">
            <div class="root-name">R${key}</div>
            <div class="key-name">${key}</div>
            <div class="root-frequency">${value}Hz</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('numericKeyTable').innerHTML = numericGridHTML;
};