import { Link } from 'react-router';

import type { DeviceDetail } from '@/api/devices';
import { PowerChart } from '@/components/charts/power-chart';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { KeyValueRow } from '@/components/ui/key-value-row';
import { SectionCard } from '@/components/ui/section-card';
import { StatTile } from '@/components/ui/stat-tile';
import { StatusDot } from '@/components/ui/status-dot';
import {
  formatDate,
  formatDateTime,
  formatFixed,
  formatNumber,
  formatTime,
  formatWatts,
  isSameDay,
  parseMoment,
} from '@/lib/format';
import { signalLabels } from '@/pages/alat/device-status';

interface AlatDetailViewProps {
  detail: DeviceDetail;
  // The moment on which the screen is read, to tell whether an anomaly is from today. Tests set it.
  now?: Date;
}

const dash = '-';

export function AlatDetailView({ detail, now = new Date() }: AlatDetailViewProps) {
  const lastSeen = parseMoment(detail.lastSeenAt);

  return (
    <div className="flex flex-col gap-3">
      <div className="lg:hidden">
        <Button asChild size="lg">
          <Link to="/alat">Kembali</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-h2 text-text-heading">{detail.name}</h2>
          <StatusDot status={detail.status} />
        </div>
        <p className="text-label text-text-2">{detail.room}</p>
      </div>

      {detail.status === 'anomali' && detail.anomaly ? (
        <Banner
          tone="danger"
          title={`Daya naik mendadak ${isSameDay(parseMoment(detail.anomaly.at), now) ? 'hari ini' : formatDate(parseMoment(detail.anomaly.at))} pukul ${formatTime(parseMoment(detail.anomaly.at))}`}
          message={`${detail.name} sempat menarik ${formatWatts(detail.anomaly.peakW)}, jauh di atas kisaran biasa. Periksa apakah ada beban berlebih. Anda yang memutuskan langkah berikutnya.`}
        />
      ) : null}
      {detail.status === 'offline' ? (
        <Banner
          tone="warning"
          title="Alat tidak terhubung"
          message={`Terakhir terhubung ${formatDateTime(lastSeen)}. Periksa apakah colokan menyala dan alat terhubung ke Wi-Fi.`}
        />
      ) : null}

      <Card title="Daya sekarang">
        <p className="text-kpi text-text-heading">
          {detail.currentPowerW === null ? dash : formatWatts(detail.currentPowerW)}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="Hari ini"
          value={detail.todayKwh === null ? dash : `${formatFixed(detail.todayKwh, 1)} kWh`}
        />
        <StatTile
          label="Bulan ini"
          value={detail.monthKwh === null ? dash : `${formatNumber(detail.monthKwh, 0)} kWh`}
        />
        <StatTile
          label="Jam nyala"
          value={detail.onHoursToday === null ? dash : `${formatFixed(detail.onHoursToday, 1)} jam`}
        />
        <StatTile
          label="Daya siaga"
          value={detail.standbyW === null ? dash : formatWatts(detail.standbyW)}
        />
      </div>

      <PowerSection detail={detail} />

      <SectionCard heading="Info alat">
        <dl className="flex flex-col gap-2">
          <KeyValueRow label="Jenis" value={detail.kindLabel} />
          <KeyValueRow label="Terakhir terhubung" value={formatDateTime(lastSeen)} />
          <KeyValueRow label="Kualitas sinyal" value={signalLabels[detail.signal]} />
        </dl>
        <Button asChild size="lg" className="self-start">
          <Link to={`/alat/${encodeURIComponent(detail.id)}/ganti-nama`}>Ganti nama</Link>
        </Button>
      </SectionCard>
    </div>
  );
}

function PowerSection({ detail }: { detail: DeviceDetail }) {
  const pattern = detail.powerPattern;

  if (!pattern) {
    return (
      <SectionCard heading="Daya 24 jam terakhir">
        <p className="text-body text-text-1">
          Belum ada data baru. Grafik muncul lagi saat alat terhubung.
        </p>
      </SectionCard>
    );
  }

  const { anomaly } = pattern;
  const peak = detail.anomaly?.peakW;
  const shownAnomaly =
    anomaly !== undefined && peak !== undefined ? { ...anomaly, peak } : undefined;

  return (
    <SectionCard heading="Pola daya satu hari">
      <PowerChart
        label={`Daya ${detail.name.toLowerCase()} dalam satu hari${shownAnomaly ? ', ada anomali' : ''}`}
        points={pattern.points}
        yMax={pattern.yMaxW}
        expected={pattern.expected}
        anomaly={
          shownAnomaly
            ? {
                from: shownAnomaly.from,
                to: shownAnomaly.to,
                label: `Anomali ${formatWatts(shownAnomaly.peak)}`,
              }
            : undefined
        }
        xLabels={['00:00', '12:00', '24:00']}
        yLabels={['0 W', formatWatts(pattern.yMaxW / 2), formatWatts(pattern.yMaxW)]}
        legend={
          shownAnomaly
            ? 'Abu-abu berarti kisaran biasa. Merah berarti anomali.'
            : 'Abu-abu berarti kisaran biasa.'
        }
      />
    </SectionCard>
  );
}
