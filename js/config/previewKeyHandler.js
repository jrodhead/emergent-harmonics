import { playSound, stopSound, setSoundFrequency } from '../audio/audioHandler.js';
import { isTypingTarget } from '../keys/keyEventGuard.js';
import { KEY_ROWS } from '../keys/buildAlphaKeyMap.js';
import { getSelectedDiapason } from './selectedDiapason.js';
import { ratioToFrequency } from './systemConfigState.js';

/**
 * The playing keys audition the notes of the diapason being edited, in order,
 * so a configuration can be heard while it is built. They are the same keys in
 * the same order the notes will be played from, and there are as many of them
 * as the keyboard has, so every note a diapason can hold can be heard.
 */
export const PREVIEW_KEY_ROWS = KEY_ROWS;
export const PREVIEW_KEYS = [...KEY_ROWS.join('')];

export const previewKeyForIndex = (noteIndex) => PREVIEW_KEYS[noteIndex];

const previewSoundKey = (noteIndex) => `config-preview-${previewKeyForIndex(noteIndex)}`;

// Which notes are sounding right now. Tracked rather than inferred from the
// page, because the rows are replaced whenever the screen redraws.
const soundingNotes = new Set();

const noteRow = (noteIndex) => document.querySelector(`.config-note[data-note-index="${noteIndex}"]`);

const startPreview = (noteIndex) => {
  const note = getSelectedDiapason().notes[noteIndex];
  if (!note) return;

  soundingNotes.add(noteIndex);
  playSound(
    ratioToFrequency(note.ratioToRoot),
    previewSoundKey(noteIndex),
    document.getElementById('oscillatorVolume').value,
    document.getElementById('waveShape').value,
  );
  noteRow(noteIndex)?.classList.add('active');
};

const stopPreview = (noteIndex) => {
  soundingNotes.delete(noteIndex);
  stopSound(previewSoundKey(noteIndex));
  noteRow(noteIndex)?.classList.remove('active');
};

/** Silences every previewed note, for leaving the screen or losing focus. */
export const stopAllPreviews = () => {
  [...soundingNotes].forEach(stopPreview);

  document.querySelectorAll('.config-note.active').forEach((row) => row.classList.remove('active'));
};

/**
 * Moves a sounding note to a new frequency. This is what makes a fader drag
 * audible while it happens: hold two notes, drag one, and the interval
 * between them moves under your hand.
 *
 * @param {number} noteIndex
 * @param {number} frequency
 */
export const retunePreview = (noteIndex, frequency) => {
  if (!soundingNotes.has(noteIndex)) return;

  setSoundFrequency(previewSoundKey(noteIndex), frequency);
};

/** Re-marks the sounding notes after a redraw has replaced their rows. */
export const markSoundingNotes = () => {
  soundingNotes.forEach((noteIndex) => noteRow(noteIndex)?.classList.add('active'));
};

const handlePreviewKey = (ev) => {
  if (ev.repeat) return;
  if (document.body.dataset.view !== 'config') return;

  const noteIndex = PREVIEW_KEYS.indexOf(ev.key);
  if (noteIndex === -1) return;

  if (ev.type === 'keyup') {
    // A sounding note always stops on its own key release, even though focus
    // may have moved into a field since it started: reaching for a fader
    // mid-note does exactly that, and the note would otherwise stick on.
    if (!soundingNotes.has(noteIndex)) return;

    ev.preventDefault();
    stopPreview(noteIndex);
    return;
  }

  // While a field has focus the key is being typed into it, not played.
  if (isTypingTarget(ev)) return;

  ev.preventDefault();
  startPreview(noteIndex);
};

export function initPreviewKeys() {
  document.body.addEventListener('keydown', handlePreviewKey);
  document.body.addEventListener('keyup', handlePreviewKey);

  // A key held while focus leaves the window never gets its keyup.
  window.addEventListener('blur', stopAllPreviews);
}
