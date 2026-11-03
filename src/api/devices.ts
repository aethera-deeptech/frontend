import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/api/client';
import { berandaKey } from '@/api/beranda';
import { livePoll } from '@/api/live';

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

// What kind of anomaly the API found. An older API sends no kind, and a kind that this version does not know reads as a surge,
// which is the original anomaly, so the screen never fails over a new word.
export const anomalyKinds = ['surge', 'overload', 'degradation'] as const;
export type AnomalyKind = (typeof anomalyKinds)[number];

export const signalQualities = ['baik', 'cukup', 'lemah', 'tidak-ada'] as const;

export const deviceDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  status,
  room: z.string(),
  // The type of the device as text, for example "WATTLINK Plug"
  kindLabel: z.string(),
  // plug or clamp, since backend 0.5.0. An older API sends none, and a kind that this version does not know is left out, so the
  // screen never fails over it. The text above is for the eyes and is never parsed.
  kind: z.enum(['plug', 'clamp']).optional().catch(undefined),
  currentPowerW: watts.nullable(),
  todayKwh: kwh.nullable(),
  monthKwh: kwh.nullable(),
  onHoursToday: z.number().nonnegative().nullable(),
  standbyW: watts.nullable(),
  lastSeenAt: moment,
  signal: z.enum(signalQualities),
  anomaly: z
    .object({
      at: moment,
      peakW: watts,
      kind: z.enum(anomalyKinds).catch('surge'),
      // Only for a degradation that the API found in the readings, the mean power factor of the poor samples
      powerFactor: z.number().min(0).max(1).optional().catch(undefined),
    })
    .optional(),
  // The power over the last day, spread evenly. It is null while there is no recent data.
  // The total that the owner can start again, since backend 0.7.0. The card Total energi is left out for an API that does not send it.
  energySince: z.object({ resetAt: moment.nullable(), kwh }).optional().catch(undefined),
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
    refetchInterval: livePoll,
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: [...devicesKey, id],
    queryFn: ({ signal }) =>
      apiRequest(`/v1/devices/${encodeURIComponent(id)}`, deviceDetailSchema, { signal }),
    refetchInterval: livePoll,
  });
}

const energyResetSchema = z.object({ resetAt: moment });

// Starts the energy total of one device again. The service sets the time of the reset to now and counts from the next whole hour.
export function useResetEnergy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/v1/devices/${encodeURIComponent(id)}/energy-reset`, energyResetSchema, {
        method: 'POST',
      }),
    // The total sits in the detail of the device, and the list keeps its own copy of the device
    onSuccess: () => queryClient.invalidateQueries({ queryKey: devicesKey }),
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
