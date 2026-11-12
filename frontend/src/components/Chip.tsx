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

  if (priority === 'HIGH') {
    label = strings.task.priorityHigh;
    colorClasses = 'text-priority-high-ink bg-priority-high-wash';
  } else if (priority === 'LOW') {
    label = strings.task.priorityLow;
    colorClasses = 'text-priority-low-ink bg-priority-low-wash';
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[12.5px] leading-[18px] font-medium rounded-sm select-none ${colorClasses} ${className}`}
    >
      {label}
    </span>
  );
};
