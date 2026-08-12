/**
 * Records what the app actually asks of the audio hardware: the shape,
 * frequency and volume each note starts with, the envelope it is faded in and
 * out with, every glide it is moved by, and every stop. Installed before any
 * note sounds, since the oscillator is built on first play.
 *
 * A sound's `frequency` is wherever its voice has been moved to, whether it
 * arrived there by gliding or at once, so it always reads as the pitch that
 * voice is sounding now. Its `volume` is the level it was struck at, which is
 * the top of its attack rather than the silence the attack begins from.
 *
 * Times are recorded as spans from the moment they were scheduled — `attack`,
 * `release` and `stoppedIn` are all in seconds from now — so a test never has
 * to know what the context's clock reads.
 *
 * @param {object} app - The handle from launchApp.
 */
export const recordAudio = (app) => app.evaluate(`
  window.__sounds = [];
  window.__stops = 0;
  window.__glides = [];

  // The gain node is built straight after the oscillator it belongs to, so the
  // sound being recorded is always the last one pushed.
  const soundBeingBuilt = () => window.__sounds[window.__sounds.length - 1];

  const createOscillator = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function () {
    const context = this;
    const oscillator = createOscillator.call(this);
    const sound = { started: false };
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
      sound.started = true;
      return start(...rest);
    };

    const stop = oscillator.stop.bind(oscillator);
    oscillator.stop = (when, ...rest) => {
      window.__stops++;
      sound.stoppedIn = when === undefined ? 0 : when - context.currentTime;
      return when === undefined ? stop() : stop(when, ...rest);
    };

    return oscillator;
  };

  const createGain = AudioContext.prototype.createGain;
  AudioContext.prototype.createGain = function () {
    const context = this;
    const gain = createGain.call(this);
    const sound = soundBeingBuilt();

    const setVolume = gain.gain.setValueAtTime.bind(gain.gain);
    gain.gain.setValueAtTime = (value, ...rest) => {
      // Everything scheduled before the oscillator starts is the note's
      // beginning: the silence an attack grows from, or the level itself.
      if (sound && !sound.started) sound.volume = Number(value);
      return setVolume(value, ...rest);
    };

    const rampVolume = gain.gain.linearRampToValueAtTime.bind(gain.gain);
    gain.gain.linearRampToValueAtTime = (value, endTime, ...rest) => {
      if (sound && !sound.started) {
        sound.volume = Number(value);
        sound.attack = endTime - context.currentTime;
      } else if (sound) {
        sound.release = endTime - context.currentTime;
      }
      return rampVolume(value, endTime, ...rest);
    };

    return gain;
  };
`);
