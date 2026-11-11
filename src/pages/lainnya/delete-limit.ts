// The limit of the password calls that delete something. The API counts only a wrong password, 5 an hour for a user, and the
// deletion of the account and the deletion of a hub use the same count. After the fifth wrong one every call waits, also with the
// right password.
export const deleteLimitText =
  'Sampai 5 kata sandi salah per jam. Hitungan ini dipakai bersama untuk penghapusan akun dan penghapusan WATTLINK Hub.';
