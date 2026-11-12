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
