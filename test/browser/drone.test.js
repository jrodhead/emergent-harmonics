import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { launchApp, findChrome } from '../helpers/browser.js';
import { recordAudio } from '../helpers/recordAudio.js';

const skip = findChrome() ? false : 'no Chrome-like browser installed to test with';

let app;

const dispatchKey = (type, key) => `
  document.body.dispatchEvent(new KeyboardEvent('${type}', { key: '${key}', bubbles: true }));
`;

const setControl = (id, value) => `
  {
    const control = document.getElementById('${id}');
    control.value = '${value}';
    control.dispatchEvent(new Event('input', { bubbles: true }));
  }
`;

const droneToggle = dispatchKey('keydown', '`');
const droneModeSwitch = dispatchKey('keydown', '~');
const holdMode = dispatchKey('keydown', '*');

// Starts on its own first character, so `return ${indicator}` is not cut in
// half by a semicolon the parser inserts after the return.
const indicator = `[document.getElementById('drone').textContent,
   document.getElementById('droneMode').textContent,
   document.getElementById('droneTable').classList.contains('active')]
`;

// Root key 4's own frequency, as the keyboard shows it, so the test does not
// have to know the preset's ratios.
const rootFrequency = (key) => `
  parseFloat(document.querySelector('#root${key} .frequency').textContent)
`;

describe('the drone', { skip }, () => {
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

  it('starts off and anchored, and says so', async () => {
    assert.deepEqual(await app.evaluate(`return ${indicator}`), ['off', 'anchored', false]);
  });

  it('sounds one voice a period under the fundamental, at its own level', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${droneToggle}

      return [window.__sounds.length, window.__sounds[0].frequency,
              window.__sounds[0].volume, window.__sounds[0].attack,
              document.getElementById('oscillatorVolume').value,
              ...${indicator}];
    `), [1, 216, 0.3, 0.01, '0.5', 'on', 'anchored', true]);
  });

  it('is turned off by the same key, with the release', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${droneToggle}
      ${droneToggle}

      return [window.__stops, window.__sounds[0].stoppedIn,
              window.__sounds.length, ...${indicator}];
    `), [1, 0.12, 1, 'off', 'anchored', false]);
  });

  describe('a root change', () => {
    it('leaves an anchored drone exactly where it is, scheduling nothing at all', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${dispatchKey('keydown', '4')}

        return [window.__glides.length, window.__sounds[0].frequency,
                window.__sounds.length, window.__stops];
      `), [0, 216, 1, 0]);
    });

    it('glides a following drone onto the new root, rather than re-striking it', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${droneModeSwitch}
        const onTheSwitch = window.__glides.length;

        ${dispatchKey('keydown', '4')}

        return [onTheSwitch, window.__glides.length,
                window.__glides[0].frequency === Math.round(${rootFrequency(4)} / 2),
                window.__glides[0].timeConstant > 0,
                window.__sounds.length, window.__stops,
                document.getElementById('droneMode').textContent];
      `), [0, 1, true, true, 1, 0, 'following']);
    });

    it('glides home again when the mode is switched back', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${droneModeSwitch}
        ${dispatchKey('keydown', '4')}
        ${droneModeSwitch}

        return [window.__glides.length, window.__sounds[0].frequency,
                document.getElementById('droneMode').textContent];
      `), [2, 216, 'anchored']);
    });
  });

  describe('what it survives', () => {
    it('a register change, in either mode', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${dispatchKey('keydown', 'ArrowUp')}
        ${dispatchKey('keydown', 'ArrowDown')}
        const anchored = [window.__glides.length, window.__stops];

        ${droneModeSwitch}
        ${dispatchKey('keydown', 'ArrowUp')}
        ${dispatchKey('keydown', 'ArrowDown')}

        return [...anchored, window.__glides.length, window.__stops,
                window.__sounds[0].frequency, window.__sounds[0].stoppedIn === undefined];
      `), [0, 0, 0, 0, 216, true]);
    });

    it('notes played and released over it', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ['q', 'w', 'e'].forEach(key => {
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
          document.body.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
        });

        return [window.__sounds.length, window.__stops,
                window.__sounds[0].stoppedIn === undefined, ...${indicator}];
      `), [4, 3, true, 'on', 'anchored', true]);
    });

    it('hold mode with no root ever held, which the note keys do not', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${holdMode}
        ${droneToggle}
        const droning = window.__sounds.length;

        ${dispatchKey('keydown', 'q')}

        return [droning, window.__sounds.length, window.__sounds[0].frequency,
                document.getElementById('drone').textContent];
      `), [1, 1, 216, 'on']);
    });

    it('both edges of the sustain pedal', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${dispatchKey('keydown', ' ')}
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keyup', 'q')}
        const pedalled = [window.__stops, window.__sounds[0].stoppedIn === undefined];

        ${dispatchKey('keyup', ' ')}

        return [...pedalled, window.__stops, window.__sounds[0].stoppedIn === undefined,
                document.getElementById('drone').textContent];
      `), [0, true, 1, true, 'on']);
    });
  });

  describe('its two controls', () => {
    it('start where the drone does, and say what they mean', async () => {
      assert.deepEqual(await app.evaluate(`
        return [document.getElementById('dronePeriod').value,
                document.getElementById('dronePeriodOutput').textContent,
                document.getElementById('droneVolume').value,
                document.getElementById('droneVolumeOutput').textContent];
      `), ['-1', '1 period below', '0.3', '0.3']);
    });

    it('glides the sounding drone as the pitch is dragged, one step at a time', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${setControl('dronePeriod', -2)}
        ${setControl('dronePeriod', -3)}

        return [window.__glides.map(glide => glide.frequency),
                window.__sounds.length, window.__stops,
                document.getElementById('dronePeriodOutput').textContent];
      `), [[108, 54], 1, 0, '3 periods below']);
    });

    it('says "at the root" and "above" at the other end of the pitch control', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${setControl('dronePeriod', 0)}
        const home = [window.__sounds[0].frequency,
                      document.getElementById('dronePeriodOutput').textContent];

        ${setControl('dronePeriod', 1)}
        return [...home, window.__sounds[0].frequency,
                document.getElementById('dronePeriodOutput').textContent];
      `), [432, 'at the root', 864, '1 period above']);
    });

    it('re-levels the sounding drone as the level is dragged, without re-striking it', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${setControl('droneVolume', 0.6)}
        ${setControl('droneVolume', 0.8)}

        return [window.__levels.map(level => level.volume),
                window.__levels.every(level => level.timeConstant > 0),
                window.__sounds.length, window.__stops,
                document.getElementById('droneVolumeOutput').textContent];
      `), [[0.6, 0.8], true, 1, 0, '0.8']);
    });

    it('does nothing to a drone that is not sounding', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${setControl('droneVolume', 0.6)}
        ${setControl('dronePeriod', -2)}

        return [window.__levels.length, window.__glides.length, window.__sounds.length];
      `), [0, 0, 0]);
    });

    it('is a separate level from the oscillator volume, which does not reach it', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${setControl('oscillatorVolume', 0.9)}
        const undisturbed = [window.__levels.length, window.__stops, window.__sounds.length];

        ${dispatchKey('keydown', 'q')}

        return [...undisturbed, window.__sounds[1].volume, window.__sounds[0].volume];
      `), [0, 0, 1, 0.9, 0.3]);
    });

    it('remembers both between visits, without changing what a note sounds like', async () => {
      await app.evaluate(`
        ${setControl('dronePeriod', -3)}
        ${setControl('droneVolume', 0.15)}
      `);
      await app.reload();
      await app.evaluate('document.querySelector(\'[data-show-view="play"]\').click();');
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${dispatchKey('keydown', 'q')}

        return [document.getElementById('dronePeriod').value,
                document.getElementById('dronePeriodOutput').textContent,
                document.getElementById('droneVolume').value,
                window.__sounds[0].frequency, window.__sounds[0].volume,
                window.__sounds[1].volume];
      `), ['-3', '3 periods below', '0.15', 54, 0.15, 0.5]);
    });
  });

  describe('the panics', () => {
    it('is turned off outright by Escape, so its key still works afterwards', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${dispatchKey('keydown', 'Escape')}
        const panicked = [window.__sounds[0].stoppedIn, ...${indicator}];

        ${dispatchKey('keyup', 'Escape')}
        ${droneToggle}
        return [...panicked, window.__sounds.length,
                document.getElementById('drone').textContent];
      `), [0, 'off', 'anchored', false, 2, 'on']);
    });

    it('is turned off by a view change, and leaves nothing behind', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        document.querySelector('[data-show-view="config"]').click();
        const left = [window.__sounds[0].stoppedIn, ...${indicator}];

        document.querySelector('[data-show-view="play"]').click();
        return left;
      `), [0, 'off', 'anchored', false]);

      assert.deepEqual(app.consoleErrors, []);
    });
  });

  describe('where it does not listen', () => {
    it('neither key does anything while the configuration screen is open', async () => {
      assert.deepEqual(await app.evaluate(`
        document.querySelector('[data-show-view="config"]').click();
        ${droneToggle}
        ${droneModeSwitch}

        return ${indicator};
      `), ['off', 'anchored', false]);
    });

    it('neither key does anything while a field has focus', async () => {
      assert.deepEqual(await app.evaluate(`
        const level = document.getElementById('droneVolume');
        level.focus();
        level.dispatchEvent(new KeyboardEvent('keydown', { key: '\`', bubbles: true }));
        level.dispatchEvent(new KeyboardEvent('keydown', { key: '~', bubbles: true }));
        level.blur();

        return ${indicator};
      `), ['off', 'anchored', false]);
    });
  });
});
