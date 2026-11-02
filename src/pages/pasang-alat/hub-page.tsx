import { useRef, useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router';

import {
  claimCodePattern,
  claimFailure,
  gatewayNameLength,
  normalizeClaimCode,
  useClaimGateway,
} from '@/api/gateways';
import { ApiError } from '@/api/client';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { FailureBanner } from '@/pages/auth/failure-banner';
import { useCountdown } from '@/pages/auth/use-countdown';
import { addPath, StepFrame } from '@/pages/pasang-alat/step-frame';

const codeHelper = 'Huruf besar dan angka 2 sampai 9. Kode berlaku 10 menit.';

function checkCode(value: string): string | undefined {
  const code = normalizeClaimCode(value);

  if (code === '') {
    return 'Isi kode WATTLINK Hub.';
  }
  return claimCodePattern.test(code) ? undefined : codeHelper;
}

function checkName(value: string): string | undefined {
  const name = value.trim();

  if (name === '') {
    return 'Isi nama WATTLINK Hub.';
  }
  return name.length > gatewayNameLength.max
    ? `Nama paling panjang ${gatewayNameLength.max.toString()} huruf.`
    : undefined;
}

// The first step when the business has no hub yet. A new hub shows a code on its display, and the owner types it here.
export function HubPage() {
  const navigate = useNavigate();
  const claim = useClaimGateway();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [tried, setTried] = useState(false);
  // The time when the button works again after the API said to wait, and 0 when it did not
  const [readyAt, setReadyAt] = useState(0);
  const left = useCountdown(readyAt);
  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const failure = claim.isError ? claimFailure(claim.error) : undefined;
  const waiting = left > 0;
  // The text of a code that the API does not know goes away when the user edits the code
  const codeError = tried
    ? (checkCode(code) ?? (failure === 'code-unknown' ? codeHelper : undefined))
    : undefined;
  const nameError = tried ? checkName(name) : undefined;

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    // The controls stay enabled while the call runs and while the button waits, so the focus stays where it is
    if (claim.isPending || waiting) {
      return;
    }
    setTried(true);

    if (checkCode(code)) {
      codeRef.current?.focus();
      return;
    }
    if (checkName(name)) {
      nameRef.current?.focus();
      return;
    }
    claim.mutate(
      { claimCode: normalizeClaimCode(code), name: name.trim() },
      {
        onSuccess: () => {
          void navigate(addPath);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 429) {
            setReadyAt(Date.now() + (error.retryAfterSeconds ?? 60) * 1000);
          }
        },
      },
    );
  };

  return (
    <StepFrame
      title="Hubungkan WATTLINK Hub"
      subtitle="Nyalakan WATTLINK Hub. Layarnya menampilkan kode 8 karakter. Masukkan kode itu di sini."
      backTo="/alat"
    >
      {failure === 'code-unknown' ? (
        <Banner
          tone="danger"
          title="Kode tidak dikenali"
          message="Kode salah, sudah dipakai atau sudah kedaluwarsa. Periksa kode di layar WATTLINK Hub, atau nyalakan ulang hub untuk kode baru."
        />
      ) : failure === 'claimed-elsewhere' ? (
        <Banner
          tone="danger"
          title="WATTLINK Hub sudah terdaftar"
          message="WATTLINK Hub ini sudah dipakai usaha lain."
        />
      ) : failure === 'too-many-gateways' ? (
        <Banner
          tone="warning"
          title="Batas WATTLINK Hub tercapai"
          message="Satu usaha bisa punya sampai 10 WATTLINK Hub."
        />
      ) : failure && !(failure === 'rate-limited' && !waiting) ? (
        <FailureBanner
          failure={failure}
          retryAfterSeconds={
            claim.error instanceof ApiError ? claim.error.retryAfterSeconds : undefined
          }
        />
      ) : null}
      <form noValidate onSubmit={submit} className="flex flex-col gap-3">
        <TextInput
          ref={codeRef}
          label="Kode di layar WATTLINK Hub"
          helper={codeHelper}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          error={codeError}
          onChange={(event) => {
            setCode(event.target.value);
            if (failure === 'code-unknown') {
              claim.reset();
            }
          }}
        />
        <TextInput
          ref={nameRef}
          label="Nama WATTLINK Hub"
          helper="Pakai nama yang mudah Anda kenali."
          autoComplete="off"
          value={name}
          error={nameError}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <Button
          type="submit"
          kind="accent"
          size="lg"
          aria-disabled={claim.isPending || waiting || undefined}
        >
          {claim.isPending ? 'Sedang menghubungkan' : 'Hubungkan'}
        </Button>
      </form>
    </StepFrame>
  );
}
