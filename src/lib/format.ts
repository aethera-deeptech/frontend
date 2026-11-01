// The number and date formats of the Indonesian screens. They are written by hand because Intl puts a space after Rp and
// a dot in the time, and the design has neither.

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function groupThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatRupiah(value: number): string {
  const sign = value < 0 ? '-' : '';
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
  const [whole = '0', decimals] = value.toFixed(maxDecimals).split('.');
  const trimmed = decimals?.replace(/0+$/, '');
  const grouped = groupThousands(Number(whole));
  return trimmed ? `${grouped},${trimmed}` : grouped;
}

// A number with exactly the given digits after the comma, for example 7,0 jam
export function formatFixed(value: number, decimals: number): string {
  const [whole = '0', decimal] = value.toFixed(decimals).split('.');
  const grouped = groupThousands(Number(whole));
  return decimal ? `${grouped},${decimal}` : grouped;
}

export function formatWatts(value: number): string {
  return `${formatNumber(value, 0)} W`;
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

export function formatTime(date: Date): string {
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
