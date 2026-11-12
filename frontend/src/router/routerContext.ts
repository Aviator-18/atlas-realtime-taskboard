import { createContext, useContext } from 'react';

export interface RouterContextValue {
  path: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

export const RouterContext = createContext<RouterContextValue | null>(null);

export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}

export function matchBoardRoute(path: string): number | null {
  const match = path.match(/^\/boards\/(\d+)$/);
  if (!match || !match[1]) return null;
  return parseInt(match[1], 10);
}
