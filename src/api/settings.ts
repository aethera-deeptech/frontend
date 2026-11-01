import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/api/client';
import { berandaKey } from '@/api/beranda';
import { devicesKey } from '@/api/devices';
import { recommendationsKey } from '@/api/recommendations';
import { reportKey } from '@/api/reports';

// The paths and shapes in this file are an assumption of the frontend, see docs/api-assumptions.md.

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const workDays = ['mon-fri', 'mon-sat', 'daily'] as const;
export const sensitivities = ['rendah', 'sedang', 'tinggi'] as const;

export type WorkDays = (typeof workDays)[number];
export type Sensitivity = (typeof sensitivities)[number];

const workHours = z.object({ days: z.enum(workDays), start: time, end: time });

export const settingsSchema = z.object({
  businessName: z.string(),
  workHours,
  tariff: z.object({
    rpPerKwh: z.number().int().positive(),
    // True while the user has not filled in a tariff and the default is used
    isDefault: z.boolean(),
    defaultRpPerKwh: z.number().int().positive(),
  }),
  anomalySensitivity: z.enum(sensitivities),
});

export type Settings = z.infer<typeof settingsSchema>;
export type WorkHours = z.infer<typeof workHours>;

// Only the fields that change are sent. A null tariff goes back to the default.
export interface SettingsChange {
  businessName?: string;
  workHours?: WorkHours;
  tariffRpPerKwh?: number | null;
  anomalySensitivity?: Sensitivity;
}

export const settingsKey = ['settings'] as const;

export function useSettings() {
  return useQuery({
    queryKey: settingsKey,
    queryFn: ({ signal }) => apiRequest('/v1/settings', settingsSchema, { signal }),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (change: SettingsChange) =>
      apiRequest('/v1/settings', z.unknown(), { method: 'PATCH', body: change }),
    // The name shows on the home screen. The tariff turns kWh into rupiah in the tips and the report, and the work hours
    // and the sensitivity decide which devices and which use count as odd.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsKey }),
        queryClient.invalidateQueries({ queryKey: berandaKey }),
        queryClient.invalidateQueries({ queryKey: recommendationsKey }),
        queryClient.invalidateQueries({ queryKey: devicesKey }),
        queryClient.invalidateQueries({ queryKey: reportKey }),
      ]),
  });
}
