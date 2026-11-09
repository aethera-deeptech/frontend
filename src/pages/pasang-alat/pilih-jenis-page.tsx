import { Link, Navigate, useNavigate } from 'react-router';

import { useGateways } from '@/api/gateways';
import type { DeviceKind } from '@/api/pairing';
import { ChevronRightIcon } from '@/components/icons/chevron-right-icon';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { addPath, StepFrame } from '@/pages/pasang-alat/step-frame';
import { useWizard } from '@/pages/pasang-alat/wizard-context';

const choices: { kind: DeviceKind; title: string; hint: string; next: string }[] = [
  {
    kind: 'plug',
    title: 'WATTLINK Plug',
    hint: 'Untuk mesin yang dicolok ke stopkontak',
    next: `${addPath}/persetujuan`,
  },
  {
    kind: 'clamp',
    title: 'WATTLINK Clamp',
    hint: 'Dipasang di panel listrik',
    next: `${addPath}/peringatan`,
  },
];

export function PilihJenisPage() {
  const navigate = useNavigate();
  const wizard = useWizard();
  const gateways = useGateways();

  // A business with no hub cannot search for a device, so the first step is to connect the hub. A list that cannot be loaded
  // does not block the user, because the search itself says when there is no hub.
  if (gateways.isPending) {
    return <SkeletonCard label="Memuat WATTLINK Hub" />;
  }
  if (gateways.data?.items.length === 0) {
    return <Navigate to={`${addPath}/hub`} replace />;
  }

  const hubs = gateways.data?.items ?? [];
  const cut = hubs.filter((hub) => hub.keyRevoked).length;

  // Every hub is cut, so a search would run for minutes and find nothing. The backend does not stop it, so the step does.
  if (hubs.length > 0 && cut === hubs.length) {
    return (
      <StepFrame title="Tambah alat" subtitle="WATTLINK Hub yang mencari alat baru." backTo="/alat">
        <Banner
          tone="warning"
          title="WATTLINK Hub perlu dihubungkan lagi"
          message="Semua WATTLINK Hub Anda tidak mengirim data. Alat baru hanya bisa dicari setelah ada WATTLINK Hub yang terhubung."
          action={
            <Button asChild kind="accent" size="lg" className="self-start">
              <Link to={`${addPath}/hub`}>Hubungkan WATTLINK Hub</Link>
            </Button>
          }
        />
      </StepFrame>
    );
  }

  return (
    <StepFrame
      title="Tambah alat"
      subtitle="Pilih jenis alat yang akan Anda pasang."
      backTo="/alat"
    >
      {cut > 0 ? (
        <Banner
          tone="warning"
          title="Ada WATTLINK Hub yang perlu dihubungkan lagi"
          message="Alat yang hanya ada di dekat hub itu tidak akan ditemukan."
          action={
            <Button asChild size="lg" className="self-start">
              <Link to="/lainnya/hub">Lihat WATTLINK Hub</Link>
            </Button>
          }
        />
      ) : null}
      <ul className="flex flex-col gap-3">
        {choices.map((choice) => (
          <li key={choice.kind}>
            <button
              type="button"
              onClick={() => {
                wizard.chooseKind(choice.kind);
                void navigate(choice.next);
              }}
              className="border-border-1 bg-bg-1 hover:bg-bg-3 flex min-h-11 w-full items-center gap-3 rounded-lg border p-4 text-left"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-h2 text-text-heading">{choice.title}</span>
                <span className="text-label text-text-2">{choice.hint}</span>
              </span>
              <ChevronRightIcon className="text-text-2 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </StepFrame>
  );
}
