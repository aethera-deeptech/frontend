import { useSearchParams } from 'react-router';

import { useReport } from '@/api/reports';
import { PageHeader } from '@/components/layout/page-header';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { LaporanView } from '@/pages/laporan/laporan-view';
import { useReportDownload } from '@/pages/laporan/use-report-download';

// The month lives in the address (?periode=2026-09), so the back button and a shared link keep it.
export function LaporanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('periode') ?? undefined;
  const query = useReport(requested);
  const download = useReportDownload();
  const data = query.data;
  const period = requested ?? data?.period ?? '';

  return (
    <>
      <title>Laporan · Audit Energi UMKM</title>
      {data ? (
        <LaporanView
          data={data}
          period={period}
          onPeriodChange={(next) => {
            download.reset();
            setSearchParams({ periode: next });
          }}
          download={download.state}
          onDownload={() => {
            download.start(period);
          }}
        />
      ) : (
        <div className="flex flex-col gap-3 lg:gap-6">
          <PageHeader title="Laporan" />
          {query.isPending ? (
            <SkeletonCard label="Memuat laporan" />
          ) : (
            <Banner
              tone="danger"
              title="Laporan tidak bisa dimuat"
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
