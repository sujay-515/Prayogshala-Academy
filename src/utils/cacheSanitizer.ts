import { MCQQuestion, toPublicQuestion } from '../types';

/**
 * Checks whether an array of questions contains reveal-only fields:
 * - correctAnswer
 * - explanation
 * - reference
 * - per-option rationale
 */
export function hasRevealOnlyFields(items: unknown[]): boolean {
  if (!Array.isArray(items)) return false;
  return items.some((q) => {
    if (!q || typeof q !== 'object') return false;
    const candidate = q as Record<string, any>;
    if (candidate.correctAnswer || candidate.explanation || candidate.reference) {
      return true;
    }
    if (Array.isArray(candidate.options)) {
      return candidate.options.some((opt: any) => opt && typeof opt === 'object' && opt.rationale);
    }
    return false;
  });
}

/**
 * Sanitizes a question array for client storage, stripping reveal-only and admin fields.
 */
export function sanitizeQuestionsForCache(questions: MCQQuestion[]): MCQQuestion[] {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) => toPublicQuestion(q) as MCQQuestion);
}
