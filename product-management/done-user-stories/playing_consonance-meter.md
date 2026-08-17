# Consonance meter

**Built.** Smaller than the stories around it, because it inherits both halves of its groundwork
from [playing_live-interval-readout.md](playing_live-interval-readout.md): the set of sounding
voices, and a display slot next to the one that reads them.

## The story

As someone building a chord, I want to see how locked the current sonority is, so that I can
find the tunings that ring.

**Acceptance Criteria:**
1. A live indication of the consonance of everything currently sounding.
2. The measure it uses is stated, since there is no single correct one.

---

## The idea in one line

**Criterion 2 is the story.** Criterion 1 is a subscription that already exists and a bar.

Consonance is not a measurable property of a sound the way frequency is; it is a family of
competing models, and picking one is picking what the app claims consonance *means*. So the
choice is argued below, named on screen, and kept where a reader can disagree with it.

---

## The measure, and the one that was rejected

**Tenney height** — `log₂(n·d)` over the named ratio — is the obvious cheap choice. The interval
readout already produces `n/d` for every pair, so the meter would have been an afternoon. It is
disqualified for two reasons, either of which is fatal here:

- **It cannot hear temperament.** It scores a tempered fifth exactly as it scores a just one,
  both being called `3/2`. A measure that cannot separate the two chords this app exists to
  compare is not measuring anything this app is about.
- **It is deaf to register.** A cluster at the bottom of the bass and the same cluster three
  octaves up have identical ratios and wildly different sounds. Anyone who has played both knows
  which one grinds.

**Plomp–Levelt roughness**, in the parameterisation Sethares gives in *Tuning, Timbre, Spectrum,
Scale*, has neither problem. It works on frequencies rather than on names, so it scores intervals
that have no name at all; it is register-sensitive, because critical bandwidth is; and it works
over *partials*, so the answer depends on the wave shape — the same lesson the interval readout
teaches, arrived at from the other side.

### What it honestly cannot do, and why that is fine

**Roughness is not beating.** A fifth two cents narrow beats at 1.5 Hz, and a 1.5 Hz beat is a
slow undulation rather than a roughness — the curve peaks at about a quarter of a critical band
and is near zero for a difference that small. So this meter separates a just fifth from a
tempered one by only about two points, where the readout beside it puts a number on the beat and
calls it plainly.

That is not a defect to work around; it is the reason both displays earn their place:

| | The interval readout | This meter |
| --- | --- | --- |
| Answers | what two voices are, and how fast they beat | how rough the whole sonority is |
| Catches | a fifth a few cents off | a cluster, a low chord, a wrong register |
| Blind to | how three or more voices add up | slow beating |

A design that made the meter a second opinion on the readout's own question would have been worth
less than one that answers a different one.

---

## Decisions taken

- **Roughness per pair of voices, not the raw sum.** The sum grows with the number of pairs
  whatever they are tuned to, so a well-tuned triad would read rougher than a badly-tuned dyad
  purely for having three intervals in it instead of one. The mean is what makes a chord
  comparable to a dyad, which is the comparison the meter is for.
- **The full scale is a semitone dyad at 220 Hz**, computed at module load from the model itself
  rather than written down, so it cannot drift away from the thing it is a reference for. It is
  stated on screen alongside the measure, because a percentage with no stated end points is a
  number pretending to be a fact.
- **A reading past the reference is clamped for the bar and kept for the record.** `smoothness`
  is clamped to 0…1; `scaled` says how far past.
- **Every voice weighs the same.** The drone sounds at 0.3 and the note keys at 0.5, and the
  model ignores both. Fixing it means putting per-voice volume through `soundingVoices()`, which
  is a change to the audio layer for a second-order effect. Recorded as a limitation instead.
- **Coincident frequencies collapse**, as they do in the readout, and for the same reason: two
  voices at one pitch sum rather than beat, and this model has no notion of loudness to represent
  the summing with.
- **Intra-voice partials count.** A sawtooth low enough that its own harmonics fall inside one
  critical band really is rough on its own, so a single bass note reads as rough. That also gives
  the meter something to say about one voice, which the interval readout cannot have.
- **Its own subscription, not the readout's.** The audio layer holds a *set* of listeners
  precisely so it can have more than one, and two independent displays that happen to read the
  same source should not be welded together.

---

## Design

### 1. The measure — `js/system/consonance.js` (new)

Pure and DOM-free, like [interval.js](../../js/system/interval.js) beside it.

- `roughnessOf(frequencies, { waveShape, maxPartials })` — expands each voice into its ideal
  spectrum (`sine` fundamental only; `sawtooth` 1/n; `square` odd 1/n; `triangle` odd 1/n²),
  sorts every partial by frequency, and sums the Plomp–Levelt curve over pairs. Partials being
  sorted, the inner loop breaks as soon as a pair is more than three bandwidths apart, which
  keeps a thirty-voice chord linear rather than quadratic.
- `REFERENCE_ROUGHNESS` — the semitone dyad, computed from `roughnessOf` itself.
- `consonanceOf(...)` — the mean per voice pair, scaled against the reference, clamped into a
  `smoothness` the bar can use.

### 2. The display — `js/keys/renderConsonanceMeter.js`, `js/keys/consonanceMeter.js` (new)

The render draws a bar, a percentage, a word for reading it at a glance (`locked`, `ringing`,
`restless`, `rough`, `grinding`) and — criterion 2 — the measure itself, which names the wave
shape it was taken on because the answer depends on it.

The handler is the interval readout's, one subscription shorter: `subscribeToSounding`, a
coalescing `requestAnimationFrame`, and a `change` listener on `#waveShape` for the same reason
the readout has one.

Wired in [index.html](../../index.html) after `intervalReadout.js`.

---

## Tests

**Unit — [test/unit/consonance.test.js](../../test/unit/consonance.test.js)** — 22 tests, which is
where the risk is. The interesting ones:

- A tempered fifth is rougher than a just one; a tempered triad is rougher than a just one *more
  clearly*, three intervals disagreeing rather than one.
- A semitone is rougher than either fifth.
- On a sine, a fifth is smooth and the two fifths are indistinguishable — there being no partials
  for the tempering to disagree in.
- A low sawtooth is rough alone; a high one is smooth alone.
- The reference reads exactly 1.0 scaled and 0 smooth, which is what makes it a reference.
- Duplicated and non-finite frequencies are dropped.

**Browser — [test/browser/consonanceMeter.test.js](../../test/browser/consonanceMeter.test.js)** —
13 tests, including the exact wording of the stated measure (criterion 2 is a claim about the
screen, so it is asserted on the screen), the drone reaching the meter, a single voice being
measured where the readout shows nothing, and a low register reading rougher than a high one on
the same chord.

---

## What was built

| File | What changed |
| --- | --- |
| [js/system/consonance.js](../../js/system/consonance.js) | New — the model, pure and DOM-free |
| [js/keys/renderConsonanceMeter.js](../../js/keys/renderConsonanceMeter.js) | New — the bar, the band, and the stated measure |
| [js/keys/consonanceMeter.js](../../js/keys/consonanceMeter.js) | New — its own subscription and coalesced redraw |
| [index.html](../../index.html), [css/styles.css](../../css/styles.css) | The meter row and its styling, and the script tag |
| [test/unit/consonance.test.js](../../test/unit/consonance.test.js) | New — 22 tests |
| [test/browser/consonanceMeter.test.js](../../test/browser/consonanceMeter.test.js) | New — 13 tests |
| [test/browser/intervalReadout.test.js](../../test/browser/intervalReadout.test.js) | Its coalescing test now counts redraws of the readout rather than calls to `requestAnimationFrame` |
| [README.md](../../README.md) | The meter section, and the code layout |

Nothing in `js/audio/` or `js/keys/` was touched to make this work, which is the check that the
interval readout's groundwork was in the right place.

**Three things the plan learned by being run:**

- **Two sine tones a semitone apart are rough.** The first browser test asserted that a sine reads
  100% consonant whatever is played, on the reasoning that a sine has no partials. Wrong, and
  instructively so: a sine has no *partials*, but two sine *fundamentals* inside one critical band
  are rough on their own — that pair is exactly what Plomp and Levelt measured. The test now makes
  both claims separately.
- **A just fifth on a sawtooth is not perfectly smooth**, and the first unit test wrongly demanded
  it be. Only the coinciding partials lock; the rest are still a fifth apart, and at 440 Hz that is
  inside the range where they interact a little. It reads 90%.
- **The readout's coalescing test broke**, correctly. It counted global `requestAnimationFrame`
  calls, and a second display schedules a second frame. Counting redraws of the readout itself is
  what it always meant.

---

## Consequences and risks

- **The bands are a judgement wearing the clothes of a measurement.** `locked` at 90% and
  `ringing` at 75% are chosen by eye. The percentage beside them is the actual reading and the
  bands are for glancing; if they mislead, delete them rather than tune them.
- **Every voice weighs the same, and they do not.** See *Decisions*. The most visible case is a
  drone at 0.3 counting as loudly as a note at 0.5.
- **Eight partials is a cliff, not a fade.** The ninth harmonic contributes nothing rather than a
  little, so a square wave — all odd harmonics, reaching further up — is slightly under-measured
  against a sawtooth. `MAX_PARTIALS` is the dial, and it costs quadratically.
- **The reference is one dyad.** Every reading is relative to a semitone at 220 Hz on a sawtooth,
  including readings taken on a sine, where that reference sounds nothing like what is being
  measured. It is stated, which is the most that can be said for it.
- **It says nothing about *why*.** A 40% reading does not say which pair is grinding. The interval
  readout above it does, by inspection, and pairing the two displays is the answer rather than
  annotating this one.
