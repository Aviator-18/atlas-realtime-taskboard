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
  isFiltered?: boolean;
  onClearFilters?: () => void;
  onQuickCreateTask?: (req: { columnId: number; title: string }) => Promise<void>;
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
  isFiltered = false,
  onClearFilters,
  onQuickCreateTask,
}) => {
  const [isQuickAdding, setIsQuickAdding] = React.useState(false);
  const [quickTitle, setQuickTitle] = React.useState('');
  const [isSubmittingQuick, setIsSubmittingQuick] = React.useState(false);
  const quickInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isQuickAdding) {
      quickInputRef.current?.focus();
    }
  }, [isQuickAdding]);
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
            isFiltered ? (
              <div
                data-testid={`column-filtered-empty-${column.id}`}
                className="py-6 px-3 text-center text-[12.5px] leading-[18px] text-ink-muted select-none border border-dashed border-rule/80 rounded-md bg-surface-canvas/20 flex flex-col items-center justify-center gap-1.5 transition-colors duration-fast"
              >
                <span className="font-medium text-ink-muted">{strings.filter.noMatchingTasks}</span>
                {onClearFilters && (
                  <button
                    type="button"
                    onClick={onClearFilters}
                    data-testid={`column-clear-filters-${column.id}`}
                    className="text-[11.5px] text-accent hover:underline font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
                  >
                    {strings.filter.clearFilters}
                  </button>
                )}
              </div>
            ) : (
              <div className="py-8 px-3 text-center text-[12.5px] leading-[18px] text-ink-muted select-none relative border border-dashed border-rule/80 rounded-md bg-surface-canvas/20 flex flex-col items-center justify-center gap-1.5 transition-colors duration-fast">
                {isOver && (
                  <div
                    data-testid="empty-column-drop-indicator"
                    className="h-[2px] bg-accent rounded-full mb-2 w-full"
                  />
                )}
                <svg
                  className="w-7 h-7 text-ink-muted/50 stroke-current"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-ink-muted">{strings.boardView.noTasks}</span>
                <span className="text-[11px] text-ink-muted/70">Drag tasks here</span>
              </div>
            )
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

      {/* Column Footer: Quick Inline Add or "+ Add task" button */}
      {onQuickCreateTask && (
        <div className="pt-2 flex-shrink-0">
          {isQuickAdding ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const trimmed = quickTitle.trim();
                if (!trimmed || isSubmittingQuick) return;
                try {
                  setIsSubmittingQuick(true);
                  await onQuickCreateTask({ columnId: column.id, title: trimmed });
                  setQuickTitle('');
                  setIsQuickAdding(false);
                } catch {
                  // Handled by mutation error
                } finally {
                  setIsSubmittingQuick(false);
                }
              }}
              data-testid={`quick-add-form-${column.id}`}
              className="bg-surface-raised border border-rule-strong rounded-md p-2 shadow-sm flex flex-col gap-2"
            >
              <input
                ref={quickInputRef}
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsQuickAdding(false);
                    setQuickTitle('');
                  }
                }}
                placeholder="What needs to be done? (Enter to add)"
                aria-label={`Task title for ${column.name}`}
                maxLength={120}
                className="w-full text-[13px] text-ink placeholder:text-ink-muted/70 bg-transparent border-0 outline-none p-0 focus:ring-0"
              />
              <div className="flex items-center justify-between pt-1.5 border-t border-rule/50">
                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    disabled={!quickTitle.trim() || isSubmittingQuick}
                    className="px-2.5 py-1 text-[12px] font-medium bg-accent text-white rounded-sm disabled:opacity-50 hover:bg-accent/90 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    {isSubmittingQuick ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickAdding(false);
                      setQuickTitle('');
                    }}
                    className="px-2 py-1 text-[12px] text-ink-muted hover:text-ink transition-colors duration-fast rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    Cancel
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickAdding(false);
                    setQuickTitle('');
                    onAddTask(column.id);
                  }}
                  className="text-[11.5px] text-accent hover:underline font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
                >
                  Full dialog
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsQuickAdding(true)}
              data-testid={`quick-add-trigger-${column.id}`}
              className="w-full py-1.5 px-2 flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted hover:text-ink hover:bg-surface-canvas/60 rounded-md transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <Plus size={14} strokeWidth={1.5} />
              <span>{strings.boardView.addTask}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
