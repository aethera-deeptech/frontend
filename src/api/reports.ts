import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { energyPerPiece } from '@/api/beranda';
import { apiDownload, apiRequest } from '@/api/client';

// The paths and shapes in this file are an assumption of the frontend, see docs/api-assumptions.md.

const count = z.number().int().nonnegative();
const rupiah = z.number().int().nonnegative();
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const base = {
  // The months that have a report, the newest first
  periods: z.array(month).min(1),
  period: month,
  // Set while the period is the running month, the moment of the newest data
  through: z.iso.datetime({ offset: true }).optional(),
};

const saving = z.object({
  // The three amounts are separate, a tip is in one of them at a time
  verified: z.object({ rp: rupiah, count, checkedDays: count }),
  applied: z.object({ rp: rupiah, count, day: count, neededDays: count }),
  estimate: z.object({ rp: rupiah, count }),
});

export const reportSchema = z.discriminatedUnion('phase', [
  z.object({ phase: z.literal('no-devices'), ...base }),
  z.object({
    phase: z.literal('collecting'),
    ...base,
    collectedDays: count,
    neededDays: count,
  }),
  z.object({
    phase: z.literal('ready'),
    ...base,
    saving,
    topDevices: z.array(z.object({ name: z.string(), kwh: z.number().nonnegative() })),
    billRp: rupiah,
    // Only the running month has a result for each piece
    energyPerPiece: energyPerPiece.optional(),
  }),
]);

export type ReportData = z.infer<typeof reportSchema>;
export type ReadyReport = Extract<ReportData, { phase: 'ready' }>;
export type ReportSaving = z.infer<typeof saving>;

export const reportKey = ['report'] as const;

// With no period the API answers for the running month. The old answer stays on the screen while the next one loads.
export function useReport(period?: string) {
  return useQuery({
    queryKey: [...reportKey, period ?? 'current'],
    queryFn: ({ signal }) =>
      apiRequest(
        period ? `/v1/reports?period=${encodeURIComponent(period)}` : '/v1/reports',
        reportSchema,
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function downloadReport(period: string, signal?: AbortSignal): Promise<Blob> {
  return apiDownload(`/v1/reports/${encodeURIComponent(period)}/pdf`, { signal });
}
