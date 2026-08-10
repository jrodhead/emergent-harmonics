import {
  getConfig,
  addScale,
  addNote,
  removeScale,
  removeNote,
  renameScale,
  replaceConfig,
  resetConfig,
  setPrimaryScale,
  setRootFrequency,
  updateNote,
  loadPresetIntoScale,
  presetsBroughtIn,
  loadStoredConfig,
  subscribe,
  ratioToFrequency,
  frequencyToRatio,
  clamp,
  MIN_RATIO,
  MAX_RATIO,
} from './systemConfigState.js';
import { getSelectedScale, getSelectedScaleId, setSelectedScaleId } from './selectedScale.js';
import { renderSystemConfig } from './renderSystemConfig.js';
import { initPreviewKeys, stopAllPreviews, retunePreview, markSoundingNotes } from './previewKeyHandler.js';
import { presetOptions } from '../presets/registry.js';
import { buildSystemFromConfig } from '../system/buildSystem.js';
import { formatFrequency, formatRatio, describeRatio } from '../format.js';
import { MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY } from '../system/generateSystem.js';

// Looked up in initSystemConfig rather than at import time, so that importing
// this module never depends on a document being there.
let configNotes;
let rootFrequencyInput;
let presetSelect;
let presetFamilyHint;
let importFileInput;

/** Redraws the screen, keeping any note that is sounding marked as such. */
const render = () => {
  renderSystemConfig();
  markSoundingNotes();
};

const syncToolbar = () => {
  rootFrequencyInput.value = formatFrequency(getConfig().primaryRootFrequency);
};

/**
 * Says what else a preset would bring in with it. Its degrees build other
 * scales, and those come in alongside it so they can be edited too.
 */
const syncPresetFamilyHint = () => {
  const brought = presetsBroughtIn(presetSelect.value);

  presetFamilyHint.textContent = brought.length
    ? `also brings in ${brought.join(' and ')}, which its degrees build`
    : '';
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

  updateNote(getSelectedScaleId(), noteIndex, { ratioToRoot: bounded }, { silent: true });

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
    updateNote(getSelectedScaleId(), noteIndex, { intervalName: derived }, { silent: true });
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
    updateNote(getSelectedScaleId(), noteIndex, { intervalName: target.value }, { silent: true });
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

  if (target.id === 'scaleName') {
    renameScale(getSelectedScaleId(), target.value.trim() || getSelectedScale().name);
    return;
  }

  if (target.id === 'primaryScale') {
    setPrimaryScale(getSelectedScaleId());
    return;
  }

  const noteIndex = noteIndexFor(target);
  if (noteIndex < 0) return;

  if (target.classList.contains('config-note-root-scale')) {
    updateNote(getSelectedScaleId(), noteIndex, { rootScaleId: target.value });
    return;
  }

  const isFrequencyField = target.classList.contains('config-note-ratio')
    || target.classList.contains('config-note-hz')
    || target.classList.contains('config-note-slider');

  // Committing a value regenerates the system and snaps any out-of-range field
  // back to the clamped value that was actually stored.
  if (isFrequencyField || target.classList.contains('config-note-name')) {
    const note = getSelectedScale().notes[noteIndex];
    updateNote(getSelectedScaleId(), noteIndex, { ratioToRoot: note.ratioToRoot });
  }
};

/* Structure ------------------------------------------------------------- */

const handleConfigClick = (ev) => {
  const target = ev.target;
  const remove = target.closest('.config-scale-remove');

  if (remove) {
    // Selection moves off the scale first, so the redraw lands on whichever
    // one is left rather than on the deleted id.
    if (remove.dataset.scaleId === getSelectedScaleId()) setSelectedScaleId(null);
    stopAllPreviews();
    removeScale(remove.dataset.scaleId);
    return;
  }

  const select = target.closest('.config-scale-select');

  if (select) {
    stopAllPreviews();
    setSelectedScaleId(select.dataset.scaleId);
    render();
    return;
  }

  if (target.id === 'addScale') {
    setSelectedScaleId(addScale());
    render();
    return;
  }

  if (target.id === 'addNote') {
    addNote(getSelectedScaleId());
    return;
  }

  if (target.classList.contains('config-note-remove')) {
    stopAllPreviews();
    removeNote(getSelectedScaleId(), noteIndexFor(target));
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
    setSelectedScaleId(null);
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
  presetFamilyHint = document.getElementById('presetFamilyHint');
  importFileInput = document.getElementById('importConfigFile');

  presetSelect.innerHTML = presetOptions()
    .map(({ value, label }) => `<option value="${value}">${label}</option>`)
    .join('');

  syncPresetFamilyHint();
  presetSelect.addEventListener('change', syncPresetFamilyHint);

  loadStoredConfig();
  syncToolbar();
  render();
  buildSystemFromConfig();

  // Every change to the configuration is saved and pushed straight into the
  // playable system, so switching to the keyboard always plays what is shown.
  subscribe(() => {
    render();
    syncPresetFamilyHint();
    buildSystemFromConfig();
  });

  const systemConfig = document.getElementById('systemConfig');

  configNotes.addEventListener('input', handleConfigInput);
  systemConfig.addEventListener('change', handleConfigChange);
  systemConfig.addEventListener('click', handleConfigClick);

  document.getElementById('loadPreset').addEventListener('click', () => {
    stopAllPreviews();
    loadPresetIntoScale(getSelectedScaleId(), presetSelect.value);
    syncPresetFamilyHint();
  });

  document.getElementById('resetConfig').addEventListener('click', () => {
    stopAllPreviews();
    resetConfig();
    setSelectedScaleId(null);
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
