import { describe, expect, it } from 'vitest';

import { returnPath } from '@/pages/auth/return-path';

describe('returnPath', () => {
  it.each([
    ['/laporan', '/laporan'],
    ['/saran/r1?tampilkan=semua', '/saran/r1?tampilkan=semua'],
    ['/lainnya/pengaturan#tarif', '/lainnya/pengaturan#tarif'],
  ])('keeps the path %s inside the app', (from, expected) => {
    expect(returnPath({ from })).toBe(expected);
  });

  it.each([
    ['another site', 'https://example.com/'],
    ['a path with two slashes', '//example.com'],
    ['a path with a backslash', '/\\example.com'],
    ['a relative path', 'laporan'],
    ['the sign in itself', '/masuk'],
    ['the sign up', '/daftar?x=1'],
    ['the screen after the sign up', '/verifikasi'],
    ['the page of the email link', '/verify-email'],
    ['the question before the sign out', '/lainnya/keluar'],
    ['a value that is not a string', 5],
  ])('goes to the home screen for %s', (_name, from) => {
    expect(returnPath({ from })).toBe('/');
  });

  it('goes to the home screen when the visit has no state or the state has no path', () => {
    expect(returnPath(undefined)).toBe('/');
    expect(returnPath(null)).toBe('/');
    expect(returnPath('/laporan')).toBe('/');
    expect(returnPath({})).toBe('/');
  });

  it('does not mistake a path that only starts with the name of a screen', () => {
    expect(returnPath({ from: '/masuk-lain' })).toBe('/masuk-lain');
    expect(returnPath({ from: '/lainnya/keluar-lain' })).toBe('/lainnya/keluar-lain');
  });
});
