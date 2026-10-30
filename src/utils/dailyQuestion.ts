import { MCQQuestion } from '../types';

/**
 * 32-bit FNV-1a hash producing deterministic non-negative integers for date strings
 */
export function hashDateString(dateStr: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    hash ^= dateStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Returns a date formatted as local YYYY-MM-DD string
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Pure function to select a deterministic Daily Question.
 * - Filters strictly to Published questions.
 * - Sorts deterministically by question code.
 * - Uses a hash of the user's local YYYY-MM-DD date string so everyone in the same
 *   local calendar date sees the identical question.
 * - Returns null gracefully when no published questions exist.
 */
export function getDailyQuestion(
  questions: MCQQuestion[],
  localDateStr?: string
): MCQQuestion | null {
  if (!Array.isArray(questions)) return null;

  const published = questions
    .filter((q) => q && q.status === 'Published')
    .sort((a, b) => (a.code || a.id).localeCompare(b.code || b.id));

  if (published.length === 0) {
    return null;
  }

  const dateStr = localDateStr || getLocalDateString();
  const hash = hashDateString(dateStr);
  const index = hash % published.length;
  return published[index];
}
