import { useParams } from 'react-router';

import { ApiError } from '@/api/client';
import { useRecommendation, useRecommendationDecision } from '@/api/recommendations';
import { Banner } from '@/components/ui/banner';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { useBusinessZone } from '@/hooks/use-business-zone';
import { SaranDetailView } from '@/pages/saran/saran-detail-view';

export function SaranDetailPage() {
  const { id = '' } = useParams();
  // The moments follow the zone of the business, so the page draws again when the zone arrives
  useBusinessZone();
  const query = useRecommendation(id);
  const decision = useRecommendationDecision();

  if (query.data) {
    return (
      <div className="flex flex-col gap-3">
        {decision.isError ? (
          <ErrorBanner
            error={decision.error}
            kind="write"
            title="Pilihan belum tersimpan"
            message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
          />
        ) : null}
        <SaranDetailView
          detail={query.data}
          busy={decision.isPending}
          onDecision={(choice) => {
            decision.mutate({ id, decision: choice });
          }}
        />
      </div>
    );
  }

  if (query.isPending) {
    return <SkeletonCard label="Memuat saran" />;
  }

  if (query.error instanceof ApiError && query.error.status === 404) {
    return (
      <Banner
        tone="warning"
        title="Saran tidak ditemukan"
        message="Saran ini sudah tidak ada. Pilih saran lain dari daftar."
      />
    );
  }

  return (
    <ErrorBanner
      error={query.error}
      title="Saran tidak bisa dimuat"
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
