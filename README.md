# Emergent Harmonics

A configurable musical system generator played from the computer keyboard.

Instead of fixing the twelve notes of a piano, you describe a system as **frequency ratios**
and say what each note builds when it becomes a root. The app turns that description into a
playable keyboard: the roots on the number keys, the notes on the letter keys, spread across
every octave that fits inside human hearing.

It is a static site — plain ES modules, no build step, no dependencies. Sound comes from the
Web Audio API; the configuration is stored in `localStorage` and can be exported to and
imported from JSON.

---

## Running it

```sh
npm start           # serves the project at http://localhost:8765
```

Then open <http://localhost:8765>. Any static file server works — the only requirement is
HTTP rather than `file://`, because the app loads ES modules.

```sh
npm test            # everything
npm run test:unit   # pure logic, no browser (313 tests, fast)
npm run test:browser # drives real Chrome over the DevTools protocol
```

The browser tests look for Chrome, Chromium, or Edge in the usual places (override with
`CHROME_PATH`) and skip themselves cleanly when none is installed.

There is no bundler, transpiler, linter, or `node_modules` — `npm test` runs `node --test`
directly.

---

## Terminology

The app has its own vocabulary, and the code uses it consistently. It is worth reading once.

| Term | What it means |
| --- | --- |
| **Ratio to root** | How a note is defined: a multiplier on its root's frequency. `3/2` is a perfect fifth above the root. Always between `1` and `2` — one period. |
| **Period** | The interval a scale repeats at. Here it is the octave, `2:1`, held in one constant ([js/system/period.js](js/system/period.js)) so a system that repeats at something else (Bohlen-Pierce, stretched tunings) has one place to come in through. The UI says "octave" wherever it speaks to you. |
| **Note** | One entry in a scale: a degree, a name, a ratio to root, and the scale it builds when it is the root. |
| **Degree** | A note's *position* in its scale, written as a Roman numeral — I, II, III… Positional, so removing a note renumbers everything after it. |
| **Interval name** | A note's label — "Perfect 5th", or an automatic `702 cents` when there is no conventional name. |
| **Scale** | An ordered list of notes inside one period. A system holds several. |
| **Primary scale** | The one scale the whole system is generated from. Its notes become the root notes on keys `0`–`9`. |
| **Root scale** | Per note: which scale the keyboard builds when *that* note is the root. This is the mechanism that makes the system emergent rather than flat — each root key can play a different scale. |
| **Root frequency** | The frequency every ratio in the system is ultimately measured from. Default `432` Hz. |
| **Root note** | A generated pitch sitting on one of the ten root keys, produced by applying a primary-scale note's ratio to the root frequency. |
| **Register** | One scale laid out at one particular octave — the notes you actually play. |
| **Period shift** | How many octaves a register (or a repeated root note) sits above or below its root. Shown next to the degree: `V +1`, `III −2`. |
| **Preset** | A built-in scale you can load and then edit. |
| **Preset family** | The set of presets a preset reaches through its notes' root scales. Major's degrees build the natural minor and diminished scales, so loading Major brings all three in — otherwise a root key would play a scale you could not see or edit. |
| **Play mode** | `latch` or `hold` — see [Playing](#playing-the-system). |

### How a system is generated

1. **Root notes.** The primary scale's notes are applied to the root frequency and placed on
   keys `0`–`9`. A scale with fewer than ten notes repeats up the octaves to fill the
   remaining keys, so no root key is dead — five notes make keys `5`–`9` an octave above
   `0`–`4`. Repeats that climb past 20 kHz are dropped rather than mapped to silence.
2. **Registers.** Press a root key and the app looks up that note's *root scale*, then builds
   that scale at every octave shift whose notes all fit between 20 Hz and 20 kHz. Those are the
   registers, ordered low to high.
3. **Note keys.** The registers are laid across the three letter rows, one register higher per
   row. A register shorter than a row keeps borrowing from the register above it so no key on
   a filled row is silent; a register longer than a row spills onto the row below before the
   climb resumes ([js/keys/buildNoteKeyMap.js](js/keys/buildNoteKeyMap.js)).

Changing the root mid-play keeps you in the octave you were already in rather than dropping
you back to the new root's own register.

---

## Building a system

Open **Configure System**. Everything you change is saved immediately and pushed straight into
the playable keyboard, so switching to **Play** always plays what is on screen.

### The toolbar

- **Root** — the frequency the whole system is measured from, 20–20000 Hz.
- **Preset** + **Load into scale** — loads the chosen preset into the *currently selected*
  scale, along with the rest of its family. The hint beside it says what else the load will do
  before you commit: which scales it brings in, and — when you are loading into the primary
  scale — which existing ones it clears, because loading into the primary scale is a statement
  about what the whole system is.
- **Export JSON** / **Import JSON** / **Reset** — the system as a file, or back to the default
  (Pythagorean at 432 Hz).

### Scales

Tabs across the top, each showing its note count and marking the **primary** one. `+ Add scale`
starts a fresh scale whose degrees all point back at itself.

Two warnings appear when the configuration has drifted:

- **Unreached scales.** A scale nothing on the keyboard can play — no note of the primary scale
  names it as its root scale. The app names it and offers to remove it rather than deleting
  work you may still be doing.
- **Edited away from a preset.** A scale still carrying a preset's name after its notes have
  been changed. Give it a name of its own, or load the preset again.

### Notes

Each note is a channel strip, laid out across the screen like a mixer:

- **Name** — free text. Left alone it follows the ratio automatically, as a cents value; type
  your own and it stops following.
- **Ratio to root** — the definition of the note, clamped into `1`–`2`.
- **Root scale** — what the keyboard builds when this note is the root. You can pick another
  configured scale or a built-in preset; choosing a preset here on the *primary* scale brings
  that preset in as a real, editable scale, since a root key must play something you can see.
- **Fader** and **Hz** — the same value as a frequency, bounded by the root and its octave.
- **Preview key** — the key that auditions this note.

`+ Add note` drops a new note halfway between the highest existing one and the octave. The
first note is the scale's root and cannot be removed.

**Tuning by ear:** hold a note's preview key and drag its fader. The sounding note glides to
follow, so you can hold two notes and move the interval between them under your hand. Preview
keys are the same keys, in the same order, that you will later play the scale from:
`qwertyuiop`, `asdfghjkl;`, `zxcvbnm,./` — thirty of them, so any scale that fits the keyboard
can be heard. They do not fire while a text field has focus, but a note started before you
reached for a fader still stops on its own key release.

Only the first ten notes of the primary scale get root keys; the screen says so when a scale
overflows.

### The exported file

```jsonc
{
  "version": 2,
  "primaryRootFrequency": 432,
  "primaryScaleId": "scale-1",
  "scales": [
    {
      "id": "scale-1",
      "name": "Pythagorean",
      "fromPreset": "pythagorean",   // optional: which preset it came from
      "editedFromPreset": true,      // optional: and that it has changed since
      "notes": [
        {
          "degree": "I",             // recomputed from position on import
          "intervalName": "Root",
          "ratioToRoot": 1,
          "rootScaleId": "scale-1"   // a scale id, or a built-in preset id
        }
      ]
    }
  ]
}
```

Import is defensive: ratios are folded into one period and clamped, degrees are renumbered from
their actual order, and anything pointing at a scale that is not in the file falls back to the
scale the note belongs to. A file that cannot be made into a usable system is rejected with a
message rather than half-loaded.

### Built-in presets

`Major`, `Natural minor`, `Diminished`, `Major pentatonic`, `Minor pentatonic`, `Blues`,
`Pythagorean` (the default), `HD 110067` (the orbital resonances of that six-planet system),
`Exploratory`, `Fibonacci`, and `Equal temperament` (computed by dividing the period, not
written out). They live in [js/presets/](js/presets/) — adding one is a notes array plus a line
in [js/presets/registry.js](js/presets/registry.js).

---

## Playing the system

Switch to **Play**. Sound starts on the first key press (browsers require a gesture before
audio).

| Keys | What they do |
| --- | --- |
| `0`–`9` | Choose the root note. Rebuilds the note keys from that note's root scale. |
| `qwertyuiop` | Note keys, lowest row — the current register. |
| `asdfghjkl;` | Note keys, one register higher. |
| `zxcvbnm,./` | Note keys, one register higher again. |
| `↑` / `↓` | Move the note keys up or down a register. |
| `Escape` | Panic — stop every sound. |
| `*` | Switch play mode. |
| `Space` | Sustain pedal — hold it down and released notes go on sounding. |
| `` ` `` | Drone on or off. It latches: press once to start, once to stop. |
| `~` | Switch the drone between anchored and following. |

Chords work: hold as many note keys as you like. Changing root or register while notes are held
**glides** them into their new frequencies rather than stopping and re-striking them, so a
modulation is a gesture rather than a cut. Because the ten roots are all measured from the same
fundamental, a trip like `0 → 4 → 7 → 2 → 0` slides back to exactly where it started. A held key
with no note in the new system stops instead, having nowhere to glide to.

**Play modes** (shown at the bottom of the keyboard, toggled with `*`):

- **latch** — note keys sound on their own, for as long as you hold them.
- **hold** — a note only sounds while a root key is *also* held, and releasing the last root
  silences everything still down. Like lifting the fretting hand off a still-ringing string.
  To glide between roots in this mode, either press the new root *before* releasing the old one,
  or hold the sustain pedal — otherwise releasing the last root silences the chord and leaves
  nothing to glide.

**The sustain pedal** (`Space`, shown beside the play mode) holds notes on after their keys are
let go, and what it does depends on whether the key is still down when the root changes:

- **Key already up.** The voice is handed to the pedal. It goes on sounding at full volume until
  you lift, but it no longer belongs to a key, so a root change leaves it where it was — a pedal
  point under the modulation. Striking the key again starts a second voice over the top, as a
  piano does, and both release together when you lift.
- **Key still down.** Nothing is handed over; the pedal only suspends hold mode's silencing. This
  is what carries a chord across the gap between letting go of one root key and pressing the
  next, and because the notes never leave their keys they still **glide** into the new root.

So the key decides whether a note follows a modulation, and the pedal decides whether it survives
one. Lifting the pedal fades everything it was holding, and hands the still-held keys back to
hold mode's rule. `Escape` silences pedalled notes like any other, and switching views lifts the
pedal for you.

**The drone** (`` ` ``, shown beside the pedal) holds a single reference pitch under whatever you
play, indefinitely. It belongs to the system rather than to a key, so nothing on the keyboard
disturbs it: notes, chords, register changes, hold mode and the pedal all leave it exactly where
it is. Only `Escape` and a view change stop it, and both turn it *off* rather than merely silent,
so the next `` ` `` starts it again.

`~` switches how it treats a root change, and the current mode is shown next to it:

- **anchored** (the default) — a fixed reference. It sounds the system's *fundamental*, the
  frequency every ratio is measured from, whatever root key you are on. Modulate freely and the
  drone stays put, which is what lets you hear where each new root sits.
- **following** — a unison on every root. The drone glides onto the new root as you change it, so
  each chord is heard against its own tonic rather than against the fundamental.

Switching modes while it sounds glides it across rather than re-striking it. Note that anchored
means the fundamental, not wherever you happened to be when you switched the drone on: turn it on
while root `4` is selected and it still sounds the fundamental. Switch to following and back if
you want the drone on the root you are standing on.

Each key shows its degree and period shift, its ratio, its interval name, and its frequency;
each root key also shows which scale it builds.

The **Oscillator Configuration** footer sets the waveform (sine, square, sawtooth, triangle)
and the volume, and applies to both the keyboard and the configuration previews.

Five controls shape how the keyboard plays, and all five are remembered between visits:

- **Attack** — how long a note takes to swell to full volume when it is struck, 0 to 2000 ms.
- **Release** — how long it goes on sounding after its key is let go, 0 to 2000 ms. The key
  itself is free the instant you release it, so you can strike it again over its own decay.
- **Glide** — how long a held note takes to reach its new pitch, 0 to 500 ms; at 0 the note
  arrives at once, still without being re-struck.
- **Drone pitch** — where the drone sits relative to the pitch it is a reference for, from three
  periods below to one above. A period below is the default, which puts it under your hands
  rather than in among them.
- **Drone level** — how loud the drone is, in its own right rather than as a fraction of the
  oscillator volume. It starts below the level the note keys use, because a reference that
  competes with the notes is not being used as a reference.

Both drone controls differ from everything else in that footer in one way: they are heard *as you
move them*. Every other control here is read when a note is struck, but the drone is already
sounding when you reach for the fader, so it glides and re-levels under the pointer.

At 0 the attack and release switch the note on and off outright, which clicks — that click is
what they exist to remove. `Escape` still silences everything on the spot, including notes part
way through a long release.

---

## Code layout

```
index.html                  Static shell: toolbar, both views, oscillator controls
css/styles.css              Including the [data-view] rules that swap config ↔ play
js/main.js                  Wires up the configuration screen, the play settings and the
                            view toggle

js/system/
  period.js                 PERIOD_RATIO, and folding ratios into one period
  generateSystem.js         Root notes across keys 0-9; registers across the audible range
  droneFrequency.js         An anchor shifted by periods, pulled back into hearing. Pure
  buildSystem.js            Regenerates the playable system from the configuration
  state.js                  The generated system: root notes, registers, current indices

js/config/
  systemConfigState.js      The configuration itself: scales, notes, presets, validation,
                            persistence, and a subscribe() that redraws and rebuilds
  systemConfigHandler.js    Event wiring for the configuration screen
  renderSystemConfig.js     Its markup
  previewKeyHandler.js      Auditioning notes while editing, including live retuning
  rootScales.js             Resolving a note's rootScaleId to notes and to a label
  degrees.js                Roman numerals by position
  selectedScale.js          Which scale is being edited (screen state, not system state)
  playSettings.js           How the keyboard plays rather than what: the attack, release,
                            glide and the drone's pitch and level, persisted
  playSettingsHandler.js    Event wiring for those five controls, and the playSettingChanged
                            event the drone follows
  viewToggle.js             config ↔ play, clearing held keys on the way

js/keys/
  buildNoteKeyMap.js        Registers → keys. Pure, so it can be tested on its own
  mapNoteKeys.js            Applies a key map and redraws
  noteKeyHandler.js         Note keys, including the latch/hold and pedal rules, and gliding
                            held notes through a root or register change
  rootKeyHandler.js         Root keys 0-9
  arrowKeyHandler.js        Register changes
  escapeKeyHandler.js       Panic stop
  playModeHandler.js        The * toggle
  sustainPedalHandler.js    The Space pedal: the key, the indicator, and the pedalUp event
  sustainPedalState.js      Whether it is down, read by the note keys
  droneHandler.js           The ` drone and its ~ mode: a voice that belongs to the system
                            rather than to a key
  keyEventGuard.js          Ignoring keys typed into fields, or pressed in the config view

js/audio/audioHandler.js    Web Audio: play, retune, re-level, release, stop everything. Holds
                            the voices still fading after their key was let go, and the ones the
                            sustain pedal is keeping alive
js/format.js                Shared display formatting (frequencies, ratios, degrees, cents)
js/storage.js               localStorage that degrades to memory when it is unavailable
```

`test/unit/` covers the pure logic; `test/browser/` drives the real page in Chrome over the
DevTools protocol, serving the project from a temporary static server.
