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

const setWave = (shape) => `
  {
    const control = document.getElementById('waveShape');
    control.value = '${shape}';
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }
`;

const loadPreset = (presetId) => `
  document.querySelector('[data-show-view="config"]').click();
  document.getElementById('presetSelect').value = '${presetId}';
  document.getElementById('loadPreset').click();
  document.querySelector('[data-show-view="play"]').click();
`;

const VALUE = "document.querySelector('#consonanceMeter .consonance-value')";
const READING = `${VALUE} ? parseInt(${VALUE}.textContent, 10) : null`;

/** Runs a script, waits for the coalesced redraw, and reads the percentage. */
const measure = async (script) => {
  const before = await app.evaluate(`return ${READING}`);

  await app.evaluate(script);
  await app.waitFor(`(${READING}) !== ${before === null ? 'null' : before}`, 'the meter to move');

  return app.evaluate(`return ${READING}`);
};

describe('the consonance meter', { skip }, () => {
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

  it('asks for something to measure before anything sounds', async () => {
    assert.deepEqual(await app.evaluate(`
      return [${READING},
              document.querySelector('#consonanceMeter .consonance-prompt').textContent];
    `), [null, 'Play something to measure how locked it is.']);
  });

  it('states the measure it is using, since there is no single correct one', async () => {
    await measure(setWave('sawtooth') + press('q', 'i'));

    const measureText = await app.evaluate(`
      return document.querySelector('#consonanceMeter .consonance-measure').textContent
        .replace(/\\s+/g, ' ').trim();
    `);

    assert.equal(
      measureText,
      'Plomp–Levelt roughness per voice pair, first 8 partials of a sawtooth, '
      + 'against a semitone dyad at 220 Hz',
    );
  });

  it('says which partials it weighed, which changes with the wave shape', async () => {
    await measure(setWave('sine') + press('q', 'i'));

    assert.match(
      await app.evaluate("return document.querySelector('#consonanceMeter .consonance-measure').textContent"),
      /a sine has no partials to grind/,
    );
  });

  it('reads a just fifth as more locked than a tempered one', async () => {
    const just = await measure(setWave('sawtooth') + press('q', 'i'));

    await app.resetApp();
    await app.evaluate('document.querySelector(\'[data-show-view="play"]\').click();');

    const tempered = await measure(loadPreset('equalTemperament') + setWave('sawtooth') + press('q', 'i'));

    assert.ok(just > tempered, `just ${just}% should beat tempered ${tempered}%`);
  });

  it('reads a semitone as far rougher than a fifth', async () => {
    const fifth = await measure(setWave('sawtooth') + press('q', 'i'));

    await app.evaluate(release('q', 'i'));
    const semitone = await measure(press('q', 'w'));

    assert.ok(semitone < fifth, `a semitone ${semitone}% should be rougher than a fifth ${fifth}%`);
  });

  it('finds a fifth on a sine perfectly locked, there being no partials to grind', async () => {
    // The same lesson the interval readout teaches from the other side, and
    // the reason both displays name the wave shape.
    assert.equal(await measure(setWave('sine') + press('q', 'i')), 100);
  });

  it('still finds a semitone on a sine rough, because sines beat too', async () => {
    // The trap in the sentence above: a sine has no *partials*, but two sine
    // fundamentals inside one critical band are rough on their own. That pair
    // is what Plomp and Levelt measured in the first place.
    const semitone = await measure(setWave('sine') + press('q', 'w'));

    assert.ok(semitone < 90, `a sine semitone should be rough, read ${semitone}%`);
  });

  it('moves when the wave shape changes under a held chord', async () => {
    const onASine = await measure(setWave('sine') + press('q', 'w'));

    await app.evaluate(setWave('sawtooth'));
    await app.waitFor(`(${READING}) < ${onASine}`, 'the meter to hear the new partials');
  });

  it('measures a single voice, which the interval readout cannot', async () => {
    const reading = await measure(setWave('sawtooth') + press('q'));

    assert.ok(Number.isInteger(reading));
    assert.equal(await app.evaluate("return document.querySelectorAll('#intervalReadout .interval-row').length"), 0);
  });

  it('hears a low register as rougher than a high one, on the same chord', async () => {
    const high = await measure(setWave('sawtooth') + press('q', 'e'));

    const low = await measure(press('ArrowDown', 'ArrowDown', 'ArrowDown'));

    assert.ok(low < high, `low ${low}% should be rougher than high ${high}%`);
  });

  it('counts the drone, which belongs to no key', async () => {
    const withoutDrone = await measure(setWave('sawtooth') + press('q', 'w'));

    await app.evaluate(dispatchKey('keydown', '`'));
    await app.waitFor(`(${READING}) !== ${withoutDrone}`, 'the drone to reach the meter');
  });

  it('goes back to the prompt when everything stops', async () => {
    await measure(setWave('sawtooth') + press('q', 'i'));

    await app.evaluate(press('Escape'));
    await app.waitFor(
      "Boolean(document.querySelector('#consonanceMeter .consonance-prompt'))",
      'the panic stop to clear the meter',
    );
  });

  it('logs nothing to the console while all of that happens', async () => {
    assert.deepEqual(app.consoleErrors, []);
  });
});
