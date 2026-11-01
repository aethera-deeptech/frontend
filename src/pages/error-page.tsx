import { useEffect, useRef } from 'react';
import { useLocation, useRouteError } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { reportError } from '@/lib/error-reporting';

// Shown when a page throws while it renders or while its chunk loads. The error goes to Sentry when it is set up, and the
// user gets a way out that does not need the broken page.
export function ErrorPage() {
  const error = useRouteError();
  const location = useLocation();
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    reportError(error);
  }, [error]);

  useEffect(() => {
    // The page that had the focus is gone, so a screen reader would stay silent without this
    main.current?.focus();
  }, []);

  return (
    <main
      ref={main}
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-4 outline-none"
    >
      <title>Terjadi kesalahan · Audit Energi UMKM</title>
      <Card className="gap-3 p-6">
        <h1 className="text-h2 text-text-heading">Terjadi kesalahan</h1>
        <p className="text-body text-text-2">
          Halaman ini tidak bisa ditampilkan. Periksa koneksi internet Anda, lalu muat ulang
          halaman. Jika masih gagal, kembali ke Beranda.
        </p>
        {/* Plain links, so the browser loads the page again and no script of the broken page is needed. A router link to the page that
            threw would only render the same error again. */}
        <div className="flex flex-wrap gap-3">
          <Button kind="accent" asChild>
            <a href={`${location.pathname}${location.search}`}>Muat ulang</a>
          </Button>
          <Button asChild>
            <a href="/">Kembali ke Beranda</a>
          </Button>
        </div>
      </Card>
    </main>
  );
}
