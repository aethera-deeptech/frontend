import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// A few test files run in Node and not in jsdom, and they have no window
if (typeof window !== 'undefined') {
  // jsdom has no layout engine. Radix needs these four methods and a ResizeObserver when it opens a menu.
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.setPointerCapture = () => undefined;
  window.HTMLElement.prototype.releasePointerCapture = () => undefined;
  window.HTMLElement.prototype.scrollIntoView = () => undefined;

  // jsdom has no matchMedia. By default nothing matches, so a screen is drawn like on a phone.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
        // The deprecated addListener and removeListener are left out, nothing in the app calls them
      }) as unknown as MediaQueryList,
  });
}

class ResizeObserverStub {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
}

// A test that needs the network stubs fetch itself. Without that, a screen that loads data fails like a phone without a connection
// and never reaches the real network. The stubs are set before each test because a test may call vi.unstubAllGlobals().
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.stubGlobal('fetch', () => Promise.reject(new TypeError('There is no network in tests.')));
});

afterEach(() => {
  cleanup();
});
