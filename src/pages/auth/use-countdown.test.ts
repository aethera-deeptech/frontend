import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCountdown } from '@/pages/auth/use-countdown';

afterEach(() => {
  vi.useRealTimers();
});

describe('useCountdown', () => {
  it('counts the seconds to the end and stops at zero', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCountdown(Date.now() + 3000));

    expect(result.current).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(2);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(0);
  });

  it('counts a later end from the present and not from the moment the last wait ended', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ endsAt }) => useCountdown(endsAt), {
      initialProps: { endsAt: Date.now() + 2000 },
    });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe(0);

    rerender({ endsAt: Date.now() + 700_000 });
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current).toBe(700);
  });
});
