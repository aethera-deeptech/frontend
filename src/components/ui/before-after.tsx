import { BarChart } from '@/components/charts/bar-chart';
import { Tag } from '@/components/ui/tag';
import { cn } from '@/lib/cn';
import { formatNumber, formatPercent } from '@/lib/format';

export type BeforeAfterProps =
  | {
      // A verified result passed the check, an estimate did not yet
      status: 'verified' | 'estimate';
      beforeKwh: number;
      afterKwh: number;
      unit: string;
    }
  | {
      status: 'collecting';
      collectedDays: number;
      neededDays: number;
      // The line above the progress bar
      headline?: string;
      message?: string;
    };

// Energy for each piece before and after the tips were applied, or the progress of the first days of data.
export function BeforeAfter(props: BeforeAfterProps) {
  if (props.status === 'collecting') {
    const share = props.neededDays > 0 ? Math.min(props.collectedDays / props.neededDays, 1) : 0;

    return (
      <div className="flex flex-col gap-2">
        <p className="text-h2 text-text-heading">
          {props.headline ?? 'Data awal sedang dikumpulkan'}
        </p>
        <span aria-hidden="true" className="bg-bg-3 h-2.5 rounded-[5px]">
          <span
            className="bg-chart-blurple block h-full rounded-[5px]"
            style={{ width: `${(share * 100).toString()}%` }}
          />
        </span>
        <p className="text-label text-text-2">
          Hari ke-{props.collectedDays} dari {props.neededDays}
        </p>
        {props.message ? <p className="text-body text-text-2">{props.message}</p> : null}
      </div>
    );
  }

  const saving = props.beforeKwh > 0 ? (1 - props.afterKwh / props.beforeKwh) * 100 : 0;
  const verified = props.status === 'verified';

  return (
    <div className="flex flex-col gap-2">
      <BarChart
        items={[
          { label: 'Sebelum', value: props.beforeKwh, display: formatNumber(props.beforeKwh) },
          {
            label: 'Sesudah',
            value: props.afterKwh,
            display: formatNumber(props.afterKwh),
            series: 'indigo',
          },
        ]}
      />
      <p className="text-label text-text-2">{props.unit}</p>
      <div className="flex items-center gap-2">
        <Tag tone={verified ? 'success' : 'muted'}>{verified ? 'Terverifikasi' : 'Perkiraan'}</Tag>
        <p className={cn('text-h2', verified ? 'text-text-success' : 'text-text-2')}>
          {saving > 0 ? `Hemat ${formatPercent(saving)}` : 'Belum ada penghematan'}
        </p>
      </div>
    </div>
  );
}
