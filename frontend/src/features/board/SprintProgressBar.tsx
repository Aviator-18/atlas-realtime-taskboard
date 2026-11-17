import React from 'react';
import type { BoardColumn } from '../../api/types';

export interface SprintProgressBarProps {
  columns: BoardColumn[];
}

export const SprintProgressBar: React.FC<SprintProgressBarProps> = ({ columns }) => {
  const totalTasks = columns.reduce((sum, col) => sum + col.tasks.length, 0);
  const doneTasks = columns
    .filter((col) => col.kind === 'DONE')
    .reduce((sum, col) => sum + col.tasks.length, 0);

  const percentage = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  if (totalTasks === 0) {
    return null;
  }

  return (
    <div className="bg-surface-raised border-b border-rule px-4 py-2 flex flex-col gap-1.5 flex-shrink-0">
      <div className="flex items-center justify-between text-[12px] leading-4 text-ink-muted">
        <span className="font-medium text-ink">Sprint progress</span>
        <span className="tabular-nums">
          {doneTasks} of {totalTasks} completed ({percentage}%)
        </span>
      </div>
      <div
        className="w-full h-1.5 bg-surface-lane rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Sprint completion progress"
      >
        <div
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
