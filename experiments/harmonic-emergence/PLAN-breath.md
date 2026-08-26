# Breath — plan and reasoning

The first of these that is not a simulation.

v1, v2 and v3 all model something. v3 in particular models a structural claim from a
2026 psilocybin paper, and models it carefully — but the honest summary of it, written
into its own closing section, is that it proves things about a model and nothing about a
brain. The brief for this one was the complement: *audio can influence brain activity —
what are the ways, and can any of them be built?*

So this piece is pointed at a person instead of at an idea, and almost every design
decision in it came from taking that seriously enough to throw things away.

---

## 1. The claim that survived

Audio changes brain activity at three very different levels, and the consumer market
depends on blurring them:

1. **Driving a rhythm in sensory cortex.** The auditory steady-state response is rock
   solid — reliable enough for clinical infant audiometry. But it is a driven response
   in auditory pathways, not a change in global state.
2. **Changing global network organisation.** What the psilocybin literature measures.
   Audio is weak here alone.
3. **Changing emotional and autonomic state.** Uncontroversial, and — it turns out —
   the level that actually matters.

The obvious design would target level 1: pick a frequency, modulate a tone at it, claim
entrainment. Two things killed that.

**The evidence isn't there.** A [systematic review in PLOS One][bb] found five studies
supporting binaural-beat entrainment, eight contradicting it, one mixed — "inconclusive
at best." A [separate meta-analysis][bb2] found a moderate effect on memory and attention
(g = 0.40), but that is what arousal and expectancy look like, not a mechanism. And
physically a binaural beat isn't in the signal at all; it's constructed centrally, which
is exactly why it drives cortex *less* than plain amplitude modulation would.

**And it points the wrong way.** Psilocybin *decouples* sensory systems from the rest of
the brain — internally generated activity rises relative to sensory processing. Rhythmic
auditory drive does the opposite: it couples you harder to the external signal. A naive
"entrain at frequency X" design would be strengthening precisely the coupling that the
state it's imitating loosens.

What replaced it is a chain where every link has evidence:

```
audio  ->  respiratory rate and phase  ->  cortical and autonomic state
```

Pacing a **motor behaviour** with rhythm is something sound is genuinely excellent at —
far more reliable than driving cortical oscillations. And respiration is not just any
behaviour: a [2025 study of paced breathing and breath-holding][resp] states plainly that
"respiration functions as an intrinsic pacemaker for large-scale cortical dynamics," with
paced breathing entraining infra-slow oscillations of brain potentials to the respiratory
cycle — mechanical phase-locking through afferent pathways, independent of oxygen status.
They could classify respiratory condition from EEG alone at 85% accuracy.

**So the instrument's job is to be a metronome for the lungs, not for the brain.** Carrier
frequencies and beat frequencies stop mattering entirely. What matters is period, the
shape of the cycle, the legibility of the phase cue, and how it evolves.

Worth noting v1 already chose better than binaural beats without meaning to: its opening
is two tones 1.5 cents apart beating at 0.5 Hz — *acoustic* beating, physically present in
the air.

## 2. Why there is no sensor, which is the part I got wrong first

My first three proposals were all wrong in the same direction, and the correction is the
most useful thing in this document.

I proposed **capnometry**, because end-tidal CO₂ is the causal variable in high-ventilation
work and the instrument otherwise can't detect overshoot. Rejected as out of scope: it's a
clinical device and no consumer product in this space requires one.

I then proposed **free sensors already in the device** — microphone-derived breath detection
(v3's `clarity` metric inverted is a breath detector, since breath is broadband and music is
tonal) and camera PPG for a one-time resonance calibration. Cleverer, still wrong.

The actual error underneath all of it: **I was importing measurement from the research
protocols without asking what it was for there.** Those studies need capnometry and EEG to
establish a publishable finding — to prove the intervention did something. A person
practising does not need instrumentation to have the experience. I carried the study's
requirements over to the instrument, and they don't transfer.

Once that's clear, the arguments against sensing are strong and mostly not about cost:

- **Measurement invites optimisation, which is the wrong mode.** Show someone an HRV
  coherence score and they start trying to win it. Effortful striving is sympathetic
  activation — the opposite of what slow breathing is for. This is a known failure of
  gamified biofeedback: the number becomes the goal and the state it proxied for never
  arrives.
- **Interoception is the skill, so mediating it is counterproductive.** If any of this has
  durable value it's in getting better at reading your own body. A sensor is a crutch that
  delays exactly that.
- **The human is a better sensor for the thing that matters.** A capnometer reads CO₂. But
  CO₂ isn't what you care about — you care about *is this person okay*, and they know that
  in far higher fidelity than a number does. Tetany is unmistakable. Lightheadedness is
  unmistakable. I was proposing to measure a proxy when the real signal was already
  available to the only person who needs it.
- **The traditions already work this way.** Holotropic sessions have no instrumentation.
  Grof's framework rests on the person's own process directing the session.

So: no sensor, no permissions, nothing stored. The page asks for nothing.

**The one place this is genuinely weaker** is that interoceptive judgment degrades in deep
states — that is partly what the state *is*, and someone deep into sustained hyperventilation
is not well placed to evaluate whether to continue. The tradition's answer is a sitter, not a
sensor. The engine's answer is §5.

## 3. The pattern that justifies all of it

Three separate literatures came up during design, and all three have the same shape:

- **Closed-loop auditory stimulation in sleep** reliably enhances slow oscillations, and
  the [memory benefits largely fail to replicate][sleep].
- **Binaural beats** show behavioural effects best explained by arousal, with the claimed
  EEG mechanism unsupported.
- **Resonance-frequency breathing** produces higher acute HRV than a fixed rate — and in a
  [2026 randomised trial][rf] (N = 88, four weeks), individually-determined resonance
  frequency and a fixed 0.1 Hz reduced stress, anxiety and depressive symptoms *equally
  well*, with no meaningful difference.

In every case you can move the measurable proxy without moving the thing anyone wants.
That's the strongest available argument for building an instrument that doesn't measure:
optimising the proxy is a way of looking rigorous while chasing a number that doesn't cash
out.

This also forced a correction. I had recommended an HRV sweep to find each person's
individual resonance frequency, calling it the feature that would make this an instrument
rather than a metronome. The evidence says it isn't worth it — and separately, that
resonance frequency [isn't even stable, changing between test and retest in 66.7% of
participants][unstable], so "measure once and use forever" was wrong on two counts.

What's left is a default of **5.5 breaths/min** — the population mode, and effectively the
rate the fixed-rate arm of that trial validated — with the option of a height-based estimate
([published formulas][est]: men `17.90 − 0.07 × height_cm`, women `15.88 − 0.06 × height_cm`,
adjusted R² 0.55 and 0.47) as a *starting point*, and then adjustment by feel. Which is an
interoceptive instruction rather than an instruction to chase a display.

## 4. The cycle is four numbers

```
cycle := { inhale, inhaleHold, exhale, exhaleHold }   // seconds
```

Absolute seconds, not rate-plus-ratio, because that's how protocols are actually written —
4-7-8 and box breathing already come in this form. Rate is derived from the sum.

I initially wrote that exhale should be at least as long as inhale. That's correct for the
resonance protocol and **wrong as an engine constraint**, which is a real overgeneralisation
worth recording. Heart rate rises during inhale (vagal withdrawal) and falls during exhale
(vagal return), so exhale-dominant is calming and inhale-dominant is *activating* — and
inhale-dominant protocols exist precisely because activation is sometimes the point. Wim Hof
rounds are forceful full inhales with a passive exhale; tummo and bhastrika likewise. The
direction is documented in `breath.json` as guidance for protocol authors; the code does not
enforce it.

**Zero is legal for any of the four**, and this isn't a tolerance — it's the defining
property of circular and connected breathing, the entire holotropic family. `{1.2, 0, 1.2, 0}`
has to produce a seamless turnaround, not a special case.

A phase interpolates between two cycles, so a ramp can change rate and shape together:
`{4,0,6,0} → {1.5,0,1.5,0}` both accelerates and migrates from exhale-dominant to symmetric,
which is what a real settle-to-ramp transition does. `from == to` is a steady phase.

Checked against real protocols — resonance, coherent, 4-7-8, box, circular, and a Wim Hof
round all express cleanly, which is decent evidence the primitive is right.

## 5. Safety belongs to the protocol, not to a slider

The naive version of "one instrument, both protocols" is a rate slider from 6 to 40
breaths/min. That's unacceptable: **a config value would silently change the risk class of
the tool.** Someone sets 25/min, runs 45 minutes, and is now doing an unsupervised
hyperventilation protocol they never chose.

So risk attaches to the *protocol*, and the caps are applied at load to every phase
regardless of what the protocol requests. A protocol asking for a 300-second empty-lung
retention gets 20 seconds and is not consulted. Retentions are the one segment where the
practitioner is deliberately overriding the urge to breathe — the very interoceptive signal
this design otherwise treats as the authority — so it's the one place a fixed number has to
do the work instead of feel. Empty-lung retention after heavy ventilation is also the
shallow-water-blackout mechanism, which is why the page's water warning is the first line
of its safety panel rather than the last.

**The abort control was designed backwards from tetany.** Hands claw up; fine motor control
is the first thing to go. So it cannot be a small button, a menu item, or a drag — it's a
full-width target bound to the two easiest keys. And it never cuts to silence, because an
abrupt stop in a deep state is its own problem: it builds a glide from whatever cycle is
playing into the abort phase's cycle, so the pace decelerates rather than snapping.

Retention phases can also terminate on user input rather than a duration, which is both more
faithful to how retentions are actually practised — held until you need to breathe, not for a
number someone else chose — and safer, since it returns the decision to the person.

## 6. Two bugs the verification caught

Both are recorded because both were invisible by inspection.

**Phase transitions were discontinuous.** Cycle position `u` is carried across a phase
boundary while the segment boundaries jump to a different shape, so the same `u` can land
mid-inhale on one side and mid-hold on the other — a jump in `openness` of up to 0.99 on the
`ramp-test` protocol. `resonance` passed only because its adjacent cycles happen to match,
which is exactly the kind of accident that hides a bug.

The fix is structural rather than per-protocol: **phase changes are deferred until openness
is already at the bottom.** Within a phase, continuity holds by construction. Across an edge
it's guaranteed by only ever switching where both cycles sit at 0. This also means an
"advance" lands at the end of the current breath rather than instantly, which is the more
natural reading of the gesture anyway. Abort is the exception and switches immediately — it's
a safety control, and it's already continuous because the glide starts from the exact cycle
playing.

That in turn requires an invariant on cycle shape: a cycle must open and close at rest, which
given the fixed segment order means it starts with an inhale and ends with an exhale or an
empty hold — or is a pure retention, which sits at 0 throughout and connects to anything. The
shapes this excludes ("hold full without inhaling first") are not practices. Checked in
verify.

**The output clipped, at 1.07.** I normalised partial gains by their L2 norm, which holds RMS
constant. But these are exact harmonics of one fundamental, so their peaks coincide
periodically *however the phases are initialised*, and the true worst case is the sum of
magnitudes. Dividing by the **L1** norm makes `|output| <= out * amp` arithmetically, for any
phase relationship, with no limiter — and a limiter would have put frequencies in the air that
nobody chose, which is the constraint v1 set for this whole project.

That fix had a second-order consequence the level measurement then caught: L1 normalisation
makes the *bright* end quieter in RMS terms, because energy spreads across more partials. RMS
fell from −21.7 dBFS at empty to −25.5 at full, inverting the loudness cue against the
brightness cue. `ampFloor` dropped to 0.40 to compensate, leaving a deliberate ~2 dB swell
toward full. Initial phases are also spread by golden ratio rather than all starting at zero,
which would have made the sum an impulse train on every period of the fundamental.

## 7. What the lattice inherited, and the one part of it that was momentum

Three decisions carry over from v1 and are load-bearing here:

- **The 1/n amplitude law** (v1 §5), which is why the cue reads as one object moving rather
  than a chord swelling. Partials at natural relative amplitudes fuse; at equal amplitudes
  they split into separately-heard tones. A breath cue needs one thing, not several.
- **Sine waves only** (v1 §6), which actively changed a decision during the build. When the
  output clipped, the ordinary fix is a limiter — rejected precisely because a limiter
  generates distortion products, the thing v1 forbade. That is what forced the L1
  normalisation in §6 instead.
- **The unsounded fundamental.** 36 Hz is never played and neither are partials 1–5; it is
  what the ear infers. Though the *reason* is gone — in v1 the missing fundamental was a
  model of a self, and here nobody is being asked to infer anything. What survives is a
  useful perceptual side effect attached to a justification that no longer applies.

**No transients** looks like a fourth inheritance and isn't. v1 banned attacks because a
percussive onset is broadband noise and the signature of a body striking something. Breath
arrives at the identical rule from the interoception argument in §2 — the cue must not imply
it knows better than you. Same constraint, independently derived.

**Stereo is decorative here, and I'd call that out.** In v1 pan encoded prime factorisation,
so integration was audible as the image collapsing; in v3 it carried population identity. In
Breath the image just widens as the breath fills, which is a redundant restatement of
`openness`. It looks like the family and carries no information.

And **the comb membrane from v2/v3 is deliberately absent** — there is no organism here, so
there is no boundary to model.

### The partial set was inherited by momentum, and it was wrong

The first version used every integer harmonic from 6 to 30 — twenty-five partials, spaced a
constant 36 Hz. Checking that against auditory filter widths rather than assuming: **all 24
adjacent pairs sat inside one critical band**, from 0.72 ERB at the bottom to 0.26 at the top.
Nothing was ever resolved.

That buys guaranteed fusion, which is wanted. It also guarantees *roughness*, which is not —
and worse, since the low-pass sweep leaves only the lowest partials at the bottom of the
breath, the quietest and most restful moment of every cycle was also the buzziest. For an
instrument whose main protocol exists to calm someone down, that is backwards.

It was never a decision. It was the project's lattice showing through, unexamined, from three
pieces where a dense harmonic series meant something.

The set is now **6, 8, 10, 12, 15, 18, 22, 27, 33** — chosen so every adjacent pair is
1.07–1.53 ERB apart, so all eight are resolved. Same lattice, same unsounded 36 Hz (the GCD is
still 1, so the missing-fundamental percept is intact), nine partials instead of twenty-five.
`verify-breath.js` now checks both properties, so this is enforced rather than merely recorded.

Two things improved that I did not anticipate. The brightness sweep stayed smooth despite
having a third as many partials — the rolloff is gentle enough in index space that they fade
rather than switch. And the level behaviour got *better*: with 25 partials, L1 normalisation
spread energy so widely that RMS fell 4 dB from empty to full and `ampFloor` had to fight it;
with nine it rises monotonically, +3.5 dB, and peak dropped from 0.795 to 0.602 against the
same bound.

## 8. The breath layer — noise, and why it tracks flow rather than volume

The drone maps openness to brightness, and that mapping is **arbitrary**: you have to be
told that brighter means fuller. A second layer fixes that, and it isn't an analogy —
**breath sound literally is filtered noise**, turbulent airflow through the airway shaped
by throat and mouth. Modelling that gives an **iconic** cue: one that means what it
resembles, needs no learning, and stands a chance of being synchronised to without
deliberate effort. For a pacer that is the whole game.

The design decision that mattered: **`openness` is lung volume, but breath sound is
produced by airflow, which is its derivative.** The raised cosine differentiates
analytically —

```
inhale:  o = 0.5 − 0.5·cos(πp)   →   flow ∝ sin(πp) / duration
```

— so the envelope costs no new parameters and comes out physically correct for free. It
swells and fades within each inhale and exhale, loudest in the middle, and is **exactly
zero throughout both retentions**. Holding your breath makes no sound, and the model
produces that rather than being told it. Getting this wrong — driving noise level from
volume instead of flow — would have made the sound loudest while the breath was
motionless, which is precisely backwards.

Faster breathing genuinely produces more airflow and therefore more sound, and that is
kept: circular breathing at 25/min measures **9.8 dB louder** than slow resonance
breathing. Literal flow would give 14 dB; a compression exponent of 0.8 keeps the effort
contrast audible while leaving slow breathing clearly present rather than nearly silent.

Pink rather than white. White noise has equal energy per hertz, which puts its
perceptual weight up high — hissy and genuinely fatiguing over a seventeen-minute
session. Pink is equal energy per octave, which is roughly how natural broadband sounds
distribute, breath included. The sign of the flow derivative also tells us direction for
free, so inhale and exhale get different filter centres and stop being acoustic mirror
images — a cue dimension the drone does not have.

**It supplements rather than replaces**, and the reason is concrete: noise alone goes
silent through retentions, so box breathing would have no cue at all for 50% of its
cycle. The drone stays underneath as the anchor. Both layers are independently
switchable so this can be heard instead of argued about.

### What the layer cost

The drone alone is bounded arithmetically — L1 normalisation guarantees `|out| <= out`
with no limiter. **Noise is not bounded that way, so the total is no longer provable and
has to be measured.** That is a real downgrade in how tightly this thing is pinned down,
and it showed up immediately: the binding case is the dense set (crest factor ~7, peaking
at 0.795 alone) plus breath at circular breathing, which measured **0.972** at the
original output level — effectively clipping. Dropping `out` from 0.80 to 0.65 brings
that worst combination to 0.763 with real margin.

Claim 12 in `verify-breath.js` renders every drone-set × layer combination and fails if
any approaches full scale. That check is the replacement for the guarantee this layer
cost, and it is why the guarantee being lost is acceptable rather than merely regrettable.

## 9. The cue

One control value, `openness`, 0 = empty and 1 = full. Everything audible is a function of it.
Brightness is a smooth low-pass in partial-index space whose cutoff tracks openness, so full is
wide and bright and empty is a low hum, with a small amplitude swell reinforcing.

The four segments map onto **rising, held high, falling, held low** — two moving states and two
static ones at opposite poles, which is what makes all four distinguishable with eyes closed.

The raised cosine is doing more work than it looks like. Its derivative is zero at *both* ends,
so inhale arrives at 1 having already come to rest and exhale leaves 1 the same way. The
zero-duration turnaround is therefore smooth for free — verify measures the apex as the
*slowest-moving* point in a circular cycle rather than a corner.

**And there are no transients anywhere.** No ticks, no attacks, no onset marking where a breath
"should" start. This is a design requirement, not an aesthetic: the premise is that the
practitioner's interoception is the authority, and a strict metronome contradicts that by
implying the instrument knows better. Being off the pace produces no click and no beat. You can
breathe with it or around it.

---

## Verified, not asserted

`node verify-breath.js` replicates the sequencer headlessly and renders real audio:

**Segment timing.** Measured segment durations match the protocol spec to under 0.1 ms for both
`4-0-6-0` and `4-4-4-4`.

**Zero-duration segments.** In `{1.2, 0, 1.2, 0}` the holds are never entered, the largest
openness step anywhere is 0.0035, and the largest step within 2% of the apex is 0.001 — the
turnaround is the smoothest point in the cycle.

**Ramps.** `ramp-test` starts at exactly 6.0/min and ends at exactly 25.0/min.

**Abort.** Tested from every phase of every protocol at four points in the breath: largest
openness jump at the moment of abort is 0.0033 — ordinary per-block motion, i.e. no jump — and
it always lands in the declared abort phase.

**Safety caps.** A protocol requesting `[2, 90, 1, 300]` loads as `[2, 20, 1, 20]`.

**Continuity.** Across all three shipped protocols, openness stays within [0, 1] with a maximum
step of 0.0035 — the natural motion of the raised cosine, not the switch threshold.

**No transients, no clipping.** Rendering real samples at 48 kHz through steady 6/min, steady
25/min, all-four-segments box, a phase change, and a mid-breath abort: peak 0.795 against a hard
L1 bound of 0.80, and the largest sample-to-sample step is 0.41× what a band-limited signal at
the top partial can legitimately produce. A click from a gain jump would read well above 1×.

---

## What this does not claim

**It does not measure anything about you, and therefore claims nothing about you.** The verify
script checks the cue: timing, continuity, abort, levels. Whether breathing at 6/min does
anything for a given person on a given day is not a question this project has an instrument to
answer — the same boundary v2 and v3 drew between what a model does and what a nervous system
does. What changed is that the boundary is now honest in the other direction too: this one
genuinely acts on a person, and so it says less rather than more.

**Pacing is a suggestion the instrument cannot verify you followed.** It cues rate; depth is
entirely yours. The physiologically active variable in heavy protocols is *minute ventilation* —
rate times tidal volume — and the instrument controls neither term. That's precisely why the
shipped protocols are all slow paced breathing, and why the caps are fixed rather than tunable.

**The evidence behind the mechanism is stronger than the evidence behind any outcome.** That
respiration paces cortical and autonomic activity is well supported. That a particular protocol
delivers a particular benefit is a much weaker and much more contested claim, and nothing here
should be read as making it.

**And it is not a psychedelic, an altered-state generator, or a therapy.** The engine can express
high-ventilation protocols and none ship. Those want another person in the room — which is what
the traditions do, what the studies did, and what no feature in a web page replaces.

---

## Sources

- Ingendoh, R.M. et al. "Binaural beats to entrain the brain? A systematic review."
  *PLOS One*, 2023. https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0286023
- "Potential of binaural beats intervention for improving memory and attention."
  *Psychological Research*, 2022. https://link.springer.com/article/10.1007/s00426-022-01706-7
- "Dynamic brain network modulation by paced breathing and breath-holding."
  *Frontiers in Physiology*, 2025.
  https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1722715/full
- Ngo, H.-V. et al. "Auditory closed-loop stimulation of the sleep slow oscillation enhances
  memory." *Neuron*, 2013. https://pubmed.ncbi.nlm.nih.gov/23583623/ — and the replication
  picture: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6831893/
- Sumińska, S., Rynkiewicz, A., Szulczewski, M.T. "Resonance frequency versus fixed 0.1 Hz
  breathing in HRV biofeedback: a four-week randomized comparison." *Scientific Reports*, 2026.
  https://www.nature.com/articles/s41598-026-53333-6
- "Resonance frequency is not always stable over time." *Scientific Reports*, 2021.
  https://www.nature.com/articles/s41598-021-87867-8
- "An estimation formula for resonance frequency using sex and height."
  *Applied Psychophysiology and Biofeedback*, 2024.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC10869367/
- Vaschillo, E., Lehrer, P. et al. "Heart rate variability biofeedback as a method for assessing
  baroreflex function." *Applied Psychophysiology and Biofeedback*, 2002.
  https://link.springer.com/article/10.1023/A:1014587304314

[bb]: https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0286023
[bb2]: https://link.springer.com/article/10.1007/s00426-022-01706-7
[resp]: https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1722715/full
[sleep]: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6831893/
[rf]: https://www.nature.com/articles/s41598-026-53333-6
[unstable]: https://www.nature.com/articles/s41598-021-87867-8
[est]: https://pmc.ncbi.nlm.nih.gov/articles/PMC10869367/
