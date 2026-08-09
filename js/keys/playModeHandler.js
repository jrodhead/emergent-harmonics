import { shouldIgnoreKeyEvent } from './keyEventGuard.js';

const PLAY_MODES = ['latch', 'hold'];

export let currentPlayMode = PLAY_MODES[0];

const displayPlayMode = () => {
  const display = document.getElementById('playMode');
  if (display) {
    display.textContent = currentPlayMode;
  }
};

document.body.addEventListener('keydown', (ev) => {
  if (ev.key !== '*' || ev.repeat || shouldIgnoreKeyEvent(ev)) return;

  const currentIndex = PLAY_MODES.indexOf(currentPlayMode);
  currentPlayMode = PLAY_MODES[(currentIndex + 1) % PLAY_MODES.length];
  console.log('Play mode:', currentPlayMode);
  displayPlayMode();
});

displayPlayMode();
