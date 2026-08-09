import {
  getConfig,
  addDiapason,
  addNote,
  removeDiapason,
  removeNote,
  renameDiapason,
  replaceConfig,
  resetConfig,
  setPrimaryDiapason,
  setRootFrequency,
  updateNote,
  loadPresetIntoDiapason,
  loadStoredConfig,
  subscribe,
  ratioToFrequency,
  frequencyToRatio,
  clamp,
  MIN_RATIO,
  MAX_RATIO,
} from './systemConfigState.js';
import { getSelectedDiapason, getSelectedDiapasonId, setSelectedDiapasonId } from './selectedDiapason.js';
import { renderSystemConfig } from './renderSystemConfig.js';
import { initPreviewKeys, stopAllPreviews, retunePreview, markSoundingNotes } from './previewKeyHandler.js';
import { presetNames } from './presets.js';
import { buildSystemFromConfig } from '../system/buildSystem.js';
import { formatFrequency, formatRatio, describeRatio } from '../format.js';
import { MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY } from '../system/musicalSystemGenerator.js';

// Looked up in initSystemConfig rather than at import time, so that importing
// this module never depends on a document being there.
let configNotes;
let rootFrequencyInput;
let presetSelect;
let importFileInput;

/** Redraws the screen, keeping any note that is sounding marked as such. */
const render = () => {
  renderSystemConfig();
  markSoundingNotes();
};

const syncToolbar = () => {
  rootFrequencyInput.value = formatFrequency(getConfig().primaryRootFrequency);
};

const noteIndexFor = (element) => {
  const row = element.closest('.config-note');

  return row ? Number(row.dataset.noteIndex) : -1;
};

/* Editing values -------------------------------------------------------- */

/**
 * Ratio and frequency are two views of the same value, so writing one updates
 * the other in place rather than redrawing the row and losing the caret.
 */
const applyRatio = (row, noteIndex, ratio) => {
  const bounded = clamp(ratio, MIN_RATIO, MAX_RATIO);

  updateNote(getSelectedDiapasonId(), noteIndex, { ratioToRoot: bounded }, { silent: true });

  const frequency = ratioToFrequency(bounded);

  // Heard straight away, so an interval can be tuned by ear rather than by
  // stopping to listen after every adjustment.
  retunePreview(noteIndex, frequency);

  const ratioInput = row.querySelector('.config-note-ratio');
  const frequencyInput = row.querySelector('.config-note-hz');
  const slider = row.querySelector('.config-note-slider');
  const nameInput = row.querySelector('.config-note-name');

  if (document.activeElement !== ratioInput) ratioInput.value = formatRatio(bounded);
  if (document.activeElement !== frequencyInput) frequencyInput.value = formatFrequency(frequency);
  if (document.activeElement !== slider) slider.value = frequency;

  // A name that was only ever a description of the interval follows the ratio.
  if (nameInput.value === '' || nameInput.dataset.derived === 'true') {
    const derived = describeRatio(bounded);
    nameInput.value = derived;
    nameInput.dataset.derived = 'true';
    updateNote(getSelectedDiapasonId(), noteIndex, { relationshipToRootName: derived }, { silent: true });
  }
};

const handleConfigInput = (ev) => {
  const target = ev.target;
  const row = target.closest('.config-note');
  const noteIndex = noteIndexFor(target);

  if (!row || noteIndex < 0) return;

  if (target.classList.contains('config-note-ratio')) {
    const ratio = Number(target.value);
    if (Number.isFinite(ratio)) applyRatio(row, noteIndex, ratio);
  } else if (target.classList.contains('config-note-hz') || target.classList.contains('config-note-slider')) {
    const frequency = Number(target.value);
    if (Number.isFinite(frequency)) applyRatio(row, noteIndex, frequencyToRatio(frequency));
  } else if (target.classList.contains('config-note-name')) {
    target.dataset.derived = 'false';
    updateNote(getSelectedDiapasonId(), noteIndex, { relationshipToRootName: target.value }, { silent: true });
  }
};

const handleConfigChange = (ev) => {
  const target = ev.target;

  if (target === rootFrequencyInput) {
    const frequency = Number(target.value);

    if (!Number.isFinite(frequency)) {
      syncToolbar();
      return;
    }

    setRootFrequency(clamp(frequency, MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY));
    syncToolbar();
    return;
  }

  if (target.id === 'diapasonName') {
    renameDiapason(getSelectedDiapasonId(), target.value.trim() || getSelectedDiapason().name);
    return;
  }

  if (target.id === 'primaryDiapason') {
    setPrimaryDiapason(getSelectedDiapasonId());
    return;
  }

  const noteIndex = noteIndexFor(target);
  if (noteIndex < 0) return;

  if (target.classList.contains('config-note-triad')) {
    updateNote(getSelectedDiapasonId(), noteIndex, { triadType: target.value });
    return;
  }

  const isFrequencyField = target.classList.contains('config-note-ratio')
    || target.classList.contains('config-note-hz')
    || target.classList.contains('config-note-slider');

  // Committing a value regenerates the system and snaps any out-of-range field
  // back to the clamped value that was actually stored.
  if (isFrequencyField || target.classList.contains('config-note-name')) {
    const note = getSelectedDiapason().notes[noteIndex];
    updateNote(getSelectedDiapasonId(), noteIndex, { ratioToRoot: note.ratioToRoot });
  }
};

/* Structure ------------------------------------------------------------- */

const handleConfigClick = (ev) => {
  const target = ev.target;
  const remove = target.closest('.config-diapason-remove');

  if (remove) {
    // Selection moves off the diapason first, so the redraw lands on whichever
    // one is left rather than on the deleted id.
    if (remove.dataset.diapasonId === getSelectedDiapasonId()) setSelectedDiapasonId(null);
    stopAllPreviews();
    removeDiapason(remove.dataset.diapasonId);
    return;
  }

  const select = target.closest('.config-diapason-select');

  if (select) {
    stopAllPreviews();
    setSelectedDiapasonId(select.dataset.diapasonId);
    render();
    return;
  }

  if (target.id === 'addDiapason') {
    setSelectedDiapasonId(addDiapason());
    render();
    return;
  }

  if (target.id === 'addNote') {
    addNote(getSelectedDiapasonId());
    return;
  }

  if (target.classList.contains('config-note-remove')) {
    stopAllPreviews();
    removeNote(getSelectedDiapasonId(), noteIndexFor(target));
  }
};

/* Import and export ----------------------------------------------------- */

const exportConfig = () => {
  const blob = new Blob([JSON.stringify(getConfig(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'emergent-harmonics-system.json';
  link.click();
  URL.revokeObjectURL(url);
};

const importConfig = async (file) => {
  try {
    replaceConfig(JSON.parse(await file.text()));
    setSelectedDiapasonId(null);
    syncToolbar();
    render();
  } catch (error) {
    console.error('Could not import the system configuration:', error);
    alert(`That file is not a usable system configuration: ${error.message}`);
  }
};

/* Wiring ---------------------------------------------------------------- */

export function initSystemConfig() {
  configNotes = document.getElementById('configNotes');
  rootFrequencyInput = document.getElementById('configRootFrequency');
  presetSelect = document.getElementById('presetSelect');
  importFileInput = document.getElementById('importConfigFile');

  presetSelect.innerHTML = presetNames
    .map((name) => `<option value="${name}">${name}</option>`)
    .join('');

  loadStoredConfig();
  syncToolbar();
  render();
  buildSystemFromConfig();

  // Every change to the configuration is saved and pushed straight into the
  // playable system, so switching to the keyboard always plays what is shown.
  subscribe(() => {
    render();
    buildSystemFromConfig();
  });

  const systemConfig = document.getElementById('systemConfig');

  configNotes.addEventListener('input', handleConfigInput);
  systemConfig.addEventListener('change', handleConfigChange);
  systemConfig.addEventListener('click', handleConfigClick);

  document.getElementById('loadPreset').addEventListener('click', () => {
    stopAllPreviews();
    loadPresetIntoDiapason(getSelectedDiapasonId(), presetSelect.value);
  });

  document.getElementById('resetConfig').addEventListener('click', () => {
    stopAllPreviews();
    resetConfig();
    setSelectedDiapasonId(null);
    syncToolbar();
    render();
  });

  document.getElementById('exportConfig').addEventListener('click', exportConfig);
  document.getElementById('importConfig').addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', (ev) => {
    const [file] = ev.target.files;
    if (file) importConfig(file);
    ev.target.value = '';
  });

  initPreviewKeys();
}
