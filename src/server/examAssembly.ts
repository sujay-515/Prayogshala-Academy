import { MCQQuestion } from '../types';

const OPTION_IDS: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];

/** In-place Fisher-Yates shuffle. */
export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Builds the served paper from a candidate pool: randomises question order,
 * slices to `count`, and optionally randomises option order while keeping the
 * answer key pointing at the same option text.
 */
export function prepareExamQuestions(
  pool: MCQQuestion[],
  count: number,
  shuffleOptions: boolean
): MCQQuestion[] {
  const shuffled = shuffleInPlace([...pool]).slice(0, Math.max(0, count));

  // Optionally shuffle option texts while keeping option IDs A, B, C, D consistent
  // Track original option identity directly so duplicate option texts never corrupt the answer key
  return shuffled.map((q) => {
    if (!shuffleOptions || q.options.length <= 1) return q;
    const taggedOptions = q.options.map((o) => ({
      text: o.text,
      wasCorrect: o.id === q.correctAnswer,
    }));
    shuffleInPlace(taggedOptions);

    let newCorrect: 'A' | 'B' | 'C' | 'D' | 'E' = q.correctAnswer;
    const newOptions = taggedOptions.map((item, idx) => {
      const assignedId = q.options[idx]?.id || OPTION_IDS[idx] || 'A';
      if (item.wasCorrect) {
        newCorrect = assignedId;
      }
      return {
        id: assignedId,
        text: item.text,
      };
    });
    return {
      ...q,
      options: newOptions,
      correctAnswer: newCorrect,
    };
  });
}
