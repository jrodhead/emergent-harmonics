import {
  playSound,
  setSoundFrequency,
  setSoundPan,
  setSoundVolume,
  stopSound,
} from '../audio/audioHandler.js';
import { shouldIgnoreKeyEvent } from './keyEventGuard.js';
import { droneFrequency } from '../system/droneFrequency.js';
import { pairFrequencies, pairVoiceVolume } from '../system/dronePair.js';
import { rootNotes, currentRootIndex } from '../system/state.js';
import { getConfig } from '../config/systemConfigState.js';
import {
  attackTime,
  getDroneLowerPan,
  getDronePair,
  getDronePeriodShift,
  getDroneSpreadHz,
  getDroneSpreadRatio,
  getDroneUpperPan,
  getDroneVolume,
  glideTimeConstant,
  releaseTime,
} from '../config/playSettings.js';
import { renderDroneReadout } from './renderDroneReadout.js';

/**
 * The drone: a voice that belongs to the system rather than to a key. Every
 * playing rule in the app works through the *held key* sets, so a voice stored
 * under a key nothing can hold is invisible to all of them — hold mode does not
 * gate it, the pedal does not hold it, and a note or register change does not
 * reach it. Only the panic stops do, which is exactly right.
 *
 * It is a *set* of voices rather than a voice: one on its own, or two
 * straddling its pitch and panned apart. Everything the drone does is therefore
 * one operation — reconcile what is sounding against what the settings now ask
 * for — which is what lets the pair be switched on under a drone that is
 * already sounding without re-striking it.
 */

// Backtick, free and sitting under the left pinky next to the root keys it is a
// reference for. Shift makes it a tilde, which is one key as far as
// KeyboardEvent.key is concerned, and so the mode switch.
const DRONE_KEY = '`';
const DRONE_MODE_KEY = '~';

// Anchored measures from the system's fundamental — the frequency every ratio
// is defined against — rather than from root key 0, which is only the same
// pitch in a system whose first degree is 1/1.
const DRONE_MODES = ['anchored', 'following'];

// The voice keys cannot collide with a note key, which is always a single
// character. Their ids do not change with the pair setting: which of them is
// wanted is decided below, and reconciling against what is sounding is what
// starts and stops the second one.
const LOWER_VOICE = { id: 'drone-1', side: -1 };
const UPPER_VOICE = { id: 'drone-2', side: 1 };

// A drone that is not a pair is the lower voice with no side to be on, so the
// voice a player has been listening to since before there was a pair is the one
// that goes on sounding when it is switched off again.
const SINGLE_VOICE = { ...LOWER_VOICE, side: 0 };

let droneOn = false;
let droneMode = DRONE_MODES[0];

// Voice id → what it was last asked for. The equality checks against this are
// what make an anchored drone provably still: it recomputes on every root and
// register change, finds the same numbers, and schedules nothing at all.
const sounding = new Map();

const spreads = () => ({
  spreadRatio: getDroneSpreadRatio(),
  spreadHz: getDroneSpreadHz(),
});

const anchorFrequency = () => (droneMode === 'following'
  ? rootNotes[currentRootIndex]?.frequency
  : getConfig().primaryRootFrequency);

/** The pitch the drone is for, which the pair straddles and a single voice sounds. */
const dronePitch = () => droneFrequency(anchorFrequency(), getDronePeriodShift());

/**
 * One voice with no position, or two straddling the pitch and panned apart.
 *
 * A pair that does not fit — a spread wide enough to put its lower voice under
 * hearing, which is reachable at the bottom of the drone's register — collapses
 * back to the single voice rather than taking the drone off. That is the
 * argument droneFrequency already makes about a register it cannot honour: the
 * pitch is perfectly audible and it is the *setting* that is out of reach, so
 * the drone goes on sounding and the readout says the pair is not available.
 */
const droneVoices = () => {
  if (!getDronePair()) return [SINGLE_VOICE];

  return pairFrequencies(dronePitch(), spreads()) === null
    ? [SINGLE_VOICE]
    : [LOWER_VOICE, UPPER_VOICE];
};

/**
 * What one voice should be sounding: the anchor put through the register
 * control, and then the half of the spread that belongs to this voice.
 */
const frequencyForVoice = (voice) => {
  const pitch = dronePitch();
  if (pitch === null || voice.side === 0) return pitch;

  const pair = pairFrequencies(pitch, spreads());

  if (pair === null) return null;

  return voice.side < 0 ? pair.lower : pair.upper;
};

/** Where a voice sits in the field, or null for a voice that wants no panner at all. */
const panForVoice = (voice) => {
  if (voice.side === 0) return null;

  return voice.side < 0 ? getDroneLowerPan() : getDroneUpperPan();
};

/**
 * How loud one voice is. A pair splits the drone's level so that the two of
 * them arrive at the level the single voice had — see pairVoiceVolume, where
 * the arithmetic and the reason for it live.
 */
const volumeForVoice = (voices) => (
  voices.length > 1 ? pairVoiceVolume(getDroneVolume()) : getDroneVolume()
);

const waveShape = () => document.getElementById('waveShape')?.value;

const displayDrone = () => {
  const state = document.getElementById('drone');
  if (state) state.textContent = droneOn ? 'on' : 'off';

  const mode = document.getElementById('droneMode');
  if (mode) mode.textContent = droneMode;

  document.getElementById('droneTable')?.classList.toggle('active', droneOn);

  renderDroneReadout([...sounding.values()].sort((first, second) => (
    first.frequency - second.frequency
  )), { waveShape: waveShape(), pairAsked: droneOn && getDronePair() });
};

const startVoice = (voice, frequency, volume, pan) => {
  // Nothing audible to sound: the anchor is out of range, or the spread has
  // pushed this voice out of it. Declining is better than handing NaN to an
  // oscillator.
  if (frequency === null) {
    console.error('No audible drone frequency for', voice.id);
    return;
  }

  // The attack matters more here than anywhere else: a drone that snaps on is
  // the longest-lived click in the app.
  playSound(frequency, voice.id, volume, waveShape(), attackTime());

  // One statement after the strike, and therefore the same turn of the event
  // loop: the audio thread has not rendered a quantum in between, so the voice
  // is never heard un-panned.
  if (pan !== null) setSoundPan(voice.id, pan);

  sounding.set(voice.id, { frequency, volume, pan });
};

const stopVoice = (id) => {
  stopSound(id, releaseTime());
  sounding.delete(id);
};

/**
 * Moves whatever is sounding to whatever the settings now describe: starts the
 * voices that are missing, stops the ones that are no longer wanted, and glides,
 * re-levels and moves the rest only where the number has actually changed.
 *
 * One function because every one of the drone's events is the same request —
 * the root moved, the register moved, the pair was switched on, a spread was
 * dragged — and they compose rather than conflicting.
 */
const applyDrone = () => {
  if (!droneOn) return;

  const wanted = droneVoices();
  const wantedIds = new Set(wanted.map(({ id }) => id));

  // A voice that has left the drone hands its voice back, taking its panner
  // with it: what is stopped is what is *sounding*, not what the settings
  // currently describe, or switching the pair off would leave one running under
  // a list that no longer mentions it.
  [...sounding.keys()].forEach((id) => {
    if (!wantedIds.has(id)) stopVoice(id);
  });

  const volume = volumeForVoice(wanted);

  wanted.forEach((voice) => {
    const frequency = frequencyForVoice(voice);
    const pan = panForVoice(voice);
    const current = sounding.get(voice.id);

    if (!current) {
      startVoice(voice, frequency, volume, pan);
      return;
    }

    // A spread that has pushed this voice out of hearing. The pair gives up the
    // voice rather than sounding an asymmetric one, which would be a beat rate
    // the readout is not reporting.
    if (frequency === null) {
      stopVoice(voice.id);
      return;
    }

    if (frequency !== current.frequency) {
      setSoundFrequency(voice.id, frequency, glideTimeConstant());
      current.frequency = frequency;
    }

    if (volume !== current.volume) {
      // The default time constant rather than the glide, because a level is not
      // a pitch and should not inherit a half-second slide — it wants only
      // enough smoothing not to click.
      setSoundVolume(voice.id, volume);
      current.volume = volume;
    }

    if (pan !== current.pan) {
      setSoundPan(voice.id, pan);
      current.pan = pan;
    }
  });

  // Set from whether a voice actually started rather than from the keypress: an
  // anchor out of range leaves the indicator reading off, which is true.
  droneOn = sounding.size > 0;
  displayDrone();
};

const startDrone = () => {
  droneOn = true;
  applyDrone();
};

/** Turns the drone off from somewhere other than its key, and is safe when it is already off. */
export const stopDrone = () => {
  [...sounding.keys()].forEach(stopVoice);

  droneOn = false;
  displayDrone();
};

document.body.addEventListener('keydown', (ev) => {
  if (ev.repeat || shouldIgnoreKeyEvent(ev)) return;

  if (ev.key === DRONE_KEY) {
    return droneOn ? stopDrone() : startDrone();
  }

  if (ev.key !== DRONE_MODE_KEY) return;

  droneMode = DRONE_MODES[(DRONE_MODES.indexOf(droneMode) + 1) % DRONE_MODES.length];
  displayDrone();

  // Switching while a drone sounds glides it onto the current root, or home
  // again. That is the honest reading of a mode switch.
  applyDrone();
});

// The note keys' own event, reused rather than adding a rootChanged one. It
// fires on register changes too, where the drone's frequency has not moved, so
// the equality checks in applyDrone turn those into no-ops.
document.body.addEventListener('noteKeyMapChanged', applyDrone);

// Every drone setting is a description of the same set of voices, so they all
// arrive at the same reconcile rather than at a function each.
const DRONE_SETTINGS = [
  'dronePeriodShift', 'droneVolume', 'dronePair',
  'droneSpreadRatio', 'droneSpreadHz', 'droneLowerPan', 'droneUpperPan',
];

document.body.addEventListener('playSettingChanged', ({ detail }) => {
  if (DRONE_SETTINGS.includes(detail?.name)) applyDrone();
});

// The wave shape is read at the strike and never changes on a sounding voice,
// but it decides whether the beat the readout is reporting is one the player
// could hear, so the reason has to be redrawn when it moves.
document.getElementById('waveShape')?.addEventListener('change', displayDrone);

// Deliberately no blur listener, unlike the pedal: no keyup is being waited
// for, and a drone should survive alt-tabbing away — which is most of what a
// drone is for.

displayDrone();
