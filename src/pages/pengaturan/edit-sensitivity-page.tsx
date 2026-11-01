import { useState } from 'react';
import { useNavigate } from 'react-router';

import { sensitivities, useUpdateSettings, type Sensitivity } from '@/api/settings';
import { Select } from '@/components/ui/select';
import { EditForm, settingsPath } from '@/pages/pengaturan/edit-form';
import { SettingsGate } from '@/pages/pengaturan/settings-gate';
import { sensitivityLabels } from '@/pages/pengaturan/settings-text';

export function EditSensitivityPage() {
  return (
    <SettingsGate>
      {(settings) => <SensitivityForm current={settings.anomalySensitivity} />}
    </SettingsGate>
  );
}

function SensitivityForm({ current }: { current: Sensitivity }) {
  const navigate = useNavigate();
  const update = useUpdateSettings();
  const [value, setValue] = useState<Sensitivity>(current);

  return (
    <EditForm
      title="Kepekaan anomali"
      subtitle="Atur seberapa mudah sistem menandai anomali."
      saving={update.isPending}
      failed={update.isError}
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate(
          { anomalySensitivity: value },
          {
            onSuccess: () => {
              void navigate(settingsPath, { state: { saved: 'sensitivity' } });
            },
          },
        );
      }}
    >
      <Select
        label="Kepekaan"
        value={value}
        onValueChange={(next) => {
          setValue(sensitivities.find((item) => item === next) ?? current);
        }}
        options={sensitivities.map((item) => ({ value: item, label: sensitivityLabels[item] }))}
        helper="Rendah menandai lebih sedikit anomali. Sedang cocok untuk kebanyakan bengkel. Tinggi juga menandai lonjakan kecil."
      />
    </EditForm>
  );
}
