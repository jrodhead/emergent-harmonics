import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { launchApp, findChrome } from '../helpers/browser.js';
import { recordAudio } from '../helpers/recordAudio.js';

const skip = findChrome() ? false : 'no Chrome-like browser installed to test with';

let app;

const dispatchKey = (type, key) => `
  document.body.dispatchEvent(new KeyboardEvent('${type}', { key: '${key}', bubbles: true }));
`;

const setControl = (id, milliseconds) => `
  {
    const control = document.getElementById('${id}');
    control.value = '${milliseconds}';
    control.dispatchEvent(new Event('input', { bubbles: true }));
  }
`;

const holdMode = dispatchKey('keydown', '*');
const pedalDown = dispatchKey('keydown', ' ');
const pedalUp = dispatchKey('keyup', ' ');

describe('the sustain pedal', { skip }, () => {
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

  it('starts up, and says so', async () => {
    assert.equal(await app.evaluate("return document.getElementById('sustainPedal').textContent"), 'up');
  });

  it('reads down while Space is held, and up again when it is let go', async () => {
    assert.deepEqual(await app.evaluate(`
      ${pedalDown}
      const down = document.getElementById('sustainPedal').textContent;
      ${pedalUp}
      return [down, document.getElementById('sustainPedal').textContent];
    `), ['down', 'up']);
  });

  it('keeps a released note sounding until the pedal is lifted', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${setControl('releaseTime', 500)}
      ${pedalDown}
      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keyup', 'q')}

      const pedalled = [window.__stops,
                        window.__sounds[0].stoppedIn === undefined,
                        document.getElementById('q').classList.contains('active')];

      ${pedalUp}
      return [...pedalled, window.__stops, window.__sounds[0].stoppedIn];
    `), [0, true, false, 1, 0.5]);
  });

  it('stacks a voice for every strike, and lifts them all together', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${pedalDown}
      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keyup', 'q')}
      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keyup', 'q')}
      const ringing = window.__sounds.length;

      ${pedalUp}
      return [ringing, window.__stops];
    `), [2, 2]);
  });

  it('leaves a pedalled note where it was released, out of reach of a root change', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${pedalDown}
      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keyup', 'q')}
      ${dispatchKey('keydown', '4')}

      return [window.__glides.length, window.__sounds.length];
    `), [0, 1]);
  });

  it('silences everything it is holding on a panic stop', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${setControl('releaseTime', 2000)}
      ${pedalDown}
      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keyup', 'q')}
      const ringing = window.__sounds[0].stoppedIn === undefined;

      ${dispatchKey('keydown', 'Escape')}
      return [ringing, window.__sounds[0].stoppedIn];
    `), [true, 0]);
  });

  it('is lifted by a view change, along with everything it was holding', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${setControl('releaseTime', 2000)}
      ${pedalDown}
      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keyup', 'q')}

      document.querySelector('[data-show-view="config"]').click();
      document.querySelector('[data-show-view="play"]').click();
      ${pedalUp}

      return [window.__sounds[0].stoppedIn, document.getElementById('sustainPedal').textContent];
    `), [0, 'up']);

    assert.deepEqual(app.consoleErrors, []);
  });

  it('does not go down while the configuration screen is open', async () => {
    assert.equal(await app.evaluate(`
      document.querySelector('[data-show-view="config"]').click();
      ${pedalDown}
      return document.getElementById('sustainPedal').textContent;
    `), 'up');
  });

  it('is lifted by a Space keyup even where the keydown would have been ignored', async () => {
    assert.deepEqual(await app.evaluate(`
      ${pedalDown}
      const down = document.getElementById('sustainPedal').textContent;

      const volume = document.getElementById('oscillatorVolume');
      volume.focus();
      volume.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      volume.blur();

      return [down, document.getElementById('sustainPedal').textContent];
    `), ['down', 'up']);
  });

  describe('in hold mode', () => {
    it('holds a chord across the gap between one root key and the next, and glides it', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${holdMode}
        ${pedalDown}
        ${dispatchKey('keydown', '0')}
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keyup', '0')}

        const inTheGap = [window.__stops,
                          document.getElementById('q').classList.contains('active')];

        ${dispatchKey('keydown', '1')}
        return [...inTheGap, window.__glides.length, window.__sounds.length, window.__stops];
      `), [0, true, 1, 1, 0]);
    });

    it('keeps a note whose key is already up through the release of the last root', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${holdMode}
        ${pedalDown}
        ${dispatchKey('keydown', '0')}
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keyup', 'q')}
        ${dispatchKey('keyup', '0')}
        const surviving = window.__stops;

        ${pedalUp}
        return [surviving, window.__stops];
      `), [0, 1]);
    });

    it('gives the still-held keys back to hold mode when the pedal is lifted', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${holdMode}
        ${pedalDown}
        ${dispatchKey('keydown', '0')}
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keyup', '0')}
        ${pedalUp}

        return [window.__stops, document.getElementById('q').classList.contains('active')];
      `), [1, false]);
    });

    it('never starts a note that hold mode would not have started', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${holdMode}
        ${pedalDown}
        ${dispatchKey('keydown', 'q')}
        const beforeTheRegisterChange = window.__sounds.length;

        ${dispatchKey('keydown', 'ArrowUp')}
        return [beforeTheRegisterChange, window.__sounds.length];
      `), [0, 0]);
    });

    it('runs a pedalled hold-mode sequence without logging an error or throwing', async () => {
      await app.evaluate(`
        ${holdMode}
        ${pedalDown}
        ${dispatchKey('keydown', '0')}
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keydown', 'w')}
        ${dispatchKey('keyup', '0')}
        ${dispatchKey('keydown', '1')}
        ${dispatchKey('keyup', 'q')}
        ${pedalUp}
        ${dispatchKey('keyup', 'w')}
        ${dispatchKey('keyup', '1')}
      `);

      assert.deepEqual(app.consoleErrors, []);
    });
  });
});
