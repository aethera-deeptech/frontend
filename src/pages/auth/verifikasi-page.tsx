import { useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { z } from 'zod';

import { authFailure, useResendVerification } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { AuthFrame } from '@/pages/auth/auth-frame';
import { FailureBanner } from '@/pages/auth/failure-banner';
import { useCountdown } from '@/pages/auth/use-countdown';

// What the sign up or the sign in leaves for this screen. It lives in the state of the visit and not in storage.
const visitSchema = z.object({
  email: z.string().min(1),
  retryAfterSeconds: z.number().int().positive(),
});

// The screen after a sign up. It never shows the address, as the Figma frames say.
export function VerifikasiPage() {
  const location = useLocation();
  const visit = visitSchema.safeParse(location.state);

  // A reload or a direct visit has no address to send a new email to, and the sign up is the place to start
  if (!visit.success) {
    return <Navigate to="/daftar" replace />;
  }
  return <Verification email={visit.data.email} firstWaitSeconds={visit.data.retryAfterSeconds} />;
}

function Verification({ email, firstWaitSeconds }: { email: string; firstWaitSeconds: number }) {
  const resend = useResendVerification();
  // The time when the button works again
  const [readyAt, setReadyAt] = useState(() => Date.now() + firstWaitSeconds * 1000);
  const [sentAgain, setSentAgain] = useState(false);
  const left = useCountdown(readyAt);

  const sendAgain = () => {
    setSentAgain(false);
    resend.mutate(email, {
      onSuccess: ({ retryAfterSeconds }) => {
        setSentAgain(true);
        setReadyAt(Date.now() + retryAfterSeconds * 1000);
      },
      onError: (error) => {
        // The API says how long is left, so the button waits for that long
        if (error instanceof ApiError && error.code === 'resend_too_soon') {
          setReadyAt(Date.now() + (error.retryAfterSeconds ?? 60) * 1000);
        }
      },
    });
  };
  const tooSoon = resend.error instanceof ApiError && resend.error.code === 'resend_too_soon';

  return (
    <AuthFrame
      title="Periksa email Anda"
      subtitle="Sistem sudah mengirim tautan verifikasi ke email yang Anda daftarkan. Ketuk tautan itu untuk mengaktifkan akun."
    >
      {sentAgain ? (
        <Banner
          tone="info"
          title="Email baru sudah dikirim"
          message="Gunakan tautan yang terbaru."
        />
      ) : null}
      {resend.isError && !tooSoon ? (
        <FailureBanner
          failure={authFailure(resend.error)}
          retryAfterSeconds={
            resend.error instanceof ApiError ? resend.error.retryAfterSeconds : undefined
          }
        />
      ) : null}
      <p className="text-body text-text-2">Tidak ada email? Periksa folder spam.</p>
      <Button size="lg" disabled={left > 0 || resend.isPending} onClick={sendAgain}>
        {left > 0 ? `Kirim ulang dalam ${left.toString()} detik` : 'Kirim ulang email'}
      </Button>
    </AuthFrame>
  );
}
