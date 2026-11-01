import { useState } from 'react';

import { Button } from '@/components/ui/button';

interface NumberStepperProps {
  // The name for assistive technology, for example "Potong per hari"
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

// Plus and minus change the value by one step, and a tap on the number lets the user type it.
export function NumberStepper({
  label,
  value,
  onValueChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  unit,
}: NumberStepperProps) {
  // The text while the user types. It can be empty, which a value cannot.
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <Button
        size="lg"
        className="w-11 px-0"
        aria-label="Kurangi"
        disabled={value - step < min}
        onClick={() => {
          setDraft(null);
          onValueChange(Math.max(min, value - step));
        }}
      >
        −
      </Button>
      <span className="bg-bg-3 border-border-field focus-within:border-focus flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 focus-within:shadow-[inset_0_0_0_1px_var(--focus)]">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label="Angka"
          value={draft ?? value.toString()}
          size={Math.max((draft ?? value.toString()).length, 1)}
          className="text-kpi text-text-heading min-w-0 bg-transparent text-center outline-none"
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '').slice(0, 9);
            setDraft(digits);
            if (digits !== '') {
              onValueChange(Math.min(max, Math.max(min, Number(digits))));
            }
          }}
          onBlur={() => {
            setDraft(null);
          }}
        />
        {unit ? <span className="text-body text-text-2">{unit}</span> : null}
      </span>
      <Button
        size="lg"
        className="w-11 px-0"
        aria-label="Tambah"
        disabled={value + step > max}
        onClick={() => {
          setDraft(null);
          onValueChange(Math.min(max, value + step));
        }}
      >
        +
      </Button>
    </div>
  );
}
