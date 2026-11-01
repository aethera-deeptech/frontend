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

// A step of 0.1 on 0.2 gives 0.30000000000000004 in floating point, so the result keeps the digits of the step
function decimalsOf(step: number): number {
  return step.toString().split('.')[1]?.length ?? 0;
}

export function NumberStepper({
  label,
  value,
  onValueChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  unit,
}: NumberStepperProps) {
  const decimals = decimalsOf(step);
  // A value outside the limits first moves to the nearest limit, so a step never starts from a value that cannot be chosen
  const inRange = Math.min(max, Math.max(min, value));
  const next = (amount: number) =>
    Math.min(max, Math.max(min, Number((inRange + amount).toFixed(decimals))));

  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <Button
        size="lg"
        className="w-11 px-0"
        aria-label="Kurangi"
        disabled={inRange - step < min}
        onClick={() => {
          onValueChange(next(-step));
        }}
      >
        −
      </Button>
      <output className="bg-bg-3 border-border-field flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md border px-3">
        <span className="text-kpi text-text-heading">{value}</span>{' '}
        {unit ? <span className="text-body text-text-2">{unit}</span> : null}
      </output>
      <Button
        size="lg"
        className="w-11 px-0"
        aria-label="Tambah"
        disabled={inRange + step > max}
        onClick={() => {
          onValueChange(next(step));
        }}
      >
        +
      </Button>
    </div>
  );
}
