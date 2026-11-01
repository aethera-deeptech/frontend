import type {
  RecommendationList,
  RecommendationListItem,
  RecommendationStatus,
} from '@/api/recommendations';
import { Button } from '@/components/ui/button';
import { AddDeviceButton } from '@/components/ui/add-device-button';
import { EmptyState } from '@/components/ui/empty-state';
import { DecisionButtons, RecommendationCard } from '@/components/ui/recommendation-card';
import { Select } from '@/components/ui/select';
import { Tag } from '@/components/ui/tag';
import { formatPercent, formatRupiah } from '@/lib/format';
import { statusLabels, statusTones } from '@/pages/saran/recommendation-status';
import { filterOptions, visibleItems, type StatusFilter } from '@/pages/saran/saran-filter';

interface SaranListViewProps {
  data: RecommendationList;
  filter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  onDecision: (id: string, decision: 'apply' | 'defer') => void;
  // The id of the tip whose decision is being sent
  busyId?: string;
  // The tip that is open in the detail next to the list
  selectedId?: string;
}

const noTipsYet = 'Saran pertama muncul setelah alat terpasang dan 7 hari data terkumpul.';

export function SaranListView({
  data,
  filter,
  onFilterChange,
  onDecision,
  busyId,
  selectedId,
}: SaranListViewProps) {
  if (data.phase === 'collecting') {
    return (
      <EmptyState
        headline="Belum ada saran"
        message={`Sistem sedang mengumpulkan data awal. Saran pertama muncul setelah ${data.neededDays.toString()} hari data.`}
      />
    );
  }

  if (data.phase === 'no-devices') {
    return (
      <EmptyState headline="Belum ada saran" message={noTipsYet} action={<AddDeviceButton />} />
    );
  }

  if (data.items.length === 0) {
    return <EmptyState headline="Belum ada saran" message={noTipsYet} />;
  }

  const { waiting, handled } = visibleItems(data.items, filter);

  return (
    <div className="flex flex-col gap-3">
      <Select
        label="Tampilkan"
        options={filterOptions}
        value={filter}
        onValueChange={(value) => {
          onFilterChange(value as StatusFilter);
        }}
      />
      {waiting.length === 0 && handled.length === 0 ? (
        <EmptyState
          headline={`Belum ada saran yang ${statusLabels[filter as RecommendationStatus].toLowerCase()}`}
          message={
            filter === 'deferred'
              ? 'Saran yang Anda tunda dengan tombol Nanti muncul di sini. Anda yang memutuskan kapan menerapkannya.'
              : 'Saran dengan status ini muncul di sini.'
          }
          action={
            <Button
              size="lg"
              onClick={() => {
                onFilterChange('all');
              }}
            >
              Tampilkan semua status
            </Button>
          }
        />
      ) : null}
      {waiting.length > 0 ? (
        <>
          <h2 className="text-h2 text-text-heading lg:sr-only">Menunggu keputusan Anda</h2>
          {waiting.map((item) => (
            <Row
              key={item.id}
              item={item}
              onDecision={onDecision}
              busy={busyId === item.id}
              selected={selectedId === item.id}
            />
          ))}
        </>
      ) : null}
      {handled.length > 0 ? (
        <>
          <h2 className="text-h2 text-text-heading lg:sr-only">Sudah Anda tangani</h2>
          {handled.map((item) => (
            <Row
              key={item.id}
              item={item}
              onDecision={onDecision}
              busy={busyId === item.id}
              selected={selectedId === item.id}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

function Row({
  item,
  onDecision,
  busy,
  selected,
}: {
  item: RecommendationListItem;
  onDecision: SaranListViewProps['onDecision'];
  busy: boolean;
  selected: boolean;
}) {
  const note =
    item.status === 'applied' && item.progress
      ? `Hari ke-${item.progress.collectedDays.toString()} dari ${item.progress.neededDays.toString()}`
      : item.status === 'verified' && item.resultPercent !== undefined
        ? `Energi per potong turun ${formatPercent(item.resultPercent)}`
        : undefined;

  return (
    <RecommendationCard
      title={item.title}
      saving={`Perkiraan hemat sekitar ${formatRupiah(item.savingPerMonthRp)} per bulan`}
      to={`/saran/${encodeURIComponent(item.id)}`}
      selected={selected}
      meta={
        item.status === 'pending' ? undefined : (
          <div className="flex items-center gap-2">
            <Tag tone={statusTones[item.status]}>{statusLabels[item.status]}</Tag>
            {note ? <p className="text-label text-text-2">{note}</p> : null}
          </div>
        )
      }
      actions={
        item.status === 'pending' ? (
          <DecisionButtons
            busy={busy}
            onApply={() => {
              onDecision(item.id, 'apply');
            }}
            onDefer={() => {
              onDecision(item.id, 'defer');
            }}
          />
        ) : undefined
      }
    />
  );
}
