import { useParams } from 'react-router';

import { ApiError } from '@/api/client';
import { useRecommendation, useRecommendationDecision } from '@/api/recommendations';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { SaranDetailView } from '@/pages/saran/saran-detail-view';

export function SaranDetailPage() {
  const { id = '' } = useParams();
  const query = useRecommendation(id);
  const decision = useRecommendationDecision();

  if (query.data) {
    return (
      <SaranDetailView
        detail={query.data}
        busy={decision.isPending}
        onDecision={(choice) => {
          decision.mutate({ id, decision: choice });
        }}
      />
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
    <Banner
      tone="danger"
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
