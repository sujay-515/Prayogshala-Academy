import { UnitCategory } from '../types';
import { questionMatchesExamCategory } from '../utils/examCategories';

/**
 * CEE-UG (MECEE-BL) Entrance Examination configuration.
 *
 * Official pattern: 200 questions, 200 marks, 3 hours (180 minutes), -0.25 negative marking.
 * Questions are uploaded in bulk and tagged under CEE-UG without requiring subject partitioning.
 */

export const CEE_UG_TOTAL_QUESTIONS = 200;
export const CEE_UG_TOTAL_MARKS = 200;
export const CEE_UG_DURATION_MINUTES = 180;
export const CEE_UG_MARKS_PER_CORRECT = 1;
export const CEE_UG_PENALTY_PER_WRONG = 0.25;
/** CEE-UG cut-offs benchmark: 50% */
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

/**
 * Optional taxonomy units (Physics, Chemistry, Biology, Mental Ability)
 * kept so any existing question classifications or optional filters remain valid.
 */
export const CEE_UG_CATEGORY_UNITS: UnitCategory[] = [
  {
    id: 'unit-ceeug-physics',
    name: 'Physics',
    description: 'CEE-UG entrance physics.',
    subjects: [
      {
        id: 'ceeug-physics-general',
        name: 'General Physics',
        topics: ['Mechanics', 'Heat & Thermodynamics', 'Waves & Optics', 'Electricity & Magnetism', 'Modern Physics'],
      },
    ],
  },
  {
    id: 'unit-ceeug-chemistry',
    name: 'Chemistry',
    description: 'CEE-UG entrance chemistry.',
    subjects: [
      {
        id: 'ceeug-chemistry-general',
        name: 'General Chemistry',
        topics: ['Physical Chemistry', 'Inorganic Chemistry', 'Organic Chemistry'],
      },
    ],
  },
  {
    id: 'unit-ceeug-biology',
    name: 'Biology',
    description: 'CEE-UG entrance biology.',
    subjects: [
      {
        id: 'ceeug-biology-general',
        name: 'General Biology',
        topics: ['Botany', 'Zoology', 'Cell Biology & Genetics', 'Human Physiology'],
      },
    ],
  },
  {
    id: 'unit-ceeug-mat',
    name: 'Mental Ability',
    description: 'Mental Agility Test (MAT) section.',
    subjects: [
      {
        id: 'ceeug-mat-general',
        name: 'Reasoning & Aptitude',
        topics: ['Logical Reasoning', 'Numerical Aptitude', 'Spatial Reasoning'],
      },
    ],
  },
];
