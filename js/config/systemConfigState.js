import { MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY } from '../system/generateSystem.js';
import { isPreset, presetFamily, presetLabel, presetOptions } from '../presets/registry.js';
import { presetToNotes } from './presetToScale.js';
import { degreeForIndex } from './degrees.js';
import { PERIOD_RATIO, foldRatioIntoPeriod } from '../system/period.js';
import { describeRatio } from '../format.js';
import { readStoredValue, writeStoredValue, clearStoredValue } from '../storage.js';

export const STORAGE_KEY = 'emergentHarmonics.systemConfig';
const CONFIG_VERSION = 2;
const DEFAULT_PRESET = 'pythagorean';
const DEFAULT_ROOT_FREQUENCY = 432;

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

/**
 * Builds a scale for every preset in a family, so a degree that names another
 * scale names one that is on the screen and can be edited.
 *
 * @param {string} presetId - The preset at the head of the family.
 * @param {string} headScaleId - The scale the head preset is loaded into.
 * @param {Function} idFor - Where to put each of the others: an existing scale
 *   already holding that preset, or a fresh id.
 * @returns {Map} Which scale holds each preset of the family.
 */
const familyScaleIds = (presetId, headScaleId, idFor) => new Map(
  presetFamily(presetId).map((member) => [member, member === presetId ? headScaleId : idFor(member)]),
);

/** A scale holding a preset, ready to be played and edited. */
const scaleFromPreset = (presetId, scaleIdByPreset) => ({
  id: scaleIdByPreset.get(presetId),
  name: presetLabel(presetId),
  fromPreset: presetId,
  notes: presetToNotes(presetId, scaleIdByPreset),
});

/**
 * Records that a scale has been edited away from the preset it was loaded
 * from. The notes are what a preset is, so changing one leaves a scale that is
 * no longer that preset, however it is still named.
 */
const markEditedFromPreset = (scale) => {
  if (scale?.fromPreset) scale.editedFromPreset = true;
};

const createDefaultConfig = () => {
  const scaleIdByPreset = familyScaleIds(DEFAULT_PRESET, newScaleId(), newScaleId);

  return {
    version: CONFIG_VERSION,
    primaryRootFrequency: DEFAULT_ROOT_FREQUENCY,
    primaryScaleId: scaleIdByPreset.get(DEFAULT_PRESET),
    scales: [...scaleIdByPreset.keys()].map((member) => scaleFromPreset(member, scaleIdByPreset)),
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

/**
 * Adds a scale to build on, rather than a whole family: its degrees all build
 * the scale itself until they are pointed somewhere else.
 */
export const addScale = () => {
  const id = newScaleId();

  config.scales.push({
    id,
    name: `Scale ${config.scales.length + 1}`,
    notes: presetToNotes(DEFAULT_PRESET, new Map([[DEFAULT_PRESET, id]])),
  });
  notify();

  return id;
};

/**
 * Notes left pointing at a scale that is no longer there fall back to their
 * own. A degree naming a built-in preset still names something, so it stays.
 *
 * @param {Array} scales - The scales that are left.
 */
const repointOrphanedNotes = (scales) => {
  const scaleIds = new Set(scales.map((scale) => scale.id));

  scales.forEach((scale) => {
    scale.notes.forEach((note) => {
      if (scaleIds.has(note.rootScaleId) || isPreset(note.rootScaleId)) return;

      note.rootScaleId = scale.id;
    });
  });
};

export const removeScale = (scaleId) => {
  // The system needs at least one scale to generate from.
  if (config.scales.length <= 1) return;

  config.scales = config.scales.filter((scale) => scale.id !== scaleId);

  if (config.primaryScaleId === scaleId) {
    config.primaryScaleId = config.scales[0].id;
  }

  repointOrphanedNotes(config.scales);

  notify();
};

export const renameScale = (scaleId, name) => {
  const scale = getScale(scaleId);
  if (!scale) return;

  scale.name = name;
  notify();
};

/** A scale already holding this preset, which a new load can point at again. */
const scaleHolding = (presetId, exceptScaleId) => config.scales
  .find((scale) => scale.fromPreset === presetId && scale.id !== exceptScaleId);

/**
 * Loads a preset into a scale, bringing in the scales its degrees build. Those
 * come in alongside it, once each: a family already on the screen is pointed
 * at rather than copied again, so anything already edited there is kept.
 *
 * The primary scale is what the whole system is built from, so loading into it
 * says what the system is: the scales its degrees no longer reach go, rather
 * than lingering from whatever was loaded before. Loading into any other scale
 * leaves the rest of the screen alone.
 *
 * @param {string} scaleId - The scale being loaded into.
 * @param {string} presetId
 * @returns {Array} The scales brought in alongside it, if any.
 */
export const loadPresetIntoScale = (scaleId, presetId) => {
  const scale = getScale(scaleId);
  if (!scale || !isPreset(presetId)) return [];

  const brought = [];
  const scaleIdByPreset = familyScaleIds(presetId, scaleId, (member) => {
    const existing = scaleHolding(member, scaleId);

    if (existing) return existing.id;

    brought.push(member);

    return newScaleId();
  });

  // Loaded afresh, so it is the preset again whatever was done to it before.
  delete scale.editedFromPreset;
  Object.assign(scale, scaleFromPreset(presetId, scaleIdByPreset));
  brought.forEach((member) => config.scales.push(scaleFromPreset(member, scaleIdByPreset)));

  if (scaleId === config.primaryScaleId) {
    const family = new Set(scaleIdByPreset.values());

    config.scales = config.scales.filter((member) => family.has(member.id));
    repointOrphanedNotes(config.scales);
  }

  notify();

  return brought.map((member) => scaleIdByPreset.get(member));
};

/**
 * The preset a scale is still named after but is no longer: it was loaded from
 * that preset and a note has changed since. A name of its own settles the
 * matter, since the name is the only thing the editing makes wrong.
 *
 * @param {string} scaleId
 * @returns {string|undefined} The preset's name, where the scale has outgrown it.
 */
export const presetEditedAwayFrom = (scaleId) => {
  const scale = getScale(scaleId);

  if (!scale?.editedFromPreset) return undefined;

  const label = presetLabel(scale.fromPreset);

  return scale.name === label ? label : undefined;
};

/** The scales a load of this preset would bring in alongside it. */
export const presetsBroughtIn = (presetId) => (isPreset(presetId) ? presetFamily(presetId) : [])
  .filter((member) => member !== presetId && !scaleHolding(member))
  .map(presetLabel);

/**
 * The scales a load of this preset would clear, by name. Only a load into the
 * primary scale clears anything: the family it takes on is the whole system.
 *
 * @param {string} scaleId - The scale that would be loaded into.
 * @param {string} presetId
 * @returns {Array} The names of the scales that would go, if any.
 */
export const scalesClearedBy = (scaleId, presetId) => {
  if (scaleId !== config.primaryScaleId || !isPreset(presetId)) return [];

  // A family member with nowhere to be yet leaves an undefined here, which
  // names no scale, so nothing is kept by it.
  const kept = new Set(presetFamily(presetId)
    .map((member) => (member === presetId ? scaleId : scaleHolding(member, scaleId)?.id)));

  return config.scales.filter((scale) => !kept.has(scale.id)).map((scale) => scale.name);
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
  markEditedFromPreset(scale);
  notify();
};

export const removeNote = (scaleId, noteIndex) => {
  const scale = getScale(scaleId);
  if (!scale) return;

  if (!canRemoveNote(noteIndex) || noteIndex >= scale.notes.length) return;

  scale.notes.splice(noteIndex, 1);
  renumberDegrees(scale);
  markEditedFromPreset(scale);
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
  markEditedFromPreset(scale);

  // A live slider drag would re-render the control out from under the pointer.
  if (silent) {
    saveConfig();
    return;
  }

  notify();
};

/**
 * The scale holding a preset, added as one of its own if it is not on the
 * screen yet. Only the preset itself comes in: its degrees are pointed back at
 * it, so choosing one scale never puts several on the screen.
 */
const scaleForPreset = (presetId) => {
  const existing = scaleHolding(presetId);

  if (existing) return existing.id;

  const id = newScaleId();

  config.scales.push(scaleFromPreset(presetId, new Map([[presetId, id]])));

  return id;
};

/**
 * Points a note at the scale it builds when it is the root.
 *
 * Every note of the primary scale sits on a root key, and pressing that key
 * plays the scale the note names, so the name has to reach a scale that is on
 * the screen and can be edited: a built-in preset chosen there comes in as a
 * scale of its own, which the note is pointed at instead. Notes of any other
 * scale are on no key, so theirs is left as it was chosen.
 *
 * @param {string} scaleId - The scale the note belongs to.
 * @param {number} noteIndex
 * @param {string} rootScaleId - Another configured scale, or a built-in preset.
 */
export const setNoteRootScale = (scaleId, noteIndex, rootScaleId) => {
  const scale = getScale(scaleId);
  const note = scale?.notes[noteIndex];
  if (!note) return;

  note.rootScaleId = scaleId === config.primaryScaleId && isPreset(rootScaleId)
    ? scaleForPreset(rootScaleId)
    : rootScaleId;

  markEditedFromPreset(scale);
  notify();
};

/**
 * The scales nothing can play. Pressing a root key plays the scale its note of
 * the primary scale names, so a scale no note there names is on the screen
 * without being anywhere on the keyboard. The primary scale is what the root
 * keys are made of, so it is always reached.
 *
 * @returns {Array} The scales that are left out, in the order they are shown.
 */
export const unreachedScales = () => {
  const reached = new Set([
    config.primaryScaleId,
    ...getPrimaryScale().notes.map((note) => note.rootScaleId),
  ]);

  return config.scales.filter((scale) => !reached.has(scale.id));
};

/**
 * Every name a note's rootScaleId can point at: the other configured scales,
 * then the built-in presets.
 */
export const rootScaleOptions = () => ({
  configured: config.scales.map((scale) => ({ value: scale.id, label: scale.name })),
  builtIn: presetOptions(),
});

/**
 * What a scale remembers of the preset it was loaded from: which preset it
 * was, so loading that preset again points at this scale rather than bringing
 * in a second copy of it, and whether it has been edited away from it since. A
 * name that is not a preset says nothing, so it is dropped.
 */
const presetOrigin = (scale) => {
  if (!isPreset(scale?.fromPreset)) return {};

  return {
    fromPreset: scale.fromPreset,
    ...(scale.editedFromPreset ? { editedFromPreset: true } : {}),
  };
};

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
      ...presetOrigin(scale),
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

  // Anything the imported file points at that we cannot resolve falls back to
  // the scale the note belongs to.
  repointOrphanedNotes(scales);

  const scaleIds = new Set(scales.map((scale) => scale.id));
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
