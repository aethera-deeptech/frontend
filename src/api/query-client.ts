import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';

// A request that failed with a 4xx status will fail again, so only the other failures are tried once more.
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 1;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000 },
    },
  });
}
