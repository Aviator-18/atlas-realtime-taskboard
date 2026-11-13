import { useState, useMemo, useCallback } from 'react';
import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import { tasksApi, ApiError } from '../../api/client';
import {
  parseDndId,
  calculateTaskMove,
  applyOptimisticMove,
  replaceTaskInBoard,
} from './dndUtils';
import { strings } from '../../strings';
import type { BoardDetail, Task } from '../../api/types';

export interface UseBoardDndOptions {
  boardId: number;
  board: BoardDetail | undefined;
  onError: (message: string) => void;
}

export function useBoardDnd({ boardId, board, onError }: UseBoardDndOptions) {
  const queryClient = useQueryClient();

  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [overDropId, setOverDropId] = useState<string | number | null>(null);
  const [conflictTaskIds, setConflictTaskIds] = useState<Set<number>>(new Set());

  // Sensors: pointer with distance constraint so clicking cards opens the drawer;
  // keyboard sensor with sortable coordinates for accessibility.
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  const sensors = useSensors(pointerSensor, keyboardSensor);

  const activeTask = useMemo<Task | null>(() => {
    if (!board || activeTaskId === null) return null;
    for (const col of board.columns) {
      const found = col.tasks.find((t) => t.id === activeTaskId);
      if (found) return found;
    }
    return null;
  }, [board, activeTaskId]);

  const findTask = useCallback(
    (id: number | undefined): Task | null => {
      if (!board || id === undefined) return null;
      for (const col of board.columns) {
        const found = col.tasks.find((t) => t.id === id);
        if (found) return found;
      }
      return null;
    },
    [board],
  );

  const findColumnForTask = useCallback(
    (taskId: number | undefined) => {
      if (!board || taskId === undefined) return null;
      return board.columns.find((col) => col.tasks.some((t) => t.id === taskId)) ?? null;
    },
    [board],
  );

  // Accessibility announcements for screen readers
  const announcements = useMemo(
    () => ({
      onDragStart({ active }: DragStartEvent) {
        const parsed = parseDndId(active.id);
        const task = findTask(parsed?.id);
        const col = findColumnForTask(parsed?.id);
        if (!task || !col) return '';
        const pos = col.tasks.findIndex((t) => t.id === task.id) + 1;
        return strings.dnd.pickedUp(task.title, col.name, pos, col.tasks.length);
      },
      onDragOver({ active, over }: DragOverEvent) {
        const parsed = parseDndId(active.id);
        const task = findTask(parsed?.id);
        if (!task || !over) return '';
        const overParsed = parseDndId(over.id);
        if (!overParsed) return '';
        if (overParsed.type === 'column') {
          const col = board?.columns.find((c) => c.id === overParsed.id);
          return col ? strings.dnd.movedOverColumn(task.title, col.name) : '';
        }
        const overTask = findTask(overParsed.id);
        const col = findColumnForTask(overParsed.id);
        if (overTask && col) {
          return strings.dnd.movedOverTask(task.title, overTask.title, col.name);
        }
        return '';
      },
      onDragEnd({ active, over }: DragEndEvent) {
        const parsed = parseDndId(active.id);
        const task = findTask(parsed?.id);
        if (!task) return '';
        if (!over) {
          return strings.dnd.cancelled(task.title);
        }
        const move = calculateTaskMove(board?.columns ?? [], active.id, over.id);
        if (!move) {
          return strings.dnd.cancelled(task.title);
        }
        const targetCol = board?.columns.find((c) => c.id === move.columnId);
        const colName = targetCol ? targetCol.name : '';
        const total =
          (targetCol?.tasks.length ?? 0) + (task.columnId === move.columnId ? 0 : 1);
        const pos = move.afterTaskId
          ? (targetCol?.tasks.findIndex((t) => t.id === move.afterTaskId) ?? 0) + 2
          : 1;
        return strings.dnd.dropped(task.title, colName, Math.min(pos, total), total);
      },
      onDragCancel({ active }: { active: { id: string | number } }) {
        const parsed = parseDndId(active.id);
        const task = findTask(parsed?.id);
        return task ? strings.dnd.cancelled(task.title) : '';
      },
    }),
    [board, findTask, findColumnForTask],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const parsed = parseDndId(event.active.id);
    if (parsed?.type === 'task') {
      setActiveTaskId(parsed.id);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverDropId(event.over ? event.over.id : null);
  };

  const handleDragEnd = async (event: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => {
    const { active, over } = event;
    setActiveTaskId(null);
    setOverDropId(null);

    if (!over || !board) return;

    const move = calculateTaskMove(board.columns, active.id, over.id);
    if (!move) return;

    const activeParsed = parseDndId(active.id);
    if (!activeParsed || activeParsed.type !== 'task') return;
    const task = findTask(activeParsed.id);
    if (!task) return;

    // Snapshot current state for rollback
    await queryClient.cancelQueries({ queryKey: ['board', boardId] });
    const previousBoard = queryClient.getQueryData<BoardDetail>(['board', boardId]);

    // Apply optimistic move to the TanStack Query cache
    queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
      if (!old) return old;
      return applyOptimisticMove(old, task.id, move.columnId, move.afterTaskId);
    });

    try {
      const updatedTask = await tasksApi.update(task.id, {
        version: task.version,
        move: {
          columnId: move.columnId,
          afterTaskId: move.afterTaskId,
        },
      });

      // Update cache with the server response (containing bumped version and new position)
      queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
        if (!old) return old;
        return replaceTaskInBoard(old, updatedTask);
      });
    } catch (err: unknown) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        err.code === 'TASK_VERSION_CONFLICT' &&
        err.details.currentTask
      ) {
        // Contract requirement: replace card with currentTask from 409 response and mark conflict
        const currentTask = err.details.currentTask;
        queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
          if (!old) return old;
          return replaceTaskInBoard(old, currentTask);
        });
        setConflictTaskIds((prev) => new Set(prev).add(task.id));
      } else {
        // Roll back cache on other errors
        if (previousBoard) {
          queryClient.setQueryData(['board', boardId], previousBoard);
        }
        onError(err instanceof Error ? err.message : strings.errors.genericFailure);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTaskId(null);
    setOverDropId(null);
  };

  return {
    sensors,
    activeTask,
    overDropId,
    conflictTaskIds,
    announcements,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
