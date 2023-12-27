import { playSound, stopAllSounds, stopSound } from './oscillators.js';

const keyMap = [
  { key: 'a', frequency: 110, elementId: 'A' },
  { key: 's', frequency: 220, elementId: 'S' },
  { key: 'd', frequency: 440, elementId: 'D' },
  { key: 'f', frequency: 880, elementId: 'F' }
];

const handleKey = (ev, action) => {
  const keyData = keyMap.find((item) => item.key === action);
  if (!keyData) return;

  const { frequency, elementId } = keyData;
  const element = document.getElementById(elementId);

  if (ev === 'keydown') {
    playSound(frequency, action);
    element.classList.add('active');
    console.log(`${action}On`);
  } else if (ev === 'keyup') {
    stopSound(action);
    element.classList.remove('active');
    console.log(`${action}Off`);
  }
};

const keyHandler = (ev) => {
  if (ev.repeat) return;
  const keyData = keyMap.find((item) => item.key === ev.key);
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
    document.body.classList.add('active');
  }
});

document.body.addEventListener('keyup', (ev) => {
  if (ev.key === 'Escape') {
    if (ev.repeat) return;
    document.body.classList.remove('active');
  }
});
