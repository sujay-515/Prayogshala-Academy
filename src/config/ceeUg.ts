import { questionMatchesExamCategory } from '../utils/examCategories';

/**
 * CEE-UG (MECEE-BL) Entrance Examination configuration.
 *
 * Official pattern: 200 questions, 200 marks, 3 hours (180 minutes), -0.25 negative marking.
 * CEE-UG is a standalone mock test without unit or subject-wise requirements.
 * Questions are uploaded in bulk and tagged under the CEE-UG exam category.
 */

export const CEE_UG_TOTAL_QUESTIONS = 200;
export const CEE_UG_TOTAL_MARKS = 200;
export const CEE_UG_DURATION_MINUTES = 180;
export const CEE_UG_MARKS_PER_CORRECT = 1;
export const CEE_UG_PENALTY_PER_WRONG = 0.25;
/** CEE-UG practice benchmark threshold: 50% (not an official cutoff) */
export const CEE_UG_PASSING_PERCENTAGE = 50;

export const CEE_UG_ROUTE = '/cee-ug';
export const CEE_UG_NAME = 'CEE-UG Entrance';
export const CEE_UG_TITLE = 'CEE-UG Entrance Mock Examination';

export interface CeeUgQuestionLike {
  id?: string;
  unit?: string | null;
  subject?: string | null;
  status?: string | null;
  examCategories?: unknown;
}

export interface CeeUgAvailability {
  totalAvailable: number;
  totalRequired: number;
  isShort: boolean;
}

/**
 * Counts how many published questions are available for the CEE-UG mock.
 */
export function computeCeeUgAvailability(
  questions: CeeUgQuestionLike[],
  isVisible: (q: CeeUgQuestionLike) => boolean
): CeeUgAvailability {
  const usable = questions.filter(
    (q) => isVisible(q) && questionMatchesExamCategory(q.examCategories, 'CEE-UG')
  );
  const totalAvailable = usable.length;
  return {
    totalAvailable,
    totalRequired: CEE_UG_TOTAL_QUESTIONS,
    isShort: totalAvailable < CEE_UG_TOTAL_QUESTIONS,
  };
}
