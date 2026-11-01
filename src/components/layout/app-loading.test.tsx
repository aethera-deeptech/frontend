import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppLoading } from '@/components/layout/app-loading';

describe('AppLoading', () => {
  it('says that the app loads', () => {
    render(<AppLoading />);

    expect(screen.getByRole('status')).toHaveTextContent('Memuat aplikasi');
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
