import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { formatFrequency, formatRatio, describeRatio, formatDegree } from '../../js/format.js';

describe('formatFrequency', () => {
  it('shows at most two decimals', () => {
    assert.equal(formatFrequency(533.3333333), '533.33');
  });

  it('drops trailing zeroes', () => {
    assert.equal(formatFrequency(400), '400');
    assert.equal(formatFrequency(450.5), '450.5');
  });

  it('marks a value that is not a frequency', () => {
    assert.equal(formatFrequency(Number.NaN), '—');
    assert.equal(formatFrequency(Number.POSITIVE_INFINITY), '—');
    assert.equal(formatFrequency(undefined), '—');
  });
});

describe('formatRatio', () => {
  it('keeps enough precision to tell close ratios apart', () => {
    assert.equal(formatRatio(4 / 3), '1.3333');
    assert.equal(formatRatio(1.125), '1.125');
  });

  it('marks a value that is not a ratio', () => {
    assert.equal(formatRatio(Number.NaN), '—');
  });
});

describe('describeRatio', () => {
  it('describes an interval in cents', () => {
    assert.equal(describeRatio(1), '0 cents');
    assert.equal(describeRatio(2), '1200 cents');
    assert.equal(describeRatio(1.5), '702 cents');
  });

  it('marks a value that cannot be an interval', () => {
    assert.equal(describeRatio(0), '—');
    assert.equal(describeRatio(-1), '—');
    assert.equal(describeRatio(Number.NaN), '—');
  });
});

describe('formatDegree', () => {
  it('shows a degree in the root period as itself', () => {
    assert.equal(formatDegree('V'), 'V');
    assert.equal(formatDegree('V', 0), 'V');
  });

  it('marks how many periods a degree has been shifted, in either direction', () => {
    assert.equal(formatDegree('I', 1), 'I +1');
    assert.equal(formatDegree('I', 3), 'I +3');
    assert.equal(formatDegree('VII', -2), 'VII −2');
  });

  it('treats a shift that is not a number as no shift at all', () => {
    assert.equal(formatDegree('V', Number.NaN), 'V');
    assert.equal(formatDegree('V', undefined), 'V');
  });
});
