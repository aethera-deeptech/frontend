import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/api/client';
import { berandaKey } from '@/api/beranda';
import { devicesKey } from '@/api/devices';

// The paths and shapes in this file are an assumption of the frontend, see docs/api-assumptions.md.

export const deviceKinds = ['plug', 'clamp'] as const;
export type DeviceKind = (typeof deviceKinds)[number];

const roomSchema = z.object({ id: z.string(), name: z.string() });
const roomsSchema = z.object({ items: z.array(roomSchema) });

export const roomNameLength = { max: 40 } as const;

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

// Adds a room. A business with no room cannot add a device, so the form of the device offers this call.
export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (room: { name: string }) =>
      apiRequest('/v1/rooms', roomSchema, { method: 'POST', body: room }),
    // The form of the device reads the list when the user comes back, so the list holds the new room by then. The API orders
    // the rooms by name, and the list does the same.
    onSuccess: (room) => {
      queryClient.setQueryData(roomsKey, (old: z.infer<typeof roomsSchema> | undefined) => ({
        items: [...(old?.items.filter((item) => item.id !== room.id) ?? []), room].sort((a, b) =>
          a.name.localeCompare(b.name, 'id'),
        ),
      }));
    },
    gcTime: 0,
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
