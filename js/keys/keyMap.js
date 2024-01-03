/**
 * Creates a key map for the notes in a diapason, associating notes with keys.
 * @param {Array} diapason - An array of notes in a diapason.
 * @returns {Array} - A key map array associating notes with keys.
 */
export function createKeyMap(diapason) {
  const keys = 'qwertyuiopasdfghjklzxcvbnm'.split('');
  const keyMap = [];

  for (let i = 0; i < diapason.length; i++) {
    const note = diapason[i];
    const key = keys[i % keys.length]; // Cycle through keys
    if (!note) break; // Break loop if there are no more notes

    keyMap.push({
      key: key,
      frequency: note.frequency,
      elementId: note.noteName,
    });
  }

  console.log('createKeyMap result: ', keyMap);
  return keyMap;
}

/**
 * Renders a table based on the provided key map.
 * @param {Array} keyMap - An array representing the key map to render.
 */
export function renderKeyMapTable(keyMap) {
  let gridHTML = '<div class="grid-container"><div class="diapason">';

  for (let note = 0; note < keyMap.length; note++) {
    const { elementId, key, frequency } = keyMap[note];
    gridHTML += `<div id="${note}" class="note">
                  <div class="note-name">${elementId}</div>
                  <div class="key-name">${key}</div>
                  <div class="note-frequency">${frequency}</div>
                </div>`;
  }
  gridHTML += '</div></div>';

  document.getElementById('systemTable').innerHTML = gridHTML;
}
