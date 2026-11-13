import React from 'react';
import type { BoardDetail } from '../../api/types';
import type { SocketConnectionState } from '../../api/socket';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { ConnectionIndicator } from './ConnectionIndicator';
import { strings } from '../../strings';

export interface BoardHeaderProps {
  board: BoardDetail | undefined;
  copiedInvite: boolean;
  socketStatus: SocketConnectionState;
  onNavigateBoards: () => void;
  onCopyInviteCode: () => void;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  board,
  copiedInvite,
  socketStatus,
  onNavigateBoards,
  onCopyInviteCode,
}) => {
  return (
    <header className="h-12 bg-surface-raised border-b border-rule px-4 flex items-center justify-between flex-shrink-0 z-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onNavigateBoards}
          className="text-[14px] leading-5 font-semibold text-ink hover:text-accent transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
        >
          {strings.app.name}
        </button>
        <span className="text-[14px] text-ink-muted">/</span>
        <span className="text-[14px] leading-5 font-medium text-ink">
          {board ? board.name : ''}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {board && board.members && (
          <div className="flex items-center -space-x-1">
            {board.members.map((member) => (
              <Avatar key={member.id} name={member.displayName} />
            ))}
          </div>
        )}

        {board && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onCopyInviteCode}
            title={`Invite code: ${board.inviteCode}`}
          >
            {copiedInvite ? strings.boards.inviteCodeCopied : board.inviteCode}
          </Button>
        )}

        <ConnectionIndicator status={socketStatus} />
      </div>
    </header>
  );
};
