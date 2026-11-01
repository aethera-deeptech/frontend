import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// The tests of the nginx files and of the design tokens run in the node environment, which has no window.
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

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

afterEach(() => {
  cleanup();
});
