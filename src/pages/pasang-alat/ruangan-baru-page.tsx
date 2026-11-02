import { useRef, useState, type SubmitEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';

import { authFailure } from '@/api/auth';
import { ApiError } from '@/api/client';
import { roomNameLength, useCreateRoom } from '@/api/pairing';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { FailureBanner } from '@/pages/auth/failure-banner';
import { addPath, StepFrame } from '@/pages/pasang-alat/step-frame';
import { useWizard } from '@/pages/pasang-alat/wizard-context';

function checkName(value: string): string | undefined {
  const name = value.trim();

  if (name === '') {
    return 'Isi nama ruangan.';
  }
  // The API counts characters and not the units of the string, so an emoji counts once
  return [...name].length > roomNameLength.max
    ? `Nama ruangan paling panjang ${roomNameLength.max.toString()} huruf.`
    : undefined;
}

// Adds a room from the form of the device. The user comes back to that form with the new room chosen.
export function RuanganBaruPage() {
  const navigate = useNavigate();
  const wizard = useWizard();
  const create = useCreateRoom();
  const [name, setName] = useState('');
  const [tried, setTried] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const code = create.error instanceof ApiError ? create.error.code : undefined;
  const exists = create.isError && code === 'room_exists';
  const full = create.isError && code === 'too_many_rooms';
  // The text goes away when the user edits the name
  const nameError = tried
    ? (checkName(name) ?? (exists ? 'Nama ruangan ini sudah dipakai. Pakai nama lain.' : undefined))
    : undefined;

  // A visit that skipped the steps before has no device to name, so it starts over like the form of the device does
  if (!wizard.kind || !wizard.consented || (wizard.kind === 'clamp' && !wizard.safetyRead)) {
    return <Navigate to={addPath} replace />;
  }

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    // The controls stay enabled while the call runs, so the focus stays where it is. A second press does nothing.
    if (create.isPending || full) {
      return;
    }
    setTried(true);

    if (checkName(name)) {
      nameRef.current?.focus();
      return;
    }
    create.mutate(
      { name: name.trim() },
      {
        onSuccess: (room) => {
          // The form of the device shows the new room as the chosen one
          wizard.setRoomId(room.id);
          void navigate(`${addPath}/nama`, { replace: true });
        },
      },
    );
  };

  return (
    <StepFrame title="Ruangan baru" backTo={`${addPath}/nama`}>
      {full ? (
        <Banner
          tone="warning"
          title="Ruangan sudah penuh"
          message="Satu usaha bisa punya sampai 100 ruangan. Pakai ruangan yang sudah ada."
        />
      ) : create.isError && !exists ? (
        <FailureBanner failure={authFailure(create.error)} />
      ) : null}
      <form noValidate onSubmit={submit} className="flex flex-col gap-3">
        <TextInput
          ref={nameRef}
          label="Nama ruangan"
          helper="Pakai nama tempat alat berada, misalnya ruang jahit."
          autoComplete="off"
          value={name}
          error={nameError}
          onChange={(event) => {
            setName(event.target.value);
            if (exists) {
              create.reset();
            }
          }}
        />
        <Button
          type="submit"
          kind="accent"
          size="lg"
          aria-disabled={create.isPending || full || undefined}
        >
          {create.isPending ? 'Sedang menyimpan' : 'Simpan'}
        </Button>
      </form>
    </StepFrame>
  );
}
