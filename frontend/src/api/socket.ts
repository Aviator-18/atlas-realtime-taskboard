import { Client, type StompSubscription } from '@stomp/stompjs';
import type { BoardEvent } from './types';

export const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws';

export type SocketConnectionState = 'live' | 'reconnecting' | 'offline';

export interface BoardSocketCallbacks {
  onEvent: (event: BoardEvent) => void;
  onStateChange: (state: SocketConnectionState) => void;
  onReconnect: () => void;
}

export interface BoardSocketHandle {
  disconnect: () => void;
}

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 16000;
const BACKOFF_MULTIPLIER = 1.5;

export function connectBoardSocket(
  boardId: number,
  token: string | null,
  callbacks: BoardSocketCallbacks,
  brokerUrl: string = WS_URL
): BoardSocketHandle {
  if (!token) {
    callbacks.onStateChange('offline');
    return { disconnect: () => {} };
  }

  let isDeactivated = false;
  let hasConnectedOnce = false;
  let currentReconnectDelay = INITIAL_RECONNECT_DELAY_MS;
  let subscription: StompSubscription | null = null;

  const client = new Client({
    brokerURL: brokerUrl,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    reconnectDelay: INITIAL_RECONNECT_DELAY_MS,
    beforeConnect: () => {
      if (!isDeactivated && hasConnectedOnce) {
        callbacks.onStateChange('reconnecting');
      }
    },
    onConnect: () => {
      if (isDeactivated) {
        client.deactivate();
        return;
      }

      currentReconnectDelay = INITIAL_RECONNECT_DELAY_MS;
      client.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
      callbacks.onStateChange('live');

      if (hasConnectedOnce) {
        callbacks.onReconnect();
      }
      hasConnectedOnce = true;

      subscription = client.subscribe(`/topic/boards/${boardId}`, (message) => {
        try {
          const parsed = JSON.parse(message.body) as BoardEvent;
          callbacks.onEvent(parsed);
        } catch {
          // Ignore malformed message frames
        }
      });
    },
    onWebSocketClose: () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch {
          // Already closed
        }
        subscription = null;
      }

      if (!isDeactivated) {
        callbacks.onStateChange('reconnecting');
        currentReconnectDelay = Math.min(
          Math.round(currentReconnectDelay * BACKOFF_MULTIPLIER),
          MAX_RECONNECT_DELAY_MS
        );
        client.reconnectDelay = currentReconnectDelay;
      }
    },
    onStompError: () => {
      if (!isDeactivated) {
        callbacks.onStateChange('offline');
      }
    },
    onDisconnect: () => {
      if (!isDeactivated) {
        callbacks.onStateChange('offline');
      }
    },
  });

  client.activate();

  return {
    disconnect: () => {
      isDeactivated = true;
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch {
          // Ignored
        }
        subscription = null;
      }
      client.deactivate();
      callbacks.onStateChange('offline');
    },
  };
}
