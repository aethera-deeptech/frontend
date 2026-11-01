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

  it('does not reload again within a minute and leaves that error alone', () => {
    fail();
    const second = fail();

    expect(reload).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(false);
  });

  it('reloads again after a minute', () => {
    vi.useFakeTimers();
    fail();
    vi.advanceTimersByTime(60_001);
    fail();

    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('does not reload while the device is offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const event = fail();

    expect(reload).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    vi.restoreAllMocks();
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
