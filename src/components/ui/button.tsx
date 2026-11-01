import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

// The face sits on a 1 px border and a hard shadow in the darker "chonk" color. The shadow grows on hover and is gone when pressed.
// The top and bottom margins always add up to 3 px, so the button does not push its neighbors while it moves.
const buttonVariants = cva(
  [
    'text-button inline-flex items-center justify-center gap-1.5 border whitespace-nowrap select-none',
    'transition-[margin,box-shadow] duration-100',
    'mt-(--lift-inset-rest) mb-(--lift-rest) shadow-[0_var(--lift-rest)_0_0_var(--chonk)]',
    'not-disabled:hover:mt-(--lift-inset-hover) not-disabled:hover:mb-(--lift-hover) not-disabled:hover:shadow-[0_var(--lift-hover)_0_0_var(--chonk)]',
    'not-disabled:active:mt-(--lift-inset-pressed) not-disabled:active:mb-0 not-disabled:active:shadow-none',
    'disabled:mt-(--lift-inset-pressed) disabled:mb-0 disabled:opacity-(--disabled-opacity) disabled:shadow-none',
  ],
  {
    variants: {
      kind: {
        neutral:
          'bg-btn-neutral-face border-btn-neutral-chonk text-btn-neutral-ink [--chonk:var(--btn-neutral-chonk)]',
        accent:
          'bg-btn-accent-face border-btn-accent-chonk text-btn-accent-ink [--chonk:var(--btn-accent-chonk)]',
        danger:
          'bg-btn-danger-face border-btn-danger-chonk text-btn-danger-ink [--chonk:var(--btn-danger-chonk)]',
        warning:
          'bg-btn-warning-face border-btn-warning-chonk text-btn-warning-ink [--chonk:var(--btn-warning-chonk)]',
        success:
          'bg-btn-success-face border-btn-success-chonk text-btn-success-ink [--chonk:var(--btn-success-chonk)]',
      },
      size: {
        sm: 'h-8 rounded-sm px-3',
        md: 'h-9 rounded-md px-4',
        lg: 'h-11 rounded-lg px-4',
      },
    },
    defaultVariants: { kind: 'neutral', size: 'md' },
  },
);

// A link cannot be disabled, so asChild and disabled never go together.
type ButtonProps = VariantProps<typeof buttonVariants> &
  (
    | (ComponentProps<'button'> & {
        asChild?: false;
      })
    | (Omit<ComponentProps<'button'>, 'disabled'> & {
        // Render the child element, for example a Link, with the button look
        asChild: true;
        disabled?: never;
      })
  );

export function Button({
  kind,
  size,
  asChild = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ kind, size }), className)}
      {...props}
    />
  );
}
