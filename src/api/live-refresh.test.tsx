import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { berandaKey, useBeranda } from '@/api/beranda';
import { devicesKey, useDevice, useDevices } from '@/api/devices';
import { livePoll, livePollMs } from '@/api/live';
import { createQueryClient } from '@/api/query-client';
import { sessionKey, useSession } from '@/api/auth';

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
  it('asks for the home screen again on its own', () => {
    expect(intervalOf(berandaKey, useBeranda)).toBe(livePoll);
  });

  it('asks for the list of devices again on its own', () => {
    expect(intervalOf(devicesKey, useDevices)).toBe(livePoll);
  });

  it('asks for one device again on its own', () => {
    expect(intervalOf([...devicesKey, 'abc'], () => useDevice('abc'))).toBe(livePoll);
  });

  it('asks who is signed in on the same beat, so another account in another tab is noticed', () => {
    expect(intervalOf(sessionKey, useSession)).toBe(livePoll);
  });

  it('asks every 30 seconds when the query holds data', () => {
    expect(livePollMs).toBe(30_000);
    expect(livePoll({ state: { data: { phase: 'ready' } } })).toBe(livePollMs);
  });

  it('does not ask again for a query that has no data, so a failure stays on the screen', () => {
    expect(livePoll({ state: { data: undefined } })).toBe(false);
  });
});
