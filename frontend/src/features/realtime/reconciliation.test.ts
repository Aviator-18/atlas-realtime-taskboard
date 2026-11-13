import { describe, it, expect } from 'vitest';
import { applyBoardEvent } from './reconciliation';
import type { BoardDetail, BoardEvent, Task, BoardColumn } from '../../api/types';

function createMockBoard(): BoardDetail {
  return {
    id: 1,
    name: 'Checkout API',
    inviteCode: 'K7M2QX9R',
    members: [
      { id: 1, displayName: 'Priya Nair', role: 'OWNER' },
      { id: 2, displayName: 'Arjun Mehta', role: 'MEMBER' },
    ],
    columns: [
      {
        id: 10,
        name: 'To do',
        kind: 'TODO',
        position: 1024,
        tasks: [
          createMockTask({ id: 101, columnId: 10, position: 1024, version: 1, title: 'Task 1' }),
          createMockTask({ id: 102, columnId: 10, position: 2048, version: 2, title: 'Task 2' }),
        ],
      },
      {
        id: 20,
        name: 'In progress',
        kind: 'IN_PROGRESS',
        position: 2048,
        tasks: [
          createMockTask({ id: 201, columnId: 20, position: 1024, version: 3, title: 'Task 3' }),
        ],
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
}

function createMockTask(overrides: Partial<Task>): Task {
  return {
    id: 1,
    boardId: 1,
    columnId: 10,
    title: 'Test task',
    description: '',
    position: 1024,
    estimateHours: 2.0,
    priority: 'MEDIUM',
    aiRationale: null,
    assigneeId: null,
    version: 0,
    createdBy: 1,
    createdAt: '2026-11-09T09:00:00Z',
    updatedAt: '2026-11-09T09:00:00Z',
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

function getColumn(board: BoardDetail, index: number): BoardColumn {
  const col = board.columns[index];
  if (!col) {
    throw new Error(`Expected column at index ${index}`);
  }
  return col;
}

function getTask(board: BoardDetail, colIndex: number, taskIndex: number): Task {
  const col = getColumn(board, colIndex);
  const task = col.tasks[taskIndex];
  if (!task) {
    throw new Error(`Expected task at column ${colIndex}, task index ${taskIndex}`);
  }
  return task;
}

describe('applyBoardEvent reconciliation', () => {
  it('handles duplicate event: ignores event with the same version as local task', () => {
    const board = createMockBoard();
    const duplicateEvent: BoardEvent = {
      eventId: 'evt-dup',
      type: 'TASK_UPDATED',
      boardId: 1,
      actorId: 2,
      occurredAt: '2026-11-09T09:10:00Z',
      task: createMockTask({
        id: 101,
        columnId: 10,
        position: 1024,
        version: 1,
        title: 'Task 1 - stale duplicate title',
      }),
      taskId: null,
    };

    const result = applyBoardEvent(board, duplicateEvent);

    expect(result.shouldReload).toBe(false);
    expect(getTask(result.state, 0, 0).title).toBe('Task 1');
    expect(result.state).toBe(board);
  });

  it('handles out of order event: ignores event with lower version than local task', () => {
    const board = createMockBoard();
    const outOfOrderEvent: BoardEvent = {
      eventId: 'evt-ooo',
      type: 'TASK_UPDATED',
      boardId: 1,
      actorId: 2,
      occurredAt: '2026-11-09T09:05:00Z',
      task: createMockTask({
        id: 102,
        columnId: 10,
        position: 2048,
        version: 1, // local is version 2
        title: 'Task 2 - old version 1',
      }),
      taskId: null,
    };

    const result = applyBoardEvent(board, outOfOrderEvent);

    expect(result.shouldReload).toBe(false);
    expect(getTask(result.state, 0, 1).title).toBe('Task 2');
    expect(result.state).toBe(board);
  });

  it('handles version gap: flags reload when incoming version is more than one ahead of local version', () => {
    const board = createMockBoard();
    const gapEvent: BoardEvent = {
      eventId: 'evt-gap',
      type: 'TASK_UPDATED',
      boardId: 1,
      actorId: 2,
      occurredAt: '2026-11-09T09:20:00Z',
      task: createMockTask({
        id: 101,
        columnId: 10,
        position: 1024,
        version: 4, // local is version 1; 4 > 1 + 1 (gap detected)
        title: 'Task 1 - version 4',
      }),
      taskId: null,
    };

    const result = applyBoardEvent(board, gapEvent);

    expect(result.shouldReload).toBe(true);
  });

  it('handles delete event: removes task from column and preserves column sorting', () => {
    const board = createMockBoard();
    const deleteEvent: BoardEvent = {
      eventId: 'evt-del',
      type: 'TASK_DELETED',
      boardId: 1,
      actorId: 2,
      occurredAt: '2026-11-09T09:15:00Z',
      task: null,
      taskId: 101,
    };

    const result = applyBoardEvent(board, deleteEvent);

    expect(result.shouldReload).toBe(false);
    const todoTasks = getColumn(result.state, 0).tasks;
    expect(todoTasks).toHaveLength(1);
    expect(getTask(result.state, 0, 0).id).toBe(102);
  });

  it('handles resync event: flags reload when BOARD_RESYNC is received', () => {
    const board = createMockBoard();
    const resyncEvent: BoardEvent = {
      eventId: 'evt-resync',
      type: 'BOARD_RESYNC',
      boardId: 1,
      actorId: 1,
      occurredAt: '2026-11-09T09:30:00Z',
      task: null,
      taskId: null,
    };

    const result = applyBoardEvent(board, resyncEvent);

    expect(result.shouldReload).toBe(true);
    expect(result.state).toBe(board);
  });

  it('handles create event: adds unknown task to appropriate column in sorted order', () => {
    const board = createMockBoard();
    const createEvent: BoardEvent = {
      eventId: 'evt-create',
      type: 'TASK_CREATED',
      boardId: 1,
      actorId: 1,
      occurredAt: '2026-11-09T09:12:00Z',
      task: createMockTask({
        id: 105,
        columnId: 10,
        position: 1536, // midpoint between 1024 and 2048
        version: 0,
        title: 'Midpoint task',
      }),
      taskId: null,
    };

    const result = applyBoardEvent(board, createEvent);

    expect(result.shouldReload).toBe(false);
    const todoTasks = getColumn(result.state, 0).tasks;
    expect(todoTasks).toHaveLength(3);
    expect(todoTasks.map((t) => t.id)).toEqual([101, 105, 102]);
  });

  it('handles move event: moves task to new column and sorts both columns by position', () => {
    const board = createMockBoard();
    const moveEvent: BoardEvent = {
      eventId: 'evt-move',
      type: 'TASK_MOVED',
      boardId: 1,
      actorId: 1,
      occurredAt: '2026-11-09T09:14:00Z',
      task: createMockTask({
        id: 101,
        columnId: 20, // moved from Todo (10) to In Progress (20)
        position: 2048,
        version: 2, // 2 = local (1) + 1
        title: 'Task 1',
      }),
      taskId: null,
    };

    const result = applyBoardEvent(board, moveEvent);

    expect(result.shouldReload).toBe(false);
    // Origin column (10)
    expect(getColumn(result.state, 0).tasks.map((t) => t.id)).toEqual([102]);
    // Destination column (20)
    expect(getColumn(result.state, 1).tasks.map((t) => t.id)).toEqual([201, 101]);
  });
});
