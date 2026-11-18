import React, { useMemo, useState } from 'react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { boardsApi } from '../../api/client';
import { useRouter } from '../../router/routerContext';
import { useAuth } from '../auth/authContextDef';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { BoardColumnView } from './BoardColumnView';
import { BoardSkeleton } from './BoardSkeleton';
import { BoardHeader } from './BoardHeader';
import { SprintProgressBar } from './SprintProgressBar';
import { BoardFilterBar } from './BoardFilterBar';
import { TaskCardView } from './TaskCardView';
import { TaskDrawer } from '../task/TaskDrawer';
import { CreateTaskDialog } from '../task/CreateTaskDialog';
import { BoardSettingsDialog } from './BoardSettingsDialog';
import { CommandPalette } from './CommandPalette';
import { useBoardDnd } from './useBoardDnd';
import { useBoardSocket } from '../realtime/useBoardSocket';
import { useBoardConflictState } from './useBoardConflictState';
import { useBoardTaskMutations } from './useBoardTaskMutations';
import { strings } from '../../strings';
import type { BoardDetail } from '../../api/types';

export interface BoardPageProps {
  boardId: number;
}

export const BoardPage: React.FC<BoardPageProps> = ({ boardId }) => {
  const { navigate } = useRouter();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [createColumnId, setCreateColumnId] = useState<number>(1);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | 'ALL' | 'UNASSIGNED'>('ALL');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const { data: board, isLoading, isError, refetch } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardsApi.get(boardId),
  });

  const {
    cuesByTaskId,
    liveAnnouncement,
    conflictsByTaskId,
    pendingAttemptedUpdates,
    deletedTaskBanners,
    lastActorRef,
    handleDismissConflict,
    handleBoardEvent,
    recordConflict,
    recordPendingUpdate,
  } = useBoardConflictState({
    board,
    currentUser,
    onClearSelectedTaskId: () => setSelectedTaskId(null),
  });

  const { status: socketStatus } = useBoardSocket(boardId, {
    onBoardEvent: handleBoardEvent,
  });

  const { handleDndConflict, handleSaveTask, handleDeleteTask, handleCreateTask } =
    useBoardTaskMutations({
      boardId, board, lastActorRef, pendingAttemptedUpdates, setActionError,
      recordConflict, recordPendingUpdate, handleDismissConflict, setSelectedTaskId,
    });

  const {
    sensors, activeTask, overDropId, conflictTaskIds, announcements,
    handleDragStart, handleDragOver, handleDragEnd, handleDragCancel,
  } = useBoardDnd({
    boardId, board,
    onError: (msg) => setActionError(msg),
    onConflict: handleDndConflict,
  });

  const selectedTask = useMemo(() => {
    if (!board || selectedTaskId === null) return null;
    return board.columns.flatMap((c) => c.tasks).find((t) => t.id === selectedTaskId) ?? null;
  }, [board, selectedTaskId]);

  const currentUserRole = useMemo(() => {
    if (!board || !currentUser) return 'MEMBER';
    const member = board.members.find((m) => m.id === currentUser.id);
    return member?.role ?? 'MEMBER';
  }, [board, currentUser]);

  const isFiltered = useMemo(() => {
    return (
      searchQuery.trim().length > 0 ||
      selectedPriority !== 'ALL' ||
      selectedAssigneeId !== 'ALL'
    );
  }, [searchQuery, selectedPriority, selectedAssigneeId]);

  const { totalTasks, matchingTasks, displayColumns } = useMemo(() => {
    if (!board) {
      return { totalTasks: 0, matchingTasks: 0, displayColumns: [] };
    }

    const allTasks = board.columns.flatMap((c) => c.tasks);
    const total = allTasks.length;

    if (!isFiltered) {
      return {
        totalTasks: total,
        matchingTasks: total,
        displayColumns: board.columns,
      };
    }

    const query = searchQuery.trim().toLowerCase();

    let matchCount = 0;
    const filteredCols = board.columns.map((column) => {
      const tasks = column.tasks.filter((task) => {
        if (query) {
          const titleMatch = task.title.toLowerCase().includes(query);
          const descMatch = task.description
            ? task.description.toLowerCase().includes(query)
            : false;
          if (!titleMatch && !descMatch) return false;
        }

        if (selectedPriority !== 'ALL' && task.priority !== selectedPriority) {
          return false;
        }

        if (selectedAssigneeId === 'UNASSIGNED') {
          if (task.assigneeId !== null) return false;
        } else if (selectedAssigneeId !== 'ALL') {
          if (task.assigneeId !== selectedAssigneeId) return false;
        }

        return true;
      });

      matchCount += tasks.length;
      return {
        ...column,
        tasks,
      };
    });

    return {
      totalTasks: total,
      matchingTasks: matchCount,
      displayColumns: filteredCols,
    };
  }, [board, isFiltered, searchQuery, selectedPriority, selectedAssigneeId]);

  const handleClearFilters = React.useCallback(() => {
    setSearchQuery('');
    setSelectedPriority('ALL');
    setSelectedAssigneeId('ALL');
  }, []);

  const handleCopyInviteCode = async () => {
    if (!board) return;
    try {
      await navigator.clipboard.writeText(board.inviteCode);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        const target = e.target as HTMLElement | null;
        const isEditing =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target?.isContentEditable;

        if (!isEditing && selectedTaskId === null && !isCreateOpen && !isSettingsOpen && !isCommandPaletteOpen) {
          e.preventDefault();
          navigate('/boards');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, selectedTaskId, isCreateOpen, isSettingsOpen, isCommandPaletteOpen]);

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col text-ink">
      <BoardHeader
        board={board}
        copiedInvite={copiedInvite}
        socketStatus={socketStatus}
        onNavigateBoards={() => navigate('/boards')}
        onCopyInviteCode={handleCopyInviteCode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {board && board.columns && (
        <SprintProgressBar columns={board.columns} />
      )}

      {board && (
        <BoardFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedPriority={selectedPriority}
          onPriorityChange={setSelectedPriority}
          selectedAssigneeId={selectedAssigneeId}
          onAssigneeChange={setSelectedAssigneeId}
          members={board.members}
          currentUserId={currentUser?.id}
          totalTasks={totalTasks}
          matchingTasks={matchingTasks}
          onClearFilters={handleClearFilters}
        />
      )}

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-cue-announcements">
        {liveAnnouncement}
      </div>

      {actionError && (
        <div className="p-4 pb-0 max-w-4xl">
          <Banner message={actionError} variant="error" onDismiss={() => setActionError(null)} />
        </div>
      )}

      <main
        className={`flex-1 flex overflow-hidden relative ${
          isSettingsOpen || isCreateOpen ? 'pointer-events-none select-none' : ''
        }`}
        aria-hidden={isSettingsOpen || isCreateOpen}
      >
        {isLoading ? (
          <BoardSkeleton />
        ) : isError || !board ? (
          <div className="p-8 flex flex-col items-start gap-4">
            <Banner message={strings.errors.loadFailed} variant="error" onRetry={() => refetch()} />
            <Button variant="secondary" onClick={() => navigate('/boards')}>
              {strings.boardView.backToBoards}
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            accessibility={{ announcements }}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="flex-1 overflow-x-auto p-4 flex gap-3 items-start">
              {displayColumns.map((column) => (
                <BoardColumnView
                  key={column.id}
                  column={column}
                  members={board.members}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={(task) => setSelectedTaskId(task.id)}
                  onAddTask={(colId) => { setCreateColumnId(colId); setIsCreateOpen(true); }}
                  activeDragId={activeTask ? `task-${activeTask.id}` : null}
                  overDropId={overDropId}
                  conflictTaskIds={conflictTaskIds}
                  cuesByTaskId={cuesByTaskId}
                  conflictsByTaskId={conflictsByTaskId}
                  deletedTaskBanners={deletedTaskBanners}
                  isFiltered={isFiltered}
                  onClearFilters={handleClearFilters}
                  onQuickCreateTask={(req) => handleCreateTask(req)}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTask ? (
                <div className="w-[276px]">
                  <TaskCardView task={activeTask} members={board.members} isSelected={activeTask.id === selectedTaskId} isOverlay />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {board && selectedTask && (
          <TaskDrawer
            task={selectedTask}
            columns={board.columns}
            members={board.members}
            conflictActorName={lastActorRef.current.get(selectedTask.id)}
            onClearConflict={() => handleDismissConflict(selectedTask.id)}
            onClose={() => setSelectedTaskId(null)}
            onSave={handleSaveTask}
            onDelete={handleDeleteTask}
          />
        )}
      </main>

      {board && (
        <CreateTaskDialog
          isOpen={isCreateOpen}
          boardId={board.id}
          defaultColumnId={createColumnId}
          columns={board.columns}
          members={board.members}
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleCreateTask}
        />
      )}

      {board && (
        <BoardSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          board={{
            id: board.id,
            name: board.name,
            inviteCode: board.inviteCode,
            inviteCodeExpiresAt: board.inviteCodeExpiresAt,
            role: currentUserRole,
          }}
          members={board.members}
          onBoardDeleted={() => navigate('/boards')}
          onBoardLeft={() => navigate('/boards')}
          onMemberRemoved={(removedId) => {
            queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
              if (!old) return old;
              return {
                ...old,
                members: old.members.filter((m) => m.id !== removedId),
                columns: old.columns.map((c) => ({
                  ...c,
                  tasks: c.tasks.map((t) =>
                    t.assigneeId === removedId ? { ...t, assigneeId: null } : t,
                  ),
                })),
              };
            });
          }}
          onInviteRegenerated={(newCode, expiresAt) => {
            queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
              if (!old) return old;
              return {
                ...old,
                inviteCode: newCode,
                inviteCodeExpiresAt: expiresAt,
              };
            });
          }}
        />
      )}

      {board && (
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onCreateTask={() => {
            setCreateColumnId(board.columns[0]?.id ?? 1);
            setIsCreateOpen(true);
          }}
          onFilterPriority={(p) => setSelectedPriority(p)}
          onFilterAssignee={(a) => setSelectedAssigneeId(a)}
          onClearFilters={handleClearFilters}
          onCopyInviteCode={handleCopyInviteCode}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onNavigateBoards={() => navigate('/boards')}
          currentUserId={currentUser?.id}
        />
      )}
    </div>
  );
};
