import { musicalSystemGlobal } from '../main.js';
import { createAlphaKeyMap } from "./alphaKeyMap.js";

let currentRootIndex = 0;
export { currentRootIndex };

const numericKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const handleNumericKey = (ev, rootIndex) => {
  if (ev === 'keydown') {
    // console.log(`${rootIndex}On`);
    if (isValidRootIndex(rootIndex)) {
      currentRootIndex = rootIndex;
      createAlphaKeyMap(musicalSystemGlobal);
      setActiveRoot(rootIndex);
    } else {
      console.error('Invalid root index:', rootIndex);
    }
  } else if (ev === 'keyup') {
    // console.log(`${rootIndex}Off`);
  }
};

const isValidRootIndex = (rootIndex) => {
  return rootIndex >= 0 && rootIndex < musicalSystemGlobal.length;
};

const setActiveRoot = (rootIndex) => {
  let activeRoot = document.getElementById(`root${rootIndex}`);
  const activeElements = document.querySelectorAll('.active');
  activeElements.forEach(element => {
    element.classList.remove('active');
  });

  activeRoot.classList.add('active');
};

document.body.addEventListener('keydown', (ev) => {
  const rootIndex = numericKeys.indexOf(ev.key);

  if (ev.repeat) return;

  if (rootIndex !== -1) {
    handleNumericKey('keydown', rootIndex);
  }
});

document.body.addEventListener('keyup', (ev) => {
  const rootIndex = numericKeys.indexOf(ev.key);

  if (ev.repeat) return;

  if (rootIndex !== -1) {
    handleNumericKey('keyup', rootIndex);
  }
});
