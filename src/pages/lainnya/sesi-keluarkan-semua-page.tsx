import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';

import { ApiError } from '@/api/client';
import { useRevokeOtherSessions } from '@/api/sessions';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { AuthFrame } from '@/pages/auth/auth-frame';

const listPath = '/lainnya/sesi';

// The question before every other device is signed out. It is a screen of its own and not a dialog, like Keluar, and Batal goes
// back to the list. This device stays signed in.
export function SesiKeluarkanSemuaPage() {
  const navigate = useNavigate();
  const revoke = useRevokeOtherSessions();
  // The observer tells the screen that the call runs a moment after the press, so two quick presses need a flag that is set at once
  const calling = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Only an answer of the 4xx kind says for sure that nothing was ended. A 5xx from a proxy, a lost answer and an answer in the
  // wrong shape can hide a call that went through. A busy answer has its own text.
  const refused =
    revoke.error instanceof ApiError && (revoke.error.busy || revoke.error.status < 500);

  const revokeAll = () => {
    // A second press does nothing while the call runs, and the focus stays on the button
    if (revoke.isPending || calling.current) {
      return;
    }
    calling.current = true;
    // The steps after the call run from this promise and not from a callback of the hook, because a user who leaves while the
    // call runs would never see the callback. The list shows the result when it opens.
    revoke
      .mutateAsync()
      .then(({ ended }) => {
        // A user who left while the call ran must not be moved back. The cached list is already cut down to this device.
        if (mounted.current) {
          void navigate(listPath, { replace: true, state: { revoked: { ended } } });
        }
      })
      // The screen shows the failure of the call, so there is nothing more to do here
      .catch(() => undefined)
      .finally(() => {
        calling.current = false;
      });
  };

  return (
    <AuthFrame
      title="Keluarkan semua perangkat lain?"
      subtitle="Perangkat lain harus masuk lagi. Perangkat ini tetap masuk."
    >
      {refused ? (
        <ErrorBanner
          error={revoke.error}
          kind="write"
          busyTitle="Belum pasti dikeluarkan"
          busyMessage="Sistem sedang sibuk. Perangkat lain mungkin sudah dikeluarkan. Buka daftar perangkat untuk melihat, lalu coba lagi jika perlu."
          title="Perangkat lain belum dikeluarkan"
          message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
        />
      ) : revoke.isError ? (
        // The call may have reached the service and only the answer was lost or not understood, so the screen does not say that nothing changed
        <Banner
          tone="warning"
          title="Belum pasti dikeluarkan"
          message="Perangkat lain mungkin sudah dikeluarkan. Buka daftar perangkat untuk melihat, lalu coba lagi jika perlu."
        />
      ) : null}
      <div className="flex flex-col gap-3">
        <Button
          kind="danger"
          size="lg"
          aria-disabled={revoke.isPending || undefined}
          onClick={revokeAll}
        >
          {revoke.isPending
            ? 'Sedang mengeluarkan'
            : revoke.isError
              ? 'Coba lagi'
              : 'Ya, keluarkan semuanya'}
        </Button>
        <Button asChild size="lg">
          {/* The call may be done in the service once it is sent, so Batal does nothing while it runs and the result is not lost */}
          <Link
            to={listPath}
            replace
            aria-disabled={revoke.isPending || undefined}
            onClick={(event) => {
              if (revoke.isPending) {
                event.preventDefault();
              }
            }}
          >
            {revoke.isError ? 'Lihat daftar perangkat' : 'Batal'}
          </Link>
        </Button>
      </div>
    </AuthFrame>
  );
}
