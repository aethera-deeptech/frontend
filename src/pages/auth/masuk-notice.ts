// News that another screen leaves for the sign in page in the state of the visit. The sign in page copies it once and takes it out
// of the history, so a reload does not show it again.
export type MasukNotice = 'deleted' | 'maybe-deleted';

export function readMasukNotice(state: unknown): MasukNotice | undefined {
  if (typeof state !== 'object' || state === null || !('notice' in state)) {
    return undefined;
  }
  return state.notice === 'deleted' || state.notice === 'maybe-deleted' ? state.notice : undefined;
}

// A failed sign in proves nothing about an account that may be gone, because a wrong password gives the same answer. Only a
// sign in that works says that the account is still there.
export const masukNotices: Record<MasukNotice, { title: string; message: string }> = {
  deleted: {
    title: 'Akun sudah dihapus',
    message: 'Akun dan data usaha Anda sudah dihapus.',
  },
  'maybe-deleted': {
    title: 'Anda sudah keluar',
    message:
      'Jika Anda bisa masuk, akun belum terhapus dan penghapusan bisa diulang. Jika tidak bisa masuk, akun mungkin sudah terhapus.',
  },
};
