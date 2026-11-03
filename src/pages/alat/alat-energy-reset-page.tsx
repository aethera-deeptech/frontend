import { Link, useLocation, useNavigate, useParams } from 'react-router';

import { ApiError } from '@/api/client';
import { useDevice, useResetEnergy } from '@/api/devices';
import { Banner } from '@/components/ui/banner';
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

  return (
    <AuthFrame title={title} subtitle={subtitle}>
      <Banner
        tone={gone ? 'warning' : 'danger'}
        title={gone ? 'Alat tidak ditemukan' : 'Alat tidak bisa dimuat'}
        message={
          gone
            ? 'Alat ini sudah tidak ada. Pilih alat lain dari daftar.'
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
      {reset.isError ? (
        <Banner
          tone="danger"
          title="Total energi belum dimulai dari nol"
          message="Periksa sambungan Anda, lalu coba lagi."
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
          <Link to={back}>Batal</Link>
        </Button>
      </Card>
    </AuthFrame>
  );
}
