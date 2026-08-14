import {
  playSound,
  setSoundFrequency,
  setSoundVolume,
  stopSound,
} from '../audio/audioHandler.js';
import { shouldIgnoreKeyEvent } from './keyEventGuard.js';
import { droneFrequency } from '../system/droneFrequency.js';
import { rootNotes, currentRootIndex } from '../system/state.js';
import { getConfig } from '../config/systemConfigState.js';
import {
  attackTime,
  getDronePeriodShift,
  getDroneVolume,
  glideTimeConstant,
  releaseTime,
} from '../config/playSettings.js';

/**
 * The drone: a voice that belongs to the system rather than to a key. Every
 * playing rule in the app works through the *held key* sets, so a voice stored
 * under a key nothing can hold is invisible to all of them — hold mode does not
 * gate it, the pedal does not hold it, and a note or register change does not
 * reach it. Only the panic stops do, which is exactly right.
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

// A drone is a list of voices, and today the list has one entry. Written this
// way because the next story on it is a second voice a configured distance
// away, panned into the other ear. The voice keys cannot collide with a note
// key, which is always a single character.
const DRONE_VOICES = [{ id: 'drone-1' }];

let droneOn = false;
let droneMode = DRONE_MODES[0];

// Voice id → the frequency it was last asked for. What makes anchored mode
// provably still: the drone recomputes on every root change and finds the same
// number, so it schedules nothing at all.
const soundingFrequencies = new Map();

const anchorFrequency = () => (droneMode === 'following'
  ? rootNotes[currentRootIndex]?.frequency
  : getConfig().primaryRootFrequency);

/**
 * What one voice should be sounding: the anchor put through the register
 * control. Deliberately per-voice, since that is where a pair's offset from the
 * drone pitch will one day go in.
 */
const frequencyForVoice = (voice) => droneFrequency(anchorFrequency(), getDronePeriodShift());

const displayDrone = () => {
  const state = document.getElementById('drone');
  if (state) state.textContent = droneOn ? 'on' : 'off';

  const mode = document.getElementById('droneMode');
  if (mode) mode.textContent = droneMode;

  document.getElementById('droneTable')?.classList.toggle('active', droneOn);
};

const startDrone = () => {
  const waveShape = document.getElementById('waveShape')?.value;
  const volume = getDroneVolume();

  DRONE_VOICES.forEach((voice) => {
    const frequency = frequencyForVoice(voice);

    // Nothing audible to sound: the anchor itself is out of range. Declining is
    // better than handing NaN to an oscillator.
    if (frequency === null) {
      console.error('No audible drone frequency for', voice.id);
      return;
    }

    // The attack matters more here than anywhere else: a drone that snaps on is
    // the longest-lived click in the app.
    playSound(frequency, voice.id, volume, waveShape, attackTime());
    soundingFrequencies.set(voice.id, frequency);
  });

  droneOn = soundingFrequencies.size > 0;
  displayDrone();
};

/** Turns the drone off from somewhere other than its key, and is safe when it is already off. */
export const stopDrone = () => {
  DRONE_VOICES.forEach((voice) => stopSound(voice.id, releaseTime()));

  soundingFrequencies.clear();
  droneOn = false;
  displayDrone();
};

/** Moves a sounding drone to wherever its anchor and register now put it. */
const retuneDrone = () => {
  if (!droneOn) return;

  DRONE_VOICES.forEach((voice) => {
    const frequency = frequencyForVoice(voice);
    if (frequency === null || frequency === soundingFrequencies.get(voice.id)) return;

    setSoundFrequency(voice.id, frequency, glideTimeConstant());
    soundingFrequencies.set(voice.id, frequency);
  });
};

/**
 * Moves a sounding drone to the level the fader now reads. No equality check:
 * this is only called because the fader moved. The default time constant rather
 * than the glide, because a level is not a pitch and should not inherit a
 * half-second slide — it wants only enough smoothing not to click.
 */
const relevelDrone = () => {
  if (!droneOn) return;

  DRONE_VOICES.forEach((voice) => setSoundVolume(voice.id, getDroneVolume()));
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
  retuneDrone();
});

// The note keys' own event, reused rather than adding a rootChanged one. It
// fires on register changes too, where the drone's frequency has not moved, so
// the equality check in retuneDrone turns those into no-ops.
document.body.addEventListener('noteKeyMapChanged', retuneDrone);

document.body.addEventListener('playSettingChanged', ({ detail }) => {
  if (detail?.name === 'dronePeriodShift') retuneDrone();
  if (detail?.name === 'droneVolume') relevelDrone();
});

// Deliberately no blur listener, unlike the pedal: no keyup is being waited
// for, and a drone should survive alt-tabbing away — which is most of what a
// drone is for.

displayDrone();
