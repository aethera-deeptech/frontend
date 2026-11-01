import * as SelectPrimitive from '@radix-ui/react-select';
import { useId } from 'react';

import { CheckIcon } from '@/components/icons/check-icon';
import { ChevronDownIcon } from '@/components/icons/chevron-down-icon';
import { fieldStyles } from '@/components/ui/field';
import { cn } from '@/lib/cn';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
}

export function Select({
  label,
  options,
  value,
  onValueChange,
  placeholder = 'Pilih satu',
  helper,
  error,
  disabled,
  name,
  id,
}: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const messageId = `${triggerId}-message`;
  const message = error ?? helper;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={triggerId} className="text-label text-text-1">
        {label}
      </label>
      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
      >
        <SelectPrimitive.Trigger
          id={triggerId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            fieldStyles(Boolean(error)),
            'flex items-center justify-between gap-2 text-left data-[placeholder]:text-text-2',
            'data-[state=open]:border-focus data-[state=open]:shadow-[inset_0_0_0_1px_var(--focus)]',
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDownIcon className="text-text-2 shrink-0" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="bg-bg-overlay border-border-1 z-50 w-(--radix-select-trigger-width) rounded-md border p-1"
          >
            <SelectPrimitive.Viewport>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="text-body text-text-1 data-[highlighted]:bg-bg-3 data-[state=checked]:bg-bg-accent-muted data-[state=checked]:text-text-accent flex h-11 items-center justify-between gap-2 rounded-md px-3 outline-none"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <CheckIcon />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {message ? (
        <p id={messageId} className={cn('text-label', error ? 'text-text-danger' : 'text-text-2')}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
