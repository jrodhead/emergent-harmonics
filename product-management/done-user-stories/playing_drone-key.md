# Drone key

**Built.** The plan below is kept as written, the way
[playing_sustain-pedal.md](playing_sustain-pedal.md) keeps its own; see *What was built* at the
end for the files and the places the implementation went its own way.

## The story

As someone playing in just intonation, I want to hold the fundamental indefinitely, so that the
intervals I play have an audible reference.

**Acceptance Criteria:**
1. A key sustains the current fundamental until it is turned off.
2. The drone survives note and register changes.
3. Its behaviour on a root change is defined — either following the new root or staying put, by
   choice.
4. The pitch it sounds at is configurable, and remembered between visits.
5. Its level is configurable, separately from the note keys, and takes effect while it sounds.

Criteria 4 and 5 are new to this plan. The drone's register is the one thing about it that no
default gets right for everyone, because it depends on the configured root frequency and on the
register the player's hands are in. Its level is the same argument one step further: a reference
is only a reference while it sits *under* what it is a reference for, and where that is depends
on the waveform, the register and the number of notes above it.

---

## The idea in one line

**Every other voice in the app belongs to a key. The drone belongs to the system.**

That is the whole design, and it is why this is small. `activeOscillators` is keyed by string,
and nothing but `stopAllSounds` ever iterates it — `heldNoteKeys`, `rootReleased`,
`noteKeyMapChanged` and the pedal all work through the *held key* sets, not through the voices.
So a voice stored under the key `'drone'` is invisible to every playing rule the app already has:

| Rule | Reaches the drone? | Why |
| --- | --- | --- |
| `rootReleased` (hold mode) | no | iterates `heldNoteKeys`; the drone is not in it |
| `noteKeyMapChanged` (root, register) | no | same set |
| The sustain pedal | no | `sustainVoice` only moves what a key handed it |
| `stopAllSounds` (panic, view change) | **yes** | which is exactly right |

Criterion 2 therefore costs nothing to implement and everything to *test*: it is a claim about
what does not happen, and the tests below are what stop a later change to `noteKeyMapChanged`
quietly breaking it.

---

## Decisions taken

- **The drone key is `` ` ``, and it latches.** Free today, bottom-left under the left pinky,
  next to the root keys it is a reference for. Criterion 1 says *until it is turned off*, which
  is a toggle: a drone you have to keep holding costs a finger for as long as you want the
  reference, which is the whole time.
- **`~` cycles the root behaviour** — `anchored` (the default) and `following`. `~` *is*
  Shift+`` ` `` as far as `KeyboardEvent.key` is concerned, so this is one key, shifted, and the
  handler reads `ev.key` like every other handler here rather than reaching for `ev.code`.
- **Anchored means the system's fundamental, not root key 0.** `getConfig().primaryRootFrequency`
  is by definition the frequency every ratio in the system is measured from — the code comment on
  `generateRootNotes` says so. In every shipped preset the first degree is `1/1` and root key `0`
  sounds that same pitch, but a configuration whose first note is not `1/1` should still drone on
  the thing its ratios are *about*.
- **The drone is not a note key.** Hold mode does not gate it, the pedal does not hold it, and
  lifting the pedal does not release it. It sounds when it is on, in any play mode, with no root
  or note key held.
- **The drone has its own level, and it is absolute rather than a fraction of the oscillator
  volume.** Two faders that multiply are two faders nobody can predict, and the oscillator volume
  is read at strike time — a drone whose level was a percentage of it would not move until the
  drone was switched off and on again.
- **Moving that fader is heard immediately.** Every other voice in the app takes its volume when
  it is struck and keeps it, which is fine for notes because striking one again is a keypress
  away. The drone is the one voice that is already sounding when you reach for the fader, and it
  may have been sounding for minutes. This is the one place the story reaches into the audio
  layer, and it is what §1 below is for.
- **`Escape` turns it off, not just silent.** A deliberate difference from the pedal, whose plan
  argues that panic stops the sound but does not lift your foot. The pedal can say that because
  `Space` is still physically down and its keyup is coming. A toggle has no such key: leaving the
  flag on after a panic makes the next `` ` `` press a silent no-op, which reads as a broken key.
- **Play view only**, via `shouldIgnoreKeyEvent`, like every other playing key.

---

## Design

### 1. Re-levelling a sounding voice — [js/audio/audioHandler.js](../../js/audio/audioHandler.js)

The exact mirror of `setSoundFrequency`, which is already there and already documented as the
thing that lets a fader be dragged while the note it moves is being listened to. That file can
retune a voice and it can end one; it cannot yet change how loud one is.

```js
/**
 * Changes how loud a voice already sounding is, so a level can be moved while
 * it is being listened to. Does nothing if that key is not sounding.
 *
 * @param {number} [timeConstant] - How slowly to get there, in seconds. Zero
 *   arrives immediately, which on a gain is a click.
 */
export function setSoundVolume(key, volume, timeConstant = DRAG_GLIDE_TIME_CONSTANT) { … }
```

- Guards a missing voice and a non-finite volume, exactly as `setSoundFrequency` does.
- **Freezes the gain where it has actually got to before moving it** —
  `cancelScheduledValues` / `setValueAtTime(gainNode.gain.value)` / `setTargetAtTime` — the same
  three lines `releaseVoice` uses, and for the same reason. Without the freeze, a level change
  during the attack fights the attack's `linearRampToValueAtTime`, which is still in the timeline
  and would drag the voice back to its old target. With it, the fader simply takes over.
- Only ever called on a voice in `activeOscillators`, so it cannot cancel a release that is
  already under way.

This is a general capability, not a drone one: it is what *Accent and dynamics* on the ideas page
will want, and it is what a live master volume would want. The drone is just the first voice with
a reason to need it.

### 2. The pitch — `js/system/droneFrequency.js` (new)

Pure and DOM-free, so it can be unit tested on its own like
[buildNoteKeyMap.js](../../js/keys/buildNoteKeyMap.js).

```js
/**
 * The pitch a drone sounds at: its anchor moved by a number of periods, pulled
 * back toward the anchor while that lands outside the audible range — a
 * reference that cannot be heard is not a reference.
 *
 * @returns {number|null} The frequency, or null when even the anchor is out of range.
 */
export function droneFrequency(anchorFrequency, periodShift, {
  minFrequency = MIN_AUDIBLE_FREQUENCY,
  maxFrequency = MAX_AUDIBLE_FREQUENCY,
} = {}) { … }
```

- Walks `periodShift` one period at a time **toward zero** until the frequency is inside the
  range, so a −3 drone under a low root lands on −2 or −1 rather than falling silent.
- Returns `null` for a non-finite or non-positive anchor, and when the anchor itself is outside
  the audible range. The caller declines to start rather than handing `NaN` to an oscillator,
  which is the existing habit in `playSound`.
- Uses `periodMultiplier` from [period.js](../../js/system/period.js), so a system whose
  period is not an octave drones by *its* period. Nothing here says "octave".

### 3. The two controls — [playSettings.js](../../js/config/playSettings.js) and its handler

The drone's register and level are how the keyboard plays, not what it plays, so they belong in
`playSettings` beside the attack, release and glide — persisted, and deliberately outside the
exported musical system.

```js
export const DEFAULT_DRONE_PERIOD_SHIFT = -1;   // under the hands, not in among them
export const MIN_DRONE_PERIOD_SHIFT = -3;
export const MAX_DRONE_PERIOD_SHIFT = 1;

// Below the 0.5 the note keys default to, because a reference that competes
// with the notes is not being used as a reference.
export const DEFAULT_DRONE_VOLUME = 0.3;
export const MAX_DRONE_VOLUME = 1;
```

- `getDronePeriodShift` / `setDronePeriodShift` and `getDroneVolume` / `setDroneVolume`, restored
  field by field in `loadStoredPlaySettings` alongside the existing three, so a settings blob
  written before either control existed still restores everything it does know about.
- `setSetting` currently clamps to `0…maximum`. It gains an optional minimum, defaulting to 0 so
  the four other controls are untouched. The period shift is rounded **by its own setter** rather
  than inside `setSetting` — it is the only integer here, and the level would be ruined by it.
- **`playSettingsHandler`**: `CONTROLS` entries gain an optional `format`, defaulting to
  ``(value) => `${value} ms` `` so the three existing rows are unchanged. The period row formats
  as `at the root`, `1 period below`, `2 periods below`, `1 period above`; the level row as a
  bare number, like the oscillator volume beside it.
- The input handler dispatches `playSettingChanged` on `document.body`, with the setting's name in
  `detail`, after it sets the value. That is the seam the drone retunes and re-levels on; without
  it the drone would have to add a second `input` listener to each element and depend on the two
  firing in registration order.

In [index.html](../../index.html), beside the other three:

```html
<div class="form-group">
  <label for="dronePeriod">Drone pitch:</label>
  <input type="range" id="dronePeriod" min="-3" max="1" step="1" value="-1">
  <output for="dronePeriod" id="dronePeriodOutput">1 period below</output>
</div>
<div class="form-group">
  <label for="droneVolume">Drone level:</label>
  <input type="range" id="droneVolume" min="0" max="1" step="0.01" value="0.3">
  <output for="droneVolume" id="droneVolumeOutput">0.3</output>
</div>
```

### 4. The key — `js/keys/droneHandler.js` (new)

Follows [sustainPedalHandler.js](../../js/keys/sustainPedalHandler.js): guard, flip state,
redraw the indicator. Two differences, both deliberate:

- **No separate state module.** `sustainPedalState.js` exists because `noteKeyHandler` reads
  `pedalDown` and the two would otherwise import each other. Nothing reads the drone's state, so
  splitting it would be a module with no second reader.
- **No `CustomEvent`.** Same reason — the pedal dispatched because the note keys had to react.
  The drone's only outside callers want a function, and they get `stopDrone()`.

```js
// A drone is a list of voices, and today the list has one entry. Written this
// way because the next story on it is a second voice a configured distance
// away, panned into the other ear — see "Room left" below. The voice keys
// cannot collide with a note key, which is always a single character.
const DRONE_VOICES = [{ id: 'drone-1' }];

let droneOn = false;
let droneMode = 'anchored';    // 'anchored' | 'following'
const soundingFrequencies = new Map();  // voice id → what it was last asked for
```

Every function below maps over `DRONE_VOICES`. With one entry that reads as ceremony; it is the
difference between adding a voice later and restructuring for one.

- **`anchorFrequency()`** — `getConfig().primaryRootFrequency` when anchored,
  `rootNotes[currentRootIndex]?.frequency` when following. Both are live bindings already; no new
  state. It is deliberately the *anchor*, not the pitch: what each voice sounds is the anchor put
  through `droneFrequency`, which is where a per-voice offset will one day go in.
- **`startDrone()`** — resolve the frequency, bail (and log) on `null`, then `playSound(frequency,
  DRONE_VOICE, getDroneVolume(), waveShape, attackTime())`. The wave shape is the shared one; the
  level is the drone's own. The attack matters more here than anywhere else: a drone that snaps on
  is the longest-lived click in the app.
- **`stopDrone()`** — exported. `stopSound(DRONE_VOICE, releaseTime())`, clear the flag and
  `soundingFrequency`, redraw. Safe to call when the drone is already off.
- **`retuneDrone()`** — recompute; return if it matches `soundingFrequency`, else
  `setSoundFrequency(DRONE_VOICE, frequency, glideTimeConstant())` and remember it. **The equality
  check is what makes anchored mode provably still**: the drone recomputes on every root and
  register change and simply finds the same number, so it schedules nothing at all.
- **`relevelDrone()`** — `setSoundVolume(DRONE_VOICE, getDroneVolume())` when the drone is on.
  No equality check needed: it is only called from `playSettingChanged`, which means the fader
  moved. Uses the default time constant rather than the glide, because a level is not a pitch and
  should not inherit a 500 ms glide setting; it wants only enough smoothing not to click.
- **keydown `` ` ``** — `ev.repeat` and `shouldIgnoreKeyEvent` guards, then toggle.
- **keydown `~`** — same guards, cycle the mode, redraw, and `retuneDrone()`. Switching to
  following while a drone sounds glides it onto the current root; switching back glides it home.
  That is the honest reading of a mode switch, and it is one call.
- **`noteKeyMapChanged`** — `retuneDrone()`. This is criterion 3's *following*, and it reuses the
  event the note keys already glide on rather than adding a `rootChanged` one. It fires on
  register changes too, where the drone's frequency has not moved, so the equality check turns
  those into no-ops — which is criterion 2, for free.
- **`playSettingChanged`** — `retuneDrone()` or `relevelDrone()` by name. Dragging either drone
  fader moves the sounding drone under the pointer, which is the same thing the configuration
  screen's faders already do to a previewed note.
- **`window` `blur`** — nothing. Unlike the pedal, no keyup is being waited for; a drone should
  survive alt-tabbing away, which is most of what a drone is for.

Wired in `index.html` after the other key handlers.

### 5. The two panics — [escapeKeyHandler.js](../../js/keys/escapeKeyHandler.js), [viewToggle.js](../../js/config/viewToggle.js)

Both call `stopDrone()` **before** `stopAllSounds()`, exactly as `viewToggle` calls `liftPedal()`
first: the drone hands its voice back and clears its own state, then the panic kills whatever is
still scheduled. On `Escape` that means the release `stopDrone` scheduled is cancelled a moment
later and the drone stops dead, which is what panic means.

### 6. The indicator — [index.html](../../index.html), [css/styles.css](../../css/styles.css)

A row in `#keys` beside the pedal's:

```html
<div id="droneTable">Drone: <span id="drone">off</span>, <span id="droneMode">anchored</span> (` to toggle, ~ to switch)</div>
```

Two spans so the tests can assert on the state and the mode separately. `#droneTable` joins the
`#playModeTable, #sustainPedalTable` rule, and takes the existing `.active` class while the drone
sounds. The player needs to see this for the same reason they need to see the play mode and the
pedal: it changes what the next keypress means — and unlike those two, it is also the only voice
on the keyboard with no lit key of its own.

---

## Tests

**Unit — [audioHandler.test.js](../../test/unit/audioHandler.test.js)**, against the existing
`FakeAudioContext`

1. `setSoundVolume` freezes the gain at its current value and moves it toward the new one over the
   time constant, leaving the oscillator running.
2. Called during an attack, it cancels the attack's ramp rather than being overtaken by it.
3. A voice re-levelled and then released still freezes and fades from wherever it had got to.
4. A no-op for a key with no voice, and for a non-finite volume, which it logs.

**Unit — `test/unit/droneFrequency.test.js`** (new)

1. A shift of −1 halves the anchor (or divides by `PERIOD_RATIO`, generally); +1 multiplies it.
2. A shift of 0 returns the anchor unchanged.
3. A shift that lands below `MIN_AUDIBLE_FREQUENCY` walks back toward the anchor and returns the
   deepest audible period, not silence.
4. A shift above `MAX_AUDIBLE_FREQUENCY` does the same downward.
5. An anchor that is itself out of range, `NaN`, zero or negative returns `null`.

**Unit — [playSettings.test.js](../../test/unit/playSettings.test.js)**

6. The period shift defaults to −1; the setter clamps to −3…1 and rounds; a non-finite value is
   ignored.
7. The level defaults to 0.3, clamps to 0…1, and is *not* rounded — the check that the integer
   rounding stayed with the period shift.
8. Both round-trip through storage, and a stored blob with neither still restores the other three.

**The recorder — [test/helpers/recordAudio.js](../../test/helpers/recordAudio.js)**

It wraps `gain.setValueAtTime` and `gain.linearRampToValueAtTime` and files anything ramped after
the oscillator started as `sound.release`. A level change is exactly that shape, so it needs a
place of its own: wrap `gain.setTargetAtTime` and record `{ volume, timeConstant }` into a new
`window.__levels`, alongside the existing `__glides`. Purely additive — no existing field moves,
which is what keeps [envelope.test.js](../../test/browser/envelope.test.js) passing untouched.

**Browser — `test/browser/drone.test.js`** (new), modelled on
[sustain.test.js](../../test/browser/sustain.test.js) with `recordAudio`.

9. Starts off, and the indicator says so.
10. `` ` `` starts exactly one voice, at the fundamental a period below, at the drone level rather
    than the oscillator volume, with the attack; the indicator reads on. `` ` `` again stops it,
    scheduled with the release; the indicator reads off.
11. **Criterion 3, anchored.** With the drone sounding, root `4` → `window.__glides.length` is
    unchanged and the drone's `frequency` is unchanged. Nothing was scheduled at all.
12. **Criterion 3, following.** `~`, then root `4` → one glide, to a period below root 4's
    frequency, with the glide time constant — and `window.__sounds.length` is unchanged, proving
    it moved rather than being re-struck.
13. **Criterion 2, registers.** `↑` then `↓` in both modes → no glides, no stops, the drone still
    sounding.
14. **Criterion 2, notes.** Play and release `q`, `w`, `e` over the drone → the note stops are
    counted, the drone is not among them.
15. Hold mode, no root ever held: the drone sounds anyway. The note keys stay silent, which is the
    check that the drone did not become a note.
16. Pedal down, notes struck and released, pedal up → the drone is untouched by both edges.
17. **Criterion 4.** Dragging `#dronePeriod` while the drone sounds glides it, once per step, to
    the frequency the new shift asks for.
18. **Criterion 5.** Dragging `#droneVolume` while the drone sounds pushes one entry per step into
    `__levels`, ending at the level the fader reads — and `__sounds.length` and `__stops` are both
    unchanged, which is the claim that the level moved rather than the drone being restarted.
19. **Criterion 5, the separation.** Moving `#oscillatorVolume` does not touch the sounding drone;
    a note struck afterwards takes the new oscillator volume and the drone stays where it was.
20. Both drone settings survive a reload, and a note struck after the reload is unaffected by them.
21. `Escape` stops it at `stoppedIn === 0`, the indicator reads off, and `` ` `` starts it again —
    the test that the toggle did not invert.
22. Switching to the configuration view stops it and resets the indicator; returning to play logs
    no console errors.
23. `` ` `` and `~` are ignored in the configuration view and while a field has focus.

Then the full suite: `npm test`. [sustain.test.js](../../test/browser/sustain.test.js),
[playMode.test.js](../../test/browser/playMode.test.js),
[glide.test.js](../../test/browser/glide.test.js) and
[envelope.test.js](../../test/browser/envelope.test.js) should pass untouched — if any of them
moves, the drone has leaked into behaviour that has no drone in it.

---

## Documentation

[README.md](../../README.md): `` ` `` and `~` rows in the key table; a **drone** paragraph after
the sustain pedal one, saying plainly that anchored is a fixed reference and following is a
unison on every root; the two drone controls added to the list of shaping controls (now five),
with a line on the one way they differ from everything else in that footer — the drone level is
heard the moment it moves, because the drone is already sounding; and `droneHandler.js` /
`droneFrequency.js` in the code layout, plus the audio handler's line gaining "and how loud".

[playability-ideas.md](../playability-ideas.md): strike the *Drone key* section and repoint
*Suggested order* at *Live interval readout* when this is built — the same edit the pedal got.

---

## What was built

| File | What changed |
| --- | --- |
| [js/audio/audioHandler.js](../../js/audio/audioHandler.js) | `setSoundVolume` |
| [js/system/droneFrequency.js](../../js/system/droneFrequency.js) | New — the pitch, pure and DOM-free |
| [js/config/playSettings.js](../../js/config/playSettings.js) | The two settings, their bounds, and a minimum on `setSetting` |
| [js/config/playSettingsHandler.js](../../js/config/playSettingsHandler.js) | `format` and `name` per control, the two new rows, and the `playSettingChanged` event |
| [js/keys/droneHandler.js](../../js/keys/droneHandler.js) | New — the `` ` `` key, the `~` mode, the indicator, and `stopDrone` |
| [js/keys/escapeKeyHandler.js](../../js/keys/escapeKeyHandler.js), [js/config/viewToggle.js](../../js/config/viewToggle.js) | `stopDrone()` before `stopAllSounds()` |
| [index.html](../../index.html), [css/styles.css](../../css/styles.css) | The indicator row, the two faders, the script tag |
| [test/helpers/recordAudio.js](../../test/helpers/recordAudio.js) | `window.__levels` |
| [test/unit/audioHandler.test.js](../../test/unit/audioHandler.test.js) | 9 tests for `setSoundVolume` |
| [test/unit/droneFrequency.test.js](../../test/unit/droneFrequency.test.js) | New — 11 tests |
| [test/unit/playSettings.test.js](../../test/unit/playSettings.test.js) | 14 tests for the two settings and their persistence |
| [test/browser/drone.test.js](../../test/browser/drone.test.js) | New — 21 tests |
| [README.md](../../README.md) | The two key rows, the drone section, five shaping controls, the code layout |

Four departures from the plan above:

- **The voice list is used as a list everywhere, including where §4 wrote `DRONE_VOICE`.** Every
  function maps over `DRONE_VOICES`, `soundingFrequencies` is keyed by voice id, and the pitch is
  resolved by a `frequencyForVoice(voice)` that ignores its argument today. That argument is the
  whole point of the shape, so it is named rather than dropped.
- **`droneOn` is set from whether a voice actually started**, rather than from the keypress. An
  anchor out of the audible range leaves the indicator reading off, which is true, instead of
  leaving a lit row over silence and a `` ` `` that appears to do nothing.
- **`setSoundVolume` got a zero-time-constant path**, which the plan's three-line recipe did not
  have but its doc comment promised. It mirrors `setSoundFrequency`: schedule the value and
  return, having already frozen the gain.
- **`droneFrequency` treats a shift that is not a number as no shift**, not as silence. Returning
  `null` there would take the drone off for a bad *setting*, when the anchor is perfectly
  audible; the register is the recoverable half of the pair.

509 tests pass. [sustain.test.js](../../test/browser/sustain.test.js),
[playMode.test.js](../../test/browser/playMode.test.js),
[glide.test.js](../../test/browser/glide.test.js) and
[envelope.test.js](../../test/browser/envelope.test.js) were not touched and still pass, which is
the check that the drone did not leak into behaviour that has no drone in it.

---

## Consequences and risks

- **A drone is a voice that is always on, and voices sum.** The pedal plan already flagged
  `destination` with no master gain; the drone makes it a certainty rather than a possibility,
  because it is the one voice guaranteed to be sounding under every chord. The level control takes
  the edge off — a 0.3 drone leaves headroom a 0.5 one does not — but it does not fix it, and a
  player who pushes both faders up will clip. Still out of scope; the fix is still a master gain
  node in `audioHandler`, and this story is the strongest argument yet for building it.
- **Two volume faders now sit in the same footer and do different things.** The oscillator volume
  applies to notes when they are struck; the drone level applies to the drone, immediately.
  Someone will drag the wrong one and hear nothing change. The labels (*Drone level* against
  *Oscillator Volume*) are all that separates them, and if that proves confusing the answer is
  grouping the drone's two controls together and marking them as a pair, not renaming.
- **The asymmetry it exposes.** The attack, release, glide and now both drone settings are
  remembered between visits; the oscillator volume and wave shape, which live only in the DOM, are
  not. Adding a persisted volume-ish control beside an unpersisted one makes that visible for the
  first time. Moving the oscillator volume into `playSettings` is the obvious follow-up and is
  deliberately not in this story.
- **`setSoundVolume` is a general capability arriving through a specific door.** It is written for
  the drone but it applies to any voice, and the first thing to reach for it afterwards will be
  *Accent and dynamics*. Worth reviewing it as a piece of the audio layer rather than as a bit of
  the drone, because that is what it will be within one story.

- **Anchored is not "where the drone was switched on".** Turn the drone on while root `4` is
  selected, in anchored mode, and it sounds the *system fundamental*, not root 4. That is the
  criterion's reading — the fundamental is what an interval is measured against — but someone will
  expect the other one. It is one line to change and worth watching for during play testing;
  "following, then switch to anchored" already gets that behaviour, which is a reason not to build
  a third mode.
- **The drone does not appear on any key.** Nothing lights up, so the indicator row is the only
  feedback. That is why it gets two spans and a lit background rather than a line of text.
- **A drone left on across a configuration edit.** Cannot happen: switching to the configuration
  view stops it. Worth a moment's thought if the two views are ever shown at once.

---

## Room left: the drone as a stereo pair

Not this story. Recorded here because one decision above — the drone owning a *list* of voices
rather than a voice — exists only to serve it, and would look like ceremony otherwise.

The next thing this wants is **two drone voices straddling the drone pitch, panned apart.** The
same pair of oscillators buys two different things, and the pan control is the switch between
them:

- **Panned apart, on headphones** — a binaural beat, manufactured in the listener rather than in
  the air. Wants a carrier under about a kilohertz and a difference under about thirty; the
  default drone, a period below a 432 Hz root, sits at 216 Hz, squarely in range.
- **Panned together, or on speakers** — real acoustic beating. This is the app's own subject
  rather than a borrowed one: the beat rate between two notes is what makes a tuning ring or roll,
  and *Live interval readout* on the ideas page is already about putting that number on screen. A
  drone pair makes it audible on demand, held, underneath whatever is played over it.

### Straddling, and the two units

The pair is symmetric about the drone pitch, so the pitch the drone is *for* stays where it is
even when neither voice sounds it:

```
frequency(voice) = droneFrequency × ratio^(±1/2) ± spreadHz / 2
```

**The pair is off until it is switched on, by a control of its own.** Not by setting a spread, and
not by neutral values standing in for absence: two voices at `1/1` and `0 Hz` are not one voice,
they are two coincident voices summing to about twice the amplitude. Off means `DRONE_VOICES` has
one entry, which is exactly what this story builds and what the app does the rest of the time.

Both spreads then default to neutral — ratio `1/1`, spread `0 Hz` — so the pair opens from the
pitch that was already sounding rather than jumping to something else. It does not open *silently*:
that same summing means each voice wants half the drone level, or switching the pair on is a
6 dB step. Which of the two obvious splits to use, and whether panning them apart should claw some
of it back, is that story's to settle. **Ratio spreads geometrically and Hz arithmetically**, which is what makes each exact in its own terms: a ratio spread of `3/2` puts
precisely a just fifth between the voices, and a spread of `6 Hz` produces precisely a 6 Hz beat.

**Both units, not either — but they are two regimes, not one dial.** They compose without
ambiguity, the ratio being multiplicative and the hertz additive. What separates them is the wave
shape, which is easy to get wrong:

| Ratio | Spread | Wave | What is heard |
| --- | --- | --- | --- |
| `1/1` | 1–30 Hz | any | One pitch beating at the spread. The binaural case. |
| `3/2` | 0 | sine | Two pitches, a just fifth. **No beating at all** — sines only beat within twenty or thirty hertz of each other. |
| `3/2` | 0 | saw, square | A locked fifth: the lower voice's third harmonic and the upper's second land on the same frequency. |
| `3/2` | small | saw, square | Beating between those harmonics, at a **multiple** of the spread — how a piano tuner sets a fifth. |

So the second row is the trap: set an interval on the default sine, hear no beat, conclude the
feature is broken. The readout has to earn its place here — each voice's frequency, the difference
between them in hertz, and the beat that difference actually produces — or the controls teach the
wrong lesson.

### Consequences to weigh before it is written

- **A ratio spread breaks the drone's just relationship to the fundamental.** Half of `3/2` is 351
  cents, which is not a ratio in any system this app can build. The pair is justly related to
  *itself* and to nothing else, so the drone stops being a reference for the system and becomes a
  self-contained interval. Correct for binaural work, a real loss for the job the drone was
  invented for — which is the argument for reaching for the hertz spread whenever the reference
  matters, and for keeping the default at `1/1`.
- **The drone would want its own wave shape.** The table above turns on it, and it is currently
  shared with the note keys. Beating experiments want a sine for the binaural row and a sawtooth
  for the last one, neither of which is necessarily what the player wants to play over it.
- **It needs headphones and cannot check.** A headless test can assert a panner's value; nothing
  more. The rest is documentation and honest wording.

### What it would cost

- A `StereoPannerNode` between each voice's gain and `destination` — a change to how *every* voice
  is built, and `teardown` must learn to disconnect it or each strike leaks a node.
- An options bag for `playSound`, which is at five positional arguments and cannot take a sixth.
- Per-voice controls and the readout above, which is the larger half of the work.
