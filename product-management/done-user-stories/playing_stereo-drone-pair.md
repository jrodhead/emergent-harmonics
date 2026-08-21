# Stereo drone pair

**Built.** The plan below is kept as written, the way
[playing_drone-key.md](playing_drone-key.md) and
[playing_live-interval-readout.md](playing_live-interval-readout.md) keep theirs; see *What was
built* at the end for the files and the places the implementation went its own way. It picks up
the design notes left in the drone story under *Room left*, which is where the decision to give
the drone a *list* of voices came from.

## The story

As someone listening for beats, I want the drone to be two voices straddling its pitch, panned
apart, so that I can set a beat rate deliberately and hear it in isolation.

**Acceptance Criteria:**
1. The drone can sound as two voices, symmetric about the drone pitch, with the pair collapsing
   to a single centred voice by default.
2. The distance between them is configurable both as a ratio and as an offset in hertz.
3. Each voice's position in the stereo field is configurable, including hard left and right.
4. The frequencies sounding, the difference between them, and the beat that difference produces
   are shown.

---

## The idea in one line

**The pair is a beat you can set to a number and then hold still.**

Everything the app has built so far measures beating that happens to be there: the interval
readout puts a rate on whatever two keys are down, and the consonance meter scores the whole
sonority. This is the first control that *produces* a beat on purpose, at a rate the player
chooses, under everything else, indefinitely. That is why it belongs to the drone and not to the
keyboard.

It is also why criterion 4 is most of the work. A control that sets a beat rate and then does not
show whether that beat exists is worse than no control: the default wave is a sine, and a ratio
spread on a sine beats at nothing at all. The display is what stops the feature teaching the
wrong lesson — and it writes no arithmetic of its own, because
[interval.js](../../js/system/interval.js) already has all of it.

---

## The two regimes, and the table this story has to make true

Restated from the drone story, because every decision below is downstream of it. The same pair of
oscillators buys two different things, and the wave shape decides which one is audible:

| Ratio | Spread | Wave | What is heard |
| --- | --- | --- | --- |
| `1/1` | 1–30 Hz | any | One pitch beating at the spread. The binaural case when panned apart. |
| `3/2` | 0 | sine | Two pitches, a just fifth. **No beating at all.** |
| `3/2` | 0 | saw, square | A locked fifth: the lower voice's 3rd harmonic meets the upper's 2nd. |
| `3/2` | small | saw, square | Beating between those harmonics, at a **multiple** of the spread. |

Row two is the trap. `describeInterval` already knows about it — `audible.beat` is false for a
sine on anything but a unison, and `renderIntervalReadout` already says *"a sine has no partials
above its fundamental to beat with"* — so the work is pointing that sentence at the drone's own
two voices rather than reproducing it.

---

## Decisions taken

- **The pair is off until it is switched on, by a control of its own.** Not by setting a spread,
  and not by neutral values standing in for absence: two voices at `1/1` and `0 Hz` are not one
  voice, they are two coincident voices. Off means the voice list has one entry, which is exactly
  what the app does today. This is criterion 1's *"collapsing to a single centred voice by
  default"*, read as a state rather than as a coincidence of settings.

- **Both spreads default to neutral — ratio `1/1`, spread `0 Hz`.** Switching the pair on opens it
  from the pitch that was already sounding rather than jumping somewhere else. The player then
  moves one spread and hears what that spread does, which is the only way the table above gets
  taught.

- **Both pans default to centre**, and the reason is which regime the player lands in first. At the
  neutral spread the pan is inaudible either way — two identical signals hard apart and two
  identical signals centred are the same image — so the default costs nothing on opening and only
  decides what happens when the first spread is set. Centred, that is real acoustic beating in the
  air, which is this app's own subject and works on speakers and headphones alike. Hard apart on
  headphones is a binaural beat, manufactured in the listener; it is a deliberate excursion, one
  drag away, and the display says which one you are in.

- **Ratio spreads geometrically, hertz arithmetically, ratio first.** Straight from the drone
  story:

  ```
  frequency(voice) = droneFrequency × ratio^(±1/2) ± spreadHz / 2
  ```

  They compose without ambiguity, the ratio being multiplicative and the hertz additive, and each
  is exact in its own terms: a ratio spread of `3/2` puts precisely a just fifth between the
  voices, a spread of `6 Hz` produces precisely a 6 Hz difference between them.

- **Each voice of a pair sounds at the drone level divided by √2, and panning them apart does not
  claw any of it back.** This is the question the drone story left open, and the criterion it is
  settled on is: **the pair must never be louder than the single drone it replaced.** The drone is
  a reference; a reference that jumps when you switch a display feature on is not one. Both voices
  go through a panner, and a centred `StereoPannerNode` puts `1/√2` of its input into each channel,
  so two coincident voices at `V/√2` land on exactly `V` per channel — no step. With a spread they
  beat between `V` and silence, which is what beating *is*, and the peak is still `V`. Panned hard
  apart each ear gets `V/√2`, which is 3 dB down; making that up would put the beat peak above the
  drone level in the room, so it is left to the level fader instead.

- **The pair's voices are panned through a `StereoPannerNode`, and nothing else in the app is.**
  A voice gets a panner when it joins the pair and loses it when it leaves — not when it moves off
  centre. Centre is a *position*, and inserting the node there would make the sweep through the
  middle of the pan control a 3 dB step in both channels rather than a smooth crossing. Everything
  else keeps exactly the audio graph it has today: a note key, a previewed note and a single drone
  are connected straight to `destination`, which is not the same level as the same node through a
  centred panner, so inserting one on every voice would quietly move the level of the whole app.

- **`playSound` does not grow a sixth argument.** The drone story assumed the pan would have to
  arrive at strike time and that the five positional arguments would need an options bag. It does
  not: `setSoundPan` re-routes a voice that is already sounding, so the drone strikes its second
  voice and pans it on the next statement — the same turn of the event loop, before the audio
  thread renders another quantum, and therefore inaudible. That leaves `playSound` and its sixty
  call sites in the tests untouched, and it is the same shape as `setSoundFrequency` and
  `setSoundVolume`: *change something about a voice you are listening to*.

- **The drone handler stops being "a voice, retuned" and becomes "a set of voices, reconciled."**
  Switching the pair on while the drone sounds must start one voice and re-level the other without
  re-striking it; switching it off must stop one and give the other its level and its centre back.
  That is a reconcile against what is currently sounding, and the handler already keeps the map it
  needs. This is the shape `DRONE_VOICES` was written for.

- **Criterion 4 gets a display of its own, next to the drone indicator, and the interval readout
  is left to do what it already does.** Two reasons. The readout only shows a pair while the pair
  is *distinct* — at the neutral spread the two drone voices are the same frequency and it
  collapses them, correctly, so criterion 4 would be blank exactly where the player is about to
  start moving a spread. And the readout shows a ratio, cents and a beat but never the two
  frequencies themselves, which criterion 4 asks for first.

- **No new keys.** The drone owns `` ` `` and `~`; everything here is a setting, and settings live
  in the footer with the other five and persist like them.

- **The drone keeps the shared wave shape.** The notes on the ideas page say a drone wave shape is
  "probably criterion 5". It is a story of its own — see *Criterion 5* below — and this one covers
  the trap with words instead, which is what the interval readout already does.

---

## Design

### 1. The arithmetic — `js/system/dronePair.js` (new)

Pure and DOM-free, like [droneFrequency.js](../../js/system/droneFrequency.js) and
[interval.js](../../js/system/interval.js). All of this story's arithmetic risk is here and it
is written and tested before anything is wired.

```js
// One period is as far apart as a "pair" can sensibly be: past it the two are
// not straddling a pitch any more, they are two drones.
export const MAX_SPREAD_RATIO = PERIOD_RATIO;

// Beats stop being beats past about twenty hertz and become roughness — which
// is what MAX_AUDIBLE_BEAT_HZ in interval.js says — and the binaural literature
// reaches a little past that, so the control does too and the display is left
// to say what is happening up there.
export const MAX_SPREAD_HZ = 30;

/**
 * The two frequencies a pair sounds at: symmetric about the drone pitch, so the
 * pitch the drone is *for* stays where it is even when neither voice sounds it.
 *
 * The ratio is applied geometrically and the hertz offset arithmetically, in
 * that order, which is what makes each exact in its own terms.
 *
 * @returns {{lower: number, upper: number}|null} null when the drone pitch is
 *   not a frequency, or when the spread would push a voice below hearing.
 */
export function pairFrequencies(droneFrequency, { spreadRatio = 1, spreadHz = 0 } = {}) { … }

/**
 * What one voice of a pair sounds at, given the drone's level. Half the power
 * rather than half the amplitude, because a centred panner already takes 1/√2
 * of each voice into each channel: two coincident voices at V/√2 through one
 * arrive at exactly V, so switching the pair on is not a step, and a pair that
 * is beating peaks at V rather than above it.
 */
export const pairVoiceVolume = (droneVolume) => droneVolume / Math.SQRT2;

/**
 * A spread typed as a ratio: "3/2", or a decimal. A value below 1 is inverted
 * rather than rejected — a spread has no direction, and 2/3 and 3/2 are the
 * same distance.
 *
 * @returns {number|null} null for anything that is not a ratio, so the caller
 *   can leave the setting alone rather than storing a NaN.
 */
export function parseRatio(text) { … }
```

- `pairFrequencies` guards a non-finite or non-positive pitch, a non-finite ratio, and a ratio
  outside `1 … MAX_SPREAD_RATIO` (clamped, after inversion). A negative `spreadHz` is taken as its
  magnitude: symmetric means symmetric.
- It returns `null` rather than clamping when the lower voice would land under
  `MIN_AUDIBLE_FREQUENCY`. Clamping one voice and not the other would silently change the beat
  rate, which is the one number this story exists to set. `droneFrequency` walks a bad register
  back into range because a register is recoverable; a spread is not, so this one says no and the
  handler declines to start that voice. Only reachable at the very bottom of the drone's register
  with the widest hertz spread — a 20 Hz drone with a 30 Hz spread — and the drone pitch control
  is one drag away.

### 2. Panning a voice — [js/audio/audioHandler.js](../../js/audio/audioHandler.js)

The third member of the family that already holds `setSoundFrequency` and `setSoundVolume`.

```js
/**
 * Moves a sounding voice in the stereo field, building it a panner the first
 * time it is given a position and taking that panner away again when it is
 * given none. A voice with no panner is connected straight to the destination,
 * which is not the same level as a centred panner — that is 3 dB down in each
 * channel — so the node arrives and leaves with the pair, never with a
 * position: crossing the centre of the control must not be a step.
 *
 * @param {number|null} pan - −1 hard left to +1 hard right; null removes the
 *   panner, which is what a voice leaving a pair wants.
 */
export function setSoundPan(key, pan, timeConstant = DRAG_GLIDE_TIME_CONSTANT) { … }
```

- Does nothing for a key with no voice, and logs a non-finite pan, exactly as its two siblings do.
- Inserting: `gainNode.disconnect()`, `gainNode.connect(panner)`, `panner.connect(destination)`.
  Legal on a running graph — nothing about the signal changes, only where it goes — and it is a
  3 dB drop in each channel, which is why the caller sets the paired level in the same reconcile.
- Removing: the reverse, and the panner is dropped, returning that 3 dB. The level change that
  belongs with it is scheduled in the same reconcile, so the two land together.
- The voice record gains `panner`, and `teardown` disconnects it, or every panned strike leaks a
  node — the drone story flagged exactly this.
- **No `notifySounding()`.** Where a voice sits is not what interval it is in, the same argument
  that keeps `setSoundVolume` out of the subscription. The drone's own display redraws on
  `playSettingChanged` instead.

### 3. The settings — [playSettings.js](../../js/config/playSettings.js) and its handler

Five more, beside the drone's two, persisted the same way:

```js
export const DEFAULT_DRONE_PAIR = false;          // criterion 1: a single centred voice
export const DEFAULT_DRONE_SPREAD_RATIO = 1;      // opens from the pitch already sounding
export const DEFAULT_DRONE_SPREAD_HZ = 0;
export const DEFAULT_DRONE_PAN = 0;               // both voices, for the regime argument above
export const MIN_DRONE_PAN = -1;
export const MAX_DRONE_PAN = 1;
```

- `getDronePair` / `setDronePair`, `getDroneSpreadRatio` / `setDroneSpreadRatio`,
  `getDroneSpreadHz` / `setDroneSpreadHz`, and `getDroneLowerPan` / `setDroneLowerPan` /
  `getDroneUpperPan` / `setDroneUpperPan`.
- The ratio setter inverts a value below 1 before clamping to `1 … MAX_SPREAD_RATIO`, the way
  `setDronePeriodShift` rounds before clamping: the transform belongs to the one control it is
  about, not inside `setSetting`.
- The pair flag is a boolean and does not go through `setSetting` at all, which is about clamping
  numbers.
- `loadStoredPlaySettings` restores all five field by field, alongside the existing five, so a
  settings blob written before any of them still restores everything it does know about. The
  boolean is checked with `typeof === 'boolean'` rather than `Number.isFinite`.

**`playSettingsHandler`**: `CONTROLS` is built for range inputs and reads `Number(input.value)`.
A checkbox and a text field do not fit that, so an entry gains two optional fields —
`read(input)`, defaulting to `Number(input.value)`, and `write(input, value)`, defaulting to
`input.value = value`. The five existing rows are untouched, the checkbox reads `input.checked`,
and the ratio field reads through `parseRatio` and writes back what was stored, so typing `2/3`
leaves `1.5` in the box and the player can see the inversion happened.

Everything still ends in the same `playSettingChanged` event with the setting's name in `detail`,
which is the one seam the drone follows.

### 4. The controls — [index.html](../../index.html)

The footer now has ten controls, two of which are volumes and seven of which are the drone's. The
drone story's own consequence section called this: *"if that proves confusing the answer is
grouping the drone's two controls together and marking them as a pair."* So the drone's controls
move into a group with a heading, and the five new ones join them:

```html
<fieldset id="droneControls">
  <legend>Drone</legend>
  <!-- Drone pitch and Drone level, moved, unchanged -->
  <div class="form-group">
    <label for="dronePair">Stereo pair:</label>
    <input type="checkbox" id="dronePair">
  </div>
  <div class="form-group">
    <label for="droneSpreadRatio">Spread (ratio):</label>
    <input type="text" id="droneSpreadRatio" value="1" size="6" inputmode="text">
    <output for="droneSpreadRatio" id="droneSpreadRatioOutput">unison</output>
  </div>
  <div class="form-group">
    <label for="droneSpreadHz">Spread (Hz):</label>
    <input type="range" id="droneSpreadHz" min="0" max="30" step="0.1" value="0">
    <output for="droneSpreadHz" id="droneSpreadHzOutput">0 Hz</output>
  </div>
  <div class="form-group">
    <label for="droneLowerPan">Lower voice:</label>
    <input type="range" id="droneLowerPan" min="-1" max="1" step="0.01" value="0">
    <output for="droneLowerPan" id="droneLowerPanOutput">centre</output>
  </div>
  <div class="form-group">
    <label for="droneUpperPan">Upper voice:</label>
    <input type="range" id="droneUpperPan" min="-1" max="1" step="0.01" value="0">
    <output for="droneUpperPan" id="droneUpperPanOutput">centre</output>
  </div>
</fieldset>
```

The ratio's output says the interval in the app's own terms — `unison`, `702 cents`, and the
simple name when there is one — through `describeRatio` and `nearestSimpleRatio`, both of which
exist. The spreads and pans are disabled while the pair is off, so the control that turns the
feature on is visibly the one that does.

New in [format.js](../../js/format.js), beside the six already there:

- **`formatPan(pan)`** — `centre` at zero, `hard left` / `hard right` at the ends, `40% left`
  between. Small, pure, and it is what both the control's output and the readout below say.

### 5. The voices — [js/keys/droneHandler.js](../../js/keys/droneHandler.js)

The reconcile. `DRONE_VOICES` becomes a function of the pair setting, and every one of the
handler's operations becomes a case of one operation.

```js
// The voice keys cannot collide with a note key, which is always a single
// character. Their ids do not change with the pair setting: reconciling against
// what is sounding is what starts and stops the second one.
const LOWER = { id: 'drone-1', side: -1 };
const UPPER = { id: 'drone-2', side: +1 };

const droneVoices = () => (getDronePair() ? [LOWER, UPPER] : [{ ...LOWER, side: 0 }]);

// Voice id → what it was last asked for. The equality checks against this are
// what keep the drone provably still through a root change it does not follow.
const sounding = new Map();   // id → { frequency, pan }
```

- **`frequencyForVoice(voice)`** — the drone pitch from `droneFrequency`, then, when the pair is
  on, the `lower` or `upper` of `pairFrequencies` according to `voice.side`. The argument
  `frequencyForVoice` has ignored since the drone was built is finally the thing it is about.
- **`panForVoice(voice)`** — `0` when the pair is off, otherwise the lower or upper pan setting.
- **`volumeForVoice()`** — `getDroneVolume()`, or `pairVoiceVolume(getDroneVolume())` when the
  pair is on.
- **`applyDrone()`** — the one function, called from everywhere. Against `droneVoices()` and the
  `sounding` map it: stops any sounding voice that is no longer wanted, with the release; starts
  any wanted voice that is not sounding, with the attack; glides the frequency of the rest when it
  has changed, and pans them when it has changed, both against the remembered value so an
  unchanged number schedules nothing at all. Levels are set without an equality check, as
  `relevelDrone` already does, because only a fader move asks for one. A voice leaving the pair is
  panned with `null`, which takes its panner away.
- `startDrone` and `stopDrone` keep their names and their jobs; `retuneDrone` and `relevelDrone`
  fold into `applyDrone`.
- **`stopDrone` stops what is *sounding*, not what the settings currently describe.** It already
  has to: switching the pair off while the drone sounds must not leave `drone-2` running under a
  list that no longer mentions it. The `sounding` map is the authority for stopping, which it
  quietly already was.
- **`playSettingChanged`** grows the five new names, all of which call `applyDrone`. The existing
  two do too, since `applyDrone` subsumes both of the functions they used to call.
- Everything else — the `` ` `` toggle, the `~` mode switch, `noteKeyMapChanged`, the two panic
  stops — is unchanged, because they all now go through the same reconcile.

### 6. Criterion 4 — `js/keys/renderDroneReadout.js` (new)

Drawn by `displayDrone()`, which already runs on every change the drone has, and handed the
frequencies out of the `sounding` map so the display says what was actually asked for rather than
recomputing it. Markup only, in the shape of
[renderIntervalReadout.js](../../js/keys/renderIntervalReadout.js).

```html
<div id="dronePairReadout">
  <span class="drone-voice">216.00 Hz <span class="drone-pan">hard left</span></span>
  <span class="drone-voice">222.00 Hz <span class="drone-pan">hard right</span></span>
  <span class="drone-difference">6 Hz apart</span>
  <span class="drone-beat">beats at 6 Hz</span>
  <span class="drone-regime">binaural: the beat is in the listener, not in the air</span>
</div>
```

Every number comes from `describeInterval(lower, upper, { waveShape })`, which this story does not
add to:

- **The frequencies** — from the map, through `formatFrequency`, with `formatPan` beside each.
- **The difference** — `fundamentalsHz`, through `formatBeat`.
- **The beat** — `beatHz`, with `audible.beat` deciding whether it is stated plainly or struck
  through with the reason. The reason is the same sentence the interval readout says, so
  `inaudibleBecause` is exported from
  [renderIntervalReadout.js](../../js/keys/renderIntervalReadout.js) and imported here rather
  than written twice — two places saying it is two places for it to drift.
- **The regime** — the one line this story adds to the vocabulary, and the thing that makes the
  four-row table above legible without reading it: *binaural* when the voices are panned hard
  apart and the difference is small, *acoustic beating* when they are together, and the
  in-between said as what it is. Panning is not a fact about arithmetic, so this sentence is the
  display's own; it is the only judgement in the file.
- Nothing at all when the pair is off, so the drone row looks exactly as it does today.

### 7. Two drone voices in the interval readout — [intervalReadout.js](../../js/keys/intervalReadout.js)

`labelForVoice` calls anything that is not a single character `drone`, which with a pair sounding
would put `drone · drone` on every row. It becomes a labelling pass over the sorted voice list:
one drone voice is `drone`, and two are `drone 1` and `drone 2` in pitch order.

Nothing else changes, and one thing that looks like an omission is deliberate: at the neutral
spread the two drone voices have the *same* frequency, and `pairsFrom` already collapses equal
frequencies. So a pair with no spread appears in the readout as one `drone`, which is honest —
they are not an interval — and it is why criterion 4 needs its own display rather than borrowing
this one.

### 8. Styling — [css/styles.css](../../css/styles.css)

`#dronePairReadout` joins the `#droneTable` rule and lays its spans out in a row, with
`font-variant-numeric: tabular-nums` so a frequency sliding under a drag does not make the line
jump — the same reason the interval readout has it. `.drone-beat.inaudible` reuses the readout's
struck-through treatment. `#droneControls` gets the footer's fieldset styling, which is the visible
half of grouping the drone's controls.

---

## Tests

**Unit — `test/unit/dronePair.test.js`** (new). Most of the arithmetic risk.

1. Neutral defaults return the drone pitch twice: `pairFrequencies(216)` is `{ lower: 216, upper:
   216 }`. The pair opens where the drone already was.
2. A hertz spread is symmetric and exact: `6 Hz` about 216 gives 213 and 219, a difference of
   exactly 6.
3. A ratio spread is symmetric in *cents*: `3/2` about 216 gives 216/√1.5 and 216·√1.5, which are
   ±351 cents, and their ratio is exactly 1.5.
4. Both together compose in the documented order — ratio, then hertz — checked against the
   formula written out by hand.
5. A ratio below 1 is inverted: `2/3` gives the same pair as `3/2`. Above a period it is clamped.
6. A spread that would put the lower voice under `MIN_AUDIBLE_FREQUENCY` returns `null` rather
   than clamping one side. **The test that says the beat rate is never quietly changed.**
7. Degenerate input — a non-finite or non-positive pitch, a `NaN` ratio, a negative hertz spread
   (taken as its magnitude).
8. `pairVoiceVolume(0.3)` is `0.3/√2`, and two of them, each through the `1/√2` a centred panner
   takes, sum coherently to `0.3`. Written as that claim rather than as the constant, so it is the
   *reason* that is under test.
9. `parseRatio`: `3/2` and `1.5` both give 1.5; `2/3` gives 1.5; `1` gives 1; `3/0`, `x`, an
   empty string and `-2` give `null`.

**Unit — [audioHandler.test.js](../../test/unit/audioHandler.test.js)**, against the existing
`FakeAudioContext`, which gains a `createStereoPanner`.

10. `setSoundPan` on an unpanned voice builds one panner, re-routes the gain through it, and moves
    it toward the value over the time constant.
11. Called again it moves the same panner and does not build a second.
12. `setSoundPan(key, null)` disconnects the panner and reconnects the gain to the destination.
13. A panned voice that is stopped, sustained, or caught by `stopAllSounds` has its panner
    disconnected — **the leak the drone story predicted**.
14. A no-op for a key with no voice; a non-finite pan is logged and changes nothing.
15. It does **not** notify `subscribeToSounding`, alongside the existing check for
    `setSoundVolume`.

**Unit — [playSettings.test.js](../../test/unit/playSettings.test.js)**

16. The five new settings' defaults, one test to the claim that the pair is off by default.
17. The ratio setter inverts below 1 and clamps above a period; the pans clamp to −1…1; the hertz
    spread clamps to 0…30; a non-finite value is ignored everywhere.
18. All five round-trip through storage, and a blob written before any of them existed still
    restores the other five.

**Unit — [format.test.js](../../test/unit/format.test.js)**

19. `formatPan`: `centre`, `hard left`, `hard right`, and a percentage in between, with the same
    Unicode minus habit as its neighbours.

**The recorder — [recordAudio.js](../../test/helpers/recordAudio.js)**

Wrap `AudioContext.prototype.createStereoPanner` and record `{ pan, timeConstant }` into a new
`window.__pans`, and put the latest pan on the sound being built, so a test can ask where each
voice is. Purely additive, alongside `__glides` and `__levels`, which is what keeps every existing
browser test passing untouched.

**Browser — `test/browser/dronePair.test.js`** (new), modelled on
[drone.test.js](../../test/browser/drone.test.js).

20. **Criterion 1, the default.** `` ` `` with nothing else touched sounds exactly one voice and
    builds no panner. (Also asserted by [drone.test.js](../../test/browser/drone.test.js)
    passing untouched, which is the real check.)
21. Switching the pair on while the drone sounds starts a second voice with the attack, re-levels
    the first to `V/√2` rather than re-striking it — `__sounds.length` goes 1 → 2, `__stops` stays
    0, `__levels` gains one entry.
22. Switching it off stops exactly one voice with the release, re-levels the survivor back to `V`,
    removes its panner, and starts nothing.
23. **Criterion 2, hertz.** A 6 Hz spread puts the two voices 6 Hz apart, symmetric about the pitch
    the single drone was sounding — asserted against the frequency recorded before the pair was
    switched on.
24. **Criterion 2, ratio.** A `3/2` spread gives a ratio of exactly 1.5 between the two voices, and
    the drone pitch is the geometric mean of them. Typing `2/3` gives the same pair.
25. Dragging either spread while the pair sounds glides both voices, once per step, and never
    re-strikes them.
26. **Criterion 3.** Dragging the lower pan to −1 and the upper to +1 puts one panner at −1 and the
    other at +1, once per step, and leaves both frequencies and both levels alone. Returning them
    to 0 leaves the panners in place at 0 — they belong to the pair, not to a position, which is
    what keeps a drag through the centre from being a level step.
27. **Criterion 4.** With a 6 Hz spread on a sine, the readout shows both frequencies, `6 Hz
    apart`, and a beat of 6 Hz that is *not* struck through — a unison beats between the
    fundamentals, which every wave has.
28. **Criterion 4, the trap.** With a `3/2` spread on a sine, the beat is struck through with the
    sine reason; switching the oscillator to a sawtooth un-strikes it. **The test the display
    exists for.**
29. **Criterion 4, the regime.** Hard apart with a small hertz spread says binaural; centred says
    acoustic beating.
30. The interval readout labels the two voices `drone 1` and `drone 2` when they are spread, shows
    one `drone` when they are not, and pairs each against a note key held over them.
31. A root change in following mode glides both voices and re-strikes neither; in anchored mode it
    schedules nothing at all — the drone's original claim, now with two voices.
32. `Escape` and switching to the configuration view stop both voices and leave the indicator off.
33. All five settings survive a reload, and a drone started after the reload opens as a pair.

Then the full suite: `npm test`. [drone.test.js](../../test/browser/drone.test.js),
[intervalReadout.test.js](../../test/browser/intervalReadout.test.js),
[consonanceMeter.test.js](../../test/browser/consonanceMeter.test.js),
[sustain.test.js](../../test/browser/sustain.test.js) and
[envelope.test.js](../../test/browser/envelope.test.js) should pass untouched — the pair is off
by default, so if any of them moves, the default is not what it claims to be.

---

## Order of work

Six steps, each of which leaves the app working:

1. **`dronePair.js` and its tests.** Pure, no UI, no wiring — all the arithmetic risk resolved
   before anything depends on it.
2. **`setSoundPan`, the panner on the voice record, `teardown`, and their tests.** Nothing calls
   it yet; the app is unchanged.
3. **The five settings, their persistence, and their tests.** Still nothing reads them.
4. **The controls and the fieldset.** Visible, inert, and the point at which the drone's seven
   controls become a group.
5. **The reconcile in `droneHandler`.** The first step you can hear — criteria 1, 2 and 3.
6. **The readout, the labels, the styling, and the browser tests.** Criterion 4.

Then the documentation.

---

## Criterion 5, and why it is a story of its own

The ideas page says a drone wave shape is "probably criterion 5", and the four-row table is the
argument for it: half of it is unreachable on the default sine. It is deliberately not here, and
the reason is that a *per-voice* wave shape is not a drone feature, it is an audio-layer one:

- `playSound` takes a shape and never changes it again, so the shape would have to be stored on
  the voice — which is one field, and fine.
- The interval readout reads one `#waveShape` for every pair. A drone on a sawtooth under notes on
  a sine has no single shape, and the honest rule is *the beat needs partials in both voices*.
- The consonance meter is worse: `consonanceOf(frequencies, { waveShape })` builds partials for
  the whole sonority from one shape, and a mixed sonority changes its signature.

That is a coherent story — **Drone wave shape**, now recorded in Group 2 of
[playability-ideas.md](../playability-ideas.md) — and it would also fix something this story found
and did not touch: the readout and the meter both redraw
when `#waveShape` changes, as though a sounding voice's shape had changed with it. It has not.
`playSound` sets `oscillator.type` at the strike and nothing updates it, so switching to a sawtooth
mid-chord tells the player that the beats they are looking at have become audible when the
oscillators making them are still sines. Storing the shape per voice is the fix for both.

Until then this story covers the trap the way the interval readout already does: it says, on
screen, that a sine has no partials to beat with.

---

## Documentation

[README.md](../../README.md):

- The **drone** section gains the pair: what the two voices are, that they straddle the pitch, and
  the two regimes — with the honest sentence that hard apart on headphones is a beat manufactured
  in the listener and that the same setting on speakers is not, because nothing in the app can
  tell which you are wearing.
- A line on **which spread to reach for**: hertz when the drone still has to be a reference, ratio
  when it does not. Half of `3/2` is 351 cents, which is not a ratio in any system this app can
  build.
- The shaping controls list grows from five to ten, presented as two groups now that the footer
  has them: the note keys' envelope and glide, and the drone's seven.
- The code layout gains `dronePair.js` and `renderDroneReadout.js`, and the audio handler's line
  gains "and where it sits in the stereo field".

[playability-ideas.md](../playability-ideas.md): strike the *Stereo drone pair* section when
this is built — the same edit the pedal, the drone and the readout got — repoint *Suggested order*
at *Accent and dynamics*, and add **Drone wave shape** to Group 2 with the argument above, since
this story is where it was refused.

---

## What was built

| File | What changed |
| --- | --- |
| [js/system/dronePair.js](../../js/system/dronePair.js) | New — the two frequencies, the level split, the ratio parser |
| [js/audio/audioHandler.js](../../js/audio/audioHandler.js) | `setSoundPan`, the panner on the voice record, and a `teardown` that lets it go |
| [js/config/playSettings.js](../../js/config/playSettings.js) | The five settings, their bounds and their persistence |
| [js/config/playSettingsHandler.js](../../js/config/playSettingsHandler.js) | `read`, `write` and `event` per control, the five new rows, and disabling the four that describe a pair |
| [js/format.js](../../js/format.js) | `formatPan` |
| [js/keys/droneHandler.js](../../js/keys/droneHandler.js) | The reconcile: a set of voices rather than a voice |
| [js/keys/renderDroneReadout.js](../../js/keys/renderDroneReadout.js) | New — criterion 4, and the regime sentence |
| [js/keys/renderIntervalReadout.js](../../js/keys/renderIntervalReadout.js) | `inaudibleBecause` exported, so it is said in one place |
| [js/keys/intervalReadout.js](../../js/keys/intervalReadout.js) | `distinctVoices`, and drone voices numbered in pitch order |
| [index.html](../../index.html), [css/styles.css](../../css/styles.css) | The drone fieldset, the five controls, the readout row and its styling |
| [test/helpers/recordAudio.js](../../test/helpers/recordAudio.js) | `window.__pans`, including a voice giving its panner back |
| [test/unit/dronePair.test.js](../../test/unit/dronePair.test.js) | New — 23 tests |
| [test/unit/audioHandler.test.js](../../test/unit/audioHandler.test.js) | 12 tests for `setSoundPan` |
| [test/unit/playSettings.test.js](../../test/unit/playSettings.test.js) | 15 tests for the five settings and their persistence |
| [test/unit/format.test.js](../../test/unit/format.test.js) | 5 tests for `formatPan` |
| [test/browser/dronePair.test.js](../../test/browser/dronePair.test.js) | New — 25 tests |
| [README.md](../../README.md) | The stereo pair, ten shaping controls in two groups, the code layout |

Five departures from the plan above:

- **A spread that will not fit collapses the pair rather than taking the drone off.** §5 had the
  handler decline a voice whose frequency came back `null`, which at the bottom of the register
  means *both* voices and a drone that goes silent — and then cannot be recovered by dragging the
  spread back, because a drone that is off reconciles nothing. That is the thing the drone story's
  own departure argues against: a bad *setting* should not cost you an audible pitch. So the pair
  is unavailable rather than fatal, the drone goes on sounding as its single centred voice, and
  the readout says which setting is out of reach. The refusal stays where the plan put it, in
  `pairFrequencies`; only what the handler does with it changed.

- **The beat the readout reports is between the fundamentals whenever the voices are close.** §6
  assumed `beatHz` was the number to show. It is not, for the headline case: two voices 6 Hz apart
  at the drone's default pitch are 48 cents apart, which no simple ratio is within a quartertone
  of, so `describeInterval` names no ratio and reports no partial beat — and the display would
  have read *"no simple ratio between them"* over a pair beating audibly at exactly the rate the
  player set. This is the readout story's own trap arriving from the other side, and the rule is
  the one that story wrote down: under `MAX_AUDIBLE_BEAT_HZ` two tones beat directly, on any wave;
  past it they beat between coinciding partials, if the wave has any.

- **The drone's controls are hidden on the configuration screen.** Not in the plan, and forced by
  the mixer: the note faders take their height from what the footer leaves them, and seven more
  controls cost them a third of their travel — caught by a test that had nothing to do with this
  story. The drone cannot sound on that screen anyway, since leaving the play view stops it.

- **The ratio field applies on `change` rather than on `input`.** §3 wired every control the same
  way. A text field that re-writes itself on every keystroke fights the person typing into it, and
  `3/` is not a ratio yet, so the entry lands on blur or Enter and the controls table grew an
  `event` alongside `read` and `write`.

- **The interval readout labels the voices it shows rather than the voices there are.** §7
  numbered every drone voice sounding, which numbered a *collapsed* pair `drone 1` with no
  `drone 2` anywhere on screen. The labelling now runs over the distinct voices, after the
  collapse, so the numbers describe what is drawn.

696 tests pass. [drone.test.js](../../test/browser/drone.test.js),
[intervalReadout.test.js](../../test/browser/intervalReadout.test.js),
[consonanceMeter.test.js](../../test/browser/consonanceMeter.test.js),
[sustain.test.js](../../test/browser/sustain.test.js) and
[envelope.test.js](../../test/browser/envelope.test.js) were not touched and still pass, which is
the check that the pair is genuinely off by default.

---

## Consequences and risks

- **It needs headphones and cannot check.** A headless test can assert a panner's value and
  nothing else. Whether a binaural beat is actually manufactured in a listener is not a claim any
  test here can make, and the display's wording is doing work the tests cannot back — see the
  regime sentence, which is a judgement about a listener the app cannot see.

- **A ratio spread breaks the drone's just relationship to the fundamental.** The pair is justly
  related to *itself* and to nothing else, so the drone stops being a reference for the system and
  becomes a self-contained interval. Correct for binaural work, a real loss for the job the drone
  was invented for. The default stays at `1/1`, the README says which spread to reach for, and the
  readout shows both frequencies so the drift is at least visible.

- **A pair is two voices always on, over a bus with no master gain.** The drone story called
  `destination` with no master gain a certainty rather than a possibility; this doubles the drone's
  voice count. The `V/√2` split means the pair is never louder than the single drone, so it does
  not make clipping *more* likely — but it is the second story in a row to argue for a master gain
  node in `audioHandler`, and the third will be *Accent and dynamics*.

- **The readout doubles its drone rows.** Every note key sounding over a spread pair now produces
  two rows against the drone instead of one, and the twelve-row cap is reached twice as fast. The
  interval readout's own consequences section already names the fix — the outer interval plus the
  adjacent pairs of the lowest four voices — and this story makes it likelier to be needed.

- **The footer now has ten controls and seven of them are the drone's.** The fieldset is the
  answer, and it is the answer the drone story predicted. If it is still too much, the next move is
  a drone panel in the play view rather than more grouping in the footer.

- **The pan is smoothed, and a `StereoPannerNode`'s pan is not a level.** Dragging it moves an
  equal-power curve, so a voice dragged from centre to hard left gets *louder* in the left ear by
  3 dB while vanishing from the right. That is what panning is, and it is worth knowing before
  someone reports the pair as getting louder when they spread it out.

- **Switching the pair off has one transient.** The surviving voice goes up by 6 dB, half of it
  instantly as its panner is removed and half of it smoothed as its level goes back to `V`, while
  the voice beside it releases and takes the other half of the sound away. The two halves land
  within the drag time constant of each other and the sum is right at both ends; only the middle
  few milliseconds are wrong, under a release. Audible only if the level smoothing is ever made
  slow.

- **A `1/1`, `0 Hz`, centred pair is two coincident voices and sounds exactly like the one it
  replaced.** That is deliberate — the pair opens where the drone already was — but it means two
  oscillators are making one sound and nothing in the ear says so. The display is what tells the
  player the pair is on, and it is why the pair has a switch of its own rather than being implied
  by a non-zero spread.

- **`setSoundPan` is a general capability arriving through a specific door**, exactly as
  `setSoundVolume` did in the drone story and `soundingVoices` did in the readout. Review it as a
  piece of the audio layer, because the thing that reaches for it next is a stereo spread over the
  note keys, and that would want it on every voice.
