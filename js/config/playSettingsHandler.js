import {
  getAttackMs,
  getGlideMs,
  getReleaseMs,
  loadStoredPlaySettings,
  setAttackMs,
  setGlideMs,
  setReleaseMs,
} from './playSettings.js';

// Every control here is the same thing: a range of milliseconds, shown beside
// itself in the units it is set in.
const CONTROLS = [
  { inputId: 'attackTime', outputId: 'attackOutput', get: getAttackMs, set: setAttackMs },
  { inputId: 'releaseTime', outputId: 'releaseOutput', get: getReleaseMs, set: setReleaseMs },
  { inputId: 'glideTime', outputId: 'glideOutput', get: getGlideMs, set: setGlideMs },
];

export function initPlaySettings() {
  loadStoredPlaySettings();

  // Looked up here rather than at import time, so that importing this module
  // never depends on a document being there.
  CONTROLS.forEach(({ inputId, outputId, get, set }) => {
    const input = document.getElementById(inputId);
    const output = document.getElementById(outputId);

    const show = () => {
      input.value = get();
      output.textContent = `${get()} ms`;
    };

    show();
    input.addEventListener('input', () => {
      set(Number(input.value));
      show();
    });
  });
}
