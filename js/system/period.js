/**
 * A period is the interval a scale repeats at: the frequency you multiply by
 * to arrive at the same note again, higher up. In every system this app has
 * generated so far that interval is the octave, 2:1, which is why the app says
 * "octave" wherever it speaks to the person using it.
 *
 * It is a constant rather than a literal 2 scattered through the code so that
 * the assumption has one home. Systems that repeat at something else exist —
 * Bohlen-Pierce repeats at 3:1, and stretched tunings at a little over 2:1 —
 * and this is the value they would come in through.
 */
export const PERIOD_RATIO = 2;

/** What to multiply a frequency by to shift it that many periods. */
export const periodMultiplier = (periodShift) => Math.pow(PERIOD_RATIO, periodShift);

/**
 * Folds a ratio into a single period, so every note of a configured scale sits
 * between the root and the next repeat of it. Presets written across several
 * octaves (or below the root) keep their pitch classes.
 */
export const foldRatioIntoPeriod = (ratio) => {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;

  let folded = ratio;
  while (folded >= PERIOD_RATIO) folded /= PERIOD_RATIO;
  while (folded < 1) folded *= PERIOD_RATIO;

  return folded;
};
