import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { KeyValueRow } from '@/components/ui/key-value-row';
import { KpiCard } from '@/components/ui/kpi-card';
import { ListRow } from '@/components/ui/list-row';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { StatTile } from '@/components/ui/stat-tile';
import { StatusDot } from '@/components/ui/status-dot';
import { Tag } from '@/components/ui/tag';
import { TextLink } from '@/components/ui/text-link';

function inRouter(ui: ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Button', () => {
  it('is a button that does not submit a form unless it is told to', () => {
    render(<Button>Simpan</Button>);

    expect(screen.getByRole('button', { name: 'Simpan' })).toHaveAttribute('type', 'button');
  });

  it('calls the click handler', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Simpan</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does nothing when it is disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Simpan
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('takes the look onto a link when asChild is set', () => {
    inRouter(
      <Button asChild kind="accent">
        <a href="/alat">Tambah alat</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'Tambah alat' });

    expect(link).toHaveAttribute('href', '/alat');
    expect(link).not.toHaveAttribute('type');
  });
});

describe('Tag', () => {
  it('shows its text', () => {
    render(<Tag tone="danger">Anomali 1</Tag>);

    expect(screen.getByText('Anomali 1')).toBeInTheDocument();
  });
});

describe('StatusDot', () => {
  it.each([
    ['nyala', 'Nyala'],
    ['mati', 'Mati'],
    ['siaga', 'Siaga'],
    ['offline', 'Offline'],
    ['anomali', 'Anomali'],
  ] as const)('says %s in words', (status, word) => {
    render(<StatusDot status={status} />);

    expect(screen.getByText(word)).toBeInTheDocument();
  });
});

describe('Card', () => {
  it('shows the title as a heading', () => {
    render(<Card title="Perkiraan tagihan">isi</Card>);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Perkiraan tagihan' }),
    ).toBeInTheDocument();
    expect(screen.getByText('isi')).toBeInTheDocument();
  });

  it('has no heading without a title', () => {
    render(<Card>isi</Card>);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});

describe('KpiCard', () => {
  it('shows the label, the value and the optional parts', () => {
    render(
      <KpiCard
        label="Perkiraan hemat per bulan"
        value="Rp312.000"
        trailing="dari 3 saran"
        caption="Status 7 alat"
        tags={<Tag>Mati 1</Tag>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Perkiraan hemat per bulan' })).toBeInTheDocument();
    expect(screen.getByText('Rp312.000')).toBeInTheDocument();
    expect(screen.getByText('dari 3 saran')).toBeInTheDocument();
    expect(screen.getByText('Status 7 alat')).toBeInTheDocument();
    expect(screen.getByText('Mati 1')).toBeInTheDocument();
  });

  it('leaves out the parts that are not given', () => {
    render(<KpiCard label="Hari ini" value="4,2 kWh" />);

    expect(screen.getByText('4,2 kWh')).toBeInTheDocument();
    expect(screen.queryByText('dari 3 saran')).not.toBeInTheDocument();
  });
});

describe('Banner', () => {
  it('interrupts the reader for an error', () => {
    render(<Banner tone="danger" title="Gagal" message="Coba lagi nanti." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Gagal');
  });

  it.each(['info', 'warning'] as const)('waits to be read for the %s tone', (tone) => {
    render(<Banner tone={tone} title="Info" message="Pesan." />);

    expect(screen.getByRole('status')).toHaveTextContent('Pesan.');
  });

  it('shows the action under the text', () => {
    render(<Banner title="Info" message="Pesan." action={<Button size="sm">Lihat</Button>} />);

    expect(screen.getByRole('button', { name: 'Lihat' })).toBeInTheDocument();
  });
});

describe('ListRow', () => {
  it('is a plain row without a link', () => {
    render(
      <ul>
        <ListRow title="Mesin jahit 1" secondary="Colokan pintar" status="nyala" value="86 W" />
      </ul>,
    );

    expect(screen.getByRole('listitem')).toHaveTextContent('Mesin jahit 1');
    expect(screen.getByText('Nyala')).toBeInTheDocument();
    expect(screen.getByText('86 W')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('is a link to the detail when it has a destination', () => {
    inRouter(
      <ul>
        <ListRow title="Mesin jahit 1" valueNote="4,2 kWh hari ini" value="86 W" to="/alat/1" />
      </ul>,
    );

    expect(screen.getByRole('link', { name: /Mesin jahit 1/ })).toHaveAttribute('href', '/alat/1');
    expect(screen.getByText('4,2 kWh hari ini')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('says what is empty and offers the way out', () => {
    render(
      <EmptyState
        headline="Belum ada alat terpasang"
        message="Pasang colokan pintar."
        action={<Button kind="accent">Tambah alat</Button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Belum ada alat terpasang' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tambah alat' })).toBeInTheDocument();
  });
});

describe('SkeletonCard', () => {
  it('tells assistive technology that data is loading', () => {
    render(<SkeletonCard />);

    expect(screen.getByRole('status')).toHaveTextContent('Memuat data Anda');
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-busy');
  });

  it('can say what is loading', () => {
    render(<SkeletonCard label="Memuat laporan" />);

    expect(screen.getByText('Memuat laporan')).toBeInTheDocument();
  });
});

describe('TextLink', () => {
  it('links inside the app', () => {
    inRouter(<TextLink to="/saran">Lihat semua</TextLink>);

    expect(screen.getByRole('link', { name: 'Lihat semua' })).toHaveAttribute('href', '/saran');
  });
});

describe('StatTile and KeyValueRow', () => {
  it('show a label with its value', () => {
    render(
      <>
        <StatTile label="Hari ini" value="4,2 kWh" />
        <dl>
          <KeyValueRow label="Jenis" value="Colokan pintar" />
        </dl>
      </>,
    );

    expect(screen.getByText('Hari ini')).toBeInTheDocument();
    expect(screen.getByText('4,2 kWh')).toBeInTheDocument();
    expect(screen.getByText('Jenis')).toBeInTheDocument();
    expect(screen.getByText('Colokan pintar')).toBeInTheDocument();
  });
});
