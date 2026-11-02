import { QueryObserver } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { ApiError, ContractError, NetworkError } from '@/api/client';
import { createQueryClient, shouldRetry } from '@/api/query-client';

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
});
