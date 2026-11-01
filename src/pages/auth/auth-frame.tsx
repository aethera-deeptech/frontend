import type { ReactNode } from 'react';

import { Link } from 'react-router';

import { Banner } from '@/components/ui/banner';

// The disabled fields and the Google button point at the notice, so assistive technology can tell why they do not work
export const noticeId = 'auth-notice';

interface AuthFrameProps {
  title: string;
  subtitle: string;
  // Says that the form cannot be used yet
  notice: { title: string; message: string };
  children: ReactNode;
}

// The frame of the screens before the login. It sits outside the app shell, so it has no menu.
export function AuthFrame({ title, subtitle, notice, children }: AuthFrameProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-4 p-4 lg:justify-center">
      <title>{`${title} · Audit Energi UMKM`}</title>
      <Link to="/" className="text-h2 text-text-heading self-start rounded-md">
        Audit Energi UMKM
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-title text-text-heading">{title}</h1>
        <p className="text-body text-text-2">{subtitle}</p>
      </div>
      <Banner id={noticeId} tone="info" title={notice.title} message={notice.message} />
      {children}
    </main>
  );
}
