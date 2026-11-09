import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { ApiError, apiRequest } from '@/api/client';

// The paths and shapes in this file follow openapi.yaml of the backend (tag Pasang alat). The gateway is the WATTLINK Hub, the
// only unit that talks to the service. The screens call it WATTLINK Hub, and the code keeps the name of the API.

const gatewaySchema = z.object({
  id: z.string(),
  name: z.string(),
  lastSeenAt: z.string(),
  // True from the moment the owner cuts the key of the hub until the same hardware is claimed again. A backend that does not send
  // the field yet has no cut hubs, so it reads as false.
  keyRevoked: z.boolean().default(false),
});

const gatewaysSchema = z.object({ items: z.array(gatewaySchema) });

export type Gateway = z.infer<typeof gatewaySchema>;

export const gatewaysKey = ['gateways'] as const;

// The API gives the time of the claim as lastSeenAt for a hub that never sent a batch, so a hub that was just claimed looks as if it
// sent data. The app remembers the time that the claim answered, and a hub whose time has not moved since is still waiting for its
// first batch. The memory lives as long as the client of the page and is gone after a reload.
const claimedAt = new WeakMap<QueryClient, Map<string, string>>();

export function waitsForFirstData(queryClient: QueryClient, hub: Gateway): boolean {
  return claimedAt.get(queryClient)?.get(hub.id) === hub.lastSeenAt;
}

// A hub that sent a batch in the last 15 minutes counts as connected, the same limit as the plug read of the backend
export const hubOnlineMs = 15 * 60_000;
// The most hubs that one business can have. Every hub counts, also a cut one, and the API has no way to delete one.
export const maxGateways = 10;

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
    // A hub that is claimed again keeps its id, so it takes the place of the old row. A read that started before the claim must not
    // put the old row back, so it is cancelled first.
    onSuccess: async (gateway) => {
      await queryClient.cancelQueries({ queryKey: gatewaysKey });
      const remembered = claimedAt.get(queryClient) ?? new Map<string, string>();

      remembered.set(gateway.id, gateway.lastSeenAt);
      claimedAt.set(queryClient, remembered);
      queryClient.setQueryData(gatewaysKey, (old: z.infer<typeof gatewaysSchema> | undefined) => {
        const items = old?.items ?? [];

        return {
          items: items.some((item) => item.id === gateway.id)
            ? items.map((item) => (item.id === gateway.id ? gateway : item))
            : [...items, gateway],
        };
      });
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
  | 'busy'
  | 'invalid-input'
  | 'offline'
  | 'other';

export function claimFailure(error: unknown): ClaimFailure {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.name === 'NetworkError' ? 'offline' : 'other';
  }
  // The service ran out of time, so the claim may have been taken. A second claim then meets "claimed elsewhere".
  if (error.busy) {
    return 'busy';
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
