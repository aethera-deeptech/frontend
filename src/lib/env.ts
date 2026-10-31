import { z } from 'zod';

// The values are public and baked into the build, so a change needs a new build.
// An empty value means the feature is not configured, for example no Google sign-in.
const envSchema = z.object({
  VITE_API_BASE_URL: z.url({
    error: 'VITE_API_BASE_URL must be a full URL, for example https://api.example.com',
  }),
  VITE_GOOGLE_CLIENT_ID: z.string().default(''),
  VITE_SENTRY_DSN: z.string().default(''),
});

export interface Env {
  apiBaseUrl: string;
  googleClientId: string;
  sentryDsn: string;
}

export function parseEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const problems = parsed.error.issues.map((e) => `${e.path.join('.')} ${e.message}`);
    throw new Error(`The build settings are not valid. ${problems.join(' ')}`);
  }

  return {
    // no trailing slash, so a path is always joined with a single slash
    apiBaseUrl: parsed.data.VITE_API_BASE_URL.replace(/\/+$/, ''),
    googleClientId: parsed.data.VITE_GOOGLE_CLIENT_ID,
    sentryDsn: parsed.data.VITE_SENTRY_DSN,
  };
}

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= parseEnv(import.meta.env);
  return cached;
}

export function isGoogleSignInConfigured(env: Env): boolean {
  return env.googleClientId !== '';
}
