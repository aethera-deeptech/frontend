import { Link } from 'react-router';

import type { Production } from '@/api/production';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { ListRow } from '@/components/ui/list-row';
import { NumberStepper } from '@/components/ui/number-stepper';
import { Select } from '@/components/ui/select';
import { parseDay } from '@/lib/dates';
import { formatDate, formatDateWithYear, formatNumber } from '@/lib/format';

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

interface ProduksiViewProps {
  data: Production;
  date: string;
  onDateChange: (date: string) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  unit: string;
  onUnitChange: (unit: string) => void;
  saveState: SaveState;
  onSave: () => void;
  // Where the Kembali button leads
  backTo: string;
}

const maxQuantity = 999_999;

export function ProduksiView({
  data,
  date,
  onDateChange,
  quantity,
  onQuantityChange,
  unit,
  onUnitChange,
  saveState,
  onSave,
  backTo,
}: ProduksiViewProps) {
  const exists = data.recent.some((entry) => entry.date === date);
  const day = parseDay(date);
  const hint =
    quantity <= 0
      ? 'Isi jumlah lebih dari 0 supaya bisa disimpan. Ketuk angka untuk mengetik.'
      : exists
        ? `Ubah angka lalu ketuk Ubah catatan untuk mengganti catatan ${formatDate(day)}.`
        : 'Ketuk angka untuk mengetik, atau ketuk plus dan minus.';

  return (
    <div className="flex flex-col gap-3 lg:max-w-lg">
      <div className="lg:hidden">
        <Button asChild size="lg">
          <Link to={backTo}>Kembali</Link>
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 text-text-heading lg:text-title">Catat produksi</h1>
        <p className="text-body text-text-2">Isi jumlah produksi untuk satu hari.</p>
      </div>
      {saveState === 'saved' ? (
        <Banner
          tone="info"
          title="Catatan tersimpan"
          message={`Produksi ${formatDateWithYear(day)} sebanyak ${formatNumber(quantity, 0)} ${unit} sudah tercatat.`}
        />
      ) : null}
      {saveState === 'failed' ? (
        <Banner
          tone="danger"
          title="Catatan belum tersimpan"
          message="Angka Anda masih di layar. Coba simpan lagi, dan periksa koneksi internet Anda jika tetap gagal."
        />
      ) : null}
      <Card className="gap-3 p-4">
        <DatePicker label="Tanggal" value={date} max={data.today} onValueChange={onDateChange} />
        <Select
          label="Satuan produk"
          value={unit}
          onValueChange={onUnitChange}
          options={data.units.map((value) => ({ value, label: value }))}
        />
        <div className="flex flex-col gap-2">
          <p className="text-label text-text-1">Jumlah produksi</p>
          <NumberStepper
            label="Jumlah produksi"
            value={quantity}
            onValueChange={onQuantityChange}
            max={maxQuantity}
            unit={unit}
          />
          <p className="text-label text-text-2">{hint}</p>
        </div>
        <Button
          kind="accent"
          size="lg"
          disabled={quantity <= 0 || saveState === 'saving'}
          onClick={onSave}
        >
          {saveState === 'saving' ? 'Menyimpan' : exists ? 'Ubah catatan' : 'Simpan'}
        </Button>
      </Card>
      {data.recent.length > 0 ? (
        <>
          <h2 className="text-h2 text-text-heading">Catatan terakhir</h2>
          <Card className="gap-0 px-4 py-1">
            <ul>
              {data.recent.map((entry) => (
                <ListRow
                  key={entry.date}
                  title={formatDateWithYear(parseDay(entry.date))}
                  value={`${formatNumber(entry.quantity, 0)} ${data.unit}`}
                />
              ))}
            </ul>
          </Card>
        </>
      ) : (
        <Card title="Mengapa angka ini penting">
          <p className="text-body text-text-2">
            Dengan jumlah produksi, sistem bisa menghitung energi per potong. Angka itu yang membuat
            penghematan bisa dibandingkan dengan benar dari hari ke hari.
          </p>
        </Card>
      )}
    </div>
  );
}
