# Envelopes

## Attack and release

As someone playing, I want notes to start and stop smoothly, so that the instrument does not
click on every keypress.

**Acceptance Criteria:**
1. Notes ramp up on press and down on release rather than switching instantly.
2. Attack and release are adjustable alongside the existing oscillator controls.
3. A released note's voice is cleaned up only once it has finished sounding.
4. Panic stop (`Escape`) still silences everything immediately.

**Notes:** the release is what splits a voice's life from its key's. A key is free the instant
it is let go, so it can be struck again over its own decay, while the voice it left behind goes
on sounding in the tuning it was released in — a root change no longer reaches it. Both controls
sit beside the glide as play settings, since they say how the keyboard plays rather than what it
plays, and so never travel inside an exported system.
