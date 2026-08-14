import {
  getAttackMs,
  getDronePeriodShift,
  getDroneVolume,
  getGlideMs,
  getReleaseMs,
  loadStoredPlaySettings,
  setAttackMs,
  setDronePeriodShift,
  setDroneVolume,
  setGlideMs,
  setReleaseMs,
} from './playSettings.js';

// Most of these are a range of milliseconds, shown beside itself in the units
// it is set in, which is why that is what `format` defaults to.
const milliseconds = (value) => `${value} ms`;

/** A register, said the way a player would say it rather than as a signed number. */
const periods = (value) => {
  if (value === 0) return 'at the root';

  const count = Math.abs(value);

  return `${count} period${count === 1 ? '' : 's'} ${value < 0 ? 'below' : 'above'}`;
};

const CONTROLS = [
  { name: 'attackMs', inputId: 'attackTime', outputId: 'attackOutput', get: getAttackMs, set: setAttackMs },
  { name: 'releaseMs', inputId: 'releaseTime', outputId: 'releaseOutput', get: getReleaseMs, set: setReleaseMs },
  { name: 'glideMs', inputId: 'glideTime', outputId: 'glideOutput', get: getGlideMs, set: setGlideMs },
  {
    name: 'dronePeriodShift',
    inputId: 'dronePeriod',
    outputId: 'dronePeriodOutput',
    get: getDronePeriodShift,
    set: setDronePeriodShift,
    format: periods,
  },
  {
    name: 'droneVolume',
    inputId: 'droneVolume',
    outputId: 'droneVolumeOutput',
    get: getDroneVolume,
    set: setDroneVolume,
    // A bare number, like the oscillator volume beside it.
    format: String,
  },
];

export function initPlaySettings() {
  loadStoredPlaySettings();

  // Looked up here rather than at import time, so that importing this module
  // never depends on a document being there.
  CONTROLS.forEach(({ name, inputId, outputId, get, set, format = milliseconds }) => {
    const input = document.getElementById(inputId);
    const output = document.getElementById(outputId);

    const show = () => {
      input.value = get();
      output.textContent = format(get());
    };

    show();
    input.addEventListener('input', () => {
      set(Number(input.value));
      show();

      // Announced after the setting has landed, so whatever is already sounding
      // can follow the fader under the pointer. An event rather than a second
      // listener on each element, which would depend on registration order.
      document.body.dispatchEvent(new CustomEvent('playSettingChanged', { detail: { name } }));
    });
  });
}
