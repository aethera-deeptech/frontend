import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { authFailure, isPlausibleToken, useResetPassword } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TextInput } from '@/components/ui/text-input';
import { TextLink } from '@/components/ui/text-link';
import { AuthFrame } from '@/pages/auth/auth-frame';
import { FailureBanner } from '@/pages/auth/failure-banner';
import { checkNewPassword } from '@/pages/auth/validation';

// The page that the link of the reset email opens. The token works once, and the API only checks it when the new password
// is sent. The page takes the token out of the address at once, so a reload or a shared screenshot does not hold it.
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token] = useState(() => params.get('token') ?? '');
  const reset = useResetPassword();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [shown, setShown] = useState(false);
  const [tried, setTried] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const againRef = useRef<HTMLInputElement>(null);
  const failure = reset.isError ? authFailure(reset.error) : undefined;
  const passwordError = tried ? checkNewPassword(password) : undefined;
  const againError =
    tried && !checkNewPassword(password) && again !== password
      ? 'Kata sandi tidak sama.'
      : undefined;

  useEffect(() => {
    void navigate('/reset-password', { replace: true });
    // The page keeps the token in its state, and this runs once to take it out of the address
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reset.isSuccess) {
    return (
      <AuthFrame title="Kata sandi diperbarui" subtitle="Masuk dengan kata sandi baru.">
        <Button asChild kind="accent" size="lg">
          <Link to="/masuk" replace>
            Masuk
          </Link>
        </Button>
      </AuthFrame>
    );
  }
  // A link that cannot be a token is as good as a link that was used
  if (!isPlausibleToken(token) || failure === 'invalid-token') {
    return (
      <AuthFrame
        title="Atur ulang kata sandi"
        subtitle="Minta tautan baru untuk mengatur ulang kata sandi."
      >
        <Banner
          tone="danger"
          title="Tautan tidak berlaku"
          message="Tautan sudah dipakai atau kedaluwarsa."
        />
        <Button asChild kind="accent" size="lg">
          <Link to="/lupa-kata-sandi">Minta tautan baru</Link>
        </Button>
        <TextLink to="/masuk" className="self-center">
          Kembali ke Masuk
        </TextLink>
      </AuthFrame>
    );
  }

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    // The controls stay enabled while the call runs, so the focus stays where it is. A second press does nothing.
    if (reset.isPending) {
      return;
    }
    setTried(true);

    if (checkNewPassword(password)) {
      passwordRef.current?.focus();
      return;
    }
    if (again !== password) {
      againRef.current?.focus();
      return;
    }
    reset.mutate({ token, password });
  };

  return (
    <AuthFrame title="Atur ulang kata sandi" subtitle="Pilih kata sandi baru untuk akun Anda.">
      {failure ? (
        <FailureBanner
          failure={failure}
          retryAfterSeconds={
            reset.error instanceof ApiError ? reset.error.retryAfterSeconds : undefined
          }
        />
      ) : null}
      <form noValidate onSubmit={submit} className="flex flex-col gap-3">
        <TextInput
          ref={passwordRef}
          label="Kata sandi baru"
          helper="Minimal 8 karakter."
          type={shown ? 'text' : 'password'}
          autoComplete="new-password"
          value={password}
          error={passwordError}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
        <TextInput
          ref={againRef}
          label="Ulangi kata sandi"
          type={shown ? 'text' : 'password'}
          autoComplete="new-password"
          value={again}
          error={againError}
          onChange={(event) => {
            setAgain(event.target.value);
          }}
        />
        <Checkbox
          label="Tampilkan kata sandi"
          checked={shown}
          onCheckedChange={(checked) => {
            setShown(checked === true);
          }}
        />
        <Button type="submit" kind="accent" size="lg" aria-disabled={reset.isPending || undefined}>
          Simpan kata sandi
        </Button>
      </form>
    </AuthFrame>
  );
}
