// One pair of a description list. Put it inside a dl.
export function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-body flex gap-2">
      <dt className="text-text-2">{label}</dt>
      <dd className="text-text-1">{value}</dd>
    </div>
  );
}
