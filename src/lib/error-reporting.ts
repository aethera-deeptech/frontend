import type { Env } from '@/lib/env';

type Sdk = typeof import('@/lib/sentry-sdk');

let sdk: Promise<Sdk | undefined> | undefined;

// The SDK loads as its own chunk, so the entry stays small and a build with no DSN never downloads it. An error that happens before
// the chunk has loaded is not reported, which is the price of keeping the SDK out of the entry.
export function initErrorReporting(env: Pick<Env, 'sentryDsn' | 'sentryEnvironment'>): void {
  if (env.sentryDsn === '' || sdk) {
    return;
  }

  // A blocked chunk or a failing init must not break the app, it only means that nothing is reported
  sdk = import('@/lib/sentry-sdk')
    .then((module) => {
      module.init({
        dsn: env.sentryDsn,
        environment: env.sentryEnvironment,
        // The default is to send the IP address, the cookies, the headers and the query string of the page. The reports need none of it.
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: false,
          httpBodies: [],
          urlQueryParams: false,
        },
        // Without a release a session per page load tells nothing, and it counts against the quota
        integrations: (defaults) => defaults.filter((item) => item.name !== 'BrowserSession'),
        // The message stays as the browser wrote it, and only the copy that goes to Sentry names the host
        enhanceFetchErrorMessages: 'report-only',
      });

      return module;
    })
    .catch(() => undefined);
}

// For an error that the app catches itself, such as one that a route boundary shows
export function reportError(error: unknown): void {
  void sdk?.then((module) => module?.captureException(error));
}
