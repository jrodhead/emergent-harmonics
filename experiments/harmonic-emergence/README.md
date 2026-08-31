# harmonic-emergence

Four standalone experiments. None imports from, modifies, or depends on the app —
they are here to hear an idea, not to become a feature.

| | what it is | open |
|---|---|---|
| **v1 — Ascension** | a fixed 28.5 s passage on the harmonic series of an unsounded 36 Hz fundamental | `index.html` |
| **v2 — Field** | eighteen coupled oscillators that discover the harmonic series themselves, running until you stop them | `emergence.html` |
| **v3 — Embedded** | three mutually segregated harmonic populations whose boundaries dissolve into a shared, room-tracking consensus above a critical permeability | `embedded.html` |
| **Breath** | a breath pacer — the first one of these pointed at a person rather than at an idea | `breath.html` |

The first three model things. **Breath** is the one that doesn't: it paces respiration,
which is a behaviour audio is reliably good at entraining, rather than claiming to
entrain anything in a brain. It has no sensor, asks for no permissions, and measures
nothing about you — see `PLAN-breath.md` for why that ended up being the design rather
than a limitation.

Reasoning for every decision is in `PLAN.md`, `PLAN-v2.md`, `PLAN-v3.md`, and
`PLAN-breath.md`. The music, the physics, and the protocols all live in JSON
(`system.json`, `field.json`, `embedded.json`, `breath.json`) — edit those and reload,
no code changes.

## Running

All four pages work on a double-click; each embeds a copy of its JSON so `file://`
restrictions don't bite. To edit the JSON live, serve the directory instead:

```
npm start                      # from the repo root, then browse to
                               # localhost:8765/experiments/harmonic-emergence/
```

If a page reports that the audio worklet failed to load, serve it — a few browsers
refuse blob-loaded worklets from `file://`. v3 additionally asks for microphone
permission if you press **start listening**; declining it is fine, the field just runs
without the room. **Breath** asks for nothing at all.

## Keys

In the first three, `a s d f g h j k` are ratios 1/1, 9/8, 5/4, 4/3, 3/2, 5/3, 7/4, 2/1
against the fundamental. In v1 a key fires the passage from that root. In v2 a key
*perturbs* the running field toward that fundamental — it may or may not survive the
jump. In v3 a key is a **context pulse**: it briefly makes the room's voice
unmistakably clear at that pitch, as a stand-in for "the room suddenly plays a clear
tone" — below critical permeability the field ignores it, above it the shared identity
bends toward it.

`esc` stops. In v1 `space` plays at 1/1; in v2 `space` scrambles the phases; v3 has no
`space` binding (see **scramble** and **re-individuate** in its Parameters panel).

**Breath** binds only two, both to the same thing: `esc` and `space` bring you down.
Everything else is a large on-screen target, because the one control that has to work
when your hands have cramped cannot be a small button.

## Verifying

```
node verify.js             # v2: hysteresis, a losable state, melting under
                            # temperature, exact integer ratios once locked
node verify-embedded.js    # v3: segregated-by-default, a genuine threshold, a
                            # one-way door in permeability, context-alignment,
                            # that re-individuate is what actually releases it, and
                            # that the one-way door is a tuning choice rather than
                            # a property of the phenomenon (see PLAN-v3.md §7)
node verify-breath.js      # Breath: segment timing, zero-duration turnarounds,
                            # ramp endpoints, abort from every phase, safety caps,
                            # openness continuity, partial-set critical-band spacing
                            # and pitch stability, level-matching across the A/B sets,
                            # no transients in the rendered audio, the ported drone's
                            # pair arithmetic, a peak budget across all three layers
                            # at full volume, and that the page actually wires the
                            # processor up
node build-breath.js       # re-embeds breath.json + breath-processor.js into
                            # breath.html; run it after editing either, or the page
                            # runs stale code on file:// (verify catches this)
```

Each replicates its audio worklet headlessly and takes under a minute.

Note what `verify-breath.js` does *not* check, deliberately: anything about a person.
It has no sensor and makes no measurement, so the only honest claims are about the cue
itself — the same boundary the other three draw between what the model does and what a
nervous system does.

## Where to start, if you just want to hear the point

**v2:** open `emergence.html`, press **start**, then **sweep K 0 → 4 → 0** and listen.
Around K ≈ 1 an inharmonic cloud collapses into a single fused tone — that is the phase
transition. Then watch it stay locked all the way back down to K = 0, and hit
**scramble phases** while it's there. It will not come back.

**v3:** open `embedded.html`, press **start**, then **sweep Θ 0 → 4 → 0**. Past
Θ ≈ 1.8 three separate harmonic colours collapse into one, panned to centre. Then watch
the trace on the way back down — it does *not* retrace itself. Only **re-individuate**
splits the three apart again.

**Breath:** open `breath.html`, pick **Resonance**, press **start**, and close your
eyes. The tone brightens as you breathe in and darkens as you breathe out; that is the
whole interface. Then try **Ramp test** to hear the two ends the cue has to survive —
a ten-second cycle where every part is slow, accelerating to a 2.4-second circular one
where the turnaround happens twice a second and there are no holds at all.

Three layers, each with its own switch and level: **c** the cue, **b** the pink-noise
breath layer, **d** the steady drone ported from the app. The one worth trying
deliberately is the drone's **pair** with a spread of **0.1 Hz** — two voices that beat
once every ten seconds, which is one beat per breath at 6/min. That is the same trick v1
used to generate its clock, pointed at a breath instead of a passage.

## Before using Breath

Read the safety panel on the page. The short version: never in or near water, lie down
or sit where a faint can't hurt you, and skip it entirely if you're pregnant or have
cardiovascular disease, a seizure history, glaucoma, an aneurysm, uncontrolled
hypertension, panic disorder, or a history of psychosis or bipolar. The shipped
protocols are all slow paced breathing and low risk; the engine can express heavier
ones, and those want another person present.
