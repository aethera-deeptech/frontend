import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import type { DeviceDetail } from '@/api/devices';
import { PowerChart } from '@/components/charts/power-chart';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { KeyValueRow } from '@/components/ui/key-value-row';
import { SectionCard } from '@/components/ui/section-card';
import { StatTile } from '@/components/ui/stat-tile';
import { StatusDot } from '@/components/ui/status-dot';
import { TextLink } from '@/components/ui/text-link';
import {
  businessNow,
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
import { energySinceCaption, formatTotalKwh } from '@/pages/alat/energy-text';

interface AlatDetailViewProps {
  detail: DeviceDetail;
  // The moment on which the screen is read, by the clock of the business, to tell whether an anomaly is from today. Tests set it.
  now?: Date;
  // The switch of a plug. It reads its own data, so the page gives it and the view stays a plain function of the device.
  switchCard?: ReactNode;
  // What happened on the page before, for example that the schedule was saved. It sits above the power card.
  notice?: { title: string; message: string };
}

const dash = '-';

export function AlatDetailView({
  detail,
  now = businessNow(),
  switchCard,
  notice,
}: AlatDetailViewProps) {
  const lastSeen = parseMoment(detail.lastSeenAt);
  const { search } = useLocation();

  return (
    <div className="flex flex-col gap-3">
      <div className="lg:hidden">
        <Button asChild size="lg">
          <Link to={`/alat${search}`}>Kembali</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-h2 text-text-heading min-w-0 break-words">{detail.name}</h2>
          <StatusDot status={detail.status} />
        </div>
        <p className="text-label text-text-2">{detail.room}</p>
      </div>

      {detail.status === 'anomali' && detail.anomaly ? (
        <Banner tone="danger" {...anomalyText(detail.name, detail.anomaly, now)} />
      ) : null}
      {detail.status === 'offline' ? (
        <Banner
          tone="warning"
          title="Alat tidak terhubung"
          message={`Terakhir terhubung ${formatDateTime(lastSeen)}. Periksa apakah alat dan WATTLINK Hub menyala dan saling dekat.`}
        />
      ) : null}

      {notice ? <Banner tone="info" {...notice} /> : null}

      <Card title="Daya sekarang">
        <p className="text-kpi text-text-heading">
          {detail.currentPowerW === null ? dash : formatWatts(detail.currentPowerW)}
        </p>
      </Card>

      {detail.energySince ? (
        <Card title="Total energi">
          <p className="text-kpi text-text-heading">{formatTotalKwh(detail.energySince.kwh)}</p>
          <p className="text-label text-text-2">{energySinceCaption(detail.energySince)}</p>
          <TextLink
            to={`/alat/${encodeURIComponent(detail.id)}/mulai-dari-nol${search}`}
            className="self-start"
          >
            Mulai dari nol
          </TextLink>
        </Card>
      ) : null}

      {switchCard}

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
          <Link to={`/alat/${encodeURIComponent(detail.id)}/ganti-nama${search}`}>Ganti nama</Link>
        </Button>
      </SectionCard>
    </div>
  );
}

// The words of the banner for each kind of anomaly. The title says when, by the clock of the business.
function anomalyText(
  name: string,
  anomaly: NonNullable<DeviceDetail['anomaly']>,
  now: Date,
): { title: string; message: string } {
  const at = parseMoment(anomaly.at);
  const when = `${isSameDay(at, now) ? 'hari ini' : formatDate(at)} pukul ${formatTime(at)}`;

  if (anomaly.kind === 'overload') {
    return {
      title: `Beban berlebih ${when}`,
      message: 'Alat melaporkan beban di atas batasnya. Periksa mesin yang terhubung ke alat.',
    };
  }
  if (anomaly.kind === 'degradation') {
    return {
      title: `Motor bekerja kurang efisien ${when}`,
      message:
        anomaly.powerFactor === undefined
          ? 'Alat melaporkan motor bekerja kurang efisien. Pertimbangkan pemeriksaan.'
          : `Faktor daya rata-rata ${formatFixed(anomaly.powerFactor, 2)}. Angka yang rendah berarti sebagian arus motor tidak terpakai untuk bekerja. Pertimbangkan pemeriksaan.`,
    };
  }
  return {
    title: `Daya naik mendadak ${when}`,
    message: `${name} sempat menarik ${formatWatts(anomaly.peakW)}, jauh di atas kisaran biasa. Periksa apakah ada beban berlebih. Anda yang memutuskan langkah berikutnya.`,
  };
}

// Whether a null lies between two readings, which breaks the line
function hasGap(points: readonly (number | null)[]): boolean {
  const first = points.findIndex((value) => value !== null);
  const last = points.findLastIndex((value) => value !== null);

  return first !== -1 && points.slice(first, last + 1).includes(null);
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
                // The power that the API sends is the peak of a surge only, so the other kinds show no number
                label:
                  detail.anomaly?.kind === 'surge'
                    ? `Anomali ${formatWatts(shownAnomaly.peak)}`
                    : 'Anomali',
              }
            : undefined
        }
        xLabels={['00:00', '12:00', '24:00']}
        yLabels={['0 W', formatWatts(pattern.yMaxW / 2), formatWatts(pattern.yMaxW)]}
        legend={[
          shownAnomaly
            ? 'Abu-abu berarti kisaran biasa. Merah berarti anomali.'
            : 'Abu-abu berarti kisaran biasa.',
          // A stretch without a reading is not a stretch of no power, so the line stops there and the legend says why. A device that is
          // younger than a day, or silent since the evening, only has nulls at an edge, where the line starts late or ends early and
          // nothing is broken, so only a null between two readings counts.
          hasGap(pattern.points) ? 'Garis terputus berarti tidak ada data dari alat.' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </SectionCard>
  );
}
