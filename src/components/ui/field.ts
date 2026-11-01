import { cn } from '@/lib/cn';

// The look of a text field and of the button of a select. Focus and error draw a 2 px stroke from the 1 px border plus an inset
// shadow, so the field keeps its size.
export function fieldStyles(invalid: boolean): string {
  return cn(
    'text-body text-text-1 h-11 w-full rounded-md border bg-bg-3 px-3 outline-none',
    'placeholder:text-text-2',
    invalid
      ? // The stroke is the same with or without focus, so focus adds an outline that keeps the field findable by keyboard
        'border-focus-invalid shadow-[inset_0_0_0_1px_var(--focus-invalid)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-invalid'
      : 'border-border-field focus:border-focus focus:shadow-[inset_0_0_0_1px_var(--focus)]',
    'disabled:border-border-1 disabled:opacity-(--disabled-opacity)',
  );
}
