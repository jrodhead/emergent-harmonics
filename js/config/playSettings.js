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

// Where the drone sits relative to the pitch it is a reference for. A period
// below puts it under the hands rather than in among them, and no default gets
// this right for everyone: it depends on the root frequency and on the register
// the hands are in, which is why it is a control at all.
export const DEFAULT_DRONE_PERIOD_SHIFT = -1;
export const MIN_DRONE_PERIOD_SHIFT = -3;
export const MAX_DRONE_PERIOD_SHIFT = 1;

// Below the 0.5 the note keys default to, because a reference that competes
// with the notes is not being used as a reference.
export const DEFAULT_DRONE_VOLUME = 0.3;
export const MAX_DRONE_VOLUME = 1;

// setTargetAtTime approaches its target exponentially and is within a couple of
// cents of it after three time constants, so that is the span a player hears as
// the glide. Dividing by it lets the control be labelled in the time it takes.
const GLIDE_TIME_CONSTANTS = 3;

const defaultSettings = () => ({
  glideMs: DEFAULT_GLIDE_MS,
  attackMs: DEFAULT_ATTACK_MS,
  releaseMs: DEFAULT_RELEASE_MS,
  dronePeriodShift: DEFAULT_DRONE_PERIOD_SHIFT,
  droneVolume: DEFAULT_DRONE_VOLUME,
});

let settings = defaultSettings();

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const save = () => {
  writeStoredValue(STORAGE_KEY, JSON.stringify(settings));
};

// The minimum defaults to 0, which is where every control but the drone's
// register starts: a time cannot run backwards and a level cannot be negative.
const setSetting = (name, value, maximum, minimum = 0) => {
  if (!Number.isFinite(value)) return;

  settings[name] = clamp(value, minimum, maximum);
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

/** How many periods below or above its anchor the drone sounds. */
export const getDronePeriodShift = () => settings.dronePeriodShift;

// Rounded here rather than inside setSetting: this is the only whole-numbered
// control of the five, and the drone's level would be ruined by it.
export const setDronePeriodShift = (periods) => setSetting(
  'dronePeriodShift',
  Math.round(periods),
  MAX_DRONE_PERIOD_SHIFT,
  MIN_DRONE_PERIOD_SHIFT,
);

/** How loud the drone sounds, in its own right rather than as a fraction of the notes. */
export const getDroneVolume = () => settings.droneVolume;

export const setDroneVolume = (volume) => setSetting('droneVolume', volume, MAX_DRONE_VOLUME);

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
    const { glideMs, attackMs, releaseMs, dronePeriodShift, droneVolume } = JSON.parse(stored);

    // Field by field, so a settings file written before a control existed still
    // restores everything it does know about.
    if (Number.isFinite(glideMs)) settings.glideMs = clamp(glideMs, 0, MAX_GLIDE_MS);
    if (Number.isFinite(attackMs)) settings.attackMs = clamp(attackMs, 0, MAX_ENVELOPE_MS);
    if (Number.isFinite(releaseMs)) settings.releaseMs = clamp(releaseMs, 0, MAX_ENVELOPE_MS);
    if (Number.isFinite(dronePeriodShift)) {
      settings.dronePeriodShift = clamp(
        Math.round(dronePeriodShift), MIN_DRONE_PERIOD_SHIFT, MAX_DRONE_PERIOD_SHIFT,
      );
    }
    if (Number.isFinite(droneVolume)) {
      settings.droneVolume = clamp(droneVolume, 0, MAX_DRONE_VOLUME);
    }
  } catch (error) {
    console.error('Stored play settings are unusable, starting fresh:', error);
    settings = defaultSettings();
  }

  return settings;
}
