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

// A step of 0.1 on 0.2 gives 0.30000000000000004 in floating point, so the result is rounded to the digits it needs
// A number such as 1e-7 is written with an exponent, which moves the point that many places to the right.
function decimalsOf(number: number): number {
  const [mantissa = '', exponent = '0'] = number.toString().split('e');
  // toFixed accepts at most 100 digits
  return Math.min(100, Math.max(0, (mantissa.split('.')[1]?.length ?? 0) - Number(exponent)));
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
  // A value outside the limits first moves to the nearest limit, so a step never starts from a value that cannot be chosen
  const inRange = Math.min(max, Math.max(min, value));
  // The result keeps the digits of the value and of the step, so 1.25 plus 1 is 2.25
  const decimals = Math.max(decimalsOf(step), decimalsOf(inRange));
  const next = (amount: number) =>
    Math.min(max, Math.max(min, Number((inRange + amount).toFixed(decimals))));
  // The text while the user types. It can be empty, which a value cannot.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value.toString();

  // Only the characters of a number are kept. A comma is read as the decimal point and a point is kept only when the
  // step has decimals, so a count of pieces stays a whole number. The step decides and not the value, because the value
  // changes while the user types ("2." is 2) and would take the point away.
  const typedDecimals = decimalsOf(step);
  const clean = (typed: string) => {
    if (typedDecimals === 0) {
      return typed.replace(/\D/g, '').slice(0, 9);
    }
    const [whole = '', ...rest] = typed
      .replace(',', '.')
      .replace(/[^\d.]/g, '')
      .split('.');
    return rest.length > 0
      ? `${whole.slice(0, 9)}.${rest.join('').slice(0, typedDecimals)}`
      : whole.slice(0, 9);
  };

  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <Button
        size="lg"
        className="w-11 px-0"
        aria-label="Kurangi"
        disabled={inRange <= min}
        onClick={() => {
          setDraft(null);
          onValueChange(next(-step));
        }}
      >
        −
      </Button>
      <span className="bg-bg-3 border-border-field focus-within:border-focus flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 focus-within:shadow-[inset_0_0_0_1px_var(--focus)]">
        <input
          type="text"
          inputMode={typedDecimals === 0 ? 'numeric' : 'decimal'}
          autoComplete="off"
          aria-label="Angka"
          value={text}
          size={Math.max(text.length, 1)}
          className="text-kpi text-text-heading min-w-0 bg-transparent text-center outline-none"
          onChange={(event) => {
            const typed = clean(event.target.value);
            setDraft(typed);
            const number = Number(typed);
            if (typed !== '' && typed !== '.' && Number.isFinite(number)) {
              onValueChange(Math.min(max, Math.max(min, number)));
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
        disabled={inRange >= max}
        onClick={() => {
          setDraft(null);
          onValueChange(next(step));
        }}
      >
        +
      </Button>
    </div>
  );
}
