# harmonic-emergence

Three standalone experiments. None imports from, modifies, or depends on the app —
they are here to hear an idea, not to become a feature.

| | what it is | open |
|---|---|---|
| **v1 — Ascension** | a fixed 28.5 s passage on the harmonic series of an unsounded 36 Hz fundamental | `index.html` |
| **v2 — Field** | eighteen coupled oscillators that discover the harmonic series themselves, running until you stop them | `emergence.html` |
| **v3 — Embedded** | three mutually segregated harmonic populations whose boundaries dissolve into a shared, room-tracking consensus above a critical permeability | `embedded.html` |

Reasoning for every decision is in `PLAN.md`, `PLAN-v2.md`, and `PLAN-v3.md`. The music
and the physics all live in JSON (`system.json`, `field.json`, `embedded.json`) — edit
those and reload, no code changes.

## Running

All three pages work on a double-click; each embeds a copy of its JSON so `file://`
restrictions don't bite. To edit the JSON live, serve the directory instead:

```
npm start                      # from the repo root, then browse to
                               # localhost:8765/experiments/harmonic-emergence/
```

If a page reports that the audio worklet failed to load, serve it — a few browsers
refuse blob-loaded worklets from `file://`. v3 additionally asks for microphone
permission if you press **start listening**; declining it is fine, the field just runs
without the room.

## Keys

`a s d f g h j k` are ratios 1/1, 9/8, 5/4, 4/3, 3/2, 5/3, 7/4, 2/1 against the
fundamental, in all three. In v1 a key fires the passage from that root. In v2 a key
*perturbs* the running field toward that fundamental — it may or may not survive the
jump. In v3 a key is a **context pulse**: it briefly makes the room's voice
unmistakably clear at that pitch, as a stand-in for "the room suddenly plays a clear
tone" — below critical permeability the field ignores it, above it the shared identity
bends toward it.

`esc` stops. In v1 `space` plays at 1/1; in v2 `space` scrambles the phases; v3 has no
`space` binding (see **scramble** and **re-individuate** in its Parameters panel).

## Verifying

```
node verify.js             # v2: hysteresis, a losable state, melting under
                            # temperature, exact integer ratios once locked
node verify-embedded.js    # v3: segregated-by-default, a genuine threshold, a
                            # one-way door in permeability, context-alignment,
                            # that re-individuate is what actually releases it, and
                            # that the one-way door is a tuning choice rather than
                            # a property of the phenomenon (see PLAN-v3.md §7)
```

Both replicate their audio worklet's dynamics headlessly. Each takes under a minute.

## Where to start, if you just want to hear the point

**v2:** open `emergence.html`, press **start**, then **sweep K 0 → 4 → 0** and listen.
Around K ≈ 1 an inharmonic cloud collapses into a single fused tone — that is the phase
transition. Then watch it stay locked all the way back down to K = 0, and hit
**scramble phases** while it's there. It will not come back.

**v3:** open `embedded.html`, press **start**, then **sweep Θ 0 → 4 → 0**. Past
Θ ≈ 1.8 three separate harmonic colours collapse into one, panned to centre. Then watch
the trace on the way back down — it does *not* retrace itself. Only **re-individuate**
splits the three apart again.
