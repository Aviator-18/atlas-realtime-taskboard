import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  User,
  X,
  Copy,
  Settings,
  LayoutGrid,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  category: 'Actions' | 'Filters' | 'Navigation';
  onSelect: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: () => void;
  onFilterPriority: (priority: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW') => void;
  onFilterAssignee: (assignee: 'ALL' | number | 'UNASSIGNED') => void;
  onClearFilters: () => void;
  onCopyInviteCode: () => void;
  onOpenSettings?: () => void;
  onNavigateBoards: () => void;
  currentUserId?: number;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onCreateTask,
  onFilterPriority,
  onFilterAssignee,
  onClearFilters,
  onCopyInviteCode,
  onOpenSettings,
  onNavigateBoards,
  currentUserId,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      {
        id: 'action-create-task',
        title: 'Create new task',
        subtitle: 'Open task creation dialog',
        icon: <Plus size={16} strokeWidth={1.5} />,
        category: 'Actions',
        onSelect: () => {
          onClose();
          onCreateTask();
        },
      },
      {
        id: 'action-copy-invite',
        title: 'Copy board invite code',
        subtitle: 'Copy 8-character invite code to clipboard',
        icon: <Copy size={16} strokeWidth={1.5} />,
        category: 'Actions',
        onSelect: () => {
          onClose();
          onCopyInviteCode();
        },
      },
    ];

    if (onOpenSettings) {
      items.push({
        id: 'action-open-settings',
        title: 'Board settings',
        subtitle: 'Manage members, rename or leave board',
        icon: <Settings size={16} strokeWidth={1.5} />,
        category: 'Actions',
        onSelect: () => {
          onClose();
          onOpenSettings();
        },
      });
    }

    // Filter commands
    items.push(
      {
        id: 'filter-high',
        title: 'Filter: High priority',
        subtitle: 'Show only high priority tasks',
        icon: <Filter size={16} strokeWidth={1.5} className="text-priority-high-ink" />,
        category: 'Filters',
        onSelect: () => {
          onClose();
          onFilterPriority('HIGH');
        },
      },
      {
        id: 'filter-medium',
        title: 'Filter: Medium priority',
        subtitle: 'Show only medium priority tasks',
        icon: <Filter size={16} strokeWidth={1.5} className="text-priority-medium-ink" />,
        category: 'Filters',
        onSelect: () => {
          onClose();
          onFilterPriority('MEDIUM');
        },
      },
      {
        id: 'filter-low',
        title: 'Filter: Low priority',
        subtitle: 'Show only low priority tasks',
        icon: <Filter size={16} strokeWidth={1.5} className="text-priority-low-ink" />,
        category: 'Filters',
        onSelect: () => {
          onClose();
          onFilterPriority('LOW');
        },
      },
    );

    if (currentUserId) {
      items.push({
        id: 'filter-assigned-me',
        title: 'Filter: Assigned to me',
        subtitle: 'Show tasks assigned to your account',
        icon: <User size={16} strokeWidth={1.5} />,
        category: 'Filters',
        onSelect: () => {
          onClose();
          onFilterAssignee(currentUserId);
        },
      });
    }

    items.push({
      id: 'filter-clear-all',
      title: 'Clear all filters',
      subtitle: 'Reset search and priority filters',
      icon: <X size={16} strokeWidth={1.5} />,
      category: 'Filters',
      onSelect: () => {
        onClose();
        onClearFilters();
      },
    });

    // Navigation
    items.push({
      id: 'nav-boards',
      title: 'Go to all boards',
      subtitle: 'Back to boards overview list',
      icon: <LayoutGrid size={16} strokeWidth={1.5} />,
      category: 'Navigation',
      onSelect: () => {
        onClose();
        onNavigateBoards();
      },
    });

    return items;
  }, [
    onCreateTask,
    onCopyInviteCode,
    onOpenSettings,
    onFilterPriority,
    onFilterAssignee,
    onClearFilters,
    onNavigateBoards,
    currentUserId,
    onClose,
  ]);

  const filteredCommands = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q),
    );
  }, [commands, search]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredCommands.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCommands.length - 1,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-ink/20 backdrop-blur-[1px] animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-surface-raised border border-rule-strong rounded-lg shadow-xl overflow-hidden flex flex-col text-ink animate-slide-in">
        {/* Search header */}
        <div className="flex items-center px-3.5 py-2.5 border-b border-rule gap-2.5 bg-surface-raised">
          <Search size={16} strokeWidth={1.5} className="text-ink-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            aria-label="Command search"
            className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink-muted/70 outline-none border-0 p-0 focus:ring-0"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[11px] font-mono text-ink-muted bg-surface-canvas border border-rule rounded">
            Esc
          </kbd>
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          role="listbox"
          className="max-h-72 overflow-y-auto p-1.5 divide-y divide-rule/30"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-ink-muted">
              No matching commands
            </div>
          ) : (
            filteredCommands.map((command, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={command.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => command.onSelect()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors duration-fast ${
                    isSelected
                      ? 'bg-surface-canvas text-ink'
                      : 'text-ink-muted hover:bg-surface-canvas/60 hover:text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-ink flex-shrink-0">{command.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium text-ink">
                        {command.title}
                      </span>
                      {command.subtitle && (
                        <span className="text-[11.5px] text-ink-muted">
                          {command.subtitle}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-ink-muted bg-surface-canvas px-1.5 py-0.5 rounded border border-rule/60">
                    {command.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-3 py-2 bg-surface-canvas/50 border-t border-rule flex items-center justify-between text-[11px] text-ink-muted">
          <span>Navigate with &uarr; &darr;</span>
          <span>Select with Enter</span>
        </div>
      </div>
    </div>
  );
};
