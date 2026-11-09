import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { authMutationKey, meSchema, sessionKey } from '@/api/auth';
import { ApiError, busyWaitMs, ContractError } from '@/api/client';
import { settingsKey } from '@/api/settings';
import { setBusinessZone } from '@/lib/format';

// A request that failed with a 4xx status will fail again, and so will an answer in the wrong shape, so only the other
// failures are tried once more.
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ContractError) {
    return false;
  }
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 1;
}

// The wait before a read is tried again. A busy answer says how long, any other failure waits as long as TanStack Query does.
export function retryDelay(failureCount: number, error: Error): number {
  return error instanceof ApiError && error.busy
    ? busyWaitMs(error)
    : Math.min(1000 * 2 ** failureCount, 30_000);
}

// A busy write may have been saved, so the screens read again before the user can send it a second time. The wait is capped,
// because the service is slow already and a screen that stays disabled for a minute is worse than a second look.
const rereadWaitMs = 8000;

async function rereadAfterBusyWrite(client: QueryClient): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    // Every query is marked old, and only the ones on screen are read again
    await Promise.race([
      client.invalidateQueries(),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, rereadWaitMs);
      }),
    ]);
  } catch {
    // A failed read leaves the screens as they are, and the answer of the write is still shown
  } finally {
    clearTimeout(timer);
  }
}

function isUnauthorized(error: Error): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function createQueryClient(): QueryClient {
  // A 401 on any call except the account calls means that the session ended while the screen was open, for example after
  // 30 days or after a password reset on another device. The session is read again, and the guard sends the user to Masuk.
  const sessionEnded = () => {
    // A read that started before the 401 may answer for a session that has ended since, so the read starts again
    void client.invalidateQueries({ queryKey: sessionKey });
  };
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isUnauthorized(error) && query.queryKey[0] !== sessionKey[0]) {
          sessionEnded();
        }
      },
    }),
    mutationCache: new MutationCache({
      // TanStack Query waits for this before the mutation shows its error, so the button stays disabled while the data is read
      onError: async (error, _variables, _context, mutation) => {
        const isAuthCall = mutation.options.mutationKey?.[0] === authMutationKey[0];

        if (isUnauthorized(error) && !isAuthCall) {
          sessionEnded();
        }
        // A sign in is not a write of data, a download is a read, and the relay calls read again by themselves
        if (error instanceof ApiError && error.busy && !isAuthCall && !mutation.meta?.skipReread) {
          await rereadAfterBusyWrite(client);
        }
      },
    }),
    defaultOptions: {
      queries: { retry: shouldRetry, retryDelay, staleTime: 30_000 },
    },
  });

  // Another tab of the same browser can sign in as another account, and the cookie is shared. When the session says that
  // another user is signed in, what this tab cached belongs to the first one, so it goes.
  let signedInEmail: string | undefined;

  client.getQueryCache().subscribe((event) => {
    // The clock of every moment on the screens is the clock of the business zone, so the zone follows the settings as they load,
    // change and go away with the account
    const queryName = (event.query.queryKey as readonly unknown[])[0];

    if (queryName === settingsKey[0]) {
      const zone = (event.query.state.data as { timeZone?: unknown } | undefined)?.timeZone;

      setBusinessZone(event.type === 'removed' || typeof zone !== 'string' ? undefined : zone);
      return;
    }
    if (event.type !== 'updated' || event.action.type !== 'success') {
      return;
    }
    if (event.query !== client.getQueryCache().find({ queryKey: sessionKey, exact: true })) {
      return;
    }
    const me = meSchema.safeParse(event.query.state.data);

    if (!me.success) {
      return;
    }
    if (signedInEmail !== undefined && signedInEmail !== me.data.email) {
      // A reset also reads the queries that a screen still uses, which would otherwise keep the data of the first user
      void client.resetQueries({ predicate: (query) => query.queryKey[0] !== sessionKey[0] });
    }
    signedInEmail = me.data.email;
  });

  return client;
}
