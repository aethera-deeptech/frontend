import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigation } from 'react-router';

import { navItems } from '@/components/layout/nav-items';

// The menu is a bottom bar on a phone and a sidebar from 1024 px, like the Mobile and Desktop frames.
export function AppShell() {
  const { pathname } = useLocation();
  // A page opens as its own chunk, so after a tap the old page stays until the new one has loaded
  const pending = useNavigation().state === 'loading';
  const mainRef = useRef<HTMLElement>(null);
  const openPath = useRef(pathname);

  // A client side navigation moves no focus by itself, so a screen reader would stay on the link that vanished.
  // The first render keeps the focus where the browser put it.
  useEffect(() => {
    if (openPath.current !== pathname) {
      openPath.current = pathname;
      mainRef.current?.focus();
    }
  }, [pathname]);

  return (
    <div className="min-h-dvh lg:pl-60">
      {/* A thin bar for the sighted user. It fades in after 150 ms, so a page that opens at once shows no flicker. */}
      <div
        aria-hidden="true"
        className={clsx(
          'bg-btn-accent-face fixed inset-x-0 top-0 z-30 h-0.5',
          pending
            ? 'animate-pending opacity-0 motion-reduce:animate-none motion-reduce:opacity-100'
            : 'hidden',
        )}
      />
      {/* The same news for a screen reader. The region is always there, so the text is read out when it changes. */}
      <div aria-live="polite" className="sr-only">
        {pending ? 'Memuat halaman' : ''}
      </div>
      <a
        href="#konten"
        className="bg-bg-1 text-text-heading text-button fixed top-2 left-2 z-20 -translate-y-16 rounded-md px-3 py-3 focus:translate-y-0"
      >
        Lewati ke konten
      </a>

      <div className="bg-bg-1 border-border-1 fixed inset-y-0 left-0 z-10 hidden w-60 border-r lg:block">
        <nav aria-label="Menu utama" className="flex flex-col gap-4 p-4">
          <Link to="/" className="text-h2 text-text-heading rounded-md">
            Audit Energi UMKM
          </Link>
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'text-button relative flex h-10 items-center rounded-md px-3',
                      isActive
                        ? 'bg-bg-accent-muted text-text-accent'
                        : 'text-text-1 hover:bg-bg-3',
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
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <main
        ref={mainRef}
        id="konten"
        aria-busy={pending}
        tabIndex={-1}
        className="p-4 pb-34 outline-none lg:p-6 lg:pb-24"
      >
        <Outlet />
      </main>

      <nav
        aria-label="Menu utama"
        className="bg-bg-1 border-border-1 fixed inset-x-0 bottom-0 z-10 border-t px-1 py-2 lg:hidden"
      >
        <ul className="flex">
          {navItems.map((item) => (
            <li key={item.to} className="flex flex-1">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className="text-label-strong flex min-h-[46px] flex-1 flex-col items-center gap-0.5 rounded-md py-0.5"
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
                    <span className={isActive ? 'text-text-accent' : 'text-text-2'}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
