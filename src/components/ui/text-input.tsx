import { useId, type ComponentProps } from 'react';

import { fieldStyles } from '@/components/ui/field';
import { cn } from '@/lib/cn';

type TextInputProps = ComponentProps<'input'> & {
  label: string;
  helper?: string;
  // An error replaces the helper text and turns the field red
  error?: string;
};

export function TextInput({
  label,
  helper,
  error,
  id,
  className,
  'aria-describedby': describedBy,
  ...props
}: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? helper;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-label text-text-1">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [describedBy, message ? messageId : undefined].filter(Boolean).join(' ') || undefined
        }
        className={cn(fieldStyles(Boolean(error)), className)}
        {...props}
      />
      {message ? (
        <p
          id={messageId}
          role={error ? 'alert' : undefined}
          className={cn('text-label', error ? 'text-text-danger' : 'text-text-2')}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
