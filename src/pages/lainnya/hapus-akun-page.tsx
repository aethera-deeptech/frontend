import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Link, useBlocker, useNavigate } from 'react-router';

import { deleteFailure, useDeleteAccount, useSession, type DeleteFailure } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextLink } from '@/components/ui/text-link';
import { AuthFrame } from '@/pages/auth/auth-frame';
import { FailureBanner } from '@/pages/auth/failure-banner';
import { PasswordField } from '@/pages/auth/password-field';
import { useCountdown } from '@/pages/auth/use-countdown';
import { checkPasswordPresent } from '@/pages/auth/validation';

const limitText = 'Sampai 5 percobaan per jam, termasuk yang gagal.';

// What the screen says for an answer after which part of the data may be gone. The cause comes first, because a lost connection
// asks the user for something else than a busy service does.
const uncertainCause: Record<'busy' | 'offline' | 'server', string> = {
  busy: 'Sistem sedang sibuk.',
  offline: 'Tidak bisa terhubung ke sistem. Periksa koneksi internet Anda.',
  server: 'Terjadi kesalahan di sistem.',
};

function isUncertain(failure: DeleteFailure | undefined): failure is 'busy' | 'offline' | 'server' {
  return failure === 'busy' || failure === 'offline' || failure === 'server';
}

// The question before the account and the business are deleted. It sits outside the menu, like Keluar. The API deletes the
// readings in steps before it deletes the business, so an answer that is not a clear yes or no may have left the account half
// empty. The screen says so and lets the user repeat the call, which the API allows until it ends with a 204.
export function HapusAkunPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useSession();
  const remove = useDeleteAccount();
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
  // Set once the API said 204, so the move to Masuk is the user's own and the blocker lets it pass
  const leaving = useRef(false);
  // The 204 came, and the button says so until the move to Masuk is done. The chunk of Masuk can take seconds on a slow phone.
  const [done, setDone] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const failure = remove.isError ? deleteFailure(remove.error) : undefined;
  const waiting = left > 0;
  // A wrong password empties the field, so the text about it comes first. The text about an empty field must not replace it.
  const passwordError =
    failure === 'wrong-password'
      ? `Kata sandi salah. Periksa lalu coba lagi. ${limitText}`
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

  // The way to Masuk. The cache is emptied after the move, because the guard watches the session and would read it again if
  // the cache went while the old screen is still on show.
  const leaveForMasuk = (state?: { notice: 'deleted' | 'maybe-deleted' }) =>
    Promise.resolve(navigate('/masuk', { replace: true, state })).then(() => {
      queryClient.clear();
    });

  const afterFailure = (error: unknown) => {
    calling.current = false;
    const kind = deleteFailure(error);

    if (kind === 'no-session') {
      // A finished deletion causes this answer, and so does a session that ended. Only an earlier open answer makes it worth a hedge.
      void leaveForMasuk(unsureRef.current ? { notice: 'maybe-deleted' } : undefined);
      return;
    }
    if (kind === 'wrong-password') {
      setPassword('');
      passwordRef.current?.focus();
      return;
    }
    if (kind === 'rate-limited') {
      setReadyAt(
        Date.now() + (error instanceof ApiError ? (error.retryAfterSeconds ?? 60) : 60) * 1000,
      );
      return;
    }
    if (isUncertain(kind)) {
      unsureRef.current = true;
      setUnsure(true);
    }
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    // The controls stay enabled while the call runs and while the button waits, so the focus stays where it is
    if (calling.current || waiting) {
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
    const call = remove.mutateAsync(password);

    call
      .then(() => {
        // The press flag stays set, so no second call leaves while the page moves
        leaving.current = true;
        setDone(true);
        return leaveForMasuk({ notice: 'deleted' });
      })
      // The failure is handled below. Nothing else can go wrong here.
      .catch(() => undefined);
    call.catch(afterFailure);
  };

  return (
    <AuthFrame
      title="Hapus akun dan semua data?"
      subtitle="Tindakan ini tidak bisa dibatalkan, dan tidak ada masa tunggu."
    >
      {isUncertain(failure) ? (
        <Banner
          tone="warning"
          title="Belum pasti dihapus"
          message={`${uncertainCause[failure]} Penghapusan mungkin sudah berjalan sebagian atau selesai. Ulangi dengan kata sandi yang sama. ${limitText}`}
        />
      ) : failure === 'refused' ? (
        <Banner
          tone="danger"
          title={unsure ? 'Belum berhasil' : 'Akun belum dihapus'}
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
      <Card title="Yang ikut terhapus">
        <ul className="text-body text-text-1 flex list-disc flex-col gap-1 pl-5">
          <li>Usaha dan akun Anda, termasuk semua perangkat yang masuk ke akun.</li>
          <li>Semua WATTLINK Hub, alat, ruangan, dan jadwal.</li>
          <li>Riwayat listrik, anomali, saran, dan catatan produksi.</li>
        </ul>
      </Card>
      <Card title="Setelah itu">
        <ul className="text-body text-text-1 flex list-disc flex-col gap-1 pl-5">
          <li>WATTLINK Hub tidak bisa mengirim data lagi.</li>
          <li>
            WATTLINK Plug yang masih mendapat listrik tetap di keadaan saklarnya dan tidak bisa
            diatur dari aplikasi lagi. Atur saklarnya dulu ke keadaan yang Anda inginkan.
          </li>
          <li>Email ini boleh dipakai untuk mendaftar lagi.</li>
          <li>
            Salinan di cadangan dan catatan sistem, jika ada, tidak ikut terhapus. Itu juga berlaku
            untuk layanan pengiriman email kami.
          </li>
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
        {session.data ? (
          <p className="text-body text-text-1 wrap-anywhere">
            {`Usaha ${session.data.businessName}. Akun ${session.data.email}.`}
          </p>
        ) : null}
        <PasswordField
          ref={passwordRef}
          label="Kata sandi Anda"
          helper={`Kata sandi akun ini. ${limitText}`}
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
        {/* The call can take about 15 seconds, so the screen says so. The region for a screen reader is always there, because a region
            that is hidden while it is empty may not announce the first words. The visible line is not read a second time. */}
        <div aria-live="polite" className="sr-only">
          {remove.isPending || done ? 'Sedang menghapus. Jangan tutup halaman.' : ''}
        </div>
        {remove.isPending || done ? (
          <p aria-hidden="true" className="text-body text-text-1">
            Sedang menghapus. Jangan tutup halaman.
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            kind="danger"
            size="lg"
            aria-disabled={remove.isPending || done || waiting || undefined}
          >
            {remove.isPending || done
              ? 'Sedang menghapus'
              : unsure
                ? 'Coba lagi'
                : 'Ya, hapus akun'}
          </Button>
          <Button asChild size="lg">
            <Link to="/lainnya">{unsure ? 'Kembali ke Lainnya' : 'Batal'}</Link>
          </Button>
        </div>
      </form>
    </AuthFrame>
  );
}
