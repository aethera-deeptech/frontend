import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { DecisionButtons, RecommendationCard } from '@/components/ui/recommendation-card';

describe('RecommendationCard', () => {
  it('shows the title, the saving and the line under it', () => {
    render(
      <RecommendationCard
        title="Matikan kompresor"
        saving="Hemat Rp90.000"
        meta={<p>Kompresor</p>}
      />,
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Matikan kompresor' })).toBeVisible();
    expect(screen.getByText('Hemat Rp90.000')).toBeInTheDocument();
    expect(screen.getByText('Kompresor')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('turns the title into a link to the detail', () => {
    render(
      <MemoryRouter>
        <RecommendationCard title="Matikan kompresor" saving="Hemat Rp90.000" to="/saran/r3" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Matikan kompresor' })).toHaveAttribute(
      'href',
      '/saran/r3',
    );
  });

  it('keeps the buttons usable next to the link', async () => {
    const onApply = vi.fn();
    render(
      <MemoryRouter>
        <RecommendationCard
          title="Matikan kompresor"
          saving="Hemat Rp90.000"
          to="/saran/r3"
          actions={<DecisionButtons onApply={onApply} onDefer={vi.fn()} />}
        />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Terapkan' }));

    expect(onApply).toHaveBeenCalledTimes(1);
  });
});

describe('DecisionButtons, names', () => {
  it('names each button with the tip it acts on', () => {
    render(<DecisionButtons onApply={vi.fn()} onDefer={vi.fn()} subject="Matikan kompresor" />);

    expect(screen.getByRole('button', { name: 'Terapkan: Matikan kompresor' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Nanti: Matikan kompresor' })).toBeVisible();
  });
});

describe('DecisionButtons', () => {
  it('reports each choice', async () => {
    const onApply = vi.fn();
    const onDefer = vi.fn();
    render(<DecisionButtons onApply={onApply} onDefer={onDefer} />);

    await userEvent.click(screen.getByRole('button', { name: 'Terapkan' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nanti' }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onDefer).toHaveBeenCalledTimes(1);
  });

  it('waits while a decision is being sent', () => {
    render(<DecisionButtons onApply={vi.fn()} onDefer={vi.fn()} busy />);

    expect(screen.getByRole('button', { name: 'Terapkan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nanti' })).toBeDisabled();
  });
});
