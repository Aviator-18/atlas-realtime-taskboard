import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BoardPage } from '../features/board/BoardPage';
import { AuthContext } from '../features/auth/authContextDef';
import { RouterProvider } from '../router/Router';
import { boardsApi, tasksApi, ApiError } from '../api/client';
import * as socketModule from '../api/socket';
import type { BoardDetail, BoardEvent, Task, User } from '../api/types';
import { strings } from '../strings';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    boardsApi: {
      get: vi.fn(),
    },
    tasksApi: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    getAuthToken: () => 'mock-jwt-token',
  };
});

const mockUserA: User = {
  id: 1,
  displayName: 'Arjun',
  email: 'arjun@example.com',
};

const baseTask: Task = {
  id: 101,
  boardId: 10,
  columnId: 1,
  title: 'Implement idempotency',
  description: 'Original description',
  position: 1024,
  estimateHours: 4.0,
  priority: 'MEDIUM',
  aiRationale: null,
  assigneeId: 1,
  version: 1,
  createdBy: 1,
  createdAt: '2026-11-09T09:00:00Z',
  updatedAt: '2026-11-09T09:00:00Z',
  startedAt: null,
  completedAt: null,
};

const sampleBoard: BoardDetail = {
  id: 10,
  name: 'Sprint Board',
  inviteCode: 'TEST1234',
  members: [
    { id: 1, displayName: 'Arjun', role: 'MEMBER' },
    { id: 2, displayName: 'Priya', role: 'MEMBER' },
  ],
  columns: [
    {
      id: 1,
      name: 'To do',
      kind: 'TODO',
      position: 1024,
      tasks: [baseTask],
    },
    {
      id: 2,
      name: 'Done',
      kind: 'DONE',
      position: 2048,
      tasks: [],
    },
  ],
};

function renderBoardPage(currentUser: User = mockUserA) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <RouterProvider>
      <AuthContext.Provider
        value={{
          token: 'mock-jwt-token',
          user: currentUser,
          isAuthenticated: true,
          isLoading: false,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <QueryClientProvider client={queryClient}>
          <BoardPage boardId={10} />
        </QueryClientProvider>
      </AuthContext.Provider>
    </RouterProvider>,
  );
}

describe('Phase 7: Live cue and conflict presentation', () => {
  let socketCallbacks: {
    onEvent?: (event: BoardEvent) => void;
    onStateChange?: (state: socketModule.SocketConnectionState) => void;
  } = {};

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    vi.mocked(boardsApi.get).mockResolvedValue(JSON.parse(JSON.stringify(sampleBoard)));

    vi.spyOn(socketModule, 'connectBoardSocket').mockImplementation((_boardId, _token, callbacks) => {
      socketCallbacks = callbacks;
      callbacks.onStateChange('live');
      return {
        disconnect: vi.fn(),
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders live cue with actor caption and aria-live announcement when teammate updates a card', async () => {
    renderBoardPage(mockUserA);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(screen.getByText('Implement idempotency')).toBeInTheDocument();

    // Teammate Priya (actorId: 2) edits the task
    const updateEvent: BoardEvent = {
      eventId: 'evt-1',
      type: 'TASK_UPDATED',
      boardId: 10,
      actorId: 2,
      occurredAt: '2026-11-13T10:00:00Z',
      taskId: 101,
      task: {
        ...baseTask,
        title: 'Implement idempotency with Redis',
        version: 2,
      },
    };

    act(() => {
      socketCallbacks.onEvent?.(updateEvent);
    });

    // 1. Caption appears under title: "Edited by Priya"
    const caption = screen.getByTestId('live-cue-caption-101');
    expect(caption).toHaveTextContent(strings.cue.editedBy('Priya'));

    // 2. Card has live-cue-card class
    const card = caption.closest('.live-cue-card');
    expect(card).not.toBeNull();

    // 3. Spoken announcement is present in polite live region
    const liveRegion = screen.getByTestId('live-cue-announcements');
    expect(liveRegion).toHaveTextContent(
      strings.cue.announcedEdited('Priya', 'Implement idempotency with Redis'),
    );

    // 4. After 4 seconds, caption and cue are removed
    act(() => {
      vi.advanceTimersByTime(4100);
    });

    expect(screen.queryByTestId('live-cue-caption-101')).toBeNull();
  });

  it('never fires the live cue for the current user own changes', async () => {
    renderBoardPage(mockUserA);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(screen.getByText('Implement idempotency')).toBeInTheDocument();

    // Event where actorId matches currentUser (Arjun, id: 1)
    const selfEvent: BoardEvent = {
      eventId: 'evt-2',
      type: 'TASK_UPDATED',
      boardId: 10,
      actorId: 1,
      occurredAt: '2026-11-13T10:00:00Z',
      taskId: 101,
      task: {
        ...baseTask,
        title: 'Arjun self update',
        version: 2,
      },
    };

    act(() => {
      socketCallbacks.onEvent?.(selfEvent);
    });

    // Cue caption and aria live announcement must NOT be triggered
    expect(screen.queryByTestId('live-cue-caption-101')).toBeNull();
    const liveRegion = screen.getByTestId('live-cue-announcements');
    expect(liveRegion).toHaveTextContent('');
  });

  it('renders live cue with Moved by when teammate moves a card', async () => {
    renderBoardPage(mockUserA);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    const moveEvent: BoardEvent = {
      eventId: 'evt-3',
      type: 'TASK_MOVED',
      boardId: 10,
      actorId: 2, // Priya
      occurredAt: '2026-11-13T10:05:00Z',
      taskId: 101,
      task: {
        ...baseTask,
        columnId: 2,
        version: 2,
      },
    };

    act(() => {
      socketCallbacks.onEvent?.(moveEvent);
    });

    const caption = screen.getByTestId('live-cue-caption-101');
    expect(caption).toHaveTextContent(strings.cue.movedBy('Priya'));
    const liveRegion = screen.getByTestId('live-cue-announcements');
    expect(liveRegion).toHaveTextContent(
      strings.cue.announcedMoved('Priya', 'Implement idempotency', 'Done'),
    );
  });

  it('handles conflict in drawer: preserves user draft, attaches banner with actor name, snaps card, and reapplies with updated version', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();

    renderBoardPage(mockUserA);

    expect(await screen.findByText('Implement idempotency')).toBeInTheDocument();

    // Notify that Priya previously edited this task
    const priyaEvent: BoardEvent = {
      eventId: 'evt-p',
      type: 'TASK_UPDATED',
      boardId: 10,
      actorId: 2, // Priya
      occurredAt: '2026-11-13T10:00:00Z',
      taskId: 101,
      task: {
        ...baseTask,
        title: 'Priya updated title',
        version: 2,
      },
    };
    act(() => {
      socketCallbacks.onEvent?.(priyaEvent);
    });

    // Open task drawer for card 101
    const cardTitle = await screen.findByText('Priya updated title');
    await user.click(cardTitle);

    // User A changes priority to HIGH and types in description
    const prioritySelect = screen.getByLabelText(strings.task.priorityLabel);
    await user.selectOptions(prioritySelect, 'HIGH');

    const descInput = screen.getByLabelText(strings.task.descriptionLabel);
    await user.clear(descInput);
    await user.type(descInput, 'Arjun draft description');

    // Mock conflict on save: server rejects with 409 TASK_VERSION_CONFLICT
    const serverCurrentTask: Task = {
      ...baseTask,
      title: 'Priya latest title',
      version: 3,
    };

    vi.mocked(tasksApi.update).mockRejectedValueOnce(
      new ApiError({
        type: 'https://api.atlas.local/errors/task-version-conflict',
        title: 'Task changed since you loaded it',
        status: 409,
        detail: 'Another member saved this task first.',
        code: 'TASK_VERSION_CONFLICT',
        currentTask: serverCurrentTask,
      }),
    );

    // Save changes
    const saveButton = screen.getByRole('button', { name: strings.task.saveChanges });
    await user.click(saveButton);

    // Verification:
    // 1. Drawer remains open and retains user draft
    expect(screen.getByLabelText(strings.task.priorityLabel)).toHaveValue('HIGH');
    expect(screen.getByLabelText(strings.task.descriptionLabel)).toHaveValue(
      'Arjun draft description',
    );

    // 2. Drawer banner is displayed with Priya's name
    const drawerBanner = screen.getByTestId('drawer-conflict-banner');
    expect(drawerBanner).toHaveTextContent(strings.conflict.banner('Priya'));
    expect(drawerBanner).toHaveTextContent(strings.conflict.applyAgain);
    expect(drawerBanner).toHaveTextContent(strings.conflict.dismiss);

    // 3. Displayed version updated to 3 so deliberate resave is possible
    expect(screen.getByTestId('drawer-displayed-version')).toHaveTextContent('3');

    // 4. Card on the board snapped to the server's latest title ("Priya latest title")
    expect(screen.getByText('Priya latest title')).toBeInTheDocument();

    // 5. Card on board also has attached conflict banner
    const cardBanner = screen.getByTestId('task-conflict-banner-101');
    expect(cardBanner).toHaveTextContent(strings.conflict.banner('Priya'));

    // 6. User clicks "Apply my change again" in drawer
    vi.mocked(tasksApi.update).mockResolvedValueOnce({
      ...serverCurrentTask,
      description: 'Arjun draft description',
      priority: 'HIGH',
      version: 4,
    });

    const applyAgainButton = within(drawerBanner).getByRole('button', {
      name: strings.conflict.applyAgain,
    });
    await user.click(applyAgainButton);

    // Assert that update was called with version 3 (the bumped server version)
    expect(tasksApi.update).toHaveBeenLastCalledWith(
      101,
      expect.objectContaining({
        version: 3,
        priority: 'HIGH',
        description: 'Arjun draft description',
      }),
    );
  });

  it('renders deleted task banner when a task is deleted by someone else', async () => {
    renderBoardPage(mockUserA);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(screen.getByText('Implement idempotency')).toBeInTheDocument();

    const deleteEvent: BoardEvent = {
      eventId: 'evt-del',
      type: 'TASK_DELETED',
      boardId: 10,
      actorId: 2, // Priya
      occurredAt: '2026-11-13T10:10:00Z',
      taskId: 101,
      task: null,
    };

    act(() => {
      socketCallbacks.onEvent?.(deleteEvent);
    });

    // Card is removed
    expect(screen.queryByText('Implement idempotency')).toBeNull();

    // Temporary banner in place of deleted task
    const banner = screen.getByTestId('deleted-task-banner-101');
    expect(banner).toHaveTextContent(strings.conflict.taskDeleted);

    // After 4 seconds, deleted task banner is removed
    act(() => {
      vi.advanceTimersByTime(4100);
    });

    expect(screen.queryByTestId('deleted-task-banner-101')).toBeNull();
  });
});
