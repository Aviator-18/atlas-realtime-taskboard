import React from 'react';
import { X } from 'lucide-react';
import type { BoardColumn, Member, Priority, Task, UpdateTaskRequest } from '../../api/types';
import { TextField, TextAreaField, SelectField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { strings } from '../../strings';
import { TaskDeleteConfirmation } from './TaskDeleteConfirmation';
import { TaskDrawerConflictBanner } from './TaskDrawerConflictBanner';
import { TaskDrawerTimestamps } from './TaskDrawerTimestamps';
import { useTaskDrawerForm } from './useTaskDrawerForm';

export interface TaskDrawerProps {
  task: Task | null;
  columns: BoardColumn[];
  members: Member[];
  conflictActorName?: string | null;
  onClearConflict?: () => void;
  onClose: () => void;
  onSave: (taskId: number, updates: UpdateTaskRequest) => Promise<void>;
  onDelete: (taskId: number, version: number) => Promise<void>;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  task,
  columns,
  members,
  conflictActorName = null,
  onClearConflict,
  onClose,
  onSave,
  onDelete,
}) => {
  const {
    title, setTitle,
    description, setDescription,
    estimateHours, setEstimateHours,
    priority, setPriority,
    assigneeId, setAssigneeId,
    columnId, setColumnId,
    displayedVersion,
    isSubmitting,
    errorMessage, setErrorMessage,
    conflictBanner, setConflictBanner,
    isConfirmingDelete, setIsConfirmingDelete,
    performSave,
    handleDelete,
  } = useTaskDrawerForm({
    task,
    conflictActorName,
    onSave,
    onDelete,
    onClose,
    onClearConflict,
  });

  if (!task) return null;

  return (
    <aside aria-label="Task details" className="fixed top-12 right-0 h-[calc(100vh-48px)] w-full md:w-[420px] bg-surface-raised border-l border-rule shadow-floating z-30 flex flex-col transition-transform duration-drawer ease-out">
      <div className="p-4 border-b border-rule flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex-1">
          <label htmlFor="drawer-task-title" className="sr-only">{strings.task.titleLabel}</label>
          <input
            id="drawer-task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            className="w-full text-[18px] leading-[26px] font-semibold text-ink bg-surface-raised border border-rule-strong hover:border-ink-muted rounded-sm px-2.5 h-8 transition-colors duration-fast outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={strings.task.closeDrawer}
          className="p-1 rounded-sm text-ink-muted hover:text-ink hover:bg-surface-canvas transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent flex-shrink-0"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {conflictBanner && (
          <TaskDrawerConflictBanner
            bannerText={conflictBanner}
            onApplyAgain={() => void performSave()}
            onDismiss={() => { setConflictBanner(null); onClearConflict?.(); }}
          />
        )}

        {errorMessage && <Banner message={errorMessage} variant="warning" onDismiss={() => setErrorMessage(null)} />}

        {isConfirmingDelete && (
          <TaskDeleteConfirmation
            isSubmitting={isSubmitting}
            onConfirm={handleDelete}
            onCancel={() => setIsConfirmingDelete(false)}
          />
        )}

        <form id="task-drawer-form" onSubmit={(e) => { e.preventDefault(); void performSave(); }} className="flex flex-col gap-4">
          <TextAreaField
            label={strings.task.descriptionLabel}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={4000}
          />

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

            <SelectField label={strings.task.priorityLabel} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="LOW">{strings.task.priorityLow}</option>
              <option value="MEDIUM">{strings.task.priorityMedium}</option>
              <option value="HIGH">{strings.task.priorityHigh}</option>
            </SelectField>

            <SelectField label={strings.task.assigneeLabel} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">{strings.task.unassigned}</option>
              {members.map((m) => (<option key={m.id} value={m.id}>{m.displayName}</option>))}
            </SelectField>

            <SelectField label={strings.task.columnLabel} value={columnId} onChange={(e) => setColumnId(parseInt(e.target.value, 10))}>
              {columns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </SelectField>
          </div>
        </form>

        <TaskDrawerTimestamps createdAt={task.createdAt} updatedAt={task.updatedAt} version={displayedVersion} />
      </div>

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
          <Button type="button" variant="secondary" size="sm" disabled={isSubmitting} onClick={onClose}>
            {strings.task.cancel}
          </Button>
          <Button type="submit" form="task-drawer-form" variant="primary" size="sm" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? strings.task.saving : strings.task.saveChanges}
          </Button>
        </div>
      </div>
    </aside>
  );
};
