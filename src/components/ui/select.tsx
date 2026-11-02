import * as SelectPrimitive from '@radix-ui/react-select';
import { Fragment, useId } from 'react';

import { CheckIcon } from '@/components/icons/check-icon';
import { ChevronDownIcon } from '@/components/icons/chevron-down-icon';
import { fieldStyles } from '@/components/ui/field';
import { cn } from '@/lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  // The name of the group that the option starts. The options that follow belong to it until another group starts.
  group?: string;
}

// The options in the groups that they start. The options before the first name stand alone.
function groupOptions(options: SelectOption[]): { label?: string; options: SelectOption[] }[] {
  const groups: { label?: string; options: SelectOption[] }[] = [];

  for (const option of options) {
    const last = groups.at(-1);

    if (option.group !== undefined || !last) {
      groups.push({ label: option.group, options: [option] });
    } else {
      last.options.push(option);
    }
  }
  return groups;
}

interface SelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
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
  defaultValue,
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
        defaultValue={defaultValue}
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
            className="bg-bg-overlay border-border-1 z-50 max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) overflow-y-auto rounded-md border p-1"
          >
            <SelectPrimitive.Viewport>
              {groupOptions(options).map((group, index) => {
                const items = group.options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    className="text-body text-text-1 data-[highlighted]:bg-bg-3 data-[state=checked]:bg-bg-accent-muted data-[state=checked]:text-text-accent flex min-h-11 items-center justify-between gap-2 rounded-md px-3 py-2 outline-none"
                  >
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator>
                      <CheckIcon />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ));

                // A group with no name has no label for the group to point at, so its options stand alone
                return group.label === undefined ? (
                  <Fragment key={index}>{items}</Fragment>
                ) : (
                  <Fragment key={group.label}>
                    <SelectPrimitive.Separator className="bg-border-1 my-1 h-px" />
                    <SelectPrimitive.Group>
                      <SelectPrimitive.Label className="text-label text-text-2 px-3 py-1">
                        {group.label}
                      </SelectPrimitive.Label>
                      {items}
                    </SelectPrimitive.Group>
                  </Fragment>
                );
              })}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
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
