import { useEffect, useRef, type ReactNode } from 'react';

import { Link } from 'react-router';

import { PendingIndicator } from '@/components/layout/pending-indicator';

interface AuthFrameProps {
  title: string;
  subtitle: string;
  // A short line above the title, for a question about one thing, such as the name of a device. It takes the place of the link with the name of the app.
  eyebrow?: string;
  children: ReactNode;
}

// The frame of the screens before the login. It sits outside the app shell, so it has no menu.
export function AuthFrame({ title, subtitle, eyebrow, children }: AuthFrameProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // A move to another screen of the account leaves the focus on a link that is gone, so the heading takes it
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-4 p-4 lg:justify-center">
      <title>{`${title} · WATTLINK`}</title>
      <PendingIndicator />
      {eyebrow ? (
        <p className="text-label-strong text-text-heading min-w-0 break-words">{eyebrow}</p>
      ) : (
        <Link to="/" className="text-h2 text-text-heading self-start rounded-md">
          WATTLINK
        </Link>
      )}
      <div className="flex flex-col gap-1">
        <h1 ref={headingRef} tabIndex={-1} className="text-title text-text-heading outline-none">
          {title}
        </h1>
        <p className="text-body text-text-2">{subtitle}</p>
      </div>
      {children}
    </main>
  );
}
