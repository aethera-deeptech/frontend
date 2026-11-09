import { Link, useLocation, useNavigate, useParams } from 'react-router';

import { ApiError } from '@/api/client';
import { useDevice, useResetEnergy } from '@/api/devices';
import { Banner } from '@/components/ui/banner';
import { busyReadMessage, ErrorBanner } from '@/components/ui/error-banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { AuthFrame } from '@/pages/auth/auth-frame';

const title = 'Mulai dari nol?';
const subtitle =
  'Total energi alat ini di aplikasi akan dihitung lagi dari nol. Hitungan mulai dari jam penuh berikutnya.';

// The question before the total energy of a device starts again. It is a screen of its own and not a dialog, like Keluar, and
// Batal goes back to the device. Nothing is deleted, so the screen says what stays and that the old total cannot come back.
export function AlatEnergyResetPage() {
  const { id = '' } = useParams();
  const { search } = useLocation();
  const query = useDevice(id);
  const back = `/alat/${encodeURIComponent(id)}${search}`;

  if (query.data) {
    return <ResetQuestion id={id} name={query.data.name} back={back} />;
  }
  if (query.isPending) {
    return (
      <AuthFrame title={title} subtitle={subtitle}>
        <SkeletonCard label="Memuat alat" />
      </AuthFrame>
    );
  }
  const gone = query.error instanceof ApiError && query.error.status === 404;
  const busy = query.error instanceof ApiError && query.error.busy;

  return (
    <AuthFrame title={title} subtitle={subtitle}>
      <Banner
        tone={gone || busy ? 'warning' : 'danger'}
        title={gone ? 'Alat tidak ditemukan' : 'Alat tidak bisa dimuat'}
        message={
          gone
            ? 'Alat ini sudah tidak ada. Pilih alat lain dari daftar.'
            : busy
              ? busyReadMessage
              : 'Coba lagi. Jika tetap gagal, periksa koneksi internet Anda.'
        }
        action={
          gone ? (
            <Button asChild size="lg">
              <Link to={`/alat${search}`}>Kembali ke daftar</Link>
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => {
                void query.refetch();
              }}
            >
              Coba lagi
            </Button>
          )
        }
      />
    </AuthFrame>
  );
}

function ResetQuestion({ id, name, back }: { id: string; name: string; back: string }) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const reset = useResetEnergy();

  const start = () => {
    // A second press does nothing while the first call runs, and the focus stays on the button
    if (reset.isPending) {
      return;
    }
    reset.mutate(id, {
      // The device page says that it worked. The move replaces this screen, so Back does not ask the question again.
      onSuccess: ({ resetAt }) => {
        void navigate(back, { replace: true, state: { energyReset: { resetAt } } });
      },
    });
  };

  return (
    <AuthFrame title={title} subtitle={subtitle} eyebrow={name}>
      {reset.error instanceof ApiError && reset.error.status === 404 ? (
        <Banner
          tone="warning"
          title="Alat tidak ditemukan"
          message="Alat ini sudah tidak ada. Pilih alat lain dari daftar."
          action={
            <Button asChild size="lg">
              <Link to={`/alat${search}`}>Kembali ke daftar</Link>
            </Button>
          }
        />
      ) : reset.error instanceof ApiError ? (
        <ErrorBanner
          error={reset.error}
          kind="write"
          busyTitle="Belum pasti total energi sudah mulai dari nol"
          busyMessage="Sistem sedang sibuk. Buka lagi halaman alat untuk melihat totalnya, atau coba lagi."
          title="Total energi belum dimulai dari nol"
          message="Periksa sambungan Anda, lalu coba lagi."
        />
      ) : reset.isError ? (
        // The call may have reached the service and only the answer was lost, so the screen does not say that nothing changed
        <Banner
          tone="danger"
          title="Belum pasti total energi sudah mulai dari nol"
          message="Periksa sambungan Anda. Buka lagi halaman alat untuk melihat totalnya, atau coba lagi."
        />
      ) : null}
      <Card className="gap-3">
        {reset.isError ? null : (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-label-strong text-text-heading">Yang tidak berubah</h2>
              <p className="text-body text-text-1">Meter di dalam alat tetap menghitung.</p>
              <p className="text-body text-text-1">
                Riwayat, grafik daya, angka Hari ini dan Bulan ini, tagihan, saran, dan laporan.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-label-strong text-text-heading">Perlu Anda tahu</h2>
              <p className="text-body text-text-1">Total yang lama tidak bisa dikembalikan.</p>
            </div>
          </>
        )}
        <Button
          kind="danger"
          size="lg"
          aria-disabled={reset.isPending || undefined}
          onClick={start}
        >
          {reset.isPending ? 'Sedang memulai' : reset.isError ? 'Coba lagi' : 'Ya, mulai dari nol'}
        </Button>
        <Button asChild size="lg">
          {/* The reset is for good once the call is sent, so Batal does nothing while it runs and the news cannot be missed */}
          <Link
            to={back}
            aria-disabled={reset.isPending || undefined}
            onClick={(event) => {
              if (reset.isPending) {
                event.preventDefault();
              }
            }}
          >
            Batal
          </Link>
        </Button>
      </Card>
    </AuthFrame>
  );
}
