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

/** Loads a preset into the scale being edited, staying on the configuration. */
const load = (presetId) => app.evaluate(`
  document.getElementById('presetSelect').value = '${presetId}';
  document.getElementById('loadPreset').click();
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

  describe('the scales a preset builds', () => {
    it('says what a preset will bring in before it is loaded', async () => {
      assert.deepEqual(await app.evaluate(`
        const select = document.getElementById('presetSelect');
        const hintFor = (value) => {
          select.value = value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return document.getElementById('presetFamilyHint').textContent.trim();
        };
        return [hintFor('majorPentatonic'), hintFor('blues'), hintFor('major')];
      `), [
        'also brings in Minor pentatonic, which its degrees build',
        // The Pythagorean scale the app starts on builds nothing but itself.
        '',
        'also brings in Natural minor and Diminished, which its degrees build',
      ]);
    });

    it('modulates into the scale a degree builds, on the root key for that degree', async () => {
      await load('major');

      // Degree II of the major scale builds the natural minor, so the same
      // key plays a different interval above the root it was built from.
      assert.deepEqual(await app.evaluate(`
        document.querySelector('[data-show-view="play"]').click();
        const secondNoteOf = (rootKey) => {
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key: rootKey, bubbles: true }));
          document.body.dispatchEvent(new KeyboardEvent('keyup', { key: rootKey, bubbles: true }));
          return document.getElementById('w').querySelector('.interval-name').textContent;
        };
        return [secondNoteOf('0'), secondNoteOf('1')];
      `), ['Major 2nd', 'Minor 2nd']);
    });

    it('plays the edits made to the scale a degree builds', async () => {
      await load('major');

      const secondNoteUnderRoot1 = () => app.evaluate(`
        document.querySelector('[data-show-view="play"]').click();
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
        document.body.dispatchEvent(new KeyboardEvent('keyup', { key: '1', bubbles: true }));
        const played = document.getElementById('w').querySelector('.ratio').textContent;
        document.querySelector('[data-show-view="config"]').click();
        return played;
      `);

      const before = await secondNoteUnderRoot1();

      // Retune the second note of the natural minor scale, which is the scale
      // the second degree builds.
      await app.evaluate(`
        [...document.querySelectorAll('.config-scale-name')]
          .find(name => name.textContent.trim() === 'Natural minor').click();
        const ratio = document.querySelectorAll('.config-note-ratio')[1];
        ratio.value = '1.2';
        ratio.dispatchEvent(new Event('input', { bubbles: true }));
        ratio.dispatchEvent(new Event('change', { bubbles: true }));
      `);

      assert.equal(before, 'ratio: 1.0667');
      assert.equal(await secondNoteUnderRoot1(), 'ratio: 1.2');
    });

    it('leaves the built-in preset alone, so it can be loaded again fresh', async () => {
      await app.evaluate(`
        const ratio = document.querySelectorAll('.config-note-ratio')[1];
        ratio.value = '1.2';
        ratio.dispatchEvent(new Event('input', { bubbles: true }));
        ratio.dispatchEvent(new Event('change', { bubbles: true }));
      `);

      assert.equal(await app.evaluate(`
        document.getElementById('addScale').click();
        document.getElementById('presetSelect').value = 'major';
        document.getElementById('loadPreset').click();
        return document.querySelectorAll('.config-note-ratio')[1].value;
      `), '1.125');
    });
  });

  describe('a scale with fewer notes than there are keys', () => {
    const trimToRoot = () => app.evaluate(`
      for (let attempt = 0; attempt < 20; attempt++) {
        const remove = document.querySelectorAll('.config-note-remove')[1];
        if (remove && !remove.disabled) remove.click();
      }
      document.querySelector('[data-show-view="play"]').click();
    `);

    it('climbs a register per key, until the system runs out of registers', async () => {
      await trimToRoot();

      // One note per register, so each row starts a register higher than the
      // one below it and reaches one register less far before the top.
      assert.deepEqual(await app.evaluate(`
        return [document.querySelectorAll('.root-key').length,
                document.querySelectorAll('.note').length];
      `), [6, 15]);
    });

    it('repeats the one note it has up the periods, on the root keys', async () => {
      await trimToRoot();

      assert.deepEqual(await app.evaluate(`
        return ['root0', 'root1', 'root2'].map(id =>
          document.getElementById(id).querySelector('.degree').textContent);
      `), ['I', 'I +1', 'I +2']);
    });

    it('plays what is on the screen, rather than the preset it was loaded from', async () => {
      await trimToRoot();

      assert.deepEqual(await app.evaluate(`
        return ['q', 'w', 'e'].map(key =>
          document.getElementById(key).querySelector('.degree').textContent);
      `), ['I', 'I +1', 'I +2']);
    });
  });

  describe('a scale with more notes than there are keys', () => {
    it('reaches as many notes as the keyboard has keys, and no further', async () => {
      const system = await app.evaluate(`
        for (let added = 0; added < 30; added++) document.getElementById('addNote').click();
        const configured = document.querySelectorAll('.config-note[data-note-index]').length;
        document.querySelector('[data-show-view="play"]').click();
        return [configured,
                document.querySelectorAll('.root-key').length,
                document.querySelectorAll('.note').length];
      `);

      assert.equal(system[0], 42, 'the scale holds more notes than the keyboard can show');
      assert.deepEqual(system.slice(1), [MAX_ROOT_NOTES, KEY_COUNT]);
      assert.equal(await app.evaluate(`
        return document.getElementById('/').querySelector('.degree').textContent;
      `), 'XXX', 'the last key reached is the thirtieth note');
    });

    it('lays the scale across the rows in order, spilling onto the row below', async () => {
      // Fourteen notes: ten fill the top row, the remaining four open the home
      // row, and the rest of that row climbs into the register above.
      assert.deepEqual(await app.evaluate(`
        for (let added = 0; added < 2; added++) document.getElementById('addNote').click();
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
      // A scale of seven puts one register on each row, so the climb shows.
      await load('major');
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
