import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import type { ComponentProps } from 'react';

import { CheckIcon } from '@/components/icons/check-icon';
import { cn } from '@/lib/cn';

type CheckboxProps = ComponentProps<typeof CheckboxPrimitive.Root> & { label: string };

// The whole row is the touch target, 44 px high
export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className="text-body text-text-1 flex min-h-11 items-center gap-3">
      <CheckboxPrimitive.Root
        className={cn(
          'bg-bg-1 border-text-2 flex size-5 shrink-0 items-center justify-center rounded-sm border-[1.5px]',
          'data-[state=checked]:bg-btn-accent-face data-[state=checked]:border-btn-accent-chonk',
          'disabled:opacity-(--disabled-opacity)',
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator>
          <CheckIcon className="text-btn-accent-ink" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label}
    </label>
  );
}
