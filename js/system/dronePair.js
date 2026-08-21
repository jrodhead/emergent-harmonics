import { PERIOD_RATIO } from './period.js';
import { MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY } from './generateSystem.js';

/**
 * A drone sounding as two voices straddling its pitch.
 *
 * Pure and DOM-free, like droneFrequency.js and interval.js beside it, because
 * the arithmetic is the whole of the risk: a spread that is not symmetric moves
 * the pitch the drone is a reference for, and a spread that is quietly clamped
 * changes the one number this feature exists to set.
 */

// One period is as far apart as a pair can sensibly be. Past it the two voices
// are not straddling a pitch any more, they are two drones.
export const MAX_SPREAD_RATIO = PERIOD_RATIO;

// Beats stop being beats past about twenty hertz and become roughness — which
// is what MAX_AUDIBLE_BEAT_HZ in interval.js says — and the binaural literature
// reaches a little past that, so the control does too and the readout is left
// to say what is happening up there.
export const MAX_SPREAD_HZ = 30;

/**
 * A spread ratio in the only form the arithmetic can use: at least a unison and
 * at most a period.
 *
 * A value below 1 is inverted rather than refused, because a spread has no
 * direction — 2/3 and 3/2 are the same distance apart.
 */
export const normaliseSpreadRatio = (ratio) => {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;

  return Math.min(ratio < 1 ? 1 / ratio : ratio, MAX_SPREAD_RATIO);
};

/**
 * The two frequencies a pair sounds at: symmetric about the drone pitch, so the
 * pitch the drone is *for* stays where it is even when neither voice sounds it.
 *
 * The ratio is applied geometrically and the hertz offset arithmetically, in
 * that order, which is what makes each exact in its own terms: a ratio of 3/2
 * puts precisely a just fifth between the voices, and a spread of 6 Hz puts
 * precisely 6 Hz between them.
 *
 *     frequency = droneFrequency × ratio^(±1/2) ± spreadHz / 2
 *
 * @param {number} droneFrequency - The pitch the pair straddles.
 * @returns {{lower: number, upper: number}|null} null when the drone pitch is
 *   not a frequency, or when the spread would push a voice out of hearing.
 *   Deliberately not clamped: droneFrequency walks a bad register back into
 *   range because a register is recoverable, but clamping one voice of a pair
 *   and not the other would silently change the beat rate.
 */
export function pairFrequencies(droneFrequency, {
  spreadRatio = 1,
  spreadHz = 0,
  minFrequency = MIN_AUDIBLE_FREQUENCY,
  maxFrequency = MAX_AUDIBLE_FREQUENCY,
} = {}) {
  if (!Number.isFinite(droneFrequency) || droneFrequency <= 0) return null;

  // Symmetric means symmetric: a negative offset is the same spread.
  const hertz = Number.isFinite(spreadHz) ? Math.abs(spreadHz) : 0;
  const half = Math.sqrt(normaliseSpreadRatio(spreadRatio));

  const lower = droneFrequency / half - hertz / 2;
  const upper = droneFrequency * half + hertz / 2;

  if (lower < minFrequency || upper > maxFrequency) return null;

  return { lower, upper };
}

/**
 * What one voice of a pair sounds at, given the drone's level.
 *
 * Half the power rather than half the amplitude, because a centred stereo
 * panner already puts 1/√2 of its input into each channel: two coincident
 * voices at V/√2 through one arrive at exactly V, so switching the pair on is
 * not a step, and a pair that is beating peaks at V rather than above it.
 *
 * Panning them apart is not made up for. Each ear then hears one voice, 3 dB
 * down, and compensating would put the beat peak above the drone's own level.
 */
export const pairVoiceVolume = (droneVolume) => (
  Number.isFinite(droneVolume) ? droneVolume / Math.SQRT2 : 0
);

/**
 * A spread typed as a ratio — "3/2" — or as the decimal it comes to.
 *
 * @returns {number|null} null for anything that is not a ratio, so the caller
 *   can leave the setting where it was rather than storing a NaN.
 */
export function parseRatio(text) {
  if (typeof text === 'number') {
    return Number.isFinite(text) && text > 0 ? normaliseSpreadRatio(text) : null;
  }

  if (typeof text !== 'string') return null;

  const parts = text.trim().split('/');
  if (parts.length > 2 || parts[0].trim() === '') return null;

  const numerator = Number(parts[0]);
  const denominator = parts.length === 2 ? Number(parts[1]) : 1;

  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (numerator <= 0 || denominator <= 0) return null;

  return normaliseSpreadRatio(numerator / denominator);
}
