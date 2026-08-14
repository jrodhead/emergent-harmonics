import { periodMultiplier } from './period.js';
import { MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY } from './generateSystem.js';

/**
 * The pitch a drone sounds at: its anchor moved by a number of periods, pulled
 * back toward the anchor while that lands outside the audible range — a
 * reference that cannot be heard is not a reference.
 *
 * Nothing here says "octave": the shift is applied through periodMultiplier, so
 * a system that repeats at something else drones by *its* period.
 *
 * @param {number} anchorFrequency - The pitch the drone is measured from.
 * @param {number} periodShift - How many periods below or above to sound.
 * @returns {number|null} The frequency, or null when even the anchor is out of range.
 */
export function droneFrequency(anchorFrequency, periodShift, {
  minFrequency = MIN_AUDIBLE_FREQUENCY,
  maxFrequency = MAX_AUDIBLE_FREQUENCY,
} = {}) {
  if (!Number.isFinite(anchorFrequency) || anchorFrequency <= 0) return null;

  // The anchor is the last thing left to fall back on, so an anchor that cannot
  // itself be heard leaves nothing to sound. The caller declines to start
  // rather than handing NaN to an oscillator.
  if (anchorFrequency < minFrequency || anchorFrequency > maxFrequency) return null;

  const shift = Number.isFinite(periodShift) ? Math.round(periodShift) : 0;

  // Walking toward zero rather than giving up is what lands a −3 drone under a
  // low root on −2 or −1 instead of on silence.
  const towardZero = shift > 0 ? -1 : 1;

  for (let candidate = shift; candidate !== 0; candidate += towardZero) {
    const frequency = anchorFrequency * periodMultiplier(candidate);

    if (frequency >= minFrequency && frequency <= maxFrequency) return frequency;
  }

  return anchorFrequency;
}
