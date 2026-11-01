import { ForecastChart } from '@/components/charts/forecast-chart';
import { Card } from '@/components/ui/card';
import { daysInMonth, formatDate, formatRupiah, formatRupiahJuta, isSameDay } from '@/lib/format';
import type { ReadyBeranda } from '@/api/beranda';

interface BillCardProps {
  bill: ReadyBeranda['bill'];
  asOf: Date;
  // The moment on which the screen is read, to tell whether the data is from today
  now: Date;
}

export function BillCard({ bill, asOf, now }: BillCardProps) {
  const days = daysInMonth(asOf);
  const monthStart = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
  const monthEnd = new Date(asOf.getFullYear(), asOf.getMonth(), days);
  const today = isSameDay(asOf, now);
  const until = today ? 'hari ini' : formatDate(asOf);
  const soFar = bill.dailyTotalRp.at(-1) ?? 0;
  // The axis also holds the bill so far, so the line is never cut at the top
  const yMax =
    Math.max(
      Math.ceil(Math.max(bill.projectedTotalRp, bill.potentialTotalRp, soFar) / 1_000_000),
      1,
    ) * 1_000_000;
  const saving = bill.projectedTotalRp - bill.potentialTotalRp;

  return (
    <Card title="Perkiraan tagihan bulan ini">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-kpi text-text-heading">{formatRupiah(bill.projectedTotalRp)}</span>
        <span className="text-label text-text-2">perkiraan sampai {formatDate(monthEnd)}</span>
      </p>
      <p className="text-body text-text-2">
        Selisih garis putus-putus dan garis titik-titik adalah potensi hemat {formatRupiah(saving)}{' '}
        per bulan. Tagihan termasuk beban yang belum terpantau alat.
      </p>
      <ForecastChart
        label="Grafik tagihan listrik bulan ini"
        billPoints={bill.dailyTotalRp}
        days={days}
        projectedTotal={bill.projectedTotalRp}
        potentialTotal={bill.potentialTotalRp}
        yMax={yMax}
        yLabels={[formatRupiahJuta(0), formatRupiahJuta(yMax / 2), formatRupiahJuta(yMax)]}
        xLabels={{ start: formatDate(monthStart), today: today ? 'Hari ini' : formatDate(asOf) }}
        legend={[
          { line: 'solid', text: `Tagihan sampai ${until}, ${formatRupiah(soFar)}` },
          {
            line: 'dashed',
            muted: true,
            text: `Perkiraan tanpa saran, ${formatRupiah(bill.projectedTotalRp)}`,
          },
          {
            line: 'dotted',
            text: `Jika saran diterapkan sejak ${formatDate(monthStart)}, ${formatRupiah(bill.potentialTotalRp)}`,
          },
        ]}
      />
    </Card>
  );
}
