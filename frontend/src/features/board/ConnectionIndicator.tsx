import React from 'react';
import { strings } from '../../strings';
import type { SocketConnectionState } from '../../api/socket';

export interface ConnectionIndicatorProps {
  status: SocketConnectionState;
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({ status }) => {
  const config = {
    live: {
      text: strings.boardView.live,
      dotClass: 'bg-accent',
      textClass: 'text-accent',
    },
    reconnecting: {
      text: strings.boardView.reconnecting,
      dotClass: 'bg-priority-medium-ink',
      textClass: 'text-priority-medium-ink',
    },
    offline: {
      text: strings.boardView.offline,
      dotClass: 'bg-danger',
      textClass: 'text-danger',
    },
  }[status];

  return (
    <div
      className={`flex items-center gap-1.5 text-[12.5px] leading-[18px] select-none ${config.textClass}`}
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        {status === 'live' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dotClass}`} />
      </span>
      <span>{config.text}</span>
    </div>
  );
};
