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

The "it feels like an instrument" group. Four of it are built: *Envelopes* (see
[done-user-stories/oscillator_envelopes.md](done-user-stories/oscillator_envelopes.md)), the
*Sustain pedal* (see
[done-user-stories/playing_sustain-pedal.md](done-user-stories/playing_sustain-pedal.md), which
is on `Space` and holds a chord across a root change in hold mode as well as after a key
release), the *Drone key* (see
[done-user-stories/playing_drone-key.md](done-user-stories/playing_drone-key.md) — `` ` `` to
latch it on, `~` to switch between anchored and following, with its pitch and level configurable
and persisted), and the *Stereo drone pair* (see
[done-user-stories/playing_stereo-drone-pair.md](done-user-stories/playing_stereo-drone-pair.md)
— two voices straddling the drone pitch, spread by a ratio or by a number of hertz, panned
anywhere from together to opposite ears, with what they are doing to each other on screen).

### Accent and dynamics

As someone playing, I want some control over how loud individual notes are, so that a phrase
can have shape.

**Acceptance Criteria:**
1. Notes can be played at more than one level.
2. The control is reachable while playing, without leaving the keyboard.

**Notes:** computer keyboards have no velocity. A modifier for accent, or a soft/loud toggle,
gets most of the way there.

### Drone wave shape

As someone using the drone pair to hear beating, I want the drone to have a wave shape of its
own, so that I can put partials under the drone without playing over a sawtooth.

**Acceptance Criteria:**
1. The drone's wave shape is configurable separately from the note keys'.
2. What each display says about a beat is true of the voices actually sounding it.

**Notes:** refused by the *Stereo drone pair*, which is where the need for it is clearest: half
of that story's table of regimes is unreachable on the default sine, and the pair covers the trap
with words instead. It is a story of its own because a *per-voice* wave shape is an audio-layer
change, not a drone one — `soundingVoices` would carry the shape, the interval readout would have
to rule that a beat between partials needs partials in both voices, and `consonanceOf` builds its
partials for the whole sonority from a single shape.

Criterion 2 is the part that is already wrong and would be fixed on the way: the readout and the
meter both redraw when the wave shape control moves, as though a sounding voice's shape had
changed with it. It has not — `playSound` sets `oscillator.type` at the strike and nothing updates
it — so switching to a sawtooth mid-chord says the beats on screen have become audible while the
oscillators making them are still sines.

---

## Group 3 — The feedback layer

The app knows the exact ratios of everything sounding, and currently says almost none of what
that buys. Two of it are built. The *Live interval readout* (see
[done-user-stories/playing_live-interval-readout.md](done-user-stories/playing_live-interval-readout.md))
pairs every sounding voice — note keys, pedalled notes and the drone alike — and shows the ratio,
the deviation in cents, and the beat rate between their coinciding partials. The *Consonance
meter* (see [done-user-stories/playing_consonance-meter.md](done-user-stories/playing_consonance-meter.md))
puts one Plomp–Levelt roughness reading over the whole sonority, with the measure named on screen.

The two answer different questions and neither replaces the other: the readout catches a fifth a
few cents off, which is a slow beat and barely a roughness; the meter catches a chord that grinds,
including when it grinds only because of the register it is being played in.

Between them they left three things the rest of this group inherits: `js/system/interval.js` and
`js/system/consonance.js`, both pure, and `soundingVoices()` in the audio layer, which is the set
of voices to point either at.

### Lattice position

As someone modulating around a system, I want to see where I have travelled, so that I do not
get lost.

**Acceptance Criteria:**
1. For systems that suit it, a lattice showing the current root's position.
2. It updates as the root changes.

**Notes:** becomes close to necessary if *Chained roots* is ever built.

### Keys only play when lower case

I unknowingly had Caps Lock on and couldn't get any of the keys to work except non-alpha keys. They started working after I disabled it.

---

## Suggested order

**1. Accent and dynamics** — the last of the *Why* this page was written about.

Three of the four things named in it as thin — one waveform, keys clicking on and off, no
sustain — have been dealt with. "One volume" is what is left, and `setSoundVolume` was built by
the drone story specifically for it, so what remains is a modifier key and a level choice.

**2. Drone wave shape** — small, and it fixes something that is currently wrong.

The *Stereo drone pair* named it and declined it. Its second criterion is a bug rather than a
feature, and the fix — the wave shape stored on the voice rather than read off a select — is the
same one line that makes the drone's own shape possible.

*Chained roots* is still the most exciting and should still wait. It changes what the system
means, and it will read as broken rather than expressive until the expressive layer exists. Its
criterion 3 — the distance from the original fundamental, in cents — is now `centsBetween`.

**A note on cost, which this page does not otherwise track.** *Pivot highlighting* has quietly
become small too: its "same sounding frequency, within a stated tolerance" is `centsBetween` plus
a constant. Worth re-reading the Group 1 estimates before picking from them, since several were
written when nothing underneath them existed.
