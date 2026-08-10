import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getConfig,
  getScale,
  getPrimaryScale,
  addScale,
  addNote,
  removeScale,
  removeNote,
  renameScale,
  replaceConfig,
  resetConfig,
  clearStoredConfig,
  setPrimaryScale,
  setRootFrequency,
  updateNote,
  loadPresetIntoScale,
  presetsBroughtIn,
  loadStoredConfig,
  saveConfig,
  subscribe,
  noteBounds,
  ratioToFrequency,
  frequencyToRatio,
  rootScaleOptions,
  clamp,
  MIN_RATIO,
  MAX_RATIO,
  STORAGE_KEY,
} from '../../js/config/systemConfigState.js';
import { readStoredValue, writeStoredValue } from '../../js/storage.js';
import { isPreset } from '../../js/presets/registry.js';
import { MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY } from '../../js/system/generateSystem.js';

beforeEach(() => {
  clearStoredConfig();
});

describe('the default configuration', () => {
  it('is the major scale, primary, at 27Hz', () => {
    const config = getConfig();

    assert.equal(config.primaryScaleId, config.scales[0].id);
    assert.equal(config.primaryRootFrequency, 27);
    assert.equal(getPrimaryScale().name, 'Major');
    assert.equal(getPrimaryScale().notes.length, 7);
  });

  it('brings in the scales the major scale\u2019s degrees build', () => {
    assert.deepEqual(getConfig().scales.map((scale) => scale.name),
      ['Major', 'Natural minor', 'Diminished']);
  });

  it('points every degree at one of those scales, not at a preset', () => {
    const ids = getConfig().scales.map((scale) => scale.id);

    getConfig().scales.forEach((scale) => {
      scale.notes.forEach((note) => {
        assert.ok(ids.includes(note.rootScaleId), `${note.degree} of ${scale.name} builds ${note.rootScaleId}`);
      });
    });
  });
});

describe('the root frequency', () => {
  it('is clamped to the audible range', () => {
    setRootFrequency(999999);
    assert.equal(getConfig().primaryRootFrequency, MAX_AUDIBLE_FREQUENCY);

    setRootFrequency(1);
    assert.equal(getConfig().primaryRootFrequency, MIN_AUDIBLE_FREQUENCY);
  });

  it('ignores a value that is not a number', () => {
    setRootFrequency(400);
    setRootFrequency(Number.NaN);

    assert.equal(getConfig().primaryRootFrequency, 400);
  });

  it('bounds a note between the root and its octave', () => {
    setRootFrequency(400);

    assert.deepEqual(noteBounds(), { minimum: 400, maximum: 800 });
  });

  it('converts between ratio and frequency in both directions', () => {
    setRootFrequency(400);

    assert.equal(ratioToFrequency(1.5), 600);
    assert.equal(frequencyToRatio(600), 1.5);
  });
});

describe('notes', () => {
  it('can be added inside the scale', () => {
    const { id } = getPrimaryScale();
    const before = getScale(id).notes.length;

    addNote(id);

    const notes = getScale(id).notes;
    assert.equal(notes.length, before + 1);
    assert.ok(notes.at(-1).ratioToRoot >= MIN_RATIO && notes.at(-1).ratioToRoot <= MAX_RATIO);
  });

  it('can be removed down to a floor of the root alone', () => {
    const { id } = getPrimaryScale();

    for (let attempt = 0; attempt < 20; attempt++) removeNote(id, 1);

    assert.equal(getScale(id).notes.length, 1);
    assert.equal(getScale(id).notes[0].degree, 'I');
  });

  it('keep the root, which is what the rest of the scale is measured from', () => {
    const { id } = getPrimaryScale();
    const root = getScale(id).notes[0];

    removeNote(id, 0);

    assert.equal(getScale(id).notes.length, 7);
    assert.equal(getScale(id).notes[0], root);
  });

  it('renumber the degrees left behind, closing the gap', () => {
    const { id } = getPrimaryScale();

    // Seven degrees configured; drop III.
    removeNote(id, 2);

    assert.deepEqual(
      getScale(id).notes.map((note) => note.degree),
      ['I', 'II', 'III', 'IV', 'V', 'VI'],
    );
  });

  it('renumber without disturbing the notes themselves', () => {
    const { id } = getPrimaryScale();
    const namesBefore = getScale(id).notes.map((note) => note.intervalName);
    const ratiosBefore = getScale(id).notes.map((note) => note.ratioToRoot);

    removeNote(id, 2);

    const notes = getScale(id).notes;
    assert.deepEqual(notes.map((note) => note.intervalName), namesBefore.toSpliced(2, 1));
    assert.deepEqual(notes.map((note) => note.ratioToRoot), ratiosBefore.toSpliced(2, 1));
  });

  it('number an added note as the next degree', () => {
    const { id } = getPrimaryScale();

    removeNote(id, 2);
    addNote(id);

    assert.deepEqual(
      getScale(id).notes.map((note) => note.degree),
      ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'],
    );
  });

  it('ignore a note index that is past the end', () => {
    const { id } = getPrimaryScale();

    removeNote(id, 99);

    assert.equal(getScale(id).notes.length, 7);
  });

  it('clamp their ratio into the period when edited', () => {
    const { id } = getPrimaryScale();

    updateNote(id, 0, { ratioToRoot: 5 });
    assert.equal(getScale(id).notes[0].ratioToRoot, MAX_RATIO);

    updateNote(id, 0, { ratioToRoot: 0.1 });
    assert.equal(getScale(id).notes[0].ratioToRoot, MIN_RATIO);
  });

  it('ignore a ratio that is not a number', () => {
    const { id } = getPrimaryScale();
    updateNote(id, 0, { ratioToRoot: 1.25 });

    updateNote(id, 0, { ratioToRoot: Number.NaN });

    assert.equal(getScale(id).notes[0].ratioToRoot, 1.25);
  });

  it('accept other fields without touching the ratio', () => {
    const { id } = getPrimaryScale();
    const ratio = getScale(id).notes[0].ratioToRoot;

    updateNote(id, 0, { intervalName: 'Tonic' });

    assert.equal(getScale(id).notes[0].intervalName, 'Tonic');
    assert.equal(getScale(id).notes[0].ratioToRoot, ratio);
  });

  it('do nothing when the note or scale is not there', () => {
    assert.doesNotThrow(() => updateNote('missing', 0, { ratioToRoot: 1.5 }));
    assert.doesNotThrow(() => updateNote(getPrimaryScale().id, 99, { ratioToRoot: 1.5 }));
    assert.doesNotThrow(() => removeNote('missing', 0));
    assert.doesNotThrow(() => addNote('missing'));
  });
});

describe('scales', () => {
  it('can be added, renamed, and made primary', () => {
    const before = getConfig().scales.length;
    const second = addScale();

    assert.equal(getConfig().scales.length, before + 1);

    renameScale(second, 'Solarian');
    assert.equal(getScale(second).name, 'Solarian');

    setPrimaryScale(second);
    assert.equal(getPrimaryScale().id, second);
  });

  it('can be removed', () => {
    const before = getConfig().scales.length;
    const second = addScale();

    removeScale(second);

    assert.equal(getConfig().scales.length, before);
    assert.equal(getScale(second), undefined);
  });

  it('promote another scale to primary when the primary is removed', () => {
    const first = getConfig().scales[0].id;
    const next = getConfig().scales[1].id;

    setPrimaryScale(first);
    removeScale(first);

    assert.equal(getScale(first), undefined);
    assert.equal(getPrimaryScale().id, next);
  });

  it('repoint notes that referenced a removed scale', () => {
    const second = addScale();
    const first = getConfig().scales[0].id;

    updateNote(second, 0, { rootScaleId: first });
    removeScale(first);

    getScale(second).notes.forEach((note) => {
      assert.ok(note.rootScaleId === second || isPreset(note.rootScaleId));
    });
  });

  it('cannot be removed when it is the last one', () => {
    for (let attempt = 0; attempt < 10; attempt++) removeScale(getConfig().scales[0].id);

    assert.equal(getConfig().scales.length, 1);
  });

  it('ignore a rename or promotion of a scale that is not there', () => {
    const primary = getPrimaryScale().id;

    setPrimaryScale('missing');
    assert.doesNotThrow(() => renameScale('missing', 'nope'));

    assert.equal(getPrimaryScale().id, primary);
  });

  it('take on the notes of a preset when one is loaded', () => {
    const { id } = getPrimaryScale();

    loadPresetIntoScale(id, 'minorPentatonic');

    assert.equal(getScale(id).name, 'Minor pentatonic');
    assert.equal(getScale(id).notes.length, 5);
  });
});

describe('loading a preset', () => {
  const namesOf = () => getConfig().scales.map((scale) => scale.name);

  it('brings in the scales the preset builds, alongside the one loaded into', () => {
    const scaleId = addScale();

    loadPresetIntoScale(scaleId, 'majorPentatonic');

    assert.equal(getScale(scaleId).name, 'Major pentatonic');
    assert.ok(namesOf().includes('Minor pentatonic'), `${namesOf()} should hold the minor pentatonic`);
  });

  it('points the degrees at those scales rather than at the presets', () => {
    const scaleId = addScale();

    loadPresetIntoScale(scaleId, 'majorPentatonic');

    const ids = getConfig().scales.map((scale) => scale.id);

    getScale(scaleId).notes.forEach((note) => {
      assert.ok(ids.includes(note.rootScaleId), `${note.degree} builds ${note.rootScaleId}`);
    });
  });

  it('brings in nothing extra for a preset whose degrees only build itself', () => {
    const scaleId = addScale();
    const before = namesOf().length;

    loadPresetIntoScale(scaleId, 'blues');

    assert.equal(namesOf().length, before);
    getScale(scaleId).notes.forEach((note) => assert.equal(note.rootScaleId, scaleId));
  });

  it('points at a family already on the screen instead of copying it again', () => {
    const first = addScale();
    loadPresetIntoScale(first, 'majorPentatonic');
    const after = getConfig().scales.length;

    const second = addScale();
    loadPresetIntoScale(second, 'majorPentatonic');

    // The second load adds the scale it was loaded into, and nothing else.
    assert.equal(getConfig().scales.length, after + 1);
  });

  it('keeps the edits made to a family member it points at again', () => {
    const first = addScale();
    loadPresetIntoScale(first, 'majorPentatonic');

    const minorPentatonic = getConfig().scales.find((scale) => scale.fromPreset === 'minorPentatonic');
    renameScale(minorPentatonic.id, 'Mine');
    updateNote(minorPentatonic.id, 0, { ratioToRoot: 1.05 });

    loadPresetIntoScale(addScale(), 'majorPentatonic');

    assert.equal(getScale(minorPentatonic.id).name, 'Mine');
    assert.equal(getScale(minorPentatonic.id).notes[0].ratioToRoot, 1.05);
  });

  it('replaces the notes of the scale it was loaded into, edits and all', () => {
    const scaleId = addScale();
    updateNote(scaleId, 0, { ratioToRoot: 1.05 });

    loadPresetIntoScale(scaleId, 'blues');

    assert.equal(getScale(scaleId).notes[0].ratioToRoot, 1);
  });

  it('says nothing about a preset that is not one', () => {
    const scaleId = addScale();
    const before = getConfig().scales.length;

    assert.deepEqual(loadPresetIntoScale(scaleId, 'nonsense'), []);
    assert.equal(getConfig().scales.length, before);
  });
});

describe('presetsBroughtIn', () => {
  it('names what a preset would bring in with it', () => {
    // Nothing has been loaded yet beyond the major family the app starts on.
    assert.deepEqual(presetsBroughtIn('majorPentatonic'), ['Minor pentatonic']);
  });

  it('names nothing for a preset whose degrees only build itself', () => {
    assert.deepEqual(presetsBroughtIn('blues'), []);
  });

  it('names nothing already on the screen', () => {
    // The app starts on the major family, so its members are all here.
    assert.deepEqual(presetsBroughtIn('major'), []);
  });

  it('names nothing for something that is not a preset', () => {
    assert.deepEqual(presetsBroughtIn('scale-1'), []);
    assert.deepEqual(presetsBroughtIn(undefined), []);
  });
});

describe('rootScaleOptions', () => {
  it('offers the configured scales and the built-in presets separately', () => {
    const second = addScale();
    const { configured, builtIn } = rootScaleOptions();

    assert.deepEqual(configured.map((option) => option.value), getConfig().scales.map((scale) => scale.id));
    assert.ok(configured.some((option) => option.value === second));
    assert.ok(builtIn.every((option) => isPreset(option.value)));
  });
});

describe('subscribers', () => {
  it('are notified when the configuration changes', () => {
    let notifications = 0;
    const unsubscribe = subscribe(() => { notifications += 1; });

    setRootFrequency(440);
    addNote(getPrimaryScale().id);

    assert.equal(notifications, 2);

    unsubscribe();
    setRootFrequency(432);
    assert.equal(notifications, 2);
  });

  it('are not notified for a silent edit, which is saved anyway', () => {
    let notifications = 0;
    const unsubscribe = subscribe(() => { notifications += 1; });

    updateNote(getPrimaryScale().id, 0, { ratioToRoot: 1.5 }, { silent: true });

    assert.equal(notifications, 0);
    assert.equal(getPrimaryScale().notes[0].ratioToRoot, 1.5);
    unsubscribe();
  });
});

describe('replaceConfig', () => {
  it('takes on a valid configuration', () => {
    const config = replaceConfig({
      primaryRootFrequency: 432,
      primaryScaleId: 'solo',
      scales: [{ id: 'solo', name: 'Solo', notes: [{ ratioToRoot: 1.5, rootScaleId: 'solo' }] }],
    });

    assert.equal(config.primaryRootFrequency, 432);
    assert.equal(config.primaryScaleId, 'solo');
    assert.equal(config.scales[0].notes[0].ratioToRoot, 1.5);
  });

  it('clamps a root frequency outside the audible range', () => {
    const config = replaceConfig({
      primaryRootFrequency: 99999,
      scales: [{ id: 'a', notes: [{ ratioToRoot: 1 }] }],
    });

    assert.equal(config.primaryRootFrequency, MAX_AUDIBLE_FREQUENCY);
  });

  it('folds a ratio that sits outside the scale', () => {
    const config = replaceConfig({
      scales: [{ id: 'a', notes: [{ ratioToRoot: 8 }, { ratioToRoot: 0.75 }] }],
    });

    assert.deepEqual(config.scales[0].notes.map((note) => note.ratioToRoot), [1, 1.5]);
  });

  it('repoints a root scale that names nothing at its own scale', () => {
    const config = replaceConfig({
      scales: [{ id: 'a', notes: [{ ratioToRoot: 1, rootScaleId: 'ghost' }] }],
    });

    assert.equal(config.scales[0].notes[0].rootScaleId, 'a');
  });

  it('keeps a root scale that names a built-in preset', () => {
    const config = replaceConfig({
      scales: [{ id: 'a', notes: [{ ratioToRoot: 1, rootScaleId: 'naturalMinor' }] }],
    });

    assert.equal(config.scales[0].notes[0].rootScaleId, 'naturalMinor');
  });

  it('keeps a root scale that points at another scale in the file', () => {
    const config = replaceConfig({
      scales: [
        { id: 'a', notes: [{ ratioToRoot: 1, rootScaleId: 'b' }] },
        { id: 'b', notes: [{ ratioToRoot: 1, rootScaleId: 'a' }] },
      ],
    });

    assert.equal(config.scales[0].notes[0].rootScaleId, 'b');
  });

  it('falls back to the first scale when the primary names nothing', () => {
    const config = replaceConfig({
      primaryScaleId: 'missing',
      scales: [{ id: 'a', notes: [{ ratioToRoot: 1 }] }],
    });

    assert.equal(config.primaryScaleId, 'a');
  });

  it('fills in missing degrees and names', () => {
    const config = replaceConfig({
      scales: [{ id: 'a', notes: [{ ratioToRoot: 1 }, { ratioToRoot: 1.5 }] }],
    });

    assert.deepEqual(config.scales[0].notes.map((note) => note.degree), ['I', 'II']);
    config.scales[0].notes.forEach((note) => assert.ok(note.intervalName));
  });

  it('rejects a file that could not be played', () => {
    assert.throws(() => replaceConfig(null), /must be an object/);
    assert.throws(() => replaceConfig({ scales: [] }), /at least one scale/);
    assert.throws(() => replaceConfig({ scales: [{ id: 'a', notes: [] }] }), /has no notes/);
  });

  it('leaves the existing configuration untouched when it rejects one', () => {
    setRootFrequency(440);

    assert.throws(() => replaceConfig({ scales: [] }));
    assert.equal(getConfig().primaryRootFrequency, 440);
  });

  it('keeps generated ids clear of the ones it took on', () => {
    replaceConfig({
      scales: [{ id: 'scale-9', notes: [{ ratioToRoot: 1 }] }],
    });

    assert.notEqual(addScale(), 'scale-9');
  });
});

describe('persistence', () => {
  const storedConfig = () => JSON.parse(readStoredValue(STORAGE_KEY));

  it('writes the current configuration to storage', () => {
    setRootFrequency(432);
    renameScale(getPrimaryScale().id, 'Solarian');
    saveConfig();

    assert.equal(storedConfig().primaryRootFrequency, 432);
    assert.equal(storedConfig().scales[0].name, 'Solarian');
  });

  it('saves on every change, without waiting to be asked', () => {
    setRootFrequency(300);
    assert.equal(storedConfig().primaryRootFrequency, 300);

    addNote(getPrimaryScale().id);
    assert.equal(storedConfig().scales[0].notes.length, 8);
  });

  it('saves a silent edit too, so a drag is not lost on reload', () => {
    updateNote(getPrimaryScale().id, 0, { ratioToRoot: 1.75 }, { silent: true });

    assert.equal(storedConfig().scales[0].notes[0].ratioToRoot, 1.75);
  });

  it('restores what was stored', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({
      primaryRootFrequency: 432,
      primaryScaleId: 'solo',
      scales: [{ id: 'solo', name: 'Solarian', notes: [{ ratioToRoot: 1.5, rootScaleId: 'solo' }] }],
    }));

    loadStoredConfig();

    assert.equal(getConfig().primaryRootFrequency, 432);
    assert.equal(getPrimaryScale().name, 'Solarian');
    assert.equal(getPrimaryScale().notes[0].ratioToRoot, 1.5);
  });

  it('validates what it restores, so a hand-edited file cannot break the app', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({
      primaryRootFrequency: 999999,
      scales: [{ id: 'a', notes: [{ ratioToRoot: 8, rootScaleId: 'ghost' }] }],
    }));

    const config = loadStoredConfig();

    assert.equal(config.primaryRootFrequency, MAX_AUDIBLE_FREQUENCY);
    assert.equal(config.scales[0].notes[0].ratioToRoot, 1);
    assert.equal(config.scales[0].notes[0].rootScaleId, 'a');
  });

  it('keeps the default when nothing has been stored', () => {
    assert.equal(loadStoredConfig().primaryRootFrequency, 27);
  });

  it('overwrites what was stored when the configuration is reset', () => {
    setRootFrequency(432);
    resetConfig();

    assert.equal(storedConfig().primaryRootFrequency, 27);
  });

  it('starts fresh when what was stored cannot be used', (t) => {
    t.mock.method(console, 'error', () => {});
    writeStoredValue(STORAGE_KEY, '{ not json');

    const config = loadStoredConfig();

    assert.ok(config.scales.length >= 1);
  });

  it('starts fresh when what was stored is valid JSON but not a system', (t) => {
    t.mock.method(console, 'error', () => {});
    writeStoredValue(STORAGE_KEY, JSON.stringify({ scales: [] }));

    const config = loadStoredConfig();

    assert.ok(config.scales.length >= 1);
  });
});

describe('clamp', () => {
  it('holds a value between its bounds', () => {
    assert.equal(clamp(5, 1, 2), 2);
    assert.equal(clamp(0, 1, 2), 1);
    assert.equal(clamp(1.5, 1, 2), 1.5);
  });
});
