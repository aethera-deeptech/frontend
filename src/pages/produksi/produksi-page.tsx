import { useState } from 'react';

import { useProduction, useSaveProduction, type Production } from '@/api/production';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { ProduksiView, type SaveState } from '@/pages/produksi/produksi-view';

export function ProduksiPage() {
  const query = useProduction();

  return (
    <>
      <title>Catat produksi · Audit Energi UMKM</title>
      {query.data ? (
        <ProduksiForm data={query.data} />
      ) : query.isPending ? (
        <SkeletonCard label="Memuat catatan produksi" />
      ) : (
        <Banner
          tone="danger"
          title="Catatan produksi tidak bisa dimuat"
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
      )}
    </>
  );
}

function ProduksiForm({ data }: { data: Production }) {
  const save = useSaveProduction();
  const [date, setDate] = useState(data.today);
  // What the user changed. Until then the form shows the record of the day, or the newest record, or 0.
  const [typedQuantity, setTypedQuantity] = useState<number | null>(null);
  const [chosenUnit, setChosenUnit] = useState<string | null>(null);
  const entry = data.recent.find((item) => item.date === date);
  const quantity = typedQuantity ?? entry?.quantity ?? data.recent[0]?.quantity ?? 0;
  const unit = chosenUnit ?? data.unit;
  const saveState: SaveState = save.isPending
    ? 'saving'
    : save.isError
      ? 'failed'
      : save.isSuccess
        ? 'saved'
        : 'idle';

  return (
    <ProduksiView
      data={data}
      date={date}
      onDateChange={(next) => {
        save.reset();
        setDate(next);
        setTypedQuantity(null);
      }}
      quantity={quantity}
      onQuantityChange={(next) => {
        save.reset();
        setTypedQuantity(next);
      }}
      unit={unit}
      onUnitChange={(next) => {
        save.reset();
        setChosenUnit(next);
      }}
      saveState={saveState}
      onSave={() => {
        save.mutate({ date, quantity, unit });
      }}
      backTo="/lainnya"
    />
  );
}
