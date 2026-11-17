import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { boardsApi, ApiError } from '../../api/client';
import { strings } from '../../strings';

export interface BoardSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  board: {
    id: number;
    name: string;
    role?: 'OWNER' | 'MEMBER';
    inviteCode?: string;
  };
  onBoardDeleted?: () => void;
  onBoardLeft?: () => void;
}

export const BoardSettingsDialog: React.FC<BoardSettingsDialogProps> = ({
  isOpen,
  onClose,
  board,
  onBoardDeleted,
  onBoardLeft,
}) => {
  const [copied, setCopied] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOwner = board.role === 'OWNER';

  const handleCopyInvite = async () => {
    if (!board.inviteCode) return;
    try {
      await navigator.clipboard.writeText(board.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await boardsApi.delete(board.id);
      setIsConfirmingDelete(false);
      onClose();
      onBoardDeleted?.();
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

  const handleLeave = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await boardsApi.leave(board.id);
      setIsConfirmingLeave(false);
      onClose();
      onBoardLeft?.();
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

  const handleCloseDialog = React.useCallback(() => {
    if (!isSubmitting) {
      setIsConfirmingDelete(false);
      setIsConfirmingLeave(false);
      setErrorMessage(null);
      onClose();
    }
  }, [isSubmitting, onClose]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (isConfirmingDelete || isConfirmingLeave) {
          setIsConfirmingDelete(false);
          setIsConfirmingLeave(false);
        } else {
          handleCloseDialog();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isConfirmingDelete, isConfirmingLeave, handleCloseDialog]);

  return (
    <Dialog isOpen={isOpen} onClose={handleCloseDialog} title="Board settings">
      {errorMessage && (
        <Banner
          message={errorMessage}
          variant="error"
          onDismiss={() => setErrorMessage(null)}
          className="mb-4"
        />
      )}

      <div className="flex flex-col gap-5 text-[14px] leading-5">
        {/* Board overview */}
        <div className="flex flex-col gap-2">
          <label className="text-[12.5px] font-medium text-ink-muted">Board name</label>
          <div className="p-2.5 rounded-sm bg-surface-canvas border border-rule font-medium text-ink">
            {board.name}
          </div>
        </div>

        {/* Membership Role */}
        <div className="flex items-center justify-between py-1">
          <span className="text-[12.5px] font-medium text-ink-muted">Your role</span>
          <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium rounded-sm bg-surface-canvas border border-rule text-ink">
            {isOwner ? 'Owner' : 'Member'}
          </span>
        </div>

        {/* Invite code */}
        {board.inviteCode && (
          <div className="flex flex-col gap-1.5 pt-2 border-t border-rule">
            <label className="text-[12.5px] font-medium text-ink-muted">Invite code</label>
            <div className="flex items-center justify-between p-2.5 rounded-sm bg-surface-canvas border border-rule">
              <span className="font-semibold tracking-wider text-ink text-[13px]">
                {board.inviteCode}
              </span>
              <Button size="sm" variant="secondary" onClick={handleCopyInvite}>
                {copied ? (
                  <span className="flex items-center gap-1.5">
                    <Check size={13} strokeWidth={2} />
                    <span>Copied</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Copy size={13} strokeWidth={1.5} />
                    <span>Copy</span>
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div className="pt-4 border-t border-rule flex flex-col gap-3">
          <div className="text-[13px] font-semibold text-danger">Danger zone</div>

          {isOwner ? (
            <div className="flex flex-col gap-2 p-3 rounded-sm border border-danger/20 bg-priority-high-wash/20">
              <span className="text-[13px] font-medium text-ink">Delete this board</span>
              <p className="text-[12.5px] text-ink-muted leading-4">
                Permanently delete this board along with all tasks, columns, and history. This
                action cannot be undone.
              </p>

              {isConfirmingDelete ? (
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSubmitting}
                    onClick={handleDelete}
                  >
                    {isSubmitting ? 'Deleting...' : 'Yes, delete board'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={() => setIsConfirmingDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSubmitting}
                    onClick={() => setIsConfirmingDelete(true)}
                  >
                    Delete board
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-3 rounded-sm border border-rule bg-surface-canvas">
              <span className="text-[13px] font-medium text-ink">Leave this board</span>
              <p className="text-[12.5px] text-ink-muted leading-4">
                Leave this board. You will be unassigned from any tasks and will need an invite
                code to rejoin.
              </p>

              {isConfirmingLeave ? (
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSubmitting}
                    onClick={handleLeave}
                  >
                    {isSubmitting ? 'Leaving...' : 'Yes, leave board'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={() => setIsConfirmingLeave(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSubmitting}
                    onClick={() => setIsConfirmingLeave(true)}
                  >
                    Leave board
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
