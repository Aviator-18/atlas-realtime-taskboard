import React from 'react';
import { strings } from '../../strings';

export interface TaskDrawerConflictBannerProps {
  bannerText: string;
  onApplyAgain: () => void;
  onDismiss: () => void;
}

export const TaskDrawerConflictBanner: React.FC<TaskDrawerConflictBannerProps> = ({
  bannerText,
  onApplyAgain,
  onDismiss,
}) => {
  return (
    <div
      data-testid="drawer-conflict-banner"
      className="p-3 bg-warning-wash border border-rule rounded-sm text-[12.5px] leading-[18px] text-ink flex flex-col gap-2"
    >
      <p className="font-medium text-ink">{bannerText}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onApplyAgain}
          className="px-2.5 py-1 text-[12px] leading-4 font-medium rounded-sm bg-accent text-white hover:bg-accent/90 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {strings.conflict.applyAgain}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-2.5 py-1 text-[12px] leading-4 font-medium rounded-sm bg-surface-raised border border-rule-strong text-ink hover:bg-surface-canvas transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {strings.conflict.dismiss}
        </button>
      </div>
    </div>
  );
};
