/**
 * How locked a sonority is, measured rather than named.
 *
 * There is no single correct measure, so the one chosen here is stated on
 * screen and argued for in the story. The obvious cheap alternative is Tenney
 * height — log₂(n·d) over the named ratio — and it is disqualified by this
 * app's whole subject: it scores a tempered fifth exactly as it scores a just
 * one, both being called 3/2. A measure that cannot hear the difference between
 * the two chords this app exists to compare is not a measure of anything here.
 *
 * So this is the Plomp–Levelt roughness curve, in the parameterisation Sethares
 * gives in *Tuning, Timbre, Spectrum, Scale*. It works on frequencies rather
 * than on names, which means it scores an interval that has no name at all, and
 * it works over *partials*, which means the answer depends on the wave shape —
 * the same lesson the interval readout already teaches, arrived at from the
 * other side.
 *
 * Pure and DOM-free.
 */

// Sethares' constants. The two exponentials are the rise and fall of the
// roughness curve, which peaks at about a quarter of a critical band and dies
// away either side of it: coinciding partials do not beat, and distant ones
// cannot.
const RISE = 3.51;
const FALL = 5.75;
const RISE_WEIGHT = 5;
const FALL_WEIGHT = 5;

// The critical bandwidth model: how wide the band is at a given frequency.
const D_STAR = 0.24;
const BAND_SLOPE = 0.0207;
const BAND_OFFSET = 18.96;

// Past this many bandwidths apart, two partials contribute nothing worth
// adding up. Derived rather than guessed: the curve is already at 1e-4 here.
const NEGLIGIBLE_AT = 3;

// How many harmonics of each voice to take. The eighth is already quiet enough
// to be arguable, which is the same judgement MAX_BEATING_PARTIAL makes in
// interval.js and for the same reason.
export const MAX_PARTIALS = 8;

/**
 * The amplitude of the nth harmonic, for the four shapes the oscillator can
 * make. These are the ideal spectra of those waves, which is what Web Audio's
 * built-in types are band-limited approximations of.
 */
const SPECTRA = {
  sine: (partial) => (partial === 1 ? 1 : 0),
  sawtooth: (partial) => 1 / partial,
  square: (partial) => (partial % 2 === 1 ? 1 / partial : 0),
  triangle: (partial) => (partial % 2 === 1 ? 1 / (partial * partial) : 0),
};

/** How far apart two partials have to be, in hertz, before they stop interacting. */
const bandwidthAt = (frequency) => (BAND_SLOPE * frequency + BAND_OFFSET) / D_STAR;

/**
 * The roughness between two partials: zero when they coincide, rising to a peak
 * about a quarter of a critical band apart, and falling away past that.
 */
const partialRoughness = (lower, upper, amplitude) => {
  const distance = (upper - lower) / bandwidthAt(lower);

  if (distance === 0) return 0;

  return amplitude * (
    RISE_WEIGHT * Math.exp(-RISE * distance)
    - FALL_WEIGHT * Math.exp(-FALL * distance)
  );
};

const partialsFor = (frequency, waveShape, maxPartials) => {
  const amplitudeOf = SPECTRA[waveShape] ?? SPECTRA.sawtooth;
  const partials = [];

  for (let partial = 1; partial <= maxPartials; partial++) {
    const amplitude = amplitudeOf(partial);

    if (amplitude > 0) partials.push({ frequency: frequency * partial, amplitude });
  }

  return partials;
};

/**
 * The summed roughness of a set of voices, in the model's own units.
 *
 * Every pair of partials is counted, including two partials of the *same*
 * voice: a sawtooth low enough that its own harmonics fall inside one critical
 * band really is rough on its own, and pretending otherwise would make a single
 * bass note read as perfectly smooth.
 */
export function roughnessOf(frequencies, {
  waveShape = 'sawtooth',
  maxPartials = MAX_PARTIALS,
} = {}) {
  // Deduplicated for the same reason the interval readout deduplicates: two
  // voices at one pitch do not beat, they sum, and this model has no notion of
  // loudness to represent the summing with.
  const audible = [...new Set(
    frequencies.filter((frequency) => Number.isFinite(frequency) && frequency > 0),
  )];

  const partials = audible
    .flatMap((frequency) => partialsFor(frequency, waveShape, maxPartials))
    .sort((first, second) => first.frequency - second.frequency);

  let roughness = 0;

  for (let lower = 0; lower < partials.length; lower++) {
    // Sorted ascending, so once a partial is out of range every one after it
    // is too and the row can be abandoned.
    const outOfRange = partials[lower].frequency
      + NEGLIGIBLE_AT * bandwidthAt(partials[lower].frequency);

    for (let upper = lower + 1; upper < partials.length; upper++) {
      if (partials[upper].frequency > outOfRange) break;

      roughness += partialRoughness(
        partials[lower].frequency,
        partials[upper].frequency,
        // The quieter of the two: a loud partial cannot beat against silence.
        Math.min(partials[lower].amplitude, partials[upper].amplitude),
      );
    }
  }

  return roughness;
}

/**
 * A rough sonority to measure others against: two sawtooth tones a semitone
 * apart, low enough to grind. Computed rather than written down, so it cannot
 * drift away from the model it is a reference for.
 */
export const REFERENCE_ROUGHNESS = roughnessOf([220, 220 * Math.pow(2, 1 / 12)], {
  waveShape: 'sawtooth',
});

/**
 * How locked a set of sounding voices is.
 *
 * Reported as roughness *per pair of voices* rather than as the raw sum. The
 * sum grows with the number of pairs whatever they are tuned to, so a
 * well-tuned triad would otherwise read rougher than a badly-tuned dyad purely
 * for having three intervals in it instead of one. The mean is what makes a
 * chord comparable to a dyad, which is the comparison the meter is for.
 *
 * @returns {{roughness, mean, scaled, smoothness, voiceCount}|null} null when
 *   nothing audible is sounding. `smoothness` is 0…1 against the reference and
 *   is what the meter shows; `roughness` is the raw sum behind it.
 */
export function consonanceOf(frequencies, {
  waveShape = 'sawtooth',
  maxPartials = MAX_PARTIALS,
} = {}) {
  const audible = [...new Set(
    frequencies.filter((frequency) => Number.isFinite(frequency) && frequency > 0),
  )];

  if (audible.length === 0) return null;

  const roughness = roughnessOf(audible, { waveShape, maxPartials });

  // A single voice has no pair, but it still has its own harmonics to grind
  // against each other, so it is measured against one rather than against zero.
  const pairs = Math.max(1, (audible.length * (audible.length - 1)) / 2);
  const mean = roughness / pairs;
  const scaled = mean / REFERENCE_ROUGHNESS;

  return {
    roughness,
    mean,
    scaled,
    // Clamped, because a cluster is rougher than the reference and a bar cannot
    // be more than full. `scaled` above keeps the honest reading.
    smoothness: 1 - Math.min(1, Math.max(0, scaled)),
    voiceCount: audible.length,
  };
}
