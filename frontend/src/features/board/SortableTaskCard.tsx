import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import type { Task, Member } from '../../api/types';
import { TaskCardView, type TaskCue, type TaskConflict } from './TaskCardView';

export interface SortableTaskCardProps {
  task: Task;
  members: Member[];
  isSelected: boolean;
  onClick: () => void;
  hasConflict?: boolean;
  dropIndicator?: 'before' | 'after' | null;
  cue?: TaskCue | null;
  conflict?: TaskConflict | null;
}

export const SortableTaskCard: React.FC<SortableTaskCardProps> = ({
  task,
  members,
  isSelected,
  onClick,
  hasConflict = false,
  dropIndicator = null,
  cue = null,
  conflict = null,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task.id}`,
    data: {
      type: 'task',
      task,
    },
  });

  // Strict constraint from docs/DESIGN_SYSTEM.md:
  // "Dragging gets the floating shadow and nothing else, no rotation, no scaling."
  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="outline-none"
    >
      <TaskCardView
        task={task}
        members={members}
        isSelected={isSelected}
        onClick={onClick}
        isDragging={isDragging}
        dropIndicator={dropIndicator}
        hasConflict={hasConflict}
        cue={cue}
        conflict={conflict}
      />
    </div>
  );
};
