import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { useBusinessZone } from '@/hooks/use-business-zone';
import { setBusinessZone } from '@/lib/format';

describe('useBusinessZone', () => {
  it('starts with the zone of a new business and follows the zone that arrives', () => {
    const { result } = renderHook(() => useBusinessZone());
    expect(result.current).toBe('Asia/Jakarta');

    act(() => {
      setBusinessZone('Asia/Jayapura');
    });
    expect(result.current).toBe('Asia/Jayapura');

    act(() => {
      setBusinessZone(undefined);
    });
    expect(result.current).toBe('Asia/Jakarta');
  });

  it('keeps the state of the screen when the zone changes', () => {
    const { result } = renderHook(() => {
      const [count, setCount] = useState(0);
      return { count, setCount, zone: useBusinessZone() };
    });

    act(() => {
      result.current.setCount(3);
    });
    act(() => {
      setBusinessZone('Asia/Makassar');
    });

    expect(result.current.zone).toBe('Asia/Makassar');
    expect(result.current.count).toBe(3);
    setBusinessZone(undefined);
  });
});
