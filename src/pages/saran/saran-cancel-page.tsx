import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';

import { useRecommendation, useRecommendationDecision } from '@/api/recommendations';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';

// Asks before the record that a tip was applied is removed
export function SaranCancelPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const query = useRecommendation(id);
  const decision = useRecommendationDecision();
  const { search } = useLocation();
  const back = `/saran/${encodeURIComponent(id)}${search}`;

  if (!query.data) {
    return query.isPending ? (
      <SkeletonCard label="Memuat saran" />
    ) : (
      <Banner
        tone="danger"
        title="Saran tidak bisa dimuat"
        message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
      />
    );
  }

  // A tip that is not applied has no record to remove, for example after the record was removed and the user went back
  if (query.data.status !== 'applied') {
    return <Navigate to={back} replace />;
  }

  const progress = query.data.verification;

  return (
    <div className="flex flex-col gap-3">
      <div className="lg:hidden">
        <Button asChild size="lg">
          <Link to={back}>Kembali</Link>
        </Button>
      </div>
      <h2 className="text-h2 text-text-heading">Batalkan catatan penerapan?</h2>
      <p className="text-body text-text-2">Saran &quot;{query.data.title}&quot;.</p>
      <p className="text-body text-text-1">
        Sistem hanya menghapus catatan bahwa Anda sudah menerapkan saran ini. Sistem tidak mengubah
        atau mematikan alat Anda. Masa verifikasi {progress?.neededDays ?? 14} hari berhenti dan
        saran kembali menunggu keputusan Anda.
        {progress
          ? ` Hari ke-${progress.collectedDays.toString()} dari ${progress.neededDays.toString()} akan hilang.`
          : ''}
      </p>
      {decision.isError ? (
        <Banner
          tone="danger"
          title="Catatan belum dibatalkan"
          message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
        />
      ) : null}
      <Button
        kind="danger"
        size="lg"
        disabled={decision.isPending}
        onClick={() => {
          decision.mutate(
            { id, decision: 'cancel' },
            {
              onSuccess: () => {
                void navigate(back, { replace: true });
              },
            },
          );
        }}
      >
        Ya, batalkan catatan
      </Button>
      <Button asChild size="lg">
        <Link to={back}>Kembali</Link>
      </Button>
    </div>
  );
}
