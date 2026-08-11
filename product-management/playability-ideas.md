# Playability Ideas

A backlog of ideas for the *playing* side of the app. Unrefined — these are candidates to pull
from, not committed work.

## Why

The system-building side is deep: preset families, per-note root scales, live retuning while
dragging a fader, warnings when a scale drifts from its preset or falls off the keyboard. The
playing side is thin by comparison — keys on, keys off, one waveform, one volume. Every idea
below comes from that asymmetry.

### What a root change actually is here

Worth stating plainly, because it drives the first group of ideas and because it is *not* what
a key change is in Western music.

In equal temperament, modulation is free: every key is the same shape and transposition is
exact. Two things in this system break that:

1. Each root note carries its own `rootScaleId`, so root key `3` may load a genuinely
   different scale rather than a transposition of the current one.
2. The ratios are just intervals, so a new root's notes are re-derived from a new fundamental
   rather than shifted from the old one.

There is also a third property, deliberate and now audible: **modulation cannot drift.**
`generateRootNotes` builds all ten roots once from `primaryRootFrequency`, so every root is an
absolute frequency measured from the original fundamental. Pressing `0 → 4 → 7 → 2 → 0` glides
a held chord out and back to exactly where it started; comma drift is impossible. That is a
safe design, and it is also the most interesting constraint in the app to put a switch on (see
*Chained roots*).

---

## Group 1 — Root changes

### Pivot highlighting

As someone deciding where to modulate, I want to see which notes the current scale shares with
a destination root, so that I can navigate by common tone the way just intonation invites.

**Acceptance Criteria:**
1. Given a candidate root, the note keys whose pitch is shared with the current scale are
   marked.
2. The marking is available before committing to the change.
3. Shared means the same sounding frequency, within a stated tolerance.

### Armed root change

As someone playing in time, I want to arm a root change that lands on my next note, so that I
can change root on the beat rather than between phrases.

**Acceptance Criteria:**
1. A root key can be armed rather than applied immediately.
2. An armed root takes effect on the next note key press.
3. The armed-but-not-yet-applied root is visible.
4. Arming can be cancelled.

### Momentary roots

As someone playing, I want a root change that snaps back when I release it, so that I can make
a brief excursion — the equivalent of a secondary dominant — without navigating back by hand.

**Acceptance Criteria:**
1. A root can be taken momentarily, returning to the previous root on release.
2. It composes with the existing latch and hold play modes rather than replacing them.

**Notes:** roots are sticky today; `hold` mode already requires a held root, so the interaction
between these needs thought before this is picked up.

### Chained roots (drift mode)

As someone exploring a system, I want the root I press to become the new fundamental, so that
modulation compounds and I can wander somewhere the fixed ten roots cannot reach.

**Acceptance Criteria:**
1. An optional mode in which pressing a root regenerates all ten roots from that root.
2. A way home, since return is no longer exact.
3. The distance from the original fundamental is shown, in cents.
4. The default mode remains the current, non-drifting behaviour.

**Notes:** the most interesting idea here and the largest. It changes the semantics of the
system rather than adding to them, and it wants the expressive layer in place first — drift is
hard to hear as expressive while notes still click on and off.

---

## Group 2 — The expressive layer

The "it feels like an instrument" group. Mostly absent today.

### Envelopes

As someone playing, I want notes to start and stop smoothly, so that the instrument does not
click on every keypress.

**Acceptance Criteria:**
1. Notes ramp up on press and down on release rather than switching instantly.
2. Attack and release are adjustable alongside the existing oscillator controls.
3. A released note's voice is cleaned up only once it has finished sounding.
4. Panic stop (`Escape`) still silences everything immediately.

**Notes:** `playSound` jumps gain from 0 to volume and `stopSound` calls `oscillator.stop()`
outright, so every note clicks at both ends. Probably the single largest change to how the app
*feels* per line of code.

### Sustain pedal

As someone playing chords, I want notes to continue after I release their keys until I lift a
pedal, so that I can hold a sonority through a root change.

**Acceptance Criteria:**
1. A held key acts as a sustain pedal.
2. Notes released while it is down keep sounding until it is lifted.
3. It interacts correctly with the latch and hold play modes, view switching, and panic stop.
4. A pedalled note survives the release of the last root in hold mode.

**Notes:** criterion 4 is what makes gliding work in hold mode. Changing root there means
releasing one root key and pressing the next, and the release silences the chord before the new
root arrives, so there is nothing left to glide unless the two root keys overlap. A pedal that
holds notes through that gap fixes it with no change to the glide itself.

### Drone key

As someone playing in just intonation, I want to hold the fundamental indefinitely, so that
the intervals I play have an audible reference.

**Acceptance Criteria:**
1. A key sustains the current fundamental until it is turned off.
2. The drone survives note and register changes.
3. Its behaviour on a root change is defined — either following the new root or staying put, by
   choice.

**Notes:** small, and arguably the highest musical value on this page. In just intonation an
interval only means something against a reference.

### Accent and dynamics

As someone playing, I want some control over how loud individual notes are, so that a phrase
can have shape.

**Acceptance Criteria:**
1. Notes can be played at more than one level.
2. The control is reachable while playing, without leaving the keyboard.

**Notes:** computer keyboards have no velocity. A modifier for accent, or a soft/loud toggle,
gets most of the way there.

---

## Group 3 — The feedback layer

The app knows the exact ratios of everything sounding, and currently says almost none of what
that buys.

### Live interval readout

As someone holding two or more notes, I want to see the interval between them, so that I can
hear and verify what just intonation is doing.

**Acceptance Criteria:**
1. While two or more notes sound, the interval between them is shown as a ratio.
2. Where it is near a simple ratio, the deviation is shown in cents.
3. The beat rate between them is shown in Hz.

**Notes:** pure arithmetic over `heldNoteKeys` and `noteKeyMap` — no audio analysis needed. The
beat rate is the number a player can actually hear and check, which makes it the most
convincing thing on this list.

### Consonance meter

As someone building a chord, I want to see how locked the current sonority is, so that I can
find the tunings that ring.

**Acceptance Criteria:**
1. A live indication of the consonance of everything currently sounding.
2. The measure it uses is stated, since there is no single correct one.

### Lattice position

As someone modulating around a system, I want to see where I have travelled, so that I do not
get lost.

**Acceptance Criteria:**
1. For systems that suit it, a lattice showing the current root's position.
2. It updates as the root changes.

**Notes:** becomes close to necessary if *Chained roots* is ever built.

---

## Suggested order

**Envelopes → sustain pedal → drone key.**

Gliding root changes is built. Envelopes come next because the glide only sounds beautiful once
the notes at either end of it are not clicking; the sustain pedal because the glide only matters
musically once a chord can be held through the change, and because it is what brings the glide
to hold mode. Together they finish turning the root key from a mode switch into a gesture.

*Live interval readout* is the best standalone pick — it depends on nothing else and it is what
makes the app's whole premise audible rather than theoretical.

*Chained roots* is the most exciting and should wait. It changes what the system means, and it
will read as broken rather than expressive until the expressive layer exists.
