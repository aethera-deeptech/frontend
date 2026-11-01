import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { z } from 'zod';

import { useDevice, useRenameDevice } from '@/api/devices';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { TextInput } from '@/components/ui/text-input';

const schema = z.object({
  name: z.string().trim().min(1, 'Isi nama alat.').max(40, 'Nama alat paling panjang 40 huruf.'),
});

type Values = z.infer<typeof schema>;

export function AlatRenamePage() {
  const { id = '' } = useParams();
  const query = useDevice(id);

  if (!query.data) {
    return query.isPending ? (
      <SkeletonCard label="Memuat alat" />
    ) : (
      <Banner
        tone="danger"
        title="Alat tidak bisa dimuat"
        message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
      />
    );
  }

  return <RenameForm id={id} name={query.data.name} />;
}

function RenameForm({ id, name }: { id: string; name: string }) {
  const navigate = useNavigate();
  const rename = useRenameDevice();
  const back = `/alat/${encodeURIComponent(id)}`;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name } });

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        void handleSubmit((values) => {
          rename.mutate(
            { id, name: values.name },
            {
              onSuccess: () => {
                void navigate(back);
              },
            },
          );
        })(event);
      }}
    >
      <div className="lg:hidden">
        <Button asChild size="lg">
          <Link to={back}>Kembali</Link>
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-h2 text-text-heading">Ganti nama</h2>
        <p className="text-body text-text-2">Nama ini tampil di daftar alat dan di Beranda.</p>
      </div>
      <TextInput
        label="Nama alat"
        helper="Pakai nama yang mudah Anda kenali."
        error={errors.name?.message}
        autoComplete="off"
        {...register('name')}
      />
      {rename.isError ? (
        <Banner
          tone="danger"
          title="Nama belum tersimpan"
          message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
        />
      ) : null}
      <Button type="submit" kind="accent" size="lg" disabled={rename.isPending}>
        Simpan
      </Button>
      <Button asChild size="lg">
        <Link to={back}>Batal</Link>
      </Button>
    </form>
  );
}
