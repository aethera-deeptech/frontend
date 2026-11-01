import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

export const addPath = '/alat/tambah';

interface StepFrameProps {
  title: string;
  subtitle: string;
  // Where the Kembali button leads
  backTo: string;
  children: ReactNode;
}

// The top of every step. Kembali shows on a phone, like on the other screens that open from a list.
export function StepFrame({ title, subtitle, backTo, children }: StepFrameProps) {
  return (
    <div className="flex flex-col gap-3 lg:max-w-lg">
      <title>{`${title} · Audit Energi UMKM`}</title>
      <div className="lg:hidden">
        <Button asChild size="lg">
          <Link to={backTo}>Kembali</Link>
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 text-text-heading lg:text-title">{title}</h1>
        <p className="text-body text-text-2">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
