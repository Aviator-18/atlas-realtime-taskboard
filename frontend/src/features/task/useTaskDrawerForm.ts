import { useEffect, useRef, useState } from 'react';
import type { Priority, Task, UpdateTaskRequest } from '../../api/types';
import { ApiError } from '../../api/client';
import { strings } from '../../strings';

export interface UseTaskDrawerFormOptions {
  task: Task | null;
  conflictActorName?: string | null;
  onSave: (taskId: number, updates: UpdateTaskRequest) => Promise<void>;
  onDelete: (taskId: number, version: number) => Promise<void>;
  onClose: () => void;
  onClearConflict?: () => void;
}

export function useTaskDrawerForm({
  task,
  conflictActorName,
  onSave,
  onDelete,
  onClose,
  onClearConflict,
}: UseTaskDrawerFormOptions) {
  const currentTaskIdRef = useRef<number | null>(null);
  const displayedVersionRef = useRef<number>(task?.version ?? 1);

  const [displayedVersion, setDisplayedVersion] = useState<number>(() => task?.version ?? 1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimateHours, setEstimateHours] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [columnId, setColumnId] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictBanner, setConflictBanner] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const updateDisplayedVersion = (ver: number) => {
    displayedVersionRef.current = ver;
    setDisplayedVersion(ver);
  };

  useEffect(() => {
    if (!task) return;
    if (currentTaskIdRef.current !== task.id) {
      currentTaskIdRef.current = task.id;
      setTitle(task.title);
      setDescription(task.description || '');
      setEstimateHours(task.estimateHours != null ? String(task.estimateHours) : '');
      setPriority(task.priority);
      setAssigneeId(task.assigneeId ? String(task.assigneeId) : '');
      setColumnId(task.columnId);
      updateDisplayedVersion(task.version);
      setErrorMessage(null);
      setConflictBanner(null);
      setIsConfirmingDelete(false);
    }
  }, [task]);

  const performSave = async () => {
    if (!task) return;
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
      version: displayedVersionRef.current,
      title: trimmedTitle,
      description,
      estimateHours: parsedEstimate,
      priority,
      assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
      ...(columnId !== task.columnId ? { move: { columnId, afterTaskId: null } } : {}),
    };

    setIsSubmitting(true);
    try {
      await onSave(task.id, updates);
      setConflictBanner(null);
      onClearConflict?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'TASK_VERSION_CONFLICT') {
        if (err.details.currentTask) updateDisplayedVersion(err.details.currentTask.version);
        setConflictBanner(conflictActorName ? strings.conflict.banner(conflictActorName) : strings.conflict.bannerFallback);
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
    if (!task) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onDelete(task.id, displayedVersionRef.current);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'TASK_VERSION_CONFLICT') {
        if (err.details.currentTask) updateDisplayedVersion(err.details.currentTask.version);
        setConflictBanner(conflictActorName ? strings.conflict.banner(conflictActorName) : strings.conflict.bannerFallback);
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

  return {
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
  };
}
