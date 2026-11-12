import React, { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { strings } from '../../strings';
import { boardsApi, ApiError } from '../../api/client';
import type { BoardSummary } from '../../api/types';

export interface JoinBoardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (board: BoardSummary) => void;
}

export const JoinBoardDialog: React.FC<JoinBoardDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmed = inviteCode.trim().toUpperCase();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      const board = await boardsApi.join({ inviteCode: trimmed });
      setInviteCode('');
      onSuccess(board);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_INVITE_CODE') {
        setErrorMessage(strings.boards.invalidInviteCode);
      } else if (err instanceof ApiError && err.details.detail) {
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
      setInviteCode('');
      onClose();
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title={strings.boards.joinBoard}>
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
          label={strings.boards.inviteCodeLabel}
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          required
          maxLength={8}
          placeholder="K7M2QX9R"
          autoFocus
        />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            {strings.task.cancel}
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || !inviteCode.trim()}>
            {isSubmitting ? strings.boards.joining : strings.boards.joinAction}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
