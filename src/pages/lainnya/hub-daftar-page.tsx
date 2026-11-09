import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { hubOnlineMs, maxGateways, useGateways, type Gateway } from '@/api/gateways';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Tag } from '@/components/ui/tag';
import { formatRelativePast } from '@/lib/format';
import { addPath } from '@/pages/pasang-alat/step-frame';

// What the claim page found out when the owner typed a code
interface Notice {
  name: string;
  kind: 'again' | 'other' | 'new';
}

function readClaimed(state: unknown): Notice | undefined {
  if (typeof state !== 'object' || state === null || !('claimed' in state)) {
    return undefined;
  }
  const claimed = state.claimed;

  if (typeof claimed !== 'object' || claimed === null) {
    return undefined;
  }
  if (!('name' in claimed) || typeof claimed.name !== 'string') {
    return undefined;
  }
  if (!('kind' in claimed)) {
    return undefined;
  }
  const kind = claimed.kind;

  return kind === 'again' || kind === 'other' || kind === 'new'
    ? { name: claimed.name, kind }
    : undefined;
}

function noticeText(notice: Notice): { tone: 'info' | 'warning'; title: string; message: string } {
  switch (notice.kind) {
    case 'again':
      return {
        tone: 'info',
        title: 'WATTLINK Hub terhubung lagi',
        message: `${notice.name} sudah dihubungkan. Data masuk lagi setelah hub mengirim.`,
      };
    case 'other':
      return {
        tone: 'warning',
        title: 'Ini WATTLINK Hub baru',
        message: `${notice.name} masuk ke daftar. WATTLINK Hub yang tadi masih perlu dihubungkan lagi.`,
      };
    case 'new':
      return {
        tone: 'info',
        title: 'WATTLINK Hub dihubungkan',
        message: `${notice.name} sudah masuk ke daftar.`,
      };
  }
}

const claimPath = `${addPath}/hub`;

// The screen where the owner sees the WATTLINK Hubs of the business, which one sends data and which one has to be connected again
export function HubDaftarPage() {
  const query = useGateways();
  const location = useLocation();
  const navigate = useNavigate();
  // The result of the claim page is copied once and taken out of the history, so a reload or the way Back does not show it again
  const [notice] = useState<Notice | undefined>(() => readClaimed(location.state));
  const [announcement, setAnnouncement] = useState('');
  const noticeRef = useRef<HTMLDivElement>(null);
  // The times on the rows are counted from the moment the list was read, so the words and the data belong together
  const now = query.dataUpdatedAt;

  // The words for a screen reader are set after the screen is there, so that a screen that opens with news announces it too
  useEffect(() => {
    const speech = notice ? noticeText(notice) : undefined;
    const timer = setTimeout(() => {
      setAnnouncement(speech ? `${speech.title}. ${speech.message}` : '');
    }, 0);

    if (notice) {
      noticeRef.current?.focus();
    }
    return () => {
      clearTimeout(timer);
    };
  }, [notice]);

  useEffect(() => {
    if (readClaimed(location.state)) {
      void navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  // A hub that has to be connected again comes first, because it is the one that needs the owner
  const hubs = query.data
    ? [...query.data.items].sort((a, b) => Number(b.keyRevoked) - Number(a.keyRevoked))
    : undefined;
  const speech = notice ? noticeText(notice) : undefined;

  return (
    <>
      <title>WATTLINK Hub · WATTLINK</title>
      <div className="flex flex-col gap-3 lg:max-w-lg">
        <div className="lg:hidden">
          <Button asChild size="lg">
            <Link to="/lainnya">Kembali</Link>
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 text-text-heading lg:text-title">WATTLINK Hub</h1>
          <p className="text-body text-text-2">
            WATTLINK Hub mengirim data dari semua alat ke WATTLINK. Di sini Anda melihat hub mana
            yang mengirim data.
          </p>
        </div>
        {/* The region is always there, so the news is read out when it changes. The banner below shows the same words. */}
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
        <div
          ref={noticeRef}
          tabIndex={-1}
          className="flex flex-col gap-3 outline-none empty:hidden"
        >
          {speech ? (
            <div aria-hidden="true">
              <Banner tone={speech.tone} title={speech.title} message={speech.message} />
            </div>
          ) : null}
        </div>
        {hubs && !query.isError ? (
          hubs.length === 0 ? (
            <>
              <p className="text-body text-text-2">Belum ada WATTLINK Hub di usaha ini.</p>
              <ClaimLink kind="accent" />
            </>
          ) : (
            <>
              <Card className="gap-0 px-4 py-1">
                <ul>
                  {hubs.map((hub) => (
                    <HubRow key={hub.id} hub={hub} now={now} />
                  ))}
                </ul>
              </Card>
              {hubs.length >= maxGateways ? (
                <p className="text-label text-text-2">
                  {`Satu usaha bisa punya sampai ${maxGateways.toString()} WATTLINK Hub.`}
                </p>
              ) : (
                <ClaimLink kind="neutral" />
              )}
            </>
          )
        ) : query.isPending ? (
          <SkeletonCard label="Memuat WATTLINK Hub" />
        ) : (
          <ErrorBanner
            error={query.error}
            title="Daftar WATTLINK Hub tidak bisa dimuat"
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
    </>
  );
}

function ClaimLink({ kind }: { kind: 'accent' | 'neutral' }) {
  return (
    <Button asChild kind={kind} size="lg" className="self-start">
      <Link to={claimPath} state={{ fromHubList: true }}>
        Hubungkan WATTLINK Hub
      </Link>
    </Button>
  );
}

function HubRow({ hub, now }: { hub: Gateway; now: number }) {
  const seen = new Date(hub.lastSeenAt).getTime();
  // A time that is not a moment says nothing, so it does not count as connected
  const online = !hub.keyRevoked && now - seen <= hubOnlineMs;
  const lastData = `Data terakhir masuk ${formatRelativePast(hub.lastSeenAt, now)}.`;

  return (
    <li className="border-border-2 flex flex-col gap-2 border-b py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-h2 text-text-heading min-w-0 wrap-anywhere">{hub.name}</p>
        {hub.keyRevoked ? (
          <Tag tone="warning">Perlu dihubungkan lagi</Tag>
        ) : online ? (
          <Tag tone="success">Terhubung</Tag>
        ) : (
          <Tag>Tidak terhubung</Tag>
        )}
      </div>
      {hub.keyRevoked ? (
        <>
          <p className="text-label text-text-2">
            WATTLINK Hub ini tidak mengirim data sampai Anda menghubungkannya lagi dengan kode baru.
          </p>
          <Button asChild size="lg" className="self-start">
            <Link
              to={claimPath}
              state={{ fromHubList: true, hubId: hub.id, hubName: hub.name }}
              aria-label={`Hubungkan lagi ${hub.name}`}
            >
              Hubungkan lagi
            </Link>
          </Button>
        </>
      ) : (
        <p className="text-label text-text-2">{lastData}</p>
      )}
    </li>
  );
}
