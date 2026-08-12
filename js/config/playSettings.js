import { readStoredValue, writeStoredValue } from '../storage.js';

/**
 * How the keyboard plays, as opposed to what it plays. Kept apart from the
 * system configuration on purpose: these are the player's preferences, and
 * they have no business travelling inside an exported musical system.
 */

export const STORAGE_KEY = 'emergentHarmonics.playSettings';

export const DEFAULT_GLIDE_MS = 80;
export const MAX_GLIDE_MS = 500;

// Short enough that the note still arrives the instant the key goes down, long
// enough that the waveform grows rather than appears — which is the click.
export const DEFAULT_ATTACK_MS = 10;
// A note wants longer to die than to arrive, so the chord decays rather than
// being cut off with the keys.
export const DEFAULT_RELEASE_MS = 120;

// Past a few hundred milliseconds nothing sounds like a keypress any more, so
// the rest of this range exists for pads: notes that swell in and hang on.
export const MAX_ENVELOPE_MS = 2000;

// setTargetAtTime approaches its target exponentially and is within a couple of
// cents of it after three time constants, so that is the span a player hears as
// the glide. Dividing by it lets the control be labelled in the time it takes.
const GLIDE_TIME_CONSTANTS = 3;

const defaultSettings = () => ({
  glideMs: DEFAULT_GLIDE_MS,
  attackMs: DEFAULT_ATTACK_MS,
  releaseMs: DEFAULT_RELEASE_MS,
});

let settings = defaultSettings();

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const save = () => {
  writeStoredValue(STORAGE_KEY, JSON.stringify(settings));
};

const setSetting = (name, value, maximum) => {
  if (!Number.isFinite(value)) return;

  settings[name] = clamp(value, 0, maximum);
  save();
};

/** How long a held note takes to reach its new pitch, in milliseconds. */
export const getGlideMs = () => settings.glideMs;

export const setGlideMs = (milliseconds) => setSetting('glideMs', milliseconds, MAX_GLIDE_MS);

/** How long a note takes to swell to full volume when it is struck. */
export const getAttackMs = () => settings.attackMs;

export const setAttackMs = (milliseconds) => setSetting('attackMs', milliseconds, MAX_ENVELOPE_MS);

/** How long a note goes on sounding after its key is let go. */
export const getReleaseMs = () => settings.releaseMs;

export const setReleaseMs = (milliseconds) => setSetting('releaseMs', milliseconds, MAX_ENVELOPE_MS);

/** The same glide, in the units setSoundFrequency wants. */
export const glideTimeConstant = () => getGlideMs() / (1000 * GLIDE_TIME_CONSTANTS);

/** The attack in seconds, which is what the audio layer schedules in. */
export const attackTime = () => getAttackMs() / 1000;

/** The release in seconds, likewise. */
export const releaseTime = () => getReleaseMs() / 1000;

/** Restores the stored settings, falling back to the defaults. */
export function loadStoredPlaySettings() {
  const stored = readStoredValue(STORAGE_KEY);

  settings = defaultSettings();
  if (!stored) return settings;

  try {
    const { glideMs, attackMs, releaseMs } = JSON.parse(stored);

    // Field by field, so a settings file written before a control existed still
    // restores everything it does know about.
    if (Number.isFinite(glideMs)) settings.glideMs = clamp(glideMs, 0, MAX_GLIDE_MS);
    if (Number.isFinite(attackMs)) settings.attackMs = clamp(attackMs, 0, MAX_ENVELOPE_MS);
    if (Number.isFinite(releaseMs)) settings.releaseMs = clamp(releaseMs, 0, MAX_ENVELOPE_MS);
  } catch (error) {
    console.error('Stored play settings are unusable, starting fresh:', error);
    settings = defaultSettings();
  }

  return settings;
}
