import { Link, useNavigate, useParams } from 'react-router';

import { usePairing, useStartPairing } from '@/api/pairing';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { addPath, StepFrame } from '@/pages/pasang-alat/step-frame';
import { useWizard } from '@/pages/pasang-alat/wizard-context';

export function MencariPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const wizard = useWizard();
  const query = usePairing(id);
  const start = useStartPairing();
  const status = query.data?.status;

  // A new search with the same answers. Without them, for example after a reload, the user starts over.
  const searchAgain = () => {
    const { kind, name, roomId } = wizard;
    if (!kind || !name || !roomId) {
      void navigate(addPath);
      return;
    }
    start.mutate(
      { kind, name, roomId },
      {
        onSuccess: ({ id: next }) => {
          void navigate(`${addPath}/mencari/${encodeURIComponent(next)}`, { replace: true });
        },
      },
    );
  };

  return (
    <StepFrame
      title="Tambah alat"
      subtitle={
        status === 'connected'
          ? 'Alat Anda sudah ditemukan.'
          : 'Pasang alat, lalu hubungkan ke Wi-Fi.'
      }
      backTo={`${addPath}/nama`}
    >
      {status === 'connected' ? (
        <Banner
          tone="info"
          title="Alat terhubung, menunggu data pertama"
          message="Data pertama biasanya muncul dalam beberapa menit. Saran pertama muncul setelah 7 hari data."
          action={
            <Button asChild size="lg">
              <Link to="/alat">Lihat daftar alat</Link>
            </Button>
          }
        />
      ) : status === 'failed' ? (
        <Banner
          tone="danger"
          title="Alat belum terhubung"
          message="Pastikan alat menyala dan dekat dengan Wi-Fi. Lalu coba lagi."
          action={
            <Button size="lg" disabled={start.isPending} onClick={searchAgain}>
              Coba lagi
            </Button>
          }
        />
      ) : query.isError && !status ? (
        <Banner
          tone="danger"
          title="Status alat tidak bisa dimuat"
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
        <SkeletonCard label="Mencari alat di dekat Anda" />
      )}
      {start.isError ? (
        <Banner
          tone="danger"
          title="Pencarian belum bisa dimulai"
          message="Coba lagi. Jika tetap gagal, periksa koneksi internet Anda."
        />
      ) : null}
    </StepFrame>
  );
}
