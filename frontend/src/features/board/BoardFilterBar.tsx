import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import type { Member } from '../../api/types';
import { strings } from '../../strings';

export interface BoardFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedPriority: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';
  onPriorityChange: (priority: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW') => void;
  selectedAssigneeId: number | 'ALL' | 'UNASSIGNED';
  onAssigneeChange: (assignee: number | 'ALL' | 'UNASSIGNED') => void;
  members: Member[];
  currentUserId?: number;
  totalTasks: number;
  matchingTasks: number;
  onClearFilters: () => void;
}

export const BoardFilterBar: React.FC<BoardFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedPriority,
  onPriorityChange,
  selectedAssigneeId,
  onAssigneeChange,
  members,
  currentUserId,
  totalTasks,
  matchingTasks,
  onClearFilters,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isFiltered =
    searchQuery.trim().length > 0 ||
    selectedPriority !== 'ALL' ||
    selectedAssigneeId !== 'ALL';

  // Keyboard shortcut '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const target = e.target as HTMLElement | null;
        const isEditing =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target?.isContentEditable;

        if (!isEditing) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      data-testid="board-filter-bar"
      className="bg-surface-raised border-b border-rule px-4 py-2 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 z-10 text-[13px]"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search input */}
        <div className="relative flex items-center">
          <Search
            size={14}
            strokeWidth={1.5}
            className="absolute left-2.5 text-ink-muted pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (searchQuery) {
                  onSearchChange('');
                } else {
                  searchInputRef.current?.blur();
                }
              }
            }}
            placeholder={strings.filter.searchPlaceholder}
            aria-label="Search tasks"
            className="w-56 h-8 pl-8 pr-7 bg-surface-canvas border border-rule rounded-md text-[13px] text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-fast"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                searchInputRef.current?.focus();
              }}
              aria-label="Clear search text"
              className="absolute right-2 p-0.5 text-ink-muted hover:text-ink rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Priority Filter Pills */}
        <div
          role="group"
          aria-label="Filter by priority"
          className="flex items-center gap-1 bg-surface-canvas p-0.5 rounded-md border border-rule/80"
        >
          <button
            type="button"
            onClick={() => onPriorityChange('ALL')}
            className={`px-2 py-1 text-[12px] font-medium rounded-sm transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              selectedPriority === 'ALL'
                ? 'bg-surface-raised text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onPriorityChange(selectedPriority === 'HIGH' ? 'ALL' : 'HIGH')}
            className={`px-2 py-1 text-[12px] font-medium rounded-sm flex items-center gap-1.5 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              selectedPriority === 'HIGH'
                ? 'bg-surface-raised text-priority-high-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-priority-high-ink" />
            High priority
          </button>
          <button
            type="button"
            onClick={() => onPriorityChange(selectedPriority === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
            className={`px-2 py-1 text-[12px] font-medium rounded-sm flex items-center gap-1.5 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              selectedPriority === 'MEDIUM'
                ? 'bg-surface-raised text-priority-medium-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-priority-medium-ink" />
            Med priority
          </button>
          <button
            type="button"
            onClick={() => onPriorityChange(selectedPriority === 'LOW' ? 'ALL' : 'LOW')}
            className={`px-2 py-1 text-[12px] font-medium rounded-sm flex items-center gap-1.5 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              selectedPriority === 'LOW'
                ? 'bg-surface-raised text-priority-low-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-priority-low-ink" />
            Low priority
          </button>
        </div>

        {/* Assignee Filter Dropdown */}
        <div className="flex items-center">
          <select
            value={
              selectedAssigneeId === 'ALL'
                ? 'ALL'
                : selectedAssigneeId === 'UNASSIGNED'
                  ? 'UNASSIGNED'
                  : String(selectedAssigneeId)
            }
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'ALL') onAssigneeChange('ALL');
              else if (val === 'UNASSIGNED') onAssigneeChange('UNASSIGNED');
              else onAssigneeChange(Number(val));
            }}
            aria-label="Filter by assignee"
            className="h-8 px-2.5 bg-surface-canvas border border-rule rounded-md text-[12px] font-medium text-ink focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors duration-fast cursor-pointer"
          >
            <option value="ALL">{strings.filter.allAssignees}</option>
            {currentUserId && (
              <option value={String(currentUserId)}>
                {strings.filter.assignedToMe}
              </option>
            )}
            <option value="UNASSIGNED">{strings.filter.unassigned}</option>
            {members
              .filter((m) => m.id !== currentUserId)
              .map((member) => (
                <option key={member.id} value={String(member.id)}>
                  {member.displayName}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Active filter counter and clear button */}
      {isFiltered && (
        <div className="flex items-center gap-3 text-[12px]">
          <span className="text-ink-muted tabular-nums">
            {strings.filter.showingCount(matchingTasks, totalTasks)}
          </span>
          <button
            type="button"
            onClick={onClearFilters}
            data-testid="clear-filters-btn"
            className="flex items-center gap-1 font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
          >
            <X size={12} strokeWidth={2} />
            {strings.filter.clearFilters}
          </button>
        </div>
      )}
    </div>
  );
};
