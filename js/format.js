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
 * Marks a degree with the octaves it has been shifted, so a repeated degree
 * reads apart from the one it repeats: I, I′, I″.
 */
export const formatDegree = (degree, octaveShift = 0) => {
  const shift = Number.isFinite(octaveShift) ? Math.max(0, Math.trunc(octaveShift)) : 0;

  return `${degree}${'′'.repeat(shift)}`;
};

/**
 * Describes a ratio in cents above the root, which is a usable name for
 * intervals that have no conventional one.
 */
export const describeRatio = (ratio) => {
  if (!Number.isFinite(ratio) || ratio <= 0) return '—';

  return `${Math.round(1200 * Math.log2(ratio))} cents`;
};
