import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';

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

// The sample text only lives in these stories. The app has no sample data.
const meta = {
  title: 'UI/Basic components',
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="max-w-sm">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tags: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Tag tone="danger">Anomali 1</Tag>
      <Tag tone="warning">Siaga 1</Tag>
      <Tag tone="success">Nyala 3</Tag>
      <Tag tone="accent">Terverifikasi</Tag>
      <Tag tone="muted">Mati 1</Tag>
    </div>
  ),
};

export const StatusDots: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <StatusDot status="nyala" />
      <StatusDot status="mati" />
      <StatusDot status="siaga" />
      <StatusDot status="offline" />
      <StatusDot status="anomali" />
    </div>
  ),
};

export const Cards: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Card title="Perkiraan tagihan bulan ini">
        <p className="text-body text-text-1">Isi kartu</p>
      </Card>
      <KpiCard
        label="Perkiraan hemat per bulan"
        value="Rp312.000"
        trailing="dari 3 saran"
        caption="Status 7 alat"
        tags={
          <>
            <Tag tone="danger">Anomali 1</Tag>
            <Tag tone="muted">Offline 1</Tag>
            <Tag tone="warning">Siaga 1</Tag>
            <Tag tone="success">Nyala 3</Tag>
            <Tag tone="muted">Mati 1</Tag>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Hari ini" value="4,2 kWh" />
        <StatTile label="Bulan ini" value="96 kWh" />
      </div>
    </div>
  ),
};

export const Banners: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Banner
        tone="info"
        title="Judul banner"
        message="Pesan singkat yang menjelaskan apa yang terjadi."
        action={<Button size="sm">Lihat</Button>}
      />
      <Banner tone="warning" title="Sambungan lambat" message="Data tertunda beberapa menit." />
      <Banner tone="danger" title="Alat tidak terjangkau" message="Periksa colokan dan Wi-Fi." />
    </div>
  ),
};

export const List: Story = {
  render: () => (
    <ul>
      <ListRow
        title="Mesin jahit 1"
        secondary="Colokan pintar"
        status="nyala"
        value="86 W"
        valueNote="4,2 kWh hari ini"
        to="/alat/1"
      />
      <ListRow title="Kipas gudang" status="offline" secondary="Menunggu data" to="/alat/2" />
      <ListRow title="Jenis" secondary="Colokan pintar" />
    </ul>
  ),
};

export const KeyValues: Story = {
  render: () => (
    <dl className="flex flex-col gap-1">
      <KeyValueRow label="Jenis" value="Colokan pintar" />
      <KeyValueRow label="Ruangan" value="Ruang jahit" />
    </dl>
  ),
};

export const EmptyAndLoading: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <EmptyState
        headline="Belum ada alat terpasang"
        message="Pasang colokan pintar atau penjepit arus."
        action={<Button kind="accent">Tambah alat</Button>}
      />
      <SkeletonCard />
    </div>
  ),
};

export const Links: Story = {
  render: () => <TextLink to="/saran">Lihat semua saran</TextLink>,
};
