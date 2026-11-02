import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { ApiError, apiRequest } from '@/api/client';

// The paths and shapes in this file follow openapi.yaml of the backend (tag Account).

export const meSchema = z.object({
  email: z.string(),
  emailVerified: z.boolean(),
  businessName: z.string(),
});

export type Me = z.infer<typeof meSchema>;

// The contract says an integer and no more, so a zero must not turn a sent email into an error. A wait that is not positive
// falls back to the usual 60 seconds.
const verificationSentSchema = z
  .object({ retryAfterSeconds: z.number().int() })
  .transform(({ retryAfterSeconds }) => ({
    retryAfterSeconds: retryAfterSeconds > 0 ? retryAfterSeconds : 60,
  }));

// The password rules of the API. The screens check them first, so a mistake shows without a round trip.
export const passwordLength = { min: 8, max: 128 } as const;
export const businessNameLength = { max: 80 } as const;

// The token of an email link has between 32 and 128 characters
export function isPlausibleToken(token: string): boolean {
  return token.length >= 32 && token.length <= 128;
}

export const sessionKey = ['session'] as const;

// Who is signed in. A 401 means nobody, and that is an answer and not a failure, so it does not retry.
export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: ({ signal }) => apiRequest('/v1/auth/me', meSchema, { signal }),
    retry: false,
  });
}

interface Credentials {
  email: string;
  password: string;
}

// Another account may have used this browser, so nothing cached for it may reach the next one. The answer of a sign in
// is the new session.
function useStartSession() {
  const queryClient = useQueryClient();

  return (me: Me) => {
    queryClient.removeQueries();
    queryClient.setQueryData(sessionKey, me);
  };
}

export function useLogin() {
  const startSession = useStartSession();

  return useMutation({
    mutationFn: (credentials: Credentials) =>
      apiRequest('/v1/auth/login', meSchema, { method: 'POST', body: credentials }),
    onSuccess: startSession,
    gcTime: 0,
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (account: Credentials & { businessName: string }) =>
      apiRequest('/v1/auth/register', verificationSentSchema, { method: 'POST', body: account }),
    gcTime: 0,
  });
}

// The link in the email opens the app, and the app sends the token here. The answer signs the user in.
export function useVerifyEmail() {
  const startSession = useStartSession();

  return useMutation({
    mutationFn: (token: string) =>
      apiRequest('/v1/auth/verify-email', meSchema, { method: 'POST', body: { token } }),
    onSuccess: startSession,
    gcTime: 0,
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) =>
      apiRequest('/v1/auth/resend-verification', verificationSentSchema, {
        method: 'POST',
        body: { email },
      }),
  });
}

// What a failed call means for the screen. The code is the contract, the status is the fallback.
export type AuthFailure =
  | 'invalid-credentials'
  | 'email-not-verified'
  | 'email-taken'
  | 'rate-limited'
  | 'invalid-input'
  | 'invalid-token'
  | 'offline'
  | 'other';

export function authFailure(error: unknown): AuthFailure {
  if (!(error instanceof ApiError)) {
    // A network error and a contract error both mean that the screen cannot tell what happened
    return error instanceof Error && error.name === 'NetworkError' ? 'offline' : 'other';
  }
  if (error.code === 'invalid_credentials' || error.status === 401) {
    return 'invalid-credentials';
  }
  if (error.code === 'email_not_verified') {
    return 'email-not-verified';
  }
  if (error.code === 'email_taken' || error.status === 409) {
    return 'email-taken';
  }
  if (error.code === 'token_invalid_or_expired' || error.status === 410) {
    return 'invalid-token';
  }
  if (error.status === 429) {
    return 'rate-limited';
  }
  if (error.status === 422) {
    return 'invalid-input';
  }
  return 'other';
}
