import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectionIndicator } from '../features/board/ConnectionIndicator';
import { BoardPage } from '../features/board/BoardPage';
import { AuthProvider } from '../features/auth/AuthContext';
import { RouterProvider } from '../router/Router';
import { authApi, boardsApi, setAuthToken } from '../api/client';
import * as socketModule from '../api/socket';
import type { BoardDetail, BoardEvent, Task } from '../api/types';

describe('ConnectionIndicator component', () => {
  it('renders Live state with accent token style', () => {
    const { container } = render(<ConnectionIndicator status="live" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveClass('text-accent');
  });

  it('renders Reconnecting state with priority medium token style', () => {
    const { container } = render(<ConnectionIndicator status="reconnecting" />);
    expect(screen.getByText('Reconnecting')).toBeInTheDocument();
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveClass('text-priority-medium-ink');
  });

  it('renders Offline state with danger token style', () => {
    const { container } = render(<ConnectionIndicator status="offline" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveClass('text-danger');
  });
});

describe('BoardPage realtime updates', () => {
  const mockBoard: BoardDetail = {
    id: 1,
    name: 'Checkout API',
    inviteCode: 'K7M2QX9R',
    members: [
      { id: 1, displayName: 'Priya Nair', role: 'OWNER' },
    ],
    columns: [
      {
        id: 10,
        name: 'To do',
        kind: 'TODO',
        position: 1024,
        tasks: [
          {
            id: 101,
            boardId: 1,
            columnId: 10,
            title: 'Initial task',
            description: '',
            position: 1024,
            estimateHours: 2.0,
            priority: 'MEDIUM',
            aiRationale: null,
            assigneeId: null,
            version: 0,
            createdBy: 1,
            createdAt: '2026-11-09T09:00:00Z',
            updatedAt: '2026-11-09T09:00:00Z',
            startedAt: null,
            completedAt: null,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    setAuthToken('mock-jwt-token');
    vi.spyOn(authApi, 'me').mockResolvedValue({ id: 1, displayName: 'Priya Nair', email: 'priya@example.test' });
  });

  it('connects to socket and updates cache when TASK_CREATED arrives', async () => {
    let capturedCallbacks: socketModule.BoardSocketCallbacks | null = null;

    vi.spyOn(boardsApi, 'get').mockResolvedValue(mockBoard);
    vi.spyOn(socketModule, 'connectBoardSocket').mockImplementation(
      (_boardId, _token, callbacks) => {
        capturedCallbacks = callbacks;
        // initially signal live
        callbacks.onStateChange('live');
        return { disconnect: vi.fn() };
      }
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider>
          <AuthProvider>
            <BoardPage boardId={1} />
          </AuthProvider>
        </RouterProvider>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Initial task')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(capturedCallbacks).not.toBeNull();

    // Simulate incoming TASK_CREATED event from socket
    const newTask: Task = {
      id: 102,
      boardId: 1,
      columnId: 10,
      title: 'Incoming webhook task',
      description: '',
      position: 2048,
      estimateHours: 4.0,
      priority: 'HIGH',
      aiRationale: null,
      assigneeId: null,
      version: 0,
      createdBy: 2,
      createdAt: '2026-11-09T09:10:00Z',
      updatedAt: '2026-11-09T09:10:00Z',
      startedAt: null,
      completedAt: null,
    };

    const createEvent: BoardEvent = {
      eventId: 'evt-102',
      type: 'TASK_CREATED',
      boardId: 1,
      actorId: 2,
      occurredAt: '2026-11-09T09:10:00Z',
      task: newTask,
      taskId: null,
    };

    act(() => {
      capturedCallbacks?.onEvent(createEvent);
    });

    // Check that the new card is rendered without needing page reload
    expect(await screen.findByText('Incoming webhook task')).toBeInTheDocument();
  });

  it('removes card when TASK_DELETED event arrives', async () => {
    let capturedCallbacks: socketModule.BoardSocketCallbacks | null = null;

    vi.spyOn(boardsApi, 'get').mockResolvedValue(mockBoard);
    vi.spyOn(socketModule, 'connectBoardSocket').mockImplementation(
      (_boardId, _token, callbacks) => {
        capturedCallbacks = callbacks;
        callbacks.onStateChange('live');
        return { disconnect: vi.fn() };
      }
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider>
          <AuthProvider>
            <BoardPage boardId={1} />
          </AuthProvider>
        </RouterProvider>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Initial task')).toBeInTheDocument();

    act(() => {
      capturedCallbacks?.onEvent({
        eventId: 'evt-del-101',
        type: 'TASK_DELETED',
        boardId: 1,
        actorId: 1,
        occurredAt: '2026-11-09T09:15:00Z',
        task: null,
        taskId: 101,
      });
    });

    await waitFor(() => {
      expect(screen.queryByText('Initial task')).not.toBeInTheDocument();
    });
  });
});
