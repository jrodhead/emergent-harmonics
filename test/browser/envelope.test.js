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

describe('starting and stopping notes smoothly', { skip }, () => {
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

  it('swells a note up from silence rather than switching it on', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${setControl('attackTime', 200)}
      ${dispatchKey('keydown', 'q')}

      const [sound] = window.__sounds;
      return [sound.attack, sound.volume];
    `), [0.2, 0.5]);
  });

  it('goes on sounding after the key is let go, and stops when it is silent', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${setControl('releaseTime', 500)}
      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keyup', 'q')}

      const [sound] = window.__sounds;
      return [sound.release, sound.stoppedIn, document.getElementById('q').classList.contains('active')];
    `), [0.5, 0.5, false]);
  });

  it('switches on and off at nought, for a player who wants the click', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${setControl('attackTime', 0)}
      ${setControl('releaseTime', 0)}
      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keyup', 'q')}

      const [sound] = window.__sounds;
      return [sound.attack === undefined, sound.release === undefined,
              sound.volume, sound.stoppedIn];
    `), [true, true, 0.5, 0]);
  });

  it('takes the key back at once, so it can be struck again while it fades', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${setControl('releaseTime', 2000)}
      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keyup', 'q')}
      ${dispatchKey('keydown', 'q')}

      return [window.__sounds.length, window.__stops,
              window.__sounds[1].stoppedIn === undefined,
              document.getElementById('q').classList.contains('active')];
    `), [2, 1, true, true]);
  });

  it('leaves a fading note behind on a root change, rather than dragging it along', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${setControl('releaseTime', 2000)}
      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keyup', 'q')}
      ${dispatchKey('keydown', '4')}

      return [window.__glides.length, window.__sounds.length];
    `), [0, 1]);
  });

  it('silences a note still fading when Escape is pressed', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${setControl('releaseTime', 2000)}
      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keyup', 'q')}
      const fadingFor = window.__sounds[0].stoppedIn;

      ${dispatchKey('keydown', 'Escape')}

      return [fadingFor, window.__sounds[0].stoppedIn];
    `), [2, 0]);
  });

  it('fades a note auditioned on the configuration screen too', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${setControl('releaseTime', 300)}
      document.querySelector('[data-show-view="config"]').click();
      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keyup', 'q')}

      const [sound] = window.__sounds;
      return [sound.release, sound.stoppedIn];
    `), [0.3, 0.3]);
  });

  it('fades the chord out when the last root is released in hold mode', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${setControl('releaseTime', 400)}
      ${dispatchKey('keydown', '*')}
      ${dispatchKey('keydown', '0')}
      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keyup', '0')}

      return [window.__sounds.length, window.__sounds[0].stoppedIn];
    `), [1, 0.4]);
  });

  it('leaves no error behind when notes are struck on top of their own fading voices', async () => {
    await app.evaluate(`
      ${setControl('attackTime', 500)}
      ${setControl('releaseTime', 2000)}
      for (let round = 0; round < 5; round++) {
        ['q', 'w', 'e'].forEach(key => {
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
          document.body.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
        });
      }
    `);

    assert.deepEqual(app.consoleErrors, []);
  });

  describe('the controls', () => {
    it('start with an attack and a release, and say how long they are', async () => {
      assert.deepEqual(await app.evaluate(`
        return [document.getElementById('attackTime').value,
                document.getElementById('attackOutput').textContent,
                document.getElementById('releaseTime').value,
                document.getElementById('releaseOutput').textContent];
      `), ['10', '10 ms', '120', '120 ms']);
    });

    it('remember the envelope across a reload', async () => {
      await app.evaluate(setControl('attackTime', 300));
      await app.evaluate(setControl('releaseTime', 900));
      await app.reload();

      assert.deepEqual(await app.evaluate(`
        return [document.getElementById('attackOutput').textContent,
                document.getElementById('releaseOutput').textContent,
                document.getElementById('glideOutput').textContent];
      `), ['300 ms', '900 ms', '80 ms']);
    });
  });
});
