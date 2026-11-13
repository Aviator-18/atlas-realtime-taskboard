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
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      <span>{config.text}</span>
    </div>
  );
};
