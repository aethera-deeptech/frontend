import { useEffect } from 'react';
import { Link, useLocation, useRouteError } from 'react-router';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { reportError } from '@/lib/error-reporting';

// Shown when a page throws while it renders or while its chunk loads. The error goes to Sentry when it is set up, and the
// user gets a way out that does not need the broken page.
export function ErrorPage() {
  const error = useRouteError();
  const location = useLocation();

  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-4">
      <title>Terjadi kesalahan · Audit Energi UMKM</title>
      <EmptyState
        headline="Terjadi kesalahan"
        message="Halaman ini tidak bisa ditampilkan. Muat ulang halaman. Jika masih gagal, kembali ke Beranda."
        action={
          <div className="flex flex-wrap gap-3">
            {/* A plain link to the same address, so the browser loads the page again and no script of the broken page is needed */}
            <Button kind="accent" asChild>
              <a href={`${location.pathname}${location.search}`}>Muat ulang</a>
            </Button>
            <Button asChild>
              <Link to="/">Kembali ke Beranda</Link>
            </Button>
          </div>
        }
      />
    </main>
  );
}
