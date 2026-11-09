import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router';
import { z } from 'zod';

import { ApiError } from '@/api/client';
import { useRooms, useStartPairing } from '@/api/pairing';
import { Banner } from '@/components/ui/banner';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { TextInput } from '@/components/ui/text-input';
import { TextLink } from '@/components/ui/text-link';
import { addPath, StepFrame } from '@/pages/pasang-alat/step-frame';
import { useWizard } from '@/pages/pasang-alat/wizard-context';

const schema = z.object({
  name: z.string().trim().min(1, 'Isi nama alat.').max(40, 'Nama alat paling panjang 40 huruf.'),
  roomId: z.string().min(1, 'Pilih ruangan.'),
});

type Values = z.infer<typeof schema>;

export function BeriNamaPage() {
  const wizard = useWizard();
  const rooms = useRooms();

  // A clamp user who went back and took the safety tick away must read the warning again, so the tick counts here too
  if (!wizard.kind || !wizard.consented || (wizard.kind === 'clamp' && !wizard.safetyRead)) {
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
        <ErrorBanner
          error={rooms.error}
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
  const runningSearch =
    start.error instanceof ApiError && start.error.code === 'pairing_running' ? start.error : null;
  const {
    register,
    control,
    getValues,
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
                // Replace the step, so Back from the search does not return to a form that starts a second search
                void navigate(`${addPath}/mencari/${encodeURIComponent(id)}`, { replace: true });
              },
              // Only one search runs at a time. When the API names it, the user is taken to it, as if this call had started it.
              onError: (error) => {
                if (
                  error instanceof ApiError &&
                  error.code === 'pairing_running' &&
                  error.pairingId
                ) {
                  void navigate(`${addPath}/mencari/${encodeURIComponent(error.pairingId)}`, {
                    replace: true,
                  });
                }
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
      {/* The name that the user typed stays in the steps while the room is added */}
      <TextLink
        to={`${addPath}/ruangan`}
        className="self-start"
        onClick={() => {
          wizard.setName(getValues('name'));
          wizard.setRoomId(getValues('roomId'));
        }}
      >
        Tambah ruangan
      </TextLink>
      {start.error instanceof ApiError && start.error.code === 'no_gateway' ? (
        // The hub was removed after the first step, or the list of hubs could not be read there
        <Banner
          tone="warning"
          title="WATTLINK Hub belum terhubung"
          message="Hubungkan WATTLINK Hub dulu, lalu cari alat lagi."
          action={
            <Button asChild size="lg">
              <Link to={`${addPath}/hub`}>Hubungkan WATTLINK Hub</Link>
            </Button>
          }
        />
      ) : runningSearch ? (
        // A search that the API names is opened, so nothing shows. When it cannot name it, for example because the search ended
        // a moment ago, the user is told to wait.
        runningSearch.pairingId ? null : (
          <Banner
            tone="warning"
            title="Pencarian sebelumnya masih berjalan"
            message="Tunggu sampai 3 menit, lalu cari alat lagi."
          />
        )
      ) : start.isError ? (
        <ErrorBanner
          error={start.error}
          kind="write"
          busyTitle="Belum pasti dimulai"
          busyMessage="Sistem sedang sibuk. Pencarian mungkin sudah dimulai. Coba lagi dalam beberapa detik."
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
