export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const first = parts[0];
  if (!first) {
    return '?';
  }
  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }
  const last = parts[parts.length - 1];
  const lastChar = last ? last[0] : '';
  return ((first[0] ?? '') + (lastChar ?? '')).toUpperCase();
}
