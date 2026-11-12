import React, { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { TextField, TextAreaField, SelectField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { strings } from '../../strings';
import { ApiError } from '../../api/client';
import type { BoardColumn, CreateTaskRequest, Member, Priority } from '../../api/types';

export interface CreateTaskDialogProps {
  isOpen: boolean;
  defaultColumnId: number;
  columns: BoardColumn[];
  members: Member[];
  onClose: () => void;
  onCreate: (request: CreateTaskRequest) => Promise<void>;
}

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  isOpen,
  defaultColumnId,
  columns,
  onClose,
  onCreate,
}) => {
  const [columnId, setColumnId] = useState<number>(defaultColumnId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimateHours, setEstimateHours] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync default column when opening
  React.useEffect(() => {
    if (isOpen) {
      setColumnId(defaultColumnId);
      setTitle('');
      setDescription('');
      setEstimateHours('');
      setPriority('MEDIUM');
      setErrorMessage(null);
    }
  }, [isOpen, defaultColumnId]);

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

    const payload: CreateTaskRequest = {
      columnId,
      title: trimmedTitle,
      description: description.trim() ? description : undefined,
      estimateHours: parsedEstimate,
      priority,
    };

    setIsSubmitting(true);
    try {
      await onCreate(payload);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.details.detail) {
        setErrorMessage(err.details.detail);
      } else {
        setErrorMessage(strings.errors.genericFailure);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={strings.task.createTask}>
      {errorMessage && (
        <Banner
          message={errorMessage}
          variant="error"
          onDismiss={() => setErrorMessage(null)}
          className="mb-4"
        />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        <TextField
          label={strings.task.titleLabel}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={120}
          autoFocus
        />

        <TextAreaField
          label={strings.task.descriptionLabel}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
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

          <SelectField
            label={strings.task.priorityLabel}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="LOW">{strings.task.priorityLow}</option>
            <option value="MEDIUM">{strings.task.priorityMedium}</option>
            <option value="HIGH">{strings.task.priorityHigh}</option>
          </SelectField>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {strings.task.cancel}
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? strings.task.creating : strings.task.createTask}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
