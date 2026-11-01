import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';

import { useUpdateSettings, type Settings } from '@/api/settings';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { formatNumber, formatRupiah } from '@/lib/format';
import { EditForm, settingsPath } from '@/pages/pengaturan/edit-form';
import { SettingsGate } from '@/pages/pengaturan/settings-gate';

// The user may type the dots of the thousands, as the field shows them
function toNumber(text: string): number {
  return Number(text.replace(/\./g, ''));
}

const schema = z.object({
  tariff: z
    .string()
    .trim()
    .refine(
      (text) => /^[\d.]+$/.test(text) && toNumber(text) > 0,
      'Isi tarif dengan angka lebih dari 0.',
    )
    .refine((text) => toNumber(text) <= 100_000, 'Tarif paling tinggi Rp100.000 per kWh.'),
});

type Values = z.infer<typeof schema>;

export function EditTariffPage() {
  return <SettingsGate>{(settings) => <TariffForm settings={settings} />}</SettingsGate>;
}

function TariffForm({ settings }: { settings: Settings }) {
  const navigate = useNavigate();
  const update = useUpdateSettings();
  const { tariff } = settings;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { tariff: formatNumber(tariff.rpPerKwh, 0) },
  });

  const save = (tariffRpPerKwh: number | null) => {
    update.mutate(
      { tariffRpPerKwh },
      {
        onSuccess: () => {
          void navigate(settingsPath, { state: { saved: 'tariff' } });
        },
      },
    );
  };

  return (
    <EditForm
      title="Tarif listrik"
      subtitle="Dipakai untuk mengubah kWh menjadi rupiah."
      saving={update.isPending}
      failed={update.isError}
      onSubmit={(event) => {
        void handleSubmit((values) => {
          save(toNumber(values.tariff));
        })(event);
      }}
      extraAction={
        tariff.isDefault ? null : (
          <Button
            size="lg"
            disabled={update.isPending}
            onClick={() => {
              save(null);
            }}
          >
            Pakai tarif bawaan
          </Button>
        )
      }
    >
      <TextInput
        label="Tarif per kWh (Rp)"
        helper={`Lihat tarif di tagihan listrik Anda. Sebelum diisi, sistem memakai tarif bawaan ${formatRupiah(tariff.defaultRpPerKwh)} per kWh.`}
        error={errors.tariff?.message}
        inputMode="numeric"
        autoComplete="off"
        {...register('tariff')}
      />
    </EditForm>
  );
}
