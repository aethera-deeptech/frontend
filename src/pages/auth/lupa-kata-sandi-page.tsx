import { useRef, useState, type SubmitEvent } from 'react';

import { authFailure, useForgotPassword } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { TextLink } from '@/components/ui/text-link';
import { AuthFrame } from '@/pages/auth/auth-frame';
import { FailureBanner } from '@/pages/auth/failure-banner';
import { useCountdown } from '@/pages/auth/use-countdown';
import { checkEmail } from '@/pages/auth/validation';

// The screen to ask for the link, and the screen after it. The second one never shows the address and never says that the
// account exists, because the API answers the same for every address.
export function LupaKataSandiPage() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  // The time when the button sends the link again, and null before the first link
  const [readyAt, setReadyAt] = useState<number | null>(null);
  // True after a link that was sent again, so the screen can say that the older one may stop working
  const [sentAgain, setSentAgain] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const emailError = tried ? checkEmail(email) : undefined;
  const failure = forgot.isError ? authFailure(forgot.error) : undefined;

  const send = () => {
    // The controls stay enabled while the call runs, so the focus stays where it is. A second press does nothing.
    if (forgot.isPending) {
      return;
    }
    setTried(true);

    if (checkEmail(email)) {
      emailRef.current?.focus();
      return;
    }
    forgot.mutate(email.trim(), {
      onSuccess: ({ retryAfterSeconds }) => {
        setSentAgain(readyAt !== null);
        setReadyAt(Date.now() + retryAfterSeconds * 1000);
      },
      onError: (error) => {
        // Any 429 says how long to wait, and the screen after the first link waits for that long
        if (error instanceof ApiError && error.status === 429 && readyAt !== null) {
          setReadyAt(Date.now() + (error.retryAfterSeconds ?? 60) * 1000);
        }
      },
    });
  };

  if (readyAt !== null) {
    return (
      <LinkSent
        readyAt={readyAt}
        pending={forgot.isPending}
        sentAgain={sentAgain && !forgot.isPending}
        failure={failure}
        retryAfterSeconds={
          forgot.error instanceof ApiError ? forgot.error.retryAfterSeconds : undefined
        }
        onResend={send}
      />
    );
  }
  return (
    <AuthFrame
      title="Lupa kata sandi"
      subtitle="Isi email akun Anda. Sistem mengirim tautan untuk mengatur ulang kata sandi."
    >
      {failure ? (
        <FailureBanner
          write
          failure={failure}
          retryAfterSeconds={
            forgot.error instanceof ApiError ? forgot.error.retryAfterSeconds : undefined
          }
        />
      ) : null}
      <form
        noValidate
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          send();
        }}
        className="flex flex-col gap-3"
      >
        <TextInput
          ref={emailRef}
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          error={emailError}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
        <Button type="submit" kind="accent" size="lg" aria-disabled={forgot.isPending || undefined}>
          Kirim tautan
        </Button>
      </form>
      <TextLink to="/masuk" className="self-center">
        Kembali ke Masuk
      </TextLink>
    </AuthFrame>
  );
}

interface LinkSentProps {
  readyAt: number;
  pending: boolean;
  sentAgain: boolean;
  failure: ReturnType<typeof authFailure> | undefined;
  retryAfterSeconds: number | undefined;
  onResend: () => void;
}

function LinkSent({
  readyAt,
  pending,
  sentAgain,
  failure,
  retryAfterSeconds,
  onResend,
}: LinkSentProps) {
  const left = useCountdown(readyAt);

  return (
    <AuthFrame
      title="Periksa email Anda"
      subtitle="Jika email itu terdaftar, sistem sudah mengirim tautan untuk mengatur ulang kata sandi."
    >
      {sentAgain && !failure ? (
        <Banner
          tone="info"
          title="Email baru sudah dikirim"
          message="Gunakan tautan yang terbaru."
        />
      ) : null}
      {failure && failure !== 'rate-limited' ? (
        <FailureBanner failure={failure} retryAfterSeconds={retryAfterSeconds} />
      ) : null}
      <p className="text-body text-text-2">Tidak ada email? Periksa folder spam.</p>
      <Button
        size="lg"
        aria-disabled={left > 0 || pending || undefined}
        onClick={() => {
          // The button stays focusable while it waits, so a press must do nothing then
          if (left === 0) {
            onResend();
          }
        }}
      >
        {left > 0 ? `Kirim ulang dalam ${left.toString()} detik` : 'Kirim ulang email'}
      </Button>
      <TextLink to="/masuk" className="self-center">
        Kembali ke Masuk
      </TextLink>
    </AuthFrame>
  );
}
