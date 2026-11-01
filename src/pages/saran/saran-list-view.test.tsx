import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { SaranListView, visibleItems } from '@/pages/saran/saran-list-view';
import { sampleList } from '@/pages/saran/sample-saran';

function renderList(props: Partial<ComponentProps<typeof SaranListView>> = {}) {
  return render(
    <MemoryRouter>
      <SaranListView
        data={sampleList()}
        filter="all"
        onFilterChange={vi.fn()}
        onDecision={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('visibleItems', () => {
  it('puts the tips that wait first and a deferred tip behind the new ones', () => {
    const { waiting, handled } = visibleItems(sampleList().items, 'all');

    expect(waiting.map((item) => item.id)).toEqual(['r1', 'r2']);
    expect(handled.map((item) => item.id)).toEqual(['r3', 'r4', 'r5']);
  });

  it('keeps only the chosen status', () => {
    const { waiting, handled } = visibleItems(sampleList().items, 'verified');

    expect(waiting).toEqual([]);
    expect(handled.map((item) => item.id)).toEqual(['r4']);
  });

  it('puts a deferred tip after a pending tip even when it came first', () => {
    const [pending, deferred] = sampleList().items;
    const { waiting } = visibleItems(
      [deferred, pending].filter((item) => item !== undefined),
      'all',
    );

    expect(waiting.map((item) => item.id)).toEqual(['r1', 'r2']);
  });
});

describe('SaranListView', () => {
  it('groups the tips and links each one to its detail', () => {
    renderList();

    expect(screen.getByRole('heading', { name: 'Menunggu keputusan Anda' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sudah Anda tangani' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Matikan mesin jahit 3 di luar jam kerja' }),
    ).toHaveAttribute('href', '/saran/r1');
  });

  it('shows the decision buttons only for a tip that is new', () => {
    renderList();

    expect(screen.getAllByRole('button', { name: 'Terapkan' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Nanti' })).toHaveLength(1);
  });

  it('reports the decision for the tip', async () => {
    const onDecision = vi.fn();
    renderList({ onDecision });

    await userEvent.click(screen.getByRole('button', { name: 'Nanti' }));

    expect(onDecision).toHaveBeenCalledWith('r1', 'defer');
  });

  it('shows the status of the tips that are handled with their note', () => {
    renderList();

    expect(screen.getByText('Hari ke-9 dari 14')).toBeInTheDocument();
    expect(screen.getByText('Energi per potong turun 9,8%')).toBeInTheDocument();
    expect(screen.getByText('Ditolak')).toBeInTheDocument();
    expect(screen.getByText('Ditunda')).toBeInTheDocument();
  });

  it('marks the tip that is open', () => {
    renderList({ selectedId: 'r4' });

    expect(screen.getByRole('link', { name: 'Atur ulang jam nyala kipas gudang' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('says that no tip has the chosen status and offers all of them', async () => {
    const onFilterChange = vi.fn();
    renderList({
      data: {
        ...sampleList(),
        items: sampleList().items.filter((item) => item.status !== 'deferred'),
      },
      filter: 'deferred',
      onFilterChange,
    });

    expect(
      screen.getByRole('heading', { name: 'Belum ada saran yang ditunda' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tampilkan semua status' }));

    expect(onFilterChange).toHaveBeenCalledWith('all');
  });

  it('lets the user pick a status', async () => {
    const onFilterChange = vi.fn();
    renderList({ onFilterChange });

    await userEvent.click(screen.getByRole('combobox', { name: 'Tampilkan' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Ditolak' }));

    expect(onFilterChange).toHaveBeenCalledWith('rejected');
  });

  it('explains the empty list when no device is installed or no tip exists', () => {
    renderList({ data: { phase: 'no-devices', businessName: 'Maju' } });

    expect(
      screen.getByText('Saran pertama muncul setelah alat terpasang dan 7 hari data terkumpul.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tambah alat' })).toHaveAttribute(
      'href',
      '/alat/tambah',
    );
  });

  it('explains the empty list while the first days are collected', () => {
    renderList({ data: { phase: 'collecting', businessName: 'Maju', neededDays: 7 } });

    expect(
      screen.getByText(
        'Sistem sedang mengumpulkan data awal. Saran pertama muncul setelah 7 hari data.',
      ),
    ).toBeInTheDocument();
    expect(within(document.body).queryByRole('combobox')).not.toBeInTheDocument();
  });
});
