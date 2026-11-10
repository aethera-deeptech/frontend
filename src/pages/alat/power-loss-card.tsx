import { useState } from 'react';

import { ApiError } from '@/api/client';
import { powerLossChoices, useSetPowerLoss, type PowerLossChoice } from '@/api/relay';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup } from '@/components/ui/radio-group';
import { Tag } from '@/components/ui/tag';

const options: { value: PowerLossChoice; label: string; description?: string }[] = [
  { value: 'off', label: 'Mati sampai Anda nyalakan' },
  {
    value: 'last',
    label: 'Seperti sebelum listrik padam',
    description:
      'Menyala lagi jika tadi menyala. Mesin akan menyala sendiri saat listrik kembali, jadi pilih ini hanya jika aman untuk mesin itu.',
  },
];

function isChoice(value: string): value is PowerLossChoice {
  return powerLossChoices.some((choice) => choice === value);
}

// What the owner chose for the moment that the plug loses its own power. The service only stores the choice and the plug does not
// get it yet, so the card says so above the options. The call sets one value, so sending it again is safe.
export function PowerLossCard({
  deviceId,
  choice,
}: {
  deviceId: string;
  // The value that the service holds
  choice: PowerLossChoice;
}) {
  const save = useSetPowerLoss(deviceId);
  // What the owner picked and did not save. A read never touches it, so a choice is not lost while the screen reads again.
  const [draft, setDraft] = useState<PowerLossChoice | null>(null);

  // The service holds the value of the draft, so there is nothing left to keep apart
  if (draft !== null && draft === choice) {
    setDraft(null);
  }
  const shown = draft ?? choice;
  const dirty = draft !== null && draft !== choice;
  const status = save.error instanceof ApiError ? save.error.status : undefined;
  // A lost answer, a busy service and a 5xx leave it open whether the value was stored. A later read can tell.
  const uncertain =
    save.isError && (!(save.error instanceof ApiError) || save.error.busy || (status ?? 0) >= 500);
  const stored = save.isError && save.variables === choice && !dirty;
  const failed = save.isError && !uncertain && status !== 404 && status !== 409;

  return (
    <Card title="Setelah listrik padam">
      <div className="flex flex-wrap items-center gap-2">
        <Tag>Belum aktif</Tag>
      </div>
      <p className="text-body text-text-1">
        Pilihan ini baru disimpan, belum dijalankan oleh colokan. Setelah sistem WATTLINK
        mendukungnya, pilihan ini berlaku dengan sendirinya.
      </p>
      <RadioGroup
        label="Saat listrik kembali, colokan:"
        value={shown}
        options={options}
        disabled={save.isPending}
        onValueChange={(value) => {
          if (!isChoice(value)) {
            return;
          }
          // A new pick ends the news of the last try, so a notice never stands next to a choice that is not saved
          save.reset();
          setDraft(value === choice ? null : value);
        }}
      />
      {save.isSuccess || stored ? (
        <Banner
          tone="info"
          title="Pilihan disimpan"
          message="Colokan belum menjalankannya. Itu mulai berlaku setelah sistem WATTLINK mendukungnya."
        />
      ) : uncertain ? (
        <Banner
          tone="warning"
          title="Belum pasti tersimpan"
          message="Pilihan Anda mungkin sudah tersimpan. Periksa pilihan di atas, lalu simpan lagi jika perlu. Menyimpan dua kali tidak merusak apa pun."
        />
      ) : failed ? (
        <Banner tone="danger" title="Pilihan belum disimpan" message="Coba lagi." />
      ) : null}
      <Button
        size="lg"
        className="self-start"
        aria-disabled={!dirty || save.isPending || undefined}
        onClick={() => {
          if (dirty && !save.isPending) {
            save.mutate(shown);
          }
        }}
      >
        {save.isPending ? 'Sedang menyimpan' : 'Simpan pilihan'}
      </Button>
    </Card>
  );
}
