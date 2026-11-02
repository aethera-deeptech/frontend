import { useRef, useState, type SubmitEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { authFailure, useChangeEmail } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { AuthFrame } from '@/pages/auth/auth-frame';
import { FailureBanner } from '@/pages/auth/failure-banner';
import { PasswordField } from '@/pages/auth/password-field';
import { useCountdown } from '@/pages/auth/use-countdown';
import { checkEmail, checkNewEmail, checkPasswordPresent } from '@/pages/auth/validation';

const newEmailHelper = 'Sistem mengirim tautan verifikasi ke email baru.';

// For a person who signed up with a wrong address. The person is not signed in, so the current email and the password prove
// who asks, and the verification email goes to the new address.
export function GantiEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const change = useChangeEmail();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [tried, setTried] = useState(false);
  // The time when the button works again after the API said to wait, and 0 when it did not
  const [readyAt, setReadyAt] = useState(0);
  const left = useCountdown(readyAt);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const newEmailRef = useRef<HTMLInputElement>(null);
  const failure = change.isError ? authFailure(change.error) : undefined;
  const emailError = tried ? checkEmail(email, 'Isi email Anda saat ini.') : undefined;
  const passwordError = tried ? checkPasswordPresent(password) : undefined;
  // The API says that the new address has an account, and the field says it as well. The text goes away when the address changes.
  const newEmailError = tried
    ? (checkNewEmail(newEmail, email) ??
      (failure === 'email-taken' ? 'Email ini sudah terdaftar.' : undefined))
    : undefined;
  const waiting = left > 0;

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    // The controls stay enabled while the call runs and while the button waits, so the focus stays where it is
    if (change.isPending || waiting) {
      return;
    }
    setTried(true);

    if (checkEmail(email, 'Isi email Anda saat ini.')) {
      emailRef.current?.focus();
      return;
    }
    if (checkPasswordPresent(password)) {
      passwordRef.current?.focus();
      return;
    }
    if (checkNewEmail(newEmail, email)) {
      newEmailRef.current?.focus();
      return;
    }
    const address = newEmail.trim();

    change.mutate(
      { email: email.trim(), password, newEmail: address },
      {
        onSuccess: ({ retryAfterSeconds }) => {
          // The new address goes in the history entry of this visit and not in any storage of ours, like after the sign up
          void navigate('/verifikasi', { state: { email: address, retryAfterSeconds } });
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 429) {
            setReadyAt(Date.now() + (error.retryAfterSeconds ?? 60) * 1000);
          }
        },
      },
    );
  };

  // The screen opens from the verification screen, so one step back is that screen. A visit with no history has no such screen.
  const back = () => {
    if (location.key === 'default') {
      void navigate('/masuk');
    } else {
      void navigate(-1);
    }
  };

  return (
    <AuthFrame title="Ganti email" subtitle="Pakai ini jika email Anda salah ketik.">
      {failure === 'invalid-credentials' ? (
        <Banner
          tone="danger"
          title="Tidak bisa mengganti email"
          message="Email saat ini atau kata sandi tidak cocok. Periksa lalu coba lagi."
        />
      ) : failure === 'email-taken' ? (
        <Banner tone="warning" title="Email sudah terdaftar" message="Pakai email lain." />
      ) : failure === 'already-verified' ? (
        <Banner
          tone="info"
          title="Email sudah terverifikasi"
          message="Akun Anda sudah aktif, jadi email tidak bisa diganti di sini. Masuk dengan email itu."
          action={
            <Button asChild size="lg">
              <Link to="/masuk">Masuk</Link>
            </Button>
          }
        />
      ) : failure && !(failure === 'rate-limited' && !waiting) ? (
        <FailureBanner
          failure={failure}
          retryAfterSeconds={
            change.error instanceof ApiError ? change.error.retryAfterSeconds : undefined
          }
        />
      ) : null}
      <form noValidate onSubmit={submit} className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Ganti email akun</legend>
          <TextInput
            ref={emailRef}
            label="Email saat ini"
            type="email"
            autoComplete="email"
            value={email}
            error={emailError}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
          <PasswordField
            ref={passwordRef}
            label="Kata sandi"
            autoComplete="current-password"
            value={password}
            error={passwordError}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
          <TextInput
            ref={newEmailRef}
            label="Email baru"
            type="email"
            autoComplete="off"
            helper={newEmailHelper}
            value={newEmail}
            error={newEmailError}
            onChange={(event) => {
              setNewEmail(event.target.value);
              if (failure === 'email-taken') {
                change.reset();
              }
            }}
          />
          <Button
            type="submit"
            kind="accent"
            size="lg"
            aria-disabled={change.isPending || waiting || undefined}
          >
            {change.isPending ? 'Sedang mengganti' : 'Ganti email'}
          </Button>
          <Button type="button" size="lg" onClick={back}>
            Kembali
          </Button>
        </fieldset>
      </form>
    </AuthFrame>
  );
}
