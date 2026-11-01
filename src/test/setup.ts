import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// jsdom has no layout engine. Radix needs these four methods and a ResizeObserver when it opens a menu.
window.HTMLElement.prototype.hasPointerCapture = () => false;
window.HTMLElement.prototype.setPointerCapture = () => undefined;
window.HTMLElement.prototype.releasePointerCapture = () => undefined;
window.HTMLElement.prototype.scrollIntoView = () => undefined;

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
