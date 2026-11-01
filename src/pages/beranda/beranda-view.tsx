import type { BerandaData, CollectingBeranda, ReadyBeranda } from '@/api/beranda';
import type { RecommendationDecision } from '@/api/recommendations';
import { BarChart } from '@/components/charts/bar-chart';
import { PageHeader } from '@/components/layout/page-header';
import { Banner } from '@/components/ui/banner';
import { BeforeAfter } from '@/components/ui/before-after';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { RecommendationCard } from '@/components/ui/recommendation-card';
import { Tag } from '@/components/ui/tag';
import type { ConnectionState } from '@/hooks/use-connection';
import {
  formatDateTime,
  formatDayTime,
  formatDateWithYear,
  formatNumber,
  formatRupiah,
} from '@/lib/format';
import { BillCard } from '@/pages/beranda/bill-card';

interface BerandaViewProps {
  data: BerandaData;
  connection: ConnectionState;
  onDecision: (id: string, decision: RecommendationDecision) => void;
  // The id of the tip whose decision is being sent
  busyId?: string;
  // The moment on which the screen is read. Tests set it, the app leaves it out.
  now?: Date;
}

const tagTones = {
  anomali: 'danger',
  offline: 'muted',
  siaga: 'warning',
  nyala: 'success',
  mati: 'muted',
} as const;

const tagLabels = {
  anomali: 'Anomali',
  offline: 'Offline',
  siaga: 'Siaga',
  nyala: 'Nyala',
  mati: 'Mati',
} as const;

export function BerandaView({
  data,
  connection,
  onDecision,
  busyId,
  now = new Date(),
}: BerandaViewProps) {
  const asOf = new Date(data.asOf);

  return (
    <div className="flex flex-col gap-3 lg:gap-6">
      <PageHeader title={data.businessName} subtitle={`Ringkasan ${formatDateWithYear(asOf)}`} />
      {connection === 'offline' ? (
        <Banner
          tone="warning"
          title="Data belum diperbarui"
          message={`Terakhir diperbarui ${formatDateTime(asOf)}. Angka di bawah belum diperbarui dan akan menyusul setelah koneksi internet Anda terhubung lagi.`}
        />
      ) : null}
      {connection === 'catching-up' ? (
        <Banner
          tone="info"
          title="Data sedang menyusul"
          message="Koneksi internet Anda sudah terhubung lagi. Angka akan diperbarui saat semua data masuk."
        />
      ) : null}
      {data.phase === 'no-devices' ? (
        <EmptyState
          headline="Belum ada alat terpasang"
          message="Pasang colokan pintar atau penjepit arus agar sistem bisa menghitung energi dan menyarankan penghematan dalam rupiah."
        />
      ) : null}
      {data.phase === 'collecting' ? <Collecting data={data} /> : null}
      {data.phase === 'ready' ? (
        <Ready
          data={data}
          asOf={asOf}
          connection={connection}
          onDecision={onDecision}
          busyId={busyId}
          now={now}
        />
      ) : null}
    </div>
  );
}

function Collecting({ data }: { data: CollectingBeranda }) {
  return (
    <>
      <Banner
        tone="info"
        title="Sistem sedang mengumpulkan data awal"
        message={`Saran pertama muncul setelah ${data.neededDays.toString()} hari data.`}
      />
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <Card title="Energi per alat sejak data masuk, 4 teratas (kWh)">
          <TopDevices devices={data.topDevices} />
        </Card>
        <Card title="Energi per potong, seluruh bengkel">
          <BeforeAfter
            status="collecting"
            collectedDays={data.collectedDays}
            neededDays={data.neededDays}
            message="Catat produksi harian agar energi per potong bisa dihitung. Hasil hemat muncul 14 hari setelah Anda menandai saran diterapkan."
          />
        </Card>
      </div>
    </>
  );
}

function TopDevices({ devices }: { devices: CollectingBeranda['topDevices'] }) {
  return (
    <BarChart
      aria-label="Energi per alat"
      items={devices.map((device) => ({
        label: device.name,
        value: device.kwh,
        display: formatNumber(device.kwh, 1),
      }))}
    />
  );
}

interface ReadyProps {
  data: ReadyBeranda;
  asOf: Date;
  connection: ConnectionState;
  onDecision: BerandaViewProps['onDecision'];
  busyId?: string;
  now: Date;
}

function Ready({ data, asOf, connection, onDecision, busyId, now }: ReadyProps) {
  const total = Object.values(data.statusCounts).reduce((sum, value) => sum + value, 0);
  const caption =
    connection === 'offline'
      ? `Status ${total.toString()} alat per ${formatDayTime(asOf)}`
      : connection === 'catching-up'
        ? `Status ${total.toString()} alat, sedang diperbarui`
        : `Status ${total.toString()} alat`;
  const statuses = (Object.keys(tagLabels) as (keyof typeof tagLabels)[]).filter(
    (status) => data.statusCounts[status] > 0,
  );

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <div className="flex flex-col gap-3">
        <KpiCard
          label="Perkiraan hemat per bulan"
          value={formatRupiah(data.savingPerMonthRp)}
          trailing={`dari ${data.recommendations.length.toString()} saran`}
          caption={caption}
          tags={statuses.map((status) => (
            <Tag key={status} tone={tagTones[status]}>
              {tagLabels[status]} {data.statusCounts[status]}
            </Tag>
          ))}
        />
        {data.recommendations.length > 0 ? (
          <>
            <h2 className="text-h2 text-text-heading">Saran</h2>
            {data.recommendations.map((item) => (
              <RecommendationCard
                key={item.id}
                title={item.title}
                saving={`Hemat sekitar ${formatRupiah(item.savingPerMonthRp)} per bulan`}
                deviceName={item.deviceName}
                busy={busyId === item.id}
                onApply={() => {
                  onDecision(item.id, 'apply');
                }}
                onDefer={() => {
                  onDecision(item.id, 'defer');
                }}
              />
            ))}
          </>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 lg:gap-6">
        <BillCard bill={data.bill} asOf={asOf} now={now} />
        <Card title="Energi per alat bulan ini, 4 teratas (kWh)">
          <TopDevices devices={data.topDevices} />
        </Card>
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
      </div>
    </div>
  );
}
