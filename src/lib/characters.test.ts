import { describe, expect, it } from 'vitest';

import { countCharacters } from '@/lib/characters';

describe('countCharacters', () => {
  it('counts a plain text by its letters', () => {
    expect(countCharacters('')).toBe(0);
    expect(countCharacters('Hub pabrik')).toBe(10);
  });

  it('counts an emoji once, as the API does', () => {
    expect(countCharacters('\u{1F50C}'.repeat(21))).toBe(21);
    expect(countCharacters('a\u{1F50C}b')).toBe(3);
  });
});
