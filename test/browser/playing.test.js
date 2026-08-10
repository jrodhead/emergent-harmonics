import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { launchApp, findChrome } from '../helpers/browser.js';

const skip = findChrome() ? false : 'no Chrome-like browser installed to test with';

let app;

const dispatchKey = (type, key) => `
  document.body.dispatchEvent(new KeyboardEvent('${type}', { key: '${key}', bubbles: true }));
`;

/**
 * Records what the app actually asks of the audio hardware: the shape,
 * frequency and volume each note starts with, and every stop. Installed before
 * any note sounds, since the oscillator is built on first play.
 */
const recordAudio = () => app.evaluate(`
  window.__sounds = [];
  window.__stops = 0;

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

describe('playing the keyboard', { skip }, () => {
  before(async () => {
    app = await launchApp();
    await app.reload();
  });

  after(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await app.resetApp();
    await app.evaluate('document.querySelector(\'[data-show-view="play"]\').click();');
  });

  describe('the oscillator controls', () => {
    const setControl = (id, value) => `
      {
        const control = document.getElementById('${id}');
        control.value = '${value}';
        control.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `;

    it('starts a note at the frequency its key shows', async () => {
      await recordAudio();

      assert.deepEqual(await app.evaluate(`
        ${dispatchKey('keydown', 'q')}
        return [window.__sounds[0].frequency + 'Hz',
                document.getElementById('q').querySelector('.frequency').textContent];
      `), ['432Hz', '432Hz']);
    });

    it('plays the wave shape the controls are set to', async () => {
      await recordAudio();

      assert.equal(await app.evaluate(`
        ${setControl('waveShape', 'square')}
        ${dispatchKey('keydown', 'q')}
        return window.__sounds[0].shape;
      `), 'square');
    });

    it('plays at the volume the controls are set to', async () => {
      await recordAudio();

      assert.equal(await app.evaluate(`
        ${setControl('oscillatorVolume', '0.25')}
        ${dispatchKey('keydown', 'q')}
        return window.__sounds[0].volume;
      `), 0.25);
    });

    it('reads the controls afresh for every note, so a change takes hold mid-play', async () => {
      await recordAudio();

      assert.deepEqual(await app.evaluate(`
        ${setControl('waveShape', 'sine')}
        ${dispatchKey('keydown', 'q')}
        ${setControl('waveShape', 'sawtooth')}
        ${dispatchKey('keydown', 'w')}
        return window.__sounds.map((sound) => sound.shape);
      `), ['sine', 'sawtooth']);
    });
  });

  describe('silencing everything with Escape', () => {
    it('stops every note that is sounding', async () => {
      await recordAudio();

      assert.deepEqual(await app.evaluate(`
        ['q', 'w', 'e'].forEach(key =>
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
        const sounding = window.__sounds.length;
        ${dispatchKey('keydown', 'Escape')}
        return [sounding, window.__stops];
      `), [3, 3]);
    });

    it('clears the keys it silenced, once the key is let go', async () => {
      assert.deepEqual(await app.evaluate(`
        ['q', 'w'].forEach(key =>
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
        const litBefore = document.querySelectorAll('.note.active').length;
        ${dispatchKey('keydown', 'Escape')}
        ${dispatchKey('keyup', 'Escape')}
        return [litBefore, document.querySelectorAll('.note.active').length];
      `), [2, 0]);
    });

    it('marks the page while it is held, and unmarks it on release', async () => {
      assert.deepEqual(await app.evaluate(`
        ${dispatchKey('keydown', 'Escape')}
        const marked = document.body.classList.contains('stop');
        ${dispatchKey('keyup', 'Escape')}
        return [marked, document.body.classList.contains('stop')];
      `), [true, false]);
    });

    it('silences notes even while a form field has focus, being the panic key', async () => {
      await recordAudio();

      assert.equal(await app.evaluate(`
        ${dispatchKey('keydown', 'q')}
        const volume = document.getElementById('oscillatorVolume');
        volume.focus();
        volume.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        volume.blur();
        return window.__stops;
      `), 1);
    });

    it('silences a note being auditioned on the configuration screen', async () => {
      await recordAudio();

      assert.deepEqual(await app.evaluate(`
        document.querySelector('[data-show-view="config"]').click();
        ${dispatchKey('keydown', 'q')}
        const sounding = window.__sounds.length;
        ${dispatchKey('keydown', 'Escape')}
        ${dispatchKey('keyup', 'Escape')}
        return [sounding, window.__stops, document.querySelectorAll('.config-note.active').length];
      `), [1, 1, 0]);
    });

    it('does nothing worth noticing when nothing is sounding', async () => {
      await recordAudio();

      assert.equal(await app.evaluate(`
        ${dispatchKey('keydown', 'Escape')}
        ${dispatchKey('keyup', 'Escape')}
        return window.__stops;
      `), 0);
      assert.deepEqual(app.consoleErrors, []);
    });
  });
});
