import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { z } from 'zod';

import {
  hasNoRelay,
  scheduleDays,
  useDeleteSchedule,
  useRelay,
  useSaveSchedule,
  type RelaySchedule,
} from '@/api/relay';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup } from '@/components/ui/radio-group';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { useBusinessZone } from '@/hooks/use-business-zone';
import {
  quarterHourOptions,
  scheduleDayLabels,
  scheduleNoticeState,
  scheduleRemovedState,
  zoneShortName,
} from '@/pages/alat/schedule-text';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const schema = z
  .object({
    offAt: time,
    withOn: z.boolean(),
    onAt: time,
    days: z.enum(scheduleDays),
    enabled: z.boolean(),
  })
  // The service refuses an on time that equals the off time
  .refine((values) => !values.withOn || values.onAt !== values.offAt, {
    path: ['onAt'],
    message: 'Jam nyala harus beda dari jam mati.',
  });

type Values = z.infer<typeof schema>;

// A new schedule starts at the end of a working day, and the on time waits behind its checkbox
const newValues: Values = {
  offAt: '17:00',
  withOn: false,
  onAt: '08:00',
  days: 'mon-fri',
  enabled: true,
};

function valuesOf(schedule: RelaySchedule | null): Values {
  return schedule
    ? {
        offAt: schedule.offAt,
        withOn: schedule.onAt !== null,
        onAt: schedule.onAt ?? newValues.onAt,
        days: schedule.days,
        enabled: schedule.enabled,
      }
    : newValues;
}

export function AlatSchedulePage() {
  const { id = '' } = useParams();
  const { search } = useLocation();
  const query = useRelay(id);
  const back = `/alat/${encodeURIComponent(id)}${search}`;

  if (query.data) {
    return <ScheduleForm id={id} schedule={query.data.schedule} back={back} />;
  }
  if (query.isPending) {
    return <SkeletonCard label="Memuat jadwal" />;
  }
  // A clamp has no switch, and a plug that is gone has nothing to schedule
  const noSwitch = hasNoRelay(query.error);

  return (
    <Banner
      tone={noSwitch ? 'info' : 'danger'}
      title={noSwitch ? 'Alat ini tidak punya saklar' : 'Jadwal tidak bisa dimuat'}
      message={
        noSwitch
          ? 'Jadwal hanya bisa diatur untuk WATTLINK Plug.'
          : 'Coba lagi. Jika tetap gagal, periksa koneksi internet Anda.'
      }
      action={
        noSwitch ? (
          <Button asChild size="lg">
            <Link to={back}>Kembali</Link>
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => {
              void query.refetch();
            }}
          >
            Coba lagi
          </Button>
        )
      }
    />
  );
}

function ScheduleForm({
  id,
  schedule,
  back,
}: {
  id: string;
  schedule: RelaySchedule | null;
  back: string;
}) {
  const navigate = useNavigate();
  const save = useSaveSchedule(id);
  const remove = useDeleteSchedule(id);
  const zone = zoneShortName(useBusinessZone());
  const { control, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: valuesOf(schedule),
  });
  const [withOn, enabled] = useWatch({ control, name: ['withOn', 'enabled'] });
  const options = quarterHourOptions([schedule?.offAt, schedule?.onAt].filter((t) => t != null));
  const busy = save.isPending || remove.isPending;
  const title = schedule ? 'Ubah jadwal' : 'Atur jadwal';
  const failed = save.isError || remove.isError;

  return (
    <form
      noValidate
      className="flex flex-col gap-3 lg:max-w-lg"
      onSubmit={(event) => {
        void handleSubmit((values) => {
          const input = {
            offAt: values.offAt,
            onAt: values.withOn ? values.onAt : null,
            days: values.days,
            enabled: values.enabled,
          };

          save.mutate(input, {
            onSuccess: () => {
              void navigate(back, { state: scheduleNoticeState(input) });
            },
          });
        })(event);
      }}
    >
      <title>{`${title} · WATTLINK`}</title>
      <div className="lg:hidden">
        <Button asChild size="lg">
          <Link to={back}>Kembali</Link>
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 text-text-heading lg:text-title">{title}</h1>
        <p className="text-body text-text-2">
          Atur jam colokan mati sendiri. Jika Anda mau, colokan juga bisa nyala lagi sendiri.
        </p>
      </div>
      {failed ? (
        <Banner
          tone="danger"
          title={remove.isError ? 'Jadwal belum dihapus' : 'Jadwal belum tersimpan'}
          message="Periksa sambungan Anda, lalu coba lagi."
        />
      ) : null}
      {schedule ? (
        <div className="flex flex-col">
          <Controller
            control={control}
            name="enabled"
            render={({ field }) => (
              <Checkbox
                label="Jadwal berjalan"
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked === true);
                }}
              />
            )}
          />
          {enabled ? null : (
            <p className="text-label text-text-2">
              Jadwal dijeda. Jam tersimpan, tetapi colokan tidak berganti sendiri.
            </p>
          )}
        </div>
      ) : null}
      <Controller
        control={control}
        name="offAt"
        render={({ field }) => (
          <Select
            label="Mati pukul"
            value={field.value}
            onValueChange={field.onChange}
            options={options}
            helper={`Jam mengikuti zona waktu usaha Anda, ${zone}.`}
          />
        )}
      />
      <Controller
        control={control}
        name="withOn"
        render={({ field }) => (
          <Checkbox
            label="Nyalakan lagi otomatis"
            checked={field.value}
            onCheckedChange={(checked) => {
              field.onChange(checked === true);
            }}
          />
        )}
      />
      {withOn ? (
        <Controller
          control={control}
          name="onAt"
          render={({ field }) => (
            <Select
              label="Nyala pukul"
              value={field.value}
              onValueChange={field.onChange}
              options={options}
              error={formState.errors.onAt?.message}
            />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="days"
        render={({ field }) => (
          <RadioGroup
            label="Berlaku pada"
            value={field.value}
            onValueChange={field.onChange}
            options={scheduleDays.map((value) => ({ value, label: scheduleDayLabels[value] }))}
          />
        )}
      />
      <p className="text-label text-text-2">
        Perubahan berlaku mulai sekarang. Jam yang sudah lewat hari ini tidak dijalankan. Colokan
        bisa berganti sampai satu menit setelah jam itu.
      </p>
      <Button type="submit" kind="accent" size="lg" disabled={busy}>
        {save.isPending ? 'Sedang menyimpan' : 'Simpan'}
      </Button>
      <Button asChild size="lg">
        <Link to={back}>Batal</Link>
      </Button>
      {schedule ? (
        <button
          type="button"
          disabled={busy}
          className="text-body text-text-danger self-start rounded-md px-1 py-[13px] underline disabled:opacity-(--disabled-opacity)"
          onClick={() => {
            remove.mutate(undefined, {
              onSuccess: () => {
                void navigate(back, { state: scheduleRemovedState });
              },
            });
          }}
        >
          Hapus jadwal
        </button>
      ) : null}
    </form>
  );
}
