import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { launchApp, findChrome } from '../helpers/browser.js';
import { recordAudio } from '../helpers/recordAudio.js';

const skip = findChrome() ? false : 'no Chrome-like browser installed to test with';

let app;

const dispatchKey = (type, key) => `
  document.body.dispatchEvent(new KeyboardEvent('${type}', { key: '${key}', bubbles: true }));
`;

const setGlide = (milliseconds) => `
  {
    const control = document.getElementById('glideTime');
    control.value = '${milliseconds}';
    control.dispatchEvent(new Event('input', { bubbles: true }));
  }
`;

const frequencyShownOn = (key) => `
  Math.round(parseFloat(document.getElementById('${key}').querySelector('.frequency').textContent))
`;

describe('gliding held notes into a new tuning', { skip }, () => {
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

  it('moves a held note to its new pitch rather than re-striking it', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${dispatchKey('keydown', 'q')}
      const struck = window.__sounds.length;

      ${dispatchKey('keydown', '1')}
      ${dispatchKey('keyup', '1')}

      return [struck, window.__sounds.length, window.__stops,
              window.__glides.length,
              window.__glides[0].frequency === ${frequencyShownOn('q')},
              window.__glides[0].timeConstant > 0,
              document.getElementById('q').classList.contains('active')];
    `), [1, 1, 0, 1, true, true, true]);
  });

  it('moves a whole held chord, so the sonority slides as one', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ['q', 'w', 'e'].forEach(key =>
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));

      ${dispatchKey('keydown', '4')}

      return [window.__sounds.length, window.__stops,
              window.__glides.map(glide => glide.frequency),
              ['q', 'w', 'e'].map(key =>
                Math.round(parseFloat(document.getElementById(key).querySelector('.frequency').textContent)))];
    `), [3, 0, [540, 576, 608], [540, 576, 608]]);
  });

  it('lands exactly home again, since the roots do not drift', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${dispatchKey('keydown', 'q')}
      const home = window.__sounds[0].frequency;

      ['4', '7', '2', '0'].forEach(root =>
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: root, bubbles: true })));

      return [home, window.__sounds[0].frequency, window.__stops];
    `), [432, 432, 0]);
  });

  it('glides through a register change too, the same as through a root change', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keydown', 'ArrowUp')}

      return [window.__sounds.length, window.__stops,
              window.__glides[0].frequency === ${frequencyShownOn('q')}];
    `), [1, 0, true]);
  });

  it('stops a held note whose key has no pitch in the new system', async () => {
    await recordAudio(app);

    // One note per scale, so each register is a single key and the keyboard
    // reaches fewer of them from a higher root: y is off the end of root 1.
    assert.deepEqual(await app.evaluate(`
      document.querySelector('[data-show-view="config"]').click();
      for (let attempt = 0; attempt < 20; attempt++) {
        const remove = document.querySelectorAll('.config-note-remove')[1];
        if (remove && !remove.disabled) remove.click();
      }
      document.querySelector('[data-show-view="play"]').click();

      ${dispatchKey('keydown', 'q')}
      ${dispatchKey('keydown', 'y')}
      const sounding = window.__sounds.length;

      ${dispatchKey('keydown', '1')}

      return [sounding, window.__stops, window.__glides.length,
              document.getElementById('y'), document.getElementById('q').classList.contains('active')];
    `), [2, 1, 1, null, true]);
  });

  it('leaves no error behind over a long run of root changes under a chord', async () => {
    await app.evaluate(`
      ['q', 'w', 'e'].forEach(key =>
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
      ['1', '4', '9', '2', '0'].forEach(root => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: root, bubbles: true }));
        document.body.dispatchEvent(new KeyboardEvent('keyup', { key: root, bubbles: true }));
      });
      ['q', 'w', 'e'].forEach(key =>
        document.body.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true })));
    `);

    assert.deepEqual(app.consoleErrors, []);
  });

  describe('the glide control', () => {
    it('starts at a glide that can be heard, and says how long it is', async () => {
      assert.deepEqual(await app.evaluate(`
        return [document.getElementById('glideTime').value,
                document.getElementById('glideOutput').textContent];
      `), ['80', '80 ms']);
    });

    it('glides for as long as it is set to', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${setGlide(300)}
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keydown', '1')}

        return [document.getElementById('glideOutput').textContent,
                window.__glides[0].timeConstant];
      `), ['300 ms', 0.1]);
    });

    it('arrives at once at nought, without re-striking the note', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${setGlide(0)}
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keydown', '1')}

        return [window.__glides.length, window.__stops, window.__sounds.length,
                window.__sounds[0].frequency === ${frequencyShownOn('q')}];
      `), [0, 0, 1, true]);
    });

    it('remembers the glide across a reload', async () => {
      await app.evaluate(setGlide(250));
      await app.reload();

      assert.deepEqual(await app.evaluate(`
        return [document.getElementById('glideTime').value,
                document.getElementById('glideOutput').textContent];
      `), ['250', '250 ms']);
    });
  });

  describe('hold mode', () => {
    beforeEach(async () => {
      await app.evaluate(dispatchKey('keydown', '*'));
    });

    it('glides when the roots overlap, since the note never stops sounding', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${dispatchKey('keydown', '0')}
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keydown', '1')}

        return [window.__sounds.length, window.__stops,
                window.__glides[0].frequency === ${frequencyShownOn('q')}];
      `), [1, 0, true]);
    });

    it('re-strikes when the first root is let go before the second, having gone silent', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${dispatchKey('keydown', '0')}
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keyup', '0')}
        ${dispatchKey('keydown', '1')}

        return [window.__sounds.length, window.__stops, window.__glides.length];
      `), [2, 1, 0]);
    });
  });
});
