import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getConfig,
  getDiapason,
  getPrimaryDiapason,
  addDiapason,
  addNote,
  removeDiapason,
  removeNote,
  renameDiapason,
  replaceConfig,
  resetConfig,
  clearStoredConfig,
  setPrimaryDiapason,
  setRootFrequency,
  updateNote,
  loadPresetIntoDiapason,
  loadStoredConfig,
  saveConfig,
  subscribe,
  diapasonBounds,
  ratioToFrequency,
  frequencyToRatio,
  triadTypeOptions,
  clamp,
  MIN_RATIO,
  MAX_RATIO,
  STORAGE_KEY,
} from '../../js/config/systemConfigState.js';
import { readStoredValue, writeStoredValue } from '../../js/storage.js';
import { isBuiltInSystem } from '../../js/scaleCalculators/noteGenerators.js';
import { MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY } from '../../js/scaleCalculators/musicalSystemGenerator.js';

beforeEach(() => {
  clearStoredConfig();
});

describe('the default configuration', () => {
  it('is a single primary diapason of the major scale', () => {
    const config = getConfig();

    assert.equal(config.diapasons.length, 1);
    assert.equal(config.primaryDiapasonId, config.diapasons[0].id);
    assert.equal(config.primaryRootFrequency, 27);
    assert.equal(config.diapasons[0].notes.length, 7);
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

    assert.deepEqual(diapasonBounds(), { minimum: 400, maximum: 800 });
  });

  it('converts between ratio and frequency in both directions', () => {
    setRootFrequency(400);

    assert.equal(ratioToFrequency(1.5), 600);
    assert.equal(frequencyToRatio(600), 1.5);
  });
});

describe('notes', () => {
  it('can be added inside the diapason', () => {
    const { id } = getPrimaryDiapason();
    const before = getDiapason(id).notes.length;

    addNote(id);

    const notes = getDiapason(id).notes;
    assert.equal(notes.length, before + 1);
    assert.ok(notes.at(-1).ratioToRoot >= MIN_RATIO && notes.at(-1).ratioToRoot <= MAX_RATIO);
  });

  it('can be removed down to a floor of one', () => {
    const { id } = getPrimaryDiapason();

    for (let attempt = 0; attempt < 20; attempt++) removeNote(id, 0);

    assert.equal(getDiapason(id).notes.length, 1);
  });

  it('clamp their ratio into the diapason when edited', () => {
    const { id } = getPrimaryDiapason();

    updateNote(id, 0, { ratioToRoot: 5 });
    assert.equal(getDiapason(id).notes[0].ratioToRoot, MAX_RATIO);

    updateNote(id, 0, { ratioToRoot: 0.1 });
    assert.equal(getDiapason(id).notes[0].ratioToRoot, MIN_RATIO);
  });

  it('ignore a ratio that is not a number', () => {
    const { id } = getPrimaryDiapason();
    updateNote(id, 0, { ratioToRoot: 1.25 });

    updateNote(id, 0, { ratioToRoot: Number.NaN });

    assert.equal(getDiapason(id).notes[0].ratioToRoot, 1.25);
  });

  it('accept other fields without touching the ratio', () => {
    const { id } = getPrimaryDiapason();
    const ratio = getDiapason(id).notes[0].ratioToRoot;

    updateNote(id, 0, { relationshipToRootName: 'Tonic' });

    assert.equal(getDiapason(id).notes[0].relationshipToRootName, 'Tonic');
    assert.equal(getDiapason(id).notes[0].ratioToRoot, ratio);
  });

  it('do nothing when the note or diapason is not there', () => {
    assert.doesNotThrow(() => updateNote('missing', 0, { ratioToRoot: 1.5 }));
    assert.doesNotThrow(() => updateNote(getPrimaryDiapason().id, 99, { ratioToRoot: 1.5 }));
    assert.doesNotThrow(() => removeNote('missing', 0));
    assert.doesNotThrow(() => addNote('missing'));
  });
});

describe('diapasons', () => {
  it('can be added, renamed, and made primary', () => {
    const second = addDiapason();

    assert.equal(getConfig().diapasons.length, 2);

    renameDiapason(second, 'Solarian');
    assert.equal(getDiapason(second).name, 'Solarian');

    setPrimaryDiapason(second);
    assert.equal(getPrimaryDiapason().id, second);
  });

  it('can be removed', () => {
    const second = addDiapason();

    removeDiapason(second);

    assert.equal(getConfig().diapasons.length, 1);
    assert.equal(getDiapason(second), undefined);
  });

  it('promote another diapason to primary when the primary is removed', () => {
    const second = addDiapason();
    const first = getConfig().diapasons[0].id;

    setPrimaryDiapason(first);
    removeDiapason(first);

    assert.equal(getConfig().diapasons.length, 1);
    assert.equal(getPrimaryDiapason().id, second);
  });

  it('repoint notes that referenced a removed diapason', () => {
    const second = addDiapason();
    const first = getConfig().diapasons[0].id;

    updateNote(second, 0, { triadType: first });
    removeDiapason(first);

    getDiapason(second).notes.forEach((note) => {
      assert.ok(note.triadType === second || isBuiltInSystem(note.triadType));
    });
  });

  it('cannot be removed when it is the last one', () => {
    removeDiapason(getPrimaryDiapason().id);

    assert.equal(getConfig().diapasons.length, 1);
  });

  it('ignore a rename or promotion of a diapason that is not there', () => {
    const primary = getPrimaryDiapason().id;

    setPrimaryDiapason('missing');
    assert.doesNotThrow(() => renameDiapason('missing', 'nope'));

    assert.equal(getPrimaryDiapason().id, primary);
  });

  it('take on the notes of a calculator when one is loaded', () => {
    const { id } = getPrimaryDiapason();

    loadPresetIntoDiapason(id, 'minorPentatonicScaleNotes');

    assert.equal(getDiapason(id).name, 'minorPentatonicScaleNotes');
    assert.equal(getDiapason(id).notes.length, 5);
  });
});

describe('triadTypeOptions', () => {
  it('offers the configured diapasons and the built-in calculators separately', () => {
    const second = addDiapason();
    const { configured, builtIn } = triadTypeOptions();

    assert.deepEqual(configured.map((option) => option.value), [getConfig().diapasons[0].id, second]);
    assert.ok(builtIn.every((option) => isBuiltInSystem(option.value)));
  });
});

describe('subscribers', () => {
  it('are notified when the configuration changes', () => {
    let notifications = 0;
    const unsubscribe = subscribe(() => { notifications += 1; });

    setRootFrequency(440);
    addNote(getPrimaryDiapason().id);

    assert.equal(notifications, 2);

    unsubscribe();
    setRootFrequency(432);
    assert.equal(notifications, 2);
  });

  it('are not notified for a silent edit, which is saved anyway', () => {
    let notifications = 0;
    const unsubscribe = subscribe(() => { notifications += 1; });

    updateNote(getPrimaryDiapason().id, 0, { ratioToRoot: 1.5 }, { silent: true });

    assert.equal(notifications, 0);
    assert.equal(getPrimaryDiapason().notes[0].ratioToRoot, 1.5);
    unsubscribe();
  });
});

describe('replaceConfig', () => {
  it('takes on a valid configuration', () => {
    const config = replaceConfig({
      primaryRootFrequency: 432,
      primaryDiapasonId: 'solo',
      diapasons: [{ id: 'solo', name: 'Solo', notes: [{ ratioToRoot: 1.5, triadType: 'solo' }] }],
    });

    assert.equal(config.primaryRootFrequency, 432);
    assert.equal(config.primaryDiapasonId, 'solo');
    assert.equal(config.diapasons[0].notes[0].ratioToRoot, 1.5);
  });

  it('clamps a root frequency outside the audible range', () => {
    const config = replaceConfig({
      primaryRootFrequency: 99999,
      diapasons: [{ id: 'a', notes: [{ ratioToRoot: 1 }] }],
    });

    assert.equal(config.primaryRootFrequency, MAX_AUDIBLE_FREQUENCY);
  });

  it('folds a ratio that sits outside the diapason', () => {
    const config = replaceConfig({
      diapasons: [{ id: 'a', notes: [{ ratioToRoot: 8 }, { ratioToRoot: 0.75 }] }],
    });

    assert.deepEqual(config.diapasons[0].notes.map((note) => note.ratioToRoot), [1, 1.5]);
  });

  it('repoints a triad type that names nothing at its own diapason', () => {
    const config = replaceConfig({
      diapasons: [{ id: 'a', notes: [{ ratioToRoot: 1, triadType: 'ghost' }] }],
    });

    assert.equal(config.diapasons[0].notes[0].triadType, 'a');
  });

  it('canonicalises a triad type given as an alias', () => {
    const config = replaceConfig({
      diapasons: [{ id: 'a', notes: [{ ratioToRoot: 1, triadType: 'minor' }] }],
    });

    assert.equal(config.diapasons[0].notes[0].triadType, 'naturalMinorScaleNotes');
  });

  it('keeps a triad type that points at another diapason in the file', () => {
    const config = replaceConfig({
      diapasons: [
        { id: 'a', notes: [{ ratioToRoot: 1, triadType: 'b' }] },
        { id: 'b', notes: [{ ratioToRoot: 1, triadType: 'a' }] },
      ],
    });

    assert.equal(config.diapasons[0].notes[0].triadType, 'b');
  });

  it('falls back to the first diapason when the primary names nothing', () => {
    const config = replaceConfig({
      primaryDiapasonId: 'missing',
      diapasons: [{ id: 'a', notes: [{ ratioToRoot: 1 }] }],
    });

    assert.equal(config.primaryDiapasonId, 'a');
  });

  it('fills in missing degrees and names', () => {
    const config = replaceConfig({
      diapasons: [{ id: 'a', notes: [{ ratioToRoot: 1 }, { ratioToRoot: 1.5 }] }],
    });

    assert.deepEqual(config.diapasons[0].notes.map((note) => note.degree), ['I', 'II']);
    config.diapasons[0].notes.forEach((note) => assert.ok(note.relationshipToRootName));
  });

  it('rejects a file that could not be played', () => {
    assert.throws(() => replaceConfig(null), /must be an object/);
    assert.throws(() => replaceConfig({ diapasons: [] }), /at least one diapason/);
    assert.throws(() => replaceConfig({ diapasons: [{ id: 'a', notes: [] }] }), /has no notes/);
  });

  it('leaves the existing configuration untouched when it rejects one', () => {
    setRootFrequency(440);

    assert.throws(() => replaceConfig({ diapasons: [] }));
    assert.equal(getConfig().primaryRootFrequency, 440);
  });

  it('keeps generated ids clear of the ones it took on', () => {
    replaceConfig({
      diapasons: [{ id: 'diapason-9', notes: [{ ratioToRoot: 1 }] }],
    });

    assert.notEqual(addDiapason(), 'diapason-9');
  });
});

describe('persistence', () => {
  const storedConfig = () => JSON.parse(readStoredValue(STORAGE_KEY));

  it('writes the current configuration to storage', () => {
    setRootFrequency(432);
    renameDiapason(getPrimaryDiapason().id, 'Solarian');
    saveConfig();

    assert.equal(storedConfig().primaryRootFrequency, 432);
    assert.equal(storedConfig().diapasons[0].name, 'Solarian');
  });

  it('saves on every change, without waiting to be asked', () => {
    setRootFrequency(300);
    assert.equal(storedConfig().primaryRootFrequency, 300);

    addNote(getPrimaryDiapason().id);
    assert.equal(storedConfig().diapasons[0].notes.length, 8);
  });

  it('saves a silent edit too, so a drag is not lost on reload', () => {
    updateNote(getPrimaryDiapason().id, 0, { ratioToRoot: 1.75 }, { silent: true });

    assert.equal(storedConfig().diapasons[0].notes[0].ratioToRoot, 1.75);
  });

  it('restores what was stored', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({
      primaryRootFrequency: 432,
      primaryDiapasonId: 'solo',
      diapasons: [{ id: 'solo', name: 'Solarian', notes: [{ ratioToRoot: 1.5, triadType: 'solo' }] }],
    }));

    loadStoredConfig();

    assert.equal(getConfig().primaryRootFrequency, 432);
    assert.equal(getPrimaryDiapason().name, 'Solarian');
    assert.equal(getPrimaryDiapason().notes[0].ratioToRoot, 1.5);
  });

  it('validates what it restores, so a hand-edited file cannot break the app', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({
      primaryRootFrequency: 999999,
      diapasons: [{ id: 'a', notes: [{ ratioToRoot: 8, triadType: 'ghost' }] }],
    }));

    const config = loadStoredConfig();

    assert.equal(config.primaryRootFrequency, MAX_AUDIBLE_FREQUENCY);
    assert.equal(config.diapasons[0].notes[0].ratioToRoot, 1);
    assert.equal(config.diapasons[0].notes[0].triadType, 'a');
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

    assert.ok(config.diapasons.length >= 1);
  });

  it('starts fresh when what was stored is valid JSON but not a system', (t) => {
    t.mock.method(console, 'error', () => {});
    writeStoredValue(STORAGE_KEY, JSON.stringify({ diapasons: [] }));

    const config = loadStoredConfig();

    assert.ok(config.diapasons.length >= 1);
  });
});

describe('clamp', () => {
  it('holds a value between its bounds', () => {
    assert.equal(clamp(5, 1, 2), 2);
    assert.equal(clamp(0, 1, 2), 1);
    assert.equal(clamp(1.5, 1, 2), 1.5);
  });
});
