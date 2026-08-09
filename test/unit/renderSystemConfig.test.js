import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  escapeHtml,
  renderScaleTabs,
  renderNote,
  renderNotes,
  renderRootScaleOptions,
} from '../../js/config/renderSystemConfig.js';
import {
  getConfig,
  getPrimaryScale,
  addScale,
  renameScale,
  addNote,
  clearStoredConfig,
  setRootFrequency,
  updateNote,
} from '../../js/config/systemConfigState.js';
import { PREVIEW_KEYS, PREVIEW_KEY_ROWS } from '../../js/config/previewKeyHandler.js';
import { MAX_ROOT_NOTES } from '../../js/system/generateSystem.js';

beforeEach(() => {
  clearStoredConfig();
});

const occurrences = (haystack, needle) => haystack.split(needle).length - 1;

describe('escapeHtml', () => {
  it('escapes the characters that would break out of markup', () => {
    assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
    assert.equal(escapeHtml('a & b'), 'a &amp; b');
    assert.equal(escapeHtml('say "hi"'), 'say &quot;hi&quot;');
  });

  it('escapes the ampersand before the entities it introduces', () => {
    assert.equal(escapeHtml('&lt;'), '&amp;lt;');
  });

  it('renders nothing for a missing value', () => {
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(null), '');
  });
});

describe('renderScaleTabs', () => {
  it('draws a tab per scale with its note count', () => {
    addScale();

    const html = renderScaleTabs(getPrimaryScale().id);

    assert.equal(occurrences(html, 'config-scale-select'), 2);
    assert.match(html, /7 notes/);
  });

  it('marks the selected tab and the primary one', () => {
    const second = addScale();
    const html = renderScaleTabs(second);

    assert.match(html, /config-scale-tab selected/);
    assert.equal(occurrences(html, 'config-scale-primary'), 1);
  });

  it('gives every tab a delete button', () => {
    addScale();

    assert.equal(occurrences(renderScaleTabs(getPrimaryScale().id), 'config-scale-remove'), 2);
  });

  it('disables delete on the last scale and says why', () => {
    const html = renderScaleTabs(getPrimaryScale().id);

    assert.match(html, /A system needs at least one scale/);
    assert.match(html, /config-scale-remove[^>]*disabled/s);
  });

  it('enables delete once there is more than one scale', () => {
    addScale();

    const html = renderScaleTabs(getPrimaryScale().id);

    assert.doesNotMatch(html, /config-scale-remove[^>]*disabled/s);
  });

  it('escapes a scale name so it cannot break the markup', () => {
    renameScale(getPrimaryScale().id, '"><img src=x>');

    const html = renderScaleTabs(getPrimaryScale().id);

    assert.doesNotMatch(html, /<img/);
    assert.match(html, /&quot;&gt;&lt;img/);
  });
});

describe('renderRootScaleOptions', () => {
  it('groups the configured scales apart from the presets', () => {
    const html = renderRootScaleOptions(getPrimaryScale().id);

    assert.match(html, /<optgroup label="Configured scales">/);
    assert.match(html, /<optgroup label="Built-in presets">/);
  });

  it('selects exactly the option the note is set to', () => {
    const html = renderRootScaleOptions('blues');

    assert.equal(occurrences(html, ' selected'), 1);
    assert.match(html, /value="blues" selected/);
  });

  it('surfaces a value that matches no option instead of showing another one', () => {
    const html = renderRootScaleOptions('ghost');

    assert.match(html, /ghost \(unknown\)/);
    assert.equal(occurrences(html, ' selected'), 1);
  });
});

describe('renderNote', () => {
  const firstNote = () => getPrimaryScale().notes[0];

  it('bounds the frequency field and slider by the scale', () => {
    setRootFrequency(400);

    const html = renderNote(firstNote(), 0);

    assert.match(html, /class="config-note-hz"[^>]*min="400"[^>]*max="800"/s);
    assert.match(html, /class="config-note-slider"[^>]*min="400"[^>]*max="800"/s);
  });

  it('shows the frequency and the ratio as the same value', () => {
    setRootFrequency(400);
    updateNote(getPrimaryScale().id, 0, { ratioToRoot: 1.5 });

    const html = renderNote(firstNote(), 0);

    assert.match(html, /class="config-note-ratio"[^>]*value="1.5"/s);
    assert.match(html, /class="config-note-hz"[^>]*value="600"/s);
  });

  it('shows the top-row key that auditions the note', () => {
    assert.match(renderNote(firstNote(), 0), /class="config-note-key"[^>]*>q</s);
    assert.match(renderNote(firstNote(), 4), /class="config-note-key"[^>]*>t</s);
  });

  it('marks a note past the last preview key as having none', () => {
    const html = renderNote(firstNote(), PREVIEW_KEYS.length);

    assert.match(html, /config-note-key none/);
  });

  it('disables remove on the root, and says why', () => {
    const html = renderNote(firstNote(), 0);

    assert.match(html, /config-note-remove[^>]*disabled/s);
    assert.match(html, /The root of the scale cannot be removed/);
  });

  it('enables remove on every note below the root', () => {
    const html = renderNote(firstNote(), 3);

    assert.doesNotMatch(html, /config-note-remove[^>]*disabled/s);
    assert.match(html, /title="Remove this note"/);
  });

  it('flags a name that is only a description of the ratio, so it can follow it', () => {
    const derived = { ratioToRoot: 1.5, degree: 'V', intervalName: '702 cents', rootScaleId: 'x' };
    const named = { ...derived, intervalName: 'Perfect 5th' };

    assert.match(renderNote(derived, 0), /data-derived="true"/);
    assert.match(renderNote(named, 0), /data-derived="false"/);
  });

  it('escapes a note name so it cannot break the markup', () => {
    const note = { ...firstNote(), intervalName: '"><img src=x>' };

    assert.doesNotMatch(renderNote(note, 0), /<img/);
  });
});

describe('renderNotes', () => {
  it('draws a card per note plus the add button', () => {
    const html = renderNotes(getPrimaryScale());

    assert.equal(occurrences(html, 'data-note-index='), 7);
    assert.match(html, /id="addNote"/);
  });

  it('states the bounds every note sits within', () => {
    setRootFrequency(400);

    assert.match(renderNotes(getPrimaryScale()), /400Hz to 800Hz/);
  });

  it('names the rows of keys that audition notes', () => {
    const html = renderNotes(getPrimaryScale());

    PREVIEW_KEY_ROWS.forEach((row) => {
      assert.ok(html.includes(`<kbd>${row[0]}</kbd>&ndash;<kbd>${row[row.length - 1]}</kbd>`), `${row} is named`);
    });
  });

  it('explains that a short primary scale repeats up the root keys', () => {
    assert.match(renderNotes(getPrimaryScale()), /Keys 7-9 repeat these notes a period higher/);
  });

  it('says nothing about repeats once the notes fill the root keys', () => {
    const { id } = getPrimaryScale();

    while (getPrimaryScale().notes.length < MAX_ROOT_NOTES) addNote(id);

    assert.doesNotMatch(renderNotes(getPrimaryScale()), /repeat these notes/);
  });

  it('checks the primary radio only for the primary scale', () => {
    const second = addScale();

    assert.match(renderNotes(getPrimaryScale()), /id="primaryScale" checked/);
    assert.doesNotMatch(renderNotes(getConfig().scales.find((d) => d.id === second)), /checked/);
  });

  it('warns once a primary scale outruns the root keys', () => {
    const { id } = getPrimaryScale();

    assert.doesNotMatch(renderNotes(getPrimaryScale()), /notes get a root key/);

    while (getPrimaryScale().notes.length <= MAX_ROOT_NOTES) addNote(id);

    assert.match(renderNotes(getPrimaryScale()), /Only the first 10 notes get a root key/);
  });

  it('warns once a scale outruns the preview keys', () => {
    const { id } = getPrimaryScale();

    while (getPrimaryScale().notes.length <= PREVIEW_KEYS.length) addNote(id);

    assert.match(renderNotes(getPrimaryScale()), /notes can be previewed/);
  });
});
