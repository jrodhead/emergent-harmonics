import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { launchApp, findChrome } from '../helpers/browser.js';

const skip = findChrome() ? false : 'no Chrome-like browser installed to test with';

let app;

const dispatchKey = (type, key) => `
  document.body.dispatchEvent(new KeyboardEvent('${type}', { key: '${key}', bubbles: true }));
`;

const press = (...keys) => keys.map((key) => dispatchKey('keydown', key)).join('');
const release = (...keys) => keys.map((key) => dispatchKey('keyup', key)).join('');

const holdMode = dispatchKey('keydown', '*');
const droneToggle = dispatchKey('keydown', '`');

/** A wave with partials, since the default sine can only beat at a unison. */
const sawtooth = `
  {
    const shape = document.getElementById('waveShape');
    shape.value = 'sawtooth';
    shape.dispatchEvent(new Event('change', { bubbles: true }));
  }
`;

const loadPreset = (presetId) => `
  document.querySelector('[data-show-view="config"]').click();
  document.getElementById('presetSelect').value = '${presetId}';
  document.getElementById('loadPreset').click();
  document.querySelector('[data-show-view="play"]').click();
`;

const ROW_COUNT = "document.querySelectorAll('#intervalReadout .interval-row').length";

// Starts on its own first character, so `return ${rows}` is not cut in half by
// a semicolon the parser inserts after the return.
const rows = `[...document.querySelectorAll('#intervalReadout .interval-row')].map((row) => ({
    keys: row.querySelector('.interval-keys').textContent,
    ratio: row.querySelector('.interval-ratio').textContent,
    decimal: row.querySelector('.interval-decimal').textContent,
    cents: row.querySelector('.interval-cents').textContent,
    beat: row.querySelector('.interval-beat').textContent,
    partials: row.querySelector('.interval-partials').textContent,
    inaudible: row.querySelector('.interval-beat').classList.contains('inaudible'),
    roughness: row.querySelector('.interval-roughness')?.textContent ?? null,
  }))
`;

/** Runs a script, then waits for the coalesced redraw to land before reading. */
const playing = async (script, expectedRows) => {
  await app.evaluate(script);
  await app.waitFor(`${ROW_COUNT} === ${expectedRows}`, `${expectedRows} interval rows`);

  return app.evaluate(`return ${rows}`);
};

describe('the interval readout', { skip }, () => {
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

  it('asks for a second note rather than showing an empty box', async () => {
    assert.deepEqual(await app.evaluate(`
      return [${ROW_COUNT},
              document.querySelector('#intervalReadout .interval-prompt').textContent];
    `), [0, 'Hold two notes to see the interval between them.']);
  });

  it('stays quiet for a single note, which is not an interval', async () => {
    await app.evaluate(press('q'));
    await app.waitFor(`${ROW_COUNT} === 0`);

    assert.ok(await app.evaluate("return Boolean(document.querySelector('#intervalReadout .interval-prompt'))"));
  });

  it('shows a just fifth as ringing, with the partials it would beat between', async () => {
    // Pythagorean at 432: q is the root and i is its fifth, 648.
    const [fifth] = await playing(sawtooth + press('q', 'i'), 1);

    assert.deepEqual(fifth, {
      keys: 'q · i',
      ratio: '3/2',
      decimal: '1.5',
      cents: 'just',
      beat: '0 Hz',
      partials: '3rd × 2nd partial',
      inaudible: false,
      roughness: null,
    });
  });

  it('shows a tempered fifth as a fifth that beats, which is the whole story', async () => {
    const [fifth] = await playing(loadPreset('equalTemperament') + sawtooth + press('q', 'i'), 1);

    assert.equal(fifth.ratio, '3/2');
    assert.equal(fifth.cents, '−2 cents');
    assert.equal(fifth.beat, '1.46 Hz');
    assert.equal(fifth.inaudible, false);
  });

  it('pairs a chord adjacently and adds the outer interval, in pitch order', async () => {
    // Pressed high to low, to prove the rows are sorted rather than ordered by
    // the keypresses. q 432, t 540, i 648.
    const chord = await playing(sawtooth + press('i', 'q', 't'), 3);

    assert.deepEqual(chord.map(({ keys, ratio }) => [keys, ratio]), [
      ['q · t', '5/4'],
      ['t · i', '6/5'],
      ['q · i', '3/2'],
    ]);
  });

  it('follows a root change onto the new tuning', async () => {
    // The ratio is a property of the scale and survives; the beat rate is a
    // property of the frequencies and does not. That is a fact about just
    // intonation this readout now shows.
    const [before] = await playing(loadPreset('equalTemperament') + sawtooth + press('q', 'i'), 1);
    const beforeBeat = parseFloat(before.beat);

    await app.evaluate(press('4'));
    await app.waitFor(`${rows}[0].beat !== '${before.beat}'`, 'the readout to follow the root');

    const [after] = await app.evaluate(`return ${rows}`);

    assert.equal(after.ratio, before.ratio);
    assert.ok(parseFloat(after.beat) > beforeBeat, 'a higher root should beat faster');
  });

  it('leaves the ratios alone and doubles the beat on a register change', async () => {
    const [before] = await playing(loadPreset('equalTemperament') + sawtooth + press('q', 'i'), 1);

    await app.evaluate(press('ArrowUp'));
    await app.waitFor(`${rows}[0].beat !== '${before.beat}'`, 'the readout to follow the register');

    const [after] = await app.evaluate(`return ${rows}`);

    assert.equal(after.ratio, before.ratio);
    assert.ok(
      Math.abs(parseFloat(after.beat) - parseFloat(before.beat) * 2) < 0.02,
      `${after.beat} should be twice ${before.beat}`,
    );
  });

  describe('the sustain pedal', () => {
    it('keeps a released note in the readout, and says whose finger is off it', async () => {
      const [interval] = await playing(
        sawtooth + press(' ', 'q', 't') + release('q'),
        1,
      );

      assert.equal(interval.keys, 'q (pedal) · t');
      assert.equal(interval.ratio, '5/4');
    });

    it('drops it when the pedal is lifted', async () => {
      await playing(sawtooth + press(' ', 'q', 't') + release('q'), 1);

      await app.evaluate(release(' '));
      await app.waitFor(`${ROW_COUNT} === 0`, 'the pedalled note to leave the readout');
    });
  });

  describe('the drone', () => {
    it('is not an interval on its own', async () => {
      await app.evaluate(droneToggle);
      await app.waitFor(`${ROW_COUNT} === 0`);

      assert.equal(await app.evaluate("return document.getElementById('drone').textContent"), 'on');
    });

    it('is measured against whatever is played over it', async () => {
      // Anchored a period under the 432 fundamental, so 216 against q's 432.
      const [interval] = await playing(sawtooth + droneToggle + press('q'), 1);

      assert.equal(interval.keys, 'drone · q');
      assert.equal(interval.ratio, '2/1');
      assert.equal(interval.beat, '0 Hz');
    });
  });

  it('shows nothing in hold mode until a root makes the notes sound', async () => {
    await app.evaluate(sawtooth + holdMode + press('q', 'i'));
    await app.waitFor(`${ROW_COUNT} === 0`, 'held but silent notes to stay out of the readout');

    const [fifth] = await playing(press('0'), 1);

    assert.equal(fifth.ratio, '3/2');
  });

  it('marks a beat the wave shape cannot produce, and unmarks it when it can', async () => {
    // The default sine has nothing above its fundamental for the fifth's
    // partials to meet, so the number is real and the sound is not.
    const [onASine] = await playing(press('q', 'i'), 1);

    assert.equal(onASine.beat, '0 Hz');
    assert.equal(onASine.inaudible, true);

    await app.evaluate(sawtooth);
    await app.waitFor(`${rows}[0].inaudible === false`, 'the beat to become audible');
  });

  it('reports roughness the partials miss, for a semitone low down', async () => {
    // Three registers down, q and w are a just 16/15 whose coinciding partials
    // are the 16th and 15th: no beat at all between them, and four hertz
    // between the fundamentals, which is heard.
    const [semitone] = await playing(
      sawtooth + press('ArrowDown', 'ArrowDown', 'ArrowDown') + press('q', 'w'),
      1,
    );

    assert.equal(semitone.ratio, '16/15');
    assert.equal(semitone.beat, '0 Hz');
    assert.equal(semitone.inaudible, true);
    assert.equal(semitone.roughness, 'fundamentals 3.6 Hz apart');
  });

  it('caps a large chord and says how much it is not showing', async () => {
    const keys = [...'qwertyuiop', ...'asdfg'];

    await app.evaluate(sawtooth + press(...keys));
    await app.waitFor(`${ROW_COUNT} === 12`, 'the readout to cap itself');

    assert.equal(
      await app.evaluate("return document.querySelector('#intervalReadout .interval-more').textContent.trim()"),
      '+ 3 more',
    );
  });

  it('draws once for a chord struck in one burst', async () => {
    // Counts redraws of the readout itself rather than calls to
    // requestAnimationFrame, because the consonance meter beside it schedules
    // its own frame and this claim is about this display, not about the page.
    assert.equal(await app.evaluate(`
      window.__draws = 0;
      new MutationObserver((records) => { window.__draws += records.length; })
        .observe(document.getElementById('intervalReadout'), { childList: true });

      ${press('q', 'w', 'e', 'r', 't', 'y')}

      return new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(window.__draws)));
      });
    `), 1);
  });

  describe('what clears it', () => {
    it('the panic stop', async () => {
      await playing(sawtooth + press('q', 'i'), 1);

      await app.evaluate(press('Escape'));
      await app.waitFor(`${ROW_COUNT} === 0`, 'the panic stop to clear the readout');
    });

    it('switching to the configuration view, which also hides it', async () => {
      await playing(sawtooth + press('q', 'i'), 1);

      await app.evaluate('document.querySelector(\'[data-show-view="config"]\').click();');
      await app.waitFor(`${ROW_COUNT} === 0`, 'the view change to clear the readout');

      assert.equal(await app.evaluate(`
        return getComputedStyle(document.getElementById('keys')).display;
      `), 'none');
    });
  });

  it('logs nothing to the console while all of that happens', async () => {
    assert.deepEqual(app.consoleErrors, []);
  });
});
