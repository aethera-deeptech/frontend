import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/api/client';

// The shape of GET /v1/beranda is an assumption of the frontend until the backend publishes its contract.
// It is written down in docs/api-assumptions.md. Only this file knows it, so a change stays here.

const count = z.number().int().nonnegative();
const rupiah = z.number().int().nonnegative();
const kwh = z.number().nonnegative();
const moment = z.iso.datetime({ offset: true });

const statusCounts = z.object({
  anomali: count,
  offline: count,
  siaga: count,
  nyala: count,
  mati: count,
});

const recommendation = z.object({
  id: z.string(),
  title: z.string(),
  deviceName: z.string(),
  savingPerMonthRp: rupiah,
});

const topDevice = z.object({ name: z.string(), kwh });

const bill = z.object({
  // The bill so far, one running total for each day from the first day of the month until the day of the data
  dailyTotalRp: z.array(rupiah).min(1),
  projectedTotalRp: rupiah,
  potentialTotalRp: rupiah,
});

const energyPerPiece = z.discriminatedUnion('status', [
  z.object({ status: z.literal('verified'), beforeKwh: kwh, afterKwh: kwh }),
  z.object({ status: z.literal('estimate'), beforeKwh: kwh, afterKwh: kwh }),
  z.object({ status: z.literal('collecting'), collectedDays: count, neededDays: count }),
]);

const base = { businessName: z.string(), asOf: moment };

export const berandaSchema = z.discriminatedUnion('phase', [
  // No device is installed yet
  z.object({ phase: z.literal('no-devices'), ...base }),
  // Devices are installed and the system is still collecting the first days of data
  z.object({
    phase: z.literal('collecting'),
    ...base,
    collectedDays: count,
    neededDays: count,
    topDevices: z.array(topDevice),
  }),
  z.object({
    phase: z.literal('ready'),
    ...base,
    savingPerMonthRp: rupiah,
    statusCounts,
    recommendations: z.array(recommendation),
    bill,
    topDevices: z.array(topDevice),
    energyPerPiece,
  }),
]);

export type BerandaData = z.infer<typeof berandaSchema>;
export type ReadyBeranda = Extract<BerandaData, { phase: 'ready' }>;
export type CollectingBeranda = Extract<BerandaData, { phase: 'collecting' }>;
export type RecommendationSummary = z.infer<typeof recommendation>;
export type EnergyPerPiece = z.infer<typeof energyPerPiece>;

export const berandaKey = ['beranda'] as const;

export function useBeranda() {
  return useQuery({
    queryKey: berandaKey,
    queryFn: ({ signal }) => apiRequest('/v1/beranda', berandaSchema, { signal }),
  });
}
