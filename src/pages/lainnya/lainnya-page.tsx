import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';

// The menu of the screens that have no tab of their own. Keluar joins it when the login exists.
export function LainnyaPage() {
  return (
    <>
      <title>Lainnya · WATTLINK</title>
      <div className="flex flex-col gap-3 lg:gap-6">
        {/* The Mobile frames have no title above the menu, so it only stays for assistive technology */}
        <h1 className="text-title text-text-heading sr-only lg:not-sr-only">Lainnya</h1>
        <Card className="gap-0 px-4 py-1 lg:max-w-lg">
          <ul>
            <ListRow
              title="Catat produksi"
              secondary="Isi jumlah produksi harian"
              to="/lainnya/produksi"
            />
            <ListRow
              title="Pengaturan"
              secondary="Nama usaha, jam kerja, tarif dan kepekaan"
              to="/lainnya/pengaturan"
            />
          </ul>
        </Card>
      </div>
    </>
  );
}
