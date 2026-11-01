export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border-1 bg-bg-1 flex flex-col gap-2 rounded-lg border p-4">
      <p className="text-label text-text-2">{label}</p>
      <p className="text-h2 text-text-heading">{value}</p>
    </div>
  );
}
