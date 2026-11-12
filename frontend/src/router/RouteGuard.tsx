import React, { useEffect } from 'react';
import { useRouter } from './routerContext';
import { useAuth } from '../features/auth/authContextDef';

export interface RouteGuardProps {
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { path, navigate } = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const isGuestOnly = path === '/login' || path === '/register';
    const isRoot = path === '/' || path === '';

    if (isRoot) {
      navigate(isAuthenticated ? '/boards' : '/login', { replace: true });
      return;
    }

    if (isGuestOnly && isAuthenticated) {
      navigate('/boards', { replace: true });
      return;
    }

    if (!isGuestOnly && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [path, isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-canvas p-6 flex flex-col gap-4">
        <div className="h-6 w-32 bg-surface-lane rounded-sm animate-pulse" />
        <div className="h-40 w-full bg-surface-lane rounded-sm animate-pulse" />
      </div>
    );
  }

  return <>{children}</>;
};
