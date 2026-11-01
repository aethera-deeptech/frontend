import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reloadOnPreloadError } from '@/lib/reload-on-preload-error';

function fail(): Event {
  const event = new Event('vite:preloadError', { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe('reloadOnPreloadError', () => {
  let stop: () => void;
  const reload = vi.fn();

  beforeEach(() => {
    window.sessionStorage.clear();
    reload.mockClear();
    stop = reloadOnPreloadError(reload);
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  it('reloads the page once and keeps the error from reaching the console', () => {
    const event = fail();

    expect(event.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload again within 10 seconds', () => {
    fail();
    fail();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads again after 10 seconds', () => {
    vi.useFakeTimers();
    fail();
    vi.advanceTimersByTime(10_001);
    fail();

    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('does not reload when the storage is blocked, because the guard cannot work', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    fail();

    expect(reload).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
