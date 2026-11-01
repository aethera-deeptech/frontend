import { useNavigate } from 'react-router';

import type { DeviceKind } from '@/api/pairing';
import { ChevronRightIcon } from '@/components/icons/chevron-right-icon';
import { addPath, StepFrame } from '@/pages/pasang-alat/step-frame';
import { useWizard } from '@/pages/pasang-alat/wizard';

const choices: { kind: DeviceKind; title: string; hint: string; next: string }[] = [
  {
    kind: 'plug',
    title: 'Colokan pintar',
    hint: 'Untuk mesin yang dicolok ke stopkontak',
    next: `${addPath}/persetujuan`,
  },
  {
    kind: 'clamp',
    title: 'Penjepit arus',
    hint: 'Dipasang di panel listrik',
    next: `${addPath}/peringatan`,
  },
];

export function PilihJenisPage() {
  const navigate = useNavigate();
  const wizard = useWizard();

  return (
    <StepFrame
      title="Tambah alat"
      subtitle="Pilih jenis alat yang akan Anda pasang."
      backTo="/alat"
    >
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
