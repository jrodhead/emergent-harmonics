/**
 * Records what the app actually asks of the audio hardware: the shape,
 * frequency and volume each note starts with, every glide it is moved by, and
 * every stop. Installed before any note sounds, since the oscillator is built
 * on first play.
 *
 * A sound's `frequency` is wherever its voice has been moved to, whether it
 * arrived there by gliding or at once, so it always reads as the pitch that
 * voice is sounding now.
 *
 * @param {object} app - The handle from launchApp.
 */
export const recordAudio = (app) => app.evaluate(`
  window.__sounds = [];
  window.__stops = 0;
  window.__glides = [];

  const createOscillator = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function () {
    const oscillator = createOscillator.call(this);
    const sound = {};
    window.__sounds.push(sound);

    const setFrequency = oscillator.frequency.setValueAtTime.bind(oscillator.frequency);
    oscillator.frequency.setValueAtTime = (value, ...rest) => {
      sound.frequency = Math.round(value);
      return setFrequency(value, ...rest);
    };

    const glideFrequency = oscillator.frequency.setTargetAtTime.bind(oscillator.frequency);
    oscillator.frequency.setTargetAtTime = (value, startTime, timeConstant) => {
      window.__glides.push({ frequency: Math.round(value), timeConstant });
      sound.frequency = Math.round(value);
      return glideFrequency(value, startTime, timeConstant);
    };

    const start = oscillator.start.bind(oscillator);
    oscillator.start = (...rest) => {
      sound.shape = oscillator.type;
      return start(...rest);
    };

    const stop = oscillator.stop.bind(oscillator);
    oscillator.stop = (...rest) => {
      window.__stops++;
      return stop(...rest);
    };

    return oscillator;
  };

  // The gain node is built straight after the oscillator it belongs to.
  const createGain = AudioContext.prototype.createGain;
  AudioContext.prototype.createGain = function () {
    const gain = createGain.call(this);
    const sound = window.__sounds[window.__sounds.length - 1];
    const setVolume = gain.gain.setValueAtTime.bind(gain.gain);

    gain.gain.setValueAtTime = (value, ...rest) => {
      if (sound) sound.volume = Number(value);
      return setVolume(value, ...rest);
    };

    return gain;
  };
`);
