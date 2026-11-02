import { useRef, useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router';

import { authFailure, useLogin, useResendVerification } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { TextLink } from '@/components/ui/text-link';
import { AuthFrame } from '@/pages/auth/auth-frame';
import { FailureBanner } from '@/pages/auth/failure-banner';
import { PasswordField } from '@/pages/auth/password-field';
import { checkEmail, checkPasswordPresent } from '@/pages/auth/validation';

const googleNoteId = 'masuk-google-note';

export function MasukPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const resend = useResendVerification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // The texts under the fields show after the first try to sign in, and not while the user types the first time
  const [tried, setTried] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const emailError = tried ? checkEmail(email) : undefined;
  const passwordError = tried ? checkPasswordPresent(password) : undefined;
  const failure = login.isError ? authFailure(login.error) : undefined;

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    setTried(true);
    resend.reset();

    if (checkEmail(email)) {
      emailRef.current?.focus();
      return;
    }
    if (checkPasswordPresent(password)) {
      passwordRef.current?.focus();
      return;
    }
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          void navigate('/', { replace: true });
        },
      },
    );
  };

  // The account exists but is not verified. The verification screen has the timer, and it also takes the answer of a resend
  // that came too soon, because that answer says how long is left.
  const sendAgain = () => {
    const address = email.trim();

    resend.mutate(address, {
      onSuccess: ({ retryAfterSeconds }) => {
        void navigate('/verifikasi', { state: { email: address, retryAfterSeconds } });
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'resend_too_soon') {
          void navigate('/verifikasi', {
            state: { email: address, retryAfterSeconds: error.retryAfterSeconds ?? 60 },
          });
        }
      },
    });
  };

  return (
    <AuthFrame title="Masuk" subtitle="Masuk untuk melihat saran penghematan usaha Anda.">
      {failure === 'invalid-credentials' ? (
        <Banner
          tone="danger"
          title="Tidak bisa masuk"
          message="Email atau kata sandi tidak cocok. Periksa lalu coba lagi."
        />
      ) : failure === 'email-not-verified' ? (
        <Banner
          tone="warning"
          title="Email belum diverifikasi"
          message="Ketuk tautan di email dari sistem untuk mengaktifkan akun."
          action={
            <Button size="lg" disabled={resend.isPending} onClick={sendAgain}>
              Kirim ulang email
            </Button>
          }
        />
      ) : failure ? (
        <FailureBanner
          failure={failure}
          retryAfterSeconds={
            login.error instanceof ApiError ? login.error.retryAfterSeconds : undefined
          }
        />
      ) : null}
      {resend.isError &&
      !(resend.error instanceof ApiError && resend.error.code === 'resend_too_soon') ? (
        <FailureBanner failure={authFailure(resend.error)} />
      ) : null}
      <form noValidate onSubmit={submit} className="flex flex-col gap-3">
        <fieldset disabled={login.isPending} className="flex flex-col gap-3">
          <legend className="sr-only">Masuk dengan email</legend>
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
          <Button type="submit" kind="accent" size="lg">
            {login.isPending ? 'Sedang masuk' : 'Masuk'}
          </Button>
        </fieldset>
        <p className="text-label text-text-2 text-center">atau</p>
        <Button size="lg" disabled aria-describedby={googleNoteId}>
          Lanjut dengan Google
        </Button>
        <p id={googleNoteId} className="text-label text-text-2 text-center">
          Masuk dengan Google belum tersedia.
        </p>
      </form>
      <p className="text-body text-text-2 text-center">
        Belum punya akun? <TextLink to="/daftar">Daftar</TextLink>
      </p>
    </AuthFrame>
  );
}
