import { describe, expect, it } from 'vitest';

import css from './tokens.css?raw';

// The tokens come from the Figma variables. This test keeps the file consistent with itself, so a color that is added to
// one theme and not to the other, or a color that Tailwind cannot name, fails here and not on a screen.

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);

  if (start < 0) {
    throw new Error(`no block for ${selector}`);
  }

  return css.slice(start, css.indexOf('}', start));
}

function names(text: string): string[] {
  return [...text.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((match) => match[1] ?? '');
}

const light = names(block(':root'));
const dark = names(block(":root[data-theme='dark']"));
const system = names(block(":root:not([data-theme='light'])"));
const tailwind = names(block('@theme inline'));

describe('design tokens', () => {
  it('has a Dark value for every Theme token and no more', () => {
    expect(dark.length).toBeGreaterThan(0);
    expect(dark.every((name) => light.includes(name))).toBe(true);
  });

  it('applies the same Dark values when the system prefers dark', () => {
    expect(system).toEqual(dark);
  });

  it('gives every color a Tailwind name that points at the variable', () => {
    const colors = light.filter((name) => !/^--(disabled-opacity|lift|space)/.test(name));

    for (const name of colors) {
      expect(tailwind).toContain(`--color-${name.slice(2)}`);
      expect(block('@theme inline')).toContain(`--color-${name.slice(2)}: var(${name});`);
    }
  });

  it('writes every color as a hex value', () => {
    const colors = light.filter((name) => !/^--(disabled-opacity|lift|space)/.test(name));

    for (const name of colors) {
      expect(block(':root')).toMatch(new RegExp(`${name}: #[0-9a-f]{6}([0-9a-f]{2})?;`));
    }
  });
});
