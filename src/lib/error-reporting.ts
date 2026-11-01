import type { Env } from '@/lib/env';

type SentryModule = typeof import('@sentry/react');

let sentry: Promise<SentryModule | undefined> | undefined;

// The SDK loads as its own chunk, so the entry stays small and a build with no DSN never downloads it. An error that happens before
// the chunk has loaded is not reported, which is the price of keeping the SDK out of the entry.
export function initErrorReporting(env: Pick<Env, 'sentryDsn' | 'sentryEnvironment'>): void {
  if (env.sentryDsn === '' || sentry) {
    return;
  }

  sentry = import('@sentry/react').then(
    (module) => {
      module.init({
        dsn: env.sentryDsn,
        environment: env.sentryEnvironment,
        // The app has no tracing and no replay, and the reports carry no IP address or cookie of the user
        sendDefaultPii: false,
      });

      return module;
    },
    // A blocked or failed chunk must not break the app, it only means that nothing is reported
    () => undefined,
  );
}

// For an error that the app catches itself, such as one that a route boundary shows
export function reportError(error: unknown): void {
  void sentry?.then((module) => module?.captureException(error));
}
