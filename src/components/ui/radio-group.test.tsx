import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { RadioGroup } from '@/components/ui/radio-group';

const options = [
  { value: 'a', label: 'Senin sampai Jumat' },
  { value: 'b', label: 'Setiap hari' },
];

function Example({ disabled }: { disabled?: boolean }) {
  const [value, setValue] = useState('a');

  return (
    <RadioGroup
      label="Berlaku pada"
      value={value}
      onValueChange={setValue}
      options={options}
      disabled={disabled}
    />
  );
}

describe('RadioGroup', () => {
  it('names the group and checks the chosen row', () => {
    render(<Example />);

    expect(screen.getByRole('radiogroup', { name: 'Berlaku pada' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Senin sampai Jumat' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Setiap hari' })).not.toBeChecked();
  });

  it('moves the choice when the owner clicks a row or its label', async () => {
    render(<Example />);

    await userEvent.click(screen.getByText('Setiap hari'));

    expect(screen.getByRole('radio', { name: 'Setiap hari' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Senin sampai Jumat' })).not.toBeChecked();
  });

  it('does not move when it is disabled', async () => {
    render(<Example disabled />);

    await userEvent.click(screen.getByText('Setiap hari'));

    expect(screen.getByRole('radio', { name: 'Senin sampai Jumat' })).toBeChecked();
  });
});
