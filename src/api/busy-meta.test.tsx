import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { useDeleteSchedule, useSaveSchedule, useSendRelay } from '@/api/relay';
import { useEndSession } from '@/api/sessions';
import { useResetEnergy } from '@/api/devices';
import { useReportDownload } from '@/pages/laporan/use-report-download';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({ apiBaseUrl: 'https://api.example.com', googleClientId: '', sentryDsn: '' }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

// The handler of a busy write in the query client reads the screens again, which these calls already do or do not need
function metaOf(run: (client: ReturnType<typeof createQueryClient>) => void) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
  const client = createQueryClient();

  run(client);
  return { client };
}

function wrapperFor(client: ReturnType<typeof createQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('the calls that skip the extra read after a busy answer', () => {
  it('are the relay command, the schedule save, the schedule delete, the report download and the end of a session', async () => {
    const { client } = metaOf(() => undefined);
    const wrapper = wrapperFor(client);
    const send = renderHook(() => useSendRelay('d1'), { wrapper });
    const save = renderHook(() => useSaveSchedule('d1'), { wrapper });
    const remove = renderHook(() => useDeleteSchedule('d1'), { wrapper });
    const download = renderHook(() => useReportDownload(), { wrapper });
    const endSession = renderHook(() => useEndSession(), { wrapper });

    send.result.current.mutate('off');
    save.result.current.mutate({ offAt: '17:30', onAt: null, days: 'mon-fri', enabled: true });
    remove.result.current.mutate();
    download.result.current.start('2026-10');
    endSession.result.current.mutate('s1');

    await waitFor(() => {
      expect(client.getMutationCache().getAll()).toHaveLength(5);
    });
    expect(
      client
        .getMutationCache()
        .getAll()
        .map((mutation) => mutation.meta),
    ).toEqual([
      { skipReread: true },
      { skipReread: true },
      { skipReread: true },
      { skipReread: true },
      { skipReread: true },
    ]);
  });

  it('do not include a write that has to be read again, such as the energy reset', async () => {
    const { client } = metaOf(() => undefined);
    const reset = renderHook(() => useResetEnergy(), { wrapper: wrapperFor(client) });

    reset.result.current.mutate('d1');

    await waitFor(() => {
      expect(client.getMutationCache().getAll()).toHaveLength(1);
    });
    expect(client.getMutationCache().getAll()[0]?.meta).toBeUndefined();
  });
});
