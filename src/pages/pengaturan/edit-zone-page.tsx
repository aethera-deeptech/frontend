import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useUpdateSettings } from '@/api/settings';
import { Select } from '@/components/ui/select';
import { EditForm, settingsPath } from '@/pages/pengaturan/edit-form';
import { SettingsGate } from '@/pages/pengaturan/settings-gate';
import { zoneOptions } from '@/pages/pengaturan/settings-text';

export function EditZonePage() {
  return <SettingsGate>{(settings) => <ZoneForm current={settings.timeZone} />}</SettingsGate>;
}

function ZoneForm({ current }: { current: string }) {
  const navigate = useNavigate();
  const update = useUpdateSettings();
  const [value, setValue] = useState(current);

  return (
    <EditForm
      title="Zona waktu"
      subtitle="Jam kerja dan laporan harian mengikuti zona waktu ini."
      saving={update.isPending}
      failed={update.isError}
      error={update.error}
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate(
          { timeZone: value },
          {
            onSuccess: () => {
              void navigate(settingsPath, { state: { saved: 'zone' } });
            },
          },
        );
      }}
    >
      <Select
        label="Zona waktu"
        value={value}
        onValueChange={setValue}
        options={zoneOptions(current)}
        helper="WIB untuk Sumatra dan Jawa, WITA untuk Bali dan Sulawesi, WIT untuk Maluku dan Papua."
      />
    </EditForm>
  );
}
