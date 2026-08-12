import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { playSound, stopSound, stopAllSounds, setSoundFrequency, isSounding } from '../../js/audio/audioHandler.js';

/**
 * A Web Audio stub that records what the app asks of it. Installed once,
 * because audioHandler holds on to the first AudioContext it builds.
 */
const oscillators = [];
const gains = [];

const stubAudio = () => {
  class FakeAudioParam {
    constructor() {
      this.value = null;
      this.targets = [];
      this.ramps = [];
      this.cancelledAt = null;
    }

    setValueAtTime(value) {
      this.value = value;
    }

    setTargetAtTime(value, startTime, timeConstant) {
      this.targets.push({ value, timeConstant });
      this.value = value;
    }

    linearRampToValueAtTime(value, endTime) {
      this.ramps.push({ value, endTime, from: this.value });
    }

    cancelScheduledValues(startTime) {
      this.cancelledAt = startTime;
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
        stoppedAt: null,
        disconnected: false,
        onended: null,
        start() { this.started = true; },
        stop(when = null) { this.stopped = true; this.stoppedAt = when; },
        connect() {},
        disconnect() { this.disconnected = true; },
        // What the browser does when a scheduled stop is reached.
        end() { this.onended?.(); },
      };
      oscillators.push(oscillator);
      return oscillator;
    }

    createGain() {
      const gainNode = { gain: new FakeAudioParam(), connect() {}, disconnect() {} };
      gains.push(gainNode);
      return gainNode;
    }
  }

  globalThis.window = { AudioContext: FakeAudioContext };
};

stubAudio();

beforeEach(() => {
  oscillators.length = 0;
  gains.length = 0;
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

describe('the attack', () => {
  it('swells from silence to the volume over the attack, rather than switching', () => {
    playSound(440, 'q', 0.5, 'sine', 0.2);

    assert.equal(gains[0].gain.value, 0);
    assert.deepEqual(gains[0].gain.ramps, [{ value: 0.5, endTime: 0.2, from: 0 }]);
  });

  it('reads a volume that arrived from a form field as a number', () => {
    playSound(440, 'q', '0.4', 'sine', 0.2);

    assert.equal(gains[0].gain.ramps[0].value, 0.4);
  });

  it('starts at the volume when there is no attack, without scheduling a ramp', () => {
    playSound(440, 'q', '0.5', 'sine', 0);

    assert.equal(gains[0].gain.value, '0.5');
    assert.deepEqual(gains[0].gain.ramps, []);
  });
});

describe('the release', () => {
  it('fades to silence over the release and stops the oscillator there', () => {
    playSound(440, 'q', 0.5, 'sine', 0);

    stopSound('q', 0.3);

    assert.deepEqual(gains[0].gain.ramps, [{ value: 0, endTime: 0.3, from: 0.5 }]);
    assert.equal(oscillators[0].stoppedAt, 0.3);
  });

  it('releases from where the attack had got to, so a stab does not swell first', () => {
    playSound(440, 'q', 0.5, 'sine', 2);
    // Part-way up the attack, which is where a key let go early leaves it.
    gains[0].gain.value = 0.1;

    stopSound('q', 0.3);

    assert.equal(gains[0].gain.cancelledAt, 0);
    assert.equal(gains[0].gain.ramps[1].from, 0.1);
  });

  it('frees the key at once, so it can be struck again while the voice fades', () => {
    playSound(440, 'q', 0.5, 'sine', 0);

    stopSound('q', 0.3);
    assert.equal(isSounding('q'), false);

    playSound(660, 'q', 0.5, 'sine', 0);

    assert.equal(oscillators.length, 2);
    assert.equal(oscillators[1].stopped, false);
    assert.equal(isSounding('q'), true);
  });

  it('leaves a fading voice where it was released, out of reach of a root change', () => {
    playSound(440, 'q', 0.5, 'sine', 0);
    stopSound('q', 0.3);

    setSoundFrequency('q', 550);

    assert.equal(oscillators[0].frequency.value, 440);
  });

  it('tears the voice down only once it has finished sounding', () => {
    playSound(440, 'q', 0.5, 'sine', 0);

    stopSound('q', 0.3);
    assert.equal(oscillators[0].disconnected, false);

    oscillators[0].end();
    assert.equal(oscillators[0].disconnected, true);
  });

  it('stops dead when there is no release, as it always did', () => {
    playSound(440, 'q', 0.5, 'sine', 0);

    stopSound('q', 0);

    assert.equal(oscillators[0].stoppedAt, null);
    assert.equal(oscillators[0].disconnected, true);
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

  it('silences a voice that is still fading, being the panic stop', (t) => {
    t.mock.method(console, 'log', () => {});
    playSound(440, 'q', 0.5, 'sine', 0);
    stopSound('q', 2);

    stopAllSounds();

    assert.equal(gains[0].gain.value, 0);
    assert.equal(oscillators[0].stoppedAt, null);
    assert.equal(oscillators[0].disconnected, true);
  });

  it('leaves nothing behind to tear down twice', (t) => {
    t.mock.method(console, 'log', () => {});
    playSound(440, 'q', 0.5, 'sine', 0);
    stopSound('q', 2);
    stopAllSounds();

    oscillators[0].disconnected = false;
    oscillators[0].end();

    assert.equal(oscillators[0].disconnected, false);
  });
});
