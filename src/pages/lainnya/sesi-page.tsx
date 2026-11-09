import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { ApiError } from '@/api/client';
import { useEndSession, useSessions, type DeviceSession } from '@/api/sessions';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Tag } from '@/components/ui/tag';
import { TextLink } from '@/components/ui/text-link';
import { formatDateWithYear, formatRelativePast, parseMoment } from '@/lib/format';
import { sessionLabel } from '@/pages/lainnya/session-label';

type Notice = { kind: 'ended'; label: string } | { kind: 'gone' };

// The screen where the owner sees the browsers that can open the account and ends the ones that should not
export function SesiPage() {
  const query = useSessions();
  const end = useEndSession();
  const [notice, setNotice] = useState<Notice>();
  const noticeRef = useRef<HTMLDivElement>(null);
  // The observer tells the screen that a call runs a moment after the press, so two quick presses need a flag that is set at once
  const calling = useRef(false);
  // The times on the rows are counted from the moment the list was read, so the words and the data belong together
  const now = query.dataUpdatedAt;

  // The button that was pressed leaves with its row, so the focus moves to the news and a screen reader reads it
  useEffect(() => {
    if (notice) {
      noticeRef.current?.focus();
    }
  }, [notice]);

  const endSession = (session: DeviceSession) => {
    // A second press does nothing while a call runs, and the focus stays on the button
    if (end.isPending || calling.current) {
      return;
    }
    calling.current = true;
    setNotice(undefined);
    end.mutate(session.id, {
      onSettled: () => {
        calling.current = false;
      },
      onSuccess: () => {
        setNotice({ kind: 'ended', label: sessionLabel(session.label) });
      },
      // A 404 says that the session is already gone, so the list is read again and the user is told so
      onError: (error) => {
        if (error instanceof ApiError && error.status === 404) {
          setNotice({ kind: 'gone' });
        }
      },
    });
  };

  const sessions = query.data?.items;
  const others = sessions?.filter((session) => !session.current) ?? [];
  const failed = end.isError && !(end.error instanceof ApiError && end.error.status === 404);

  return (
    <>
      <title>Perangkat yang masuk · WATTLINK</title>
      <div className="flex flex-col gap-3 lg:max-w-lg">
        <div className="lg:hidden">
          <Button asChild size="lg">
            <Link to="/lainnya">Kembali</Link>
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 text-text-heading lg:text-title">Perangkat yang masuk ke akun</h1>
          <p className="text-body text-text-2">
            Satu baris untuk setiap browser. Sesi berakhir sendiri setelah 30 hari tidak dipakai,
            atau 90 hari sejak masuk. Daftar ini tidak menunjukkan lokasi.
          </p>
        </div>
        {/* The region is always there, so the news is read out when it changes. The banner below shows the same words. */}
        <div aria-live="polite" className="sr-only">
          {notice?.kind === 'ended'
            ? `Perangkat dikeluarkan. ${notice.label} sudah keluar dari akun ini.`
            : ''}
          {notice?.kind === 'gone'
            ? 'Perangkat itu sudah keluar. Daftar di bawah sudah diperbarui.'
            : ''}
        </div>
        <div
          ref={noticeRef}
          tabIndex={-1}
          className="flex flex-col gap-3 outline-none empty:hidden"
        >
          {notice?.kind === 'ended' ? (
            <div aria-hidden="true">
              <Banner
                tone="info"
                title="Perangkat dikeluarkan"
                message={`${notice.label} sudah keluar dari akun ini.`}
              />
            </div>
          ) : null}
          {notice?.kind === 'gone' ? (
            <div aria-hidden="true">
              <Banner
                tone="info"
                title="Perangkat itu sudah keluar"
                message="Daftar di bawah sudah diperbarui."
              />
            </div>
          ) : null}
          {failed ? (
            <ErrorBanner
              error={end.error}
              kind="write"
              busyTitle="Belum pasti dikeluarkan"
              busyMessage="Sistem sedang sibuk. Perangkat itu mungkin sudah dikeluarkan. Periksa daftar di bawah, lalu coba lagi jika perlu."
              title="Perangkat belum dikeluarkan"
              message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
            />
          ) : null}
        </div>
        {sessions ? (
          <>
            <Card className="gap-0 px-4 py-1">
              <ul>
                {sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    now={now}
                    ending={end.isPending && end.variables === session.id}
                    locked={end.isPending}
                    onEnd={() => {
                      endSession(session);
                    }}
                  />
                ))}
              </ul>
            </Card>
            {others.length === 0 ? (
              <p className="text-body text-text-2">
                Tidak ada perangkat lain yang masuk ke akun ini.
              </p>
            ) : null}
          </>
        ) : query.isPending ? (
          <SkeletonCard label="Memuat perangkat" />
        ) : (
          <ErrorBanner
            error={query.error}
            title="Daftar perangkat tidak bisa dimuat"
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

interface SessionRowProps {
  session: DeviceSession;
  now: number;
  ending: boolean;
  // A call to end a session runs, so no other button of the list works until it is done
  locked: boolean;
  onEnd: () => void;
}

function SessionRow({ session, now, ending, locked, onEnd }: SessionRowProps) {
  const label = sessionLabel(session.label);
  const signedIn = `Masuk ${formatDateWithYear(parseMoment(session.createdAt))}`;
  const lastUsed = formatRelativePast(session.lastUsedAt, now);

  return (
    <li className="border-border-2 flex flex-col gap-2 border-b py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-h2 text-text-heading min-w-0 wrap-anywhere">{label}</p>
        {session.current ? <Tag tone="accent">Perangkat ini</Tag> : null}
      </div>
      {session.current ? (
        <>
          <p className="text-label text-text-2">{signedIn}</p>
          <p className="text-label text-text-2">
            {'Untuk keluar dari sini, pakai '}
            <TextLink to="/lainnya/keluar">Keluar</TextLink>.
          </p>
        </>
      ) : (
        <>
          <p className="text-label text-text-2">{`${signedIn}. Terakhir dipakai ${lastUsed}.`}</p>
          <Button
            size="lg"
            className="self-start"
            aria-label={
              ending
                ? `Sedang mengeluarkan ${label}`
                : `Keluarkan ${label}, terakhir dipakai ${lastUsed}`
            }
            aria-disabled={locked || undefined}
            onClick={() => {
              if (!locked) {
                onEnd();
              }
            }}
          >
            {ending ? 'Sedang mengeluarkan' : 'Keluarkan'}
          </Button>
        </>
      )}
    </li>
  );
}
