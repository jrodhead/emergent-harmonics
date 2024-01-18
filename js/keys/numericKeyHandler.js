import { musicalSystemGlobal } from '../main.js';
import { createAlphaKeyMap } from "./alphaKeyMap.js";

/**
 * Handles the numeric key event.
 * @param {string} ev - The event type ('keydown' or 'keyup').
 * @param {number} rootIndex - The root index.
*/
let currentRootIndex = 0;
export { currentRootIndex };

const handleNumericKey = (ev, rootIndex) => {
  if (ev === 'keydown') {
    console.log(`${rootIndex}On`);
    if (rootIndex >= 0 && rootIndex < musicalSystemGlobal.length) {
      currentRootIndex = rootIndex;
      createAlphaKeyMap(musicalSystemGlobal);
    } else {
      console.error('Invalid root index:', rootIndex);
    }
  } else if (ev === 'keyup') {
    console.log(`${rootIndex}Off`);
  }
};

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

    const activeElements = document.querySelectorAll('.active');
    activeElements.forEach(element => {
      element.classList.remove('active');
    });

    activeRoot.classList.add('active');
  }
});
