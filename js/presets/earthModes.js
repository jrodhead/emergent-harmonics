/**
 * The gravest free oscillations of the solid Earth — the modes the whole
 * planet rings in for days after a magnitude 8 earthquake — as ratios.
 *
 * A mode's frequency is one over its period, so the ratio between two modes is
 * the quotient of their periods the other way up. Written that way here: every
 * ratio is 0S2's period over the mode's own, in minutes, which keeps the
 * measured numbers visible rather than resolving them to decimals that say
 * nothing about where they came from.
 *
 * These are not a harmonic series. A string divides into integer multiples; a
 * sphere does not, and its modes go as the square root of n(n+1). What comes
 * out is closer to a bell than to a plucked string: a fifth 16 cents sharp, a
 * minor third 28 cents sharp, an octave three quarters of a tone sharp. The
 * near-misses are the whole character of it, so the ratios are exact rather
 * than rounded to the just intervals they sit beside.
 *
 * 0S2 is 20 octaves below 324.24 Hz, which is the root frequency to set for
 * the pitches to be the modes themselves rather than only their intervals.
 * The doubling is a fact about hearing rather than about the Earth: nothing
 * couples across twenty octaves, and the content here is the ratios.
 */
export const earthModesNotes = [
  // 0S2, the football mode: the planet swinging between two prolate shapes.
  { intervalName: "0S2 · football mode", ratioToRoot: 53.9 / 53.9, rootScaleId: "earthModes" },
  // 0T2, the gravest twisting mode, hemispheres counter-rotating.
  { intervalName: "0T2 · toroidal", ratioToRoot: 53.9 / 44.2, rootScaleId: "earthModes" },
  { intervalName: "0S3", ratioToRoot: 53.9 / 35.6, rootScaleId: "earthModes" },
  { intervalName: "0S4", ratioToRoot: 53.9 / 25.8, rootScaleId: "earthModes" },
  // 0S0, the breathing mode: the Earth expanding and contracting as a whole.
  { intervalName: "0S0 · breathing mode", ratioToRoot: 53.9 / 20.5, rootScaleId: "earthModes" }
];
