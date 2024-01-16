export const createNumericKeyMap = (musicalSystem) => {
  let numericKeyMap = {};

  musicalSystem.forEach((system, index) => {
    numericKeyMap[index] = system.rootNote;
  });

  return numericKeyMap;
};

export const renderNumericKeyMapTable = (numericKeyMap) => {
  let numericGridHTML = `<div class="grid-container">
                          <div class="root-group">`;

  for (let key in numericKeyMap) {
    numericGridHTML += `<div id="root${key}" class="root-selector">
                          <div class="root-name">R${key}</div>
                          <div class="key-name">${key}</div>
                          <div class="root-frequency">${numericKeyMap[key]}Hz</div>
                        </div>`;
  }

  numericGridHTML += '</div></div>';

  document.getElementById('numericKeyTable').innerHTML = numericGridHTML;
};