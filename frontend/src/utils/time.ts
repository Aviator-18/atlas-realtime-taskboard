import { strings } from '../strings';

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSec < 60) return strings.task.justNow;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return strings.task.minutesAgo(diffMin);
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return strings.task.hoursAgo(diffHour);
  const diffDay = Math.floor(diffHour / 24);
  return strings.task.daysAgo(diffDay);
}

export function formatExpiryCountdown(dateStr: string): string {
  const expiry = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((expiry.getTime() - now.getTime()) / 1000);

  if (diffSec <= 0) return strings.boards.codeExpired;
  const diffHour = Math.floor(diffSec / 3600);
  if (diffHour < 24) {
    return strings.boards.expiresInHours(Math.max(1, diffHour));
  }
  const diffDay = Math.floor(diffHour / 24);
  return strings.boards.expiresIn(Math.max(1, diffDay));
}
