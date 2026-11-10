import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { useId } from 'react';

import { cn } from '@/lib/cn';

interface RadioGroupProps<T extends string> {
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  // A description sits under the label of its row, and the row is read with it
  options: { value: T; label: string; description?: string }[];
  disabled?: boolean;
}

// One choice out of a few. Each row is the touch target, 44 px high like the Checkbox, and the checked one shows a dot as well as the
// color.
export function RadioGroup<T extends string>({
  label,
  value,
  onValueChange,
  options,
  disabled,
}: RadioGroupProps<T>) {
  const labelId = useId();

  return (
    <div className="flex flex-col">
      <span id={labelId} className="text-label text-text-2">
        {label}
      </span>
      <RadioGroupPrimitive.Root
        aria-labelledby={labelId}
        value={value}
        // The rows are the options, so the value that the primitive gives back is one of them
        onValueChange={(next) => {
          onValueChange(next as T);
        }}
        disabled={disabled}
        className="flex flex-col"
      >
        {options.map((option) => {
          const id = `${labelId}-${option.value}`;
          const descriptionId = `${id}-description`;

          return (
            <div key={option.value} className="flex items-start gap-3">
              <RadioGroupPrimitive.Item
                id={id}
                value={option.value}
                aria-describedby={option.description ? descriptionId : undefined}
                className={cn(
                  'bg-bg-1 border-text-2 mt-3 flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                  'data-[state=checked]:bg-btn-accent-face data-[state=checked]:border-btn-accent-chonk',
                  'disabled:opacity-(--disabled-opacity)',
                )}
              >
                <RadioGroupPrimitive.Indicator className="bg-btn-accent-ink size-2 rounded-full" />
              </RadioGroupPrimitive.Item>
              <div className="flex flex-1 flex-col">
                <label htmlFor={id} className="text-body text-text-1 flex min-h-11 items-center">
                  {option.label}
                </label>
                {option.description ? (
                  <p id={descriptionId} className="text-label text-text-2 -mt-2 pb-3">
                    {option.description}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </RadioGroupPrimitive.Root>
    </div>
  );
}
