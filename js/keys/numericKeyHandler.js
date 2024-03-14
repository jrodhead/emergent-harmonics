import { createDiapasonRowKeyMap } from './createDiapasonRowKeyMap.js';
import { generateScaleNotes } from '../systemCalculators/musicalSystemGenerator.js';
import { getNotesForSystem } from '../systemCalculators/noteGenerators.js';
import { rootNotesGlobal } from '../main.js';

let currentRootIndex = 0;
let activeScaleNotesGlobal = [];

export {
  currentRootIndex,
  activeScaleNotesGlobal,
};

const numericKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const handleNumericKey = (ev, rootIndex) => {
  if (ev === 'keydown') {
    currentRootIndex = rootIndex;
    displayActiveRootNote(currentRootIndex);

    // console.log(`${rootIndex}On`);

    let scaleNotesToGenerate = getNotesForSystem(rootNotesGlobal[currentRootIndex].relationshipToRoot.triadType);

    activeScaleNotesGlobal = generateScaleNotes(rootNotesGlobal[currentRootIndex].frequency, scaleNotesToGenerate);

    console.log('activeScaleNotesGlobal: ', activeScaleNotesGlobal);

    if (isValidRootIndex(rootIndex)) {
      createDiapasonRowKeyMap(activeScaleNotesGlobal);
    } else {
      console.error('Invalid root index:', rootIndex);
    }
  } else if (ev === 'keyup') {
    // console.log(`${rootIndex}Off`);
  }
};

const isValidRootIndex = (rootIndex) => {
  return rootIndex >= 0 && rootIndex < activeScaleNotesGlobal.length;
};

const displayActiveRootNote = (rootIndex) => {
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
