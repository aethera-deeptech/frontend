import { Link } from 'react-router';

import type { Settings } from '@/api/settings';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { formatRupiah } from '@/lib/format';
import { settingsPath } from '@/pages/pengaturan/edit-form';
import {
  dayLabels,
  hoursLine,
  savedMessages,
  sensitivityLabels,
  type SavedSetting,
} from '@/pages/pengaturan/settings-text';

interface PengaturanViewProps {
  settings: Settings;
  // The setting that was just saved, which the screen confirms
  saved?: SavedSetting;
  backTo: string;
}

export function PengaturanView({ settings, saved, backTo }: PengaturanViewProps) {
  const { tariff } = settings;

  return (
    <div className="flex flex-col gap-3">
      <PengaturanHeader backTo={backTo} />
      {saved ? (
        <Banner tone="info" title="Pengaturan tersimpan" message={savedMessages[saved]} />
      ) : null}
      <h2 className="text-h2 text-text-heading">Usaha</h2>
      <Card className="gap-0 px-4 py-1">
        <ul>
          <ListRow title="Nama usaha" value={settings.businessName} to={`${settingsPath}/nama`} />
          <ListRow
            title="Jam kerja"
            value={dayLabels[settings.workHours.days]}
            valueNote={hoursLine(settings.workHours)}
            to={`${settingsPath}/jam-kerja`}
          />
        </ul>
      </Card>
      <h2 className="text-h2 text-text-heading">Penghitungan saran</h2>
      <Card className="gap-0 px-4 py-1">
        <ul>
          <ListRow
            title="Tarif listrik"
            secondary={tariff.isDefault ? 'Tarif bawaan, belum Anda isi' : 'Tarif Anda'}
            value={`${formatRupiah(tariff.rpPerKwh)} per kWh`}
            to={`${settingsPath}/tarif`}
          />
          <ListRow
            title="Kepekaan anomali"
            secondary="Batas untuk menandai anomali"
            value={sensitivityLabels[settings.anomalySensitivity]}
            to={`${settingsPath}/kepekaan`}
          />
        </ul>
      </Card>
      <p className="text-label text-text-2">
        Pengaturan hanya mengubah cara sistem menghitung dan menyarankan. Sistem tidak mengubah atau
        mematikan alat Anda.
      </p>
    </div>
  );
}

// The top of the screen. It also stands over the loading and the error, so it is its own piece.
export function PengaturanHeader({ backTo }: { backTo: string }) {
  return (
    <>
      <div className="lg:hidden">
        <Button asChild size="lg">
          <Link to={backTo}>Kembali</Link>
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 text-text-heading lg:text-title">Pengaturan</h1>
        <p className="text-body text-text-2">Atur cara sistem membuat saran untuk usaha Anda.</p>
      </div>
    </>
  );
}
