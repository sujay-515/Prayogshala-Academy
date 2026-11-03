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

/** PRNG using Mulberry32 for deterministic seeded pseudo-random generation. */
export function createMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** In-place Fisher-Yates shuffle using a custom PRNG. */
export function seededShuffle<T>(items: T[], prng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Optionally shuffles option texts while keeping option IDs consistent. */
export function shuffleQuestionOptions(q: MCQQuestion, shuffleOptions: boolean): MCQQuestion {
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
  return shuffled.map((q) => shuffleQuestionOptions(q, shuffleOptions));
}
