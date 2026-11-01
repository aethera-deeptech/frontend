import { Link, useSearchParams } from 'react-router';

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
  const asked = searchParams.get('periode');
  // A month that is not written as YYYY-MM, for example from an old or a typed link, is the same as no month
  const requested = asked !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) ? asked : undefined;
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
                <div className="flex flex-col gap-2">
                  <Button
                    size="lg"
                    onClick={() => {
                      void query.refetch();
                    }}
                  >
                    Coba lagi
                  </Button>
                  {requested ? (
                    <Button asChild size="lg">
                      <Link to="/laporan">Lihat bulan berjalan</Link>
                    </Button>
                  ) : null}
                </div>
              }
            />
          )}
        </div>
      )}
    </>
  );
}
