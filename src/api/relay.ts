import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { ApiError, apiRequest } from '@/api/client';
import { devicesKey } from '@/api/devices';
import { livePoll } from '@/api/live';

// The paths and shapes in this file follow the contract of the backend (`/v1/devices/{id}/relay`), see docs/api-assumptions.md.
// The word relay stays in the code. The screens say saklar.

const moment = z.iso.datetime({ offset: true });
const time = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/);

export const relayActions = ['on', 'off'] as const;
export type RelayAction = (typeof relayActions)[number];

const pendingSchema = z.object({
  id: z.string(),
  action: z.enum(relayActions),
  // pending waits for the gateway, sent was fetched by it and has no answer yet
  status: z.enum(['pending', 'sent']).catch('pending'),
  expiresAt: moment,
});

const lastSchema = z.object({
  action: z.enum(relayActions),
  status: z.enum(['applied', 'failed', 'expired']),
  source: z.enum(['owner', 'schedule']).catch('owner'),
  at: moment,
});

export const scheduleDays = ['mon-fri', 'mon-sat', 'daily'] as const;
export type ScheduleDays = (typeof scheduleDays)[number];

export const scheduleSchema = z.object({
  enabled: z.boolean().default(true),
  offAt: time,
  onAt: time.nullable().default(null),
  days: z.enum(scheduleDays),
});

export const relaySchema = z.object({
  state: z.enum([...relayActions, 'unknown']).catch('unknown'),
  reportedAt: moment.nullable(),
  pending: pendingSchema.nullable(),
  // A result in a shape that this version does not know is left out and does not stop the switch
  last: lastSchema.nullable().catch(null),
  schedule: scheduleSchema.nullable().catch(null),
  // False when the gateway of this plug stored no batch in the last 15 minutes. It tells about the hub and not about the
  // plug. An API that does not send it (before 0.5.0) leaves it out.
  gatewayOnline: z.boolean().optional().catch(undefined),
});

export type Relay = z.infer<typeof relaySchema>;
export type RelayPending = z.infer<typeof pendingSchema>;
export type RelaySchedule = z.infer<typeof scheduleSchema>;

export const relayKey = (id: string) => [...devicesKey, id, 'relay'] as const;

// While a command waits, the answer is read every 5 seconds, so the screen follows it from waiting to done. The rest of the
// time it follows the beat of the readings.
export const pendingPollMs = 5_000;

export function relayPoll(query: { state: { data: Relay | undefined } }): number | false {
  return query.state.data?.pending ? pendingPollMs : livePoll(query);
}

export function useRelay(id: string) {
  return useQuery({
    queryKey: relayKey(id),
    queryFn: ({ signal }) =>
      apiRequest(`/v1/devices/${encodeURIComponent(id)}/relay`, relaySchema, { signal }),
    refetchInterval: relayPoll,
  });
}

// A clamp has no switch (409), and a device that is gone has nothing to switch (404). Both leave the card out.
export function hasNoRelay(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 409 || error.status === 404);
}

export function useSendRelay(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (state: RelayAction) =>
      apiRequest(`/v1/devices/${encodeURIComponent(id)}/relay`, pendingSchema, {
        method: 'POST',
        body: { state },
      }),
    onSuccess: async (pending) => {
      // A read that started before the command would bring back the old answer and hide the waiting state
      await queryClient.cancelQueries({ queryKey: relayKey(id) });
      queryClient.setQueryData<Relay>(relayKey(id), (old) => (old ? { ...old, pending } : old));
    },
    // Whatever the call ended with, the service knows the truth. A lost answer may hide a command that was queued, and a 404 or
    // a 409 means that the plug is gone or is a clamp.
    onSettled: () => queryClient.invalidateQueries({ queryKey: relayKey(id) }),
  });
}

export interface ScheduleInput {
  offAt: string;
  onAt: string | null;
  days: ScheduleDays;
  enabled: boolean;
}

// The service replaces the whole schedule with the one that is sent, and answers with it
export function useSaveSchedule(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ScheduleInput) =>
      apiRequest(`/v1/devices/${encodeURIComponent(id)}/schedule`, scheduleSchema, {
        method: 'PUT',
        body: input,
      }),
    onSuccess: async (schedule) => {
      await queryClient.cancelQueries({ queryKey: relayKey(id) });
      queryClient.setQueryData<Relay>(relayKey(id), (old) => (old ? { ...old, schedule } : old));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: relayKey(id) }),
  });
}

// A plug that has no schedule answers 204 as well, so deleting twice is fine
export function useDeleteSchedule(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest(`/v1/devices/${encodeURIComponent(id)}/schedule`, z.null(), { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: relayKey(id) });
      queryClient.setQueryData<Relay>(relayKey(id), (old) =>
        old ? { ...old, schedule: null } : old,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: relayKey(id) }),
  });
}
