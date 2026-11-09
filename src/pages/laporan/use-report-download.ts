import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { downloadReport } from '@/api/reports';
import { formatMonthYear } from '@/lib/format';

// A month is named by its name and year, and a week by its ISO number, for example Laporan-Minggu-2026-W43.pdf
export function reportFileName(period: string): string {
  return /-W\d{2}$/.test(period)
    ? `Laporan-Minggu-${period}.pdf`
    : `Laporan-${formatMonthYear(period).replace(' ', '-')}.pdf`;
}

export type ReportDownload =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'done'; fileName: string; url: string }
  // The error is what the download failed with, so a busy service gets its own banner
  | { status: 'failed'; error?: unknown };

// Fetches the PDF, hands it to the browser to save and keeps the address of the file so that the user can open it too.
export function useReportDownload() {
  // A download that the user leaves, by picking another month or by closing the page, must not save a file afterwards
  const controller = useRef<AbortController | null>(null);
  const mutation = useMutation({
    // A download reads a file and writes nothing, so a busy answer needs no re-read of the screens
    meta: { skipReread: true },
    mutationFn: async (period: string) => {
      const request = new AbortController();
      controller.current = request;
      const blob = await downloadReport(period, request.signal);
      if (request.signal.aborted) {
        throw new DOMException('The download was left.', 'AbortError');
      }
      const url = URL.createObjectURL(blob);
      const fileName = reportFileName(period);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      return { url, fileName };
    },
  });
  const { data, reset: resetMutation } = mutation;

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const url = data?.url;
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [data]);

  const state: ReportDownload = mutation.isPending
    ? { status: 'busy' }
    : mutation.isError
      ? { status: 'failed', error: mutation.error }
      : data
        ? { status: 'done', ...data }
        : { status: 'idle' };

  function reset() {
    controller.current?.abort();
    resetMutation();
  }

  return { state, start: mutation.mutate, reset };
}
