import { getGlideMs, loadStoredPlaySettings, setGlideMs } from './playSettings.js';

// Looked up in initPlaySettings rather than at import time, so that importing
// this module never depends on a document being there.
let glideInput;
let glideOutput;

const showGlide = () => {
  glideInput.value = getGlideMs();
  glideOutput.textContent = `${getGlideMs()} ms`;
};

export function initPlaySettings() {
  glideInput = document.getElementById('glideTime');
  glideOutput = document.getElementById('glideOutput');

  loadStoredPlaySettings();
  showGlide();

  glideInput.addEventListener('input', () => {
    setGlideMs(Number(glideInput.value));
    showGlide();
  });
}
