let audioContext = null;
const activeOscillators = {}; // Object to store active oscillators by key

// Voices whose key has been let go but which are still fading out. They are no
// longer playable — a re-press builds a fresh voice — but they are still
// sounding, so they are held on to until their release has finished.
const releasingVoices = new Set();

// Voices whose key was let go while the sustain pedal was down. Unlike a
// releasing voice they are not going anywhere: they sound on at full volume,
// detached from the key that struck them, until the pedal is lifted.
const sustainedVoices = new Set();

// Long enough that a fader drag does not click on every step, short enough
// that the note still arrives where the pointer is.
const DRAG_GLIDE_TIME_CONSTANT = 0.01;

/** Whether a key currently has a voice, so callers can tell held from sounding. */
export const isSounding = (key) => Boolean(activeOscillators[key]);

/** How many voices the pedal is holding on to, for the tests and the display. */
export const sustainedVoiceCount = () => sustainedVoices.size;

const teardown = ({ oscillator, gainNode }) => {
  oscillator.disconnect();
  gainNode.disconnect();
};

/**
 * Fades a voice out and ends it, whether it was let go by its key or by the
 * pedal. The voice must already have been detached from wherever it was held,
 * since this is the last thing to happen to it.
 *
 * @param {object} voice - The oscillator and gain node to release.
 * @param {number} releaseTime - How long the fade takes, in seconds. Zero stops
 *   it dead, and clicks.
 */
const releaseVoice = (voice, releaseTime) => {
  const { oscillator, gainNode } = voice;

  if (!(releaseTime > 0)) {
    oscillator.stop();
    teardown(voice);
    return;
  }

  const endsAt = audioContext.currentTime + releaseTime;

  // Freezing the gain where it has actually got to is what makes a staccato
  // note work: a key let go mid-attack releases from there rather than jumping
  // up to full volume first.
  gainNode.gain.cancelScheduledValues(audioContext.currentTime);
  gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, endsAt);
  oscillator.stop(endsAt);

  releasingVoices.add(voice);
  oscillator.onended = () => {
    releasingVoices.delete(voice);
    teardown(voice);
  };
};

/**
 * Plays a sound with the specified frequency and volume.
 *
 * @param {number} frequency - The frequency of the sound to be played.
 * @param {number} volume - The volume of the sound to be played.
 * @param {string} key - The key used to store the active oscillator.
 * @param {string} waveShape - The oscillator's wave shape.
 * @param {number} [attackTime] - How long the note takes to swell to that
 *   volume, in seconds. Zero arrives at once, and clicks, which is what an
 *   attack is there to stop.
 */
export function playSound(frequency, key, volume, waveShape, attackTime = 0) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  const oscillator = audioContext.createOscillator();
  oscillator.type = waveShape;

  if (isFinite(frequency)) { // Check if frequency is finite
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  } else {
    console.error('Invalid frequency value:', frequency);
    return;
  }

  const gainNode = audioContext.createGain();

  if (!isFinite(volume)) { // Check if volume is finite
    console.error('Invalid volume value:', volume);
    return;
  }

  if (attackTime > 0) {
    // Starting at silence and ramping up is the whole of the attack: the
    // waveform grows out of nothing instead of appearing at full height.
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(Number(volume), audioContext.currentTime + attackTime);
  } else {
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  }

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();

  activeOscillators[key] = {
    oscillator,
    gainNode
  }; // Store the active oscillator and gain node by key
}

/**
 * Retunes a sound that is already playing, so a frequency can be moved while
 * it is being listened to. Does nothing if that key is not sounding.
 *
 * @param {string} key - The key the sound was started under.
 * @param {number} frequency - The frequency to move to.
 * @param {number} [timeConstant] - How slowly to glide there, in seconds. Zero
 *   arrives immediately, which is still not the same as re-striking the note.
 */
export function setSoundFrequency(key, frequency, timeConstant = DRAG_GLIDE_TIME_CONSTANT) {
  const activeOscillator = activeOscillators[key];
  if (!activeOscillator) return;

  if (!isFinite(frequency)) {
    console.error('Invalid frequency value:', frequency);
    return;
  }

  const { frequency: oscillatorFrequency } = activeOscillator.oscillator;

  if (!(timeConstant > 0)) {
    // Scheduling a value ends any glide still running, so the note lands here.
    oscillatorFrequency.setValueAtTime(frequency, audioContext.currentTime);
    return;
  }

  // Glides to the new frequency rather than jumping. Jumping clicks on every
  // step of a drag, which drowns out the interval the drag is trying to find.
  oscillatorFrequency.setTargetAtTime(frequency, audioContext.currentTime, timeConstant);
}

/**
 * Stops the sound associated with a given key.
 *
 * The key is freed at once either way, so it can be struck again while the
 * voice it just let go of is still fading. A released voice belongs to the
 * tuning it was released in: it is no longer moved by a root change.
 *
 * @param {string} key - The key associated with the sound to stop.
 * @param {number} [releaseTime] - How long the note goes on sounding after the
 *   key is let go, in seconds. Zero stops it dead, and clicks.
 */
export function stopSound(key, releaseTime = 0) {
  const voice = activeOscillators[key];
  if (!voice) return;

  delete activeOscillators[key]; // Remove the oscillator from the active list

  releaseVoice(voice, releaseTime);
}

/**
 * Hands a key's voice to the sustain pedal. Nothing is scheduled: the voice
 * carries on exactly as it was, but it no longer belongs to a key, so the key
 * is free to be struck again and a root change can no longer reach it — the
 * same bargain a released voice makes, without the fade.
 *
 * Does nothing if that key is not sounding, which is what makes it safe to
 * pedal a key that hold mode never let sound in the first place.
 *
 * @param {string} key - The key the sound was started under.
 */
export function sustainVoice(key) {
  const voice = activeOscillators[key];
  if (!voice) return;

  delete activeOscillators[key];
  sustainedVoices.add(voice);
}

/**
 * Lifts the pedal: everything it was holding begins its release together.
 *
 * @param {number} [releaseTime] - How long they take to fade, in seconds.
 */
export function releaseSustainedVoices(releaseTime = 0) {
  sustainedVoices.forEach((voice) => releaseVoice(voice, releaseTime));
  sustainedVoices.clear();
}

/**
 * Stops all active sounds, including any still fading out. This is the panic
 * stop, so nothing is left ringing: everything ends at this instant.
 */
export function stopAllSounds() {
  const voices = [...Object.values(activeOscillators), ...releasingVoices, ...sustainedVoices];

  voices.forEach((voice) => {
    const { oscillator, gainNode } = voice;

    gainNode.gain.cancelScheduledValues(audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    oscillator.onended = null;
    oscillator.stop();
    teardown(voice);
  });

  Object.keys(activeOscillators).forEach(key => {
    delete activeOscillators[key];
  });
  releasingVoices.clear();
  sustainedVoices.clear();
  console.log('Stopped all sounds');
}
