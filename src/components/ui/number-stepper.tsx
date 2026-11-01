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

export function NumberStepper({
  label,
  value,
  onValueChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  unit,
}: NumberStepperProps) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <Button
        size="lg"
        className="w-11 px-0"
        aria-label="Kurangi"
        disabled={value - step < min}
        onClick={() => {
          onValueChange(Math.max(min, value - step));
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
        disabled={value + step > max}
        onClick={() => {
          onValueChange(Math.min(max, value + step));
        }}
      >
        +
      </Button>
    </div>
  );
}
