import React from 'react';
import { Button } from './Button';
import { strings } from '../strings';

export interface BannerProps {
  message: string;
  variant?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const Banner: React.FC<BannerProps> = ({
  message,
  variant = 'error',
  onRetry,
  onDismiss,
  className = '',
}) => {
  let styleClasses = 'bg-priority-high-wash border-danger text-priority-high-ink';
  if (variant === 'warning') {
    styleClasses = 'bg-warning-wash border-rule-strong text-ink';
  } else if (variant === 'info') {
    styleClasses = 'bg-surface-lane border-rule text-ink';
  }

  return (
    <div
      role="alert"
      className={`flex items-center justify-between gap-3 p-3 text-[12.5px] leading-[18px] border rounded-sm ${styleClasses} ${className}`}
    >
      <span className="flex-1">{message}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onRetry && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            {strings.errors.tryAgain}
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="secondary" onClick={onDismiss}>
            {strings.errors.dismiss}
          </Button>
        )}
      </div>
    </div>
  );
};
