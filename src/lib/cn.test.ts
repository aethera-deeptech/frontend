import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/cn';

describe('cn', () => {
  it('keeps the last of two classes that set the same property', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('keeps a text style next to a text color', () => {
    expect(cn('text-h2', 'text-text-heading')).toBe('text-h2 text-text-heading');
  });

  it('replaces a text style with another text style', () => {
    expect(cn('text-body', 'text-label')).toBe('text-label');
  });

  it('drops values that are not classes', () => {
    expect(cn('flex', false, undefined, null, 'gap-2')).toBe('flex gap-2');
  });
});
