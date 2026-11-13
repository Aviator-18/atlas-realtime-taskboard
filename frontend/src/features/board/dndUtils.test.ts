import { describe, expect, it } from 'vitest';
import {
  parseDndId,
  calculateTaskMove,
  applyOptimisticMove,
  replaceTaskInBoard,
} from './dndUtils';
import type { BoardColumn, BoardDetail, Task } from '../../api/types';

function createTask(id: number, columnId: number, position: number, title: string): Task {
  return {
    id,
    boardId: 1,
    columnId,
    title,
    description: '',
    position,
    estimateHours: 2.0,
    priority: 'MEDIUM',
    aiRationale: null,
    assigneeId: null,
    version: 1,
    createdBy: 1,
    createdAt: '2026-11-10T10:00:00Z',
    updatedAt: '2026-11-10T10:00:00Z',
    startedAt: null,
    completedAt: null,
  };
}

describe('parseDndId', () => {
  it('parses numeric ids as tasks', () => {
    expect(parseDndId(42)).toEqual({ type: 'task', id: 42 });
  });

  it('parses task-prefixed strings', () => {
    expect(parseDndId('task-101')).toEqual({ type: 'task', id: 101 });
  });

  it('parses col- and column- prefixed strings', () => {
    expect(parseDndId('col-10')).toEqual({ type: 'column', id: 10 });
    expect(parseDndId('column-20')).toEqual({ type: 'column', id: 20 });
  });

  it('returns null for invalid ids', () => {
    expect(parseDndId(null)).toBeNull();
    expect(parseDndId(undefined)).toBeNull();
    expect(parseDndId('invalid')).toBeNull();
    expect(parseDndId('task-abc')).toBeNull();
  });
});

describe('calculateTaskMove', () => {
  const columns: BoardColumn[] = [
    {
      id: 10,
      name: 'To do',
      kind: 'TODO',
      position: 1024,
      tasks: [
        createTask(1, 10, 1024, 'Task 1'),
        createTask(2, 10, 2048, 'Task 2'),
        createTask(3, 10, 3072, 'Task 3'),
      ],
    },
    {
      id: 20,
      name: 'In progress',
      kind: 'IN_PROGRESS',
      position: 2048,
      tasks: [
        createTask(4, 20, 1024, 'Task 4'),
        createTask(5, 20, 2048, 'Task 5'),
      ],
    },
    {
      id: 30,
      name: 'Done',
      kind: 'DONE',
      position: 3072,
      tasks: [],
    },
  ];

  describe('within the same column', () => {
    it('moves a card downwards after target card', () => {
      // Move Task 1 onto Task 2 -> should be placed after Task 2
      const move = calculateTaskMove(columns, 'task-1', 'task-2');
      expect(move).toEqual({
        columnId: 10,
        afterTaskId: 2,
      });
    });

    it('moves a card downwards to the bottom', () => {
      // Move Task 1 onto Task 3 -> should be placed after Task 3
      const move = calculateTaskMove(columns, 'task-1', 'task-3');
      expect(move).toEqual({
        columnId: 10,
        afterTaskId: 3,
      });
    });

    it('moves a card upwards to the top with afterTaskId null', () => {
      // Move Task 3 onto Task 1 -> should be placed before Task 1 (top of column)
      const move = calculateTaskMove(columns, 'task-3', 'task-1');
      expect(move).toEqual({
        columnId: 10,
        afterTaskId: null,
      });
    });

    it('moves a card upwards into middle position', () => {
      // Move Task 3 onto Task 2 -> should be placed before Task 2 (after Task 1)
      const move = calculateTaskMove(columns, 'task-3', 'task-2');
      expect(move).toEqual({
        columnId: 10,
        afterTaskId: 1,
      });
    });

    it('returns null when dropping onto self', () => {
      const move = calculateTaskMove(columns, 'task-2', 'task-2');
      expect(move).toBeNull();
    });

    it('returns null when dropped on same column container if already at bottom', () => {
      // Task 3 is already at the bottom of column 10
      const move = calculateTaskMove(columns, 'task-3', 'col-10');
      expect(move).toBeNull();
    });

    it('moves card to end when dropped on same column container from earlier position', () => {
      // Task 1 dropped on column 10 container -> move to bottom after Task 3
      const move = calculateTaskMove(columns, 'task-1', 'col-10');
      expect(move).toEqual({
        columnId: 10,
        afterTaskId: 3,
      });
    });
  });

  describe('across columns', () => {
    it('moves into an empty column with afterTaskId null', () => {
      const move = calculateTaskMove(columns, 'task-1', 'col-30');
      expect(move).toEqual({
        columnId: 30,
        afterTaskId: null,
      });
    });

    it('moves onto a card at the top of target column with afterTaskId null', () => {
      // Task 1 moved onto Task 4 (first item in In progress)
      const move = calculateTaskMove(columns, 'task-1', 'task-4');
      expect(move).toEqual({
        columnId: 20,
        afterTaskId: null,
      });
    });

    it('moves onto a card in the middle of target column', () => {
      // Task 1 moved onto Task 5 (second item in In progress) -> inserted before Task 5 (after Task 4)
      const move = calculateTaskMove(columns, 'task-1', 'task-5');
      expect(move).toEqual({
        columnId: 20,
        afterTaskId: 4,
      });
    });

    it('moves to end of non-empty target column when dropped on column container', () => {
      const move = calculateTaskMove(columns, 'task-1', 'col-20');
      expect(move).toEqual({
        columnId: 20,
        afterTaskId: 5,
      });
    });
  });

  describe('edge and invalid cases', () => {
    it('returns null when overId is null or missing', () => {
      expect(calculateTaskMove(columns, 'task-1', null)).toBeNull();
      expect(calculateTaskMove(columns, 'task-1', undefined)).toBeNull();
    });

    it('returns null when active task is not in any column', () => {
      expect(calculateTaskMove(columns, 'task-999', 'task-1')).toBeNull();
    });

    it('returns null when target task does not exist', () => {
      expect(calculateTaskMove(columns, 'task-1', 'task-999')).toBeNull();
    });

    it('returns null when target column does not exist', () => {
      expect(calculateTaskMove(columns, 'task-1', 'col-999')).toBeNull();
    });
  });
});

describe('applyOptimisticMove and replaceTaskInBoard', () => {
  const initialBoard: BoardDetail = {
    id: 1,
    name: 'Board',
    inviteCode: 'K7M2QX9R',
    members: [],
    columns: [
      {
        id: 10,
        name: 'To do',
        kind: 'TODO',
        position: 1024,
        tasks: [
          createTask(1, 10, 1024, 'Task 1'),
          createTask(2, 10, 2048, 'Task 2'),
        ],
      },
      {
        id: 20,
        name: 'Done',
        kind: 'DONE',
        position: 2048,
        tasks: [createTask(3, 20, 1024, 'Task 3')],
      },
    ],
  };

  it('optimistically moves card to top of target column', () => {
    const updated = applyOptimisticMove(initialBoard, 1, 20, null);
    const col10 = updated.columns.find((c) => c.id === 10);
    const col20 = updated.columns.find((c) => c.id === 20);

    expect(col10).toBeDefined();
    expect(col20).toBeDefined();
    if (!col10 || !col20) return;

    expect(col10.tasks.map((t) => t.id)).toEqual([2]);
    expect(col20.tasks.map((t) => t.id)).toEqual([1, 3]);
    const firstTask = col20.tasks[0];
    expect(firstTask?.columnId).toBe(20);
  });

  it('optimistically moves card after target card', () => {
    const updated = applyOptimisticMove(initialBoard, 1, 20, 3);
    const col20 = updated.columns.find((c) => c.id === 20);

    expect(col20).toBeDefined();
    if (!col20) return;

    expect(col20.tasks.map((t) => t.id)).toEqual([3, 1]);
  });

  it('replaces card with currentTask on conflict and orders by position', () => {
    const conflictTask: Task = {
      ...createTask(1, 20, 3072, 'Task 1 updated remotely'),
      version: 5,
    };

    const updated = replaceTaskInBoard(initialBoard, conflictTask);
    const col10 = updated.columns.find((c) => c.id === 10);
    const col20 = updated.columns.find((c) => c.id === 20);

    expect(col10).toBeDefined();
    expect(col20).toBeDefined();
    if (!col10 || !col20) return;

    expect(col10.tasks.map((t) => t.id)).toEqual([2]);
    expect(col20.tasks.map((t) => t.id)).toEqual([3, 1]);
    const secondTask = col20.tasks[1];
    expect(secondTask?.title).toBe('Task 1 updated remotely');
    expect(secondTask?.version).toBe(5);
  });
});
