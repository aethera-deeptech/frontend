import { QueryObserver } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { ApiError, ContractError, NetworkError } from '@/api/client';
import { createQueryClient, retryDelay, shouldRetry } from '@/api/query-client';
import { settingsKey } from '@/api/settings';
import { getBusinessZone, setBusinessZone } from '@/lib/format';

describe('shouldRetry', () => {
  it('does not try again after a client error', () => {
    expect(shouldRetry(0, new ApiError(404))).toBe(false);
  });

  it('does not try again after an answer in the wrong shape', () => {
    expect(shouldRetry(0, new ContractError())).toBe(false);
  });

  it('stops at the edges of the client error range', () => {
    expect(shouldRetry(0, new ApiError(399))).toBe(true);
    expect(shouldRetry(0, new ApiError(400))).toBe(false);
    expect(shouldRetry(0, new ApiError(401))).toBe(false);
    expect(shouldRetry(0, new ApiError(429))).toBe(false);
    expect(shouldRetry(0, new ApiError(499))).toBe(false);
    expect(shouldRetry(0, new ApiError(500))).toBe(true);
  });

  it('tries once more after a server error or a lost connection', () => {
    expect(shouldRetry(0, new ApiError(503))).toBe(true);
    expect(shouldRetry(0, new NetworkError())).toBe(true);
    expect(shouldRetry(1, new NetworkError())).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('reads the session again when a query learns that it has ended', async () => {
    const client = createQueryClient();
    let reads = 0;
    // The guard keeps an observer on the session, and only an active query is read again
    const observer = new QueryObserver(client, {
      queryKey: ['session'],
      queryFn: () => {
        reads += 1;
        return Promise.resolve('me');
      },
    });
    const stop = observer.subscribe(() => undefined);
    await vi.waitFor(() => {
      expect(reads).toBe(1);
    });

    await client
      .query({
        queryKey: ['beranda'],
        queryFn: () => Promise.reject(new ApiError(401)),
      })
      .catch(() => undefined);

    await vi.waitFor(() => {
      expect(reads).toBe(2);
    });
    stop();
  });

  it('does not read the session again for the 401 of the session itself or of an account call', async () => {
    const client = createQueryClient();
    let reads = 0;
    const observer = new QueryObserver(client, {
      queryKey: ['session'],
      queryFn: () => {
        reads += 1;
        return Promise.reject(new ApiError(401));
      },
      retry: false,
    });
    const stop = observer.subscribe(() => undefined);
    await vi.waitFor(() => {
      expect(reads).toBe(1);
    });

    await client
      .getMutationCache()
      .build(client, {
        mutationKey: ['auth', 'login'],
        mutationFn: () => Promise.reject(new ApiError(401)),
      })
      .execute(undefined)
      .catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 20));
    stop();

    expect(reads).toBe(1);
  });

  it('drops what an account cached when the session says that another user is signed in', () => {
    const client = createQueryClient();
    const me = (email: string) => ({ email, emailVerified: true, businessName: 'Maju' });

    client.setQueryData(['session'], me('dewi@example.com'));
    client.setQueryData(['beranda'], { businessName: 'Usaha Dewi' });
    // The same user again changes nothing
    client.setQueryData(['session'], me('dewi@example.com'));

    expect(client.getQueryData(['beranda'])).toBeDefined();

    client.setQueryData(['session'], me('budi@example.com'));

    expect(client.getQueryData(['beranda'])).toBeUndefined();
    expect(client.getQueryData(['session'])).toEqual(me('budi@example.com'));
  });

  it('reads the session again when a mutation of the app learns that it has ended', async () => {
    const client = createQueryClient();
    let reads = 0;
    // The guard keeps an observer on the session, and only an active query is read again
    const observer = new QueryObserver(client, {
      queryKey: ['session'],
      queryFn: () => {
        reads += 1;
        return Promise.resolve('me');
      },
    });
    const stop = observer.subscribe(() => undefined);
    await vi.waitFor(() => {
      expect(reads).toBe(1);
    });

    await client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(new ApiError(401)) })
      .execute(undefined)
      .catch(() => undefined);

    await vi.waitFor(() => {
      expect(reads).toBe(2);
    });
    stop();
  });

  it('uses the retry rule for every query', () => {
    expect(createQueryClient().getDefaultOptions().queries?.retry).toBe(shouldRetry);
  });

  it('follows the time zone of the settings, and forgets it when the settings go away', async () => {
    const client = createQueryClient();

    await client.query({
      queryKey: settingsKey,
      queryFn: () => Promise.resolve({ timeZone: 'Asia/Jayapura' }),
    });
    expect(getBusinessZone()).toBe('Asia/Jayapura');

    client.removeQueries({ queryKey: settingsKey });
    expect(getBusinessZone()).toBe('Asia/Jakarta');
    setBusinessZone(undefined);
  });

  it('keeps the default zone when the settings have no usable zone', async () => {
    const client = createQueryClient();

    await client.query({
      queryKey: settingsKey,
      queryFn: () => Promise.resolve({ timeZone: 'Mars/Olympus' }),
    });

    expect(getBusinessZone()).toBe('Asia/Jakarta');
  });
});

describe('retryDelay', () => {
  it('waits as long as a busy answer asks, and as long as TanStack Query does for anything else', () => {
    expect(retryDelay(0, new ApiError(503, { code: 'busy', retryAfterSeconds: 2 }))).toBe(2000);
    expect(retryDelay(0, new ApiError(503, { code: 'busy', retryAfterSeconds: 600 }))).toBe(10_000);
    expect(retryDelay(0, new ApiError(503))).toBe(1000);
    expect(retryDelay(1, new NetworkError())).toBe(2000);
    expect(retryDelay(10, new NetworkError())).toBe(30_000);
  });
});

describe('a write that fails with a busy answer', () => {
  const busy = () => new ApiError(503, { code: 'busy', retryAfterSeconds: 2 });

  // A screen that shows a query, and the count of how often it was read
  function watch(client: ReturnType<typeof createQueryClient>) {
    const reads = { count: 0 };
    const observer = new QueryObserver(client, {
      queryKey: ['production'],
      queryFn: () => {
        reads.count += 1;
        return Promise.resolve('data');
      },
    });
    const stop = observer.subscribe(() => undefined);
    return { reads, stop };
  }

  async function write(
    client: ReturnType<typeof createQueryClient>,
    options: { mutationKey?: string[]; meta?: Record<string, unknown>; error?: Error } = {},
  ) {
    await client
      .getMutationCache()
      .build(client, {
        mutationKey: options.mutationKey,
        meta: options.meta,
        mutationFn: () => Promise.reject(options.error ?? busy()),
      })
      .execute(undefined)
      .catch(() => undefined);
  }

  it('reads the screen again before the write shows its failure', async () => {
    const client = createQueryClient();
    const { reads, stop } = watch(client);
    await vi.waitFor(() => {
      expect(reads.count).toBe(1);
    });

    await write(client);

    // The count is read the moment the failure is shown, so the read came first
    expect(reads.count).toBe(2);
    stop();
  });

  it('marks every query old, so a screen that is not open reads again when it opens', async () => {
    const client = createQueryClient();
    client.setQueryData(['beranda'], 'old');

    await write(client);

    expect(client.getQueryState(['beranda'])?.isInvalidated).toBe(true);
  });

  it('does not read again for a sign in, a call that reads by itself, or any other failure', async () => {
    const client = createQueryClient();
    const { reads, stop } = watch(client);
    await vi.waitFor(() => {
      expect(reads.count).toBe(1);
    });

    await write(client, { mutationKey: ['auth', 'login'] });
    await write(client, { meta: { skipReread: true } });
    await write(client, { error: new ApiError(500) });
    await write(client, { error: new ApiError(503) });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(reads.count).toBe(1);
    stop();
  });

  it('stops waiting for the read after 8 seconds, and still shows the failure', async () => {
    vi.useFakeTimers();
    try {
      const client = createQueryClient();
      const observer = new QueryObserver(client, {
        queryKey: ['slow'],
        // The service is slow, so this read does not end
        queryFn: ({ signal }) =>
          new Promise<string>((_resolve, reject) => {
            signal.addEventListener('abort', () => {
              reject(new Error('aborted'));
            });
          }),
      });
      const stop = observer.subscribe(() => undefined);
      let done = false;
      const pending = write(client).then(() => {
        done = true;
      });

      await vi.advanceTimersByTimeAsync(7900);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(200);
      await pending;

      expect(done).toBe(true);
      stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
