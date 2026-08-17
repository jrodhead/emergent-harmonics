# Live interval readout

**Built.** The plan below is kept as written, the way
[playing_drone-key.md](playing_drone-key.md) and [playing_sustain-pedal.md](playing_sustain-pedal.md)
keep theirs; see *What was built* at the end for the files and the places the implementation went
its own way.

## The story

As someone holding two or more notes, I want to see the interval between them, so that I can
hear and verify what just intonation is doing.

**Acceptance Criteria:**
1. While two or more notes sound, the interval between them is shown as a ratio.
2. Where it is near a simple ratio, the deviation is shown in cents.
3. The beat rate between them is shown in Hz.

---

## The idea in one line

**The beat rate is the only number on screen the player can check with their ears.**

Everything else the app shows is a claim you have to take on trust. A ratio of `1.4983` is a
fact about arithmetic; `700 cents` is a fact about logarithms. But *"this pair beats one and a
half times a second"* is a prediction about the air in the room, and it is either right or it
is audibly wrong. That is what makes this the story that turns the app's premise from
theoretical into demonstrable — and it is why criterion 3, which reads like the smallest of the
three, is most of the work.

Because the naive beat rate is wrong. Two tones beat at `|f₂ − f₁|` only when they are within
twenty or thirty hertz of each other. A fifth does not beat at 220 Hz; it beats where the lower
tone's third harmonic meets the upper tone's second, which is how a piano tuner sets one:

```
beat = |d·f_high − n·f_low|,  where f_high / f_low ≈ n/d
```

For a near-unison `n/d = 1/1` that collapses to the difference, which is why the naive formula
looks right until you try it on anything else. The general form is the one this story needs,
and it is the same arithmetic the *Stereo drone pair* is waiting on — see that story's table of
four cases, where the trap is exactly this.

---

## Decisions taken

- **The subject is what is *sounding*, not what is *held*.** The ideas page says "pure
  arithmetic over `heldNoteKeys` and `noteKeyMap`", and that is nearly right but would lie in
  three places this app has deliberately built: a note held in hold mode with no root down is
  in `heldNoteKeys` and silent; a note released under the pedal is sounding and in no key set at
  all; and the drone is sounding and belongs to no key by design. A readout that showed the
  first and hid the other two would be wrong about the pedal and the drone, which are two of the
  three things the expressive layer has built so far.

- **So `audioHandler` becomes the source of truth, and remembers each voice's frequency.** It is
  already the only module that knows the full set — `activeOscillators`, `sustainedVoices`,
  `releasingVoices` — and it is already handed every frequency, in `playSound` and again in
  `setSoundFrequency`. It simply does not keep them. One field per voice closes that, and it is
  what makes the pedal and the drone appear for free rather than by each of them reporting in.

- **The target frequency, not the oscillator's instantaneous value.** `oscillator.frequency.value`
  would read mid-glide, which is truer and untestable: it makes every assertion a race. The
  stored target is deterministic, and it is exactly right for a sustained voice, which by the
  pedal's own rule never moves again.

- **Releasing voices are excluded; sustained voices are included.** A voice fading out over a
  two-second release is still audible, but it belongs to a tuning that has gone — the comment in
  `stopSound` says so — and keeping it on screen would leave the readout describing a chord the
  player has let go of. A sustained voice is the opposite: it is being held on purpose,
  indefinitely, at full volume.

- **`audioHandler` notifies through a subscription, not a `CustomEvent`.** Every key module here
  announces itself with an event on `document.body`, and the drone's plan argued for that over
  listener ordering. But `audioHandler` is the one file in `js/` with no reference to `document`
  at all, and its unit tests run in node with no DOM. `subscribeToSounding(listener)` keeps it
  that way, and there is precedent in `systemConfigState.js`'s `subscribe()`, which is the app's
  other module that owns state several screens care about.

- **Redraws are coalesced.** Every strike, stop, glide and level change notifies, so a ten-note
  chord notifies ten times and a fader drag notifies on every step. The readout collects them
  into one `requestAnimationFrame` and draws once. Without this the fader drags that the glide
  and drone work exists to make smooth would each rebuild the readout thirty times a second.

- **Pairs are adjacent, plus the outer one.** Ten notes have forty-five pairs and no player wants
  forty-five rows. Sorted by pitch, the *adjacent* pairs are what a chord is made of — the stack
  of thirds, or whatever it is instead — and the lowest-to-highest pair is the one other interval
  anyone asks about. Two notes give exactly one row, which is criterion 1 read literally.

- **Identical frequencies collapse.** Two voices at the same pitch — a key re-struck under the
  pedal, or the drone in following mode on a root a note key also sounds — do not beat, they
  sum. A row reading `1/1, just, 0 Hz` is not information.

- **The simplest ratio within tolerance, not the closest.** A tempered fifth is `1.49831`. The
  closest ratio under any useful complexity limit is something like `295/197`; the *right*
  answer is `3/2, −2 cents`. So the search walks the continued-fraction convergents from the
  simplest upward and takes the first one within tolerance, rather than the best one it can
  find. This is the whole of criterion 2, and getting it backwards produces a readout that is
  arithmetically flawless and musically useless.

- **Intervals are not folded into a period.** A tenth reads `5/2`, not `5/4`. The readout
  describes the interval that is sounding, and an octave-and-a-third is not a third — it beats
  differently, which is the point.

- **It lives in `#keys`, with the other indicator rows**, so `body[data-view="config"] #keys`
  hides it on the configuration screen for free, exactly as it does the play mode, the pedal and
  the drone.

---

## Design

### 1. The arithmetic — `js/system/interval.js` (new)

Pure and DOM-free, unit-testable on its own like
[droneFrequency.js](../../js/system/droneFrequency.js) and
[buildNoteKeyMap.js](../../js/keys/buildNoteKeyMap.js). This is the half of the story with all
the risk in it, and it is written and tested before anything is drawn.

```js
// Every common just interval fits inside a denominator of 16 — 9/8, 6/5, 5/4,
// 4/3, 7/5, 3/2, 8/5, 5/3, 7/4, 16/9, 15/8. Past that the "name" stops being a
// name and becomes a restatement of the decimal.
export const MAX_RATIO_DENOMINATOR = 16;

// A quartertone. Wide enough that every interval a player reaches for gets a
// name, narrow enough that the name is never a different interval.
export const NAMING_TOLERANCE_CENTS = 25;

// Above this a beat stops being heard as a beat and becomes roughness, and
// then a tone of its own.
export const MAX_AUDIBLE_BEAT_HZ = 20;

// A beat between the eighth partial and something above it is real arithmetic
// and inaudible sound: those partials are far too quiet to hear beating.
export const MAX_BEATING_PARTIAL = 8;
```

**`centsBetween(lower, upper)`** — `1200 · log₂(upper / lower)`. `describeRatio` in
[format.js](../../js/format.js) already does this against the root and rounds to a whole
number; this one does not round, because a two-cent deviation is the answer to criterion 2 and
rounding is the display's job.

**`nearestSimpleRatio(ratio, { maxDenominator, toleranceCents } = {})`**

```js
/**
 * The simplest ratio the interval can honestly be called, and how far from it
 * the interval actually is.
 *
 * Walks the continued-fraction convergents of the ratio from the simplest
 * upward and returns the first one inside the tolerance, rather than the
 * closest one it can find: a tempered fifth is a fifth two cents narrow, not
 * 295/197 exactly.
 *
 * @returns {{numerator, denominator, deviationCents}|null} null when nothing
 *   simple enough is near enough, which is an honest answer for an interval
 *   that has no name.
 */
```

- Guards non-finite, zero and negative ratios, and ratios below 1 (the caller always passes
  high over low; a guard rather than a silent inversion, so a caller that has them backwards
  fails loudly).
- Convergents are generated from the standard recurrence and each is tested in turn, so the
  first hit is by construction the simplest. The walk stops at `maxDenominator`.

**`beatRate(lower, upper, numerator, denominator)`** — `|denominator · upper − numerator · lower|`,
with the doc comment carrying the derivation above, because the naive version is the thing a
later reader will "fix" it back to.

**`describeInterval(lower, upper, options)`** — the one function the UI calls, returning
everything a row needs:

```js
{
  ratio,                 // upper / lower
  cents,                 // unrounded
  simple: { numerator, denominator, deviationCents } | null,
  beatHz,                // between the coinciding partials, null when there is no simple ratio
  partials: { lower, upper },   // which harmonics coincide: n of the lower, d of the upper
  fundamentalsHz,        // |upper − lower|, the direct beat
  audible: { beat, roughness }, // see below
}
```

Two flags rather than one, because there are two ways a pair of tones can beat and this readout
has to tell them apart or it teaches the wrong lesson:

- **`beat`** — false when `partials.lower > MAX_BEATING_PARTIAL`, and false on a sine for
  anything but a unison, since a sine has no upper partials to coincide. The wave shape is read
  by the caller and passed in, not reached for here.
- **`roughness`** — true when `fundamentalsHz < MAX_AUDIBLE_BEAT_HZ`. This is the case the
  partial arithmetic misses entirely: two low notes a just `16/15` apart have a beat rate of
  exactly zero between their coinciding partials and are audibly rough anyway, because their
  *fundamentals* are four hertz apart. Both numbers are reported; neither is the whole truth.

### 2. What is sounding — [js/audio/audioHandler.js](../../js/audio/audioHandler.js)

Four small changes and one new export. The voice record gains two fields:

```js
activeOscillators[key] = { oscillator, gainNode, key, frequency };
```

- **`key`** so a voice keeps its name after `sustainVoice` detaches it from `activeOscillators`
  — today the key is deleted and the name is lost, which would leave a pedalled note in the
  readout with nothing to label it.
- **`frequency`** set in `playSound` and updated in `setSoundFrequency`, which are the only two
  places a voice's pitch is ever decided.

```js
/**
 * Every voice that is sounding and still means something: what is being held,
 * and what the pedal is holding on to. Voices in their release are left out —
 * they belong to the tuning they were released in and the player has let go of
 * them.
 *
 * @returns {Array} { key, frequency, sustained }, in no particular order.
 */
export function soundingVoices() { … }

/**
 * Registers a listener for changes to that set. A subscription rather than an
 * event on document.body, which is what every key module uses, because this is
 * the one module here with no DOM in it and its unit tests run without one.
 *
 * @returns {Function} Unsubscribes.
 */
export function subscribeToSounding(listener) { … }
```

`notify()` is called at the end of `playSound`, `setSoundFrequency`, `stopSound`, `sustainVoice`,
`releaseSustainedVoices` and `stopAllSounds` — every mutator, with none left out, which is the
property the unit tests below check one by one. It is deliberately *not* called from
`setSoundVolume`: how loud a voice is does not change what interval it is in.

**This is the real architectural change in the story.** `audioHandler` stops being only a thing
that makes sounds and becomes the app's model of what is currently sounding. That is a promotion
worth reviewing as such rather than as a bit of the readout — see *Consequences*.

### 3. The display — `js/keys/renderIntervalReadout.js` (new)

Markup only, taking a list of rows, in the shape of
[renderNoteKeyTable.js](../../js/keys/renderNoteKeyTable.js).

```html
<div id="intervalReadout">
  <h2>Intervals</h2>
  <div class="interval-row">
    <span class="interval-keys">q · e</span>
    <span class="interval-ratio">3/2</span>
    <span class="interval-cents">−2 cents</span>
    <span class="interval-beat">1.5 Hz</span>
    <span class="interval-partials">3rd × 2nd partial</span>
  </div>
  …
</div>
```

- Fewer than two voices: one quiet line, `Hold two notes to see the interval between them.`
  Criterion 1 is *while two or more sound*, and an empty box says nothing about why.
- No simple ratio within tolerance: the ratio and the cents, and `no simple ratio` where the
  fraction goes. The beat cell reads `—`, since without a ratio there is no pair of partials to
  beat between.
- `audible.beat` false: the beat is shown struck through, or greyed, with the reason in a
  `title` — *"a sine has no upper partials to beat with"* or *"between partials too high to
  hear"*. Shown rather than hidden, because the number is real and the player who switches to a
  sawtooth wants to watch it become audible.
- `audible.roughness` true: an extra cell, `fundamentals 4 Hz apart`.
- The drone's voices are labelled `drone`; note keys are labelled with their key. A sustained
  voice keeps its key and is marked — `q (pedal)` — because a player looking at a five-row
  readout needs to know which two of those notes their fingers are still on.
- Rows are capped at twelve, with `+ n more` when there are more. Thirty note keys and a drone
  are reachable and would otherwise push the keyboard off the screen.

New formatters in [format.js](../../js/format.js), beside the four already there:

- **`formatCents(cents)`** — `just` at zero, otherwise `+2 cents` / `−2 cents` with the same
  Unicode minus `formatDegree` already uses, rounded to a whole cent.
- **`formatBeat(hz)`** — two decimals under 10 Hz, one above, because 0.75 Hz and 12 Hz want
  different precision and a fixed one is wrong at one end or the other.
- **`formatPartial(n)`** — `1st`, `2nd`, `3rd`, `4th`.

### 4. The wiring — `js/keys/intervalReadout.js` (new)

Small, following [droneHandler.js](../../js/keys/droneHandler.js): subscribe, gather, draw.

- **`subscribeToSounding`** with a handler that sets a dirty flag and schedules one
  `requestAnimationFrame`, so a chord and a fader drag each draw once.
- **`rows()`** — take `soundingVoices()`, drop non-finite frequencies, sort ascending, collapse
  equal frequencies, then pair: each adjacent pair, and the outer pair when there are three or
  more. Each pair goes through `describeInterval` with the current wave shape from
  `#waveShape`.
- **Nothing else.** No key handling, no `noteKeyMapChanged`, no `rootReleased`, no `pedalUp`
  listener. Every one of those events ends in a call to `playSound`, `stopSound`,
  `setSoundFrequency` or `releaseSustainedVoices`, so the subscription has already covered them.
  That is the argument for putting the seam in the audio layer rather than in five key handlers,
  and the browser tests below are what prove it — each of them exercises a path this module has
  no code for.

Wired in [index.html](../../index.html) after `droneHandler.js`.

### 5. The markup and the styling — [index.html](../../index.html), [css/styles.css](../../css/styles.css)

`<div id="intervalReadout"></div>` in `#keys` after `#droneTable`. `#keys` is a two-column grid,
so the readout takes `grid-column: 1 / -1` and lays its rows out as a small grid of its own,
joining the `#playModeTable, #sustainPedalTable, #droneTable` colour rule. Monospace numerals
(`font-variant-numeric: tabular-nums`) so a beat rate sliding under a glide does not make the
column jump.

---

## Tests

**Unit — `test/unit/interval.test.js`** (new). The bulk of the testing, since the bulk of the
risk is arithmetic.

1. A just fifth, `440` and `660`: ratio `1.5`, `3/2`, `0` cents deviation, beat `0`, partials
   3rd and 2nd.
2. A fifth two cents narrow, `440` and `659.255`: still `3/2`, deviation ≈ `−1.96` cents, beat
   ≈ `1.49` Hz. **The headline case** — it is the equal-tempered fifth, and 1.5 Hz is the number
   a player can count.
3. A fifth *widened by one hertz*, `440` and `661`: beat exactly `2` Hz — `|2·661 − 3·440|` —
   which is the check that the beat is a multiple of the offset and not the offset itself.
4. A near-unison, `440` and `444`: `1/1`, deviation ≈ `+15.7` cents, beat `4` Hz. The case the
   naive formula gets right, kept so it stays right.
5. Simplest-within-tolerance, not closest: `1.49831` returns `3/2` and not a large exact
   fraction; `1.0125` (a syntonic comma, exactly `81/80`) returns `1/1` with a `+21.5` cent
   deviation, because a denominator of 80 is past the limit.
6. An interval with no simple name returns `null` and no beat: an interval a few cents off a
   quartertone, checked at both the tolerance limit and just inside it.
7. A tritone `√2` returns `7/5, +17 cents` — the case that shows what the tolerance buys and
   what it costs, and the test to look at first if the tolerance is ever changed.
8. Intervals wider than a period: `2.5` returns `5/2`, not `5/4`.
9. `audible.beat` is false for a sine on anything but a unison, true for a sawtooth fifth, and
   false when the coinciding partial is past the eighth.
10. `audible.roughness`: two low notes a just `16/15` apart have a partial beat of `0` and a
    fundamental difference of `4` Hz, and the flag is set. **The case a partials-only readout
    gets silently wrong.**
11. Degenerate input — zero, negative, `NaN`, equal frequencies, and an upper below the lower —
    returns something the display can render, and the inverted pair is logged rather than
    silently flipped.

**Unit — [test/unit/audioHandler.test.js](../../test/unit/audioHandler.test.js)**, against the
existing `FakeAudioContext`

12. `soundingVoices` lists a struck voice with its key and frequency; a glided one reports the
    frequency it was glided to; a stopped one is gone the instant its key is freed, while it is
    still fading.
13. A sustained voice stays listed, keeps its key, and is flagged `sustained`; lifting the pedal
    drops all of them.
14. `stopAllSounds` empties it.
15. `subscribeToSounding` fires for each of the six mutators, once each, and **not** for
    `setSoundVolume`; the returned function unsubscribes.

**Unit — [test/unit/format.test.js](../../test/unit/format.test.js)**

16. `formatCents` reads `just` at zero, uses the Unicode minus, and rounds to whole cents;
    `formatBeat` switches precision at 10 Hz; `formatPartial` handles 1–4 and past 4.

**Browser — `test/browser/intervalReadout.test.js`** (new), modelled on
[drone.test.js](../../test/browser/drone.test.js). Each of these exercises a path
`intervalReadout.js` contains no code for, which is the point of them.

17. One note held: the prompt, and no rows.
18. Two note keys a fifth apart in a just preset: one row, with the ratio, `just`, and a beat of
    `0`.
19. Two keys in the equal temperament preset: `3/2` with a deviation of a couple of cents and a
    non-zero beat — the demonstration the whole story exists for, asserted end to end.
20. Three keys: two adjacent rows and the outer row, in pitch order regardless of the order they
    were pressed in.
21. **A root change.** Hold two keys, press root `4`: the rows update to the new tuning. In a
    preset whose roots are transpositions the ratio is unchanged and the beat rate is not, which
    is a fact about just intonation this readout now shows.
22. **The register keys.** `↑` leaves every ratio unchanged and doubles every beat rate.
23. **The pedal.** Two keys struck, one released under the pedal: the row survives and the
    released voice is marked. Lift the pedal and the row goes.
24. **The drone.** `` ` `` with one note held gives a row against `drone`; `~` into following
    mode and a root change moves it. **The drone alone, with no note keys, gives no rows** —
    one voice is not an interval.
25. **Hold mode.** Two note keys down with no root held: no rows, because nothing is sounding.
    Press a root and both rows appear. This is the case `heldNoteKeys` alone would get wrong.
26. `Escape` clears it to the prompt; so does switching to the configuration view, and the view
    hides it either way.
27. Ten keys and a drone: no more than twelve rows, and the overflow count is right.
28. A chord of six struck in one burst draws once — asserted by counting redraws through a
    wrapped `requestAnimationFrame`, the coalescing claim made checkable.

Then the full suite: `npm test`. [drone.test.js](../../test/browser/drone.test.js),
[sustain.test.js](../../test/browser/sustain.test.js),
[playMode.test.js](../../test/browser/playMode.test.js),
[glide.test.js](../../test/browser/glide.test.js) and
[envelope.test.js](../../test/browser/envelope.test.js) should pass untouched — the readout
observes and changes nothing, so if any of them moves, it has grown a side effect.

---

## Order of work

Four steps, each of which leaves the app working:

1. **`interval.js` and its tests.** Pure, no UI, no wiring — all the arithmetic risk, resolved
   before anything depends on it.
2. **`audioHandler`'s two fields, `soundingVoices`, `subscribeToSounding`, and their tests.**
   Nothing consumes them yet; the app is unchanged.
3. **The render, the wiring, the markup, the styling, and the browser tests.** The first step
   the player can see.
4. **The documentation.**

---

## Documentation

[README.md](../../README.md): a paragraph in *Playing the system*, after the drone's, on what
the readout shows and — the part that matters — **which of the three numbers you can actually
hear, and when**: the beat between partials needs a wave with partials, the roughness number
needs the two fundamentals close together, and a sine gives you neither unless you are near a
unison. The code layout gains `js/system/interval.js`, `js/keys/intervalReadout.js` and
`js/keys/renderIntervalReadout.js`, and the audio handler's line gains "and what is sounding".

[playability-ideas.md](../playability-ideas.md): strike the *Live interval readout* section
when this is built, and repoint *Suggested order* at *Stereo drone pair* — the same edit the
pedal and the drone got. The *Stereo drone pair* note that says it "wants *Live interval readout*
first" becomes a statement that its criterion 4 is this readout pointed at two voices.

---

## What was built

| File | What changed |
| --- | --- |
| [js/system/interval.js](../../js/system/interval.js) | New — the arithmetic, pure and DOM-free |
| [js/audio/audioHandler.js](../../js/audio/audioHandler.js) | `key` and `frequency` on each voice, `soundingVoices`, `subscribeToSounding`, and a notify from all six mutators |
| [js/format.js](../../js/format.js) | `formatCents`, `formatBeat`, `formatPartial` |
| [js/keys/renderIntervalReadout.js](../../js/keys/renderIntervalReadout.js) | New — the markup, including why an inaudible beat is inaudible |
| [js/keys/intervalReadout.js](../../js/keys/intervalReadout.js) | New — the subscription, the pairing, and the coalesced redraw |
| [index.html](../../index.html), [css/styles.css](../../css/styles.css) | The readout row and its styling, and the script tag |
| [test/unit/interval.test.js](../../test/unit/interval.test.js) | New — 27 tests |
| [test/unit/audioHandler.test.js](../../test/unit/audioHandler.test.js) | 15 tests for the two new exports and the notify |
| [test/unit/format.test.js](../../test/unit/format.test.js) | 15 tests for the three formatters |
| [test/browser/intervalReadout.test.js](../../test/browser/intervalReadout.test.js) | New — 19 tests |
| [README.md](../../README.md) | The readout section, and the code layout |

Four departures from the plan above:

- **The decimal ratio got a cell of its own**, rather than sharing one with the fraction. §3 wrote
  the fraction and the cents and left the decimal implied; criterion 1 asks for the interval *as a
  ratio*, and an interval with no simple name has nothing else to show. Both are always there:
  `3/2` beside `1.4983`.
- **The cents cell says which cents it means, on hover.** The size of an interval and its distance
  from the ratio it is being called are both cents and are not the same claim. With a simple ratio
  the cell is the deviation; without one it is the size. Only the `title` tells them apart, which
  is thin — see *Consequences*.
- **The wave shape gets a listener after all.** §4 said "nothing else", meaning no *sounding*
  events, and that held. But the shape decides whether the beat on screen is one the player could
  hear, and without a redraw the struck-through beat stays struck through after switching to a
  sawtooth until the next keypress — which is precisely the demonstration the display was written
  to invite.
- **The tolerance boundary is tested either side rather than on it.** A 25-cent deviation computes
  as 25.000000000000004 and falls outside a `<= 25` check. That is a fact about floating point
  rather than about what should be named, so the test asserts at 24 and 26 cents.

582 tests pass. [drone.test.js](../../test/browser/drone.test.js),
[sustain.test.js](../../test/browser/sustain.test.js),
[playMode.test.js](../../test/browser/playMode.test.js),
[glide.test.js](../../test/browser/glide.test.js) and
[envelope.test.js](../../test/browser/envelope.test.js) were not touched and still pass, which is
the check that the readout only watches.

---

## Consequences and risks

- **`audioHandler` is now a model, not just a player.** It holds the frequency of every voice and
  publishes the set. That is a genuine change in what the module is for, and it is arriving
  through the door of a display feature — the same shape of thing the drone's plan flagged about
  `setSoundVolume`. It is the right home, but review it as a piece of the audio layer, because
  the *Consonance meter* and the *Stereo drone pair* will both read from it next.

- **The readout jumps where the notes glide.** It shows the frequency each voice is heading for,
  so a modulation snaps the numbers to their destination while the sound takes the glide time to
  get there. For a 500 ms glide that is visible and slightly dishonest. Animating it is
  possible — `oscillator.frequency.value` reads mid-glide — and is deliberately not in this
  story, because it would make every assertion in section *Tests* a race. Watch it in play
  testing; if it grates, the fix is an animated readout over a stored *target*, not a change to
  what is stored.

- **A ratio name is a claim, and a wrong one is worse than none.** `7/5, +17 cents` for a
  tritone is defensible; someone will still disagree with it. The tolerance and the denominator
  limit are the two dials, they are exported constants with the reasoning attached, and test 7
  exists to be looked at when either moves.

- **A fast beat is still shown as a beat, and past about 20 Hz it is not one.** Found by playing
  it rather than by testing it: an equal-tempered minor third reads `29.4 Hz`, and that is not a
  rate anybody counts — it is roughness, and a little above it a difference tone. `MAX_AUDIBLE_BEAT_HZ`
  exists and says exactly this in its comment, but §1 only wired it to the *roughness* flag on the
  fundamentals, never to `audible.beat`. So the readout marks a beat inaudible when the partials
  are too high or the wave is a sine, and not when the number is simply too fast. One condition on
  `beatIsAudible` closes it. Deliberately left as the plan specified it rather than fixed in
  passing, because where the beat/roughness line sits is a judgement worth making on purpose.

- **The beat rate is arithmetic about partials, and partials are a property of the wave shape the
  app does not really control.** A "sawtooth" in Web Audio has partials; how loud the eighth one
  is at listening volume is another matter. `MAX_BEATING_PARTIAL` is a judgement, not a
  measurement, and the honest position is the one the display takes: show the number, say what
  it depends on.

- **Two kinds of cents share one column.** The deviation from a named ratio and the size of an
  unnamed interval are both written `N cents` in the same cell, and only the `title` says which.
  Nobody hovers. If it confuses anyone the fix is a word in the cell rather than a tooltip.

- **The keyboard is about to get taller.** Twelve rows under thirty note keys is a lot of
  screen, and the cap is a lie of omission on a big chord. If it crowds the keys the answer is
  probably to show the outer interval plus the adjacent pairs of the *lowest four* voices, not
  to shrink the type.

- **It watches; it does not touch.** No existing behaviour changes, which is what makes this a
  safe story to build and also what makes the untouched-test assertion above meaningful.

---

## Room left

- **The *Consonance meter*** reads exactly this set of voices and this set of pairs, and wants a
  measure over them rather than a row each. It is the natural next thing this module grows.
- **Criterion 4 of the *Stereo drone pair*** is `describeInterval` pointed at two drone voices
  instead of the keyboard — each voice's frequency, the difference between them, and the beat
  that difference produces. That story should not write any arithmetic of its own.
- **A difference-tone readout.** `|f₂ − f₁|` above about 20 Hz stops being a beat and becomes a
  pitch, which is the other half of the same number and audible on a loud low interval.
- **Logging what was held.** The set of sounding voices, now that something publishes it, is one
  step from a record of what was played.
