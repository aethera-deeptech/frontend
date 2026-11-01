import type { ReadyReport, ReportData, ReportSaving } from '@/api/reports';
import { BarChart } from '@/components/charts/bar-chart';
import { PageHeader } from '@/components/layout/page-header';
import { Banner } from '@/components/ui/banner';
import { BeforeAfter } from '@/components/ui/before-after';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { Tag } from '@/components/ui/tag';
import { formatDate, formatMonthYear, formatNumber, formatRupiah, parseMoment } from '@/lib/format';
import type { ReportDownload } from '@/pages/laporan/use-report-download';

interface LaporanViewProps {
  data: ReportData;
  // The month that is chosen. It differs from data.period while the answer for it is loading.
  period: string;
  onPeriodChange: (period: string) => void;
  download: ReportDownload;
  onDownload: () => void;
}

export function LaporanView({
  data,
  period,
  onPeriodChange,
  download,
  onDownload,
}: LaporanViewProps) {
  const loading = period !== data.period;

  return (
    <div className="flex flex-col gap-3 lg:gap-6">
      <PageHeader title="Laporan" />
      {download.status === 'done' ? (
        <Banner
          tone="info"
          title="Laporan diunduh"
          message={`Berkas ${download.fileName} sudah diunduh.`}
          action={
            <Button size="lg" asChild>
              <a href={download.url} target="_blank" rel="noreferrer">
                Buka laporan
              </a>
            </Button>
          }
        />
      ) : null}
      {download.status === 'failed' ? (
        <Banner
          tone="danger"
          title="Laporan belum terunduh"
          message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
          action={
            <Button size="lg" onClick={onDownload}>
              Coba lagi
            </Button>
          }
        />
      ) : null}
      {data.phase === 'no-devices' ? (
        <EmptyState
          headline="Laporan belum tersedia"
          message="Laporan muncul setelah 7 hari data terkumpul. Belum ada alat? Tambah alat dulu."
        />
      ) : null}
      {data.phase === 'collecting' ? (
        <EmptyState
          headline="Laporan belum tersedia"
          message={`Sistem sedang mengumpulkan data awal (hari ke-${data.collectedDays.toString()} dari ${data.neededDays.toString()}). Laporan muncul setelah ${data.neededDays.toString()} hari data terkumpul.`}
        />
      ) : null}
      {data.phase === 'ready' ? (
        <div aria-busy={loading} className={loading ? 'opacity-60' : undefined}>
          <div className="flex flex-col gap-3 lg:gap-6">
            <PeriodSelect data={data} period={period} onChange={onPeriodChange} />
            <Ready data={data} download={download} onDownload={onDownload} loading={loading} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PeriodSelect({
  data,
  period,
  onChange,
}: {
  data: ReadyReport;
  period: string;
  onChange: (period: string) => void;
}) {
  return (
    <Select
      label="Periode"
      value={period}
      onValueChange={onChange}
      options={data.periods.map((value) => ({
        value,
        label:
          value === data.period && data.through
            ? `${formatMonthYear(value)}, sampai ${formatDate(parseMoment(data.through))}`
            : formatMonthYear(value),
      }))}
    />
  );
}

function Ready({
  data,
  download,
  onDownload,
  loading,
}: {
  data: ReadyReport;
  download: ReportDownload;
  onDownload: () => void;
  // The old month stays on the screen while the next one loads, so the file of the new month must wait
  loading: boolean;
}) {
  const bill = formatRupiah(data.billRp);
  const billLabel = data.through
    ? `Tagihan sampai ${formatDate(parseMoment(data.through))} ${bill}`
    : `Tagihan ${formatMonthYear(data.period)} ${bill}`;

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <Card title="Hemat per bulan">
        <SavingRows saving={data.saving} />
        <p className="text-label text-text-2">
          Terverifikasi berarti energinya sudah dicek dari data alat. Rupiah memakai tarif bawaan
          sampai Anda mengisi tarif. Ketiganya dihitung terpisah.
        </p>
      </Card>
      <div className="flex flex-col gap-3 lg:gap-6">
        {data.energyPerPiece ? (
          <Card title="Energi per potong, seluruh bengkel">
            {data.energyPerPiece.status === 'collecting' ? (
              <BeforeAfter
                status="collecting"
                collectedDays={data.energyPerPiece.collectedDays}
                neededDays={data.energyPerPiece.neededDays}
                message="Catat produksi harian agar energi per potong bisa dihitung. Hasil hemat muncul 14 hari setelah Anda menandai saran diterapkan."
              />
            ) : (
              <BeforeAfter
                status={data.energyPerPiece.status}
                beforeKwh={data.energyPerPiece.beforeKwh}
                afterKwh={data.energyPerPiece.afterKwh}
                unit="kWh per potong"
              />
            )}
          </Card>
        ) : null}
        <Card
          title={
            data.through
              ? 'Energi per alat bulan ini, 4 teratas (kWh)'
              : 'Energi per alat, 4 teratas (kWh)'
          }
        >
          <BarChart
            aria-label="Energi per alat"
            items={data.topDevices.map((device) => ({
              label: device.name,
              value: device.kwh,
              display: formatNumber(device.kwh, 1),
            }))}
          />
        </Card>
        <Button size="lg" onClick={onDownload} disabled={download.status === 'busy' || loading}>
          {download.status === 'busy' ? 'Menyiapkan laporan' : 'Unduh laporan (PDF)'}
        </Button>
        <p className="text-label text-text-2">
          {billLabel}. Termasuk beban yang belum terpantau alat.
        </p>
      </div>
    </div>
  );
}

function SavingRows({ saving }: { saving: ReportSaving }) {
  const { verified, applied, estimate } = saving;
  const suggestions = (count: number) => `${count.toString()} saran`;

  return (
    <ul className="flex flex-col gap-3">
      <SavingRow
        tone="success"
        tag="Terverifikasi"
        line={
          verified.count > 0
            ? `Sudah dicek ${verified.checkedDays.toString()} hari, ${suggestions(verified.count)}`
            : 'Belum ada saran yang dicek'
        }
        rupiah={verified.rp}
      />
      <SavingRow
        tone="warning"
        tag="Diterapkan"
        line={
          applied.count > 0
            ? `Sedang dicek, hari ke-${applied.day.toString()} dari ${applied.neededDays.toString()}, ${suggestions(applied.count)}`
            : 'Belum ada saran yang diterapkan'
        }
        rupiah={applied.rp}
      />
      <SavingRow
        tone="muted"
        tag="Perkiraan"
        line={
          estimate.count > 0
            ? `Menunggu keputusan Anda, ${suggestions(estimate.count)}`
            : 'Belum ada saran pada periode ini'
        }
        rupiah={estimate.rp}
      />
    </ul>
  );
}

function SavingRow({
  tone,
  tag,
  line,
  rupiah,
}: {
  tone: 'success' | 'warning' | 'muted';
  tag: string;
  line: string;
  rupiah: number;
}) {
  return (
    <li className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col items-start gap-1">
        <Tag tone={tone}>{tag}</Tag>
        <p className="text-label text-text-2">{line}</p>
      </div>
      <p className="text-h2 text-text-heading shrink-0">{formatRupiah(rupiah)}</p>
    </li>
  );
}
