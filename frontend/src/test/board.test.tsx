import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BoardsPage } from '../features/boards/BoardsPage';
import { BoardPage } from '../features/board/BoardPage';
import { AuthProvider } from '../features/auth/AuthContext';
import { RouterProvider } from '../router/Router';
import { boardsApi, tasksApi, setAuthToken } from '../api/client';
import type { BoardDetail, BoardSummary } from '../api/types';

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
});
