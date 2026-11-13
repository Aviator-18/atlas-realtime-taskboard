import React from 'react';
import { strings } from '../../strings';
import { formatRelativeTime } from '../../utils/time';

export interface TaskDrawerTimestampsProps {
  createdAt: string;
  updatedAt: string;
  version: number;
}

export const TaskDrawerTimestamps: React.FC<TaskDrawerTimestampsProps> = ({
  createdAt,
  updatedAt,
  version,
}) => {
  return (
    <div className="mt-4 pt-4 border-t border-rule text-[12.5px] leading-[18px] text-ink-muted flex flex-col gap-1">
      <div className="flex justify-between">
        <span>{strings.task.created}</span>
        <span title={new Date(createdAt).toLocaleString()}>
          {formatRelativeTime(createdAt)}
        </span>
      </div>
      <div className="flex justify-between">
        <span>{strings.task.lastUpdated}</span>
        <span title={new Date(updatedAt).toLocaleString()}>
          {formatRelativeTime(updatedAt)}
        </span>
      </div>
      <div className="flex justify-between">
        <span>Version</span>
        <span data-testid="drawer-displayed-version" className="tabular-nums">
          {version}
        </span>
      </div>
    </div>
  );
};
