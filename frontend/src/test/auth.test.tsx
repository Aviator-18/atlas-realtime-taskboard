import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SignInPage } from '../features/auth/SignInPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { AuthProvider } from '../features/auth/AuthContext';
import { RouterProvider } from '../router/Router';
import { getAuthToken, setAuthToken, authApi } from '../api/client';

describe('Auth token handling', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setAuthToken(null);
  });

  it('stores and retrieves token in memory and sessionStorage', () => {
    expect(getAuthToken()).toBeNull();

    setAuthToken('test-token-xyz');
    expect(getAuthToken()).toBe('test-token-xyz');
    expect(sessionStorage.getItem('atlas_token')).toBe('test-token-xyz');

    setAuthToken(null);
    expect(getAuthToken()).toBeNull();
    expect(sessionStorage.getItem('atlas_token')).toBeNull();
  });
});

describe('SignInPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setAuthToken(null);
    vi.restoreAllMocks();
  });

  it('renders the sign in heading and inputs', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider>
          <AuthProvider>
            <SignInPage />
          </AuthProvider>
        </RouterProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('calls authApi.login and stores token on successful submit', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();

    vi.spyOn(authApi, 'login').mockResolvedValueOnce({
      token: 'jwt-12345',
      expiresAt: '2026-11-12T17:00:00Z',
      user: { id: 1, displayName: 'Priya Nair', email: 'priya@example.com' },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider>
          <AuthProvider>
            <SignInPage />
          </AuthProvider>
        </RouterProvider>
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText('Email'), 'priya@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'priya@example.com',
        password: 'password123',
      });
      expect(getAuthToken()).toBe('jwt-12345');
    });
  });

  it('toggles password visibility when eye icon is clicked', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider>
          <AuthProvider>
            <SignInPage />
          </AuthProvider>
        </RouterProvider>
      </QueryClientProvider>,
    );

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: 'Show password' });
    await user.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

describe('RegisterPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setAuthToken(null);
    vi.restoreAllMocks();
  });

  it('renders display name, email, and password fields', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </RouterProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });
});
