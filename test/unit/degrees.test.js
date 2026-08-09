import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { degreeForIndex } from '../../js/config/degrees.js';

describe('degreeForIndex', () => {
  it('numbers degrees in roman numerals', () => {
    assert.equal(degreeForIndex(0), 'I');
    assert.equal(degreeForIndex(6), 'VII');
  });

  it('keeps numbering past the notes a conventional scale holds', () => {
    // A scale can hold a note per key, which is well past VII.
    assert.equal(degreeForIndex(13), 'XIV');
    assert.equal(degreeForIndex(29), 'XXX');
    assert.equal(degreeForIndex(99), 'C');
  });
});
