import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/api/client';
import { berandaKey } from '@/api/beranda';

// The paths and shapes in this file are an assumption of the frontend, see docs/api-assumptions.md.

const count = z.number().int().nonnegative();
const rupiah = z.number().int().nonnegative();
const kwh = z.number().nonnegative();
const moment = z.iso.datetime({ offset: true });

export const recommendationStatuses = [
  'pending',
  'deferred',
  'applied',
  'verified',
  'rejected',
] as const;
export type RecommendationStatus = (typeof recommendationStatuses)[number];

const status = z.enum(recommendationStatuses);

const listItem = z.object({
  id: z.string(),
  title: z.string(),
  savingPerMonthRp: rupiah,
  status,
  // For a tip that is applied, the days of the verification so far
  progress: z.object({ collectedDays: count, neededDays: count }).optional(),
  // For a verified tip, the drop of the energy for each piece in percent
  resultPercent: z.number().optional(),
});

export const recommendationListSchema = z.discriminatedUnion('phase', [
  // No device is installed yet
  z.object({ phase: z.literal('no-devices'), businessName: z.string() }),
  // The first days of data are still being collected
  z.object({ phase: z.literal('collecting'), businessName: z.string(), neededDays: count }),
  z.object({ phase: z.literal('ready'), businessName: z.string(), items: z.array(listItem) }),
]);

export const recommendationDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  deviceName: z.string(),
  status,
  savingPerMonthRp: rupiah,
  // The saving uses the default tariff because the user did not fill in their own
  tariffIsDefault: z.boolean(),
  // The texts that the system writes for this tip
  whatToDo: z.string(),
  why: z.string(),
  howCalculated: z.array(z.string()),
  appliedAt: moment.optional(),
  rejectedAt: moment.optional(),
  // While the tip is applied, the days of the verification so far
  verification: z.object({ collectedDays: count, neededDays: count }).optional(),
  // After the verification, the energy for each piece before and after
  result: z
    .object({ beforeKwh: kwh, afterKwh: kwh, beforeDays: count, afterDays: count })
    .optional(),
});

export type RecommendationList = z.infer<typeof recommendationListSchema>;
export type RecommendationListItem = z.infer<typeof listItem>;
export type RecommendationDetail = z.infer<typeof recommendationDetailSchema>;

export const recommendationsKey = ['recommendations'] as const;

export function useRecommendations() {
  return useQuery({
    queryKey: recommendationsKey,
    queryFn: ({ signal }) =>
      apiRequest('/v1/recommendations', recommendationListSchema, { signal }),
  });
}

export function useRecommendation(id: string) {
  return useQuery({
    queryKey: [...recommendationsKey, id],
    queryFn: ({ signal }) =>
      apiRequest(`/v1/recommendations/${encodeURIComponent(id)}`, recommendationDetailSchema, {
        signal,
      }),
  });
}

// apply and defer are the two choices of a tip that waits. reject says no, and cancel takes back the record of an applied tip.
export type RecommendationDecision = 'apply' | 'defer' | 'reject' | 'cancel';

export function useRecommendationDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: RecommendationDecision }) =>
      apiRequest(`/v1/recommendations/${encodeURIComponent(id)}/${decision}`, z.unknown(), {
        method: 'POST',
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: berandaKey }),
        queryClient.invalidateQueries({ queryKey: recommendationsKey }),
      ]),
  });
}
