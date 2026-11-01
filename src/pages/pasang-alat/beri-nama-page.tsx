import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router';
import { z } from 'zod';

import { useRooms, useStartPairing } from '@/api/pairing';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { TextInput } from '@/components/ui/text-input';
import { addPath, StepFrame } from '@/pages/pasang-alat/step-frame';
import { useWizard } from '@/pages/pasang-alat/wizard';

const schema = z.object({
  name: z.string().trim().min(1, 'Isi nama alat.').max(40, 'Nama alat paling panjang 40 huruf.'),
  roomId: z.string().min(1, 'Pilih ruangan.'),
});

type Values = z.infer<typeof schema>;

export function BeriNamaPage() {
  const wizard = useWizard();
  const rooms = useRooms();

  if (!wizard.kind || !wizard.consented) {
    return <Navigate to={addPath} replace />;
  }

  return (
    <StepFrame
      title="Beri nama alat"
      subtitle="Pasang alat dan pastikan menyala dulu. Nama ini tampil di daftar alat."
      backTo={`${addPath}/persetujuan`}
    >
      {rooms.data ? (
        <NameForm rooms={rooms.data.items} />
      ) : rooms.isPending ? (
        <SkeletonCard label="Memuat daftar ruangan" />
      ) : (
        <Banner
          tone="danger"
          title="Daftar ruangan tidak bisa dimuat"
          message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
          action={
            <Button
              size="lg"
              onClick={() => {
                void rooms.refetch();
              }}
            >
              Coba lagi
            </Button>
          }
        />
      )}
    </StepFrame>
  );
}

function NameForm({ rooms }: { rooms: { id: string; name: string }[] }) {
  const navigate = useNavigate();
  const wizard = useWizard();
  const start = useStartPairing();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: wizard.name, roomId: wizard.roomId },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        void handleSubmit((values) => {
          const { kind } = wizard;
          if (!kind) {
            return;
          }
          wizard.setName(values.name);
          wizard.setRoomId(values.roomId);
          start.mutate(
            { kind, ...values },
            {
              onSuccess: ({ id }) => {
                void navigate(`${addPath}/mencari/${encodeURIComponent(id)}`);
              },
            },
          );
        })(event);
      }}
    >
      <TextInput
        label="Nama alat"
        helper="Pakai nama yang mudah Anda kenali, misalnya nama mesin."
        error={errors.name?.message}
        autoComplete="off"
        {...register('name')}
      />
      <Controller
        control={control}
        name="roomId"
        render={({ field }) => (
          <Select
            label="Ruangan"
            value={field.value}
            onValueChange={field.onChange}
            options={rooms.map((room) => ({ value: room.id, label: room.name }))}
            error={errors.roomId?.message}
          />
        )}
      />
      {start.isError ? (
        <Banner
          tone="danger"
          title="Pencarian belum bisa dimulai"
          message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
        />
      ) : null}
      <Button type="submit" kind="accent" size="lg" disabled={start.isPending}>
        Cari alat
      </Button>
      <Button asChild size="lg">
        <Link to="/alat">Batal</Link>
      </Button>
    </form>
  );
}
