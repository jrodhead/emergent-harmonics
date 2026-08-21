# Sustain pedal

**Built.** The plan below is kept as written, because the design is the interesting part of this
one; see *What was built* at the end for the files and the two places the implementation went
its own way.

## The story

As someone playing chords, I want notes to continue after I release their keys until I lift a
pedal, so that I can hold a sonority through a root change.

**Acceptance Criteria:**
1. A held key acts as a sustain pedal.
2. Notes released while it is down keep sounding until it is lifted.
3. It interacts correctly with the latch and hold play modes, view switching, and panic stop.
4. A pedalled note survives the release of the last root in hold mode.

---

## The idea in one line

**The key decides whether a note follows a modulation; the pedal decides whether it survives
one.**

That falls out of a rule the app already has. `stopSound` frees a key the instant it is let go
and hands the voice to `releasingVoices`, and the comment there states the principle: *a
released voice belongs to the tuning it was released in — it is no longer moved by a root
change.* The pedal adds a third state to a voice's life, between held and releasing: **held on
to indefinitely, still sounding, no longer attached to a key.**

So the pedal does two distinguishable things, and keeping them apart is the whole design:

| | The key is | The voice is | On a root change |
| --- | --- | --- | --- |
| **Sustaining a released key** | up | detached into `sustainedVoices` | stays where it was — a pedal point |
| **Bridging the rootless gap** (hold mode) | still down | still attached to its key | glides into the new root |

**A word on "pedalled".** The story uses it for both rows and they behave differently, so this
plan does not use it as a term at all. A **sustained** note is the first row: its key is up and
its voice is detached. A note **held through the gap** is the second: its key is still down and
the pedal is only suspending hold mode's silencing. Which one you get is decided by one thing —
whether the key is still down when the root changes.

The second is criterion 4, and it is what the ideas page is after: in hold mode a root change
means releasing one root key and pressing the next, and `rootReleased` silences the chord in
the gap between them. The pedal suppresses that silencing. The note never leaves its key, so
the existing `noteKeyMapChanged` glide picks it up untouched when the new root lands — no
change to the glide itself, exactly as the ideas page predicted.

## Decisions taken

- **The pedal is `Space`.** Free today, and the conventional software-instrument pedal — big
  enough to hold with a thumb while both hands play.
- **Pedalled voices stack, like a piano.** Every strike leaves its own voice ringing until the
  pedal lifts, so re-pressing a key under the pedal does not cut off what it left behind. See
  *Consequences* for the cost of this.
- **The pedal never starts a note hold mode would not have started.** It keeps a sounding note
  alive through a rootless gap; it does not turn hold mode into latch mode. A note key pressed
  in hold mode with no root held stays silent whether or not the pedal is down.
- **Play view only.** `shouldIgnoreKeyEvent` already blocks the configuration screen, so the
  preview keys are untouched.

---

## Design

### 1. The audio layer — [js/audio/audioHandler.js](../../js/audio/audioHandler.js)

A second holding pen beside `releasingVoices`, for voices that are sustained rather than
fading:

```js
// Voices whose key has been let go while the pedal was down. Unlike a releasing
// voice they are not going anywhere: they sound at full volume until the pedal
// is lifted, and only then begin their release.
const sustainedVoices = new Set();
```

- **Extract `releaseVoice(voice, releaseTime)`** from the tail of `stopSound` — the
  `cancelScheduledValues` / `setValueAtTime` / `linearRampToValueAtTime` / `oscillator.stop`
  sequence plus the `releasingVoices` bookkeeping — so `stopSound` and the pedal lift schedule
  an identical release. This is a pure refactor; no behaviour changes.
- **`sustainVoice(key)`** — moves `activeOscillators[key]` into `sustainedVoices` and deletes
  the key entry. Nothing is scheduled: the voice carries on exactly as it was. A no-op when the
  key has no voice, which is what makes the hold-mode silent-note case free.
- **`releaseSustainedVoices(releaseTime)`** — `releaseVoice` for each, then clear the set.
- **`stopAllSounds`** gains `...sustainedVoices` in the list it kills, and clears the set. This
  is criterion 3's panic stop and it is one line.
- **`sustainedVoiceCount()`** — exported for the unit tests and the indicator.

Freeing the key in `sustainVoice` is what gives stacking for free: the next press of that key
finds `activeOscillators[key]` empty and builds a fresh voice over the top of the pedalled one.

### 2. Pedal state — `js/keys/sustainPedalState.js` (new)

Mirrors [playModeHandler.js](../../js/keys/playModeHandler.js)'s live-binding pattern, in
its own module so the handler and `noteKeyHandler` can both read it without a cycle:

```js
export let pedalDown = false;
export const setPedalDown = (down) => { pedalDown = down; };
```

### 3. The pedal key — `js/keys/sustainPedalHandler.js` (new)

Follows [rootKeyHandler.js](../../js/keys/rootKeyHandler.js): guard, set state, dispatch a
`CustomEvent` on `document.body` for whoever cares.

- **keydown** — ignore anything but `' '`, ignore `ev.repeat` and `shouldIgnoreKeyEvent`, then
  `ev.preventDefault()` (Space scrolls the page and presses a focused button), set the state,
  dispatch `pedalDown`, and light the indicator.
- **keyup** — **no guard beyond the key itself.** A pedal that cannot be lifted is the worst
  failure mode this feature has, and focus can move between the press and the release. Always
  lift.
- **`window` `blur`** — lift the pedal, for alt-tabbing away with Space held. Same reasoning as
  [viewToggle.js](../../js/config/viewToggle.js) clearing held keys: the keyup is never
  coming.

Wired in [index.html](../../index.html) alongside the other key handlers.

### 4. The playing rules — [js/keys/noteKeyHandler.js](../../js/keys/noteKeyHandler.js)

Four small changes, each one criterion-sized.

**a. A note key released under the pedal is pedalled, not stopped** (criterion 2). The light
still goes out on the keyup — it shows what is held, not what is sounding, which the existing
comment on `stopNoteForKey` already says:

```js
} else if (ev === 'keyup') {
  heldNoteKeys.delete(key);
  if (pedalDown) return pedalNoteForKey(key);
  stopNoteForKey(key);
}
```

**b. `rootReleased` does nothing while the pedal is down** (criterion 4):

```js
document.body.addEventListener('rootReleased', () => {
  // The pedal holds the chord across the gap between one root key and the next.
  if (pedalDown) return;
  heldNoteKeys.forEach(stopNoteForKey);
});
```

**c. `noteKeyMapChanged` respects the gap too**, so a register change during it does not undo
what (b) just protected — while keeping the pedal from *starting* anything:

```js
heldNoteKeys.forEach((key) => {
  const sounding = isSounding(key);
  // The pedal keeps a sounding note alive across a rootless gap, but never
  // starts one hold mode would not have started.
  const shouldSound = currentPlayMode !== 'hold' || heldRootKeys.size > 0 || (pedalDown && sounding);

  if (!shouldSound) return stopNoteForKey(key);
  if (sounding) return glideNoteToKey(key);
  playNoteForKey(key);
});
```

**d. Lifting the pedal releases what it was holding, and restores hold mode's rule** — the
mirror of `rootReleased`:

```js
document.body.addEventListener('pedalUp', () => {
  releaseSustainedVoices(releaseTime());

  // Hold mode's rule was only suspended, not repealed: with the pedal up and no
  // root down, the still-held keys go quiet.
  if (currentPlayMode === 'hold' && heldRootKeys.size === 0) heldNoteKeys.forEach(stopNoteForKey);
});
```

### 5. View switching — [js/config/viewToggle.js](../../js/config/viewToggle.js)

`showView` already stops all sounds (which now includes the sustained voices) and clears the
held-key state. Lift the pedal too, for the same reason the Sets are cleared: a pedal held
across a view change never gets its keyup. Criterion 3.

`Escape` deliberately leaves the pedal state alone. The pedal key is still physically down and
its keyup will arrive; panic stops the sound, it does not lift your foot.

### 6. The indicator — [index.html](../../index.html), [css/styles.css](../../css/styles.css)

A row in `#keys` beside `#playModeTable`:

```html
<div id="sustainPedalTable">Sustain: <span id="sustainPedal">up</span> (hold Space)</div>
```

Lit while the pedal is down via a class on the row, styled like `.active` / `.stop` next to the
existing `#playModeTable` rule. The player needs to see the pedal state for the same reason
they need to see the play mode: both change what the next keypress means.

---

## Tests

**Unit — [test/unit/audioHandler.test.js](../../test/unit/audioHandler.test.js)**, against
the existing `FakeAudioContext`:

1. `sustainVoice` frees the key — `isSounding` goes false — while the oscillator runs on,
   unstopped and at full gain.
2. The key can be played again afterwards, and both voices exist independently (stacking).
3. `releaseSustainedVoices` ramps each voice to zero over the release, stops it at the end, and
   empties the set; `onended` still tears down.
4. `releaseSustainedVoices(0)` stops them dead.
5. `stopAllSounds` kills sustained voices immediately, alongside active and releasing ones.
6. `sustainVoice` on a key with no voice is a no-op.

**Browser — `test/browser/sustain.test.js`** (new), modelled on
[envelope.test.js](../../test/browser/envelope.test.js) with `recordAudio`:

1. *Latch.* Pedal down, `q` down, `q` up → the key goes dark, no stop is scheduled, the voice
   is still sounding. Pedal up → one stop, scheduled with the release time.
2. *Stacking.* Under the pedal, `q` pressed, released and pressed again → two voices; pedal up
   → two stops.
3. **Criterion 4.** Hold mode, pedal down: root `0` and `q` held, `keyup 0` → the voice is not
   stopped and `q` stays lit. Then `keydown 1` → `__glides` gains an entry and `__sounds.length`
   is unchanged, proving the note glided into the new root rather than being re-struck.
4. **Criterion 4, the other reading.** Hold mode, pedal down, root `0` and `q` held. Release
   `q` first — the voice is sustained — then release `0` → it is still sounding, having no key
   left for `rootReleased` to reach. Pedal up → it releases.
5. Same gap as test 3, pedal up with no root held → the held note stops.
6. Hold mode, no root ever pressed, pedal down, `q` held → silent; a register change keeps it
   silent.
7. `Escape` with sustained voices ringing → everything stops at `stoppedIn === 0`.
8. Switching to the configuration view with the pedal down and voices sustained → all stopped,
   the indicator reads up, and returning to play logs no console errors.
9. Space is ignored while the configuration view is open or a field has focus, but a Space
   *keyup* with focus in a field still lifts the pedal — no stuck pedal.

Then the full suite: `npm test`. [playMode.test.js](../../test/browser/playMode.test.js) and
[glide.test.js](../../test/browser/glide.test.js) should pass untouched — if either changes,
the pedal has leaked into behaviour that has no pedal in it.

---

## What was built

| File | What changed |
| --- | --- |
| [js/audio/audioHandler.js](../../js/audio/audioHandler.js) | `releaseVoice` extracted, `sustainedVoices`, `sustainVoice`, `releaseSustainedVoices`, `sustainedVoiceCount`, panic stop widened |
| [js/keys/sustainPedalState.js](../../js/keys/sustainPedalState.js) | New — `pedalDown` and its setter |
| [js/keys/sustainPedalHandler.js](../../js/keys/sustainPedalHandler.js) | New — the Space key, the indicator, `pedalDown`/`pedalUp` events, `liftPedal` |
| [js/keys/noteKeyHandler.js](../../js/keys/noteKeyHandler.js) | `pedalNoteForKey`, and the four rules |
| [js/config/viewToggle.js](../../js/config/viewToggle.js) | Lifts the pedal on a view change |
| [index.html](../../index.html), [css/styles.css](../../css/styles.css) | The indicator row |
| [test/unit/audioHandler.test.js](../../test/unit/audioHandler.test.js) | 10 tests for the pedal, 1 more for the panic stop |
| [test/browser/sustain.test.js](../../test/browser/sustain.test.js) | New — 14 tests |
| [README.md](../../README.md) | The `Space` row, the pedal section, the code layout |

Two departures from the plan above:

- **`viewToggle` calls `liftPedal()` rather than setting the state directly**, so the indicator
  and the `pedalUp` event stay in one place, and it runs *before* `stopAllSounds` so the pedal
  hands its voices back before they are all stopped.
- **The indicator got two tests of its own**, which the plan did not list — the pedal is the
  first thing here whose state you cannot hear until you have already committed to it.

454 tests pass. [playMode.test.js](../../test/browser/playMode.test.js),
[glide.test.js](../../test/browser/glide.test.js) and
[envelope.test.js](../../test/browser/envelope.test.js) were not touched and still pass, which
is the check that the pedal did not leak into behaviour that has no pedal in it.

---

## Consequences and risks

- **Stacked voices sum.** Every gain node connects straight to `destination`, so a trill under
  the pedal grows louder with each strike and can clip. This is the honest cost of the piano-like
  choice, and it is pre-existing in kind — ten held keys already sum the same way — but the pedal
  makes it easy to reach. Out of scope here; the fix, if it bites, is a master gain node in
  `audioHandler` rather than a cap on voices, and it would improve chords generally.
- **Sustained notes do not glide** — the first row of the table, where the key is already up.
  Not a contradiction of criterion 4, which is the second row: a note whose key is still down is
  held through the gap *and* glides into the next root. By design, and consistent with released
  voices today: a root change moves what you are still holding and leaves the detached voices
  where they were. That is a pedal point, and it is arguably the most musical thing this story
  buys — but it will read as a bug to anyone expecting the whole sonority to move, so the README
  needs to say it plainly.

  Criterion 4 also holds under its stricter reading, by a different route. Release the key
  first, then the last root: `rootReleased` only stops keys in `heldNoteKeys`, and a sustained
  voice is neither in that set nor attached to a key, so it survives that release whatever the
  pedal check does. Test 4 covers it.
- **Focus swallows the first press.** After clicking **Play**, focus sits on that button and
  `shouldIgnoreKeyEvent` ignores the keys — Space included. Pre-existing and uniform across all
  the play keys, so it is not this story's to fix, but a `button.blur()` in `initViewToggle`'s
  click handler is a one-line improvement if it proves irritating during testing.
- **A stuck pedal is the failure mode to guard.** Hence the unguarded keyup, the `blur`
  listener, and test 9. Everything else the pedal can get wrong is audible immediately; this one
  leaves the instrument feeling broken with no obvious cause.
