import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const env = { sentryDsn: 'https://key@o1.ingest.de.sentry.io/2', sentryEnvironment: 'preview' };

// The module keeps the loaded SDK in a variable, so every test loads a fresh copy of it
async function load() {
  vi.resetModules();
  return import('@/lib/error-reporting');
}

describe('error reporting', () => {
  const init = vi.fn();
  const captureException = vi.fn();

  beforeEach(() => {
    init.mockClear();
    captureException.mockClear();
    vi.doMock('@sentry/react', () => ({ init, captureException }));
  });

  afterEach(() => {
    vi.doUnmock('@sentry/react');
  });

  it('does nothing when no DSN is set, and loads no SDK', async () => {
    const { initErrorReporting, reportError } = await load();

    initErrorReporting({ ...env, sentryDsn: '' });
    reportError(new Error('boom'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(init).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it('starts the SDK once with the DSN and the environment, and without personal data', async () => {
    const { initErrorReporting } = await load();

    initErrorReporting(env);
    initErrorReporting(env);

    await vi.waitFor(() => {
      expect(init).toHaveBeenCalledTimes(1);
    });
    expect(init).toHaveBeenCalledWith({
      dsn: env.sentryDsn,
      environment: 'preview',
      sendDefaultPii: false,
    });
  });

  it('sends a caught error once the SDK is up', async () => {
    const { initErrorReporting, reportError } = await load();
    const error = new Error('boom');

    initErrorReporting(env);
    reportError(error);

    await vi.waitFor(() => {
      expect(captureException).toHaveBeenCalledWith(error);
    });
  });

  it('ignores a caught error when reporting is not set up', async () => {
    const { reportError } = await load();

    expect(() => {
      reportError(new Error('boom'));
    }).not.toThrow();
    expect(captureException).not.toHaveBeenCalled();
  });

  it('keeps the app working when the SDK chunk cannot load', async () => {
    vi.doMock('@sentry/react', () => {
      throw new Error('chunk failed');
    });
    const { initErrorReporting, reportError } = await load();

    initErrorReporting(env);
    reportError(new Error('boom'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(init).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });
});
