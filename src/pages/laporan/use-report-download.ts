import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

import { downloadReport } from '@/api/reports';
import { formatMonthYear } from '@/lib/format';

export function reportFileName(period: string): string {
  return `Laporan-${formatMonthYear(period).replace(' ', '-')}.pdf`;
}

export type ReportDownload =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'done'; fileName: string; url: string }
  | { status: 'failed' };

// Fetches the PDF, hands it to the browser to save and keeps the address of the file so that the user can open it too.
export function useReportDownload() {
  const mutation = useMutation({
    mutationFn: async (period: string) => {
      const blob = await downloadReport(period);
      const url = URL.createObjectURL(blob);
      const fileName = reportFileName(period);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      return { url, fileName };
    },
  });
  const { data, reset } = mutation;

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
      ? { status: 'failed' }
      : data
        ? { status: 'done', ...data }
        : { status: 'idle' };

  return { state, start: mutation.mutate, reset };
}
