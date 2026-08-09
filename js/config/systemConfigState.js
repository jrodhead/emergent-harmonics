import { MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY } from '../scaleCalculators/musicalSystemGenerator.js';
import { isBuiltInSystem, canonicalSystemName } from '../scaleCalculators/noteGenerators.js';
import { presetToNotes, presetNames, degreeForIndex, foldRatioIntoDiapason } from './presets.js';
import { describeRatio } from '../format.js';
import { readStoredValue, writeStoredValue, clearStoredValue } from '../storage.js';

export const STORAGE_KEY = 'emergentHarmonics.systemConfig';
const CONFIG_VERSION = 1;
const DEFAULT_PRESET = 'majorScaleNotes';
const DEFAULT_ROOT_FREQUENCY = 27;

// A note's ratio to its root always sits inside one diapason: 1 is the root,
// 2 is the octave above it.
export const MIN_RATIO = 1;
export const MAX_RATIO = 2;

let nextDiapasonNumber = 1;
const newDiapasonId = () => `diapason-${nextDiapasonNumber++}`;

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
  const id = newDiapasonId();

  return {
    version: CONFIG_VERSION,
    primaryRootFrequency: DEFAULT_ROOT_FREQUENCY,
    primaryDiapasonId: id,
    diapasons: [{ id, name: 'Major', notes: presetToNotes(DEFAULT_PRESET, id) }],
  };
};

let config = createDefaultConfig();

export const getConfig = () => config;

export const getDiapason = (diapasonId) => config.diapasons.find((diapason) => diapason.id === diapasonId);

export const getPrimaryDiapason = () => getDiapason(config.primaryDiapasonId) ?? config.diapasons[0];

/** The frequency a note's Hz value is bounded by: root to its octave. */
export const diapasonBounds = () => ({
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

export const setPrimaryDiapason = (diapasonId) => {
  if (!getDiapason(diapasonId)) return;

  config.primaryDiapasonId = diapasonId;
  notify();
};

export const addDiapason = () => {
  const id = newDiapasonId();

  config.diapasons.push({
    id,
    name: `Diapason ${config.diapasons.length + 1}`,
    notes: presetToNotes(DEFAULT_PRESET, id),
  });
  notify();

  return id;
};

export const removeDiapason = (diapasonId) => {
  // The system needs at least one diapason to generate from.
  if (config.diapasons.length <= 1) return;

  config.diapasons = config.diapasons.filter((diapason) => diapason.id !== diapasonId);

  if (config.primaryDiapasonId === diapasonId) {
    config.primaryDiapasonId = config.diapasons[0].id;
  }

  // Notes pointing at the removed diapason fall back to their own.
  config.diapasons.forEach((diapason) => {
    diapason.notes.forEach((note) => {
      if (note.triadType === diapasonId) note.triadType = diapason.id;
    });
  });

  notify();
};

export const renameDiapason = (diapasonId, name) => {
  const diapason = getDiapason(diapasonId);
  if (!diapason) return;

  diapason.name = name;
  notify();
};

export const loadPresetIntoDiapason = (diapasonId, presetName) => {
  const diapason = getDiapason(diapasonId);
  if (!diapason) return;

  diapason.notes = presetToNotes(presetName, diapasonId);
  diapason.name = presetName;
  notify();
};

/**
 * Whether a note can be taken out of its diapason. The first note is the root
 * every other note is measured against, so the diapason always keeps it.
 *
 * @param {number} noteIndex
 * @returns {boolean}
 */
export const canRemoveNote = (noteIndex) => noteIndex > 0;

/**
 * A degree is a note's position in the diapason, so removing a note closes the
 * gap: dropping III leaves what were IV and V as the new III and IV.
 */
const renumberDegrees = (diapason) => {
  diapason.notes.forEach((note, noteIndex) => {
    note.degree = degreeForIndex(noteIndex);
  });
};

export const addNote = (diapasonId) => {
  const diapason = getDiapason(diapasonId);
  if (!diapason) return;

  const highestRatio = diapason.notes.reduce((highest, note) => Math.max(highest, note.ratioToRoot), MIN_RATIO);
  // Drop the new note halfway between the highest existing note and the octave,
  // so it lands somewhere audible and in bounds without any guessing.
  const ratioToRoot = clamp((highestRatio + MAX_RATIO) / 2, MIN_RATIO, MAX_RATIO);

  diapason.notes.push({
    degree: degreeForIndex(diapason.notes.length),
    relationshipToRootName: describeRatio(ratioToRoot),
    ratioToRoot,
    triadType: diapasonId,
  });
  renumberDegrees(diapason);
  notify();
};

export const removeNote = (diapasonId, noteIndex) => {
  const diapason = getDiapason(diapasonId);
  if (!diapason) return;

  if (!canRemoveNote(noteIndex) || noteIndex >= diapason.notes.length) return;

  diapason.notes.splice(noteIndex, 1);
  renumberDegrees(diapason);
  notify();
};

/**
 * Applies a partial change to one note. Ratio changes are clamped into the
 * diapason; everything else is taken as given.
 */
export const updateNote = (diapasonId, noteIndex, patch, { silent = false } = {}) => {
  const diapason = getDiapason(diapasonId);
  const note = diapason?.notes[noteIndex];
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
 * Every name a note's triadType can point at: the other configured diapasons,
 * then the built-in calculators.
 */
export const triadTypeOptions = () => ({
  configured: config.diapasons.map((diapason) => ({ value: diapason.id, label: diapason.name })),
  builtIn: presetNames.map((name) => ({ value: name, label: name })),
});

const validateConfig = (candidate) => {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Configuration must be an object');
  }

  if (!Array.isArray(candidate.diapasons) || candidate.diapasons.length === 0) {
    throw new Error('Configuration must contain at least one diapason');
  }

  const diapasons = candidate.diapasons.map((diapason, diapasonIndex) => {
    const id = typeof diapason?.id === 'string' && diapason.id ? diapason.id : `diapason-${diapasonIndex + 1}`;
    const notes = Array.isArray(diapason?.notes) ? diapason.notes : [];

    if (notes.length === 0) {
      throw new Error(`Diapason "${id}" has no notes`);
    }

    return {
      id,
      name: typeof diapason?.name === 'string' && diapason.name ? diapason.name : id,
      notes: notes.map((note, noteIndex) => {
        const ratio = Number(note?.ratioToRoot);

        return {
          // A degree is positional, so it is taken from the order in the file
          // rather than from whatever the file claims it is.
          degree: degreeForIndex(noteIndex),
          relationshipToRootName: note?.relationshipToRootName ?? describeRatio(ratio),
          ratioToRoot: Number.isFinite(ratio) ? clamp(foldRatioIntoDiapason(ratio), MIN_RATIO, MAX_RATIO) : MIN_RATIO,
          triadType: note?.triadType,
        };
      }),
    };
  });

  const diapasonIds = new Set(diapasons.map((diapason) => diapason.id));

  // Anything the imported file points at that we cannot resolve falls back to
  // the diapason the note belongs to.
  diapasons.forEach((diapason) => {
    diapason.notes.forEach((note) => {
      if (diapasonIds.has(note.triadType)) return;

      note.triadType = isBuiltInSystem(note.triadType)
        ? canonicalSystemName(note.triadType)
        : diapason.id;
    });
  });

  const rootFrequency = Number(candidate.primaryRootFrequency);

  return {
    version: CONFIG_VERSION,
    primaryRootFrequency: Number.isFinite(rootFrequency)
      ? clamp(rootFrequency, MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY)
      : DEFAULT_ROOT_FREQUENCY,
    primaryDiapasonId: diapasonIds.has(candidate.primaryDiapasonId) ? candidate.primaryDiapasonId : diapasons[0].id,
    diapasons,
  };
};

/**
 * Replaces the whole configuration, as an import or a restore from storage.
 * Throws if the candidate cannot be made into a usable system.
 */
export const replaceConfig = (candidate) => {
  config = validateConfig(candidate);

  // Keep generated ids clear of the ones we just took on.
  config.diapasons.forEach((diapason) => {
    const generated = /^diapason-(\d+)$/.exec(diapason.id);
    if (generated) nextDiapasonNumber = Math.max(nextDiapasonNumber, Number(generated[1]) + 1);
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
