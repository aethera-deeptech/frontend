import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useConnection } from '@/hooks/use-connection';

function setup() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(() => useConnection(), { wrapper }) };
}

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('useConnection', () => {
  it('is online when the device has a connection', () => {
    const { result } = setup();

    expect(result.current).toBe('online');
  });

  it('is offline when the connection is lost', () => {
    const { result } = setup();

    act(() => {
      onlineManager.setOnline(false);
    });

    expect(result.current).toBe('offline');
  });

  it('is online again at once when nothing needs to be fetched', async () => {
    const { result } = setup();

    act(() => {
      onlineManager.setOnline(false);
    });
    act(() => {
      onlineManager.setOnline(true);
    });

    await waitFor(() => {
      expect(result.current).toBe('online');
    });
  });

  it('is catching up until the running request has finished', async () => {
    const { client, result } = setup();
    let finish: (value: string) => void = () => undefined;
    const pending = new Promise<string>((resolve) => {
      finish = resolve;
    });

    act(() => {
      onlineManager.setOnline(false);
    });
    act(() => {
      void client.query({ queryKey: ['slow'], queryFn: () => pending });
      onlineManager.setOnline(true);
    });

    await waitFor(() => {
      expect(result.current).toBe('catching-up');
    });

    await act(async () => {
      finish('done');
      await pending;
    });

    await waitFor(() => {
      expect(result.current).toBe('online');
    });
  });
});
