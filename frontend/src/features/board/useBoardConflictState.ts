import { useRef, useState } from 'react';
import type { BoardDetail, BoardEvent, UpdateTaskRequest } from '../../api/types';
import type { TaskConflict, TaskCue } from './TaskCardView';
import { strings } from '../../strings';

export interface UseBoardConflictStateOptions {
  board: BoardDetail | undefined;
  currentUser: { id: number; displayName: string } | null;
  onClearSelectedTaskId?: () => void;
}

export function useBoardConflictState({
  board,
  currentUser,
  onClearSelectedTaskId,
}: UseBoardConflictStateOptions) {
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

  const scheduleCueRemoval = (taskId: number) => {
    if (cueTimeoutsRef.current[taskId]) {
      clearTimeout(cueTimeoutsRef.current[taskId]);
    }
    cueTimeoutsRef.current[taskId] = setTimeout(() => {
      setCuesByTaskId((prev) => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });
    }, 4000);
  };

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
      scheduleCueRemoval(task.id);
    } else if (event.type === 'TASK_UPDATED' && event.task) {
      const task = event.task;
      setCuesByTaskId((prev) => ({
        ...prev,
        [task.id]: { caption: strings.cue.editedBy(actorName) },
      }));
      setLiveAnnouncement(strings.cue.announcedEdited(actorName, task.title));
      scheduleCueRemoval(task.id);
    } else if (event.type === 'TASK_MOVED' && event.task) {
      const task = event.task;
      const targetCol = board?.columns.find((c) => c.id === task.columnId);
      const colName = targetCol ? targetCol.name : '';

      setCuesByTaskId((prev) => ({
        ...prev,
        [task.id]: { caption: strings.cue.movedBy(actorName) },
      }));
      setLiveAnnouncement(strings.cue.announcedMoved(actorName, task.title, colName));
      scheduleCueRemoval(task.id);
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

        onClearSelectedTaskId?.();
      }
    }
  };

  const recordConflict = (taskId: number, conflict: TaskConflict) => {
    setConflictsByTaskId((prev) => ({ ...prev, [taskId]: conflict }));
  };

  const recordPendingUpdate = (taskId: number, updates: UpdateTaskRequest) => {
    setPendingAttemptedUpdates((prev) => ({ ...prev, [taskId]: updates }));
  };

  return {
    cuesByTaskId,
    liveAnnouncement,
    conflictsByTaskId,
    pendingAttemptedUpdates,
    deletedTaskBanners,
    lastActorRef,
    handleDismissConflict,
    handleBoardEvent,
    recordConflict,
    recordPendingUpdate,
  };
}
