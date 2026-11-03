import { useState } from 'react';

import { ApiError } from '@/api/client';
import { hasNoRelay, useRelay, useSendRelay, type Relay, type RelayAction } from '@/api/relay';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { formatTime, parseMoment } from '@/lib/format';
import { useCountdown } from '@/pages/auth/use-countdown';

const actionLabels: Record<RelayAction, string> = { on: 'Nyalakan', off: 'Matikan' };
const doneLabels: Record<RelayAction, string> = { on: 'dinyalakan', off: 'dimatikan' };
const stateTags = {
  on: { tone: 'success', text: 'Menyala' },
  off: { tone: 'muted', text: 'Mati' },
  unknown: { tone: 'muted', text: 'Belum diketahui' },
} as const;

// A result stays on the screen for as long as the command could have waited, and a minute more for clocks that differ
const resultLifeMs = 11 * 60_000;

interface RelayCardViewProps {
  relay: Relay;
  // The device does not answer, so a command waits for it
  offline: boolean;
  // The moment on which the screen is read, by the clock of the business, to tell whether a result is new
  now: Date;
  sending: boolean;
  // The command did not reach the service
  sendFailed: boolean;
  // Seconds until the service takes a command again, after it said that there were too many
  waitSeconds: number;
  onSend: (action: RelayAction) => void;
}

export function RelayCardView({
  relay,
  offline,
  now,
  sending,
  sendFailed,
  waitSeconds,
  onSend,
}: RelayCardViewProps) {
  const tag = stateTags[relay.state];
  const actions: RelayAction[] =
    relay.state === 'on' ? ['off'] : relay.state === 'off' ? ['on'] : ['on', 'off'];
  const blocked = sending || waitSeconds > 0 || relay.pending !== null;
  const scheduled = relay.last?.status === 'applied' && relay.last.source === 'schedule';

  return (
    <Card title="Saklar">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone={tag.tone}>{tag.text}</Tag>
      </div>
      <p className="text-label text-text-2">
        {relay.state === 'unknown' || relay.reportedAt === null
          ? 'Alat belum pernah melapor status saklar.'
          : `Status dari alat pukul ${formatTime(parseMoment(relay.reportedAt))}`}
      </p>
      {scheduled && relay.last ? (
        <p className="text-label text-text-2">
          {`Terakhir diganti oleh jadwal pukul ${formatTime(parseMoment(relay.last.at))}.`}
        </p>
      ) : null}

      {waitSeconds > 0 ? (
        <Banner
          tone="warning"
          title="Terlalu banyak perintah"
          message={`Semua alat Anda sudah menerima terlalu banyak perintah dalam satu jam. Coba lagi dalam ${Math.ceil(waitSeconds / 60).toString()}\u00a0menit.`}
        />
      ) : null}
      {sendFailed ? (
        <Banner
          tone="danger"
          title="Perintah belum terkirim"
          message="Periksa sambungan Anda, lalu coba lagi."
        />
      ) : null}
      {relay.pending ? (
        <Banner
          tone="info"
          title="Menunggu alat"
          message={`Perintah ${actionLabels[relay.pending.action]} dikirim. Alat menjalankannya saat terhubung ke WATTLINK Hub, paling lama sampai ${formatTime(parseMoment(relay.pending.expiresAt))}.`}
        />
      ) : (
        <Result relay={relay} now={now} />
      )}

      {offline ? (
        <p className="text-body text-text-1">
          {`Alat tidak terhubung. Jika Anda menekan ${actions.map((action) => actionLabels[action]).join(' atau ')}, perintah menunggu sampai alat terhubung kembali, paling lama 10 menit.`}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action}
            size="lg"
            kind={action === 'on' ? 'accent' : 'neutral'}
            aria-disabled={blocked || undefined}
            onClick={() => {
              if (!blocked) {
                onSend(action);
              }
            }}
          >
            {actionLabels[action]}
          </Button>
        ))}
      </div>
    </Card>
  );
}

// The newest command that ended, for as long as it is news
function Result({ relay, now }: { relay: Relay; now: Date }) {
  const last = relay.last;

  if (!last) {
    return null;
  }
  const at = parseMoment(last.at);
  const age = now.getTime() - at.getTime();

  if (age > resultLifeMs) {
    return null;
  }
  if (last.status === 'applied') {
    return (
      <Banner
        tone="info"
        title={`Colokan sudah ${doneLabels[last.action]}`}
        message={`Pukul ${formatTime(at)}.`}
      />
    );
  }
  if (last.status === 'failed') {
    return (
      <Banner
        tone="danger"
        title="Colokan belum berganti"
        message="WATTLINK Hub tidak bisa menjalankan perintah. Coba lagi."
      />
    );
  }
  const still =
    relay.state === 'unknown'
      ? ''
      : ` Menurut status terakhir, colokan masih ${relay.state === 'on' ? 'menyala' : 'mati'}.`;

  return (
    <Banner
      tone="warning"
      title="Perintah tidak sampai"
      message={`Alat tidak menerima perintah dalam 10 menit.${still} Periksa sambungan WATTLINK Hub, lalu coba lagi.`}
    />
  );
}

// The card of a plug on the page of a device. A clamp has no switch, so the card is left out for it.
export function RelayCard({
  deviceId,
  offline,
  now,
}: {
  deviceId: string;
  offline: boolean;
  now: Date;
}) {
  const query = useRelay(deviceId);
  const send = useSendRelay(deviceId);
  const [readyAt, setReadyAt] = useState(0);
  const waitSeconds = useCountdown(readyAt);

  if (query.data) {
    const tooMany = send.error instanceof ApiError && send.error.status === 429;

    return (
      <RelayCardView
        relay={query.data}
        offline={offline}
        now={now}
        sending={send.isPending}
        sendFailed={send.isError && !tooMany}
        waitSeconds={waitSeconds}
        onSend={(action) => {
          send.mutate(action, {
            onError: (error) => {
              if (error instanceof ApiError && error.status === 429) {
                setReadyAt(Date.now() + (error.retryAfterSeconds ?? 60) * 1000);
              }
            },
          });
        }}
      />
    );
  }
  if (query.isPending || hasNoRelay(query.error)) {
    return null;
  }

  return (
    <Card title="Saklar">
      <Banner
        tone="danger"
        title="Saklar tidak bisa dimuat"
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
    </Card>
  );
}
