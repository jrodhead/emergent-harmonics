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

    it('starts from one major-scale scale at 27Hz', async () => {
      assert.equal(await app.evaluate("return document.getElementById('configRootFrequency').value"), '27');
      assert.equal(await app.evaluate("return document.querySelectorAll('.config-scale-select').length"), 1);
      assert.equal(await app.evaluate("return document.querySelectorAll('.config-note[data-note-index]').length"), 7);
    });

    it('offers every preset as a preset', async () => {
      assert.ok(await app.evaluate("return document.getElementById('presetSelect').options.length >= 11"));
    });

    it('shows each note bounded between the root and its octave', async () => {
      assert.deepEqual(await app.evaluate(`
        const hz = document.querySelector('.config-note-hz');
        return [hz.value, hz.min, hz.max];
      `), ['27', '27', '54']);
    });

    it('keeps the per-degree root scales of the major scale', async () => {
      assert.deepEqual(await app.evaluate(`
        return [...document.querySelectorAll('.config-note-root-scale')]
          .map(select => select.selectedOptions[0].textContent.trim());
      `), [
        'Major', 'Natural minor', 'Natural minor', 'Major',
        'Major', 'Natural minor', 'Diminished',
      ]);
    });

    it('never shows a root scale the note is not actually set to', async () => {
      assert.equal(await app.evaluate(`
        return [...document.querySelectorAll('.config-note-root-scale')]
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

    it('snaps a frequency past the octave back into the scale', async () => {
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
        document.querySelectorAll('.config-note-remove')[1].click();
        return document.querySelectorAll('.config-note[data-note-index]').length;
      `), 7);
    });

    it('cannot remove the root, whose button says why', async () => {
      assert.deepEqual(await app.evaluate(`
        const root = document.querySelectorAll('.config-note-remove')[0];
        root.click();
        return [document.querySelectorAll('.config-note[data-note-index]').length,
                root.disabled, root.title];
      `), [7, true, 'The root of the scale cannot be removed']);
    });

    it('stops at the root alone once every other note is removed', async () => {
      assert.deepEqual(await app.evaluate(`
        for (let attempt = 0; attempt < 10; attempt++) {
          const button = document.querySelectorAll('.config-note-remove')[1];
          if (button && !button.disabled) button.click();
        }
        return [document.querySelectorAll('.config-note[data-note-index]').length,
                document.querySelector('.config-note-degree').textContent.trim()];
      `), [1, 'I']);
    });

    it('closes the gap in the degrees when a note in the middle is removed', async () => {
      // Trim to five degrees, then drop III: IV and V become the new III and IV.
      assert.deepEqual(await app.evaluate(`
        document.querySelectorAll('.config-note-remove')[6].click();
        document.querySelectorAll('.config-note-remove')[5].click();
        document.querySelectorAll('.config-note-remove')[2].click();
        return [...document.querySelectorAll('.config-note-degree')].map(degree => degree.textContent.trim());
      `), ['I', 'II', 'III', 'IV']);
    });

    it('renumbers the degrees shown on the root keys too', async () => {
      assert.deepEqual(await app.evaluate(`
        document.querySelectorAll('.config-note-remove')[2].click();
        document.querySelector('[data-show-view="play"]').click();
        return [...document.querySelectorAll('.root-key .degree')].map(degree => degree.textContent.trim());
      `), ['I', 'II', 'III', 'IV', 'V', 'VI', 'I +1', 'II +1', 'III +1', 'IV +1']);
    });

    it('shifts the preview keys up with the notes that remain', async () => {
      assert.deepEqual(await app.evaluate(`
        document.querySelectorAll('.config-note-remove')[2].click();
        return [...document.querySelectorAll('.config-note-key')].map(key => key.textContent.trim());
      `), ['q', 'w', 'e', 'r', 't', 'y']);
    });

    it('loads a preset into the scale being edited', async () => {
      assert.deepEqual(await app.evaluate(`
        document.getElementById('presetSelect').value = 'minorPentatonic';
        document.getElementById('loadPreset').click();
        return [document.querySelectorAll('.config-note[data-note-index]').length,
                document.getElementById('scaleName').value];
      `), [5, 'Minor pentatonic']);
    });
  });

  describe('scales', () => {
    it('can be added and become the one being edited', async () => {
      assert.deepEqual(await app.evaluate(`
        document.getElementById('addScale').click();
        const tabs = document.querySelectorAll('.config-scale-select');
        return [tabs.length,
                document.querySelector('.config-scale-tab.selected .config-scale-select').dataset.scaleId
                  === tabs[1].dataset.scaleId];
      `), [2, true]);
    });

    it('are legible against their own background', async () => {
      await app.evaluate("document.getElementById('addScale').click();");

      assert.deepEqual(await app.evaluate(`
        return [...document.querySelectorAll('.config-scale-tab')].map(tab => {
          const name = tab.querySelector('.config-scale-name');
          return getComputedStyle(name).color !== getComputedStyle(tab).backgroundColor
            && name.textContent.trim().length > 0;
        });
      `), [true, true]);
    });

    it('become selectable as another note\'s root scale', async () => {
      assert.equal(await app.evaluate(`
        document.getElementById('addScale').click();
        return document.querySelector('.config-note-root-scale').querySelectorAll('optgroup')[0].children.length;
      `), 2);
    });

    it('are deleted by the cross on their own tab', async () => {
      await app.evaluate("document.getElementById('addScale').click();");

      assert.equal(await app.evaluate(`
        document.querySelector('.config-scale-tab.selected .config-scale-remove').click();
        return document.querySelectorAll('.config-scale-select').length;
      `), 1);
    });

    it('are deleted by a real mouse click, not just a synthetic one', async () => {
      await app.evaluate("document.getElementById('addScale').click();");
      await app.click('.config-scale-tab.selected .config-scale-remove');
      await app.waitFor("document.querySelectorAll('.config-scale-select').length === 1");

      assert.equal(await app.evaluate("return document.querySelectorAll('.config-scale-select').length"), 1);
    });

    it('can be deleted while another one is being edited', async () => {
      assert.deepEqual(await app.evaluate(`
        document.getElementById('addScale').click();
        const selected = document.querySelector('.config-scale-tab.selected .config-scale-select').dataset.scaleId;
        const other = [...document.querySelectorAll('.config-scale-tab')]
          .find(tab => !tab.classList.contains('selected'));
        other.querySelector('.config-scale-remove').click();

        return [document.querySelectorAll('.config-scale-select').length,
                document.querySelector('.config-scale-tab.selected .config-scale-select').dataset.scaleId === selected];
      `), [1, true]);
    });

    it('promote the survivor to primary when the primary is deleted', async () => {
      assert.deepEqual(await app.evaluate(`
        document.getElementById('addScale').click();
        const first = document.querySelectorAll('.config-scale-select')[0].dataset.scaleId;
        document.querySelectorAll('.config-scale-remove')[0].click();
        const left = document.querySelectorAll('.config-scale-select');

        return [left.length, left[0].dataset.scaleId !== first,
                document.getElementById('primaryScale').checked];
      `), [1, true, true]);
    });

    it('cannot delete the last one, and say why', async () => {
      assert.deepEqual(await app.evaluate(`
        const button = document.querySelector('.config-scale-remove');
        button.click();
        return [button.disabled, button.title, document.querySelectorAll('.config-scale-select').length];
      `), [true, 'A system needs at least one scale', 1]);
    });
  });

  describe('the mixer layout', () => {
    it('runs the notes across the screen as tracks', async () => {
      const first = await app.boxOf('.config-note[data-note-index="0"]');
      const second = await app.boxOf('.config-note[data-note-index="1"]');

      assert.equal(first.top, second.top, 'tracks share a top edge');
      assert.ok(second.left > first.left, 'the second track sits to the right of the first');
    });

    it('stacks each track\'s controls down its own strip', async () => {
      const degree = await app.boxOf('.config-note-degree');
      const fields = await app.boxOf('.config-note-fields');
      const fader = await app.boxOf('.config-note-slider');
      const readout = await app.boxOf('.config-note-hz');
      const key = await app.boxOf('.config-note-key');

      const tops = [degree.top, fields.top, fader.top, readout.top, key.top];
      assert.deepEqual(tops, [...tops].sort((a, b) => a - b), `expected top to bottom, got ${tops}`);
    });

    it('gives the frequency a vertical fader, not a horizontal one', async () => {
      const fader = await app.boxOf('.config-note-slider');

      assert.ok(fader.height > fader.width * 5, `${fader.width}x${fader.height} is not a vertical fader`);
    });

    it('labels the fader with the ends of the scale', async () => {
      await app.evaluate(`
        const root = document.getElementById('configRootFrequency');
        root.value = '400';
        root.dispatchEvent(new Event('change', { bubbles: true }));
      `);

      assert.deepEqual(await app.evaluate(`
        return [...document.querySelectorAll('.config-note[data-note-index="0"] .config-note-scale')]
          .map(scale => scale.textContent.trim());
      `), ['800', '400']);
    });

    it('gives the fader more travel in a taller window', async () => {
      await app.setViewport(1200, 700);
      const short = await app.boxOf('.config-note-slider');

      await app.setViewport(1200, 1100);
      const tall = await app.boxOf('.config-note-slider');

      await app.clearViewport();

      // A 400px taller window should buy most of that back as fader travel.
      assert.ok(
        tall.height > short.height * 1.5,
        `fader only grew from ${short.height}px to ${tall.height}px`,
      );
    });

    it('scrolls the tracks sideways rather than the page', async () => {
      await app.setViewport(700, 900);

      const [listScrolls, pageScrolls] = await app.evaluate(`
        for (let added = 0; added < 6; added++) document.getElementById('addNote').click();
        const list = document.querySelector('.config-note-list');
        return [list.scrollWidth > list.clientWidth,
                document.documentElement.scrollWidth > document.documentElement.clientWidth];
      `);

      await app.clearViewport();

      assert.equal(listScrolls, true, 'the track list should scroll');
      assert.equal(pageScrolls, false, 'the page itself should not scroll sideways');
    });

    it('keeps the fader working after the relayout', async () => {
      assert.deepEqual(await app.evaluate(`
        const root = document.getElementById('configRootFrequency');
        root.value = '400';
        root.dispatchEvent(new Event('change', { bubbles: true }));

        const row = document.querySelectorAll('.config-note')[1];
        const fader = row.querySelector('.config-note-slider');
        fader.value = '700';
        fader.dispatchEvent(new Event('input', { bubbles: true }));
        return [row.querySelector('.config-note-ratio').value, row.querySelector('.config-note-hz').value];
      `), ['1.75', '700']);
    });
  });

  describe('auditioning notes from the playing keys', () => {
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

    it('gives every note a key while the keyboard has one to spare', async () => {
      // Seven notes to start with, and thirty keys to put them on.
      assert.equal(await app.evaluate(`
        for (let added = 0; added < 23; added++) document.getElementById('addNote').click();
        return document.querySelectorAll('.config-note-key.none').length;
      `), 0);
    });

    it('marks notes past the last key as having none', async () => {
      assert.equal(await app.evaluate(`
        for (let added = 0; added < 25; added++) document.getElementById('addNote').click();
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

  describe('tuning a note by ear while it sounds', () => {
    // Records every retune the app asks of the audio hardware. Installed
    // before any note sounds, since the oscillator is built on first play.
    const recordRetunes = () => app.evaluate(`
      window.__retunes = [];
      const createOscillator = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function () {
        const oscillator = createOscillator.call(this);
        const setTarget = oscillator.frequency.setTargetAtTime.bind(oscillator.frequency);
        oscillator.frequency.setTargetAtTime = (value, ...rest) => {
          window.__retunes.push(Math.round(value));
          return setTarget(value, ...rest);
        };
        return oscillator;
      };
      const root = document.getElementById('configRootFrequency');
      root.value = '400';
      root.dispatchEvent(new Event('change', { bubbles: true }));
    `);

    const dragFader = (noteIndex, toFrequency) => app.evaluate(`
      const row = document.querySelector('.config-note[data-note-index="${noteIndex}"]');
      const fader = row.querySelector('.config-note-slider');
      fader.focus();
      for (const value of [${toFrequency.map ? toFrequency.join(', ') : toFrequency}]) {
        fader.value = String(value);
        fader.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);

    it('retunes a held note as its fader moves, without restarting it', async () => {
      await recordRetunes();
      await app.evaluate("document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));");

      await dragFader(1, [500, 550, 600]);

      assert.deepEqual(await app.evaluate('return window.__retunes'), [500, 550, 600]);
      assert.equal(await app.evaluate(`
        return document.querySelector('.config-note[data-note-index="1"]').classList.contains('active');
      `), true, 'the note should still be sounding');
    });

    it('leaves a note alone that is not being held', async () => {
      await recordRetunes();

      await dragFader(1, [500, 600]);

      assert.deepEqual(await app.evaluate('return window.__retunes'), []);
    });

    it('retunes only the note whose fader moved, so the other holds its pitch', async () => {
      await recordRetunes();
      await app.evaluate(`
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }));
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
      `);

      await dragFader(1, [500, 620]);

      // Two notes sounding, and only the dragged one was retuned.
      assert.equal(await app.evaluate("return document.querySelectorAll('.config-note.active').length"), 2);
      assert.deepEqual(await app.evaluate('return window.__retunes'), [500, 620]);
      assert.equal(await app.evaluate(`
        return document.querySelector('.config-note[data-note-index="0"] .config-note-hz').value;
      `), '400', 'the untouched note keeps its frequency');
    });

    it('releases a held note even though the fader took focus', async () => {
      await recordRetunes();
      await app.evaluate("document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));");
      await dragFader(1, [560]);

      // The keyup lands on the fader, which is a form field.
      assert.equal(await app.evaluate(`
        const fader = document.querySelector('.config-note[data-note-index="1"] .config-note-slider');
        fader.dispatchEvent(new KeyboardEvent('keyup', { key: 'w', bubbles: true }));
        return document.querySelectorAll('.config-note.active').length;
      `), 0, 'the note stuck on after its key was released');
    });

    it('does not start a note when its key is typed into a field', async () => {
      assert.equal(await app.evaluate(`
        const name = document.querySelector('.config-note[data-note-index="1"] .config-note-name');
        name.focus();
        name.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
        return document.querySelectorAll('.config-note.active').length;
      `), 0);
    });

    it('keeps a sounding note marked through the redraw when the drag is committed', async () => {
      await recordRetunes();
      await app.evaluate("document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));");
      await dragFader(1, [640]);

      assert.equal(await app.evaluate(`
        const fader = document.querySelector('.config-note[data-note-index="1"] .config-note-slider');
        fader.dispatchEvent(new Event('change', { bubbles: true }));
        return document.querySelector('.config-note[data-note-index="1"]').classList.contains('active');
      `), true, 'the redraw dropped the sounding mark');
    });

    it('follows the frequency typed into the readout too', async () => {
      await recordRetunes();
      await app.evaluate("document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));");

      await app.evaluate(`
        const hz = document.querySelector('.config-note[data-note-index="1"] .config-note-hz');
        hz.focus();
        hz.value = '505';
        hz.dispatchEvent(new Event('input', { bubbles: true }));
      `);

      assert.deepEqual(await app.evaluate('return window.__retunes'), [505]);
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
      assert.equal(await app.evaluate("return document.querySelectorAll('.root-key').length"), 10);
      assert.equal(
        await app.evaluate("return document.getElementById('root0').querySelector('.frequency').textContent"),
        '400Hz',
      );
    });

    it('fills the leftover root keys a period above their counterparts', async () => {
      // Seven notes, so keys 7-9 repeat the first three a period up.
      assert.deepEqual(await app.evaluate(`
        return [7, 8, 9].map(key => {
          const rootKey = document.getElementById('root' + key);
          return [rootKey.querySelector('.degree').textContent,
                  rootKey.querySelector('.frequency').textContent];
        });
      `), [['I +1', '800Hz'], ['II +1', '900Hz'], ['III +1', '1000Hz']]);
    });

    it('names the scale each root key would build, rather than its id', async () => {
      assert.deepEqual(await app.evaluate(`
        return [...document.querySelectorAll('.root-key .root-scale')]
          .slice(0, 3).map(scale => scale.textContent.trim());
      `), ['Major', 'Natural minor', 'Natural minor']);
    });

    it('fills all three note key rows', async () => {
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
        await app.evaluate("return document.getElementById('q').querySelector('.frequency').textContent"),
        '400Hz',
      );
    });

    it('moves an octave up and back with the arrow keys', async () => {
      const frequencyAfter = (key) => app.evaluate(`
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '${key}', bubbles: true }));
        return document.getElementById('q').querySelector('.frequency').textContent;
      `);

      assert.equal(await frequencyAfter('ArrowUp'), '800Hz');
      assert.equal(await frequencyAfter('ArrowDown'), '400Hz');
    });

    it('keeps descending below the root, down towards 20Hz', async () => {
      assert.deepEqual(await app.evaluate(`
        const frequencies = [];
        for (let step = 0; step < 4; step++) {
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
          frequencies.push(document.getElementById('q').querySelector('.frequency').textContent);
        }
        return frequencies;
      `), ['200Hz', '100Hz', '50Hz', '25Hz']);
    });

    it('stops at the bottom of the audible range instead of wrapping', async () => {
      assert.equal(await app.evaluate(`
        for (let step = 0; step < 20; step++) {
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        }
        return document.getElementById('q').querySelector('.frequency').textContent;
      `), '25Hz');
    });

    it('regenerates the keys from a new root, staying in the same octave', async () => {
      assert.deepEqual(await app.evaluate(`
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }));
        document.body.dispatchEvent(new KeyboardEvent('keyup', { key: '4', bubbles: true }));
        return [document.querySelector('.root-key.active').id,
                document.getElementById('root4').querySelector('.frequency').textContent,
                document.getElementById('q').querySelector('.frequency').textContent];
      `), ['root4', '600Hz', '600Hz']);
    });

    it('lights an note key while it is held', async () => {
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
        document.getElementById('addScale').click();
      `);

      await app.reload();

      assert.deepEqual(await app.evaluate(`
        return [document.getElementById('configRootFrequency').value,
                document.querySelectorAll('.config-scale-select').length];
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
        document.getElementById('addScale').click();
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
