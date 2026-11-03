// How often a screen that shows readings asks for new ones while it is visible. The gateway sends a batch every 10 to 60
// seconds, so a shorter interval would only repeat the same answer. A hidden tab and a lost connection pause it.
export const livePollMs = 30_000;

// A query with no data is a first read that failed, and a read that starts again turns the failure banner back into the
// loading state. So only a query that holds data is read again on its own, and the retry button covers the rest.
export function livePoll(query: { state: { data: unknown } }): number | false {
  return query.state.data === undefined ? false : livePollMs;
}
