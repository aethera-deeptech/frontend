// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Cloudflare Pages reads public/_headers and the nginx image reads nginx/security-headers.conf. They must send the same
// security headers, so this test fails when one file changes without the other.

function headersOfPages(): Map<string, string> {
  const text = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  const block = text.split('\n\n')[0] ?? '';
  const headers = new Map<string, string>();

  for (const line of block.split('\n').slice(1)) {
    const index = line.indexOf(': ');

    if (index > 0) {
      headers.set(line.slice(0, index).trim(), line.slice(index + 2).trim());
    }
  }

  return headers;
}

function headersOfNginx(): Map<string, string> {
  const text = readFileSync(new URL('./security-headers.conf', import.meta.url), 'utf8');
  const headers = new Map<string, string>();

  for (const match of text.matchAll(/^add_header (\S+) "(.*)" always;$/gm)) {
    const [, name, value] = match;

    headers.set(name, value);
  }

  return headers;
}

describe('security headers', () => {
  it('reads at least the content security policy from both files', () => {
    expect(headersOfPages().has('Content-Security-Policy')).toBe(true);
    expect(headersOfNginx().has('Content-Security-Policy')).toBe(true);
  });

  it('are the same in public/_headers and in the nginx image', () => {
    expect(Object.fromEntries(headersOfNginx())).toEqual(Object.fromEntries(headersOfPages()));
  });
});
