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

    it('starts on the Pythagorean scale at 432Hz', async () => {
      assert.equal(await app.evaluate("return document.getElementById('configRootFrequency').value"), '432');
      assert.equal(await app.evaluate("return document.getElementById('scaleName').value"), 'Pythagorean');
      assert.equal(await app.evaluate("return document.querySelectorAll('.config-note[data-note-index]').length"), 12);
    });

    // Compared against the constants rather than against 20 and 20000, so that
    // moving the audible range moves the field with it: literals here would go
    // on passing against a field left behind at whatever the markup once said.
    it('bounds the root by the audible range the system is generated within', async () => {
      const [onTheField, fromTheSystem] = await app.evaluate(`
        return import('/js/system/generateSystem.js').then(({ MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY }) => {
          const root = document.getElementById('configRootFrequency');
          return [[root.min, root.max], [String(MIN_AUDIBLE_FREQUENCY), String(MAX_AUDIBLE_FREQUENCY)]];
        });
      `);

      assert.deepEqual(onTheField, fromTheSystem);
      assert.equal(await app.evaluate("return document.getElementById('configRootFrequency').checkValidity()"), true);
    });

    it('brings in nothing else, the Pythagorean degrees all building itself', async () => {
      assert.deepEqual(await app.evaluate(`
        return [...document.querySelectorAll('.config-scale-name')].map(name => name.textContent.trim());
      `), ['Pythagorean']);
    });

    it('offers every preset as a preset', async () => {
      assert.ok(await app.evaluate("return document.getElementById('presetSelect').options.length >= 11"));
    });

    it('shows each note bounded between the root and its octave', async () => {
      assert.deepEqual(await app.evaluate(`
        const hz = document.querySelector('.config-note-hz');
        return [hz.value, hz.min, hz.max];
      `), ['432', '432', '864']);
    });

    it('points every degree of the Pythagorean scale back at itself', async () => {
      assert.deepEqual(await app.evaluate(`
        return [...document.querySelectorAll('.config-note-root-scale')]
          .map(select => select.selectedOptions[0].textContent.trim());
      `), Array(12).fill('Pythagorean'));
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
      `), 13);

      assert.equal(await app.evaluate(`
        document.querySelectorAll('.config-note-remove')[1].click();
        return document.querySelectorAll('.config-note[data-note-index]').length;
      `), 12);
    });

    it('cannot remove the root, whose button says why', async () => {
      assert.deepEqual(await app.evaluate(`
        const root = document.querySelectorAll('.config-note-remove')[0];
        root.click();
        return [document.querySelectorAll('.config-note[data-note-index]').length,
                root.disabled, root.title];
      `), [12, true, 'The root of the scale cannot be removed']);
    });

    it('stops at the root alone once every other note is removed', async () => {
      assert.deepEqual(await app.evaluate(`
        for (let attempt = 0; attempt < 20; attempt++) {
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
        while (document.querySelectorAll('.config-note[data-note-index]').length > 5) {
          const buttons = document.querySelectorAll('.config-note-remove');
          buttons[buttons.length - 1].click();
        }
        document.querySelectorAll('.config-note-remove')[2].click();
        return [...document.querySelectorAll('.config-note-degree')].map(degree => degree.textContent.trim());
      `), ['I', 'II', 'III', 'IV']);
    });

    it('renumbers the degrees shown on the root keys too', async () => {
      assert.deepEqual(await app.evaluate(`
        document.querySelectorAll('.config-note-remove')[2].click();
        document.querySelector('[data-show-view="play"]').click();
        return [...document.querySelectorAll('.root-key .degree')].map(degree => degree.textContent.trim());
      `), ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']);
    });

    it('shifts the preview keys up with the notes that remain', async () => {
      assert.deepEqual(await app.evaluate(`
        document.querySelectorAll('.config-note-remove')[2].click();
        return [...document.querySelectorAll('.config-note-key')].map(key => key.textContent.trim());
      `), ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'a']);
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

  describe('editing a scale away from the preset it was loaded from', () => {
    /** Retunes a note, as typing in its frequency field and leaving it does. */
    const retuneANote = () => app.evaluate(`
      const hz = document.querySelectorAll('.config-note')[1].querySelector('.config-note-hz');
      hz.value = '500';
      hz.dispatchEvent(new Event('input', { bubbles: true }));
      hz.dispatchEvent(new Event('change', { bubbles: true }));
    `);

    /** Names the scale, as typing in the name field and leaving it does. */
    const renameTo = (name) => app.evaluate(`
      const field = document.getElementById('scaleName');
      field.value = ${JSON.stringify(name)};
      field.dispatchEvent(new Event('change', { bubbles: true }));
    `);

    const nameFieldState = () => app.evaluate(`
      const field = document.getElementById('scaleName');
      return [field.classList.contains('edited-away'),
              document.getElementById('scaleNameWarning')?.textContent.replace(/\\s+/g, ' ').trim() ?? ''];
    `);

    it('leaves the name alone while the preset is untouched', async () => {
      assert.deepEqual(await nameFieldState(), [false, '']);
    });

    it('marks the name field and says the scale is no longer the preset', async () => {
      await retuneANote();

      const [marked, warning] = await nameFieldState();

      assert.equal(marked, true);
      assert.match(warning, /no longer the Pythagorean scale/);
    });

    it('shows the marked field in the warning colour rather than the plain one', async () => {
      await retuneANote();

      assert.equal(await app.evaluate(`
        return getComputedStyle(document.getElementById('scaleName')).borderTopColor;
      `), 'rgb(185, 130, 47)');
    });

    // The page behind the field is black, so a see-through wash would take the
    // name down with it.
    it('keeps the name readable, marked or not', async () => {
      const contrast = () => app.evaluate(`
        const style = getComputedStyle(document.getElementById('scaleName'));
        const channels = (colour) => colour.match(/[\\d.]+/g).slice(0, 3).map(Number);
        // Relative luminance, as the contrast ratio is defined from.
        const luminance = (colour) => channels(colour)
          .map(value => value / 255)
          .map(value => (value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4))
          .reduce((total, value, index) => total + value * [.2126, .7152, .0722][index], 0);

        const [text, background] = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => b - a);
        const opaque = channels(style.backgroundColor).length === 3 && !style.backgroundColor.includes('rgba');

        return [opaque, (text + .05) / (background + .05)];
      `);

      const [plainlyOpaque, plainContrast] = await contrast();

      assert.equal(plainlyOpaque, true, 'the field starts on an opaque background');
      assert.ok(plainContrast >= 4.5, `plain name contrast is ${plainContrast}`);

      await retuneANote();

      const [markedOpaque, markedContrast] = await contrast();

      assert.equal(markedOpaque, true, 'the marked field stays on an opaque background');
      assert.ok(markedContrast >= 4.5, `marked name contrast is ${markedContrast}`);
    });

    it('clears the warning once the scale is given a name of its own', async () => {
      await retuneANote();
      await renameTo('Mine');

      assert.deepEqual(await nameFieldState(), [false, '']);
    });

    it('clears the warning once the preset is loaded again', async () => {
      await retuneANote();
      await app.evaluate(`
        document.getElementById('presetSelect').value = 'pythagorean';
        document.getElementById('loadPreset').click();
      `);

      assert.deepEqual(await nameFieldState(), [false, '']);
    });

    it('keeps the warning through a reload, along with the edit that earned it', async () => {
      await retuneANote();
      await app.reload();

      const [marked] = await nameFieldState();

      assert.equal(marked, true);
    });
  });

  describe('scales', () => {
    /** Trims the system down to the scale being edited, and nothing else. */
    const keepOnlyOne = () => app.evaluate(`
      while (document.querySelectorAll('.config-scale-tab').length > 1) {
        const spare = [...document.querySelectorAll('.config-scale-tab')]
          .find(tab => !tab.classList.contains('selected'));
        spare.querySelector('.config-scale-remove').click();
      }
    `);

    it('can be added and become the one being edited', async () => {
      assert.deepEqual(await app.evaluate(`
        const before = document.querySelectorAll('.config-scale-select').length;
        document.getElementById('addScale').click();
        const tabs = document.querySelectorAll('.config-scale-select');
        return [tabs.length - before,
                document.querySelector('.config-scale-tab.selected .config-scale-select').dataset.scaleId
                  === tabs[tabs.length - 1].dataset.scaleId];
      `), [1, true]);
    });

    it('are legible against their own background', async () => {
      await app.evaluate("document.getElementById('addScale').click();");

      assert.ok(await app.evaluate(`
        return [...document.querySelectorAll('.config-scale-tab')].every(tab => {
          const name = tab.querySelector('.config-scale-name');
          return getComputedStyle(name).color !== getComputedStyle(tab).backgroundColor
            && name.textContent.trim().length > 0;
        });
      `));
    });

    it('become selectable as another note\'s root scale', async () => {
      assert.equal(await app.evaluate(`
        const before = document.querySelector('.config-note-root-scale')
          .querySelectorAll('optgroup')[0].children.length;
        document.getElementById('addScale').click();
        return document.querySelector('.config-note-root-scale')
          .querySelectorAll('optgroup')[0].children.length - before;
      `), 1);
    });

    it('are deleted by the cross on their own tab', async () => {
      await keepOnlyOne();
      await app.evaluate("document.getElementById('addScale').click();");

      assert.equal(await app.evaluate(`
        document.querySelector('.config-scale-tab.selected .config-scale-remove').click();
        return document.querySelectorAll('.config-scale-select').length;
      `), 1);
    });

    it('are deleted by a real mouse click, not just a synthetic one', async () => {
      await keepOnlyOne();
      await app.evaluate("document.getElementById('addScale').click();");
      await app.click('.config-scale-tab.selected .config-scale-remove');
      await app.waitFor("document.querySelectorAll('.config-scale-select').length === 1");

      assert.equal(await app.evaluate("return document.querySelectorAll('.config-scale-select').length"), 1);
    });

    it('can be deleted while another one is being edited', async () => {
      await keepOnlyOne();

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
      await keepOnlyOne();

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
      await keepOnlyOne();

      assert.deepEqual(await app.evaluate(`
        const button = document.querySelector('.config-scale-remove');
        button.click();
        return [button.disabled, button.title, document.querySelectorAll('.config-scale-select').length];
      `), [true, 'A system needs at least one scale', 1]);
    });
  });

  describe('the scales the root keys reach', () => {
    it('brings a preset in as a scale when a root key is pointed at one', async () => {
      assert.deepEqual(await app.evaluate(`
        const select = document.querySelectorAll('.config-note-root-scale')[1];
        select.value = 'blues';
        select.dispatchEvent(new Event('change', { bubbles: true }));

        const pointedAt = document.querySelectorAll('.config-note-root-scale')[1];
        return [[...document.querySelectorAll('.config-scale-name')].map(name => name.textContent.trim()),
                pointedAt.selectedOptions[0].textContent.trim(),
                // The key builds the scale on the screen, not the preset behind it.
                pointedAt.value !== 'blues'];
      `), [['Pythagorean', 'Blues'], 'Blues', true]);
    });

    it('brings in that scale alone, however many the preset names', async () => {
      assert.deepEqual(await app.evaluate(`
        const select = document.querySelectorAll('.config-note-root-scale')[1];
        select.value = 'major';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return [...document.querySelectorAll('.config-scale-name')].map(name => name.textContent.trim());
      `), ['Pythagorean', 'Major']);
    });

    it('warns about a scale no root key builds, and names it', async () => {
      assert.deepEqual(await app.evaluate(`
        document.getElementById('addScale').click();
        return [...document.querySelectorAll('.config-scale-warning-name')].map(name => name.textContent.trim());
      `), ['Scale 2']);
    });

    it('warns about none of a preset family loaded into the primary scale', async () => {
      assert.deepEqual(await app.evaluate(`
        const before = document.querySelectorAll('.config-scale-warning').length;
        document.getElementById('presetSelect').value = 'major';
        document.getElementById('loadPreset').click();
        return [before,
                document.querySelectorAll('.config-scale-name').length,
                document.querySelectorAll('.config-scale-warning').length];
      `), [0, 3, 0]);
    });

    it('stops warning once a root key is pointed at it', async () => {
      assert.deepEqual(await app.evaluate(`
        document.getElementById('addScale').click();
        const warned = document.querySelectorAll('.config-scale-warning').length;
        const added = document.querySelector('.config-scale-tab.selected .config-scale-select').dataset.scaleId;

        // Back to the primary scale, whose notes are the root keys.
        document.querySelectorAll('.config-scale-select')[0].click();
        const select = document.querySelectorAll('.config-note-root-scale')[1];
        select.value = added;
        select.dispatchEvent(new Event('change', { bubbles: true }));

        return [warned, document.querySelectorAll('.config-scale-warning').length];
      `), [1, 0]);
    });

    it('removes the scale when the warning is taken up', async () => {
      assert.deepEqual(await app.evaluate(`
        document.getElementById('addScale').click();
        document.querySelector('.config-scale-warning-remove').click();
        return [document.querySelectorAll('.config-scale-select').length,
                document.querySelectorAll('.config-scale-warning').length];
      `), [1, 0]);
    });

    it('removes it by a real mouse click, not just a synthetic one', async () => {
      await app.evaluate("document.getElementById('addScale').click();");
      await app.click('.config-scale-warning-remove');
      await app.waitFor("document.querySelectorAll('.config-scale-select').length === 1");

      assert.equal(await app.evaluate("return document.querySelectorAll('.config-scale-warning').length"), 0);
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
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'a', 's'],
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
      // Twelve notes to start with, and thirty keys to put them on.
      assert.equal(await app.evaluate(`
        for (let added = 0; added < 18; added++) document.getElementById('addNote').click();
        return document.querySelectorAll('.config-note-key.none').length;
      `), 0);
    });

    it('marks notes past the last key as having none', async () => {
      assert.equal(await app.evaluate(`
        for (let added = 0; added < 20; added++) document.getElementById('addNote').click();
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

    /** Puts the major scale on screen, for what its shape or its degrees show. */
    const loadMajor = () => app.evaluate(`
      document.querySelector('[data-show-view="config"]').click();
      document.getElementById('presetSelect').value = 'major';
      document.getElementById('loadPreset').click();
      document.querySelector('[data-show-view="play"]').click();
    `);

    it('fills the leftover root keys a period above their counterparts', async () => {
      await loadMajor();

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
      await loadMajor();

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
      `), ['root4', '500Hz', '500Hz']);
    });

    it('lights a note key while it is held', async () => {
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
      const before = await app.evaluate(`
        const root = document.getElementById('configRootFrequency');
        root.value = '400';
        root.dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('addScale').click();
        return document.querySelectorAll('.config-scale-select').length;
      `);

      await app.reload();

      assert.deepEqual(await app.evaluate(`
        return [document.getElementById('configRootFrequency').value,
                document.querySelectorAll('.config-scale-select').length];
      `), ['400', before]);
    });

    it('is cleared by the reset button', async () => {
      await app.evaluate(`
        const root = document.getElementById('configRootFrequency');
        root.value = '400';
        root.dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('resetConfig').click();
      `);

      await app.reload();

      assert.equal(await app.evaluate("return document.getElementById('configRootFrequency').value"), '432');
    });
  });

  describe('exporting and importing a system', () => {
    /**
     * Catches the file the app hands to the browser, rather than letting it
     * download, and keeps hold of what it put inside.
     */
    const catchDownload = () => app.evaluate(`
      window.__exported = null;
      window.__downloadName = null;

      URL.createObjectURL = (blob) => {
        blob.text().then((text) => { window.__exported = text; });
        return 'blob:caught';
      };
      URL.revokeObjectURL = () => {};
      HTMLAnchorElement.prototype.click = function () { window.__downloadName = this.download; };
    `);

    const exported = async () => {
      await app.evaluate("document.getElementById('exportConfig').click();");
      await app.waitFor('window.__exported !== null', 'the system to be written out');

      return JSON.parse(await app.evaluate('return window.__exported'));
    };

    /** Hands the app a file, the way choosing one in the file picker does. */
    const importFile = (contents) => app.evaluate(`
      window.__alerted = null;
      window.alert = (message) => { window.__alerted = message; };

      const transfer = new DataTransfer();
      transfer.items.add(new File([${JSON.stringify(contents)}], 'system.json', { type: 'application/json' }));

      const input = document.getElementById('importConfigFile');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    `);

    /**
     * Reading the file is asynchronous, so every test waits for something only
     * the system it handed over would show.
     */
    const taken = (condition) => app.waitFor(
      `window.__alerted !== null || (${condition})`,
      `the imported system to be taken up: ${condition}`,
    );

    beforeEach(catchDownload);

    it('writes out the system that is on screen', async () => {
      await app.evaluate(`
        const root = document.getElementById('configRootFrequency');
        root.value = '400';
        root.dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('scaleName').value = 'Solarian';
        document.getElementById('scaleName').dispatchEvent(new Event('change', { bubbles: true }));
      `);

      const config = await exported();

      assert.equal(config.primaryRootFrequency, 400);
      assert.equal(config.scales[0].name, 'Solarian');
      assert.equal(config.scales[0].notes.length, 12);
    });

    it('writes out only the fields the app reads back', async () => {
      const config = await exported();

      assert.deepEqual(Object.keys(config).sort(),
        ['primaryRootFrequency', 'primaryScaleId', 'scales', 'version']);
      assert.deepEqual(Object.keys(config.scales[0]).sort(), ['fromPreset', 'id', 'name', 'notes']);
      assert.deepEqual(Object.keys(config.scales[0].notes[0]).sort(),
        ['degree', 'intervalName', 'ratioToRoot', 'rootScaleId']);
    });

    it('names the file it hands to the browser', async () => {
      await exported();

      assert.equal(await app.evaluate('return window.__downloadName'), 'emergent-harmonics-system.json');
    });

    it('takes back a system it wrote out, exactly as it was', async () => {
      await app.evaluate(`
        const root = document.getElementById('configRootFrequency');
        root.value = '500';
        root.dispatchEvent(new Event('change', { bubbles: true }));
      `);

      const saved = await exported();

      await app.evaluate(`
        const root = document.getElementById('configRootFrequency');
        root.value = '300';
        root.dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelectorAll('.config-note-remove')[1].click();
      `);

      await importFile(JSON.stringify(saved));
      await taken("document.getElementById('configRootFrequency').value === '500'");

      assert.equal(await app.evaluate("return document.getElementById('configRootFrequency').value"), '500');
      assert.equal(await app.evaluate("return document.querySelectorAll('.config-note[data-note-index]').length"), 12);
      assert.deepEqual(await exported(), saved);
    });

    it('plays the system it just took in', async () => {
      await importFile(JSON.stringify({
        primaryRootFrequency: 400,
        primaryScaleId: 'solo',
        scales: [{
          id: 'solo',
          name: 'Solarian',
          notes: [
            { ratioToRoot: 1, intervalName: 'Root', rootScaleId: 'solo' },
            { ratioToRoot: 1.5, intervalName: 'Perfect 5th', rootScaleId: 'solo' },
          ],
        }],
      }));
      await taken("document.querySelectorAll('.config-note[data-note-index]').length === 2");

      assert.deepEqual(await app.evaluate(`
        const notes = document.querySelectorAll('.config-note[data-note-index]').length;
        document.querySelector('[data-show-view="play"]').click();
        return [notes,
                document.getElementById('root0').querySelector('.frequency').textContent,
                document.getElementById('q').querySelector('.frequency').textContent];
      `), [2, '400Hz', '400Hz']);
    });

    it('edits the system it took in, rather than the one it replaced', async () => {
      await importFile(JSON.stringify({
        primaryRootFrequency: 400,
        primaryScaleId: 'solo',
        scales: [{ id: 'solo', name: 'Solarian', notes: [{ ratioToRoot: 1, rootScaleId: 'solo' }] }],
      }));
      await taken("document.getElementById('scaleName').value === 'Solarian'");

      assert.equal(await app.evaluate("return document.getElementById('scaleName').value"), 'Solarian');
    });

    it('says so and keeps the current system when the file is not usable', async () => {
      await importFile('this is not json');
      await app.waitFor('window.__alerted !== null', 'the app to say the file was no good');

      assert.match(await app.evaluate('return window.__alerted'), /not a usable system configuration/);
      assert.equal(await app.evaluate("return document.querySelectorAll('.config-note[data-note-index]').length"), 12);
      assert.equal(await app.evaluate("return document.getElementById('configRootFrequency').value"), '432');
    });

    it('refuses a system written before scales were called scales', async () => {
      await importFile(JSON.stringify({
        version: 1,
        primaryRootFrequency: 500,
        primaryDiapasonId: 'diapason-1',
        diapasons: [{ id: 'diapason-1', name: 'Major', notes: [{ ratioToRoot: 1, triadType: 'diapason-1' }] }],
      }));
      await app.waitFor('window.__alerted !== null', 'the app to say the file was no good');

      assert.match(await app.evaluate('return window.__alerted'), /at least one scale/);
      assert.equal(await app.evaluate("return document.getElementById('configRootFrequency').value"), '432');
    });

    it('forgets the file it was given, so the same one can be chosen twice', async () => {
      await importFile(JSON.stringify({
        primaryRootFrequency: 400,
        primaryScaleId: 'solo',
        scales: [{ id: 'solo', name: 'Solarian', notes: [{ ratioToRoot: 1, rootScaleId: 'solo' }] }],
      }));
      await taken("document.getElementById('scaleName').value === 'Solarian'");

      assert.equal(await app.evaluate("return document.getElementById('importConfigFile').value"), '');
    });

    it('keeps what it took in through a reload', async () => {
      await importFile(JSON.stringify({
        primaryRootFrequency: 432,
        primaryScaleId: 'solo',
        scales: [{ id: 'solo', name: 'Solarian', notes: [{ ratioToRoot: 1, rootScaleId: 'solo' }] }],
      }));
      await taken("document.getElementById('configRootFrequency').value === '432'");

      await app.reload();

      assert.equal(await app.evaluate("return document.getElementById('configRootFrequency').value"), '432');
      assert.equal(await app.evaluate("return document.getElementById('scaleName').value"), 'Solarian');
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
