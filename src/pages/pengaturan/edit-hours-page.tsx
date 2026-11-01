import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';

import { useUpdateSettings, workDays, type WorkHours } from '@/api/settings';
import { Select } from '@/components/ui/select';
import { EditForm, settingsPath } from '@/pages/pengaturan/edit-form';
import { SettingsGate } from '@/pages/pengaturan/settings-gate';
import { dayLabels, timeOptions } from '@/pages/pengaturan/settings-text';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const schema = z
  .object({ days: z.enum(workDays), start: time, end: time })
  // HH:MM strings sort like the times they stand for
  .refine((values) => values.end > values.start, {
    path: ['end'],
    message: 'Jam selesai harus setelah jam mulai.',
  });

export function EditHoursPage() {
  return <SettingsGate>{(settings) => <HoursForm hours={settings.workHours} />}</SettingsGate>;
}

function HoursForm({ hours }: { hours: WorkHours }) {
  const navigate = useNavigate();
  const update = useUpdateSettings();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkHours>({ resolver: zodResolver(schema), defaultValues: hours });
  const options = timeOptions([hours.start, hours.end]);

  return (
    <EditForm
      title="Jam kerja"
      subtitle="Sistem memakai jam ini untuk menilai pemakaian di luar jam kerja."
      saving={update.isPending}
      failed={update.isError}
      onSubmit={(event) => {
        void handleSubmit((values) => {
          update.mutate(
            { workHours: values },
            {
              onSuccess: () => {
                void navigate(settingsPath, { state: { saved: 'hours' } });
              },
            },
          );
        })(event);
      }}
    >
      <Controller
        control={control}
        name="days"
        render={({ field }) => (
          <Select
            label="Hari kerja"
            value={field.value}
            onValueChange={field.onChange}
            options={workDays.map((value) => ({ value, label: dayLabels[value] }))}
          />
        )}
      />
      <Controller
        control={control}
        name="start"
        render={({ field }) => (
          <Select
            label="Jam mulai"
            value={field.value}
            onValueChange={field.onChange}
            options={options}
          />
        )}
      />
      <Controller
        control={control}
        name="end"
        render={({ field }) => (
          <Select
            label="Jam selesai"
            value={field.value}
            onValueChange={field.onChange}
            options={options}
            error={errors.end?.message}
          />
        )}
      />
    </EditForm>
  );
}
