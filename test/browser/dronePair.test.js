import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { launchApp, findChrome } from '../helpers/browser.js';
import { recordAudio } from '../helpers/recordAudio.js';

const skip = findChrome() ? false : 'no Chrome-like browser installed to test with';

let app;

const dispatchKey = (type, key) => `
  document.body.dispatchEvent(new KeyboardEvent('${type}', { key: '${key}', bubbles: true }));
`;

const setControl = (id, value) => `
  {
    const control = document.getElementById('${id}');
    control.value = '${value}';
    control.dispatchEvent(new Event('input', { bubbles: true }));
  }
`;

// Typed rather than dragged, so it lands on change the way a text field does.
const setRatio = (value) => `
  {
    const control = document.getElementById('droneSpreadRatio');
    control.value = '${value}';
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }
`;

const setPair = (on) => `
  {
    const control = document.getElementById('dronePair');
    control.checked = ${on};
    control.dispatchEvent(new Event('input', { bubbles: true }));
  }
`;

// The one setting that can put the drone low enough for a wide spread not to
// fit under it: three periods under a 200 Hz fundamental is 25 Hz.
const setRootFrequency = (hertz) => `
  {
    const root = document.getElementById('configRootFrequency');
    root.value = '${hertz}';
    root.dispatchEvent(new Event('change', { bubbles: true }));
  }
`;

const droneToggle = dispatchKey('keydown', '`');
const droneModeSwitch = dispatchKey('keydown', '~');

// The drone's default pitch: a period under a 432 Hz fundamental.
const DRONE_PITCH = 216;
const DRONE_LEVEL = 0.3;
const PAIR_LEVEL = DRONE_LEVEL / Math.SQRT2;

const frequencies = `window.__sounds.map((sound) => sound.frequency)`;
// Starts on its own first character, so `return ${readout}` is not cut in half
// by a semicolon the parser inserts after the return.
const readout = `document.getElementById('dronePairReadout')
   .textContent.replace(/\\s+/g, ' ').trim()
`;

describe('the stereo drone pair', { skip }, () => {
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

  it('sounds as a single centred voice until it is asked for a pair', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${droneToggle}

      return [window.__sounds.length, window.__pans.length, window.__sounds[0].volume,
              document.getElementById('dronePair').checked,
              document.getElementById('droneSpreadHz').disabled,
              ${readout}];
    `), [1, 0, DRONE_LEVEL, false, true, '']);
  });

  it('opens the pair from the pitch that was already sounding, without re-striking it', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${droneToggle}
      ${setPair(true)}

      return [window.__sounds.length, window.__stops, ${frequencies},
              window.__sounds.map((sound) => sound.volume),
              window.__levels.map(({ volume }) => volume),
              window.__pans.map(({ pan }) => pan),
              document.getElementById('droneSpreadHz').disabled];
    `), [
      2, 0, [DRONE_PITCH, DRONE_PITCH],
      // The second voice is struck at the pair's level and the first is moved
      // to it, which is what "without re-striking it" means.
      [DRONE_LEVEL, PAIR_LEVEL], [PAIR_LEVEL],
      // Both voices are panned from the moment they are a pair, centre being a
      // position rather than an absence of one.
      [0, 0],
      false,
    ]);
  });

  it('gives the level and the centre back when the pair is switched off', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${droneToggle}
      ${setPair(true)}
      const struck = window.__sounds.length;

      ${setPair(false)}

      return [struck, window.__sounds.length, window.__stops,
              window.__levels.map(({ volume }) => volume),
              window.__pans.map(({ pan }) => pan),
              ${readout}];
    // One null, not two: the voice that was let go is still fading, and gives
    // its panner back when its release finishes rather than now.
    `), [2, 2, 1, [PAIR_LEVEL, DRONE_LEVEL], [0, 0, null], '']);
  });

  describe('the two spreads', () => {
    it('puts exactly the hertz spread between the voices, symmetrically', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${setControl('droneSpreadHz', 6)}

        return [${frequencies}, window.__glides.map(({ frequency }) => frequency),
                window.__sounds.length, window.__stops];
      `), [[213, 219], [213, 219], 2, 0]);
    });

    it('puts exactly the ratio between the voices, straddling the drone pitch', async () => {
      await recordAudio(app);

      const [lower, upper] = await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${setRatio('3/2')}

        return window.__sounds.map((sound) => sound.frequency);
      `);

      // Rounded to whole hertz by the recorder, which is why this is an
      // approximate check of an exact claim: a just fifth between the two, with
      // the drone's own pitch as their geometric mean.
      assert.ok(Math.abs(upper / lower - 1.5) < 0.01, `${lower} to ${upper} is not a fifth`);
      assert.ok(Math.abs(Math.sqrt(lower * upper) - DRONE_PITCH) < 1);
    });

    it('reads a ratio written the other way up as the same spread', async () => {
      const [inverted, upright, field] = await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${setRatio('2/3')}
        const written = document.getElementById('droneSpreadRatio').value;

        ${setRatio('3/2')}

        return [written, document.getElementById('droneSpreadRatio').value,
                document.getElementById('droneSpreadRatioOutput').textContent];
      `);

      assert.equal(inverted, '1.5');
      assert.equal(upright, '1.5');
      assert.equal(field, '3/2, 702 cents');
    });

    it('composes the two, ratio first and hertz second', async () => {
      await recordAudio(app);

      const [lower, upper] = await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${setRatio('3/2')}
        ${setControl('droneSpreadHz', 6)}

        return window.__sounds.map((sound) => sound.frequency);
      `);

      assert.equal(lower, Math.round(DRONE_PITCH / Math.sqrt(1.5) - 3));
      assert.equal(upper, Math.round(DRONE_PITCH * Math.sqrt(1.5) + 3));
    });

    it('glides both voices under the drag rather than re-striking them', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        const before = window.__sounds.length;

        ${setControl('droneSpreadHz', 2)}
        ${setControl('droneSpreadHz', 4)}
        ${setControl('droneSpreadHz', 6)}

        return [before, window.__sounds.length, window.__stops, window.__glides.length,
                window.__glides.every(({ timeConstant }) => timeConstant > 0)];
      `), [2, 2, 0, 6, true]);
    });
  });

  it('collapses to one voice, still sounding, when the spread will not fit at that pitch', async () => {
    await recordAudio(app);

    // Half of the widest spread under a 25 Hz drone would put the lower voice
    // beneath the 20 Hz floor. The drone keeps sounding: the pitch is perfectly
    // audible and it is the setting that is out of reach.
    assert.deepEqual(await app.evaluate(`
      ${setRootFrequency(200)}
      ${setControl('dronePeriod', -3)}
      ${droneToggle}
      ${setPair(true)}
      ${setControl('droneSpreadHz', 30)}

      // Two voices were built and one of them has been let go, so what is left
      // is the single centred drone, back at its own level.
      return [window.__sounds.length, window.__stops,
              window.__sounds[0].frequency, window.__sounds[0].volume,
              window.__sounds[0].pan,
              document.getElementById('drone').textContent,
              ${readout}];
    `), [2, 1, 25, DRONE_LEVEL, null, 'on',
      'that spread does not fit at this pitch: it would put the lower voice under hearing']);
  });

  it('opens the pair again as soon as the spread will fit', async () => {
    await recordAudio(app);

    assert.deepEqual(await app.evaluate(`
      ${setRootFrequency(200)}
      ${setControl('dronePeriod', -3)}
      ${droneToggle}
      ${setPair(true)}
      ${setControl('droneSpreadHz', 30)}
      ${setControl('droneSpreadHz', 6)}

      // The lower voice never stopped and has glided down to meet the new
      // spread; the upper one is struck again, the pair being available again.
      return [window.__sounds.length, window.__stops,
              window.__sounds[0].frequency, window.__sounds[2].frequency];
    `), [3, 1, 22, 28]);
  });

  describe('the stereo field', () => {
    it('takes each voice to its own position, including hard left and right', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${setControl('droneLowerPan', -1)}
        ${setControl('droneUpperPan', 1)}

        return [window.__sounds.map((sound) => sound.pan), ${frequencies},
                window.__sounds.map((sound) => sound.volume),
                document.getElementById('droneLowerPanOutput').textContent,
                document.getElementById('droneUpperPanOutput').textContent];
      `), [[-1, 1], [DRONE_PITCH, DRONE_PITCH], [DRONE_LEVEL, PAIR_LEVEL],
        'hard left', 'hard right']);
    });

    it('moves only the voice whose control was dragged', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${setControl('droneLowerPan', -0.4)}

        return [window.__sounds.map((sound) => sound.pan),
                document.getElementById('droneLowerPanOutput').textContent];
      `), [[-0.4, 0], '40% left']);
    });

    it('keeps both panners while it is a pair, so a drag through the centre is not a step', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${setControl('droneLowerPan', -1)}
        ${setControl('droneLowerPan', 0)}

        return [window.__pans.map(({ pan }) => pan), window.__sounds.map((sound) => sound.pan)];
      `), [[0, 0, -1, 0], [0, 0]]);
    });
  });

  describe('what it says it is doing', () => {
    it('shows both frequencies, where they sit, and how far apart they are', async () => {
      assert.equal(await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${setControl('droneSpreadHz', 6)}
        ${setControl('droneLowerPan', -1)}
        ${setControl('droneUpperPan', 1)}

        return ${readout};
      `), '213 Hz hard left 219 Hz hard right 6 Hz apart beats at 6 Hz, between the fundamentals '
        + 'opposite ears: on headphones this beat is made in the listener, not in the air');
    });

    it('says the beat is between the fundamentals, which have no simple ratio to be named by', async () => {
      // Two voices 6 Hz apart at this pitch are 48 cents apart, which no simple
      // ratio is within a quartertone of. They beat at 6 Hz all the same, and a
      // readout that only knew about partials would say nothing at all here.
      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${setControl('droneSpreadHz', 6)}

        return [document.querySelector('.drone-beat').textContent,
                document.querySelector('.drone-beat').classList.contains('inaudible'),
                document.querySelector('.drone-regime').textContent];
      `), ['beats at 6 Hz, between the fundamentals', false,
        'together: real beating in the air, on speakers and headphones alike']);
    });

    it('says a ratio spread does not beat on a sine, and stops saying it on a sawtooth', async () => {
      const onASine = await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${setRatio('3/2')}

        return [document.querySelector('.drone-beat').classList.contains('inaudible'),
                document.querySelector('.drone-beat').title];
      `);

      assert.deepEqual(onASine, [true, 'a sine has no partials above its fundamental to beat with']);

      assert.deepEqual(await app.evaluate(`
        ${setControl('waveShape', 'sawtooth')}
        document.getElementById('waveShape').dispatchEvent(new Event('change', { bubbles: true }));

        return [document.querySelector('.drone-beat').classList.contains('inaudible'),
                document.querySelector('.drone-beat').textContent];
      `), [false, 'beats at 0 Hz, between partials']);
    });

    it('says a pair with no spread between it is one pitch', async () => {
      assert.equal(await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}

        return document.querySelector('.drone-beat').textContent;
      `), 'no beat: both voices are the same pitch');
    });

    it('says nothing at all while the drone is a single voice', async () => {
      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        const alone = ${readout};

        ${setPair(true)}
        ${setPair(false)}

        return [alone, ${readout}];
      `), ['', '']);
    });
  });

  describe('in the interval readout', () => {
    it('numbers the two voices in pitch order once they are apart', async () => {
      await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${setControl('droneSpreadHz', 6)}
      `);

      await app.waitFor("document.querySelectorAll('#intervalReadout .interval-row').length === 1");

      assert.deepEqual(await app.evaluate(`
        return [...document.querySelectorAll('#intervalReadout .interval-keys')]
          .map((keys) => keys.textContent);
      `), ['drone 1 · drone 2']);
    });

    it('shows one drone while the pair is coincident, since that is not an interval', async () => {
      await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${dispatchKey('keydown', 'q')}
      `);

      await app.waitFor("document.querySelectorAll('#intervalReadout .interval-row').length === 1");

      assert.deepEqual(await app.evaluate(`
        return [...document.querySelectorAll('#intervalReadout .interval-keys')]
          .map((keys) => keys.textContent);
      `), ['drone · q']);
    });
  });

  describe('everything the single drone already promised', () => {
    it('leaves an anchored pair exactly where it is on a root change', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${setControl('droneSpreadHz', 6)}
        const glides = window.__glides.length;

        ${dispatchKey('keydown', '4')}

        return [window.__glides.length - glides, ${frequencies}, window.__stops];
      `), [0, [213, 219], 0]);
    });

    it('glides both voices onto a new root when it is following one', async () => {
      await recordAudio(app);

      const [glides, sounds, stops, lower, upper, rootFrequency] = await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${setControl('droneSpreadHz', 6)}
        ${droneModeSwitch}
        const before = window.__glides.length;

        ${dispatchKey('keydown', '4')}

        return [window.__glides.length - before, window.__sounds.length, window.__stops,
                window.__sounds[0].frequency, window.__sounds[1].frequency,
                parseFloat(document.querySelector('#root4 .frequency').textContent)];
      `);

      assert.equal(glides, 2);
      assert.equal(sounds, 2);
      assert.equal(stops, 0);
      assert.equal(lower, Math.round(rootFrequency / 2 - 3));
      assert.equal(upper, Math.round(rootFrequency / 2 + 3));
    });

    it('is stopped whole by the panic, and by leaving the play view', async () => {
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}
        ${setPair(true)}
        ${dispatchKey('keydown', 'Escape')}
        const afterEscape = [window.__stops, document.getElementById('drone').textContent];

        ${droneToggle}
        document.querySelector('[data-show-view="config"]').click();

        return [...afterEscape, window.__stops, document.getElementById('drone').textContent];
      // Two stops per voice each time: the release the drone schedules, and
      // then the panic cancelling it and stopping the voice dead, which is what
      // panic means.
      `), [4, 'off', 8, 'off']);
    });

    it('remembers the pair and its four settings between visits', async () => {
      await app.evaluate(`
        ${setPair(true)}
        ${setRatio('3/2')}
        ${setControl('droneSpreadHz', 6)}
        ${setControl('droneLowerPan', -1)}
        ${setControl('droneUpperPan', 1)}
      `);

      await app.reload();
      await app.evaluate('document.querySelector(\'[data-show-view="play"]\').click();');
      await recordAudio(app);

      assert.deepEqual(await app.evaluate(`
        ${droneToggle}

        return [document.getElementById('dronePair').checked,
                document.getElementById('droneSpreadRatio').value,
                document.getElementById('droneSpreadHz').value,
                document.getElementById('droneLowerPanOutput').textContent,
                window.__sounds.length, window.__sounds.map((sound) => sound.pan)];
      `), [true, '1.5', '6', 'hard left', 2, [-1, 1]]);
    });
  });

  it('logs nothing to the console through any of it', async () => {
    await app.evaluate(`
      ${droneToggle}
      ${setPair(true)}
      ${setControl('droneSpreadHz', 6)}
      ${setRatio('3/2')}
      ${setControl('droneLowerPan', -1)}
      ${setPair(false)}
      ${droneToggle}
    `);

    assert.deepEqual(app.consoleErrors, []);
  });
});
