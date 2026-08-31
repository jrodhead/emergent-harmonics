/**
 * The Schumann resonances: the standing waves in the cavity between the ground
 * and the ionosphere, struck continuously by lightning some fifty times a
 * second the world over.
 *
 * Written as the frequencies they are measured at, in hertz, since unlike the
 * Earth's mechanical modes these are not eigenvalues of a fixed body. The
 * cavity is lossy and its roof moves: the frequencies wander a few tenths of a
 * hertz between day and night, with solar weather, and with the seasons. What
 * is here is the long-run average, not a constant.
 *
 * That looseness is also why the ideal spacing is no use. A lossless spherical
 * cavity would put the modes at the square root of n(n+1), which for the
 * second mode alone is 92 cents away from where it is actually heard, and
 * drifts to 188 cents by the fifth. The measured values are the resonance;
 * the formula is only its shape.
 *
 * Like the mechanical modes this is inharmonic, but it lands far closer to
 * common intervals: the third mode is 7 cents flat of a just fourth and the
 * fourth is 7 cents flat of a harmonic seventh, both near enough to sound
 * intended rather than mistuned.
 *
 * The fundamental is 6 octaves below 501.12 Hz, which is the root frequency to
 * set for the pitches to be the resonances themselves rather than only their
 * intervals.
 */
export const schumannNotes = [
  { intervalName: "SR1 · 7.83 Hz", ratioToRoot: 7.83 / 7.83, rootScaleId: "schumann" },
  { intervalName: "SR2 · 14.3 Hz", ratioToRoot: 14.3 / 7.83, rootScaleId: "schumann" },
  { intervalName: "SR3 · 20.8 Hz", ratioToRoot: 20.8 / 7.83, rootScaleId: "schumann" },
  { intervalName: "SR4 · 27.3 Hz", ratioToRoot: 27.3 / 7.83, rootScaleId: "schumann" },
  { intervalName: "SR5 · 33.8 Hz", ratioToRoot: 33.8 / 7.83, rootScaleId: "schumann" }
];
