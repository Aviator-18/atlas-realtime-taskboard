import { useQueryClient } from '@tanstack/react-query';
import { ApiError, tasksApi } from '../../api/client';
import { replaceTaskInBoard } from './dndUtils';
import { strings } from '../../strings';
import type { BoardDetail, Task, UpdateTaskRequest, CreateTaskRequest } from '../../api/types';

export interface UseBoardTaskMutationsOptions {
  boardId: number;
  board: BoardDetail | undefined;
  lastActorRef: React.MutableRefObject<Map<number, string>>;
  pendingAttemptedUpdates: Record<number, UpdateTaskRequest>;
  setActionError: (msg: string | null) => void;
  recordConflict: (taskId: number, conflict: { message: string; onApplyAgain: () => void; onDismiss: () => void }) => void;
  recordPendingUpdate: (taskId: number, updates: UpdateTaskRequest) => void;
  handleDismissConflict: (taskId: number) => void;
  setSelectedTaskId: (id: number | null) => void;
}

export function useBoardTaskMutations({
  boardId,
  board,
  lastActorRef,
  pendingAttemptedUpdates,
  setActionError,
  recordConflict,
  recordPendingUpdate,
  handleDismissConflict,
  setSelectedTaskId,
}: UseBoardTaskMutationsOptions) {
  const queryClient = useQueryClient();

  const handleReapplyMove = async (
    taskId: number,
    version: number,
    move: { columnId: number; afterTaskId: number | null },
  ) => {
    try {
      const updated = await tasksApi.update(taskId, { version, move });
      queryClient.setQueryData<BoardDetail>(['board', boardId], (old) =>
        old ? replaceTaskInBoard(old, updated) : old,
      );
      handleDismissConflict(taskId);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409 && err.code === 'TASK_VERSION_CONFLICT' && err.details.currentTask) {
        handleDndConflict(taskId, err.details.currentTask, move);
      } else {
        setActionError(err instanceof Error ? err.message : strings.errors.genericFailure);
      }
    }
  };

  const handleDndConflict = (
    taskId: number,
    currentTask: Task,
    attemptedMove: { columnId: number; afterTaskId: number | null },
  ) => {
    const actorName = lastActorRef.current.get(taskId) || board?.members.find((m) => m.id === currentTask.createdBy)?.displayName;
    const bannerMessage = actorName ? strings.conflict.banner(actorName) : strings.conflict.bannerFallback;
    recordConflict(taskId, {
      message: bannerMessage,
      onApplyAgain: () => void handleReapplyMove(taskId, currentTask.version, attemptedMove),
      onDismiss: () => handleDismissConflict(taskId),
    });
  };

  const handleReapplySave = async (taskId: number) => {
    const pending = pendingAttemptedUpdates[taskId];
    const currentBoard = queryClient.getQueryData<BoardDetail>(['board', boardId]);
    if (!pending || !currentBoard) return;

    const targetTask = currentBoard.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    if (!targetTask) return;

    await handleSaveTask(taskId, { ...pending, version: targetTask.version });
    handleDismissConflict(taskId);
  };

  const handleSaveTask = async (taskId: number, updates: UpdateTaskRequest) => {
    setActionError(null);
    try {
      const updatedTask = await tasksApi.update(taskId, updates);
      queryClient.setQueryData<BoardDetail>(['board', boardId], (old) =>
        old ? replaceTaskInBoard(old, updatedTask) : old,
      );
      handleDismissConflict(taskId);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409 && err.code === 'TASK_VERSION_CONFLICT' && err.details.currentTask) {
        const currentTask = err.details.currentTask;
        queryClient.setQueryData<BoardDetail>(['board', boardId], (old) =>
          old ? replaceTaskInBoard(old, currentTask) : old,
        );
        const actorName = lastActorRef.current.get(taskId) || board?.members.find((m) => m.id === currentTask.createdBy)?.displayName;
        const bannerMessage = actorName ? strings.conflict.banner(actorName) : strings.conflict.bannerFallback;
        recordPendingUpdate(taskId, updates);
        recordConflict(taskId, {
          message: bannerMessage,
          onApplyAgain: () => void handleReapplySave(taskId),
          onDismiss: () => handleDismissConflict(taskId),
        });
      }
      throw err;
    }
  };

  const handleDeleteTask = async (taskId: number, version: number) => {
    setActionError(null);
    try {
      await tasksApi.delete(taskId, version);
      queryClient.setQueryData<BoardDetail>(['board', boardId], (old) =>
        old ? { ...old, columns: old.columns.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== taskId) })) } : old,
      );
      handleDismissConflict(taskId);
      setSelectedTaskId(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409 && err.code === 'TASK_VERSION_CONFLICT' && err.details.currentTask) {
        const currentTask = err.details.currentTask;
        queryClient.setQueryData<BoardDetail>(['board', boardId], (old) =>
          old ? replaceTaskInBoard(old, currentTask) : old,
        );
        const actorName = lastActorRef.current.get(taskId) || board?.members.find((m) => m.id === currentTask.createdBy)?.displayName;
        const bannerMessage = actorName ? strings.conflict.banner(actorName) : strings.conflict.bannerFallback;
        recordConflict(taskId, {
          message: bannerMessage,
          onApplyAgain: () => void handleDeleteTask(taskId, currentTask.version),
          onDismiss: () => handleDismissConflict(taskId),
        });
      }
      throw err;
    }
  };

  const handleCreateTask = async (req: CreateTaskRequest) => {
    setActionError(null);
    const created = await tasksApi.create(boardId, req);
    queryClient.setQueryData<BoardDetail>(['board', boardId], (old) =>
      old ? { ...old, columns: old.columns.map((c) => c.id === created.columnId ? { ...c, tasks: [...c.tasks, created] } : c) } : old,
    );
  };

  return {
    handleDndConflict,
    handleSaveTask,
    handleDeleteTask,
    handleCreateTask,
  };
}
