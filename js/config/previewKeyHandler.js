import { playSound, stopSound } from '../audio/audioHandler.js';
import { isTypingTarget } from '../keys/keyEventGuard.js';
import { getSelectedDiapason } from './selectedDiapason.js';
import { ratioToFrequency } from './systemConfigState.js';

/**
 * The top row of the keyboard auditions the notes of the diapason being
 * edited, in order, so a configuration can be heard while it is built.
 */
export const PREVIEW_KEYS = [...'qwertyuiop[]\\'];

export const previewKeyForIndex = (noteIndex) => PREVIEW_KEYS[noteIndex];

const previewSoundKey = (key) => `config-preview-${key}`;

const noteRow = (noteIndex) => document.querySelector(`.config-note[data-note-index="${noteIndex}"]`);

const startPreview = (noteIndex) => {
  const note = getSelectedDiapason().notes[noteIndex];
  if (!note) return;

  const key = previewKeyForIndex(noteIndex);

  playSound(
    ratioToFrequency(note.ratioToRoot),
    previewSoundKey(key),
    document.getElementById('oscillatorVolume').value,
    document.getElementById('waveShape').value,
  );
  noteRow(noteIndex)?.classList.add('active');
};

const stopPreview = (noteIndex) => {
  stopSound(previewSoundKey(previewKeyForIndex(noteIndex)));
  noteRow(noteIndex)?.classList.remove('active');
};

/** Silences every previewed note, for leaving the screen or losing focus. */
export const stopAllPreviews = () => {
  PREVIEW_KEYS.forEach((key, noteIndex) => stopPreview(noteIndex));
};

const handlePreviewKey = (ev) => {
  if (ev.repeat) return;
  if (document.body.dataset.view !== 'config') return;

  // While a field has focus the key is being typed into it, not played.
  if (isTypingTarget(ev)) return;

  const noteIndex = PREVIEW_KEYS.indexOf(ev.key);
  if (noteIndex === -1) return;

  ev.preventDefault();

  if (ev.type === 'keydown') {
    startPreview(noteIndex);
  } else {
    stopPreview(noteIndex);
  }
};

export function initPreviewKeys() {
  document.body.addEventListener('keydown', handlePreviewKey);
  document.body.addEventListener('keyup', handlePreviewKey);

  // A key held while focus leaves the window never gets its keyup.
  window.addEventListener('blur', stopAllPreviews);
}
