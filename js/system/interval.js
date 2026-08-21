/**
 * What two sounding frequencies are to each other, and what a listener would
 * actually hear happening between them.
 *
 * Pure and DOM-free, because the arithmetic is the whole of the risk here and
 * it should be checkable on its own.
 */

// Every common just interval fits inside a denominator of 16 — 9/8, 6/5, 5/4,
// 4/3, 7/5, 3/2, 8/5, 5/3, 7/4, 16/9, 15/8. Past that the "name" stops being a
// name and becomes a restatement of the decimal.
export const MAX_RATIO_DENOMINATOR = 16;

// A quartertone. Wide enough that every interval a player reaches for gets a
// name, narrow enough that the name is never a different interval.
export const NAMING_TOLERANCE_CENTS = 25;

// Above this a beat stops being heard as a beat and becomes roughness, and
// then a tone of its own.
export const MAX_AUDIBLE_BEAT_HZ = 20;

// A beat between the eighth partial and something above it is real arithmetic
// and inaudible sound: those partials are far too quiet to hear beating.
export const MAX_BEATING_PARTIAL = 8;

// Convergent denominators grow at least as fast as the Fibonacci numbers, so
// any useful denominator limit is passed long before this. It is here so a
// ratio that resists the recurrence cannot spin.
const MAX_CONVERGENT_STEPS = 32;

/**
 * The size of an interval in cents, unrounded. `describeRatio` in format.js
 * measures a ratio against the root and rounds to a whole number for display;
 * this one keeps its decimals, because a two-cent deviation is the answer the
 * readout exists to give and rounding is the display's job.
 *
 * @returns {number|null} null when either frequency is not one.
 */
export const centsBetween = (lower, upper) => {
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) return null;
  if (lower <= 0 || upper <= 0) return null;

  return 1200 * Math.log2(upper / lower);
};

/**
 * The simplest ratio an interval can honestly be called, and how far from it
 * the interval actually is.
 *
 * Walks the continued-fraction convergents of the ratio from the simplest
 * upward and returns the first one inside the tolerance, rather than the
 * closest one it can find. That distinction is the whole point: a tempered
 * fifth is a fifth two cents narrow, not 295/197 exactly.
 *
 * @param {number} ratio - The interval, high over low, so at least 1.
 * @returns {{numerator: number, denominator: number, deviationCents: number}|null}
 *   null when nothing simple enough is near enough, which is an honest answer
 *   for an interval that has no name.
 */
export function nearestSimpleRatio(ratio, {
  maxDenominator = MAX_RATIO_DENOMINATOR,
  toleranceCents = NAMING_TOLERANCE_CENTS,
} = {}) {
  if (!Number.isFinite(ratio) || ratio < 1) return null;

  const cents = 1200 * Math.log2(ratio);

  // The standard recurrence, seeded with the two terms before the first
  // convergent: h(-1)/k(-1) = 1/0 and h(-2)/k(-2) = 0/1.
  let previousNumerator = 0;
  let numerator = 1;
  let previousDenominator = 1;
  let denominator = 0;
  let remainder = ratio;

  for (let step = 0; step < MAX_CONVERGENT_STEPS; step++) {
    const whole = Math.floor(remainder);

    [previousNumerator, numerator] = [numerator, whole * numerator + previousNumerator];
    [previousDenominator, denominator] = [denominator, whole * denominator + previousDenominator];

    // Checked before the tolerance, deliberately: past the limit a fraction is
    // not a name, however close it lands.
    if (denominator > maxDenominator) return null;

    const deviationCents = cents - 1200 * Math.log2(numerator / denominator);

    if (Math.abs(deviationCents) <= toleranceCents) {
      return { numerator, denominator, deviationCents };
    }

    const fraction = remainder - whole;

    // The ratio was rational and has been represented exactly, which means the
    // deviation was zero and the tolerance check above has already returned.
    // Reaching here at all would be a division by zero.
    if (fraction === 0) return null;

    remainder = 1 / fraction;
  }

  return null;
}

/**
 * How fast two tones beat, in hertz.
 *
 * Not `|upper − lower|`. That is the beat rate only for a near-unison, which is
 * why the naive version looks right until it is tried on anything else. Two
 * tones beat where their harmonics coincide, and for an interval of n/d the
 * lowest coincidence is the lower tone's nth harmonic against the upper tone's
 * dth:
 *
 *     f_high / f_low = n/d   ⇒   d · f_high = n · f_low
 *
 * so the beat is how far apart those two partials actually are. It is how a
 * piano tuner sets a fifth, and for n/d = 1/1 it collapses back to the
 * difference between the fundamentals.
 *
 * @returns {number|null} null if it was handed something that is not a number.
 */
export const beatRate = (lower, upper, numerator, denominator) => {
  if (![lower, upper, numerator, denominator].every(Number.isFinite)) return null;

  return Math.abs(denominator * upper - numerator * lower);
};

/** A sine has nothing above its fundamental for another tone's partials to meet. */
const hasPartials = (waveShape) => waveShape !== 'sine';

/**
 * Whether the beat this arithmetic predicts is one a listener could hear. The
 * number is always real; the sound is not.
 */
const beatIsAudible = (simple, waveShape, maxBeatingPartial) => {
  if (!simple) return false;

  // A unison beats between the two fundamentals, which every wave has.
  if (simple.numerator === 1 && simple.denominator === 1) return true;

  if (!hasPartials(waveShape)) return false;

  // The numerator is the higher of the two partials, the ratio being at least 1.
  return simple.numerator <= maxBeatingPartial;
};

/**
 * Everything the readout needs about one pair of sounding voices.
 *
 * @param {number} lower - The lower frequency.
 * @param {number} upper - The higher frequency. Not sorted here: a caller with
 *   them the wrong way round has a bug, and silently flipping them would hide it.
 * @param {string} [waveShape] - What the pair is sounding on, which decides
 *   whether the beat can be heard at all. Defaults to a wave that has partials.
 * @returns {object|null} null when the pair is not two audible frequencies.
 */
export function describeInterval(lower, upper, {
  waveShape = 'sawtooth',
  maxDenominator = MAX_RATIO_DENOMINATOR,
  toleranceCents = NAMING_TOLERANCE_CENTS,
  maxBeatingPartial = MAX_BEATING_PARTIAL,
  maxAudibleBeatHz = MAX_AUDIBLE_BEAT_HZ,
} = {}) {
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower <= 0 || upper <= 0) {
    console.error('Not a pair of frequencies:', lower, upper);
    return null;
  }

  if (upper < lower) {
    console.error('Interval frequencies arrived high before low:', lower, upper);
    return null;
  }

  const ratio = upper / lower;
  const simple = nearestSimpleRatio(ratio, { maxDenominator, toleranceCents });
  const fundamentalsHz = upper - lower;

  const beatHz = simple ? beatRate(lower, upper, simple.numerator, simple.denominator) : null;

  return {
    ratio,
    cents: 1200 * Math.log2(ratio),
    simple,
    beatHz,
    // Which harmonics the beat is between: the nth of the lower against the
    // dth of the upper.
    partials: simple ? { lower: simple.numerator, upper: simple.denominator } : null,
    fundamentalsHz,
    audible: {
      beat: beatIsAudible(simple, waveShape, maxBeatingPartial),

      // The case the partial arithmetic misses entirely: two low notes a just
      // 16/15 apart have a partial beat of exactly zero and are audibly rough
      // anyway, because their fundamentals are four hertz apart. Left out when
      // it is the same number as the beat, which is every unison.
      roughness: fundamentalsHz > 0
        && fundamentalsHz < maxAudibleBeatHz
        && beatHz !== fundamentalsHz,
    },
  };
}
