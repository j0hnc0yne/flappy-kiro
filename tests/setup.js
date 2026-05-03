/**
 * Global test setup — runs before any test file is loaded.
 *
 * Installs a minimal in-memory localStorage shim so that game.js functions
 * that use localStorage (loadHighScore, saveHighScore) work correctly in the
 * Node.js test environment, which does not provide a functional browser
 * storage API (Node.js v25 exposes an empty localStorage stub).
 */
if (typeof globalThis.localStorage?.setItem !== 'function') {
  const store = new Map();
  globalThis.localStorage = {
    getItem:    (key) => store.has(key) ? store.get(key) : null,
    setItem:    (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear:      () => store.clear(),
  };
}
