import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { launchApp, findChrome } from '../helpers/browser.js';

const skip = findChrome() ? false : 'no Chrome-like browser installed to test with';

let app;

describe('the system configuration screen', { skip }, () => {
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

  describe('on a first visit', () => {
    it('opens on the configuration screen, not the keyboard', async () => {
      assert.equal(await app.evaluate('return document.body.dataset.view'), 'config');
      assert.deepEqual(await app.evaluate(`
        return [getComputedStyle(document.getElementById('systemConfig')).display !== 'none',
                getComputedStyle(document.getElementById('keys')).display === 'none'];
      `), [true, true]);
    });

    it('starts from one major-scale diapason at 27Hz', async () => {
      assert.equal(await app.evaluate("return document.getElementById('configRootFrequency').value"), '27');
      assert.equal(await app.evaluate("return document.querySelectorAll('.config-diapason-select').length"), 1);
      assert.equal(await app.evaluate("return document.querySelectorAll('.config-note[data-note-index]').length"), 7);
    });

    it('offers every calculator as a preset', async () => {
      assert.ok(await app.evaluate("return document.getElementById('presetSelect').options.length >= 11"));
    });

    it('shows each note bounded between the root and its octave', async () => {
      assert.deepEqual(await app.evaluate(`
        const hz = document.querySelector('.config-note-hz');
        return [hz.value, hz.min, hz.max];
      `), ['27', '27', '54']);
    });

    it('keeps the per-degree triad types of the major scale', async () => {
      assert.deepEqual(await app.evaluate(`
        return [...document.querySelectorAll('.config-note-triad')]
          .map(select => select.selectedOptions[0].textContent.trim());
      `), [
        'majorScaleNotes', 'naturalMinorScaleNotes', 'naturalMinorScaleNotes', 'majorScaleNotes',
        'majorScaleNotes', 'naturalMinorScaleNotes', 'diminishedScaleNotes',
      ]);
    });

    it('never shows a triad type the note is not actually set to', async () => {
      assert.equal(await app.evaluate(`
        return [...document.querySelectorAll('.config-note-triad')]
          .every(select => select.value && !select.selectedOptions[0].textContent.includes('(unknown)'));
      `), true);
    });
  });

  describe('editing a note', () => {
    it('re-bounds every note when the root changes', async () => {
      assert.deepEqual(await app.evaluate(`
        const root = document.getElementById('configRootFrequency');
        root.value = '400';
        root.dispatchEvent(new Event('change', { bubbles: true }));
        const hz = document.querySelector('.config-note-hz');
        return [hz.min, hz.max, hz.value];
      `), ['400', '800', '400']);
    });

    it('moves ratio and frequency together when the slider is dragged', async () => {
      assert.deepEqual(await app.evaluate(`
        const root = document.getElementById('configRootFrequency');
        root.value = '400';
        root.dispatchEvent(new Event('change', { bubbles: true }));

        const row = document.querySelectorAll('.config-note')[1];
        const slider = row.querySelector('.config-note-slider');
        slider.value = '600';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        return [row.querySelector('.config-note-ratio').value, row.querySelector('.config-note-hz').value];
      `), ['1.5', '600']);
    });

    it('moves the frequency when the ratio is typed', async () => {
      assert.equal(await app.evaluate(`
        const root = document.getElementById('configRootFrequency');
        root.value = '400';
        root.dispatchEvent(new Event('change', { bubbles: true }));

        const row = document.querySelector('.config-note');
        const ratio = row.querySelector('.config-note-ratio');
        ratio.value = '1.25';
        ratio.dispatchEvent(new Event('input', { bubbles: true }));
        return row.querySelector('.config-note-hz').value;
      `), '500');
    });

    it('snaps a frequency past the octave back into the diapason', async () => {
      assert.deepEqual(await app.evaluate(`
        const root = document.getElementById('configRootFrequency');
        root.value = '400';
        root.dispatchEvent(new Event('change', { bubbles: true }));

        const hz = document.querySelectorAll('.config-note')[1].querySelector('.config-note-hz');
        hz.value = '5000';
        hz.dispatchEvent(new Event('input', { bubbles: true }));
        hz.dispatchEvent(new Event('change', { bubbles: true }));

        const row = document.querySelectorAll('.config-note')[1];
        return [row.querySelector('.config-note-hz').value, row.querySelector('.config-note-ratio').value];
      `), ['800', '2']);
    });

    it('adds and removes notes', async () => {
      assert.equal(await app.evaluate(`
        document.getElementById('addNote').click();
        return document.querySelectorAll('.config-note[data-note-index]').length;
      `), 8);

      assert.equal(await app.evaluate(`
        document.querySelectorAll('.config-note-remove')[0].click();
        return document.querySelectorAll('.config-note[data-note-index]').length;
      `), 7);
    });

    it('stops at a single note, which cannot be removed', async () => {
      assert.deepEqual(await app.evaluate(`
        for (let attempt = 0; attempt < 10; attempt++) {
          const button = document.querySelector('.config-note-remove');
          if (!button.disabled) button.click();
        }
        return [document.querySelectorAll('.config-note[data-note-index]').length,
                document.querySelector('.config-note-remove').disabled];
      `), [1, true]);
    });

    it('loads a calculator into the diapason being edited', async () => {
      assert.deepEqual(await app.evaluate(`
        document.getElementById('presetSelect').value = 'minorPentatonicScaleNotes';
        document.getElementById('loadPreset').click();
        return [document.querySelectorAll('.config-note[data-note-index]').length,
                document.getElementById('diapasonName').value];
      `), [5, 'minorPentatonicScaleNotes']);
    });
  });

  describe('diapasons', () => {
    it('can be added and become the one being edited', async () => {
      assert.deepEqual(await app.evaluate(`
        document.getElementById('addDiapason').click();
        const tabs = document.querySelectorAll('.config-diapason-select');
        return [tabs.length,
                document.querySelector('.config-diapason-tab.selected .config-diapason-select').dataset.diapasonId
                  === tabs[1].dataset.diapasonId];
      `), [2, true]);
    });

    it('are legible against their own background', async () => {
      await app.evaluate("document.getElementById('addDiapason').click();");

      assert.deepEqual(await app.evaluate(`
        return [...document.querySelectorAll('.config-diapason-tab')].map(tab => {
          const name = tab.querySelector('.config-diapason-name');
          return getComputedStyle(name).color !== getComputedStyle(tab).backgroundColor
            && name.textContent.trim().length > 0;
        });
      `), [true, true]);
    });

    it('become selectable as another note\'s triad type', async () => {
      assert.equal(await app.evaluate(`
        document.getElementById('addDiapason').click();
        return document.querySelector('.config-note-triad').querySelectorAll('optgroup')[0].children.length;
      `), 2);
    });

    it('are deleted by the cross on their own tab', async () => {
      await app.evaluate("document.getElementById('addDiapason').click();");

      assert.equal(await app.evaluate(`
        document.querySelector('.config-diapason-tab.selected .config-diapason-remove').click();
        return document.querySelectorAll('.config-diapason-select').length;
      `), 1);
    });

    it('are deleted by a real mouse click, not just a synthetic one', async () => {
      await app.evaluate("document.getElementById('addDiapason').click();");
      await app.click('.config-diapason-tab.selected .config-diapason-remove');
      await app.waitFor("document.querySelectorAll('.config-diapason-select').length === 1");

      assert.equal(await app.evaluate("return document.querySelectorAll('.config-diapason-select').length"), 1);
    });

    it('can be deleted while another one is being edited', async () => {
      assert.deepEqual(await app.evaluate(`
        document.getElementById('addDiapason').click();
        const selected = document.querySelector('.config-diapason-tab.selected .config-diapason-select').dataset.diapasonId;
        const other = [...document.querySelectorAll('.config-diapason-tab')]
          .find(tab => !tab.classList.contains('selected'));
        other.querySelector('.config-diapason-remove').click();

        return [document.querySelectorAll('.config-diapason-select').length,
                document.querySelector('.config-diapason-tab.selected .config-diapason-select').dataset.diapasonId === selected];
      `), [1, true]);
    });

    it('promote the survivor to primary when the primary is deleted', async () => {
      assert.deepEqual(await app.evaluate(`
        document.getElementById('addDiapason').click();
        const first = document.querySelectorAll('.config-diapason-select')[0].dataset.diapasonId;
        document.querySelectorAll('.config-diapason-remove')[0].click();
        const left = document.querySelectorAll('.config-diapason-select');

        return [left.length, left[0].dataset.diapasonId !== first,
                document.getElementById('primaryDiapason').checked];
      `), [1, true, true]);
    });

    it('cannot delete the last one, and say why', async () => {
      assert.deepEqual(await app.evaluate(`
        const button = document.querySelector('.config-diapason-remove');
        button.click();
        return [button.disabled, button.title, document.querySelectorAll('.config-diapason-select').length];
      `), [true, 'A system needs at least one diapason', 1]);
    });
  });

  describe('auditioning notes from the top row', () => {
    it('shows the key that plays each note', async () => {
      assert.deepEqual(
        await app.evaluate("return [...document.querySelectorAll('.config-note-key')].map(key => key.textContent.trim())"),
        ['q', 'w', 'e', 'r', 't', 'y', 'u'],
      );
    });

    it('lights the note while its key is held, and releases it after', async () => {
      assert.deepEqual(await app.evaluate(`
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
        const lit = [...document.querySelectorAll('.config-note.active')].map(row => row.dataset.noteIndex);
        document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'e', bubbles: true }));
        return [lit, document.querySelectorAll('.config-note.active').length];
      `), [['2'], 0]);
    });

    it('sounds several notes at once, so intervals can be heard', async () => {
      assert.deepEqual(await app.evaluate(`
        ['q', 't', 'y'].forEach(key =>
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
        const lit = document.querySelectorAll('.config-note.active').length;
        ['q', 't', 'y'].forEach(key =>
          document.body.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true })));
        return [lit, document.querySelectorAll('.config-note.active').length];
      `), [3, 0]);
    });

    it('types into a field rather than playing when a field has focus', async () => {
      assert.equal(await app.evaluate(`
        const name = document.querySelector('.config-note-name');
        name.focus();
        name.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }));
        const lit = document.querySelectorAll('.config-note.active').length;
        name.blur();
        return lit;
      `), 0);
    });

    it('marks notes past the end of the row as having no key', async () => {
      assert.equal(await app.evaluate(`
        for (let added = 0; added < 8; added++) document.getElementById('addNote').click();
        return document.querySelectorAll('.config-note-key.none').length;
      `), 2);
    });

    it('stops sounding when the keyboard view is opened', async () => {
      assert.equal(await app.evaluate(`
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }));
        document.querySelector('[data-show-view="play"]').click();
        return document.querySelectorAll('.config-note.active').length;
      `), 0);
    });
  });

  describe('the generated system', () => {
    beforeEach(async () => {
      await app.evaluate(`
        const root = document.getElementById('configRootFrequency');
        root.value = '400';
        root.dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelector('[data-show-view="play"]').click();
      `);
    });

    it('puts the configured notes on the root keys', async () => {
      assert.equal(await app.evaluate("return document.querySelectorAll('.root-selector').length"), 7);
      assert.equal(
        await app.evaluate("return document.getElementById('root0').querySelector('.root-frequency').textContent"),
        '400Hz',
      );
    });

    it('fills all three alpha key rows', async () => {
      assert.equal(await app.evaluate("return document.querySelectorAll('.note').length"), 30);
    });

    it('maps the punctuation keys on the bottom row', async () => {
      assert.deepEqual(
        await app.evaluate("return [';', ',', '.', '/'].map(key => !!document.getElementById(key))"),
        [true, true, true, true],
      );
    });

    it('starts the home row on the root note', async () => {
      assert.equal(
        await app.evaluate("return document.getElementById('q').querySelector('.note-frequency').textContent"),
        '400Hz',
      );
    });

    it('moves an octave up and back with the arrow keys', async () => {
      const frequencyAfter = (key) => app.evaluate(`
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '${key}', bubbles: true }));
        return document.getElementById('q').querySelector('.note-frequency').textContent;
      `);

      assert.equal(await frequencyAfter('ArrowUp'), '800Hz');
      assert.equal(await frequencyAfter('ArrowDown'), '400Hz');
    });

    it('keeps descending below the root, down towards 20Hz', async () => {
      assert.deepEqual(await app.evaluate(`
        const frequencies = [];
        for (let step = 0; step < 4; step++) {
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
          frequencies.push(document.getElementById('q').querySelector('.note-frequency').textContent);
        }
        return frequencies;
      `), ['200Hz', '100Hz', '50Hz', '25Hz']);
    });

    it('stops at the bottom of the audible range instead of wrapping', async () => {
      assert.equal(await app.evaluate(`
        for (let step = 0; step < 20; step++) {
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        }
        return document.getElementById('q').querySelector('.note-frequency').textContent;
      `), '25Hz');
    });

    it('regenerates the keys from a new root, staying in the same octave', async () => {
      assert.deepEqual(await app.evaluate(`
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }));
        document.body.dispatchEvent(new KeyboardEvent('keyup', { key: '4', bubbles: true }));
        return [document.querySelector('.root-selector.active').id,
                document.getElementById('root4').querySelector('.root-frequency').textContent,
                document.getElementById('q').querySelector('.note-frequency').textContent];
      `), ['root4', '600Hz', '600Hz']);
    });

    it('lights an alpha key while it is held', async () => {
      assert.deepEqual(await app.evaluate(`
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }));
        const lit = document.getElementById('q').classList.contains('active');
        document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'q', bubbles: true }));
        return [lit, document.getElementById('q').classList.contains('active')];
      `), [true, false]);
    });

    it('does not play notes while the configuration screen is open', async () => {
      assert.equal(await app.evaluate(`
        document.querySelector('[data-show-view="config"]').click();
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
        return document.querySelectorAll('.note.active').length;
      `), 0);
    });
  });

  describe('saved state', () => {
    it('survives a reload', async () => {
      await app.evaluate(`
        const root = document.getElementById('configRootFrequency');
        root.value = '400';
        root.dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('addDiapason').click();
      `);

      await app.reload();

      assert.deepEqual(await app.evaluate(`
        return [document.getElementById('configRootFrequency').value,
                document.querySelectorAll('.config-diapason-select').length];
      `), ['400', 2]);
    });

    it('is cleared by the reset button', async () => {
      await app.evaluate(`
        const root = document.getElementById('configRootFrequency');
        root.value = '400';
        root.dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('resetConfig').click();
      `);

      await app.reload();

      assert.equal(await app.evaluate("return document.getElementById('configRootFrequency').value"), '27');
    });
  });

  describe('overall', () => {
    it('runs without logging an error or throwing', async () => {
      await app.evaluate(`
        document.getElementById('addDiapason').click();
        document.getElementById('addNote').click();
        document.querySelector('[data-show-view="play"]').click();
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
        document.body.dispatchEvent(new KeyboardEvent('keyup', { key: '2', bubbles: true }));
        document.querySelector('[data-show-view="config"]').click();
      `);

      assert.deepEqual(app.consoleErrors, []);
    });
  });
});
