import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { readStoredValue, writeStoredValue, clearStoredValue } from '../../js/storage.js';

const KEY = 'storage.test.key';

beforeEach(() => {
  clearStoredValue(KEY);
});

afterEach(() => {
  delete globalThis.localStorage;
});

describe('storage without a browser', () => {
  it('round-trips a value through memory', () => {
    writeStoredValue(KEY, 'kept');

    assert.equal(readStoredValue(KEY), 'kept');
  });

  it('reads null for a key that was never written', () => {
    assert.equal(readStoredValue('storage.test.missing'), null);
  });

  it('forgets a cleared key', () => {
    writeStoredValue(KEY, 'kept');
    clearStoredValue(KEY);

    assert.equal(readStoredValue(KEY), null);
  });
});

describe('storage with a browser', () => {
  it('prefers localStorage when it is there', () => {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    };

    writeStoredValue(KEY, 'kept');

    assert.equal(store.get(KEY), 'kept');
    assert.equal(readStoredValue(KEY), 'kept');
  });

  it('falls back to memory when the browser blocks site data', (t) => {
    t.mock.method(console, 'error', () => {});
    globalThis.localStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };

    writeStoredValue(KEY, 'kept');

    assert.equal(readStoredValue(KEY), 'kept');
  });

  it('does not throw when storage itself cannot be reached', (t) => {
    t.mock.method(console, 'error', () => {});
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('access denied'); },
    });

    assert.doesNotThrow(() => writeStoredValue(KEY, 'kept'));
    assert.equal(readStoredValue(KEY), 'kept');
  });
});
