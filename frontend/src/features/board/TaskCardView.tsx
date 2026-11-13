import React from 'react';
import type { Task, Member } from '../../api/types';
import { PriorityChip } from '../../components/Chip';
import { Avatar } from '../../components/Avatar';
import { strings } from '../../strings';

export interface TaskCardViewProps {
  task: Task;
  members: Member[];
  isSelected: boolean;
  onClick?: () => void;
  isDragging?: boolean;
  isOverlay?: boolean;
  dropIndicator?: 'before' | 'after' | null;
  hasConflict?: boolean;
}

export const TaskCardView: React.FC<TaskCardViewProps> = ({
  task,
  members,
  isSelected,
  onClick,
  isDragging = false,
  isOverlay = false,
  dropIndicator = null,
  hasConflict = false,
}) => {
  const assignee = task.assigneeId
    ? members.find((m) => m.id === task.assigneeId)
    : null;

  return (
    <div className="relative">
      {/* Drop indicator line before card (2 px --accent line) */}
      {dropIndicator === 'before' && (
        <div
          data-testid="drop-indicator-before"
          className="h-[2px] bg-accent rounded-full mb-1 w-full"
        />
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
        style={{
          boxShadow: isOverlay
            ? '0 6px 16px rgba(31, 37, 44, 0.18)'
            : undefined,
        }}
        className={`bg-surface-raised border rounded-md p-[10px_12px] cursor-pointer transition-colors duration-fast text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          isOverlay
            ? 'border-rule-strong'
            : isDragging
              ? 'opacity-30 border-dashed border-rule-strong'
              : isSelected
                ? 'outline outline-2 outline-accent border-transparent'
                : 'border-rule hover:border-rule-strong'
        }`}
      >
        <h3 className="text-[14px] leading-5 font-medium text-ink line-clamp-3">
          {task.title}
        </h3>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {task.estimateHours !== null && task.estimateHours !== undefined && (
              <span className="text-[12.5px] leading-[18px] text-ink-muted tabular-nums">
                {task.estimateHours} h
              </span>
            )}
            <PriorityChip priority={task.priority} />
          </div>

          <div>
            {assignee ? (
              <Avatar name={assignee.displayName} />
            ) : (
              <span className="w-[22px] h-[22px] block" />
            )}
          </div>
        </div>

        {/* Extension point for Phase 7: Conflict banner */}
        {hasConflict && (
          <div
            data-testid="task-conflict-extension-point"
            className="mt-2 pt-2 border-t border-rule flex items-center gap-1.5 text-[12px] leading-4 text-priority-high-ink"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block flex-shrink-0" />
            <span className="font-medium">{strings.task.conflictPending}</span>
          </div>
        )}
      </div>

      {/* Drop indicator line after card (2 px --accent line) */}
      {dropIndicator === 'after' && (
        <div
          data-testid="drop-indicator-after"
          className="h-[2px] bg-accent rounded-full mt-1 w-full"
        />
      )}
    </div>
  );
};
