import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { authMutationKey, meSchema, sessionKey } from '@/api/auth';
import { ApiError, ContractError } from '@/api/client';

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
      onError: (error, _variables, _context, mutation) => {
        if (isUnauthorized(error) && mutation.options.mutationKey?.[0] !== authMutationKey[0]) {
          sessionEnded();
        }
      },
    }),
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000 },
    },
  });

  // Another tab of the same browser can sign in as another account, and the cookie is shared. When the session says that
  // another user is signed in, what this tab cached belongs to the first one, so it goes.
  let signedInEmail: string | undefined;

  client.getQueryCache().subscribe((event) => {
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
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== sessionKey[0] });
    }
    signedInEmail = me.data.email;
  });

  return client;
}
