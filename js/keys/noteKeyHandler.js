import {
  playSound,
  stopSound,
  setSoundFrequency,
  isSounding,
  sustainVoice,
  releaseSustainedVoices,
} from '../audio/audioHandler.js';
import { noteKeyMap } from './mapNoteKeys.js';
import { heldRootKeys, heldNoteKeys } from './heldKeysState.js';
import { currentPlayMode } from './playModeHandler.js';
import { pedalDown } from './sustainPedalState.js';
import { shouldIgnoreKeyEvent } from './keyEventGuard.js';
import { attackTime, glideTimeConstant, releaseTime } from '../config/playSettings.js';

const playNoteForKey = (key) => {
  const keyData = noteKeyMap.find((item) => item.key === key);
  if (!keyData) return;

  const currentVolume = document.getElementById('oscillatorVolume').value;
  const waveShape = document.getElementById('waveShape').value;

  playSound(keyData.frequency, key, currentVolume, waveShape, attackTime());
  document.getElementById(key)?.classList.add('active');
};

// The key stops being lit at once while its voice fades out, because the light
// is showing what is held, not what is still sounding.
const stopNoteForKey = (key) => {
  stopSound(key, releaseTime());
  document.getElementById(key)?.classList.remove('active');
};

// The pedal is down, so the key is let go of but the note is not: the voice
// goes on sounding without it, and the light goes out on the same principle as
// above — the key is no longer held, whatever is still ringing.
const pedalNoteForKey = (key) => {
  sustainVoice(key);
  document.getElementById(key)?.classList.remove('active');
};

/**
 * Moves a note that is already sounding to the pitch its key now carries,
 * instead of stopping it and striking it again. This is what turns a root
 * change from a cut into a gesture: the chord slides into the new tuning.
 */
const glideNoteToKey = (key) => {
  const keyData = noteKeyMap.find((item) => item.key === key);

  // The key has no note in the new system, so there is nothing to glide to.
  if (!keyData) return stopNoteForKey(key);

  setSoundFrequency(key, keyData.frequency, glideTimeConstant());
  document.getElementById(key)?.classList.add('active');
};

/**
 * Handles key events for sound playback and UI changes.
 * @param {string} ev - The type of keyboard event ('keydown' or 'keyup').
 * @param {string} key - The key associated with the event.
 */
const handleNoteKey = (ev, key) => {
  if (ev === 'keydown') {
    heldNoteKeys.add(key);

    // In hold mode, a note only sounds while a root key is also held.
    if (currentPlayMode === 'hold' && heldRootKeys.size === 0) {
      return;
    }

    playNoteForKey(key);
  } else if (ev === 'keyup') {
    heldNoteKeys.delete(key);

    if (pedalDown) return pedalNoteForKey(key);

    stopNoteForKey(key);
  } else {
    // Log an error if unable to handle the key event
    console.error('Unable to handle key event:', ev);
  }
};

/**
 * Handles keyboard events for key presses and releases.
 * @param {Event} ev - The keyboard event.
 */
export const noteKeyHandler = (ev) => {
  if (ev.repeat || shouldIgnoreKeyEvent(ev)) return;

  // Find key data for the pressed key
  const keyData = noteKeyMap.find((item) => item.key === ev.key);
  if (!keyData) return;

  // Handle the key event
  handleNoteKey(ev.type, ev.key);
};

document.body.addEventListener('keydown', noteKeyHandler);
document.body.addEventListener('keyup', noteKeyHandler);

// The key map just redrew (new root, new register), so any already-held note
// needs to be moved onto the fresh elements and frequencies rather than left
// showing a stale (or now-missing) active state.
document.body.addEventListener('noteKeyMapChanged', () => {
  heldNoteKeys.forEach((key) => {
    const sounding = isSounding(key);
    // The pedal keeps a sounding note alive across a rootless gap, but never
    // starts one hold mode would not have started.
    const shouldSound = currentPlayMode !== 'hold' || heldRootKeys.size > 0 || (pedalDown && sounding);

    if (!shouldSound) return stopNoteForKey(key);

    // Held but silent — hold mode, the root pressed back down — has no voice
    // to move, so it is struck against the new map instead.
    if (sounding) return glideNoteToKey(key);

    playNoteForKey(key);
  });
});

// In hold mode, releasing the last held root silences whatever note keys
// are still down, like lifting the fretting hand off a still-picked string.
document.body.addEventListener('rootReleased', () => {
  // Unless the pedal is down, which is what holds a chord across the gap
  // between letting go of one root key and pressing the next. The notes never
  // leave their keys, so the next root still glides them.
  if (pedalDown) return;

  heldNoteKeys.forEach(stopNoteForKey);
});

document.body.addEventListener('pedalUp', () => {
  releaseSustainedVoices(releaseTime());

  // Hold mode's rule was suspended while the pedal was down, not repealed: with
  // no root held there is nothing for the still-held keys to sound against.
  if (currentPlayMode === 'hold' && heldRootKeys.size === 0) {
    heldNoteKeys.forEach(stopNoteForKey);
  }
});
