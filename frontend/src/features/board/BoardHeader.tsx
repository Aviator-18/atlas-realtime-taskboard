import React from 'react';
import { Settings, Search } from 'lucide-react';
import type { BoardDetail } from '../../api/types';
import type { SocketConnectionState } from '../../api/socket';
import { Button } from '../../components/Button';
import { ConnectionIndicator } from './ConnectionIndicator';
import { MemberDropdown } from './MemberDropdown';
import { strings } from '../../strings';

export interface BoardHeaderProps {
  board: BoardDetail | undefined;
  copiedInvite: boolean;
  socketStatus: SocketConnectionState;
  onNavigateBoards: () => void;
  onCopyInviteCode: () => void;
  onOpenSettings?: () => void;
  onOpenCommandPalette?: () => void;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  board,
  copiedInvite,
  socketStatus,
  onNavigateBoards,
  onCopyInviteCode,
  onOpenSettings,
  onOpenCommandPalette,
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
        {board && board.members && board.members.length > 0 && (
          <MemberDropdown members={board.members} />
        )}

        {board && onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            aria-label="Open command palette (Ctrl K)"
            title="Command palette (Ctrl K)"
            className="hidden sm:flex items-center gap-1.5 h-7 px-2 text-[12px] text-ink-muted hover:text-ink bg-surface-canvas hover:bg-surface-lane border border-rule rounded-sm transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Search size={13} strokeWidth={1.5} />
            <span>Commands</span>
            <kbd className="font-mono text-[10px] bg-surface-raised px-1 py-0.5 rounded border border-rule">
              Ctrl K
            </kbd>
          </button>
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

        {board && onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Board settings"
            title="Board settings"
            className="p-1.5 rounded-sm text-ink-muted hover:text-ink hover:bg-surface-canvas transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Settings size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </header>
  );
};
