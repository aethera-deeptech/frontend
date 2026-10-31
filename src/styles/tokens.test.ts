import { describe, expect, it } from 'vitest';

import css from './tokens.css?raw';

// The tokens come from the Figma variables. This test keeps the file consistent with itself, so a color that is added to
// one theme and not to the other, a value that is not a color, or a color that Tailwind cannot name fails here and not on
// a screen.

// The variables of the Primitives collection. They have one value and no Dark copy, and the rest of :root is the Theme.
const PRIMITIVES =
  /^--(btn-(accent|danger|warning|success)-face|chart-(blurple|pink|orange)|focus|focus-invalid|disabled-opacity|lift-[a-z-]+|space-\d+)$/;

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);

  if (start < 0) {
    throw new Error(`no block for ${selector}`);
  }

  return css.slice(start, css.indexOf('}', start));
}

function variables(text: string): Map<string, string> {
  const found = new Map<string, string>();

  for (const match of text.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gm)) {
    found.set(match[1] ?? '', match[2] ?? '');
  }

  return found;
}

const light = variables(block(':root'));
const dark = variables(block(":root[data-theme='dark']"));
const system = variables(block(":root:not([data-theme='light'])"));
const tailwind = variables(block('@theme inline'));

const theme = [...light.keys()].filter((name) => !PRIMITIVES.test(name));
const colors = [...light.entries()]
  .filter(([, value]) => value.startsWith('#'))
  .map(([name]) => name);

describe('design tokens', () => {
  it('has a Dark value for every Theme token and for nothing else', () => {
    expect(theme.length).toBeGreaterThan(0);
    expect(new Set(dark.keys())).toEqual(new Set(theme));
  });

  it('applies the same Dark values when the system prefers dark', () => {
    expect([...system.entries()]).toEqual([...dark.entries()]);
  });

  it('writes every color as a hex value in every theme', () => {
    for (const map of [light, dark, system]) {
      for (const [name, value] of map) {
        if (colors.includes(name)) {
          expect(value, name).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
        }
      }
    }
  });

  it('gives every color a Tailwind name that points at the variable, and no other name', () => {
    const expected = colors.map((name): [string, string] => [
      `--color-${name.slice(2)}`,
      `var(${name})`,
    ]);

    expect(Object.fromEntries(tailwind)).toEqual(Object.fromEntries(expected));
  });
});
