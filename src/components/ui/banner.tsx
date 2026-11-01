import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

const bannerVariants = cva('flex flex-col gap-3 rounded-lg px-4 py-3', {
  variants: {
    tone: {
      info: 'bg-bg-accent-muted',
      warning: 'bg-bg-warning-muted',
      danger: 'bg-bg-danger-muted',
    },
  },
  defaultVariants: { tone: 'info' },
});

type BannerProps = VariantProps<typeof bannerVariants> & {
  title: string;
  message: string;
  // A button or a link, shown under the text
  action?: ReactNode;
  className?: string;
  // So that another element can point at the banner with aria-describedby
  id?: string;
};

export function Banner({ tone, title, message, action, className, id }: BannerProps) {
  // An error interrupts the reader, the other tones wait to be read
  return (
    <div
      id={id}
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(bannerVariants({ tone }), className)}
    >
      <div className="flex flex-col gap-1">
        <p className="text-h2 text-text-heading">{title}</p>
        <p className="text-body text-text-1">{message}</p>
      </div>
      {action}
    </div>
  );
}
