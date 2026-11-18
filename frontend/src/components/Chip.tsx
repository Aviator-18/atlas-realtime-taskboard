import React from 'react';
import type { Priority } from '../api/types';
import { strings } from '../strings';

export interface PriorityChipProps {
  priority: Priority;
  className?: string;
}

export const PriorityChip: React.FC<PriorityChipProps> = ({ priority, className = '' }) => {
  let label: string = strings.task.priorityMedium;
  let colorClasses = 'text-priority-medium-ink bg-priority-medium-wash';
  let dotColor = 'bg-priority-medium-ink';

  if (priority === 'HIGH') {
    label = strings.task.priorityHigh;
    colorClasses = 'text-priority-high-ink bg-priority-high-wash';
    dotColor = 'bg-priority-high-ink';
  } else if (priority === 'LOW') {
    label = strings.task.priorityLow;
    colorClasses = 'text-priority-low-ink bg-priority-low-wash';
    dotColor = 'bg-priority-low-ink';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[12px] leading-[16px] font-medium rounded-sm select-none ${colorClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
      {label}
    </span>
  );
};
