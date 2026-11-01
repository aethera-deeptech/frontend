import { cva } from 'class-variance-authority';

import { cn } from '@/lib/cn';

export type DeviceStatus = 'nyala' | 'mati' | 'siaga' | 'offline' | 'anomali';

// The status is told by the word and by the shape of the dot, so color is never the only signal.
// A solid dot means it is on, a hollow ring means it is off or does not answer.
const dotVariants = cva('size-2 shrink-0 rounded-full border', {
  variants: {
    status: {
      nyala: 'bg-btn-success-face border-text-success',
      mati: 'border-text-2',
      siaga: 'bg-btn-warning-face border-text-warning',
      offline: 'border-text-disabled',
      anomali: 'bg-chart-anomaly border-text-danger',
    },
  },
});

const labels: Record<DeviceStatus, string> = {
  nyala: 'Nyala',
  mati: 'Mati',
  siaga: 'Siaga',
  offline: 'Offline',
  anomali: 'Anomali',
};

export function StatusDot({ status, className }: { status: DeviceStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span aria-hidden="true" className={dotVariants({ status })} />
      <span className={cn('text-label', status === 'anomali' ? 'text-text-danger' : 'text-text-1')}>
        {labels[status]}
      </span>
    </span>
  );
}
