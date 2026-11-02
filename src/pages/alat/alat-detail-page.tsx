import { Link, useLocation, useParams } from 'react-router';

import { ApiError } from '@/api/client';
import { useDevice } from '@/api/devices';
import { useSettings } from '@/api/settings';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { businessNow } from '@/lib/format';
import { AlatDetailView } from '@/pages/alat/alat-detail-view';

export function AlatDetailPage() {
  const { id = '' } = useParams();
  const query = useDevice(id);
  const { search } = useLocation();
  // The day of an anomaly is "today" by the clock of the business. The zone comes from the settings, and WIB stands in while they load.
  const settings = useSettings();

  if (query.data) {
    return (
      <AlatDetailView detail={query.data} now={businessNow(undefined, settings.data?.timeZone)} />
    );
  }

  if (query.isPending) {
    return <SkeletonCard label="Memuat alat" />;
  }

  if (query.error instanceof ApiError && query.error.status === 404) {
    return (
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
    );
  }

  return (
    <Banner
      tone="danger"
      title="Alat tidak bisa dimuat"
      message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
      action={
        <Button
          size="lg"
          onClick={() => {
            void query.refetch();
          }}
        >
          Coba lagi
        </Button>
      }
    />
  );
}
