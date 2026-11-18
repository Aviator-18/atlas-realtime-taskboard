import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BoardPage } from '../features/board/BoardPage';
import { BoardFilterBar } from '../features/board/BoardFilterBar';
import { AuthProvider } from '../features/auth/AuthContext';
import { RouterProvider } from '../router/Router';
import { boardsApi, setAuthToken } from '../api/client';
import type { BoardDetail } from '../api/types';

describe('BoardFilterBar component', () => {
  const mockMembers = [
    { id: 1, displayName: 'Priya Nair', role: 'OWNER' as const },
    { id: 2, displayName: 'Arjun Mehta', role: 'MEMBER' as const },
  ];

  it('renders search input, priority pills, and assignee options', () => {
    const onSearchChange = vi.fn();
    const onPriorityChange = vi.fn();
    const onAssigneeChange = vi.fn();
    const onClearFilters = vi.fn();

    render(
      <BoardFilterBar
        searchQuery=""
        onSearchChange={onSearchChange}
        selectedPriority="ALL"
        onPriorityChange={onPriorityChange}
        selectedAssigneeId="ALL"
        onAssigneeChange={onAssigneeChange}
        members={mockMembers}
        currentUserId={1}
        totalTasks={5}
        matchingTasks={5}
        onClearFilters={onClearFilters}
      />,
    );

    expect(screen.getByPlaceholderText('Search tasks... (Press / to focus)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'High priority' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Med priority' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Low priority' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filter by assignee' })).toBeInTheDocument();
  });

  it('shows match counter and triggers clear filters when active', async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();

    render(
      <BoardFilterBar
        searchQuery="refund"
        onSearchChange={vi.fn()}
        selectedPriority="HIGH"
        onPriorityChange={vi.fn()}
        selectedAssigneeId={1}
        onAssigneeChange={vi.fn()}
        members={mockMembers}
        currentUserId={1}
        totalTasks={6}
        matchingTasks={2}
        onClearFilters={onClearFilters}
      />,
    );

    expect(screen.getByText('Showing 2 of 6 tasks')).toBeInTheDocument();
    const clearBtn = screen.getByRole('button', { name: 'Clear filters' });
    expect(clearBtn).toBeInTheDocument();

    await user.click(clearBtn);
    expect(onClearFilters).toHaveBeenCalledOnce();
  });
});

describe('BoardPage search & filter integration', () => {
  const mockBoard: BoardDetail = {
    id: 10,
    name: 'Checkout API',
    inviteCode: 'TEST1234',
    members: [
      { id: 1, displayName: 'Priya Nair', role: 'OWNER' },
      { id: 2, displayName: 'Arjun Mehta', role: 'MEMBER' },
    ],
    columns: [
      {
        id: 1,
        name: 'To do',
        kind: 'TODO',
        position: 1024,
        tasks: [
          {
            id: 101,
            boardId: 10,
            columnId: 1,
            title: 'Fix refund rounding bug',
            description: 'Discrepancy with currency conversion',
            position: 1024,
            estimateHours: 2.0,
            priority: 'HIGH',
            assigneeId: 1,
            version: 1,
            createdBy: 1,
            createdAt: '2026-11-10T10:00:00Z',
            updatedAt: '2026-11-10T10:00:00Z',
            aiRationale: null,
            startedAt: null,
            completedAt: null,
          },
          {
            id: 102,
            boardId: 10,
            columnId: 1,
            title: 'Add idempotency key',
            description: 'Prevent duplicated payments',
            position: 2048,
            estimateHours: 4.0,
            priority: 'MEDIUM',
            assigneeId: 2,
            version: 1,
            createdBy: 1,
            createdAt: '2026-11-10T10:00:00Z',
            updatedAt: '2026-11-10T10:00:00Z',
            aiRationale: null,
            startedAt: null,
            completedAt: null,
          },
        ],
      },
      {
        id: 2,
        name: 'In progress',
        kind: 'IN_PROGRESS',
        position: 2048,
        tasks: [
          {
            id: 103,
            boardId: 10,
            columnId: 2,
            title: 'Implement webhook retries',
            description: 'Backoff algorithm for failed deliveries',
            position: 1024,
            estimateHours: 3.0,
            priority: 'LOW',
            assigneeId: null,
            version: 1,
            createdBy: 1,
            createdAt: '2026-11-10T10:00:00Z',
            updatedAt: '2026-11-10T10:00:00Z',
            aiRationale: null,
            startedAt: null,
            completedAt: null,
          },
        ],
      },
      {
        id: 3,
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
    vi.spyOn(boardsApi, 'get').mockResolvedValue(mockBoard);
  });

  const renderBoard = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider>
          <AuthProvider>
            <BoardPage boardId={10} />
          </AuthProvider>
        </RouterProvider>
      </QueryClientProvider>,
    );
  };

  it('filters tasks dynamically by search query', async () => {
    const user = userEvent.setup();
    renderBoard();

    expect(await screen.findByText('Fix refund rounding bug')).toBeInTheDocument();
    expect(screen.getByText('Add idempotency key')).toBeInTheDocument();
    expect(screen.getByText('Implement webhook retries')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Search tasks... (Press / to focus)');
    await user.type(searchInput, 'refund');

    // Only 'Fix refund rounding bug' matches
    expect(screen.getByText('Fix refund rounding bug')).toBeInTheDocument();
    expect(screen.queryByText('Add idempotency key')).not.toBeInTheDocument();
    expect(screen.queryByText('Implement webhook retries')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 3 tasks')).toBeInTheDocument();

    // Column 2 now has 0 matching tasks and shows filtered empty state
    expect(screen.getByTestId('column-filtered-empty-2')).toHaveTextContent(
      'No tasks match active filters',
    );
  });

  it('filters tasks by priority button', async () => {
    const user = userEvent.setup();
    renderBoard();

    expect(await screen.findByText('Fix refund rounding bug')).toBeInTheDocument();

    const highPriorityBtn = screen.getByRole('button', { name: 'High priority' });
    await user.click(highPriorityBtn);

    expect(screen.getByText('Fix refund rounding bug')).toBeInTheDocument();
    expect(screen.queryByText('Add idempotency key')).not.toBeInTheDocument();
    expect(screen.queryByText('Implement webhook retries')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 3 tasks')).toBeInTheDocument();

    // Clicking All resets priority
    const allPriorityBtn = screen.getByRole('button', { name: 'All' });
    await user.click(allPriorityBtn);

    expect(screen.getByText('Fix refund rounding bug')).toBeInTheDocument();
    expect(screen.getByText('Add idempotency key')).toBeInTheDocument();
    expect(screen.getByText('Implement webhook retries')).toBeInTheDocument();
  });

  it('filters tasks by assignee dropdown and clears with Clear filters', async () => {
    const user = userEvent.setup();
    renderBoard();

    expect(await screen.findByText('Fix refund rounding bug')).toBeInTheDocument();

    const assigneeSelect = screen.getByRole('combobox', { name: 'Filter by assignee' });
    await user.selectOptions(assigneeSelect, 'UNASSIGNED');

    // Only task 103 has null assigneeId
    expect(screen.getByText('Implement webhook retries')).toBeInTheDocument();
    expect(screen.queryByText('Fix refund rounding bug')).not.toBeInTheDocument();
    expect(screen.queryByText('Add idempotency key')).not.toBeInTheDocument();

    // Clear filters button in header
    const clearBtn = screen.getByTestId('clear-filters-btn');
    await user.click(clearBtn);

    expect(screen.getByText('Fix refund rounding bug')).toBeInTheDocument();
    expect(screen.getByText('Add idempotency key')).toBeInTheDocument();
    expect(screen.getByText('Implement webhook retries')).toBeInTheDocument();
  });
});
