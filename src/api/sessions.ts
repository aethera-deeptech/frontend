import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/api/client';

// The paths and shapes in this file follow the contract of the backend, see docs/api-assumptions.md.

const moment = z.iso.datetime({ offset: true });

const sessionSchema = z.object({
  id: z.string(),
  // A short text from the browser at sign in, for example "Chrome on Windows", in English as the service builds it
  label: z.string(),
  createdAt: moment,
  lastUsedAt: moment,
  current: z.boolean(),
});

// The session of the request comes first, then the others by their last use. At most 20, so there is no paging.
const sessionsSchema = z.object({ items: z.array(sessionSchema) });

export type DeviceSession = z.infer<typeof sessionSchema>;

// The list is not rooted at the key of the session of the account (`['session']`), because the query client reads that one
// when a call answers 401.
export const sessionsKey = ['sessions'] as const;

export function useSessions() {
  return useQuery({
    queryKey: sessionsKey,
    queryFn: ({ signal }) => apiRequest('/v1/auth/sessions', sessionsSchema, { signal }),
    // The list tells who can open the account, so it is read again every time the screen opens
    staleTime: 0,
  });
}

// Ends one session. It has a key of its own and not the key of the account calls, because the query client leaves the account
// calls out of its 401 handling. The id of another user, an unknown id and an id that is not a uuid answer 404.
export function useEndSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['end-session'],
    mutationFn: (id: string) =>
      apiRequest(`/v1/auth/sessions/${encodeURIComponent(id)}`, z.null(), { method: 'DELETE' }),
    // This hook reads again by itself, so the busy re-read of the query client is left out
    meta: { skipReread: true },
    // Whatever the call ended with, the service knows which sessions are left. A busy answer may hide a call that went through.
    onSettled: () => queryClient.invalidateQueries({ queryKey: sessionsKey }),
  });
}
