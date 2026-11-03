import { act, renderHook } from '@testing-library/react';
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
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useBusinessZone();
    });
    const before = renders;

    act(() => {
      setBusinessZone('Asia/Makassar');
    });

    expect(result.current).toBe('Asia/Makassar');
    expect(renders).toBe(before + 1);
    setBusinessZone(undefined);
  });
});
