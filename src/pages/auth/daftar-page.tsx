import { useRef, useState, type SubmitEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { authFailure, useRegister } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { TextLink } from '@/components/ui/text-link';
import { AuthFrame } from '@/pages/auth/auth-frame';
import { FailureBanner } from '@/pages/auth/failure-banner';
import { PasswordField } from '@/pages/auth/password-field';
import { checkBusinessName, checkEmail, checkNewPassword } from '@/pages/auth/validation';

const googleNoteId = 'daftar-google-note';

export function DaftarPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tried, setTried] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const failure = register.isError ? authFailure(register.error) : undefined;
  const nameError = tried ? checkBusinessName(businessName) : undefined;
  // The API says that the email has an account, and the field says it as well. The text goes away when the email changes.
  const emailError = tried
    ? (checkEmail(email) ?? (failure === 'email-taken' ? 'Email sudah terdaftar.' : undefined))
    : undefined;
  // The helper stays until the user tries, then it turns into the error
  const passwordError = tried ? checkNewPassword(password) : undefined;

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    // The controls stay enabled while the call runs, so the focus stays where it is. A second press does nothing.
    if (register.isPending) {
      return;
    }
    setTried(true);

    if (checkBusinessName(businessName)) {
      nameRef.current?.focus();
      return;
    }
    if (checkEmail(email)) {
      emailRef.current?.focus();
      return;
    }
    if (checkNewPassword(password)) {
      passwordRef.current?.focus();
      return;
    }
    const address = email.trim();

    register.mutate(
      { businessName: businessName.trim(), email: address, password },
      {
        onSuccess: ({ retryAfterSeconds }) => {
          // The address goes in the history entry of this visit and not in any storage of ours. A reload of the next screen keeps it.
          void navigate('/verifikasi', { state: { email: address, retryAfterSeconds } });
        },
      },
    );
  };

  return (
    <AuthFrame title="Daftar" subtitle="Buat akun untuk usaha Anda.">
      {failure === 'email-taken' ? (
        <Banner
          tone="warning"
          title="Email sudah terdaftar"
          message="Masuk dengan email itu."
          action={
            <Button asChild size="lg">
              <Link to="/masuk">Masuk</Link>
            </Button>
          }
        />
      ) : failure ? (
        <FailureBanner
          failure={failure}
          retryAfterSeconds={
            register.error instanceof ApiError ? register.error.retryAfterSeconds : undefined
          }
        />
      ) : null}
      <form noValidate onSubmit={submit} className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Daftar dengan email</legend>
          <TextInput
            ref={nameRef}
            label="Nama usaha"
            helper="Tampil di bagian atas Beranda."
            autoComplete="organization"
            value={businessName}
            error={nameError}
            onChange={(event) => {
              setBusinessName(event.target.value);
            }}
          />
          <TextInput
            ref={emailRef}
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            error={emailError}
            onChange={(event) => {
              setEmail(event.target.value);
              if (register.isError) {
                register.reset();
              }
            }}
          />
          <PasswordField
            ref={passwordRef}
            label="Kata sandi"
            helper="Minimal 8 karakter."
            autoComplete="new-password"
            value={password}
            error={passwordError}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
          <Button
            type="submit"
            kind="accent"
            size="lg"
            aria-disabled={register.isPending || undefined}
          >
            {register.isPending ? 'Sedang mendaftar' : 'Daftar'}
          </Button>
        </fieldset>
        <p className="text-label text-text-2 text-center">atau</p>
        <Button size="lg" disabled aria-describedby={googleNoteId}>
          Daftar dengan Google
        </Button>
        <p id={googleNoteId} className="text-label text-text-2 text-center">
          Daftar dengan Google belum tersedia.
        </p>
        <p className="text-label text-text-2 text-center">
          Dengan mendaftar, Anda menyetujui Ketentuan dan Kebijakan privasi.
        </p>
      </form>
      <p className="text-body text-text-2 text-center">
        Sudah punya akun? <TextLink to="/masuk">Masuk</TextLink>
      </p>
    </AuthFrame>
  );
}
