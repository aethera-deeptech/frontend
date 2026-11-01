import { Link } from 'react-router';

import type { RecommendationDecision, RecommendationDetail } from '@/api/recommendations';
import { Button } from '@/components/ui/button';
import { BeforeAfter } from '@/components/ui/before-after';
import { Card } from '@/components/ui/card';
import { SectionCard } from '@/components/ui/section-card';
import { Tag } from '@/components/ui/tag';
import { cn } from '@/lib/cn';
import { formatDateWithYear, formatPercent, formatRupiah } from '@/lib/format';
import { statusLabels, statusTones } from '@/pages/saran/recommendation-status';

interface SaranDetailViewProps {
  detail: RecommendationDetail;
  onDecision: (decision: RecommendationDecision) => void;
  // The buttons wait while a decision is being sent
  busy?: boolean;
}

export function SaranDetailView({ detail, onDecision, busy = false }: SaranDetailViewProps) {
  const { status } = detail;
  const waiting = status === 'pending' || status === 'deferred';

  return (
    <div className="flex flex-col gap-3">
      <div className="lg:hidden">
        <Button asChild size="lg">
          <Link to="/saran">Kembali</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-h2 text-text-heading">{detail.title}</h2>
        <div className="flex items-center gap-2">
          <Tag tone={statusTones[status]}>{statusLabels[status]}</Tag>
          <p className="text-label text-text-2">{detail.deviceName}</p>
        </div>
      </div>

      <Saving detail={detail} />

      {waiting ? <Decision detail={detail} onDecision={onDecision} busy={busy} /> : null}
      {status === 'applied' ? <Verification detail={detail} /> : null}
      {status === 'verified' ? <VerifiedResult detail={detail} /> : null}
      {status === 'rejected' ? <Rejected detail={detail} /> : null}

      <SectionCard heading="Mengapa disarankan">
        <p className="text-body text-text-1">{detail.why}</p>
      </SectionCard>

      {status === 'applied' || status === 'verified' ? <WhatToDo detail={detail} /> : null}

      <SectionCard heading="Cara hitung">
        {detail.howCalculated.map((paragraph) => (
          <p key={paragraph} className="text-body text-text-1">
            {paragraph}
          </p>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-body text-text-2">Tarif listrik</p>
          <Tag tone={detail.tariffIsDefault ? 'warning' : 'success'}>
            {detail.tariffIsDefault ? 'Tarif bawaan, belum Anda isi' : 'Tarif Anda'}
          </Tag>
        </div>
        {detail.tariffIsDefault ? (
          <Button asChild size="lg">
            <Link to="/lainnya/pengaturan/tarif">Isi tarif</Link>
          </Button>
        ) : null}
      </SectionCard>

      {status === 'applied' ? (
        <Button asChild size="lg">
          <Link to={`/saran/${encodeURIComponent(detail.id)}/batalkan`}>Batalkan penerapan</Link>
        </Button>
      ) : null}
    </div>
  );
}

function Saving({ detail }: { detail: RecommendationDetail }) {
  const verified = detail.status === 'verified' && detail.result;
  const tariff = detail.tariffIsDefault ? 'Memakai tarif bawaan' : 'Memakai tarif Anda';

  if (verified) {
    const before = detail.result?.beforeKwh ?? 0;
    const after = detail.result?.afterKwh ?? 0;
    const percent = before > 0 ? (1 - after / before) * 100 : 0;

    return (
      <Card className="bg-bg-success-muted">
        <p className="text-label text-text-2">Energi per potong bengkel turun</p>
        <p className="flex items-baseline gap-2">
          <span className="text-kpi text-text-success">{formatPercent(percent)}</span>
          <span className="text-body text-text-2">dalam {detail.result?.afterDays} hari</span>
        </p>
        <div className="flex items-start gap-2">
          <Tag>Perkiraan</Tag>
          <p className="text-body text-text-2">
            sekitar {formatRupiah(detail.savingPerMonthRp)} per bulan,{' '}
            {detail.tariffIsDefault ? 'tarif bawaan' : 'tarif Anda'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-label text-text-2">Perkiraan hemat</p>
      <p className="flex items-baseline gap-2">
        <span className="text-kpi text-text-heading">{formatRupiah(detail.savingPerMonthRp)}</span>
        <span className="text-body text-text-2">per bulan</span>
      </p>
      <div className="flex items-start gap-2">
        <Tag>Perkiraan</Tag>
        <p className="text-body text-text-2">{tariff}, belum diverifikasi</p>
      </div>
    </Card>
  );
}

function WhatToDo({ detail }: { detail: RecommendationDetail }) {
  return (
    <SectionCard heading="Yang perlu Anda lakukan">
      <p className="text-body text-text-1">{detail.whatToDo}</p>
    </SectionCard>
  );
}

function Decision({
  detail,
  onDecision,
  busy,
}: {
  detail: RecommendationDetail;
  onDecision: (decision: RecommendationDecision) => void;
  busy: boolean;
}) {
  const deferred = detail.status === 'deferred';

  return (
    <>
      <SectionCard heading="Yang perlu Anda lakukan">
        <p className="text-body text-text-1">
          {deferred
            ? `Anda menunda saran ini dan saran tetap ada sampai Anda memutuskan. ${detail.whatToDo}`
            : detail.whatToDo}
        </p>
      </SectionCard>
      <Button
        kind="accent"
        size="lg"
        disabled={busy}
        onClick={() => {
          onDecision('apply');
        }}
      >
        Terapkan
      </Button>
      <div className={cn('grid gap-2', deferred ? 'grid-cols-1' : 'grid-cols-2')}>
        {deferred ? null : (
          <Button
            size="lg"
            disabled={busy}
            onClick={() => {
              onDecision('defer');
            }}
          >
            Nanti
          </Button>
        )}
        <Button
          size="lg"
          disabled={busy}
          onClick={() => {
            onDecision('reject');
          }}
        >
          Tolak
        </Button>
      </div>
      <p className="text-body text-text-2">
        Setelah Anda menandai saran ini diterapkan, sistem membandingkan energi per potong selama 14
        hari.
      </p>
    </>
  );
}

function Verification({ detail }: { detail: RecommendationDetail }) {
  const needed = detail.verification?.neededDays ?? 14;

  return (
    <SectionCard heading="Masa verifikasi">
      <p className="text-body text-text-1">
        {detail.appliedAt
          ? `Anda menerapkan saran ini pada ${formatDateWithYear(new Date(detail.appliedAt))}. `
          : ''}
        Sistem membandingkan energi per potong sebelum dan sesudah. Hasilnya muncul setelah {needed}{' '}
        hari.
      </p>
      <BeforeAfter
        status="collecting"
        headline="Verifikasi sedang berjalan"
        collectedDays={detail.verification?.collectedDays ?? 0}
        neededDays={needed}
      />
    </SectionCard>
  );
}

function VerifiedResult({ detail }: { detail: RecommendationDetail }) {
  const result = detail.result;

  return (
    <SectionCard heading="Hasil verifikasi">
      <p className="text-body text-text-1">
        {detail.appliedAt
          ? `Anda menerapkan saran ini pada ${formatDateWithYear(new Date(detail.appliedAt))}. `
          : ''}
        Energi per potong untuk seluruh bengkel dibandingkan dengan {result?.beforeDays} hari data
        sebelum saran diterapkan dan {result?.afterDays} hari sesudahnya. Angka ini untuk seluruh
        bengkel. Saran lain dan perubahan produksi di periode yang sama ikut memengaruhinya.
      </p>
      {result ? (
        <BeforeAfter
          status="verified"
          beforeKwh={result.beforeKwh}
          afterKwh={result.afterKwh}
          unit="kWh per potong"
        />
      ) : null}
    </SectionCard>
  );
}

function Rejected({ detail }: { detail: RecommendationDetail }) {
  return (
    <SectionCard heading="Keputusan Anda">
      <p className="text-body text-text-1">
        {detail.rejectedAt
          ? `Anda menolak saran ini pada ${formatDateWithYear(new Date(detail.rejectedAt))}. `
          : ''}
        Sistem tidak menerapkannya dan tidak mengubah apa pun pada {detail.deviceName.toLowerCase()}
        .
      </p>
      <Button asChild size="lg">
        <Link to="/saran">Kembali ke daftar</Link>
      </Button>
    </SectionCard>
  );
}
