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
