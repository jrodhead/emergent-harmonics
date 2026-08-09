import { MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY } from '../system/generateSystem.js';
import { isPreset, presetLabel, presetOptions } from '../presets/registry.js';
import { presetToNotes } from './presetToScale.js';
import { degreeForIndex } from './degrees.js';
import { PERIOD_RATIO, foldRatioIntoPeriod } from '../system/period.js';
import { describeRatio } from '../format.js';
import { readStoredValue, writeStoredValue, clearStoredValue } from '../storage.js';

export const STORAGE_KEY = 'emergentHarmonics.systemConfig';
const CONFIG_VERSION = 2;
const DEFAULT_PRESET = 'major';
const DEFAULT_ROOT_FREQUENCY = 27;

// A note's ratio to its root always sits inside one period: 1 is the root,
// and the period ratio is the same note again, an octave above it.
export const MIN_RATIO = 1;
export const MAX_RATIO = PERIOD_RATIO;

let nextScaleNumber = 1;
const newScaleId = () => `scale-${nextScaleNumber++}`;

const listeners = new Set();

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const notify = () => {
  saveConfig();
  listeners.forEach((listener) => listener(config));
};

export const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const createDefaultConfig = () => {
  const id = newScaleId();

  return {
    version: CONFIG_VERSION,
    primaryRootFrequency: DEFAULT_ROOT_FREQUENCY,
    primaryScaleId: id,
    scales: [{ id, name: presetLabel(DEFAULT_PRESET), notes: presetToNotes(DEFAULT_PRESET, id) }],
  };
};

let config = createDefaultConfig();

export const getConfig = () => config;

export const getScale = (scaleId) => config.scales.find((scale) => scale.id === scaleId);

export const getPrimaryScale = () => getScale(config.primaryScaleId) ?? config.scales[0];

/** The frequency a note's Hz value is bounded by: root to its octave. */
export const noteBounds = () => ({
  minimum: config.primaryRootFrequency,
  maximum: config.primaryRootFrequency * MAX_RATIO,
});

export const ratioToFrequency = (ratio) => config.primaryRootFrequency * ratio;

export const frequencyToRatio = (frequency) => frequency / config.primaryRootFrequency;

export const setRootFrequency = (frequency) => {
  if (!Number.isFinite(frequency)) return;

  config.primaryRootFrequency = clamp(frequency, MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY);
  notify();
};

export const setPrimaryScale = (scaleId) => {
  if (!getScale(scaleId)) return;

  config.primaryScaleId = scaleId;
  notify();
};

export const addScale = () => {
  const id = newScaleId();

  config.scales.push({
    id,
    name: `Scale ${config.scales.length + 1}`,
    notes: presetToNotes(DEFAULT_PRESET, id),
  });
  notify();

  return id;
};

export const removeScale = (scaleId) => {
  // The system needs at least one scale to generate from.
  if (config.scales.length <= 1) return;

  config.scales = config.scales.filter((scale) => scale.id !== scaleId);

  if (config.primaryScaleId === scaleId) {
    config.primaryScaleId = config.scales[0].id;
  }

  // Notes pointing at the removed scale fall back to their own.
  config.scales.forEach((scale) => {
    scale.notes.forEach((note) => {
      if (note.rootScaleId === scaleId) note.rootScaleId = scale.id;
    });
  });

  notify();
};

export const renameScale = (scaleId, name) => {
  const scale = getScale(scaleId);
  if (!scale) return;

  scale.name = name;
  notify();
};

export const loadPresetIntoScale = (scaleId, presetId) => {
  const scale = getScale(scaleId);
  if (!scale) return;

  scale.notes = presetToNotes(presetId, scaleId);
  scale.name = presetLabel(presetId) ?? scale.name;
  notify();
};

/**
 * Whether a note can be taken out of its scale. The first note is the root
 * every other note is measured against, so the scale always keeps it.
 *
 * @param {number} noteIndex
 * @returns {boolean}
 */
export const canRemoveNote = (noteIndex) => noteIndex > 0;

/**
 * A degree is a note's position in the scale, so removing a note closes the
 * gap: dropping III leaves what were IV and V as the new III and IV.
 */
const renumberDegrees = (scale) => {
  scale.notes.forEach((note, noteIndex) => {
    note.degree = degreeForIndex(noteIndex);
  });
};

export const addNote = (scaleId) => {
  const scale = getScale(scaleId);
  if (!scale) return;

  const highestRatio = scale.notes.reduce((highest, note) => Math.max(highest, note.ratioToRoot), MIN_RATIO);
  // Drop the new note halfway between the highest existing note and the octave,
  // so it lands somewhere audible and in bounds without any guessing.
  const ratioToRoot = clamp((highestRatio + MAX_RATIO) / 2, MIN_RATIO, MAX_RATIO);

  scale.notes.push({
    degree: degreeForIndex(scale.notes.length),
    intervalName: describeRatio(ratioToRoot),
    ratioToRoot,
    rootScaleId: scaleId,
  });
  renumberDegrees(scale);
  notify();
};

export const removeNote = (scaleId, noteIndex) => {
  const scale = getScale(scaleId);
  if (!scale) return;

  if (!canRemoveNote(noteIndex) || noteIndex >= scale.notes.length) return;

  scale.notes.splice(noteIndex, 1);
  renumberDegrees(scale);
  notify();
};

/**
 * Applies a partial change to one note. Ratio changes are clamped into the
 * period; everything else is taken as given.
 */
export const updateNote = (scaleId, noteIndex, patch, { silent = false } = {}) => {
  const scale = getScale(scaleId);
  const note = scale?.notes[noteIndex];
  if (!note) return;

  if (patch.ratioToRoot !== undefined) {
    if (!Number.isFinite(patch.ratioToRoot)) return;
    patch = { ...patch, ratioToRoot: clamp(patch.ratioToRoot, MIN_RATIO, MAX_RATIO) };
  }

  Object.assign(note, patch);

  // A live slider drag would re-render the control out from under the pointer.
  if (silent) {
    saveConfig();
    return;
  }

  notify();
};

/**
 * Every name a note's rootScaleId can point at: the other configured scales,
 * then the built-in presets.
 */
export const rootScaleOptions = () => ({
  configured: config.scales.map((scale) => ({ value: scale.id, label: scale.name })),
  builtIn: presetOptions(),
});

const validateConfig = (candidate) => {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Configuration must be an object');
  }

  if (!Array.isArray(candidate.scales) || candidate.scales.length === 0) {
    throw new Error('Configuration must contain at least one scale');
  }

  const scales = candidate.scales.map((scale, scaleIndex) => {
    const id = typeof scale?.id === 'string' && scale.id ? scale.id : `scale-${scaleIndex + 1}`;
    const notes = Array.isArray(scale?.notes) ? scale.notes : [];

    if (notes.length === 0) {
      throw new Error(`Scale "${id}" has no notes`);
    }

    return {
      id,
      name: typeof scale?.name === 'string' && scale.name ? scale.name : id,
      notes: notes.map((note, noteIndex) => {
        const ratio = Number(note?.ratioToRoot);

        return {
          // A degree is positional, so it is taken from the order in the file
          // rather than from whatever the file claims it is.
          degree: degreeForIndex(noteIndex),
          intervalName: note?.intervalName ?? describeRatio(ratio),
          ratioToRoot: Number.isFinite(ratio) ? clamp(foldRatioIntoPeriod(ratio), MIN_RATIO, MAX_RATIO) : MIN_RATIO,
          rootScaleId: note?.rootScaleId,
        };
      }),
    };
  });

  const scaleIds = new Set(scales.map((scale) => scale.id));

  // Anything the imported file points at that we cannot resolve falls back to
  // the scale the note belongs to.
  scales.forEach((scale) => {
    scale.notes.forEach((note) => {
      if (scaleIds.has(note.rootScaleId)) return;

      if (!isPreset(note.rootScaleId)) note.rootScaleId = scale.id;
    });
  });

  const rootFrequency = Number(candidate.primaryRootFrequency);

  return {
    version: CONFIG_VERSION,
    primaryRootFrequency: Number.isFinite(rootFrequency)
      ? clamp(rootFrequency, MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY)
      : DEFAULT_ROOT_FREQUENCY,
    primaryScaleId: scaleIds.has(candidate.primaryScaleId) ? candidate.primaryScaleId : scales[0].id,
    scales,
  };
};

/**
 * Replaces the whole configuration, as an import or a restore from storage.
 * Throws if the candidate cannot be made into a usable system.
 */
export const replaceConfig = (candidate) => {
  config = validateConfig(candidate);

  // Keep generated ids clear of the ones we just took on.
  config.scales.forEach((scale) => {
    const generated = /^scale-(\d+)$/.exec(scale.id);
    if (generated) nextScaleNumber = Math.max(nextScaleNumber, Number(generated[1]) + 1);
  });

  notify();

  return config;
};

export const resetConfig = () => {
  config = createDefaultConfig();
  notify();

  return config;
};

export function saveConfig() {
  writeStoredValue(STORAGE_KEY, JSON.stringify(config));
}

/** Restores the stored configuration, falling back to the default. */
export function loadStoredConfig() {
  const stored = readStoredValue(STORAGE_KEY);

  if (!stored) return config;

  try {
    config = validateConfig(JSON.parse(stored));
  } catch (error) {
    console.error('Stored system configuration is unusable, starting fresh:', error);
  }

  return config;
}

/** Forgets the stored configuration and starts over from the default. */
export function clearStoredConfig() {
  clearStoredValue(STORAGE_KEY);

  return resetConfig();
}
