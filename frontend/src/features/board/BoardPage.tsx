import React, { useMemo, useState } from 'react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useQuery } from '@tanstack/react-query';
import { boardsApi } from '../../api/client';
import { useRouter } from '../../router/routerContext';
import { useAuth } from '../auth/authContextDef';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { BoardColumnView } from './BoardColumnView';
import { BoardSkeleton } from './BoardSkeleton';
import { BoardHeader } from './BoardHeader';
import { TaskCardView } from './TaskCardView';
import { TaskDrawer } from '../task/TaskDrawer';
import { CreateTaskDialog } from '../task/CreateTaskDialog';
import { useBoardDnd } from './useBoardDnd';
import { useBoardSocket } from '../realtime/useBoardSocket';
import { useBoardConflictState } from './useBoardConflictState';
import { useBoardTaskMutations } from './useBoardTaskMutations';
import { strings } from '../../strings';

export interface BoardPageProps {
  boardId: number;
}

export const BoardPage: React.FC<BoardPageProps> = ({ boardId }) => {
  const { navigate } = useRouter();
  const { user: currentUser } = useAuth();

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createColumnId, setCreateColumnId] = useState<number>(1);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col text-ink">
      <BoardHeader
        board={board}
        copiedInvite={copiedInvite}
        socketStatus={socketStatus}
        onNavigateBoards={() => navigate('/boards')}
        onCopyInviteCode={handleCopyInviteCode}
      />

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-cue-announcements">
        {liveAnnouncement}
      </div>

      {actionError && (
        <div className="p-4 pb-0 max-w-4xl">
          <Banner message={actionError} variant="error" onDismiss={() => setActionError(null)} />
        </div>
      )}

      <main className="flex-1 flex overflow-hidden relative">
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
              {board.columns.map((column) => (
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
    </div>
  );
};
