import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { berandaKey, useBeranda } from '@/api/beranda';
import { devicesKey, useDevice, useDevices } from '@/api/devices';
import { createQueryClient, livePollMs } from '@/api/query-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

// The query of a screen that shows readings asks again on its own, and the interval is the one constant
function intervalOf(key: readonly unknown[], hook: () => unknown) {
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => undefined)));
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  renderHook(hook, { wrapper });

  return client.getQueryCache().find({ queryKey: key, exact: true })?.observers[0]?.options
    .refetchInterval;
}

describe('live refresh of the readings', () => {
  it('asks for the home screen again every 30 seconds', () => {
    expect(livePollMs).toBe(30_000);
    expect(intervalOf(berandaKey, useBeranda)).toBe(livePollMs);
  });

  it('asks for the list of devices again every 30 seconds', () => {
    expect(intervalOf(devicesKey, useDevices)).toBe(livePollMs);
  });

  it('asks for one device again every 30 seconds', () => {
    expect(intervalOf([...devicesKey, 'abc'], () => useDevice('abc'))).toBe(livePollMs);
  });
});
