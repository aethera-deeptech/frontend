// A day is written YYYY-MM-DD, the way the API sends it. These functions read and write it in the local time of the
// device, so a day never moves by the time zone.

export function parseDay(day: string): Date {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}

export function toDayString(date: Date): string {
  const pad = (value: number, length = 2) => value.toString().padStart(length, '0');
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// The month of a day, written YYYY-MM
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

// The month before or after a month, both written YYYY-MM
export function addMonths(month: string, amount: number): string {
  const date = parseDay(`${month}-01`);
  date.setMonth(date.getMonth() + amount);
  return monthOf(toDayString(date));
}
