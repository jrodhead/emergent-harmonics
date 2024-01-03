import { playSound, stopAllSounds, stopSound } from '../oscillators.js';
import { keyMapGlobal } from '../main.js';

const handleKey = (ev, action) => {
  const keyData = keyMapGlobal.find((item) => item.key === action);
  if (!keyData) return;

  const { frequency, elementId } = keyData;
  console.log (`frequency: ${frequency}, elementId: ${elementId}`)
  const element = document.getElementById(elementId);

  if (ev === 'keydown') {
    playSound(frequency, action);
    element.classList.add('active');
    console.log(`${action}On`);
  } else if (ev === 'keyup') {
    stopSound(action);
    element.classList.remove('active');
    console.log(`${action}Off`);
  } else {
    console.error('unable to handle key');
  }
};

const keyHandler = (ev) => {
  if (ev.repeat) return;
  const keyData = keyMapGlobal.find((item) => item.key === ev.key);
  if (!keyData) return;
  handleKey(ev.type, ev.key);
};

document.body.addEventListener('keydown', keyHandler);
document.body.addEventListener('keyup', keyHandler);

// Event listener for 'Escape' key
document.body.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    if (ev.repeat) return;
    stopAllSounds();
    document.body.classList.add('stop');
  }
});

document.body.addEventListener('keyup', (ev) => {
  if (ev.key === 'Escape') {
    if (ev.repeat) return;
    document.body.classList.remove('stop');
  }
});
