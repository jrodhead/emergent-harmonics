import { describeInterval, MAX_AUDIBLE_BEAT_HZ } from '../system/interval.js';
import { formatBeat, formatFrequency, formatPan } from '../format.js';
import { inaudibleBecause } from './renderIntervalReadout.js';

/**
 * What a drone sounding as two voices is actually doing: the two frequencies,
 * how far apart they are, and the beat that difference produces.
 *
 * It writes no arithmetic of its own — every number here comes out of
 * describeInterval, the same function the interval readout is built on. What it
 * adds is the one thing arithmetic cannot say: which of the two regimes the
 * player is in. Panned apart on headphones the beat is manufactured in the
 * listener; together it is real beating in the air. The controls do not teach
 * that difference on their own, and a ratio spread on the default sine beats at
 * nothing at all, so a pair with no readout teaches the wrong lesson.
 */

/** How far apart the two voices are in the field, from together to opposite ears. */
const separation = (lower, upper) => {
  if (lower.pan === null || upper.pan === null) return 0;

  return Math.abs(lower.pan - upper.pan);
};

/**
 * Which of the two regimes this is. A judgement about a listener the app cannot
 * see — it does not know whether there are headphones on — so it is worded as
 * what the panning means rather than as what is being heard.
 */
const regime = (lower, upper, difference) => {
  if (!(difference > 0)) return 'one pitch: the two voices are coincident';

  const apart = separation(lower, upper);

  if (apart >= 1.5) return 'opposite ears: on headphones this beat is made in the listener, not in the air';
  if (apart > 0) return 'partly apart: some of this beat is in the air, some in the listener';

  return 'together: real beating in the air, on speakers and headphones alike';
};

/**
 * The beat, and whether it is one anybody could hear.
 *
 * There are two of them and which one applies is a question of distance. Voices
 * within twenty or thirty hertz of each other beat directly, at the difference
 * between their fundamentals, on any wave at all — that is the whole hertz
 * regime, and it is the case a partials-only reading gets silently wrong, since
 * two voices 6 Hz apart are 48 cents apart and have no simple ratio to beat
 * between. Further apart than that and nothing is heard between the
 * fundamentals: the beat is between coinciding partials, which needs a wave
 * that has some.
 */
const beatCell = (interval, waveShape) => {
  const difference = interval.fundamentalsHz;

  if (!(difference > 0)) {
    return '<span class="drone-beat">no beat: both voices are the same pitch</span>';
  }

  if (difference < MAX_AUDIBLE_BEAT_HZ) {
    return `<span class="drone-beat">beats at ${formatBeat(difference)}, between the fundamentals</span>`;
  }

  if (!interval.simple) {
    return '<span class="drone-beat">too far apart to beat directly, and too far from a simple ratio to beat between partials</span>';
  }

  if (!interval.audible.beat) {
    const reason = inaudibleBecause(interval, waveShape);

    return `<span class="drone-beat inaudible" title="${reason}">beats at ${formatBeat(interval.beatHz)}</span>`;
  }

  return `<span class="drone-beat">beats at ${formatBeat(interval.beatHz)}, between partials</span>`;
};

const voiceCell = ({ frequency, pan }) => `
  <span class="drone-voice">${formatFrequency(frequency)} Hz <span class="drone-pan">${pan === null ? 'centre' : formatPan(pan)}</span></span>
`;

/**
 * @param {Array} voices - { frequency, pan }, lowest first. One of them, or
 *   none, draws nothing: a single drone is not an interval, and the row above
 *   already says it is sounding.
 * @param {string} [waveShape] - What they are sounding on, which is what
 *   decides whether a beat between partials exists at all.
 * @param {boolean} [pairAsked] - Whether a pair was asked for, which is how one
 *   voice sounding can mean two different things.
 */
export function renderDroneReadout(voices, { waveShape, pairAsked = false } = {}) {
  const readout = document.getElementById('dronePairReadout');
  if (!readout) return;

  if (voices.length < 2) {
    // A pair asked for and one voice sounding is a spread that does not fit at
    // this pitch, which is worth saying: the drone has gone on sounding and the
    // setting is the thing that is out of reach.
    readout.innerHTML = pairAsked && voices.length === 1
      ? '<span class="drone-regime">that spread does not fit at this pitch: it would put the lower voice under hearing</span>'
      : '';
    return;
  }

  const [lower, upper] = voices;
  const interval = describeInterval(lower.frequency, upper.frequency, { waveShape });

  if (!interval) {
    readout.innerHTML = '';
    return;
  }

  readout.innerHTML = `
    ${voiceCell(lower)}
    ${voiceCell(upper)}
    <span class="drone-difference">${formatBeat(interval.fundamentalsHz)} apart</span>
    ${beatCell(interval, waveShape)}
    <span class="drone-regime">${regime(lower, upper, interval.fundamentalsHz)}</span>
  `;
}
