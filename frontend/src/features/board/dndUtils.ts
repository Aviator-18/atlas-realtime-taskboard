import type { BoardColumn, BoardDetail, Task, TaskMove } from '../../api/types';

/**
 * Parses a dnd-kit id string or number into a type and entity id.
 * Format examples: "task-12", "col-3", "column-3", 12.
 */
export function parseDndId(
  id: string | number | null | undefined,
): { type: 'task' | 'column'; id: number } | null {
  if (id === null || id === undefined) {
    return null;
  }
  if (typeof id === 'number') {
    return { type: 'task', id };
  }
  if (id.startsWith('task-')) {
    const num = Number(id.slice(5));
    return Number.isFinite(num) ? { type: 'task', id: num } : null;
  }
  if (id.startsWith('col-')) {
    const num = Number(id.slice(4));
    return Number.isFinite(num) ? { type: 'column', id: num } : null;
  }
  if (id.startsWith('column-')) {
    const num = Number(id.slice(7));
    return Number.isFinite(num) ? { type: 'column', id: num } : null;
  }
  const num = Number(id);
  if (Number.isFinite(num)) {
    return { type: 'task', id: num };
  }
  return null;
}

/**
 * Converts a dnd-kit active drag and drop target into a TaskMove payload
 * (columnId and afterTaskId) as expected by the Atlas API contract.
 * Returns null if the drop is invalid, dropped outside, or a no-op.
 */
export function calculateTaskMove(
  columns: BoardColumn[],
  activeId: string | number,
  overId: string | number | null | undefined,
): TaskMove | null {
  if (!overId) {
    return null;
  }

  const activeParsed = parseDndId(activeId);
  if (!activeParsed || activeParsed.type !== 'task') {
    return null;
  }
  const activeTaskId = activeParsed.id;

  const sourceColumn = columns.find((col) =>
    col.tasks.some((t) => t.id === activeTaskId),
  );
  if (!sourceColumn) {
    return null;
  }
  const activeTask = sourceColumn.tasks.find((t) => t.id === activeTaskId);
  if (!activeTask) {
    return null;
  }

  const overParsed = parseDndId(overId);
  if (!overParsed) {
    return null;
  }

  // Case A: Dropped directly over a column container
  if (overParsed.type === 'column') {
    const targetColumn = columns.find((col) => col.id === overParsed.id);
    if (!targetColumn) {
      return null;
    }

    if (targetColumn.id === sourceColumn.id) {
      // If already in this column, check if it's already the last task
      const lastTask = sourceColumn.tasks[sourceColumn.tasks.length - 1];
      if (lastTask && lastTask.id === activeTaskId) {
        return null; // Already at the bottom of this column
      }
      return {
        columnId: targetColumn.id,
        afterTaskId: lastTask ? lastTask.id : null,
      };
    }

    // Moving to a different column
    if (targetColumn.tasks.length === 0) {
      return {
        columnId: targetColumn.id,
        afterTaskId: null,
      };
    }

    const lastTask = targetColumn.tasks[targetColumn.tasks.length - 1];
    return {
      columnId: targetColumn.id,
      afterTaskId: lastTask ? lastTask.id : null,
    };
  }

  // Case B: Dropped over another task
  const overTaskId = overParsed.id;
  if (overTaskId === activeTaskId) {
    return null;
  }

  const targetColumn = columns.find((col) =>
    col.tasks.some((t) => t.id === overTaskId),
  );
  if (!targetColumn) {
    return null;
  }

  if (targetColumn.id === sourceColumn.id) {
    const fromIndex = sourceColumn.tasks.findIndex((t) => t.id === activeTaskId);
    const toIndex = sourceColumn.tasks.findIndex((t) => t.id === overTaskId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return null;
    }

    const reordered = [...sourceColumn.tasks];
    const moved = reordered.splice(fromIndex, 1)[0];
    if (!moved) {
      return null;
    }
    reordered.splice(toIndex, 0, moved);

    const newIndex = reordered.findIndex((t) => t.id === activeTaskId);
    const precedingTask = newIndex > 0 ? reordered[newIndex - 1] : undefined;
    const afterTaskId = precedingTask ? precedingTask.id : null;

    return {
      columnId: targetColumn.id,
      afterTaskId,
    };
  }

  // Moving across different columns onto a task in the target column
  const toIndex = targetColumn.tasks.findIndex((t) => t.id === overTaskId);
  if (toIndex === -1) {
    return null;
  }

  const targetWithActive = [...targetColumn.tasks];
  targetWithActive.splice(toIndex, 0, activeTask);

  const newIndex = toIndex;
  const precedingTask = newIndex > 0 ? targetWithActive[newIndex - 1] : undefined;
  const afterTaskId = precedingTask ? precedingTask.id : null;

  return {
    columnId: targetColumn.id,
    afterTaskId,
  };
}

/**
 * Optimistically applies a task move to a BoardDetail query cache object.
 */
export function applyOptimisticMove(
  board: BoardDetail,
  taskId: number,
  targetColumnId: number,
  afterTaskId: number | null,
): BoardDetail {
  let movedTask: Task | null = null;

  // Find and remove task from existing columns
  const intermediateColumns = board.columns.map((col) => {
    const found = col.tasks.find((t) => t.id === taskId);
    if (found) {
      movedTask = { ...found, columnId: targetColumnId };
      return {
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      };
    }
    return col;
  });

  if (!movedTask) {
    return board;
  }

  const taskToInsert: Task = movedTask;

  // Insert into target column at the calculated position
  const updatedColumns = intermediateColumns.map((col) => {
    if (col.id !== targetColumnId) {
      return col;
    }

    if (afterTaskId === null) {
      return {
        ...col,
        tasks: [taskToInsert, ...col.tasks],
      };
    }

    const targetIndex = col.tasks.findIndex((t) => t.id === afterTaskId);
    if (targetIndex === -1) {
      // If afterTaskId not found, append to end
      return {
        ...col,
        tasks: [...col.tasks, taskToInsert],
      };
    }

    const newTasks = [...col.tasks];
    newTasks.splice(targetIndex + 1, 0, taskToInsert);
    return {
      ...col,
      tasks: newTasks,
    };
  });

  return {
    ...board,
    columns: updatedColumns,
  };
}

/**
 * Replaces a task in the board detail cache (used on 409 TASK_VERSION_CONFLICT).
 */
export function replaceTaskInBoard(board: BoardDetail, updatedTask: Task): BoardDetail {
  return {
    ...board,
    columns: board.columns.map((col) => {
      const filtered = col.tasks.filter((t) => t.id !== updatedTask.id);
      if (col.id === updatedTask.columnId) {
        const withTask = [...filtered, updatedTask].sort(
          (a, b) => a.position - b.position,
        );
        return {
          ...col,
          tasks: withTask,
        };
      }
      return {
        ...col,
        tasks: filtered,
      };
    }),
  };
}
