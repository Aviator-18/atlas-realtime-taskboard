import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Member } from '../../api/types';
import { Avatar } from '../../components/Avatar';

export interface MemberDropdownProps {
  members: Member[];
}

export const MemberDropdown: React.FC<MemberDropdownProps> = ({ members }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [hoveredMemberId, setHoveredMemberId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort members: OWNER first, then alphabetical by displayName
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role === 'OWNER' && b.role !== 'OWNER') return -1;
      if (a.role !== 'OWNER' && b.role === 'OWNER') return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [members]);

  const displayedMembers = showAll ? sortedMembers : sortedMembers.slice(0, 4);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const activeHoveredMember = useMemo(() => {
    if (hoveredMemberId === null) return null;
    return members.find((m) => m.id === hoveredMemberId) ?? null;
  }, [members, hoveredMemberId]);

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => {
        setIsOpen(false);
        setHoveredMemberId(null);
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Board members (${members.length})`}
        className="flex items-center -space-x-1 p-0.5 rounded-full hover:ring-2 hover:ring-accent/40 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {sortedMembers.slice(0, 4).map((member) => (
          <Avatar key={member.id} name={member.displayName} />
        ))}
        {members.length > 4 && (
          <span className="w-6 h-6 rounded-full bg-surface-lane border border-rule flex items-center justify-center text-[10px] font-semibold text-ink-muted">
            +{members.length - 4}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Board members list"
          className="absolute right-0 top-full mt-2 w-72 bg-surface-raised border border-rule rounded-md shadow-floating p-3 z-30 flex flex-col gap-2 transition-all duration-150 animate-in fade-in slide-in-from-top-1"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-rule text-[12px] text-ink-muted">
            <span className="font-semibold text-ink">Members</span>
            <span className="tabular-nums">{members.length} total</span>
          </div>

          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {displayedMembers.map((member) => (
              <div
                key={member.id}
                role="menuitem"
                tabIndex={0}
                onMouseEnter={() => setHoveredMemberId(member.id)}
                onFocus={() => setHoveredMemberId(member.id)}
                className={`p-1.5 rounded flex items-center justify-between gap-2 cursor-default transition-colors duration-fast ${
                  hoveredMemberId === member.id ? 'bg-surface-canvas' : 'hover:bg-surface-canvas/60'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Avatar name={member.displayName} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-medium text-ink truncate">
                      {member.displayName}
                    </span>
                    <span className="text-[11px] text-ink-muted truncate">
                      {member.role === 'OWNER' ? 'Board Administrator' : 'Project Collaborator'}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10.5px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
                    member.role === 'OWNER'
                      ? 'bg-accent/10 text-accent border border-accent/20'
                      : 'bg-surface-lane text-ink-muted'
                  }`}
                >
                  {member.role === 'OWNER' ? 'Owner' : 'Member'}
                </span>
              </div>
            ))}
          </div>

          {members.length > 4 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAll((prev) => !prev);
              }}
              className="text-[12px] font-medium text-accent hover:underline text-left pt-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
            >
              {showAll ? 'Show top 4 members' : `Show all ${members.length} members`}
            </button>
          )}

          {activeHoveredMember && (
            <div className="mt-1 p-2 bg-surface-canvas/80 border border-rule/80 rounded text-[11px] text-ink-muted flex flex-col gap-0.5">
              <span className="font-medium text-ink">{activeHoveredMember.displayName}</span>
              <span>Role: {activeHoveredMember.role === 'OWNER' ? 'Board Administrator' : 'Project Collaborator'}</span>
              <span>Permissions: {activeHoveredMember.role === 'OWNER' ? 'Full board management' : 'Create, edit and reorder tasks'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
