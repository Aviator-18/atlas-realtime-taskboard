import React, { useState } from 'react';
import { Copy, Check, RefreshCw, Clock, UserMinus } from 'lucide-react';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { Avatar } from '../../components/Avatar';
import { boardsApi, ApiError } from '../../api/client';
import { strings } from '../../strings';
import { formatExpiryCountdown } from '../../utils/time';
import type { Member } from '../../api/types';

export interface BoardSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  board: {
    id: number;
    name: string;
    role?: 'OWNER' | 'MEMBER';
    inviteCode?: string;
    inviteCodeExpiresAt?: string;
  };
  members?: Member[];
  onBoardDeleted?: () => void;
  onBoardLeft?: () => void;
  onMemberRemoved?: (memberId: number) => void;
  onInviteRegenerated?: (newCode: string, expiresAt: string) => void;
}

export const BoardSettingsDialog: React.FC<BoardSettingsDialogProps> = ({
  isOpen,
  onClose,
  board,
  members = [],
  onBoardDeleted,
  onBoardLeft,
  onMemberRemoved,
  onInviteRegenerated,
}) => {
  const [copied, setCopied] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);
  const [isConfirmingRegenerate, setIsConfirmingRegenerate] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
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

  const handleRegenerateInvite = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await boardsApi.regenerateInviteCode(board.id);
      setIsConfirmingRegenerate(false);
      onInviteRegenerated?.(res.inviteCode, res.inviteCodeExpiresAt);
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

  const handleRemoveMember = async (memberId: number) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await boardsApi.removeMember(board.id, memberId);
      setRemovingMemberId(null);
      onMemberRemoved?.(memberId);
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
      setIsConfirmingRegenerate(false);
      setRemovingMemberId(null);
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
        if (isConfirmingDelete || isConfirmingLeave || isConfirmingRegenerate || removingMemberId !== null) {
          setIsConfirmingDelete(false);
          setIsConfirmingLeave(false);
          setIsConfirmingRegenerate(false);
          setRemovingMemberId(null);
        } else {
          handleCloseDialog();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isConfirmingDelete, isConfirmingLeave, isConfirmingRegenerate, removingMemberId, handleCloseDialog]);

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

        {/* Members Management section */}
        {members.length > 0 && (
          <div className="flex flex-col gap-2 pt-3 border-t border-rule">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-medium text-ink-muted">
                {strings.boards.membersSectionTitle} ({members.length})
              </label>
            </div>

            <div
              data-testid="board-settings-member-list"
              className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1"
            >
              {members.map((member) => {
                const isMemberOwner = member.role === 'OWNER';
                const isConfirmingThisRemove = removingMemberId === member.id;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-md bg-surface-canvas border border-rule/70"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={member.displayName} className="w-6 h-6 text-[12px]" />
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-ink">
                          {member.displayName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] px-1.5 py-0.5 font-medium rounded-sm border ${
                          isMemberOwner
                            ? 'bg-accent/10 border-accent/30 text-accent'
                            : 'bg-surface-raised border-rule text-ink-muted'
                        }`}
                      >
                        {isMemberOwner ? 'Owner' : 'Member'}
                      </span>

                      {/* Remove button (Only owner can remove non-owner members) */}
                      {isOwner && !isMemberOwner && (
                        isConfirmingThisRemove ? (
                          <div className="flex items-center gap-1.5 animate-fade-in">
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={isSubmitting}
                              className="px-2 py-0.5 text-[11.5px] font-medium bg-danger text-white rounded-sm hover:bg-danger/90 transition-colors disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setRemovingMemberId(null)}
                              disabled={isSubmitting}
                              className="px-1.5 py-0.5 text-[11.5px] text-ink-muted hover:text-ink transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRemovingMemberId(member.id)}
                            aria-label={`Remove ${member.displayName}`}
                            title={`Remove ${member.displayName}`}
                            className="p-1 text-ink-muted hover:text-danger hover:bg-priority-high-wash/40 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-danger"
                          >
                            <UserMinus size={14} strokeWidth={1.5} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Invite code & Expiration */}
        {board.inviteCode && (
          <div className="flex flex-col gap-2 pt-3 border-t border-rule">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-medium text-ink-muted">
                {strings.boards.inviteSectionTitle}
              </label>
              {board.inviteCodeExpiresAt && (
                <span className="flex items-center gap-1 text-[11.5px] text-ink-muted tabular-nums">
                  <Clock size={12} strokeWidth={1.5} />
                  <span>{formatExpiryCountdown(board.inviteCodeExpiresAt)}</span>
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-sm bg-surface-canvas border border-rule">
              <span className="font-semibold tracking-wider text-ink text-[13px]">
                {board.inviteCode}
              </span>
              <div className="flex items-center gap-2">
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

                {isOwner && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsConfirmingRegenerate(true)}
                    disabled={isSubmitting || isConfirmingRegenerate}
                    title="Regenerate code to revoke previous access"
                  >
                    <span className="flex items-center gap-1.5">
                      <RefreshCw size={13} strokeWidth={1.5} />
                      <span>Regenerate</span>
                    </span>
                  </Button>
                )}
              </div>
            </div>

            {/* Confirm regenerate invite */}
            {isConfirmingRegenerate && (
              <div className="p-2.5 rounded-md bg-warning-wash/40 border border-rule flex flex-col gap-2 text-[12px] animate-fade-in">
                <span className="font-medium text-ink">
                  {strings.boards.regenerateConfirmTitle}
                </span>
                <p className="text-ink-muted text-[11.5px] leading-4">
                  {strings.boards.regenerateConfirmDesc}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={isSubmitting}
                    onClick={handleRegenerateInvite}
                  >
                    {isSubmitting ? strings.boards.regenerating : 'Yes, regenerate code'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={() => setIsConfirmingRegenerate(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
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
