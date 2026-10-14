import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(cleanup);

import { vi } from 'vitest';
window.HTMLElement.prototype.scrollIntoView = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

Object.defineProperty(navigator, 'language', {
  configurable: true,
  value: 'de-DE',
});

// jsdom has no layout engine. CodeMirror must see empty ranges rather than missing APIs.
Object.defineProperty(Range.prototype, 'getClientRects', {
  configurable: true,
  value: () => ({ length: 0, item: () => null }),
});
Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
  configurable: true,
  value: () => new DOMRect(),
});
