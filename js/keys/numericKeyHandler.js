import { musicalSystemGlobal, keyMapGlobal, updateKeyMapGlobal } from '../main.js';
import { createKeyMap, renderAlphaKeyMapTable } from "./keyMap.js";

let currentRootIndex = 0;
export { currentRootIndex };

const handleNumericKey = (ev, rootIndex) => {
  if (ev === 'keydown') {
    console.log(`${rootIndex}On`);
    if (rootIndex >= 0 && rootIndex < musicalSystemGlobal.length) {
      currentRootIndex = rootIndex;
      // Calculate and generate the musical system for the selected root
      let newKeyMap = createKeyMap(musicalSystemGlobal);
      updateKeyMapGlobal(newKeyMap);
    } else {
      console.error('Invalid root index:', rootIndex);
    }
  } else if (ev === 'keyup') {
    console.log(`${rootIndex}Off`);
    renderAlphaKeyMapTable(keyMapGlobal);
  }
};

// Listen for numerical keys
document.body.addEventListener('keydown', (ev) => {
  const numericKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const keyIndex = numericKeys.indexOf(ev.key);

  if (ev.repeat) return;

  if (keyIndex !== -1) {
    handleNumericKey('keydown', keyIndex);
  }
});

document.body.addEventListener('keyup', (ev) => {
  const numericKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const keyIndex = numericKeys.indexOf(ev.key);

  if (ev.repeat) return;

  if (keyIndex !== -1) {
    handleNumericKey('keyup', keyIndex);
  }
});
