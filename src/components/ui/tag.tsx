import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

const tagVariants = cva('text-tag inline-flex items-center rounded-sm px-2 py-[3px]', {
  variants: {
    tone: {
      danger: 'bg-bg-danger-muted text-text-danger',
      warning: 'bg-bg-warning-muted text-text-warning',
      success: 'bg-bg-success-muted text-text-success',
      accent: 'bg-bg-accent-muted text-text-accent',
      muted: 'bg-bg-3 text-text-2',
    },
  },
  defaultVariants: { tone: 'muted' },
});

type TagProps = ComponentProps<'span'> & VariantProps<typeof tagVariants>;

export function Tag({ tone, className, ...props }: TagProps) {
  return <span className={cn(tagVariants({ tone }), className)} {...props} />;
}
