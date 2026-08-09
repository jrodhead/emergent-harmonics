/**
 * Persistent storage that degrades to memory. localStorage is missing outside
 * the browser and throws outright when a browser blocks site data, so reads
 * and writes both have to tolerate not having it.
 */

const memoryStore = new Map();

const browserStorage = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch (error) {
    // Access itself throws when site data is blocked.
    return null;
  }
};

export const readStoredValue = (key) => {
  const storage = browserStorage();

  if (!storage) return memoryStore.get(key) ?? null;

  try {
    return storage.getItem(key);
  } catch (error) {
    console.error(`Could not read "${key}" from storage:`, error);
    return memoryStore.get(key) ?? null;
  }
};

export const writeStoredValue = (key, value) => {
  memoryStore.set(key, value);

  const storage = browserStorage();
  if (!storage) return;

  try {
    storage.setItem(key, value);
  } catch (error) {
    console.error(`Could not save "${key}" to storage:`, error);
  }
};

/** Clears a key from both stores. Used by tests to start from a clean slate. */
export const clearStoredValue = (key) => {
  memoryStore.delete(key);

  const storage = browserStorage();
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch (error) {
    console.error(`Could not clear "${key}" from storage:`, error);
  }
};
