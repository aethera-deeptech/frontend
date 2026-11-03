import { describe, expect, it } from 'vitest';

import { checkBusinessName, checkNewPassword } from '@/pages/auth/validation';

describe('checkNewPassword', () => {
  it('counts characters like the API does, so an emoji is one', () => {
    // Eight units of the string but only four characters
    expect(checkNewPassword('😀😀😀😀')).toBe('Minimal 8 karakter.');
    expect(checkNewPassword('😀'.repeat(8))).toBeUndefined();
    expect(checkNewPassword('abcdefg😀')).toBeUndefined();
    expect(checkNewPassword('abcdefg')).toBe('Minimal 8 karakter.');
  });

  it('allows 128 characters and refuses 129, whatever they are', () => {
    expect(checkNewPassword('😀'.repeat(128))).toBeUndefined();
    expect(checkNewPassword('😀'.repeat(129))).toBe('Maksimal 128 karakter.');
    expect(checkNewPassword('a'.repeat(128))).toBeUndefined();
    expect(checkNewPassword('a'.repeat(129))).toBe('Maksimal 128 karakter.');
  });

  it('counts an emoji between plain letters once, and a lone surrogate once', () => {
    expect(checkNewPassword('a😀'.repeat(4))).toBeUndefined();
    expect(checkNewPassword('a😀'.repeat(3))).toBe('Minimal 8 karakter.');
    expect(checkNewPassword('a😀'.repeat(64))).toBeUndefined();
    expect(checkNewPassword('a😀'.repeat(65))).toBe('Maksimal 128 karakter.');
    expect(checkNewPassword('\ud83d'.repeat(8))).toBeUndefined();
    expect(checkNewPassword('\ud83d'.repeat(7))).toBe('Minimal 8 karakter.');
  });

  it('asks for a password when there is none', () => {
    expect(checkNewPassword('')).toBe('Isi kata sandi Anda.');
  });
});

describe('checkBusinessName', () => {
  it('counts characters, so 80 emoji are accepted and 81 are not', () => {
    expect(checkBusinessName('😀'.repeat(80))).toBeUndefined();
    expect(checkBusinessName('😀'.repeat(81))).toBe('Maksimal 80 karakter.');
  });

  it('trims the spaces before it counts', () => {
    expect(checkBusinessName(`  ${'😀'.repeat(80)}  `)).toBeUndefined();
  });

  it('asks for a name and ignores the spaces around it', () => {
    expect(checkBusinessName('   ')).toBe('Isi nama usaha.');
    expect(checkBusinessName('  Maju  ')).toBeUndefined();
  });
});
