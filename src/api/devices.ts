import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/api/client';
import { berandaKey } from '@/api/beranda';

// The paths and shapes in this file are an assumption of the frontend, see docs/api-assumptions.md.

const count = z.number().int().nonnegative();
const watts = z.number().nonnegative();
const kwh = z.number().nonnegative();
const moment = z.iso.datetime({ offset: true });

export const deviceStatuses = ['nyala', 'mati', 'siaga', 'offline', 'anomali'] as const;
export type DeviceStatusValue = (typeof deviceStatuses)[number];

const status = z.enum(deviceStatuses);

const listItem = z.object({
  id: z.string(),
  name: z.string(),
  status,
  // Null while the device does not answer
  currentPowerW: watts.nullable(),
  todayKwh: kwh.nullable(),
  // For a device with an anomaly, the moment of the anomaly. For an offline device, the last moment it was seen.
  anomalyAt: moment.optional(),
  lastSeenAt: moment.optional(),
});

export const deviceListSchema = z.object({ items: z.array(listItem) });

export const signalQualities = ['baik', 'cukup', 'lemah', 'tidak-ada'] as const;

export const deviceDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  status,
  room: z.string(),
  // The type of the device as text, for example "Colokan pintar"
  kindLabel: z.string(),
  currentPowerW: watts.nullable(),
  todayKwh: kwh.nullable(),
  monthKwh: kwh.nullable(),
  onHoursToday: z.number().nonnegative().nullable(),
  standbyW: watts.nullable(),
  lastSeenAt: moment,
  signal: z.enum(signalQualities),
  anomaly: z.object({ at: moment, peakW: watts }).optional(),
  // The power over the last day, spread evenly. It is null while there is no recent data.
  powerPattern: z
    .object({
      points: z.array(watts).min(2),
      yMaxW: watts,
      expected: z.object({ low: z.array(watts), high: z.array(watts) }).optional(),
      anomaly: z.object({ from: count, to: count }).optional(),
    })
    .nullable(),
});

export type DeviceListItem = z.infer<typeof listItem>;
export type DeviceList = z.infer<typeof deviceListSchema>;
export type DeviceDetail = z.infer<typeof deviceDetailSchema>;

export const devicesKey = ['devices'] as const;

export function useDevices() {
  return useQuery({
    queryKey: devicesKey,
    queryFn: ({ signal }) => apiRequest('/v1/devices', deviceListSchema, { signal }),
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: [...devicesKey, id],
    queryFn: ({ signal }) =>
      apiRequest(`/v1/devices/${encodeURIComponent(id)}`, deviceDetailSchema, { signal }),
  });
}

export function useRenameDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiRequest(`/v1/devices/${encodeURIComponent(id)}`, z.unknown(), {
        method: 'PATCH',
        body: { name },
      }),
    // The name shows in the device list, in the detail and on the home screen
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: devicesKey }),
        queryClient.invalidateQueries({ queryKey: berandaKey }),
      ]),
  });
}
