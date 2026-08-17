import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatFrequency,
  formatRatio,
  describeRatio,
  formatDegree,
  formatCents,
  formatBeat,
  formatPartial,
} from '../../js/format.js';

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

describe('formatCents', () => {
  it('says an interval that lands on its ratio is just', () => {
    assert.equal(formatCents(0), 'just');
    // Rounds to the whole cent nobody can hear past.
    assert.equal(formatCents(0.4), 'just');
  });

  it('signs a deviation in either direction, with the same minus as a degree', () => {
    assert.equal(formatCents(17.488), '+17 cents');
    assert.equal(formatCents(-1.955), '−2 cents');
  });

  it('counts a single cent as one', () => {
    assert.equal(formatCents(1.2), '+1 cent');
    assert.equal(formatCents(-1.2), '−1 cent');
  });

  it('marks a value that is not a deviation', () => {
    assert.equal(formatCents(Number.NaN), '—');
    assert.equal(formatCents(null), '—');
  });
});

describe('formatBeat', () => {
  it('keeps two decimals on a slow beat, where they are the whole reading', () => {
    assert.equal(formatBeat(1.4897), '1.49 Hz');
    assert.equal(formatBeat(0.256), '0.26 Hz');
  });

  it('drops to one decimal once the beat is fast enough not to count', () => {
    assert.equal(formatBeat(12.34), '12.3 Hz');
  });

  it('drops trailing zeroes, like every other number here', () => {
    assert.equal(formatBeat(0), '0 Hz');
    assert.equal(formatBeat(2.5), '2.5 Hz');
  });

  it('marks a beat that could not be worked out', () => {
    assert.equal(formatBeat(null), '—');
    assert.equal(formatBeat(Number.NaN), '—');
  });
});

describe('formatPartial', () => {
  it('names the low harmonics that actually beat', () => {
    assert.equal(formatPartial(1), '1st');
    assert.equal(formatPartial(2), '2nd');
    assert.equal(formatPartial(3), '3rd');
    assert.equal(formatPartial(4), '4th');
  });

  it('handles the teens, which break the last-digit pattern', () => {
    assert.equal(formatPartial(11), '11th');
    assert.equal(formatPartial(12), '12th');
    assert.equal(formatPartial(13), '13th');
    assert.equal(formatPartial(15), '15th');
    assert.equal(formatPartial(16), '16th');
  });

  it('picks the pattern back up above the teens', () => {
    assert.equal(formatPartial(21), '21st');
    assert.equal(formatPartial(22), '22nd');
  });

  it('marks a value that is not a harmonic', () => {
    assert.equal(formatPartial(Number.NaN), '—');
  });
});
