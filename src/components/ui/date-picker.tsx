import * as Dialog from '@radix-ui/react-dialog';
import { useId, useState, type ReactNode } from 'react';

import { ChevronDownIcon } from '@/components/icons/chevron-down-icon';
import { ChevronRightIcon } from '@/components/icons/chevron-right-icon';
import { Button } from '@/components/ui/button';
import { fieldStyles } from '@/components/ui/field';
import { addMonths, monthOf, parseDay, toDayString } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { formatDateWithYear, formatMonthYear } from '@/lib/format';

const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

interface DatePickerProps {
  label: string;
  // A day, written YYYY-MM-DD
  value: string;
  onValueChange: (day: string) => void;
  // The last day that can be picked. Later days are shown and cannot be chosen.
  max: string;
}

// A field that opens a sheet with a month to pick a day from. The sheet sits at the bottom on a phone and in the middle
// from 1024 px.
export function DatePicker({ label, value, onValueChange, max }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerId = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={triggerId} className="text-label text-text-1">
        {label}
      </label>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger
          id={triggerId}
          className={cn(
            fieldStyles(false),
            'flex items-center justify-between gap-2 text-left',
            'data-[state=open]:border-focus data-[state=open]:shadow-[inset_0_0_0_1px_var(--focus)]',
          )}
        >
          <span>{formatDateWithYear(parseDay(value))}</span>
          <ChevronDownIcon className="text-text-2 shrink-0" />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="bg-bg-scrim fixed inset-0 z-40" />
          <Dialog.Content
            aria-describedby={undefined}
            className="bg-bg-overlay fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-97.5 flex-col gap-3 rounded-t-xl p-4 outline-none lg:inset-auto lg:top-1/2 lg:left-1/2 lg:w-97.5 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-xl"
          >
            <Sheet
              value={value}
              max={max}
              onPick={(day) => {
                onValueChange(day);
                setOpen(false);
              }}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

// It lives only while the sheet is open, so every opening starts on the month of the value.
function Sheet({
  value,
  max,
  onPick,
}: {
  value: string;
  max: string;
  onPick: (day: string) => void;
}) {
  const [month, setMonth] = useState(monthOf(value));
  const [picked, setPicked] = useState(value);
  const first = parseDay(`${month}-01`);
  // The week starts on Monday
  const blanks = (first.getDay() + 6) % 7;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();

  return (
    <>
      <Dialog.Title className="text-h2 text-text-heading">Pilih tanggal</Dialog.Title>
      <div className="flex items-center justify-between">
        <MonthButton
          label="Bulan sebelumnya"
          onClick={() => {
            setMonth(addMonths(month, -1));
          }}
        >
          <ChevronRightIcon className="rotate-180" />
        </MonthButton>
        <p aria-live="polite" className="text-h2 text-text-heading">
          {formatMonthYear(month)}
        </p>
        <MonthButton
          label="Bulan berikutnya"
          disabled={addMonths(month, 1) > monthOf(max)}
          onClick={() => {
            setMonth(addMonths(month, 1));
          }}
        >
          <ChevronRightIcon />
        </MonthButton>
      </div>
      <div className="grid grid-cols-7" aria-hidden="true">
        {weekdays.map((weekday) => (
          <span key={weekday} className="text-label text-text-2 text-center">
            {weekday}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: blanks }, (_, index) => (
          <span key={`blank-${index.toString()}`} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const date = new Date(first.getFullYear(), first.getMonth(), index + 1);
          const day = toDayString(date);
          const later = day > max;
          const selected = day === picked;

          return (
            <button
              key={day}
              type="button"
              disabled={later}
              aria-pressed={selected}
              aria-label={`${(index + 1).toString()} ${formatMonthYear(month)}`}
              onClick={() => {
                setPicked(day);
              }}
              className={cn(
                'text-body h-11 rounded-md',
                selected ? 'bg-btn-accent-face text-btn-accent-ink' : 'text-text-1 hover:bg-bg-3',
                later && 'text-text-disabled hover:bg-transparent',
              )}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <p className="text-label text-text-2">Tanggal setelah hari ini belum bisa dipilih.</p>
      <div className="flex gap-2">
        <Dialog.Close asChild>
          <Button size="lg" className="flex-1">
            Batal
          </Button>
        </Dialog.Close>
        <Button
          size="lg"
          kind="accent"
          className="flex-1"
          onClick={() => {
            onPick(picked);
          }}
        >
          Pilih
        </Button>
      </div>
    </>
  );
}

function MonthButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="bg-bg-1 text-text-1 hover:bg-bg-3 flex size-11 items-center justify-center rounded-md disabled:text-text-disabled disabled:hover:bg-bg-1"
    >
      {children}
    </button>
  );
}
