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
