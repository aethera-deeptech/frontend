import { useBeranda } from '@/api/beranda';
import { useRecommendationDecision } from '@/api/recommendations';
import { PageHeader } from '@/components/layout/page-header';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { useConnection } from '@/hooks/use-connection';
import { BerandaView } from '@/pages/beranda/beranda-view';

export function BerandaPage() {
  const query = useBeranda();
  const connection = useConnection();
  const decision = useRecommendationDecision();

  return (
    <>
      <title>Beranda · Audit Energi UMKM</title>
      {query.data ? (
        <BerandaView
          data={query.data}
          connection={connection}
          busyId={decision.isPending ? decision.variables.id : undefined}
          onDecision={(id, choice) => {
            decision.mutate({ id, decision: choice });
          }}
        />
      ) : (
        <div className="flex flex-col gap-3 lg:gap-6">
          <PageHeader title="Beranda" />
          {query.isPending ? (
            <div className="flex flex-col gap-3 lg:gap-4">
              <SkeletonCard />
              <div aria-hidden="true" className="hidden lg:block">
                <SkeletonCard />
              </div>
              <div aria-hidden="true" className="hidden lg:block">
                <SkeletonCard />
              </div>
            </div>
          ) : (
            <Banner
              tone="danger"
              title="Data belum bisa dimuat"
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
          )}
        </div>
      )}
    </>
  );
}
