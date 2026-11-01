import { describe, expect, it } from 'vitest';

import { isGoogleSignInConfigured, parseEnv } from '@/lib/env';

describe('parseEnv', () => {
  it('reads the settings and drops a trailing slash from the API address', () => {
    const env = parseEnv({
      VITE_API_BASE_URL: 'https://api.example.com/',
      VITE_GOOGLE_CLIENT_ID: 'client-id',
      VITE_SENTRY_DSN: 'https://key@sentry.example.com/1',
      VITE_SENTRY_ENVIRONMENT: 'preview',
    });

    expect(env).toEqual({
      apiBaseUrl: 'https://api.example.com',
      googleClientId: 'client-id',
      sentryDsn: 'https://key@sentry.example.com/1',
      sentryEnvironment: 'preview',
    });
  });

  it('treats the optional settings as empty when they are missing', () => {
    const env = parseEnv({ VITE_API_BASE_URL: 'https://api.example.com' });

    expect(env.googleClientId).toBe('');
    expect(env.sentryDsn).toBe('');
    expect(env.sentryEnvironment).toBe('production');
  });

  it('refuses a missing or invalid API address and names the setting', () => {
    expect(() => parseEnv({})).toThrow('VITE_API_BASE_URL');
    expect(() => parseEnv({ VITE_API_BASE_URL: 'not a url' })).toThrow('VITE_API_BASE_URL');
  });
});

describe('isGoogleSignInConfigured', () => {
  it('is false for an empty client id and true otherwise', () => {
    const base = { apiBaseUrl: 'https://api.example.com', sentryDsn: '' };

    expect(isGoogleSignInConfigured({ ...base, googleClientId: '' })).toBe(false);
    expect(isGoogleSignInConfigured({ ...base, googleClientId: 'client-id' })).toBe(true);
  });
});
