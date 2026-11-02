import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { authFailure, isPlausibleToken, useResendVerification, useVerifyEmail } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { TextLink } from '@/components/ui/text-link';
import { AuthFrame } from '@/pages/auth/auth-frame';
import { FailureBanner } from '@/pages/auth/failure-banner';
import { checkEmail } from '@/pages/auth/validation';

// The page that the link of the verification email opens. The token works once, so the page sends it once, and then it
// leaves the address so a reload or a shared screenshot does not hold it.
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token] = useState(() => params.get('token') ?? '');
  const verify = useVerifyEmail();
  // React runs an effect twice in development, and a second send would use up the token
  const started = useRef(false);
  const plausible = isPlausibleToken(token);

  useEffect(() => {
    void navigate('/verify-email', { replace: true });
    if (!plausible || started.current) {
      return;
    }
    started.current = true;
    verify.mutate(token);
    // The mutation object changes on every render and the page sends the token once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (verify.isSuccess) {
    return (
      <AuthFrame
        title="Akun Anda aktif"
        subtitle="Anda bisa mulai memasang alat dan melihat saran."
      >
        <Button asChild kind="accent" size="lg">
          <Link to="/" replace>
            Lanjut
          </Link>
        </Button>
      </AuthFrame>
    );
  }
  // A link that cannot be a token is as good as a link that was used
  const failure = verify.isError
    ? authFailure(verify.error)
    : plausible
      ? undefined
      : 'invalid-token';

  if (failure === 'invalid-token') {
    return <NewLink />;
  }
  return (
    <AuthFrame title="Verifikasi email" subtitle="Sistem sedang memeriksa tautan Anda.">
      {failure ? (
        <FailureBanner
          failure={failure}
          retryAfterSeconds={
            verify.error instanceof ApiError ? verify.error.retryAfterSeconds : undefined
          }
          action={
            failure === 'rate-limited' ? undefined : (
              <Button
                size="lg"
                onClick={() => {
                  verify.mutate(token);
                }}
              >
                Coba lagi
              </Button>
            )
          }
        />
      ) : (
        <p role="status" className="text-body text-text-2">
          Memeriksa tautan
        </p>
      )}
    </AuthFrame>
  );
}

// The link is not valid, so the user asks for a new one. The page has no address, because the link may open on another
// device than the sign up, so it asks for the address.
function NewLink() {
  const navigate = useNavigate();
  const resend = useResendVerification();
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const emailError = tried ? checkEmail(email) : undefined;

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (resend.isPending) {
      return;
    }
    setTried(true);

    if (checkEmail(email)) {
      return;
    }
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
    <AuthFrame title="Verifikasi email" subtitle="Minta tautan baru untuk mengaktifkan akun.">
      <Banner
        tone="danger"
        title="Tautan tidak berlaku"
        message="Tautan sudah dipakai atau kedaluwarsa."
      />
      {resend.isError &&
      !(resend.error instanceof ApiError && resend.error.code === 'resend_too_soon') ? (
        <FailureBanner failure={authFailure(resend.error)} />
      ) : null}
      <form noValidate onSubmit={submit} className="flex flex-col gap-3">
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          error={emailError}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
        <Button type="submit" kind="accent" size="lg" aria-disabled={resend.isPending || undefined}>
          Kirim tautan baru
        </Button>
      </form>
      <TextLink to="/masuk" className="self-center">
        Kembali ke Masuk
      </TextLink>
    </AuthFrame>
  );
}
