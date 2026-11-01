import clsx from 'clsx';
import { Link, NavLink, Outlet } from 'react-router';

import { navItems } from '@/components/layout/nav-items';

// The menu is a bottom bar on a phone and a sidebar from 1024 px, like the Mobile and Desktop frames.
export function AppShell() {
  return (
    <div className="min-h-dvh lg:pl-60">
      <a
        href="#konten"
        className="bg-bg-1 text-text-heading text-button fixed top-2 left-2 z-20 -translate-y-16 rounded-md px-3 py-3 focus:translate-y-0"
      >
        Lewati ke konten
      </a>

      <div className="bg-bg-1 border-border-1 fixed inset-y-0 left-0 z-10 hidden w-60 border-r lg:block">
        <nav aria-label="Menu utama" className="flex flex-col gap-1 p-4">
          <Link to="/" className="text-h2 text-text-heading mb-3 rounded-md">
            Audit Energi UMKM
          </Link>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'text-button relative flex h-10 items-center rounded-md px-3',
                  isActive ? 'bg-bg-accent-muted text-text-accent' : 'text-text-1 hover:bg-bg-3',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="bg-text-accent absolute inset-y-0 left-0 w-[3px] rounded-[2px]"
                    />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <main
        id="konten"
        tabIndex={-1}
        className="p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] outline-none lg:p-6"
      >
        <Outlet />
      </main>

      <nav
        aria-label="Menu utama"
        className="bg-bg-1 border-border-1 fixed inset-x-0 bottom-0 z-10 flex border-t px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="text-label-strong flex min-h-[46px] flex-1 flex-col items-center gap-0.5 rounded-lg py-0.5"
          >
            {({ isActive }) => (
              <>
                <span
                  className={clsx(
                    'flex h-7 w-14 items-center justify-center rounded-xl',
                    isActive ? 'bg-bg-accent-muted text-text-accent' : 'text-text-2',
                  )}
                >
                  <item.icon />
                </span>
                <span className={isActive ? 'text-text-accent' : 'text-text-2'}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
