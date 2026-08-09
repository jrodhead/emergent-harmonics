import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { launchApp, findChrome } from '../helpers/browser.js';

const skip = findChrome() ? false : 'no Chrome-like browser installed to test with';

let app;

const dispatchKey = (type, key) => `
  document.body.dispatchEvent(new KeyboardEvent('${type}', { key: '${key}', bubbles: true }));
`;

describe('play modes', { skip }, () => {
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

  it('starts in latch mode', async () => {
    assert.equal(await app.evaluate("return document.getElementById('playMode').textContent"), 'latch');
  });

  it('cycles between latch and hold on *, and back again', async () => {
    const modeAfterStar = () => app.evaluate(`
      ${dispatchKey('keydown', '*')}
      return document.getElementById('playMode').textContent;
    `);

    assert.equal(await modeAfterStar(), 'hold');
    assert.equal(await modeAfterStar(), 'latch');
  });

  it('does not toggle mode while a form field has focus', async () => {
    assert.equal(await app.evaluate(`
      const volume = document.getElementById('oscillatorVolume');
      volume.focus();
      volume.dispatchEvent(new KeyboardEvent('keydown', { key: '*', bubbles: true }));
      volume.blur();
      return document.getElementById('playMode').textContent;
    `), 'latch');
  });

  it('does not toggle mode while the configuration screen is open', async () => {
    assert.equal(await app.evaluate(`
      document.querySelector('[data-show-view="config"]').click();
      ${dispatchKey('keydown', '*')}
      return document.getElementById('playMode').textContent;
    `), 'latch');
  });

  describe('latch mode (default)', () => {
    it('sounds a note key on its own, without holding a root key', async () => {
      assert.deepEqual(await app.evaluate(`
        ${dispatchKey('keydown', 'q')}
        const lit = document.getElementById('q').classList.contains('active');
        ${dispatchKey('keyup', 'q')}
        return [lit, document.getElementById('q').classList.contains('active')];
      `), [true, false]);
    });

    it('does not require a root key at all to keep sounding notes', async () => {
      assert.deepEqual(await app.evaluate(`
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keydown', 'w')}
        return document.querySelectorAll('.note.active').length;
      `), 2);
    });

    it('keeps a held note marked active through a root change', async () => {
      assert.equal(await app.evaluate(`
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keydown', '1')}
        ${dispatchKey('keyup', '1')}
        return document.getElementById('q').classList.contains('active');
      `), true);
    });
  });

  describe('hold mode', () => {
    beforeEach(async () => {
      await app.evaluate(dispatchKey('keydown', '*'));
    });

    it('stays silent when a note key is held without a root', async () => {
      assert.equal(await app.evaluate(`
        ${dispatchKey('keydown', 'q')}
        return document.getElementById('q').classList.contains('active');
      `), false);
    });

    it('sounds once both the root and the note are held, note first', async () => {
      assert.equal(await app.evaluate(`
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keydown', '0')}
        return document.getElementById('q').classList.contains('active');
      `), true);
    });

    it('sounds once both the root and the note are held, root first', async () => {
      assert.equal(await app.evaluate(`
        ${dispatchKey('keydown', '0')}
        ${dispatchKey('keydown', 'q')}
        return document.getElementById('q').classList.contains('active');
      `), true);
    });

    it('stops the note when the root is released, even though the note key is still held', async () => {
      assert.equal(await app.evaluate(`
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keydown', '0')}
        ${dispatchKey('keyup', '0')}
        return document.getElementById('q').classList.contains('active');
      `), false);
    });

    it('resumes a still-held note when the root is pressed again', async () => {
      assert.equal(await app.evaluate(`
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keydown', '0')}
        ${dispatchKey('keyup', '0')}
        ${dispatchKey('keydown', '0')}
        return document.getElementById('q').classList.contains('active');
      `), true);
    });

    it('re-pitches a held note when a different root is pressed underneath it', async () => {
      assert.deepEqual(await app.evaluate(`
        ${dispatchKey('keydown', '0')}
        ${dispatchKey('keydown', 'q')}
        const before = document.getElementById('q').querySelector('.note-frequency').textContent;

        ${dispatchKey('keyup', '0')}
        ${dispatchKey('keydown', '1')}

        return [before !== document.getElementById('q').querySelector('.note-frequency').textContent,
                document.getElementById('q').classList.contains('active')];
      `), [true, true]);
    });

    it('lets several held notes sound together under one root', async () => {
      assert.equal(await app.evaluate(`
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keydown', 'w')}
        ${dispatchKey('keydown', '0')}
        return document.querySelectorAll('.note.active').length;
      `), 2);
    });

    it('silences every held note when the root is released', async () => {
      assert.equal(await app.evaluate(`
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keydown', 'w')}
        ${dispatchKey('keydown', '0')}
        ${dispatchKey('keyup', '0')}
        return document.querySelectorAll('.note.active').length;
      `), 0);
    });

    it('stops a note on its own keyup regardless of the root', async () => {
      assert.equal(await app.evaluate(`
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keydown', '0')}
        ${dispatchKey('keyup', 'q')}
        return document.getElementById('q').classList.contains('active');
      `), false);
    });

    it('runs a full hold-mode sequence without logging an error or throwing', async () => {
      await app.evaluate(`
        ${dispatchKey('keydown', '0')}
        ${dispatchKey('keydown', 'q')}
        ${dispatchKey('keydown', 'w')}
        ${dispatchKey('keyup', '0')}
        ${dispatchKey('keydown', '1')}
        ${dispatchKey('keyup', 'q')}
        ${dispatchKey('keyup', 'w')}
        ${dispatchKey('keyup', '1')}
      `);

      assert.deepEqual(app.consoleErrors, []);
    });
  });
});
