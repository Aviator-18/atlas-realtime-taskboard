import React, { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { strings } from '../../strings';
import { boardsApi, ApiError } from '../../api/client';
import type { BoardSummary } from '../../api/types';

export interface CreateBoardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (board: BoardSummary) => void;
}

export const CreateBoardDialog: React.FC<CreateBoardDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      const board = await boardsApi.create({ name: trimmed });
      setName('');
      onSuccess(board);
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

  const handleClose = () => {
    if (!isSubmitting) {
      setErrorMessage(null);
      setName('');
      onClose();
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title={strings.boards.createBoard}>
      {errorMessage && (
        <Banner
          message={errorMessage}
          variant="error"
          onDismiss={() => setErrorMessage(null)}
          className="mb-4"
        />
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label={strings.boards.boardNameLabel}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          autoFocus
        />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            {strings.task.cancel}
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? strings.boards.creating : strings.boards.createAction}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
