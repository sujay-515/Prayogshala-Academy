import { hasRevealOnlyFields } from './cacheSanitizer';

export const USER_SCOPED_STORAGE_KEYS = [
  'prayogshala_auth_token_v1',
  'prayogshala_auth_token',
  'prayogshala_current_user_v1',
  'prayogshala_auth_user',
  'prayogshala_stats_v2',
  'prayogshala_stats_v1',
  'prayogshala_reports_v2',
  'prayogshala_reports_v1',
  'prayogshala_staged_questions_v1',
  'prayogshala_admin_subtab',
] as const;

export const PUBLIC_CACHE_KEYS = {
  QUESTIONS: 'prayogshala_questions_v2',
  CATEGORIES: 'prayogshala_categories_v2',
} as const;

/**
 * Removes all user- and admin-scoped data from client storage:
 * - Auth tokens & user profile
 * - User stats & bookmarks
 * - User submitted reports
 * - Admin staged draft questions & UI subtab
 *
 * Retains public caches (questions & categories) only if questions contain no reveal-only fields.
 */
export function clearUserScopedStorage(storage?: Storage): void {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return;

  // 1. Remove all user- and admin-scoped keys
  for (const key of USER_SCOPED_STORAGE_KEYS) {
    try {
      store.removeItem(key);
    } catch {
      // Ignore storage access errors
    }
  }

  // 2. Validate and preserve public questions cache only if it has no reveal-only fields
  try {
    const cachedQuestions = store.getItem(PUBLIC_CACHE_KEYS.QUESTIONS);
    if (cachedQuestions) {
      const parsed = JSON.parse(cachedQuestions);
      if (Array.isArray(parsed) && hasRevealOnlyFields(parsed)) {
        store.removeItem(PUBLIC_CACHE_KEYS.QUESTIONS);
      }
    }
  } catch {
    try {
      store.removeItem(PUBLIC_CACHE_KEYS.QUESTIONS);
    } catch {}
  }
}
