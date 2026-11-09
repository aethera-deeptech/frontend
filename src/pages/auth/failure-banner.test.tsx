import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ApiError, NetworkError } from '@/api/client';
import { authFailure } from '@/api/auth';
import { FailureBanner } from '@/pages/auth/failure-banner';

describe('authFailure', () => {
  it('tells a busy answer from a failure that the screen has no text for', () => {
    expect(authFailure(new ApiError(503, { code: 'busy', retryAfterSeconds: 2 }))).toBe('busy');
    expect(authFailure(new ApiError(503))).toBe('other');
    expect(authFailure(new NetworkError())).toBe('offline');
  });
});

describe('FailureBanner', () => {
  it('says that the system is busy, as a warning, and shows the retry button it is given', () => {
    render(<FailureBanner failure="busy" action={<button type="button">Coba lagi</button>} />);

    expect(screen.getByRole('status')).toHaveTextContent('Sistem sedang sibuk');
    expect(screen.getByRole('status')).toHaveTextContent('Coba lagi dalam beberapa detik.');
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
  });
});
