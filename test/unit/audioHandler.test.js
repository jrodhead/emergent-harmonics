import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { playSound, stopSound, stopAllSounds, setSoundFrequency, isSounding } from '../../js/audio/audioHandler.js';

/**
 * A Web Audio stub that records what the app asks of it. Installed once,
 * because audioHandler holds on to the first AudioContext it builds.
 */
const oscillators = [];

const stubAudio = () => {
  class FakeAudioParam {
    constructor() {
      this.value = null;
      this.targets = [];
    }

    setValueAtTime(value) {
      this.value = value;
    }

    setTargetAtTime(value, startTime, timeConstant) {
      this.targets.push({ value, timeConstant });
      this.value = value;
    }
  }

  class FakeAudioContext {
    constructor() {
      this.currentTime = 0;
      this.destination = { name: 'destination' };
    }

    createOscillator() {
      const oscillator = {
        type: null,
        frequency: new FakeAudioParam(),
        started: false,
        stopped: false,
        disconnected: false,
        start() { this.started = true; },
        stop() { this.stopped = true; },
        connect() {},
        disconnect() { this.disconnected = true; },
      };
      oscillators.push(oscillator);
      return oscillator;
    }

    createGain() {
      return { gain: new FakeAudioParam(), connect() {}, disconnect() {} };
    }
  }

  globalThis.window = { AudioContext: FakeAudioContext };
};

stubAudio();

beforeEach(() => {
  oscillators.length = 0;
});

afterEach((t) => {
  t.mock.method(console, 'log', () => {});
  stopAllSounds();
});

describe('playSound', () => {
  it('starts an oscillator at the requested frequency and shape', () => {
    playSound(440, 'q', '0.5', 'square');

    assert.equal(oscillators.length, 1);
    assert.equal(oscillators[0].frequency.value, 440);
    assert.equal(oscillators[0].type, 'square');
    assert.equal(oscillators[0].started, true);
  });

  it('refuses a frequency that is not a number', (t) => {
    t.mock.method(console, 'error', () => {});

    playSound(Number.NaN, 'q', '0.5', 'sine');

    assert.equal(oscillators[0].started, false);
  });

  it('keeps a separate oscillator per key, so notes stack', () => {
    playSound(440, 'q', '0.5', 'sine');
    playSound(660, 'w', '0.5', 'sine');

    assert.equal(oscillators.length, 2);
  });
});

describe('setSoundFrequency', () => {
  it('retunes a sound that is playing', () => {
    playSound(440, 'q', '0.5', 'sine');

    setSoundFrequency('q', 550);

    assert.equal(oscillators[0].frequency.value, 550);
  });

  it('glides rather than jumping, so a drag does not click', () => {
    playSound(440, 'q', '0.5', 'sine');

    setSoundFrequency('q', 550);

    assert.equal(oscillators[0].frequency.targets.length, 1);
    assert.ok(oscillators[0].frequency.targets[0].timeConstant > 0);
  });

  it('glides for as long as it is asked to', () => {
    playSound(440, 'q', '0.5', 'sine');

    setSoundFrequency('q', 550, 0.05);

    assert.equal(oscillators[0].frequency.targets[0].timeConstant, 0.05);
  });

  it('arrives at once when the glide is off, without re-striking the note', () => {
    playSound(440, 'q', '0.5', 'sine');

    setSoundFrequency('q', 550, 0);

    assert.deepEqual(oscillators[0].frequency.targets, []);
    assert.equal(oscillators[0].frequency.value, 550);
    assert.equal(oscillators[0].stopped, false);
  });

  it('retunes only the key it was given, leaving the others alone', () => {
    playSound(440, 'q', '0.5', 'sine');
    playSound(660, 'w', '0.5', 'sine');

    setSoundFrequency('w', 700);

    assert.equal(oscillators[0].frequency.value, 440);
    assert.equal(oscillators[1].frequency.value, 700);
  });

  it('does nothing for a key that is not sounding', () => {
    assert.doesNotThrow(() => setSoundFrequency('nothing-here', 550));
  });

  it('does nothing once the sound has stopped', () => {
    playSound(440, 'q', '0.5', 'sine');
    stopSound('q');

    setSoundFrequency('q', 550);

    assert.equal(oscillators[0].frequency.value, 440);
  });

  it('refuses a frequency that is not a number', (t) => {
    t.mock.method(console, 'error', () => {});
    playSound(440, 'q', '0.5', 'sine');

    setSoundFrequency('q', Number.NaN);

    assert.equal(oscillators[0].frequency.value, 440);
  });
});

describe('isSounding', () => {
  it('tells a key with a voice from one without, so a held note can be moved', () => {
    assert.equal(isSounding('q'), false);

    playSound(440, 'q', '0.5', 'sine');
    assert.equal(isSounding('q'), true);

    stopSound('q');
    assert.equal(isSounding('q'), false);
  });
});

describe('stopSound', () => {
  it('stops and disconnects the oscillator for that key', () => {
    playSound(440, 'q', '0.5', 'sine');

    stopSound('q');

    assert.equal(oscillators[0].stopped, true);
    assert.equal(oscillators[0].disconnected, true);
  });

  it('does nothing for a key that is not sounding', () => {
    assert.doesNotThrow(() => stopSound('nothing-here'));
  });
});

describe('stopAllSounds', () => {
  it('stops every sounding key', (t) => {
    t.mock.method(console, 'log', () => {});
    playSound(440, 'q', '0.5', 'sine');
    playSound(660, 'w', '0.5', 'sine');

    stopAllSounds();

    assert.ok(oscillators.every((oscillator) => oscillator.stopped));
    setSoundFrequency('q', 550);
    assert.equal(oscillators[0].frequency.value, 440);
  });
});
