import {
  getAttackMs,
  getDroneLowerPan,
  getDronePair,
  getDronePeriodShift,
  getDroneSpreadHz,
  getDroneSpreadRatio,
  getDroneUpperPan,
  getDroneVolume,
  getGlideMs,
  getReleaseMs,
  loadStoredPlaySettings,
  setAttackMs,
  setDroneLowerPan,
  setDronePair,
  setDronePeriodShift,
  setDroneSpreadHz,
  setDroneSpreadRatio,
  setDroneUpperPan,
  setDroneVolume,
  setGlideMs,
  setReleaseMs,
} from './playSettings.js';
import { parseRatio } from '../system/dronePair.js';
import { describeRatio, formatPan } from '../format.js';
import { nearestSimpleRatio } from '../system/interval.js';

// Most of these are a range of milliseconds, shown beside itself in the units
// it is set in, which is why that is what `format` defaults to.
const milliseconds = (value) => `${value} ms`;

/** A register, said the way a player would say it rather than as a signed number. */
const periods = (value) => {
  if (value === 0) return 'at the root';

  const count = Math.abs(value);

  return `${count} period${count === 1 ? '' : 's'} ${value < 0 ? 'below' : 'above'}`;
};

/**
 * A spread ratio in the app's own terms. The fraction when the app can name one
 * — the same search the interval readout uses — and the size in cents either
 * way, since half of it is what each voice is actually moved by.
 */
const ratio = (value) => {
  if (value === 1) return 'unison';

  const simple = nearestSimpleRatio(value, { toleranceCents: 0.01 });
  const name = simple ? `${simple.numerator}/${simple.denominator}` : `${Number(value.toFixed(4))}`;

  return `${name}, ${describeRatio(value)}`;
};

const hertz = (value) => `${value} Hz`;

/** Whether the drone is one voice or two, said where the checkbox cannot say it. */
const pair = (on) => (on ? 'two voices, straddling the drone pitch' : 'one voice');

// The four controls that describe a pair and mean nothing without one.
const PAIR_CONTROLS = ['droneSpreadRatio', 'droneSpreadHz', 'droneLowerPan', 'droneUpperPan'];

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
  {
    name: 'dronePair',
    inputId: 'dronePair',
    outputId: 'dronePairOutput',
    get: getDronePair,
    set: setDronePair,
    format: pair,
    // The one control here that is a yes or a no rather than a number.
    read: (input) => input.checked,
    write: (input, value) => { input.checked = value; },
  },
  {
    name: 'droneSpreadRatio',
    inputId: 'droneSpreadRatio',
    outputId: 'droneSpreadRatioOutput',
    get: getDroneSpreadRatio,
    set: setDroneSpreadRatio,
    format: ratio,
    // Typed rather than dragged, so it is read through the parser and written
    // back as what was stored — which is how a player sees that 2/3 and 3/2 are
    // the same spread.
    read: (input) => parseRatio(input.value),
    write: (input, value) => { input.value = Number(value.toFixed(4)); },
    // On change rather than on input: a text field rewritten on every keystroke
    // fights the person typing into it, and "3/" is not a ratio yet.
    event: 'change',
  },
  {
    name: 'droneSpreadHz',
    inputId: 'droneSpreadHz',
    outputId: 'droneSpreadHzOutput',
    get: getDroneSpreadHz,
    set: setDroneSpreadHz,
    format: hertz,
  },
  {
    name: 'droneLowerPan',
    inputId: 'droneLowerPan',
    outputId: 'droneLowerPanOutput',
    get: getDroneLowerPan,
    set: setDroneLowerPan,
    format: formatPan,
  },
  {
    name: 'droneUpperPan',
    inputId: 'droneUpperPan',
    outputId: 'droneUpperPanOutput',
    get: getDroneUpperPan,
    set: setDroneUpperPan,
    format: formatPan,
  },
];

/**
 * A spread and a position describe a pair, so they are reachable only while
 * there is one. The switch that turns the feature on is then visibly the one
 * that does, which is the whole reason the pair is a state rather than a
 * spread that happens to be non-zero.
 */
const showPairControls = () => {
  PAIR_CONTROLS.forEach((inputId) => {
    const input = document.getElementById(inputId);
    if (input) input.disabled = !getDronePair();
  });
};

export function initPlaySettings() {
  loadStoredPlaySettings();

  // Looked up here rather than at import time, so that importing this module
  // never depends on a document being there.
  CONTROLS.forEach(({
    name, inputId, outputId, get, set,
    format = milliseconds,
    read = (input) => Number(input.value),
    write = (input, value) => { input.value = value; },
    event = 'input',
  }) => {
    const input = document.getElementById(inputId);
    const output = document.getElementById(outputId);

    const show = () => {
      write(input, get());
      if (output) output.textContent = format(get());
    };

    show();
    input.addEventListener(event, () => {
      set(read(input));
      show();

      // Announced after the setting has landed, so whatever is already sounding
      // can follow the fader under the pointer. An event rather than a second
      // listener on each element, which would depend on registration order.
      document.body.dispatchEvent(new CustomEvent('playSettingChanged', { detail: { name } }));
    });
  });

  showPairControls();

  // Through the same seam the drone follows, rather than a special case inside
  // the loop above.
  document.body.addEventListener('playSettingChanged', ({ detail }) => {
    if (detail?.name === 'dronePair') showPairControls();
  });
}
