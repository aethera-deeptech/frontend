import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { ApiError, apiRequest } from '@/api/client';

// The paths and shapes in this file follow openapi.yaml of the backend (tag Pasang alat). The gateway is the WATTLINK Hub, the
// only unit that talks to the service. The screens call it WATTLINK Hub, and the code keeps the name of the API.

const gatewaySchema = z.object({
  id: z.string(),
  name: z.string(),
  lastSeenAt: z.string(),
});

const gatewaysSchema = z.object({ items: z.array(gatewaySchema) });

export type Gateway = z.infer<typeof gatewaySchema>;

export const gatewaysKey = ['gateways'] as const;

// A claim code has 8 characters, capital letters and the digits 2 to 9, and works once for 10 minutes
export const claimCodePattern = /^[A-Z2-9]{8}$/;
export const gatewayNameLength = { max: 40 } as const;

// The code is read from a display, so the user may type small letters or put spaces and dashes between the groups
export function normalizeClaimCode(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, '');
}

export function useGateways() {
  return useQuery({
    queryKey: gatewaysKey,
    queryFn: ({ signal }) => apiRequest('/v1/gateways', gatewaysSchema, { signal }),
  });
}

// The owner types the code that a new hub shows on its display. The hub belongs to the business after that.
export function useClaimGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (claim: { claimCode: string; name: string }) =>
      apiRequest('/v1/gateways', gatewaySchema, { method: 'POST', body: claim }),
    // The steps after this one ask the list to see that a hub exists. The list is filled here and not only marked old, so the
    // step does not read an empty list again and send the user back.
    onSuccess: (gateway) => {
      queryClient.setQueryData(gatewaysKey, (old: z.infer<typeof gatewaysSchema> | undefined) => ({
        items: [...(old?.items.filter((item) => item.id !== gateway.id) ?? []), gateway],
      }));
    },
    gcTime: 0,
  });
}

// What a failed claim means for the screen. The code is the contract, the status is the fallback.
export type ClaimFailure =
  | 'code-unknown'
  | 'claimed-elsewhere'
  | 'too-many-gateways'
  | 'rate-limited'
  | 'invalid-input'
  | 'offline'
  | 'other';

export function claimFailure(error: unknown): ClaimFailure {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.name === 'NetworkError' ? 'offline' : 'other';
  }
  // Only the code counts, because a 404 of a proxy or a missing route is not a wrong code
  if (error.code === 'claim_code_unknown') {
    return 'code-unknown';
  }
  if (error.code === 'gateway_claimed_elsewhere') {
    return 'claimed-elsewhere';
  }
  if (error.code === 'too_many_gateways') {
    return 'too-many-gateways';
  }
  if (error.status === 429) {
    return 'rate-limited';
  }
  return error.status === 422 ? 'invalid-input' : 'other';
}
