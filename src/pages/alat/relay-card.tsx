import { useEffect, useState } from 'react';

import { ApiError } from '@/api/client';
import { hasNoRelay, useRelay, useSendRelay, type Relay, type RelayAction } from '@/api/relay';
import { Banner } from '@/components/ui/banner';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { formatTime, parseMoment } from '@/lib/format';
import { ScheduleCard } from '@/pages/alat/schedule-card';
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
  // The result appeared while this screen was open, so it is news whatever the clocks say
  resultIsNew?: boolean;
  sending: boolean;
  // The command did not reach the service
  sendFailed: boolean;
  // What the command failed with, so a busy service gets its own banner
  sendError?: unknown;
  // Seconds until the service takes a command again, after it said that there were too many
  waitSeconds: number;
  onSend: (action: RelayAction) => void;
}

export function RelayCardView({
  relay,
  offline,
  now,
  resultIsNew = false,
  sending,
  sendFailed,
  sendError,
  waitSeconds,
  onSend,
}: RelayCardViewProps) {
  const tag = stateTags[relay.state];
  const actions: RelayAction[] =
    relay.state === 'on' ? ['off'] : relay.state === 'off' ? ['on'] : ['on', 'off'];
  const blocked = sending || waitSeconds > 0 || relay.pending !== null;
  const cut = relay.state === 'off' && Boolean(relay.cutByDevice) && !relay.pending;
  // After a cut the last switch by a schedule is old news, and the line would read as the cause of the off state
  const scheduled = !cut && relay.last?.status === 'applied' && relay.last.source === 'schedule';

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
      {cut ? (
        // The anomaly banner of the page usually says when, so this says what it means for the switch
        <p className="text-body text-text-1">
          Colokan kemungkinan mati sendiri. Periksa mesin dulu, lalu nyalakan lagi. Colokan bisa
          mati sendiri lagi jika beban masih terlalu tinggi.
        </p>
      ) : null}
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
        <ErrorBanner
          error={sendError}
          kind="write"
          busyTitle="Belum pasti terkirim"
          busyMessage="Sistem sedang sibuk. Perintah mungkin sudah terkirim. Periksa status colokan, lalu coba lagi jika perlu."
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
        <Result relay={relay} now={now} isNew={resultIsNew} />
      )}

      {/* The buttons are blocked while a command waits, so the banner above already says what happens to it */}
      {relay.pending ? null : offline ? (
        <p className="text-body text-text-1">
          {`Alat tidak terhubung. Jika Anda menekan ${actions.map((action) => actionLabels[action]).join(' atau ')}, perintah menunggu sampai alat terhubung kembali, paling lama 10 menit.`}
        </p>
      ) : relay.gatewayOnline === false ? (
        // The plug has not said that it is gone, but the hub that carries its commands is away
        <p className="text-body text-text-1">
          {`WATTLINK Hub tidak terhubung. Jika Anda menekan ${actions.map((action) => actionLabels[action]).join(' atau ')}, perintah menunggu sampai hub terhubung kembali, paling lama 10\u00a0menit.`}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
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
function Result({ relay, now, isNew }: { relay: Relay; now: Date; isNew: boolean }) {
  const last = relay.last;

  if (!last) {
    return null;
  }
  const at = parseMoment(last.at);
  const age = now.getTime() - at.getTime();

  // The clock of a phone can be far off, so a result that this screen saw appear stays until the screen closes
  if (!isNew && age > resultLifeMs) {
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
  const { reset: resetSend } = send;
  const [readyAt, setReadyAt] = useState(0);
  const waitSeconds = useCountdown(readyAt);
  // A command that this screen saw wait, so the result that follows is news, whatever the clock of the phone says
  const [sawCommand, setSawCommand] = useState(false);
  const waiting = query.data?.pending != null;

  if (waiting && !sawCommand) {
    setSawCommand(true);
  }
  // The service now knows the command, so the failure of the call is no longer the news
  useEffect(() => {
    if (waiting) {
      resetSend();
    }
  }, [waiting, resetSend]);

  // A plug that was removed or replaced by a clamp while the screen was open has no card any more
  if (hasNoRelay(query.error)) {
    return null;
  }
  if (query.data) {
    const status = send.error instanceof ApiError ? send.error.status : undefined;
    const tooMany = status === 429;

    return (
      <>
        <RelayCardView
          relay={query.data}
          offline={offline}
          now={now}
          resultIsNew={sawCommand}
          sending={send.isPending}
          sendFailed={send.isError && !tooMany && status !== 404 && status !== 409}
          sendError={send.error}
          waitSeconds={waitSeconds}
          onSend={(action) => {
            send.mutate(action, {
              // Only a command that the service took makes the next result news. A refused one leaves the old result as it is.
              onSuccess: () => {
                setSawCommand(true);
              },
              onError: (error) => {
                if (error instanceof ApiError && error.status === 429) {
                  setReadyAt(Date.now() + (error.retryAfterSeconds ?? 60) * 1000);
                }
              },
            });
          }}
        />
        <ScheduleCard deviceId={deviceId} schedule={query.data.schedule} />
      </>
    );
  }
  if (query.isPending) {
    return null;
  }

  return (
    <Card title="Saklar">
      <ErrorBanner
        error={query.error}
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
