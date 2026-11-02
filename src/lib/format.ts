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

const defaultTimeZone = 'Asia/Jakarta';

function clockParts(date: Date, timeZone: string): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
}

// The current moment as the clock of the business shows it, so "today" does not depend on the time zone of the device. The
// zone is the one in the settings of the business (WIB, WITA or WIT), and the API moments carry its offset. The result holds
// the business wall time in the local fields, like parseMoment. A zone name that this browser does not know falls back to
// Asia/Jakarta, which is the zone of a new business.
export function businessNow(date: Date = new Date(), timeZone: string = defaultTimeZone): Date {
  let parts: Intl.DateTimeFormatPart[];

  try {
    parts = clockParts(date, timeZone);
  } catch {
    parts = clockParts(date, defaultTimeZone);
  }
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'));
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

const longMonths = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

// A month written as YYYY-MM, for example "Oktober 2026". Anything else comes back as it was.
export function formatMonthYear(month: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  const name = match?.[2] ? longMonths[Number(match[2]) - 1] : undefined;
  return match && name ? `${name} ${match[1] ?? ''}` : month;
}

// An ISO week written YYYY-Www, from its Monday to its Sunday. The dates are the local fields, like parseMoment, because the
// week is the week of the business and not of the device.
export function isoWeekRange(week: string): { start: Date; end: Date } | undefined {
  const match = /^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$/.exec(week);

  if (!match) {
    return undefined;
  }
  const year = Number(match[1]);
  const number = Number(match[2]);
  // Week 1 is the week with the 4th of January in it
  const mondayOfWeekOne = 4 - ((new Date(year, 0, 4).getDay() + 6) % 7);

  return {
    start: new Date(year, 0, mondayOfWeekOne + (number - 1) * 7),
    end: new Date(year, 0, mondayOfWeekOne + (number - 1) * 7 + 6),
  };
}

// "19 sampai 25 Okt 2026", or "28 Sep sampai 4 Okt 2026" when the week crosses a month. The year can be left out for a short text.
export function formatWeekRange(week: string, withYear = true): string {
  const range = isoWeekRange(week);

  if (!range) {
    return week;
  }
  const { start, end } = range;
  const from = start.getMonth() === end.getMonth() ? start.getDate().toString() : formatDate(start);
  const text = `${from} sampai ${formatDate(end)}`;

  return withYear ? `${text} ${end.getFullYear().toString()}` : text;
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
