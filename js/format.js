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
 * Describes a ratio in cents above the root, which is a usable name for
 * intervals that have no conventional one.
 */
export const describeRatio = (ratio) => {
  if (!Number.isFinite(ratio) || ratio <= 0) return '—';

  return `${Math.round(1200 * Math.log2(ratio))} cents`;
};
