import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';

import {
  forgetGateway,
  removeGatewayFailure,
  useGateways,
  useRemoveGateway,
  waitsForFirstData,
  type RemoveGatewayFailure,
} from '@/api/gateways';
import { ApiError } from '@/api/client';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { TextLink } from '@/components/ui/text-link';
import { formatRelativePast } from '@/lib/format';
import { AuthFrame } from '@/pages/auth/auth-frame';
import { FailureBanner } from '@/pages/auth/failure-banner';
import { PasswordField } from '@/pages/auth/password-field';
import { useCountdown } from '@/pages/auth/use-countdown';
import { checkPasswordPresent } from '@/pages/auth/validation';
import { deleteLimitText } from '@/pages/lainnya/delete-limit';

const listPath = '/lainnya/hub';

// What the screen says for an answer after which part of the data may be gone. The cause comes first, because a lost connection
// asks the user for something else than a busy service does.
const uncertainCause: Record<'busy' | 'offline' | 'server', string> = {
  busy: 'Sistem sedang sibuk.',
  offline: 'Tidak bisa terhubung ke sistem. Periksa koneksi internet Anda.',
  server: 'Terjadi kesalahan di sistem.',
};

// The moment when the API lets the owner try again, and 60 seconds from now when the answer does not say how long
function whenToRetry(error: unknown): number {
  return Date.now() + (error instanceof ApiError ? (error.retryAfterSeconds ?? 60) : 60) * 1000;
}

function isUncertain(
  failure: RemoveGatewayFailure | undefined,
): failure is 'busy' | 'offline' | 'server' {
  return failure === 'busy' || failure === 'offline' || failure === 'server';
}

// The question before a WATTLINK Hub is deleted. It sits outside the menu, like the question before the account is deleted. The
// API deletes the readings in steps before it deletes the hub, so an answer that is not a clear yes or no may have left the hub
// half empty. The screen says so and lets the user repeat the call, which the API allows until it ends with a 204.
export function HubHapusPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useGateways();
  const remove = useRemoveGateway();
  const [password, setPassword] = useState('');
  const [tried, setTried] = useState(false);
  // The time when the button works again after the API said to wait, and 0 when it did not
  const [readyAt, setReadyAt] = useState(0);
  const left = useCountdown(readyAt);
  // True once an answer left it open whether data is gone. It stays for the rest of the visit, also after a later clear answer,
  // because the data that went does not come back.
  const [unsure, setUnsure] = useState(false);
  const unsureRef = useRef(false);
  // A mutation shows that it runs a moment after the press, so two quick presses need a flag that is set at once
  const calling = useRef(false);
  // Set once the API said that the hub is gone, so the move to the list is the user's own and the blocker lets it pass
  const leaving = useRef(false);
  // The hub is gone, and the button says so until the move to the list is done
  const [done, setDone] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const failure = remove.isError ? removeGatewayFailure(remove.error) : undefined;
  const waiting = left > 0;
  const hubs = query.data?.items;
  const hub = hubs?.find((item) => item.id === id);
  const busyNow = remove.isPending || done;
  // A wrong password empties the field, so the text about it comes first. The text about an empty field must not replace it.
  const passwordError =
    failure === 'wrong-password'
      ? `Kata sandi salah. Periksa lalu coba lagi. ${deleteLimitText}`
      : tried
        ? checkPasswordPresent(password)
        : undefined;
  // The user must not leave while the call runs. The deletion can end after the page is gone, and nothing could say so.
  const blocker = useBlocker(() => calling.current && !leaving.current);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  // The way back to the list, with the news in the state of the visit. The cache loses the hub after the move, because the
  // list shows the old row while the question is still on show if the cache goes first.
  const leaveForList = (state: unknown) =>
    Promise.resolve(navigate(listPath, { replace: true, state })).then(() =>
      forgetGateway(queryClient, id),
    );

  const afterFailure = (error: unknown) => {
    calling.current = false;
    const kind = removeGatewayFailure(error);

    if (kind === 'gone') {
      // The password was right, because the API checks it first, and the hub is not there. After an open answer this is the end
      // of the deletion, and without one the hub went some other way, for example in another tab.
      leaving.current = true;
      calling.current = true;
      setDone(true);
      void leaveForList({
        removed: { name: hub?.name ?? '', kind: unsureRef.current ? 'removed' : 'gone' },
      });
      return;
    }
    if (kind === 'wrong-password') {
      setPassword('');
      passwordRef.current?.focus();
      return;
    }
    if (kind === 'rate-limited') {
      setReadyAt(whenToRetry(error));
      return;
    }
    if (isUncertain(kind)) {
      unsureRef.current = true;
      setUnsure(true);
    }
    // A 401 is a session that ended, and the query client sends the user to Masuk
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    // The controls stay enabled while the call runs and while the button waits, so the focus stays where it is
    if (calling.current || waiting || !hub) {
      return;
    }
    setTried(true);

    if (checkPasswordPresent(password)) {
      passwordRef.current?.focus();
      return;
    }
    calling.current = true;
    // The steps after the call run from this promise and not from a callback of the hook, because the guard can replace this
    // screen while the call runs, and a callback of the screen would never run.
    const call = remove.mutateAsync({ id, password });

    call
      .then(() => {
        // The press flag stays set, so no second call leaves while the page moves
        leaving.current = true;
        setDone(true);
        return leaveForList({ removed: { name: hub.name, kind: 'removed' } });
      })
      // The failure is handled below. Nothing else can go wrong here.
      .catch(() => undefined);
    call.catch(afterFailure);
  };

  // The hub is read from the list, so the page waits for it. A list that failed with nothing to show has no hub to name.
  if (!hubs) {
    return (
      <AuthFrame title="Hapus WATTLINK Hub ini?" subtitle="Tindakan ini tidak bisa dibatalkan.">
        {query.isError ? (
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
        ) : (
          <SkeletonCard label="Memuat WATTLINK Hub" />
        )}
        <Button asChild size="lg">
          <Link to={listPath}>Kembali ke daftar hub</Link>
        </Button>
      </AuthFrame>
    );
  }

  if (!hub) {
    return (
      <AuthFrame
        title="WATTLINK Hub tidak ditemukan"
        subtitle="Hub ini sudah tidak ada di usaha Anda."
      >
        <Button asChild size="lg">
          <Link to={listPath}>Kembali ke daftar hub</Link>
        </Button>
      </AuthFrame>
    );
  }

  const now = query.dataUpdatedAt;
  const lastData = waitsForFirstData(queryClient, hub)
    ? 'Baru dihubungkan. Data pertama belum masuk.'
    : `Data terakhir masuk ${formatRelativePast(hub.lastSeenAt, now)}.`;

  return (
    <AuthFrame title="Hapus WATTLINK Hub ini?" subtitle="Tindakan ini tidak bisa dibatalkan.">
      {isUncertain(failure) ? (
        <Banner
          tone="warning"
          title="Belum pasti dihapus"
          message={`${uncertainCause[failure]} WATTLINK Hub mungkin sudah dihapus sebagian atau selesai. Ulangi dengan kata sandi yang sama. Jika kata sandinya benar, mengulang tidak memakai jatah percobaan.`}
        />
      ) : failure === 'refused' ? (
        <Banner
          tone="danger"
          title={unsure ? 'Belum berhasil' : 'WATTLINK Hub belum dihapus'}
          message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
        />
      ) : failure === 'rate-limited' && waiting ? (
        <FailureBanner
          failure="rate-limited"
          retryAfterSeconds={
            remove.error instanceof ApiError ? (remove.error.retryAfterSeconds ?? 60) : 60
          }
        />
      ) : null}
      {/* The data that went does not come back, so this stays for the rest of the visit and not only for the last answer */}
      {unsure ? (
        <p className="text-body text-text-1">
          {failure === 'rate-limited' && waiting
            ? 'Penghapusan mungkin sebagian berjalan. Coba lagi setelah hitungan selesai. '
            : ''}
          Jika Anda keluar sekarang, sebagian data mungkin sudah terhapus. Ulangi sampai selesai.
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="text-h2 text-text-heading wrap-anywhere">{hub.name}</p>
        <p className="text-label text-text-2">{lastData}</p>
        {hubs.length === 1 ? (
          <p className="text-body text-text-1">
            Ini satu-satunya WATTLINK Hub Anda. Data baru tidak masuk sampai Anda menghubungkan hub
            lagi.
          </p>
        ) : null}
      </div>
      <Card title="Yang ikut terhapus">
        <ul className="text-body text-text-1 flex list-disc flex-col gap-1 pl-5">
          <li>Semua alat yang tersambung lewat hub ini.</li>
          <li>
            Riwayat listrik, anomali, saran, penghematan yang sudah terbukti, dan jadwal alat itu.
          </li>
        </ul>
      </Card>
      <Card title="Setelah itu">
        <ul className="text-body text-text-1 flex list-disc flex-col gap-1 pl-5">
          <li>
            Total dan laporan bulanan bulan-bulan lalu ikut mengecil untuk seluruh usaha, karena
            dihitung dari alat yang masih ada.
          </li>
          <li>
            WATTLINK Plug dan WATTLINK Clamp harus dipasang lagi lewat Tambah alat. Alat itu muncul
            sebagai alat baru tanpa riwayat.
          </li>
          <li>WATTLINK Hub ini tidak bisa mengirim data lagi.</li>
          <li>Satu tempat WATTLINK Hub kosong lagi, dan ruangan Anda tetap ada.</li>
          <li>Salinan di cadangan dan catatan sistem, jika ada, tidak ikut terhapus.</li>
        </ul>
        {/* A report made after part of the data is gone would be incomplete, so the offer ends with the first open answer */}
        {unsure ? null : (
          <p className="text-label text-text-2">
            Hanya laporan bulanan yang bisa diunduh.{' '}
            <TextLink to="/laporan">Unduh laporan dulu</TextLink>
          </p>
        )}
      </Card>
      <form noValidate onSubmit={submit} className="flex flex-col gap-3">
        <PasswordField
          ref={passwordRef}
          label="Kata sandi Anda"
          helper={`Kata sandi akun ini. ${deleteLimitText}`}
          autoComplete="current-password"
          value={password}
          error={passwordError}
          onChange={(event) => {
            setPassword(event.target.value);
            // The text about the password goes away when the user edits it. The wait after a 429 keeps its own timer.
            if (failure === 'wrong-password') {
              remove.reset();
            }
          }}
        />
        {/* The call can take a while, so the screen says so. The region for a screen reader is always there, because a region
            that is hidden while it is empty may not announce the first words. The visible line is not read a second time. */}
        <div aria-live="polite" className="sr-only">
          {busyNow ? 'Sedang menghapus. Jangan tutup halaman.' : ''}
        </div>
        {busyNow ? (
          <p aria-hidden="true" className="text-body text-text-1">
            Sedang menghapus. Jangan tutup halaman.
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            kind="danger"
            size="lg"
            aria-disabled={busyNow || waiting || undefined}
          >
            {busyNow ? 'Sedang menghapus' : unsure ? 'Coba lagi' : 'Ya, hapus WATTLINK Hub'}
          </Button>
          <Button asChild size="lg">
            <Link
              to={listPath}
              state={unsure ? { removing: { id: hub.id, name: hub.name } } : undefined}
              aria-disabled={busyNow || undefined}
              onClick={(event) => {
                // The link stays in the page so the focus order does not change, but it does nothing while the call runs
                if (busyNow) {
                  event.preventDefault();
                }
              }}
            >
              {unsure ? 'Kembali ke daftar hub' : 'Batal'}
            </Link>
          </Button>
        </div>
      </form>
    </AuthFrame>
  );
}
