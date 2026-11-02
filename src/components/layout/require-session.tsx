import { Navigate, Outlet, useLocation } from 'react-router';

import { useSession } from '@/api/auth';
import { ApiError } from '@/api/client';
import { AppLoading } from '@/components/layout/app-loading';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';

// The screens of the app need a session. Without one the user goes to Masuk and comes back to this screen after the sign in.
export function RequireSession() {
  const session = useSession();
  const { pathname, search, hash } = useLocation();

  // A 401 wins over data that an earlier read left behind, because the session has ended since
  if (session.error instanceof ApiError && session.error.status === 401) {
    return <Navigate to="/masuk" replace state={{ from: `${pathname}${search}${hash}` }} />;
  }
  // A read that fails in the background, for example on a lost connection, keeps the user where they are
  if (session.data) {
    // Another user can sign in from a second tab. The screens below start over for that user, so state that belongs to the
    // first one, such as the link of a downloaded report, does not carry over.
    return <Outlet key={session.data.email} />;
  }
  if (session.isPending) {
    return <AppLoading />;
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-4">
      <title>WATTLINK</title>
      <h1 className="text-title text-text-heading">WATTLINK</h1>
      <Banner
        tone="danger"
        title="Akun tidak bisa diperiksa"
        message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
        action={
          <Button
            size="lg"
            onClick={() => {
              void session.refetch();
            }}
          >
            Coba lagi
          </Button>
        }
      />
    </main>
  );
}
