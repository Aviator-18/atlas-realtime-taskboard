import React from 'react';
import { Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { BoardColumn, Member, Task } from '../../api/types';
import { SortableTaskCard } from './SortableTaskCard';
import type { TaskCue, TaskConflict } from './TaskCardView';
import { parseDndId } from './dndUtils';
import { strings } from '../../strings';

export interface BoardColumnViewProps {
  column: BoardColumn;
  members: Member[];
  selectedTaskId: number | null;
  onSelectTask: (task: Task) => void;
  onAddTask: (columnId: number) => void;
  activeDragId?: string | number | null;
  overDropId?: string | number | null;
  conflictTaskIds?: Set<number>;
  cuesByTaskId?: Record<number, TaskCue>;
  conflictsByTaskId?: Record<number, TaskConflict>;
  deletedTaskBanners?: Array<{ id: number; columnId: number; message: string }>;
}

export const BoardColumnView: React.FC<BoardColumnViewProps> = ({
  column,
  members,
  selectedTaskId,
  onSelectTask,
  onAddTask,
  activeDragId = null,
  overDropId = null,
  conflictTaskIds,
  cuesByTaskId,
  conflictsByTaskId,
  deletedTaskBanners = [],
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${column.id}`,
    data: {
      type: 'column',
      column,
    },
  });

  const isOverColumnBottom = overDropId === `col-${column.id}`;

  return (
    <div
      ref={setNodeRef}
      data-testid={`board-column-${column.id}`}
      className="w-[300px] flex-shrink-0 bg-surface-lane rounded-sm p-3 flex flex-col max-h-full"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-rule/60">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] leading-5 font-medium text-ink">
            {column.name}
          </h2>
          <span className="text-[12.5px] leading-[18px] text-ink-muted tabular-nums">
            {column.tasks.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAddTask(column.id)}
          aria-label={`${strings.boardView.addTask} to ${column.name}`}
          className="p-1 rounded-sm text-ink-muted hover:text-ink hover:bg-surface-canvas transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Column Tasks */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-0.5 min-h-[60px]">
        <SortableContext
          items={column.tasks.map((t) => `task-${t.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.length === 0 ? (
            <div className="py-6 text-center text-[12.5px] leading-[18px] text-ink-muted select-none relative">
              {isOver && (
                <div
                  data-testid="empty-column-drop-indicator"
                  className="h-[2px] bg-accent rounded-full mb-3 w-full"
                />
              )}
              {strings.boardView.noTasks}
            </div>
          ) : (
            column.tasks.map((task, index) => {
              const isOverCard = overDropId === `task-${task.id}`;
              const isLastCard = index === column.tasks.length - 1;

              let dropIndicator: 'before' | 'after' | null = null;
              if (isOverCard && activeDragId !== `task-${task.id}`) {
                const activeParsed = parseDndId(activeDragId);
                const activeTaskId = activeParsed?.id;
                const activeIndex = column.tasks.findIndex((t) => t.id === activeTaskId);
                if (activeIndex !== -1) {
                  dropIndicator = activeIndex < index ? 'after' : 'before';
                } else {
                  dropIndicator = 'before';
                }
              } else if (isLastCard && isOverColumnBottom && activeDragId !== `task-${task.id}`) {
                dropIndicator = 'after';
              }

              return (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  members={members}
                  isSelected={task.id === selectedTaskId}
                  onClick={() => onSelectTask(task)}
                  hasConflict={conflictTaskIds?.has(task.id) ?? false}
                  dropIndicator={dropIndicator}
                  cue={cuesByTaskId ? cuesByTaskId[task.id] : null}
                  conflict={conflictsByTaskId ? conflictsByTaskId[task.id] : null}
                />
              );
            })
          )}
          {/* Temporary placeholder banner for deleted tasks in this column */}
          {deletedTaskBanners
            .filter((b) => b.columnId === column.id)
            .map((banner) => (
              <div
                key={`deleted-banner-${banner.id}`}
                data-testid={`deleted-task-banner-${banner.id}`}
                className="bg-warning-wash border border-rule rounded-md p-2.5 text-[12.5px] leading-[18px] text-ink animate-fade-in"
              >
                {banner.message}
              </div>
            ))}
        </SortableContext>
      </div>
    </div>
  );
};
