import { readStoredValue, writeStoredValue } from '../storage.js';

/**
 * How the keyboard plays, as opposed to what it plays. Kept apart from the
 * system configuration on purpose: these are the player's preferences, and
 * they have no business travelling inside an exported musical system.
 */

export const STORAGE_KEY = 'emergentHarmonics.playSettings';

export const DEFAULT_GLIDE_MS = 80;
export const MAX_GLIDE_MS = 500;

// setTargetAtTime approaches its target exponentially and is within a couple of
// cents of it after three time constants, so that is the span a player hears as
// the glide. Dividing by it lets the control be labelled in the time it takes.
const GLIDE_TIME_CONSTANTS = 3;

const defaultSettings = () => ({ glideMs: DEFAULT_GLIDE_MS });

let settings = defaultSettings();

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const save = () => {
  writeStoredValue(STORAGE_KEY, JSON.stringify(settings));
};

/** How long a held note takes to reach its new pitch, in milliseconds. */
export const getGlideMs = () => settings.glideMs;

export const setGlideMs = (milliseconds) => {
  if (!Number.isFinite(milliseconds)) return;

  settings.glideMs = clamp(milliseconds, 0, MAX_GLIDE_MS);
  save();
};

/** The same glide, in the units setSoundFrequency wants. */
export const glideTimeConstant = () => getGlideMs() / (1000 * GLIDE_TIME_CONSTANTS);

/** Restores the stored settings, falling back to the defaults. */
export function loadStoredPlaySettings() {
  const stored = readStoredValue(STORAGE_KEY);

  if (!stored) {
    settings = defaultSettings();
    return settings;
  }

  try {
    const { glideMs } = JSON.parse(stored);

    settings = defaultSettings();
    if (Number.isFinite(glideMs)) settings.glideMs = clamp(glideMs, 0, MAX_GLIDE_MS);
  } catch (error) {
    console.error('Stored play settings are unusable, starting fresh:', error);
    settings = defaultSettings();
  }

  return settings;
}
