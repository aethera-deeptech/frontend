import { Link, Navigate, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { addPath, StepFrame } from '@/pages/pasang-alat/step-frame';
import { useWizard } from '@/pages/pasang-alat/wizard-context';

export function PersetujuanPage() {
  const navigate = useNavigate();
  const wizard = useWizard();

  if (!wizard.kind) {
    return <Navigate to={addPath} replace />;
  }
  // The clamp needs the warning first, so a visit that skipped it goes back to it
  if (wizard.kind === 'clamp' && !wizard.safetyRead) {
    return <Navigate to={`${addPath}/peringatan`} replace />;
  }

  return (
    <StepFrame
      title="Sebelum memasang"
      subtitle="Baca dulu data apa yang sistem baca, dan apa yang tidak sistem lakukan."
      backTo={wizard.kind === 'clamp' ? `${addPath}/peringatan` : addPath}
    >
      {wizard.kind === 'plug' ? (
        <Card title="Yang perlu Anda cek">
          <p className="text-body text-text-1">
            Daya mesin tidak boleh melebihi batas yang tertulis pada colokan pintar. Lihat label di
            colokan dan di mesin. Jika ragu, jangan pasang di mesin itu. Colokan yang kepanasan atau
            berbau gosong harus dicabut.
          </p>
        </Card>
      ) : null}
      <Card title="Yang dibaca sistem">
        <p className="text-body text-text-1">
          Daya listrik alat dan waktu pemakaiannya, setiap beberapa menit. Data ini dipakai untuk
          menghitung saran penghematan.
        </p>
      </Card>
      <Card title="Yang tidak dilakukan sistem">
        <p className="text-body text-text-1">
          Sistem tidak menyalakan, mematikan atau mengubah alat Anda. Anda yang memutuskan setiap
          langkah.
        </p>
      </Card>
      <Checkbox
        label="Saya setuju data listrik alat ini dibaca"
        checked={wizard.consented}
        onCheckedChange={(checked) => {
          wizard.setConsented(checked === true);
        }}
      />
      <Button
        kind="accent"
        size="lg"
        disabled={!wizard.consented}
        onClick={() => {
          void navigate(`${addPath}/nama`);
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
