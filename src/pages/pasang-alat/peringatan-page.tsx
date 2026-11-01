import { Link, Navigate, useNavigate } from 'react-router';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { addPath, StepFrame } from '@/pages/pasang-alat/step-frame';
import { useWizard } from '@/pages/pasang-alat/wizard';

// The warning that only the clamp has, because it is fitted inside the electrical panel.
export function PeringatanPage() {
  const navigate = useNavigate();
  const wizard = useWizard();

  if (wizard.kind !== 'clamp') {
    return <Navigate to={addPath} replace />;
  }

  return (
    <StepFrame
      title="Sebelum memasang penjepit arus"
      subtitle="Pemasangan ini berhubungan dengan listrik."
      backTo={addPath}
    >
      <Banner
        tone="warning"
        title="Ada risiko sengatan listrik dan kebakaran"
        message="Lanjutkan hanya jika Anda tahu cara bekerja dengan aman. Jika ragu, minta teknisi listrik berlisensi yang memasangnya."
      />
      <Card title="Yang perlu Anda lakukan">
        <p className="text-body text-text-1">
          Matikan sakelar utama (MCB induk) di panel listrik sebelum membuka panel. Jepit satu kabel
          fase saja, bukan kabel netral dan bukan kabel ground. Tutup kembali panel sebelum
          menyalakan listrik.
        </p>
      </Card>
      <Card title="Yang perlu Anda hindari">
        <p className="text-body text-text-1">
          Jangan memotong atau mengupas kabel. Jangan menyentuh bagian logam atau kabel terbuka.
          Jangan memasang pada kabel rusak, di tempat basah atau sempit. Jika ada bau gosong,
          matikan listrik dan hubungi teknisi listrik berlisensi.
        </p>
      </Card>
      <Checkbox
        label="Saya tahu cara memasang dengan aman"
        checked={wizard.safetyRead}
        onCheckedChange={(checked) => {
          wizard.setSafetyRead(checked === true);
        }}
      />
      <Button
        kind="accent"
        size="lg"
        disabled={!wizard.safetyRead}
        onClick={() => {
          void navigate(`${addPath}/persetujuan`);
        }}
      >
        Lanjut
      </Button>
      <Button asChild size="lg">
        <Link to="/alat">Batal</Link>
      </Button>
    </StepFrame>
  );
}
