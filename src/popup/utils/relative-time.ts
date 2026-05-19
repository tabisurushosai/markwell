import { t } from '../../shared/utils/i18n.js';

export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const diffMs = Math.max(0, now - timestamp);
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) {
    return t('popup_relative_just_now');
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return t('popup_relative_minutes', [String(minutes)]);
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t('popup_relative_hours', [String(hours)]);
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return t('popup_relative_days', [String(days)]);
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return t('popup_relative_weeks', [String(weeks)]);
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return t('popup_relative_months', [String(months)]);
  }

  const years = Math.floor(days / 365);
  return t('popup_relative_years', [String(years)]);
}
