import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { useId } from 'react';

import { cn } from '@/lib/cn';

interface RadioGroupProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

// One choice out of a few. Each row is the touch target, 44 px high like the Checkbox, and the checked one shows a dot as well as the
// color.
export function RadioGroup({ label, value, onValueChange, options, disabled }: RadioGroupProps) {
  const labelId = useId();

  return (
    <div className="flex flex-col">
      <span id={labelId} className="text-label text-text-2">
        {label}
      </span>
      <RadioGroupPrimitive.Root
        aria-labelledby={labelId}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        className="flex flex-col"
      >
        {options.map((option) => {
          const id = `${labelId}-${option.value}`;

          return (
            <div key={option.value} className="flex min-h-11 items-center gap-3">
              <RadioGroupPrimitive.Item
                id={id}
                value={option.value}
                className={cn(
                  'bg-bg-1 border-text-2 flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                  'data-[state=checked]:bg-btn-accent-face data-[state=checked]:border-btn-accent-chonk',
                  'disabled:opacity-(--disabled-opacity)',
                )}
              >
                <RadioGroupPrimitive.Indicator className="bg-btn-accent-ink size-2 rounded-full" />
              </RadioGroupPrimitive.Item>
              <label
                htmlFor={id}
                className="text-body text-text-1 flex min-h-11 flex-1 items-center"
              >
                {option.label}
              </label>
            </div>
          );
        })}
      </RadioGroupPrimitive.Root>
    </div>
  );
}
