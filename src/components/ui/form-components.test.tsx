import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from '@/components/ui/checkbox';
import { NumberStepper } from '@/components/ui/number-stepper';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select } from '@/components/ui/select';
import { TextInput } from '@/components/ui/text-input';

describe('TextInput', () => {
  it('is named by its label and shows the helper text', () => {
    render(<TextInput label="Nama usaha" helper="Tampil di laporan." />);

    const input = screen.getByLabelText('Nama usaha');

    expect(input).toHaveAccessibleDescription('Tampil di laporan.');
    expect(input).not.toBeInvalid();
  });

  it('shows the error instead of the helper and marks the field invalid', () => {
    render(<TextInput label="Nama usaha" helper="Tampil di laporan." error="Isi nama usaha." />);

    const input = screen.getByLabelText('Nama usaha');

    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('Isi nama usaha.');
    expect(screen.queryByText('Tampil di laporan.')).not.toBeInTheDocument();
  });

  it('passes typing on', async () => {
    const onChange = vi.fn();
    render(<TextInput label="Nama usaha" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Nama usaha'), 'Maju');

    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it('can be disabled', () => {
    render(<TextInput label="Nama usaha" disabled />);

    expect(screen.getByLabelText('Nama usaha')).toBeDisabled();
  });
});

describe('TextInput, messages', () => {
  it('announces an error and keeps a helper quiet', () => {
    const { rerender } = render(<TextInput label="Nama usaha" helper="Tampil di laporan." />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(<TextInput label="Nama usaha" error="Isi nama usaha." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Isi nama usaha.');
  });

  it('keeps the description that the caller passes next to the message', () => {
    render(
      <>
        <p id="extra">Tambahan</p>
        <TextInput label="Nama usaha" helper="Tampil di laporan." aria-describedby="extra" />
      </>,
    );

    expect(screen.getByLabelText('Nama usaha')).toHaveAccessibleDescription(
      'Tambahan Tampil di laporan.',
    );
  });
});

describe('Select', () => {
  const options = [
    { value: 'rendah', label: 'Rendah' },
    { value: 'sedang', label: 'Sedang' },
  ];

  it('shows the placeholder until something is picked', () => {
    render(<Select label="Kepekaan" options={options} />);

    expect(screen.getByRole('combobox', { name: 'Kepekaan' })).toHaveTextContent('Pilih satu');
  });

  it('shows the chosen option', () => {
    render(<Select label="Kepekaan" options={options} value="sedang" />);

    expect(screen.getByRole('combobox', { name: 'Kepekaan' })).toHaveTextContent('Sedang');
  });

  it('opens the menu and reports the option that is picked', async () => {
    const onValueChange = vi.fn();
    render(<Select label="Kepekaan" options={options} onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole('combobox', { name: 'Kepekaan' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Rendah' }));

    expect(onValueChange).toHaveBeenCalledWith('rendah');
  });

  it('shows an error under the field', () => {
    render(<Select label="Kepekaan" options={options} error="Pilih kepekaan." />);

    expect(screen.getByRole('combobox', { name: 'Kepekaan' })).toHaveAccessibleDescription(
      'Pilih kepekaan.',
    );
  });
});

describe('Checkbox', () => {
  it('toggles when the label is clicked', async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Saya setuju" onCheckedChange={onCheckedChange} />);

    await userEvent.click(screen.getByText('Saya setuju'));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('shows that it is checked', () => {
    render(<Checkbox label="Saya setuju" checked />);

    expect(screen.getByRole('checkbox', { name: 'Saya setuju' })).toBeChecked();
  });
});

describe('SegmentedControl', () => {
  const segments = [
    { value: 'minggu', label: 'Minggu ini' },
    { value: 'bulan', label: 'Bulan ini' },
  ];

  it('marks the chosen segment', () => {
    render(
      <SegmentedControl
        label="Periode"
        segments={segments}
        value="bulan"
        onValueChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('radiogroup', { name: 'Periode' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Bulan ini' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Minggu ini' })).not.toBeChecked();
  });

  it('reports the segment that is picked', async () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        label="Periode"
        segments={segments}
        value="bulan"
        onValueChange={onValueChange}
      />,
    );

    await userEvent.click(screen.getByRole('radio', { name: 'Minggu ini' }));

    expect(onValueChange).toHaveBeenCalledWith('minggu');
  });
});

describe('NumberStepper, limits and decimals', () => {
  it('enables a button that still has room', () => {
    render(<NumberStepper label="Jumlah" value={1} min={0} max={2} onValueChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Kurangi' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Tambah' })).toBeEnabled();
  });

  it('disables the button that would pass the limit', () => {
    render(<NumberStepper label="Jumlah" value={2} min={0} max={2} onValueChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Kurangi' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Tambah' })).toBeDisabled();
  });

  it('still steps to the limit when a whole step does not fit', async () => {
    const onValueChange = vi.fn();
    render(
      <NumberStepper label="Jumlah" value={499} step={2} max={500} onValueChange={onValueChange} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(onValueChange).toHaveBeenCalledWith(500);
  });

  it('keeps the digits of the value as well as of the step', async () => {
    const onValueChange = vi.fn();
    render(<NumberStepper label="Jumlah" value={1.25} onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(onValueChange).toHaveBeenCalledWith(2.25);
  });

  it('keeps the digits of a step that is written with an exponent', async () => {
    const onValueChange = vi.fn();
    render(
      <NumberStepper label="Jumlah" value={0} step={1e-7} max={1} onValueChange={onValueChange} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(onValueChange).toHaveBeenCalledWith(1e-7);
  });

  it('keeps the digits of the step', async () => {
    const onValueChange = vi.fn();
    render(
      <NumberStepper label="Jumlah" value={0.2} step={0.1} max={1} onValueChange={onValueChange} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(onValueChange).toHaveBeenCalledWith(0.3);
  });

  it('starts from the nearest limit when the value is outside the limits', async () => {
    const onValueChange = vi.fn();
    render(<NumberStepper label="Jumlah" value={600} max={500} onValueChange={onValueChange} />);

    expect(screen.getByRole('button', { name: 'Tambah' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Kurangi' }));

    expect(onValueChange).toHaveBeenCalledWith(499);
  });
});

describe('NumberStepper', () => {
  it('shows the value with its unit', () => {
    render(
      <NumberStepper label="Potong per hari" value={24} unit="potong" onValueChange={vi.fn()} />,
    );

    expect(screen.getByRole('group', { name: 'Potong per hari' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Angka' })).toHaveValue('24');
    expect(screen.getByText('potong')).toBeInTheDocument();
  });

  it('adds and subtracts one step', async () => {
    const onValueChange = vi.fn();
    render(
      <NumberStepper label="Potong per hari" value={24} step={2} onValueChange={onValueChange} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    await userEvent.click(screen.getByRole('button', { name: 'Kurangi' }));

    expect(onValueChange).toHaveBeenNthCalledWith(1, 26);
    expect(onValueChange).toHaveBeenNthCalledWith(2, 22);
  });

  it('lets the user type the number and keeps it inside the limits', async () => {
    const onValueChange = vi.fn();
    render(
      <NumberStepper label="Potong per hari" value={24} max={500} onValueChange={onValueChange} />,
    );
    const input = screen.getByRole('textbox', { name: 'Angka' });

    await userEvent.clear(input);
    await userEvent.type(input, '9x99');

    expect(onValueChange).toHaveBeenLastCalledWith(500);
    expect(onValueChange).toHaveBeenNthCalledWith(1, 9);
    // The field shows the limit as soon as the typed number goes past it
    expect(input).toHaveValue('500');
  });

  it('takes a comma as the decimal point when the step has decimals and ignores it for whole steps', async () => {
    const decimal = vi.fn();
    const { unmount } = render(
      <NumberStepper label="Tarif" value={1} step={0.1} onValueChange={decimal} />,
    );
    const field = screen.getByRole('textbox', { name: 'Angka' });
    await userEvent.clear(field);
    await userEvent.type(field, '1,57');

    expect(field).toHaveValue('1.5');
    expect(decimal).toHaveBeenLastCalledWith(1.5);
    unmount();

    const whole = vi.fn();
    render(<NumberStepper label="Potong" value={24} onValueChange={whole} />);
    const count = screen.getByRole('textbox', { name: 'Angka' });
    await userEvent.clear(count);
    await userEvent.click(count);
    await userEvent.paste('12,5');

    expect(count).toHaveValue('12');
    expect(whole).toHaveBeenLastCalledWith(12);
  });

  it('reads the new value out after a tap on a button', () => {
    const { container } = render(
      <NumberStepper label="Potong per hari" value={24} unit="potong" onValueChange={vi.fn()} />,
    );

    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('24 potong');
  });

  it('shows the value again when the user leaves an empty field', async () => {
    render(<NumberStepper label="Potong per hari" value={24} onValueChange={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: 'Angka' });

    await userEvent.clear(input);
    expect(input).toHaveValue('');
    await userEvent.tab();

    expect(input).toHaveValue('24');
  });

  it('stops at the limits', () => {
    render(<NumberStepper label="Potong per hari" value={0} max={0} onValueChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Kurangi' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tambah' })).toBeDisabled();
  });
});
