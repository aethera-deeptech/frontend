import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  // A line under the title. The Mobile frames have none, so it shows from 1024 px.
  subtitle?: string;
  // Controls at the right, for example a button
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-h2 text-text-heading lg:text-title break-words">{title}</h1>
        {subtitle ? <p className="text-body text-text-2 hidden lg:block">{subtitle}</p> : null}
      </div>
      {actions}
    </header>
  );
}
