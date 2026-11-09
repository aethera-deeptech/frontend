import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';

import { businessNameLength } from '@/api/auth';
import { useUpdateSettings } from '@/api/settings';
import { TextInput } from '@/components/ui/text-input';
import { countCharacters } from '@/lib/characters';
import { EditForm, settingsPath } from '@/pages/pengaturan/edit-form';
import { SettingsGate } from '@/pages/pengaturan/settings-gate';

const schema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, 'Nama usaha wajib diisi.')
    // The API counts characters, so an emoji is one and not two
    .refine(
      (value) => countCharacters(value) <= businessNameLength.max,
      `Nama usaha paling panjang ${businessNameLength.max.toString()} huruf.`,
    ),
});

type Values = z.infer<typeof schema>;

export function EditNamePage() {
  return <SettingsGate>{(settings) => <NameForm name={settings.businessName} />}</SettingsGate>;
}

function NameForm({ name }: { name: string }) {
  const navigate = useNavigate();
  const update = useUpdateSettings();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { businessName: name } });

  return (
    <EditForm
      title="Nama usaha"
      subtitle="Nama ini tampil di bagian atas Beranda."
      saving={update.isPending}
      failed={update.isError}
      error={update.error}
      onSubmit={(event) => {
        void handleSubmit((values) => {
          update.mutate(values, {
            onSuccess: () => {
              void navigate(settingsPath, { state: { saved: 'name' } });
            },
          });
        })(event);
      }}
    >
      <TextInput
        label="Nama usaha"
        helper="Tulis nama toko atau usaha Anda."
        error={errors.businessName?.message}
        autoComplete="organization"
        {...register('businessName')}
      />
    </EditForm>
  );
}
