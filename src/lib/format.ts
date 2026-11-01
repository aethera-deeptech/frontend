// The number and date formats of the Indonesian screens. They are written by hand because Intl puts a space after Rp and
// a dot in the time, and the design has neither.

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function groupThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatRupiah(value: number): string {
  // The sign follows the rounded amount, so -0.4 is Rp0 and not -Rp0
  const sign = value < 0 && Math.round(Math.abs(value)) !== 0 ? '-' : '';
  return `${sign}Rp${groupThousands(Math.abs(value))}`;
}

// A short amount for the axis of a chart, for example Rp1,5 jt
export function formatRupiahJuta(value: number): string {
  if (value === 0) {
    return 'Rp0';
  }
  return `Rp${(value / 1_000_000).toString().replace('.', ',')} jt`;
}

// A decimal number with a comma, with at most the given number of digits after it
export function formatNumber(value: number, maxDecimals = 2): string {
  const fixed = Math.abs(value).toFixed(maxDecimals);
  const [whole = '0', decimals] = fixed.split('.');
  const trimmed = decimals?.replace(/0+$/, '');
  const grouped = groupThousands(Number(whole));
  // A value that rounds to 0 has no sign
  const sign = value < 0 && Number(fixed) !== 0 ? '-' : '';
  return `${sign}${trimmed ? `${grouped},${trimmed}` : grouped}`;
}

// A moment from the API, such as 2026-10-29T09:30:00+07:00, read by the clock of the business and not by the clock of the
// device. The offset is dropped on purpose, so a device in another time zone shows the same day and hour.
export function parseMoment(iso: string): Date {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!parts) {
    return new Date(iso);
  }
  const [year = 0, month = 1, day = 1, hour = 0, minute = 0] = parts.slice(1).map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

export function formatPercent(value: number): string {
  return `${formatNumber(value, 1)}%`;
}

export function formatDate(date: Date): string {
  return `${date.getDate().toString()} ${months[date.getMonth()] ?? ''}`;
}

export function formatDateWithYear(date: Date): string {
  return `${formatDate(date)} ${date.getFullYear().toString()}`;
}

function formatTime(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDayTime(date: Date): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

export function formatDateTime(date: Date): string {
  return `${formatDateWithYear(date)}, ${formatTime(date)}`;
}

export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}
