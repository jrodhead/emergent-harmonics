import { musicalSystemGlobal, alphaKeyMapGlobal, updateAlphaKeyMapGlobal } from '../main.js';
import { createAlphaKeyMap, renderAlphaKeyMapTable } from "./alphaKeyMap.js";

let currentRootIndex = 0;
export { currentRootIndex };

const handleNumericKey = (ev, rootIndex) => {
  if (ev === 'keydown') {
    if (rootIndex >= 0 && rootIndex < musicalSystemGlobal.length) {
      console.log(`${rootIndex}On`);
    } else {
      console.error('Invalid root index:', rootIndex);
    }
  } else if (ev === 'keyup') {
    console.log(`${rootIndex}Off`);
    currentRootIndex = rootIndex;
      // Calculate and generate the musical system for the selected root
    let newKeyMap = createAlphaKeyMap(musicalSystemGlobal);
    updateAlphaKeyMapGlobal(newKeyMap);
    renderAlphaKeyMapTable(alphaKeyMapGlobal);
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
  let activeRoot = document.getElementById(`root${keyIndex}`);

  if (ev.repeat) return;

  if (keyIndex !== -1) {
    handleNumericKey('keyup', keyIndex);

    // Remove 'active' class from all other elements with the same class
    const activeElements = document.querySelectorAll('.active');
    activeElements.forEach(element => {
      element.classList.remove('active');
    });

    activeRoot.classList.add('active');
  }
});
