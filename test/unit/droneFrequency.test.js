import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { droneFrequency } from '../../js/system/droneFrequency.js';
import { PERIOD_RATIO } from '../../js/system/period.js';
import { MIN_AUDIBLE_FREQUENCY, MAX_AUDIBLE_FREQUENCY } from '../../js/system/generateSystem.js';

describe('droneFrequency', () => {
  it('moves the anchor down a period', () => {
    assert.equal(droneFrequency(432, -1), 432 / PERIOD_RATIO);
  });

  it('moves the anchor up a period', () => {
    assert.equal(droneFrequency(432, 1), 432 * PERIOD_RATIO);
  });

  it('leaves the anchor where it is when there is no shift', () => {
    assert.equal(droneFrequency(432, 0), 432);
  });

  it('shifts by the system period rather than by an octave it has assumed', () => {
    assert.equal(droneFrequency(432, -2), 432 / (PERIOD_RATIO * PERIOD_RATIO));
  });

  it('walks back toward the anchor rather than dropping out of hearing', () => {
    // Three periods below 100 Hz is 12.5, which is under the 20 Hz floor. Two
    // periods down is 25, which is the deepest drone a player can hear here.
    assert.equal(droneFrequency(100, -3), 25);
  });

  it('walks back down rather than climbing out of hearing', () => {
    assert.equal(droneFrequency(15000, 1), 15000);
  });

  it('returns the anchor itself when no shift at all fits', () => {
    assert.equal(droneFrequency(MIN_AUDIBLE_FREQUENCY, -3), MIN_AUDIBLE_FREQUENCY);
    assert.equal(droneFrequency(MAX_AUDIBLE_FREQUENCY, 1), MAX_AUDIBLE_FREQUENCY);
  });

  it('gives up on an anchor that cannot itself be heard', () => {
    assert.equal(droneFrequency(MIN_AUDIBLE_FREQUENCY - 1, 0), null);
    assert.equal(droneFrequency(MAX_AUDIBLE_FREQUENCY + 1, -1), null);
  });

  it('gives up on an anchor that is not a usable frequency', () => {
    assert.equal(droneFrequency(Number.NaN, -1), null);
    assert.equal(droneFrequency(0, -1), null);
    assert.equal(droneFrequency(-432, -1), null);
    assert.equal(droneFrequency(undefined, -1), null);
  });

  it('treats a shift that is not a number as no shift, rather than as silence', () => {
    assert.equal(droneFrequency(432, undefined), 432);
    assert.equal(droneFrequency(432, Number.NaN), 432);
  });

  it('takes a range of its own, so the audible bounds are not baked in', () => {
    assert.equal(droneFrequency(432, -1, { minFrequency: 300, maxFrequency: 500 }), 432);
    assert.equal(droneFrequency(432, -1, { minFrequency: 100, maxFrequency: 500 }), 216);
  });
});
