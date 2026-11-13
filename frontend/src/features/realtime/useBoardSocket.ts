import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectBoardSocket, type SocketConnectionState } from '../../api/socket';
import { getAuthToken } from '../../api/client';
import { applyBoardEvent } from './reconciliation';
import type { BoardDetail, BoardEvent } from '../../api/types';

export function useBoardSocket(boardId: number): { status: SocketConnectionState } {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SocketConnectionState>(() =>
    getAuthToken() ? 'live' : 'offline'
  );

  useEffect(() => {
    const token = getAuthToken();

    const handleEvent = (event: BoardEvent) => {
      queryClient.setQueryData<BoardDetail>(['board', boardId], (old) => {
        if (!old) return old;
        const result = applyBoardEvent(old, event);
        if (result.shouldReload) {
          queryClient.invalidateQueries({ queryKey: ['board', boardId] });
          return old;
        }
        return result.state;
      });
    };

    const handleReconnect = () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    };

    const socketHandle = connectBoardSocket(boardId, token, {
      onEvent: handleEvent,
      onStateChange: (newStatus) => setStatus(newStatus),
      onReconnect: handleReconnect,
    });

    return () => {
      socketHandle.disconnect();
    };
  }, [boardId, queryClient]);

  return { status };
}
