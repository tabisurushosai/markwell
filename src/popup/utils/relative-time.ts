export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const diffMs = Math.max(0, now - timestamp);
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) {
    return 'たった今';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${String(minutes)}分前`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${String(hours)}時間前`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${String(days)}日前`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return `${String(weeks)}週間前`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${String(months)}ヶ月前`;
  }

  const years = Math.floor(days / 365);
  return `${String(years)}年前`;
}
