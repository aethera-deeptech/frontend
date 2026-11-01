import { Navigate, Outlet, useParams, useSearchParams } from 'react-router';

import { useDevices } from '@/api/devices';
import { CatatProduksiFab } from '@/components/layout/catat-produksi-fab';
import { PageHeader } from '@/components/layout/page-header';
import { AddDeviceButton } from '@/components/ui/add-device-button';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { useMediaQuery } from '@/hooks/use-media-query';
import { deviceFilterOptions, type DeviceFilter } from '@/pages/alat/device-filters';
import { AlatListView } from '@/pages/alat/alat-list-view';

function readFilter(value: string | null): DeviceFilter {
  return deviceFilterOptions.find((option) => option.value === value)?.value ?? 'all';
}

// The list of devices and, next to it on a wide screen, the device that is open. On a phone the open device replaces the list.
export function AlatLayout() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = readFilter(searchParams.get('status'));
  const query = useDevices();
  const wide = useMediaQuery('(min-width: 1024px)');
  const data = query.data;

  // On a wide screen the first device opens at once, like the Desktop frames
  const shown = data ? data.items.filter((item) => filter === 'all' || item.status === filter) : [];
  const firstId = shown[0]?.id;
  if (wide && !id && firstId) {
    return <Navigate to={`/alat/${encodeURIComponent(firstId)}`} replace />;
  }

  return (
    <>
      <title>Alat · Audit Energi UMKM</title>
      {/* On a phone the open device has its own top bar, so the title only stays for assistive technology */}
      <div className={id ? 'sr-only lg:not-sr-only' : undefined}>
        <PageHeader
          title="Alat"
          subtitle="Alat yang terpasang di usaha Anda"
          actions={<AddDeviceButton className={id ? 'hidden lg:inline-flex' : undefined} />}
        />
      </div>
      {!id && data && data.items.length > 0 ? <CatatProduksiFab /> : null}
      <div className="mt-3 lg:mt-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className={id ? 'hidden lg:block' : undefined}>
          {data ? (
            <AlatListView
              data={data}
              filter={filter}
              onFilterChange={(next) => {
                setSearchParams(next === 'all' ? {} : { status: next }, { replace: true });
              }}
              selectedId={id}
            />
          ) : query.isPending ? (
            <SkeletonCard label="Memuat daftar alat" />
          ) : (
            <Banner
              tone="danger"
              title="Daftar alat tidak bisa dimuat"
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
