import React, { useState } from 'react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { boardsApi, tasksApi } from '../../api/client';
import { useRouter } from '../../router/routerContext';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { BoardColumnView } from './BoardColumnView';
import { BoardSkeleton } from './BoardSkeleton';
import { TaskCardView } from './TaskCardView';
import { TaskDrawer } from '../task/TaskDrawer';
import { CreateTaskDialog } from '../task/CreateTaskDialog';
import { useBoardDnd } from './useBoardDnd';
import { useBoardSocket } from '../realtime/useBoardSocket';
import { ConnectionIndicator } from './ConnectionIndicator';
import { strings } from '../../strings';
import type { BoardDetail, CreateTaskRequest, UpdateTaskRequest } from '../../api/types';

export interface BoardPageProps {
  boardId: number;
}

export const BoardPage: React.FC<BoardPageProps> = ({ boardId }) => {
  const { navigate } = useRouter();
  const queryClient = useQueryClient();

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createColumnId, setCreateColumnId] = useState<number>(1);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { status: socketStatus } = useBoardSocket(boardId);

  const {
    data: board,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardsApi.get(boardId),
  });

  const {
    sensors,
    activeTask,
    overDropId,
    conflictTaskIds,
    announcements,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useBoardDnd({
    boardId,
    board,
    onError: (msg) => setActionError(msg),
  });

  const selectedTask = React.useMemo(() => {
    if (!board || selectedTaskId === null) return null;
    for (const col of board.columns) {
      const found = col.tasks.find((t) => t.id === selectedTaskId);
      if (found) return found;
    }
    return null;
  }, [board, selectedTaskId]);

  const handleCopyInviteCode = async () => {
    if (!board) return;
    try {
      await navigator.clipboard.writeText(board.inviteCode);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      // Fallback if clipboard API is blocked
    }
  };

  const handleAddTask = (columnId: number) => {
    setCreateColumnId(columnId);
    setIsCreateOpen(true);
  };

  const handleCreateTask = async (request: CreateTaskRequest) => {
    setActionError(null);
    const createdTask = await tasksApi.create(boardId, request);

    queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
      if (!old) return old;
      return {
        ...old,
        columns: old.columns.map((col) => {
          if (col.id === createdTask.columnId) {
            return {
              ...col,
              tasks: [...col.tasks, createdTask],
            };
          }
          return col;
        }),
      };
    });
  };

  const handleSaveTask = async (taskId: number, updates: UpdateTaskRequest) => {
    setActionError(null);
    const updatedTask = await tasksApi.update(taskId, updates);

    queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
      if (!old) return old;
      return {
        ...old,
        columns: old.columns.map((col) => {
          const filteredTasks = col.tasks.filter((t) => t.id !== taskId);
          if (col.id === updatedTask.columnId) {
            const newTasks = [...filteredTasks, updatedTask].sort(
              (a, b) => a.position - b.position,
            );
            return { ...col, tasks: newTasks };
          }
          return { ...col, tasks: filteredTasks };
        }),
      };
    });
  };

  const handleDeleteTask = async (taskId: number, version: number) => {
    setActionError(null);
    await tasksApi.delete(taskId, version);

    queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
      if (!old) return old;
      return {
        ...old,
        columns: old.columns.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        })),
      };
    });
    setSelectedTaskId(null);
  };

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col text-ink">
      {/* Top bar, 48 px, --surface-raised, bottom rule */}
      <header className="h-12 bg-surface-raised border-b border-rule px-4 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/boards')}
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
              onClick={handleCopyInviteCode}
              title={`Invite code: ${board.inviteCode}`}
            >
              {copiedInvite ? strings.boards.inviteCodeCopied : board.inviteCode}
            </Button>
          )}

          <ConnectionIndicator status={socketStatus} />
        </div>
      </header>

      {/* Action Error banner if any */}
      {actionError && (
        <div className="p-4 pb-0 max-w-4xl">
          <Banner
            message={actionError}
            variant="error"
            onDismiss={() => setActionError(null)}
          />
        </div>
      )}

      {/* Main Board Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {isLoading ? (
          <BoardSkeleton />
        ) : isError || !board ? (
          <div className="p-8 flex flex-col items-start gap-4">
            <Banner
              message={strings.errors.loadFailed}
              variant="error"
              onRetry={() => refetch()}
            />
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
                  onAddTask={handleAddTask}
                  activeDragId={activeTask ? `task-${activeTask.id}` : null}
                  overDropId={overDropId}
                  conflictTaskIds={conflictTaskIds}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTask ? (
                <div className="w-[276px]">
                  <TaskCardView
                    task={activeTask}
                    members={board.members}
                    isSelected={activeTask.id === selectedTaskId}
                    isOverlay
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Task Details Drawer */}
        {board && selectedTask && (
          <TaskDrawer
            task={selectedTask}
            columns={board.columns}
            members={board.members}
            onClose={() => setSelectedTaskId(null)}
            onSave={handleSaveTask}
            onDelete={handleDeleteTask}
          />
        )}
      </main>

      {/* Create Task Dialog */}
      {board && (
        <CreateTaskDialog
          isOpen={isCreateOpen}
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
