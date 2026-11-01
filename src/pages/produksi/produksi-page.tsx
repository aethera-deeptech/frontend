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
  // The result belongs to what was sent. If the user changed a value while the save was on its way, the screen does not
  // confirm the new values as saved.
  const sent = save.variables;
  const sameAsSent = sent?.date === date && sent.quantity === quantity && sent.unit === unit;
  const saveState: SaveState = save.isPending
    ? 'saving'
    : save.isError
      ? 'failed'
      : save.isSuccess && sameAsSent
        ? 'saved'
        : 'idle';

  // A second save must not start while the first one is on its way, so the result of a save in flight is not reset.
  // Otherwise Simpan would turn on again and two saves for the same day could finish in the wrong order.
  const resetUnlessSaving = () => {
    if (!save.isPending) {
      save.reset();
    }
  };

  return (
    <ProduksiView
      data={data}
      date={date}
      onDateChange={(next) => {
        resetUnlessSaving();
        setDate(next);
        setTypedQuantity(null);
      }}
      quantity={quantity}
      onQuantityChange={(next) => {
        resetUnlessSaving();
        setTypedQuantity(next);
      }}
      unit={unit}
      onUnitChange={(next) => {
        resetUnlessSaving();
        setChosenUnit(next);
      }}
      saveState={saveState}
      onSave={() => {
        save.mutate({ date, quantity, unit });
      }}
      // The Lainnya menu comes with the Pengaturan screens, so until then Kembali goes to the home page
      backTo="/"
    />
  );
}
