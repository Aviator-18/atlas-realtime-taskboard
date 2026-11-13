import React, { useRef, useState } from 'react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, boardsApi, tasksApi } from '../../api/client';
import { useRouter } from '../../router/routerContext';
import { useAuth } from '../auth/authContextDef';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { BoardColumnView } from './BoardColumnView';
import { BoardSkeleton } from './BoardSkeleton';
import { TaskCardView, type TaskCue, type TaskConflict } from './TaskCardView';
import { TaskDrawer } from '../task/TaskDrawer';
import { CreateTaskDialog } from '../task/CreateTaskDialog';
import { useBoardDnd } from './useBoardDnd';
import { replaceTaskInBoard } from './dndUtils';
import { useBoardSocket } from '../realtime/useBoardSocket';
import { ConnectionIndicator } from './ConnectionIndicator';
import { strings } from '../../strings';
import type { BoardDetail, BoardEvent, CreateTaskRequest, Task, UpdateTaskRequest } from '../../api/types';

export interface BoardPageProps {
  boardId: number;
}

export const BoardPage: React.FC<BoardPageProps> = ({ boardId }) => {
  const { navigate } = useRouter();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createColumnId, setCreateColumnId] = useState<number>(1);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Live cue and conflict presentation state
  const [cuesByTaskId, setCuesByTaskId] = useState<Record<number, TaskCue>>({});
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');
  const [conflictsByTaskId, setConflictsByTaskId] = useState<Record<number, TaskConflict>>({});
  const [pendingAttemptedUpdates, setPendingAttemptedUpdates] = useState<
    Record<number, UpdateTaskRequest>
  >({});
  const [deletedTaskBanners, setDeletedTaskBanners] = useState<
    Array<{ id: number; columnId: number; message: string }>
  >([]);

  const cueTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const lastActorRef = useRef<Map<number, string>>(new Map());

  const {
    data: board,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardsApi.get(boardId),
  });

  const handleDismissConflict = (taskId: number) => {
    setConflictsByTaskId((prev) => {
      const copy = { ...prev };
      delete copy[taskId];
      return copy;
    });
    setPendingAttemptedUpdates((prev) => {
      const copy = { ...prev };
      delete copy[taskId];
      return copy;
    });
  };

  const handleReapplyMove = async (
    taskId: number,
    version: number,
    move: { columnId: number; afterTaskId: number | null },
  ) => {
    try {
      const updated = await tasksApi.update(taskId, {
        version,
        move,
      });
      queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
        if (!old) return old;
        return replaceTaskInBoard(old, updated);
      });
      handleDismissConflict(taskId);
    } catch (err: unknown) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        err.code === 'TASK_VERSION_CONFLICT' &&
        err.details.currentTask
      ) {
        handleDndConflict(taskId, err.details.currentTask, move);
      } else {
        setActionError(err instanceof Error ? err.message : strings.errors.genericFailure);
      }
    }
  };

  const handleReapplySave = async (taskId: number) => {
    const pending = pendingAttemptedUpdates[taskId];
    if (!pending) return;

    const currentBoard = queryClient.getQueryData<BoardDetail>(['board', boardId]);
    if (!currentBoard) return;

    let latestVersion: number | null = null;
    for (const col of currentBoard.columns) {
      const found = col.tasks.find((t) => t.id === taskId);
      if (found) {
        latestVersion = found.version;
        break;
      }
    }
    if (latestVersion == null) return;

    const reapplyUpdates: UpdateTaskRequest = {
      ...pending,
      version: latestVersion,
    };
    await handleSaveTask(taskId, reapplyUpdates);
    handleDismissConflict(taskId);
  };

  const handleDndConflict = (
    taskId: number,
    currentTask: Task,
    attemptedMove: { columnId: number; afterTaskId: number | null },
  ) => {
    const actorName =
      lastActorRef.current.get(taskId) ||
      board?.members.find((m) => m.id === currentTask.createdBy)?.displayName;
    const bannerMessage = actorName
      ? strings.conflict.banner(actorName)
      : strings.conflict.bannerFallback;

    setConflictsByTaskId((prev) => ({
      ...prev,
      [taskId]: {
        message: bannerMessage,
        onApplyAgain: () => void handleReapplyMove(taskId, currentTask.version, attemptedMove),
        onDismiss: () => handleDismissConflict(taskId),
      },
    }));
  };

  // Socket connection and live cue event handling
  const handleBoardEvent = (event: BoardEvent) => {
    const actorName =
      board?.members.find((m) => m.id === event.actorId)?.displayName ||
      event.member?.displayName ||
      'A team member';

    if (event.task) {
      lastActorRef.current.set(event.task.id, actorName);
    } else if (event.taskId) {
      lastActorRef.current.set(event.taskId, actorName);
    }

    // Constraint: Your own changes never trigger the cue
    if (currentUser && event.actorId === currentUser.id) {
      return;
    }

    if (event.type === 'TASK_CREATED' && event.task) {
      const task = event.task;
      const targetCol = board?.columns.find((c) => c.id === task.columnId);
      const colName = targetCol ? targetCol.name : '';

      setCuesByTaskId((prev) => ({
        ...prev,
        [task.id]: { caption: strings.cue.addedBy(actorName) },
      }));
      setLiveAnnouncement(strings.cue.announcedAdded(actorName, task.title, colName));

      if (cueTimeoutsRef.current[task.id]) {
        clearTimeout(cueTimeoutsRef.current[task.id]);
      }
      cueTimeoutsRef.current[task.id] = setTimeout(() => {
        setCuesByTaskId((prev) => {
          const copy = { ...prev };
          delete copy[task.id];
          return copy;
        });
      }, 4000);
    } else if (event.type === 'TASK_UPDATED' && event.task) {
      const task = event.task;
      setCuesByTaskId((prev) => ({
        ...prev,
        [task.id]: { caption: strings.cue.editedBy(actorName) },
      }));
      setLiveAnnouncement(strings.cue.announcedEdited(actorName, task.title));

      if (cueTimeoutsRef.current[task.id]) {
        clearTimeout(cueTimeoutsRef.current[task.id]);
      }
      cueTimeoutsRef.current[task.id] = setTimeout(() => {
        setCuesByTaskId((prev) => {
          const copy = { ...prev };
          delete copy[task.id];
          return copy;
        });
      }, 4000);
    } else if (event.type === 'TASK_MOVED' && event.task) {
      const task = event.task;
      const targetCol = board?.columns.find((c) => c.id === task.columnId);
      const colName = targetCol ? targetCol.name : '';

      setCuesByTaskId((prev) => ({
        ...prev,
        [task.id]: { caption: strings.cue.movedBy(actorName) },
      }));
      setLiveAnnouncement(strings.cue.announcedMoved(actorName, task.title, colName));

      if (cueTimeoutsRef.current[task.id]) {
        clearTimeout(cueTimeoutsRef.current[task.id]);
      }
      cueTimeoutsRef.current[task.id] = setTimeout(() => {
        setCuesByTaskId((prev) => {
          const copy = { ...prev };
          delete copy[task.id];
          return copy;
        });
      }, 4000);
    } else if (event.type === 'TASK_DELETED') {
      const targetId = event.taskId ?? event.task?.id;
      if (targetId != null) {
        let colId = 1;
        if (board) {
          for (const col of board.columns) {
            if (col.tasks.some((t) => t.id === targetId)) {
              colId = col.id;
              break;
            }
          }
        }

        setDeletedTaskBanners((prev) => [
          ...prev.filter((b) => b.id !== targetId),
          { id: targetId, columnId: colId, message: strings.conflict.taskDeleted },
        ]);
        setTimeout(() => {
          setDeletedTaskBanners((prev) => prev.filter((b) => b.id !== targetId));
        }, 4000);

        if (selectedTaskId === targetId) {
          setSelectedTaskId(null);
        }
      }
    }
  };

  const { status: socketStatus } = useBoardSocket(boardId, {
    onBoardEvent: handleBoardEvent,
  });

  const {
    sensors,
    activeTask,
    overDropId,
    conflictTaskIds,
    announcements,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useBoardDnd({
    boardId,
    board,
    onError: (msg) => setActionError(msg),
    onConflict: handleDndConflict,
  });

  const selectedTask = React.useMemo(() => {
    if (!board || selectedTaskId === null) return null;
    for (const col of board.columns) {
      const found = col.tasks.find((t) => t.id === selectedTaskId);
      if (found) return found;
    }
    return null;
  }, [board, selectedTaskId]);

  const handleCopyInviteCode = async () => {
    if (!board) return;
    try {
      await navigator.clipboard.writeText(board.inviteCode);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      // Fallback if clipboard API is blocked
    }
  };

  const handleAddTask = (columnId: number) => {
    setCreateColumnId(columnId);
    setIsCreateOpen(true);
  };

  const handleCreateTask = async (request: CreateTaskRequest) => {
    setActionError(null);
    const createdTask = await tasksApi.create(boardId, request);

    queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
      if (!old) return old;
      return {
        ...old,
        columns: old.columns.map((col) => {
          if (col.id === createdTask.columnId) {
            return {
              ...col,
              tasks: [...col.tasks, createdTask],
            };
          }
          return col;
        }),
      };
    });
  };

  const handleSaveTask = async (taskId: number, updates: UpdateTaskRequest) => {
    setActionError(null);
    try {
      const updatedTask = await tasksApi.update(taskId, updates);

      queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
        if (!old) return old;
        return replaceTaskInBoard(old, updatedTask);
      });
      handleDismissConflict(taskId);
    } catch (err: unknown) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        err.code === 'TASK_VERSION_CONFLICT' &&
        err.details.currentTask
      ) {
        const currentTask = err.details.currentTask;
        queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
          if (!old) return old;
          return replaceTaskInBoard(old, currentTask);
        });

        const actorName =
          lastActorRef.current.get(taskId) ||
          board?.members.find((m) => m.id === currentTask.createdBy)?.displayName;
        const bannerMessage = actorName
          ? strings.conflict.banner(actorName)
          : strings.conflict.bannerFallback;

        setPendingAttemptedUpdates((prev) => ({ ...prev, [taskId]: updates }));
        setConflictsByTaskId((prev) => ({
          ...prev,
          [taskId]: {
            message: bannerMessage,
            onApplyAgain: () => void handleReapplySave(taskId),
            onDismiss: () => handleDismissConflict(taskId),
          },
        }));

        throw err;
      }
      throw err;
    }
  };

  const handleDeleteTask = async (taskId: number, version: number) => {
    setActionError(null);
    try {
      await tasksApi.delete(taskId, version);

      queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
        if (!old) return old;
        return {
          ...old,
          columns: old.columns.map((col) => ({
            ...col,
            tasks: col.tasks.filter((t) => t.id !== taskId),
          })),
        };
      });
      handleDismissConflict(taskId);
      setSelectedTaskId(null);
    } catch (err: unknown) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        err.code === 'TASK_VERSION_CONFLICT' &&
        err.details.currentTask
      ) {
        const currentTask = err.details.currentTask;
        queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
          if (!old) return old;
          return replaceTaskInBoard(old, currentTask);
        });

        const actorName =
          lastActorRef.current.get(taskId) ||
          board?.members.find((m) => m.id === currentTask.createdBy)?.displayName;
        const bannerMessage = actorName
          ? strings.conflict.banner(actorName)
          : strings.conflict.bannerFallback;

        setConflictsByTaskId((prev) => ({
          ...prev,
          [taskId]: {
            message: bannerMessage,
            onApplyAgain: () => void handleDeleteTask(taskId, currentTask.version),
            onDismiss: () => handleDismissConflict(taskId),
          },
        }));

        throw err;
      }
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col text-ink">
      {/* Top bar, 48 px, --surface-raised, bottom rule */}
      <header className="h-12 bg-surface-raised border-b border-rule px-4 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/boards')}
            className="text-[14px] leading-5 font-semibold text-ink hover:text-accent transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
          >
            {strings.app.name}
          </button>
          <span className="text-[14px] text-ink-muted">/</span>
          <span className="text-[14px] leading-5 font-medium text-ink">
            {board ? board.name : ''}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {board && board.members && (
            <div className="flex items-center -space-x-1">
              {board.members.map((member) => (
                <Avatar key={member.id} name={member.displayName} />
              ))}
            </div>
          )}

          {board && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopyInviteCode}
              title={`Invite code: ${board.inviteCode}`}
            >
              {copiedInvite ? strings.boards.inviteCodeCopied : board.inviteCode}
            </Button>
          )}

          <ConnectionIndicator status={socketStatus} />
        </div>
      </header>

      {/* Screen reader polite region for live cues */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="live-cue-announcements"
      >
        {liveAnnouncement}
      </div>

      {/* Action Error banner if any */}
      {actionError && (
        <div className="p-4 pb-0 max-w-4xl">
          <Banner
            message={actionError}
            variant="error"
            onDismiss={() => setActionError(null)}
          />
        </div>
      )}

      {/* Main Board Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {isLoading ? (
          <BoardSkeleton />
        ) : isError || !board ? (
          <div className="p-8 flex flex-col items-start gap-4">
            <Banner
              message={strings.errors.loadFailed}
              variant="error"
              onRetry={() => refetch()}
            />
            <Button variant="secondary" onClick={() => navigate('/boards')}>
              {strings.boardView.backToBoards}
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            accessibility={{ announcements }}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="flex-1 overflow-x-auto p-4 flex gap-3 items-start">
              {board.columns.map((column) => (
                <BoardColumnView
                  key={column.id}
                  column={column}
                  members={board.members}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={(task) => setSelectedTaskId(task.id)}
                  onAddTask={handleAddTask}
                  activeDragId={activeTask ? `task-${activeTask.id}` : null}
                  overDropId={overDropId}
                  conflictTaskIds={conflictTaskIds}
                  cuesByTaskId={cuesByTaskId}
                  conflictsByTaskId={conflictsByTaskId}
                  deletedTaskBanners={deletedTaskBanners}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTask ? (
                <div className="w-[276px]">
                  <TaskCardView
                    task={activeTask}
                    members={board.members}
                    isSelected={activeTask.id === selectedTaskId}
                    isOverlay
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Task Details Drawer */}
        {board && selectedTask && (
          <TaskDrawer
            task={selectedTask}
            columns={board.columns}
            members={board.members}
            conflictActorName={lastActorRef.current.get(selectedTask.id)}
            onClearConflict={() => handleDismissConflict(selectedTask.id)}
            onClose={() => setSelectedTaskId(null)}
            onSave={handleSaveTask}
            onDelete={handleDeleteTask}
          />
        )}
      </main>

      {/* Create Task Dialog */}
      {board && (
        <CreateTaskDialog
          isOpen={isCreateOpen}
          boardId={board.id}
          defaultColumnId={createColumnId}
          columns={board.columns}
          members={board.members}
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleCreateTask}
        />
      )}
    </div>
  );
};
