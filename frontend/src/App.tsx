import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from './router/Router';
import { useRouter, matchBoardRoute } from './router/routerContext';
import { AuthProvider } from './features/auth/AuthContext';
import { RouteGuard } from './router/RouteGuard';
import { SignInPage } from './features/auth/SignInPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { BoardsPage } from './features/boards/BoardsPage';
import { BoardPage } from './features/board/BoardPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const { path } = useRouter();

  if (path === '/login') {
    return <SignInPage />;
  }

  if (path === '/register') {
    return <RegisterPage />;
  }

  const boardId = matchBoardRoute(path);
  if (boardId !== null) {
    return <BoardPage boardId={boardId} />;
  }

  if (path === '/boards') {
    return <BoardsPage />;
  }

  // Fallback for root or unknown
  return <BoardsPage />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider>
        <AuthProvider>
          <RouteGuard>
            <AppRoutes />
          </RouteGuard>
        </AuthProvider>
      </RouterProvider>
    </QueryClientProvider>
  );
}

export default App;
