import '@testing-library/jest-dom';

// Node 25+ ships a built-in localStorage that lacks .clear() and collides
// with jsdom's implementation. Provide a spec-compliant Storage shim so tests
// can call localStorage.clear/setItem/getItem reliably.
const store: Record<string, string> = {};

const storageMock: Storage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = String(value);
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  },
  get length() {
    return Object.keys(store).length;
  },
  key: (index: number) => Object.keys(store)[index] ?? null,
};

Object.defineProperty(window, 'localStorage', { value: storageMock, writable: true });
