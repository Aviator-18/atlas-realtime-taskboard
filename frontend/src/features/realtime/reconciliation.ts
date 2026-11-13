import type { BoardDetail, BoardEvent, Task } from '../../api/types';

export interface ReconciliationResult {
  state: BoardDetail;
  shouldReload: boolean;
}

export function applyBoardEvent(
  state: BoardDetail,
  event: BoardEvent
): ReconciliationResult {
  if (event.type === 'BOARD_RESYNC') {
    return {
      state,
      shouldReload: true,
    };
  }

  if (event.type === 'TASK_DELETED') {
    const targetTaskId = event.taskId ?? event.task?.id;
    if (targetTaskId == null) {
      return { state, shouldReload: false };
    }

    let modified = false;
    const newColumns = state.columns.map((column) => {
      const filtered = column.tasks.filter((t) => t.id !== targetTaskId);
      if (filtered.length !== column.tasks.length) {
        modified = true;
        return {
          ...column,
          tasks: [...filtered].sort((a, b) => a.position - b.position),
        };
      }
      return column;
    });

    if (!modified) {
      return { state, shouldReload: false };
    }

    return {
      state: {
        ...state,
        columns: newColumns,
      },
      shouldReload: false,
    };
  }

  if (
    event.type === 'TASK_CREATED' ||
    event.type === 'TASK_UPDATED' ||
    event.type === 'TASK_MOVED'
  ) {
    const incomingTask = event.task;
    if (!incomingTask) {
      return { state, shouldReload: false };
    }

    // Find local task if present
    let localTask: Task | null = null;
    for (const column of state.columns) {
      const found = column.tasks.find((t) => t.id === incomingTask.id);
      if (found) {
        localTask = found;
        break;
      }
    }

    if (localTask) {
      // Rule 2: If incoming version is more than one ahead of local version, an event was missed
      if (incomingTask.version > localTask.version + 1) {
        return {
          state,
          shouldReload: true,
        };
      }

      // Rule 1: Apply only if version is greater than local version (duplicates and out-of-order are ignored)
      if (incomingTask.version <= localTask.version) {
        return {
          state,
          shouldReload: false,
        };
      }
    } else {
      // Unknown task: if incoming version is > 1 (e.g. missed initial create and updates), reload
      if (incomingTask.version > 1) {
        return {
          state,
          shouldReload: true,
        };
      }
    }

    // Apply task: remove from old column (if present) and insert into target column
    const newColumns = state.columns.map((column) => {
      // Remove any existing instance of this task
      const withoutTask = column.tasks.filter((t) => t.id !== incomingTask.id);

      if (column.id === incomingTask.columnId) {
        const updatedTasks = [...withoutTask, incomingTask].sort(
          (a, b) => a.position - b.position
        );
        return {
          ...column,
          tasks: updatedTasks,
        };
      }

      if (withoutTask.length !== column.tasks.length) {
        return {
          ...column,
          tasks: [...withoutTask].sort((a, b) => a.position - b.position),
        };
      }

      return column;
    });

    return {
      state: {
        ...state,
        columns: newColumns,
      },
      shouldReload: false,
    };
  }

  if (event.type === 'MEMBER_JOINED' && event.member) {
    const exists = state.members.some((m) => m.id === event.member?.id);
    if (exists) {
      return { state, shouldReload: false };
    }
    const newMembers = [...state.members, event.member].sort((a, b) => a.id - b.id);
    return {
      state: {
        ...state,
        members: newMembers,
      },
      shouldReload: false,
    };
  }

  return { state, shouldReload: false };
}
