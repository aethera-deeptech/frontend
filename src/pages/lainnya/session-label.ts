// The service writes "Unknown device" for a browser that it could not read and for every session from before it had labels, so
// on the first day each session of the owner has it. The text must not read like a stranger.
export function sessionLabel(label: string): string {
  return label === 'Unknown device' ? 'Jenis perangkat tidak terbaca' : label;
}
