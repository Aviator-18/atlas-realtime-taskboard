import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BoardsPage } from '../features/boards/BoardsPage';
import { BoardPage } from '../features/board/BoardPage';
import { TaskCardView } from '../features/board/TaskCardView';
import { useBoardDnd } from '../features/board/useBoardDnd';
import { AuthProvider } from '../features/auth/AuthContext';
import { RouterProvider } from '../router/Router';
import { boardsApi, tasksApi, setAuthToken, ApiError } from '../api/client';
import type { BoardDetail, BoardSummary, Task } from '../api/types';

describe('BoardsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    setAuthToken('mock-token');
  });

  it('renders empty boards state when no boards exist', async () => {
    vi.spyOn(boardsApi, 'list').mockResolvedValueOnce([]);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider>
          <AuthProvider>
            <BoardsPage />
          </AuthProvider>
        </RouterProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('You are not on any boards yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a board' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join with an invite code' })).toBeInTheDocument();
  });

  it('renders list of boards', async () => {
    const mockBoards: BoardSummary[] = [
      { id: 1, name: 'Checkout API', role: 'OWNER', memberCount: 3 },
      { id: 2, name: 'Mobile App', role: 'MEMBER', memberCount: 5 },
    ];
    vi.spyOn(boardsApi, 'list').mockResolvedValueOnce(mockBoards);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider>
          <AuthProvider>
            <BoardsPage />
          </AuthProvider>
        </RouterProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Checkout API')).toBeInTheDocument();
    expect(screen.getByText('Mobile App')).toBeInTheDocument();
    expect(screen.getByText('3 members')).toBeInTheDocument();
    expect(screen.getByText('5 members')).toBeInTheDocument();
  });
});

describe('BoardPage', () => {
  const mockBoardDetail: BoardDetail = {
    id: 1,
    name: 'Sprint 12 Board',
    inviteCode: 'K7M2QX9R',
    members: [
      { id: 1, displayName: 'Priya Nair', role: 'OWNER' },
      { id: 2, displayName: 'Arjun Rao', role: 'MEMBER' },
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
            title: 'Fix refund rounding',
            description: 'Off by one paisa in certain currencies',
            position: 1024,
            estimateHours: 4.0,
            priority: 'HIGH',
            aiRationale: null,
            assigneeId: 1,
            version: 3,
            createdBy: 1,
            createdAt: '2026-11-10T10:00:00Z',
            updatedAt: '2026-11-10T11:00:00Z',
            startedAt: null,
            completedAt: null,
          },
        ],
      },
      {
        id: 20,
        name: 'In progress',
        kind: 'IN_PROGRESS',
        position: 2048,
        tasks: [],
      },
      {
        id: 30,
        name: 'Done',
        kind: 'DONE',
        position: 3072,
        tasks: [],
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    setAuthToken('mock-token');
  });

  it('renders board top bar, columns, and task cards', async () => {
    vi.spyOn(boardsApi, 'get').mockResolvedValueOnce(mockBoardDetail);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider>
          <AuthProvider>
            <BoardPage boardId={1} />
          </AuthProvider>
        </RouterProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Sprint 12 Board')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('K7M2QX9R')).toBeInTheDocument();

    expect(screen.getByText('To do')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();

    expect(screen.getByText('Fix refund rounding')).toBeInTheDocument();
    expect(screen.getByText('4 h')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('opens task drawer on card click, submits update with version, and updates cache', async () => {
    const user = userEvent.setup();
    vi.spyOn(boardsApi, 'get').mockResolvedValueOnce(mockBoardDetail);

    const initialTask = mockBoardDetail.columns[0]?.tasks[0];
    if (!initialTask) {
      throw new Error('Test fixture missing initial task');
    }
    const updatedTask = {
      ...initialTask,
      title: 'Fix refund rounding updated',
      version: 4,
    };
    vi.spyOn(tasksApi, 'update').mockResolvedValueOnce(updatedTask);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider>
          <AuthProvider>
            <BoardPage boardId={1} />
          </AuthProvider>
        </RouterProvider>
      </QueryClientProvider>,
    );

    const taskCard = await screen.findByText('Fix refund rounding');
    await user.click(taskCard);

    // Drawer opens
    const drawerTitleField = screen.getByDisplayValue('Fix refund rounding');
    expect(drawerTitleField).toBeInTheDocument();

    await user.clear(drawerTitleField);
    await user.type(drawerTitleField, 'Fix refund rounding updated');

    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(tasksApi.update).toHaveBeenCalledWith(101, expect.objectContaining({
        version: 3,
        title: 'Fix refund rounding updated',
      }));
    });

    // Verify cache updated from server response
    await waitFor(() => {
      expect(screen.getByText('Fix refund rounding updated')).toBeInTheDocument();
    });
  });

  describe('Drag and drop moves and conflict handling', () => {
    const getInitialTask = (): Task => {
      const t = mockBoardDetail.columns[0]?.tasks[0];
      if (!t) throw new Error('Initial task not found');
      return t;
    };

    it('moves card optimistically across columns and sends move with version', async () => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(['board', 1], mockBoardDetail);

      const baseTask = getInitialTask();
      const movedTask: Task = {
        ...baseTask,
        columnId: 20,
        version: 4,
        position: 1024,
      };
      vi.spyOn(tasksApi, 'update').mockResolvedValueOnce(movedTask);

      const onError = vi.fn();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useBoardDnd({
            boardId: 1,
            board: mockBoardDetail,
            onError,
          }),
        { wrapper },
      );

      // Simulate dragging Task 101 to empty column 20
      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: 'task-101' },
          over: { id: 'col-20' },
        });
      });

      // API called with version and move object
      expect(tasksApi.update).toHaveBeenCalledWith(101, {
        version: 3,
        move: {
          columnId: 20,
          afterTaskId: null,
        },
      });

      // TanStack Query cache updated
      const cached = queryClient.getQueryData<BoardDetail>(['board', 1]);
      expect(cached).toBeDefined();
      if (!cached) return;

      const col10 = cached.columns.find((c) => c.id === 10);
      const col20 = cached.columns.find((c) => c.id === 20);

      expect(col10?.tasks.length).toBe(0);
      expect(col20?.tasks.length).toBe(1);
      const firstTask = col20?.tasks[0];
      expect(firstTask?.id).toBe(101);
      expect(firstTask?.version).toBe(4);
      expect(onError).not.toHaveBeenCalled();
    });

    it('rolls back cache on move failure', async () => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(['board', 1], mockBoardDetail);

      vi.spyOn(tasksApi, 'update').mockRejectedValueOnce(new Error('Network error'));

      const onError = vi.fn();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useBoardDnd({
            boardId: 1,
            board: mockBoardDetail,
            onError,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: 'task-101' },
          over: { id: 'col-20' },
        });
      });

      expect(onError).toHaveBeenCalledWith('Network error');

      // Cache rolled back to original snapshot
      const cached = queryClient.getQueryData<BoardDetail>(['board', 1]);
      const col10 = cached?.columns.find((c) => c.id === 10);
      const col20 = cached?.columns.find((c) => c.id === 20);

      expect(col10?.tasks.length).toBe(1);
      expect(col20?.tasks.length).toBe(0);
    });

    it('on 409 TASK_VERSION_CONFLICT replaces card with currentTask and marks conflict', async () => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(['board', 1], mockBoardDetail);

      const baseTask = getInitialTask();
      const currentTaskOnServer: Task = {
        ...baseTask,
        title: 'Fix refund rounding (concurrent edit)',
        columnId: 30, // Someone moved it to Done
        version: 5,
        position: 1024,
      };

      const conflictError = new ApiError({
        type: 'https://atlas.local/problems/task-version-conflict',
        title: 'Task changed since you loaded it',
        status: 409,
        detail: 'Another member saved this task first.',
        code: 'TASK_VERSION_CONFLICT',
        currentTask: currentTaskOnServer,
      });

      vi.spyOn(tasksApi, 'update').mockRejectedValueOnce(conflictError);

      const onError = vi.fn();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useBoardDnd({
            boardId: 1,
            board: mockBoardDetail,
            onError,
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: 'task-101' },
          over: { id: 'col-20' },
        });
      });

      // Should not show generic error banner
      expect(onError).not.toHaveBeenCalled();

      // Card replaced with currentTask
      const cached = queryClient.getQueryData<BoardDetail>(['board', 1]);
      expect(cached).toBeDefined();
      if (!cached) return;

      const col10 = cached.columns.find((c) => c.id === 10);
      const col30 = cached.columns.find((c) => c.id === 30);

      expect(col10?.tasks.length).toBe(0);
      expect(col30?.tasks.length).toBe(1);
      const firstTask = col30?.tasks[0];
      expect(firstTask?.title).toBe('Fix refund rounding (concurrent edit)');
      expect(firstTask?.version).toBe(5);

      // Conflict marked
      expect(result.current.conflictTaskIds.has(101)).toBe(true);
    });

    it('renders drop indicators and conflict extension point on TaskCardView', () => {
      const task = getInitialTask();
      const members = mockBoardDetail.members;

      // 1. Drop indicator before
      const { rerender } = render(
        <TaskCardView
          task={task}
          members={members}
          isSelected={false}
          dropIndicator="before"
        />,
      );
      expect(screen.getByTestId('drop-indicator-before')).toBeInTheDocument();

      // 2. Drop indicator after
      rerender(
        <TaskCardView
          task={task}
          members={members}
          isSelected={false}
          dropIndicator="after"
        />,
      );
      expect(screen.getByTestId('drop-indicator-after')).toBeInTheDocument();

      // 3. Conflict marker and extension point
      rerender(
        <TaskCardView
          task={task}
          members={members}
          isSelected={false}
          hasConflict={true}
        />,
      );
      expect(screen.getByTestId('task-conflict-extension-point')).toBeInTheDocument();
      expect(screen.getByText('Conflict pending')).toBeInTheDocument();

      // 4. Overlay floating shadow (docs/DESIGN_SYSTEM.md)
      rerender(
        <TaskCardView
          task={task}
          members={members}
          isSelected={false}
          isOverlay={true}
        />,
      );
      const card = screen.getByRole('button');
      expect(card.style.boxShadow).toBe('0 6px 16px rgba(31, 37, 44, 0.18)');
    });
  });
});
