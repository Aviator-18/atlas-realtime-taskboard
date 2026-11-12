import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { BoardColumn, Member, Priority, Task, UpdateTaskRequest } from '../../api/types';
import { TextField, TextAreaField, SelectField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { strings } from '../../strings';
import { ApiError } from '../../api/client';
import { formatRelativeTime } from '../../utils/time';

export interface TaskDrawerProps {
  task: Task | null;
  columns: BoardColumn[];
  members: Member[];
  onClose: () => void;
  onSave: (taskId: number, updates: UpdateTaskRequest) => Promise<void>;
  onDelete: (taskId: number, version: number) => Promise<void>;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  task,
  columns,
  members,
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimateHours, setEstimateHours] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [columnId, setColumnId] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setEstimateHours(
        task.estimateHours !== null && task.estimateHours !== undefined
          ? String(task.estimateHours)
          : '',
      );
      setPriority(task.priority);
      setAssigneeId(task.assigneeId ? String(task.assigneeId) : '');
      setColumnId(task.columnId);
      setErrorMessage(null);
      setIsConfirmingDelete(false);
    }
  }, [task]);

  if (!task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    let parsedEstimate: number | null = null;
    if (estimateHours.trim() !== '') {
      parsedEstimate = parseFloat(estimateHours);
      if (isNaN(parsedEstimate) || parsedEstimate < 0.5 || parsedEstimate > 40) {
        setErrorMessage('Estimate must be between 0.5 and 40 hours.');
        return;
      }
    }

    const updates: UpdateTaskRequest = {
      version: task.version,
      title: trimmedTitle,
      description: description,
      estimateHours: parsedEstimate,
      priority,
      assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
    };

    if (columnId !== task.columnId) {
      updates.move = {
        columnId,
        afterTaskId: null,
      };
    }

    setIsSubmitting(true);
    try {
      await onSave(task.id, updates);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'TASK_VERSION_CONFLICT') {
        setErrorMessage(
          err.details.detail ||
            `${strings.errors.conflictTitle}. ${strings.errors.conflictDetail}`,
        );
      } else if (err instanceof ApiError && err.details.detail) {
        setErrorMessage(err.details.detail);
      } else {
        setErrorMessage(strings.errors.genericFailure);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onDelete(task.id, task.version);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'TASK_VERSION_CONFLICT') {
        setErrorMessage(
          err.details.detail ||
            `${strings.errors.conflictTitle}. ${strings.errors.conflictDetail}`,
        );
      } else if (err instanceof ApiError && err.details.detail) {
        setErrorMessage(err.details.detail);
      } else {
        setErrorMessage(strings.errors.genericFailure);
      }
    } finally {
      setIsSubmitting(false);
      setIsConfirmingDelete(false);
    }
  };

  return (
    <aside
      aria-label="Task details"
      className="fixed top-0 right-0 h-full w-full md:w-[420px] bg-surface-raised border-l border-rule shadow-floating z-40 flex flex-col transition-transform duration-drawer ease-out"
    >
      {/* Header */}
      <div className="p-4 border-b border-rule flex items-center justify-between gap-2 flex-shrink-0">
        <h2 className="text-[18px] leading-[26px] font-semibold text-ink">
          {strings.task.titleLabel}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={strings.task.closeDrawer}
          className="p-1 rounded-sm text-ink-muted hover:text-ink hover:bg-surface-canvas transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {errorMessage && (
          <Banner
            message={errorMessage}
            variant="warning"
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {isConfirmingDelete ? (
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
                onClick={handleDelete}
              >
                {isSubmitting ? strings.task.deleting : strings.task.confirmDeleteAction}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setIsConfirmingDelete(false)}
              >
                {strings.task.cancel}
              </Button>
            </div>
          </div>
        ) : null}

        <form id="task-drawer-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            label={strings.task.titleLabel}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
          />

          <TextAreaField
            label={strings.task.descriptionLabel}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={4000}
          />

          {/* Two column grid of remaining fields */}
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={strings.task.estimateLabel}
              type="number"
              step="0.5"
              min="0.5"
              max="40"
              value={estimateHours}
              onChange={(e) => setEstimateHours(e.target.value)}
              placeholder="e.g. 4.0"
            />

            <SelectField
              label={strings.task.priorityLabel}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              <option value="LOW">{strings.task.priorityLow}</option>
              <option value="MEDIUM">{strings.task.priorityMedium}</option>
              <option value="HIGH">{strings.task.priorityHigh}</option>
            </SelectField>

            <SelectField
              label={strings.task.assigneeLabel}
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">{strings.task.unassigned}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </SelectField>

            <SelectField
              label={strings.task.columnLabel}
              value={columnId}
              onChange={(e) => setColumnId(parseInt(e.target.value, 10))}
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
          </div>
        </form>

        {/* Timestamps */}
        <div className="mt-4 pt-4 border-t border-rule text-[12.5px] leading-[18px] text-ink-muted flex flex-col gap-1">
          <div className="flex justify-between">
            <span>{strings.task.created}</span>
            <span title={new Date(task.createdAt).toLocaleString()}>
              {formatRelativeTime(task.createdAt)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{strings.task.lastUpdated}</span>
            <span title={new Date(task.updatedAt).toLocaleString()}>
              {formatRelativeTime(task.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="p-4 border-t border-rule bg-surface-raised flex items-center justify-between gap-2 flex-shrink-0">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isSubmitting || isConfirmingDelete}
          onClick={() => setIsConfirmingDelete(true)}
        >
          {strings.task.deleteTask}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
          >
            {strings.task.cancel}
          </Button>
          <Button
            type="submit"
            form="task-drawer-form"
            variant="primary"
            size="sm"
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? strings.task.saving : strings.task.saveChanges}
          </Button>
        </div>
      </div>
    </aside>
  );
};
