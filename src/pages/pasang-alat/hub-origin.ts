// The screens that open the claim page from the list of hubs tell it where the owner came from, so the page can lead back there.
// hubId and hubName are only there when the owner came from a hub that has to be connected again.
export interface HubOrigin {
  hubId?: string;
  hubName?: string;
}

export const hubListPath = '/lainnya/hub';

export function readHubOrigin(state: unknown): HubOrigin | undefined {
  if (typeof state !== 'object' || state === null || !('fromHubList' in state)) {
    return undefined;
  }
  if (state.fromHubList !== true) {
    return undefined;
  }
  const origin: HubOrigin = {};

  if ('hubId' in state && typeof state.hubId === 'string') {
    origin.hubId = state.hubId;
  }
  if ('hubName' in state && typeof state.hubName === 'string') {
    origin.hubName = state.hubName;
  }
  return origin;
}
