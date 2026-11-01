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

// The user may type the dots of the thousands, as the field shows them, but only in groups of three digits. A dot or a
// comma that stands for decimals (1444.7 or 1.444,70) is refused, because the tariff is in whole rupiah and a decimal dot
// read as a thousands dot would make the tariff 10 times too high.
const wholeRupiah = /^(\d+|\d{1,3}(\.\d{3})+)$/;

function toNumber(text: string): number {
  return Number(text.replace(/\./g, ''));
}

const schema = z.object({
  tariff: z
    .string()
    .trim()
    .refine(
      (text) => wholeRupiah.test(text) && toNumber(text) > 0,
      'Isi tarif dengan angka bulat lebih dari 0, misalnya 1444 atau 1.444.',
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
          const typed = toNumber(values.tariff);
          // The field starts with the default tariff. Saving it unchanged must not turn it into a tariff of the user.
          if (tariff.isDefault && typed === tariff.rpPerKwh) {
            void navigate(settingsPath);
            return;
          }
          save(typed);
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
