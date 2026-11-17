import React, { useEffect, useRef } from 'react';
import { ExternalLink, Copy, Link, LogOut } from 'lucide-react';
import type { BoardSummary } from '../../api/types';

export interface BoardContextMenuProps {
  board: BoardSummary;
  x: number;
  y: number;
  onClose: () => void;
  onOpen: (board: BoardSummary) => void;
  onCopyInvite: (code?: string) => void;
  onCopyLink: (boardId: number) => void;
  onLeave: (board: BoardSummary) => void;
}

export const BoardContextMenu: React.FC<BoardContextMenuProps> = ({
  board,
  x,
  y,
  onClose,
  onOpen,
  onCopyInvite,
  onCopyLink,
  onLeave,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Attach after current event dispatch to avoid immediate dismissal
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Viewport boundary adjustments
  const menuWidth = 200;
  const menuHeight = 160;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 12);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 12);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Options for ${board.name}`}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-52 bg-surface-raised border border-rule rounded-md shadow-floating p-1.5 flex flex-col text-[13px] text-ink animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      <div className="px-2 py-1 text-[11px] font-semibold text-ink-muted border-b border-rule mb-1 truncate">
        {board.name}
      </div>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onOpen(board);
          onClose();
        }}
        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-canvas text-left transition-colors duration-fast focus-visible:outline-none focus-visible:bg-surface-canvas"
      >
        <ExternalLink size={14} className="text-ink-muted" />
        <span>Open board</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onCopyInvite(board.inviteCode);
          onClose();
        }}
        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-canvas text-left transition-colors duration-fast focus-visible:outline-none focus-visible:bg-surface-canvas"
      >
        <Copy size={14} className="text-ink-muted" />
        <span>Copy invite code</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onCopyLink(board.id);
          onClose();
        }}
        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-canvas text-left transition-colors duration-fast focus-visible:outline-none focus-visible:bg-surface-canvas"
      >
        <Link size={14} className="text-ink-muted" />
        <span>Copy board link</span>
      </button>

      <div className="my-1 border-t border-rule" />

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onLeave(board);
          onClose();
        }}
        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-danger/10 text-danger text-left transition-colors duration-fast focus-visible:outline-none focus-visible:bg-danger/10"
      >
        <LogOut size={14} />
        <span>{board.role === 'OWNER' ? 'Board settings' : 'Leave board'}</span>
      </button>
    </div>
  );
};
