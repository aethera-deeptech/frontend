import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useBusinessZone } from '@/hooks/use-business-zone';
import { setBusinessZone } from '@/lib/format';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  );
}

describe('useBusinessZone', () => {
  it('starts with the zone of a new business and follows the zone that arrives', () => {
    const { result } = renderHook(() => useBusinessZone(), { wrapper });
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
    const { result } = renderHook(
      () => {
        const [count, setCount] = useState(0);
        return { count, setCount, zone: useBusinessZone() };
      },
      { wrapper },
    );

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
