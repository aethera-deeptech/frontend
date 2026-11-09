// Where Masuk sends the user after the sign in. The guard leaves the address that the user asked for in the state of the
// visit. Only a path inside the app counts, so a state that something else made cannot send the user to another site or
// back to a screen of the account or to the question before the sign out.
export function returnPath(state: unknown): string {
  const from =
    typeof state === 'object' && state !== null && 'from' in state ? state.from : undefined;

  if (typeof from !== 'string' || !/^\/(?![/\\])/.test(from)) {
    return '/';
  }
  return /^\/(masuk|daftar|verifikasi|verify-email|lupa-kata-sandi|reset-password|lainnya\/keluar|lainnya\/hapus-akun|lainnya\/sesi\/keluarkan-semua)(?![^/?#])/i.test(
    from,
  )
    ? '/'
    : from;
}
