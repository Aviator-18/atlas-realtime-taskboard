import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { boardsApi } from '../../api/client';
import { useAuth } from '../auth/authContextDef';
import { useRouter } from '../../router/routerContext';
import { Button } from '../../components/Button';
import { Banner } from '../../components/Banner';
import { Avatar } from '../../components/Avatar';
import { CreateBoardDialog } from './CreateBoardDialog';
import { JoinBoardDialog } from './JoinBoardDialog';
import { strings } from '../../strings';
import type { BoardSummary } from '../../api/types';

export const BoardsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { navigate } = useRouter();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const {
    data: boards,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['boards'],
    queryFn: boardsApi.list,
  });

  const handleBoardJoinedOrCreated = (board: BoardSummary) => {
    queryClient.invalidateQueries({ queryKey: ['boards'] });
    navigate(`/boards/${board.id}`);
  };

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col text-ink">
      {/* Top bar, 48 px, --surface-raised, bottom rule */}
      <header className="h-12 bg-surface-raised border-b border-rule px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-[14px] leading-5 font-semibold text-ink">
            {strings.app.name}
          </span>
          <span className="text-[14px] leading-5 text-ink-muted">
            {strings.boards.title}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {user && <Avatar name={user.displayName} />}
          <Button size="sm" variant="secondary" onClick={logout}>
            {strings.auth.signOut}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6 max-w-4xl w-full mx-auto">
        {isError && (
          <Banner
            message={strings.errors.loadFailed}
            variant="error"
            onRetry={() => refetch()}
            className="mb-6"
          />
        )}

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="h-14 bg-surface-lane rounded-sm animate-pulse" />
            <div className="h-14 bg-surface-lane rounded-sm animate-pulse" />
            <div className="h-14 bg-surface-lane rounded-sm animate-pulse" />
          </div>
        ) : !boards || boards.length === 0 ? (
          /* Empty state */
          <div className="py-12 flex flex-col items-start gap-4">
            <p className="text-[14px] leading-5 text-ink">
              {strings.boards.emptyMessage}
            </p>
            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
                {strings.boards.createBoard}
              </Button>
              <Button variant="secondary" onClick={() => setIsJoinOpen(true)}>
                {strings.boards.joinBoard}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-rule">
              <h1 className="text-[18px] leading-[26px] font-semibold text-ink">
                {strings.boards.title}
              </h1>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setIsJoinOpen(true)}>
                  {strings.boards.joinBoard}
                </Button>
                <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
                  {strings.boards.createBoard}
                </Button>
              </div>
            </div>

            <div className="bg-surface-raised border border-rule rounded-sm divide-y divide-rule">
              {boards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => navigate(`/boards/${board.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/boards/${board.id}`);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  className="p-4 flex items-center justify-between hover:bg-surface-canvas/50 transition-colors duration-fast cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[14px] leading-5 font-medium text-ink">
                      {board.name}
                    </span>
                    <span className="text-[12.5px] leading-[18px] text-ink-muted">
                      {board.role === 'OWNER' ? 'Owner' : 'Member'}
                    </span>
                  </div>
                  <span className="text-[12.5px] leading-[18px] text-ink-muted tabular-nums">
                    {board.memberCount}{' '}
                    {board.memberCount === 1
                      ? strings.boards.memberSingular
                      : strings.boards.memberPlural}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <CreateBoardDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleBoardJoinedOrCreated}
      />
      <JoinBoardDialog
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onSuccess={handleBoardJoinedOrCreated}
      />
    </div>
  );
};
