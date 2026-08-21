import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PERIOD_RATIO, periodMultiplier, foldRatioIntoPeriod } from '../../js/system/period.js';

describe('the period', () => {
  it('is the octave, until a system wants something else', () => {
    assert.equal(PERIOD_RATIO, 2);
  });

  it('multiplies a frequency up and down by whole periods', () => {
    assert.equal(periodMultiplier(0), 1);
    assert.equal(periodMultiplier(1), PERIOD_RATIO);
    assert.equal(periodMultiplier(3), Math.pow(PERIOD_RATIO, 3));
    assert.equal(periodMultiplier(-1), 1 / PERIOD_RATIO);
  });
});

describe('foldRatioIntoPeriod', () => {
  it('leaves a ratio that already sits in the period alone', () => {
    assert.equal(foldRatioIntoPeriod(1), 1);
    assert.equal(foldRatioIntoPeriod(1.5), 1.5);
  });

  it('folds a ratio above the period down into it', () => {
    assert.equal(foldRatioIntoPeriod(3), 1.5);
    assert.equal(foldRatioIntoPeriod(4), 1);
  });

  it('folds a ratio below the root up into it', () => {
    assert.equal(foldRatioIntoPeriod(0.75), 1.5);
    assert.equal(foldRatioIntoPeriod(0.5), 1);
  });

  it('lands every folded ratio between the root and the period', () => {
    [0.1, 0.75, 1, 1.5, 3, 7, 1000].forEach((ratio) => {
      const folded = foldRatioIntoPeriod(ratio);

      assert.ok(folded >= 1 && folded < PERIOD_RATIO, `${ratio} folds to ${folded}`);
    });
  });

  it('falls back to the root for values that are not usable ratios', () => {
    [0, -3, Number.NaN, Number.POSITIVE_INFINITY, undefined].forEach((value) => {
      assert.equal(foldRatioIntoPeriod(value), 1);
    });
  });
});
