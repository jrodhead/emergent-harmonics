/**
 * Shared display formatting so frequencies and ratios read the same way
 * everywhere they are shown.
 */

export const formatFrequency = (frequency) => {
  if (!Number.isFinite(frequency)) return '—';

  return Number(frequency.toFixed(2)).toString();
};

export const formatRatio = (ratio) => {
  if (!Number.isFinite(ratio)) return '—';

  return Number(ratio.toFixed(4)).toString();
};

/**
 * A degree with the periods it has been shifted from the root: V, V +1, V −2.
 * The same degree appears on several keys at once, on the note keys and on the
 * root keys both, and the shift is what tells them apart.
 */
export const formatDegree = (degree, periodShift = 0) => {
  const shift = Number.isFinite(periodShift) ? Math.trunc(periodShift) : 0;

  if (shift === 0) return `${degree}`;

  return `${degree} ${shift > 0 ? '+' : '−'}${Math.abs(shift)}`;
};

/**
 * Describes a ratio in cents above the root, which is a usable name for
 * intervals that have no conventional one.
 */
export const describeRatio = (ratio) => {
  if (!Number.isFinite(ratio) || ratio <= 0) return '—';

  return `${Math.round(1200 * Math.log2(ratio))} cents`;
};

/**
 * How far an interval sits from the ratio it is being called: −2 cents, +17
 * cents, or `just` when it lands on it. Signed with the same Unicode minus
 * `formatDegree` uses.
 */
export const formatCents = (cents) => {
  if (!Number.isFinite(cents)) return '—';

  const rounded = Math.round(cents);

  if (rounded === 0) return 'just';

  const size = Math.abs(rounded);

  return `${rounded > 0 ? '+' : '−'}${size} cent${size === 1 ? '' : 's'}`;
};

/**
 * A beat rate. Two decimals below ten hertz and one above, because 0.75 Hz and
 * 12 Hz want different precision and a single fixed one is wrong at one end.
 */
export const formatBeat = (hz) => {
  if (!Number.isFinite(hz)) return '—';

  const decimals = Math.abs(hz) < 10 ? 2 : 1;

  return `${Number(hz.toFixed(decimals))} Hz`;
};

const ORDINAL_SUFFIXES = ['th', 'st', 'nd', 'rd'];

/** Which harmonic, said as an ordinal: the 3rd partial against the 2nd. */
export const formatPartial = (partial) => {
  if (!Number.isFinite(partial)) return '—';

  const whole = Math.trunc(Math.abs(partial));
  const lastTwo = whole % 100;

  // 11th, 12th and 13th break the pattern the last digit otherwise sets.
  const suffix = lastTwo >= 11 && lastTwo <= 13
    ? 'th'
    : ORDINAL_SUFFIXES[whole % 10] ?? 'th';

  return `${whole}${suffix}`;
};
