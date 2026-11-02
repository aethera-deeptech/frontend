import type { ReactNode } from 'react';

import { Link } from 'react-router';

import { PendingIndicator } from '@/components/layout/pending-indicator';

interface AuthFrameProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

// The frame of the screens before the login. It sits outside the app shell, so it has no menu.
export function AuthFrame({ title, subtitle, children }: AuthFrameProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-4 p-4 lg:justify-center">
      <title>{`${title} · WATTLINK`}</title>
      <PendingIndicator />
      <Link to="/" className="text-h2 text-text-heading self-start rounded-md">
        WATTLINK
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-title text-text-heading">{title}</h1>
        <p className="text-body text-text-2">{subtitle}</p>
      </div>
      {children}
    </main>
  );
}
