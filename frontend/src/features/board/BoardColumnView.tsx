import React from 'react';
import { Plus } from 'lucide-react';
import type { BoardColumn, Member, Task } from '../../api/types';
import { TaskCardView } from './TaskCardView';
import { strings } from '../../strings';

export interface BoardColumnViewProps {
  column: BoardColumn;
  members: Member[];
  selectedTaskId: number | null;
  onSelectTask: (task: Task) => void;
  onAddTask: (columnId: number) => void;
}

export const BoardColumnView: React.FC<BoardColumnViewProps> = ({
  column,
  members,
  selectedTaskId,
  onSelectTask,
  onAddTask,
}) => {
  return (
    <div className="w-[300px] flex-shrink-0 bg-surface-lane rounded-sm p-3 flex flex-col max-h-full">
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
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-0.5">
        {column.tasks.length === 0 ? (
          <div className="py-6 text-center text-[12.5px] leading-[18px] text-ink-muted select-none">
            {strings.boardView.noTasks}
          </div>
        ) : (
          column.tasks.map((task) => (
            <TaskCardView
              key={task.id}
              task={task}
              members={members}
              isSelected={task.id === selectedTaskId}
              onClick={() => onSelectTask(task)}
            />
          ))
        )}
      </div>
    </div>
  );
};
