// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { textStyles } from '../src/lib/cn';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

describe('text styles', () => {
  // tailwind-merge reads an unknown text-foo class as a color and drops the color class next to it, so a style that
  // is added to the @theme block and not to cn.ts fails here and not on a screen.
  it('are the same in index.css and in cn.ts', () => {
    const defined = [...css.matchAll(/^\s*--text-([a-z0-9-]+?):/gm)]
      .map((match) => match[1])
      .filter((name) => name && !name.includes('--'));

    expect([...textStyles].sort()).toEqual(defined.sort());
  });
});
