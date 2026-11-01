import { Navigate, Outlet, useLocation, useParams, useSearchParams } from 'react-router';

import { useRecommendationDecision, useRecommendations } from '@/api/recommendations';
import { PageHeader } from '@/components/layout/page-header';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { useMediaQuery } from '@/hooks/use-media-query';
import { filterOptions, visibleItems, type StatusFilter } from '@/pages/saran/saran-filter';
import { SaranListView } from '@/pages/saran/saran-list-view';

function readFilter(value: string | null): StatusFilter {
  return filterOptions.find((option) => option.value === value)?.value ?? 'all';
}

// The list of tips and, next to it on a wide screen, the tip that is open. On a phone the open tip replaces the list.
export function SaranLayout() {
  const { id } = useParams();
  const { search } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = readFilter(searchParams.get('status'));
  const query = useRecommendations();
  const decision = useRecommendationDecision();
  const wide = useMediaQuery('(min-width: 1024px)');
  const data = query.data;

  // On a wide screen the first tip opens at once, like the Desktop frames
  const first = data?.phase === 'ready' ? visibleItems(data.items, filter) : undefined;
  const firstId = first ? [...first.waiting, ...first.handled][0]?.id : undefined;
  if (wide && !id && firstId) {
    return <Navigate to={{ pathname: `/saran/${encodeURIComponent(firstId)}`, search }} replace />;
  }

  return (
    <>
      <title>Saran · Audit Energi UMKM</title>
      {/* On a phone the open tip has its own top bar, so the title only stays for assistive technology */}
      <div className={id ? 'sr-only lg:not-sr-only' : undefined}>
        <PageHeader
          title="Saran"
          subtitle={data ? `Saran penghematan untuk ${data.businessName}` : undefined}
        />
      </div>
      <div className="mt-3 lg:mt-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className={id ? 'hidden lg:block' : undefined}>
          {decision.isError ? (
            <Banner
              className="mb-3"
              tone="danger"
              title="Pilihan belum tersimpan"
              message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
            />
          ) : null}
          {data ? (
            <SaranListView
              data={data}
              filter={filter}
              onFilterChange={(next) => {
                setSearchParams(next === 'all' ? {} : { status: next }, { replace: true });
              }}
              onDecision={(tipId, choice) => {
                decision.mutate({ id: tipId, decision: choice });
              }}
              busyId={decision.isPending ? decision.variables.id : undefined}
              selectedId={id}
            />
          ) : query.isPending ? (
            <SkeletonCard label="Memuat saran" />
          ) : (
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
          )}
        </div>
        <div className={id ? undefined : 'hidden lg:block'}>
          <Outlet />
        </div>
      </div>
    </>
  );
}
