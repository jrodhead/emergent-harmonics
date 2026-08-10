import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { launchApp, findChrome } from '../helpers/browser.js';
import { presetIds, presetOptions } from '../../js/presets/registry.js';
import { MAX_ROOT_NOTES } from '../../js/system/generateSystem.js';
import { KEY_ROWS } from '../../js/keys/buildNoteKeyMap.js';

const skip = findChrome() ? false : 'no Chrome-like browser installed to test with';

const KEY_COUNT = KEY_ROWS.join('').length;

/** Every name a root key could legitimately show for the scale it builds. */
const labels = presetOptions().map(({ label }) => label);

let app;

/** Loads a preset into the scale being edited and opens the keyboard on it. */
const play = (presetId) => app.evaluate(`
  document.getElementById('presetSelect').value = '${presetId}';
  document.getElementById('loadPreset').click();
  const configured = document.querySelectorAll('.config-note[data-note-index]').length;
  document.querySelector('[data-show-view="play"]').click();
  return {
    configured,
    rootKeys: document.querySelectorAll('.root-key').length,
    noteKeys: document.querySelectorAll('.note').length,
    scaleName: document.querySelectorAll('.root-key .root-scale')[0].textContent.trim(),
  };
`);

const setRootFrequency = (frequency) => app.evaluate(`
  const root = document.getElementById('configRootFrequency');
  root.value = '${frequency}';
  root.dispatchEvent(new Event('change', { bubbles: true }));
`);

describe('the systems the app generates', { skip }, () => {
  before(async () => {
    app = await launchApp();
    await app.reload();
  });

  after(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await app.resetApp();
  });

  describe('every preset it ships with', () => {
    presetIds.forEach((presetId) => {
      it(`plays ${presetId} without a dead key or an error`, async () => {
        const system = await play(presetId);

        assert.ok(system.configured > 0, 'the preset produces notes to edit');
        assert.equal(system.rootKeys, MAX_ROOT_NOTES, 'every root key is filled');
        assert.equal(system.noteKeys, KEY_COUNT, 'every note key is filled');
        assert.ok(labels.includes(system.scaleName), `${system.scaleName} is a name, not an id`);

        await app.evaluate(`
          ['q', '0'].forEach(key => {
            document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
            document.body.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
          });
        `);

        assert.deepEqual(app.consoleErrors, []);
      });
    });
  });

  /**
   * Points the first note at the scale being edited, rather than at the preset
   * it was loaded from, so the note keys follow what is on the screen.
   */
  const buildFromThisScale = () => app.evaluate(`
    const select = document.querySelector('.config-note[data-note-index="0"] .config-note-root-scale');
    select.value = select.querySelector('optgroup option').value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  `);

  describe('a scale with fewer notes than there are keys', () => {
    const trimToRoot = () => app.evaluate(`
      for (let attempt = 0; attempt < 20; attempt++) {
        const remove = document.querySelectorAll('.config-note-remove')[1];
        if (remove && !remove.disabled) remove.click();
      }
      document.querySelector('[data-show-view="play"]').click();
    `);

    it('still fills every key, climbing a register at a time', async () => {
      await trimToRoot();

      assert.deepEqual(await app.evaluate(`
        return [document.querySelectorAll('.root-key').length,
                document.querySelectorAll('.note').length];
      `), [MAX_ROOT_NOTES, KEY_COUNT]);
    });

    it('repeats the one note it has up the periods, on the root keys', async () => {
      await trimToRoot();

      assert.deepEqual(await app.evaluate(`
        return ['root0', 'root1', 'root2'].map(id =>
          document.getElementById(id).querySelector('.degree').textContent);
      `), ['I', 'I +1', 'I +2']);
    });

    it('plays the scale the root points at, which a preset points at itself', async () => {
      // The presets name each other, so a note loaded from one keeps building
      // that preset's notes rather than whatever the scale is edited down to.
      await trimToRoot();

      assert.deepEqual(await app.evaluate(`
        return ['q', 'w', 'e'].map(key =>
          document.getElementById(key).querySelector('.degree').textContent);
      `), ['I', 'II', 'III']);
    });

    it('repeats up the periods on the note keys too, once the root points at the scale itself', async () => {
      await buildFromThisScale();
      await trimToRoot();

      assert.deepEqual(await app.evaluate(`
        return ['q', 'w', 'e'].map(key =>
          document.getElementById(key).querySelector('.degree').textContent);
      `), ['I', 'I +1', 'I +2']);
    });
  });

  describe('a scale with more notes than there are keys', () => {
    it('reaches as many notes as the keyboard has keys, and no further', async () => {
      await buildFromThisScale();

      const system = await app.evaluate(`
        for (let added = 0; added < 30; added++) document.getElementById('addNote').click();
        const configured = document.querySelectorAll('.config-note[data-note-index]').length;
        document.querySelector('[data-show-view="play"]').click();
        return [configured,
                document.querySelectorAll('.root-key').length,
                document.querySelectorAll('.note').length];
      `);

      assert.equal(system[0], 37, 'the scale holds more notes than the keyboard can show');
      assert.deepEqual(system.slice(1), [MAX_ROOT_NOTES, KEY_COUNT]);
      assert.equal(await app.evaluate(`
        return document.getElementById('/').querySelector('.degree').textContent;
      `), 'XXX', 'the last key reached is the thirtieth note');
    });

    it('lays the scale across the rows in order, spilling onto the row below', async () => {
      await buildFromThisScale();

      // Fourteen notes: ten fill the top row, the remaining four open the home
      // row, and the rest of that row climbs into the register above.
      assert.deepEqual(await app.evaluate(`
        for (let added = 0; added < 7; added++) document.getElementById('addNote').click();
        document.querySelector('[data-show-view="play"]').click();
        return ['q', 'p', 'a', 'f', 'g'].map(key =>
          document.getElementById(key).querySelector('.degree').textContent);
      `), ['I', 'X', 'XI', 'XIV', 'I +1']);
    });
  });

  describe('a root note near the top of the audible range', () => {
    it('gives a root key only to the roots that can be heard', async () => {
      await setRootFrequency(19000);

      assert.equal(await app.evaluate(`
        document.querySelector('[data-show-view="play"]').click();
        return document.querySelectorAll('.root-key').length;
      `), 1);
    });

    it('drops the note keys into the highest register that fits, rather than falling silent', async () => {
      await setRootFrequency(19000);

      const [shown, degree] = await app.evaluate(`
        document.querySelector('[data-show-view="play"]').click();
        const key = document.getElementById('q');
        return [Number(key.querySelector('.frequency').textContent.replace('Hz', '')),
                key.querySelector('.degree').textContent];
      `);

      assert.ok(shown >= 20 && shown <= 20000, `${shown}Hz is audible`);
      // The root itself is too high for its own register to fit, so the keys
      // sit whole periods below it.
      assert.match(degree, /^I −\d+$/);
      assert.deepEqual(app.consoleErrors, []);
    });
  });

  describe('a root note at the bottom of the audible range', () => {
    it('climbs from the root instead of trying to reach below it', async () => {
      await setRootFrequency(20);

      const frequencies = await app.evaluate(`
        document.querySelector('[data-show-view="play"]').click();
        return ['q', 'a', 'z'].map(key =>
          Number(document.getElementById(key).querySelector('.frequency').textContent.replace('Hz', '')));
      `);

      assert.deepEqual(frequencies, [20, 40, 80]);
      assert.deepEqual(app.consoleErrors, []);
    });
  });
});
