import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DatePicker } from '@/components/ui/date-picker';

function Demo({ onValueChange = vi.fn() }: { onValueChange?: (day: string) => void }) {
  const [value, setValue] = useState('2026-10-29');

  return (
    <DatePicker
      label="Tanggal"
      value={value}
      max="2026-10-29"
      onValueChange={(day) => {
        setValue(day);
        onValueChange(day);
      }}
    />
  );
}

async function openSheet() {
  await userEvent.click(screen.getByRole('button', { name: /Tanggal/ }));
  return screen.getByRole('dialog', { name: 'Pilih tanggal' });
}

describe('DatePicker', () => {
  it('shows the day in the field and the month of the day when it opens', async () => {
    render(<Demo />);

    expect(screen.getByRole('button', { name: /Tanggal/ })).toHaveTextContent('29 Okt 2026');

    const sheet = await openSheet();

    expect(within(sheet).getByText('Oktober 2026')).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: '29 Oktober 2026' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      within(sheet).getByText('Tanggal setelah hari ini belum bisa dipilih.'),
    ).toBeInTheDocument();
  });

  it('starts the month on the right weekday', async () => {
    render(<Demo />);
    const sheet = await openSheet();

    // 1 Oktober 2026 is a Thursday, so three blanks come before it in a week that starts on Monday
    const buttons = within(sheet).getAllByRole('button', { name: /Oktober 2026$/ });
    const grid = buttons[0]?.parentElement;

    expect(grid?.children[3]).toBe(within(sheet).getByRole('button', { name: '1 Oktober 2026' }));
  });

  it('does not let the user pick a day after the last day', async () => {
    render(<Demo />);
    const sheet = await openSheet();

    expect(within(sheet).getByRole('button', { name: '30 Oktober 2026' })).toBeDisabled();
    expect(within(sheet).getByRole('button', { name: '28 Oktober 2026' })).toBeEnabled();
    expect(within(sheet).getByRole('button', { name: 'Bulan berikutnya' })).toBeDisabled();
  });

  it('picks a day only after Pilih', async () => {
    const onValueChange = vi.fn();
    render(<Demo onValueChange={onValueChange} />);
    const sheet = await openSheet();

    await userEvent.click(within(sheet).getByRole('button', { name: '12 Oktober 2026' }));
    expect(onValueChange).not.toHaveBeenCalled();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Pilih' }));

    expect(onValueChange).toHaveBeenCalledWith('2026-10-12');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tanggal/ })).toHaveTextContent('12 Okt 2026');
  });

  it('keeps the old day after Batal', async () => {
    const onValueChange = vi.fn();
    render(<Demo onValueChange={onValueChange} />);
    const sheet = await openSheet();

    await userEvent.click(within(sheet).getByRole('button', { name: '12 Oktober 2026' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Batal' }));

    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Tanggal/ })).toHaveTextContent('29 Okt 2026');
  });

  it('moves to the month before and back', async () => {
    render(<Demo />);
    const sheet = await openSheet();

    await userEvent.click(within(sheet).getByRole('button', { name: 'Bulan sebelumnya' }));
    expect(within(sheet).getByText('September 2026')).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: '30 September 2026' })).toBeEnabled();

    await userEvent.click(within(sheet).getByRole('button', { name: 'Bulan berikutnya' }));
    expect(within(sheet).getByText('Oktober 2026')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    render(<Demo />);
    await openSheet();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
