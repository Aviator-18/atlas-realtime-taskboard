import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the product name and default sign in screen when unauthenticated', async () => {
    sessionStorage.clear();
    render(<App />);
    expect(screen.getByText('Atlas')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
