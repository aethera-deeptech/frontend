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

// The mutations of the account carry this first part of the key. A 401 on them is the answer of the form (a wrong password,
// no session to end) and not a sign that the session ended, so the rule for a 401 skips them.
export const authMutationKey = ['auth'] as const;

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
    mutationKey: [...authMutationKey, 'login'],
    mutationFn: (credentials: Credentials) =>
      apiRequest('/v1/auth/login', meSchema, { method: 'POST', body: credentials }),
    onSuccess: startSession,
    gcTime: 0,
  });
}

export function useRegister() {
  return useMutation({
    mutationKey: [...authMutationKey, 'register'],
    mutationFn: (account: Credentials & { businessName: string }) =>
      apiRequest('/v1/auth/register', verificationSentSchema, { method: 'POST', body: account }),
    gcTime: 0,
  });
}

// The link in the email opens the app, and the app sends the token here. The answer signs the user in.
export function useVerifyEmail() {
  const startSession = useStartSession();

  return useMutation({
    mutationKey: [...authMutationKey, 'verify-email'],
    mutationFn: (token: string) =>
      apiRequest('/v1/auth/verify-email', meSchema, { method: 'POST', body: { token } }),
    onSuccess: startSession,
    gcTime: 0,
  });
}

export function useResendVerification() {
  return useMutation({
    mutationKey: [...authMutationKey, 'resend'],
    mutationFn: (email: string) =>
      apiRequest('/v1/auth/resend-verification', verificationSentSchema, {
        method: 'POST',
        body: { email },
      }),
  });
}

// Moves an account that is not verified to another address. The user is not signed in, so the call carries the current email
// and the password. The API sends the new verification email to the new address.
export function useChangeEmail() {
  return useMutation({
    mutationKey: [...authMutationKey, 'change-email'],
    mutationFn: (change: { email: string; password: string; newEmail: string }) =>
      apiRequest('/v1/auth/change-email', verificationSentSchema, {
        method: 'POST',
        body: change,
      }),
    gcTime: 0,
  });
}

// Asks for the email with the link to a new password. The answer is the same for every address, so the screen cannot tell
// whether the account exists.
export function useForgotPassword() {
  return useMutation({
    mutationKey: [...authMutationKey, 'forgot-password'],
    mutationFn: (email: string) =>
      apiRequest('/v1/auth/forgot-password', verificationSentSchema, {
        method: 'POST',
        body: { email },
      }),
    gcTime: 0,
  });
}

// Sets the new password with the token of the link. The API ends every session of the user, so the user signs in again.
export function useResetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...authMutationKey, 'reset-password'],
    mutationFn: (change: { token: string; password: string }) =>
      apiRequest('/v1/auth/reset-password', z.null(), { method: 'POST', body: change }),
    // The API ended every session of the user, so what this browser cached for the session is no longer true. This runs
    // from the hook and not from the call, because a user who leaves the page while the call runs would skip the call.
    // The screens that are open read their data again and meet the 401, so the guard sends the user to Masuk.
    onSuccess: () => queryClient.resetQueries(),
    gcTime: 0,
  });
}

// Ends the session of this device. A 401 means that there is no session left, which is what the user asked for. The caller
// moves to Masuk first and empties the cache after that, because the guard observes the session and would read it again
// if the cache were emptied while the old screen is still on show.
export function useLogout() {
  return useMutation({
    mutationKey: [...authMutationKey, 'logout'],
    mutationFn: async () => {
      try {
        await apiRequest('/v1/auth/logout', z.null(), { method: 'POST' });
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) {
          throw error;
        }
      }
    },
  });
}

// What a failed call means for the screen. The code is the contract, the status is the fallback.
export type AuthFailure =
  | 'invalid-credentials'
  | 'email-not-verified'
  | 'email-taken'
  | 'already-verified'
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
  // Another 409 of the same route, so it must come before the fallback for the status
  if (error.code === 'already_verified') {
    return 'already-verified';
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
