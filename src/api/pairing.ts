import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/api/client';
import { berandaKey } from '@/api/beranda';
import { devicesKey } from '@/api/devices';

// The paths and shapes in this file are an assumption of the frontend, see docs/api-assumptions.md.

export const deviceKinds = ['plug', 'clamp'] as const;
export type DeviceKind = (typeof deviceKinds)[number];

const roomsSchema = z.object({ items: z.array(z.object({ id: z.string(), name: z.string() })) });

const pairingSchema = z.object({
  // The API keeps looking for the device and says when it gives up
  status: z.enum(['searching', 'connected', 'failed']),
});

const startedSchema = z.object({ id: z.string() });

export interface NewDevice {
  kind: DeviceKind;
  name: string;
  roomId: string;
}

export const roomsKey = ['rooms'] as const;
export const pairingKey = ['pairing'] as const;

export function useRooms() {
  return useQuery({
    queryKey: roomsKey,
    queryFn: ({ signal }) => apiRequest('/v1/rooms', roomsSchema, { signal }),
  });
}

export function useStartPairing() {
  return useMutation({
    mutationFn: (device: NewDevice) =>
      apiRequest('/v1/pairings', startedSchema, { method: 'POST', body: device }),
  });
}

const pollMs = 3000;

// Asks again every few seconds while the API still searches
export function usePairing(id: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...pairingKey, id],
    queryFn: async ({ signal }) => {
      const pairing = await apiRequest(`/v1/pairings/${encodeURIComponent(id)}`, pairingSchema, {
        signal,
      });
      if (pairing.status === 'connected') {
        // The new device shows in the list and in the status counts of the home screen
        void queryClient.invalidateQueries({ queryKey: devicesKey });
        void queryClient.invalidateQueries({ queryKey: berandaKey });
      }
      return pairing;
    },
    refetchInterval: (query) => (query.state.data?.status === 'searching' ? pollMs : false),
  });
}
