import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/api/client';
import { berandaKey } from '@/api/beranda';
import { reportKey } from '@/api/reports';

// The paths and shapes in this file are an assumption of the frontend, see docs/api-assumptions.md.

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const entry = z.object({ date: day, quantity: z.number().int().positive() });

export const productionSchema = z.object({
  // The unit of the pieces that the business counts, and the units that it can choose from
  unit: z.string(),
  units: z.array(z.string()).min(1),
  // The day of the business now. It is the last day that can be filled.
  today: day,
  // The newest records first
  recent: z.array(entry),
});

export type Production = z.infer<typeof productionSchema>;
export type ProductionEntry = z.infer<typeof entry>;

export const productionKey = ['production'] as const;

export function useProduction() {
  return useQuery({
    queryKey: productionKey,
    queryFn: ({ signal }) => apiRequest('/v1/production', productionSchema, { signal }),
  });
}

export function useSaveProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    // One record for each day. Saving a day that has a record replaces it.
    mutationFn: ({ date, quantity, unit }: { date: string; quantity: number; unit: string }) =>
      apiRequest(`/v1/production/${encodeURIComponent(date)}`, z.unknown(), {
        method: 'PUT',
        body: { quantity, unit },
      }),
    // The energy for each piece on the home screen and in the report depends on the pieces
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: productionKey }),
        queryClient.invalidateQueries({ queryKey: berandaKey }),
        queryClient.invalidateQueries({ queryKey: reportKey }),
      ]),
  });
}
