import React from 'react';
import { Button } from '../../components/Button';
import { strings } from '../../strings';

export interface TaskDeleteConfirmationProps {
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const TaskDeleteConfirmation: React.FC<TaskDeleteConfirmationProps> = ({
  isSubmitting,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="p-3 border border-danger/40 bg-priority-high-wash/30 rounded-sm flex flex-col gap-2">
      <p className="text-[14px] leading-5 font-medium text-ink">
        {strings.task.confirmDeleteTitle}
      </p>
      <p className="text-[12.5px] leading-[18px] text-ink-muted">
        {strings.task.confirmDeleteDescription}
      </p>
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="destructive"
          size="sm"
          disabled={isSubmitting}
          onClick={onConfirm}
        >
          {isSubmitting ? strings.task.deleting : strings.task.confirmDeleteAction}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          {strings.task.cancel}
        </Button>
      </div>
    </div>
  );
};
