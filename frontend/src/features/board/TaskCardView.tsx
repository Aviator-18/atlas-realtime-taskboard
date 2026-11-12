import React from 'react';
import type { Task, Member } from '../../api/types';
import { PriorityChip } from '../../components/Chip';
import { Avatar } from '../../components/Avatar';

export interface TaskCardViewProps {
  task: Task;
  members: Member[];
  isSelected: boolean;
  onClick: () => void;
}

export const TaskCardView: React.FC<TaskCardViewProps> = ({
  task,
  members,
  isSelected,
  onClick,
}) => {
  const assignee = task.assigneeId
    ? members.find((m) => m.id === task.assigneeId)
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`bg-surface-raised border rounded-md p-[10px_12px] cursor-pointer transition-colors duration-fast text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        isSelected
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
    </div>
  );
};
