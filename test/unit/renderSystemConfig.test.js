import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  escapeHtml,
  renderDiapasonTabs,
  renderNote,
  renderNotes,
  renderTriadTypeOptions,
} from '../../js/config/renderSystemConfig.js';
import {
  getConfig,
  getPrimaryDiapason,
  addDiapason,
  renameDiapason,
  addNote,
  clearStoredConfig,
  setRootFrequency,
  updateNote,
} from '../../js/config/systemConfigState.js';
import { PREVIEW_KEYS } from '../../js/config/previewKeyHandler.js';
import { MAX_ROOT_NOTES } from '../../js/scaleCalculators/musicalSystemGenerator.js';

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

describe('renderDiapasonTabs', () => {
  it('draws a tab per diapason with its note count', () => {
    addDiapason();

    const html = renderDiapasonTabs(getPrimaryDiapason().id);

    assert.equal(occurrences(html, 'config-diapason-select'), 2);
    assert.match(html, /7 notes/);
  });

  it('marks the selected tab and the primary one', () => {
    const second = addDiapason();
    const html = renderDiapasonTabs(second);

    assert.match(html, /config-diapason-tab selected/);
    assert.equal(occurrences(html, 'config-diapason-primary'), 1);
  });

  it('gives every tab a delete button', () => {
    addDiapason();

    assert.equal(occurrences(renderDiapasonTabs(getPrimaryDiapason().id), 'config-diapason-remove'), 2);
  });

  it('disables delete on the last diapason and says why', () => {
    const html = renderDiapasonTabs(getPrimaryDiapason().id);

    assert.match(html, /A system needs at least one diapason/);
    assert.match(html, /config-diapason-remove[^>]*disabled/s);
  });

  it('enables delete once there is more than one diapason', () => {
    addDiapason();

    const html = renderDiapasonTabs(getPrimaryDiapason().id);

    assert.doesNotMatch(html, /config-diapason-remove[^>]*disabled/s);
  });

  it('escapes a diapason name so it cannot break the markup', () => {
    renameDiapason(getPrimaryDiapason().id, '"><img src=x>');

    const html = renderDiapasonTabs(getPrimaryDiapason().id);

    assert.doesNotMatch(html, /<img/);
    assert.match(html, /&quot;&gt;&lt;img/);
  });
});

describe('renderTriadTypeOptions', () => {
  it('groups the configured diapasons apart from the calculators', () => {
    const html = renderTriadTypeOptions(getPrimaryDiapason().id);

    assert.match(html, /<optgroup label="Configured diapasons">/);
    assert.match(html, /<optgroup label="Built-in calculators">/);
  });

  it('selects exactly the option the note is set to', () => {
    const html = renderTriadTypeOptions('bluesScaleNotes');

    assert.equal(occurrences(html, ' selected'), 1);
    assert.match(html, /value="bluesScaleNotes" selected/);
  });

  it('surfaces a value that matches no option instead of showing another one', () => {
    const html = renderTriadTypeOptions('ghost');

    assert.match(html, /ghost \(unknown\)/);
    assert.equal(occurrences(html, ' selected'), 1);
  });
});

describe('renderNote', () => {
  const firstNote = () => getPrimaryDiapason().notes[0];

  it('bounds the frequency field and slider by the diapason', () => {
    setRootFrequency(400);

    const html = renderNote(firstNote(), 0, getPrimaryDiapason());

    assert.match(html, /class="config-note-hz"[^>]*min="400"[^>]*max="800"/s);
    assert.match(html, /class="config-note-slider"[^>]*min="400"[^>]*max="800"/s);
  });

  it('shows the frequency and the ratio as the same value', () => {
    setRootFrequency(400);
    updateNote(getPrimaryDiapason().id, 0, { ratioToRoot: 1.5 });

    const html = renderNote(firstNote(), 0, getPrimaryDiapason());

    assert.match(html, /class="config-note-ratio"[^>]*value="1.5"/s);
    assert.match(html, /class="config-note-hz"[^>]*value="600"/s);
  });

  it('shows the top-row key that auditions the note', () => {
    assert.match(renderNote(firstNote(), 0, getPrimaryDiapason()), /class="config-note-key"[^>]*>q</s);
    assert.match(renderNote(firstNote(), 4, getPrimaryDiapason()), /class="config-note-key"[^>]*>t</s);
  });

  it('marks a note past the last preview key as having none', () => {
    const html = renderNote(firstNote(), PREVIEW_KEYS.length, getPrimaryDiapason());

    assert.match(html, /config-note-key none/);
  });

  it('disables remove when the note is the only one left', () => {
    const soleNote = { ...firstNote() };
    const diapason = { ...getPrimaryDiapason(), notes: [soleNote] };

    assert.match(renderNote(soleNote, 0, diapason), /config-note-remove[^>]*disabled/s);
  });

  it('flags a name that is only a description of the ratio, so it can follow it', () => {
    const derived = { ratioToRoot: 1.5, degree: 'V', relationshipToRootName: '702 cents', triadType: 'x' };
    const named = { ...derived, relationshipToRootName: 'Perfect 5th' };

    assert.match(renderNote(derived, 0, getPrimaryDiapason()), /data-derived="true"/);
    assert.match(renderNote(named, 0, getPrimaryDiapason()), /data-derived="false"/);
  });

  it('escapes a note name so it cannot break the markup', () => {
    const note = { ...firstNote(), relationshipToRootName: '"><img src=x>' };

    assert.doesNotMatch(renderNote(note, 0, getPrimaryDiapason()), /<img/);
  });
});

describe('renderNotes', () => {
  it('draws a card per note plus the add button', () => {
    const html = renderNotes(getPrimaryDiapason());

    assert.equal(occurrences(html, 'data-note-index='), 7);
    assert.match(html, /id="addNote"/);
  });

  it('states the bounds every note sits within', () => {
    setRootFrequency(400);

    assert.match(renderNotes(getPrimaryDiapason()), /400Hz to 800Hz/);
  });

  it('lists the keys that audition notes', () => {
    const html = renderNotes(getPrimaryDiapason());

    PREVIEW_KEYS.forEach((key) => assert.ok(html.includes(`<kbd>${key}</kbd>`), `${key} is listed`));
  });

  it('checks the primary radio only for the primary diapason', () => {
    const second = addDiapason();

    assert.match(renderNotes(getPrimaryDiapason()), /id="primaryDiapason" checked/);
    assert.doesNotMatch(renderNotes(getConfig().diapasons.find((d) => d.id === second)), /checked/);
  });

  it('warns once a primary diapason outruns the root keys', () => {
    const { id } = getPrimaryDiapason();

    assert.doesNotMatch(renderNotes(getPrimaryDiapason()), /notes get a root key/);

    while (getPrimaryDiapason().notes.length <= MAX_ROOT_NOTES) addNote(id);

    assert.match(renderNotes(getPrimaryDiapason()), /Only the first 10 notes get a root key/);
  });

  it('warns once a diapason outruns the preview keys', () => {
    const { id } = getPrimaryDiapason();

    while (getPrimaryDiapason().notes.length <= PREVIEW_KEYS.length) addNote(id);

    assert.match(renderNotes(getPrimaryDiapason()), /notes can be previewed/);
  });
});
