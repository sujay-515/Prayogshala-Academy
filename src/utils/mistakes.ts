/**
 * Mistakes Recovery rules.
 *
 * A wrong answer enters the queue. To clear it the candidate must answer the
 * same question correctly on two consecutive attempts; any wrong answer resets
 * the streak. This prevents a single lucky guess from clearing a mistake.
 */

export const MISTAKE_CLEAR_THRESHOLD = 2;

export interface MistakeState {
  revisionQueueIds: string[];
  mistakeStreaks: Record<string, number>;
}

export function emptyMistakeState(): MistakeState {
  return { revisionQueueIds: [], mistakeStreaks: {} };
}

/** Defensive normalisation for stats stored before mistake streaks existed. */
export function normalizeMistakes(
  revisionQueueIds?: string[] | null,
  mistakeStreaks?: Record<string, number> | null
): MistakeState {
  const queue = Array.isArray(revisionQueueIds)
    ? Array.from(new Set(revisionQueueIds.filter((id) => typeof id === 'string' && id.length > 0)))
    : [];

  const streaks: Record<string, number> = {};
  for (const id of queue) {
    const raw = mistakeStreaks?.[id];
    const value = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : 0;
    streaks[id] = Math.min(Math.max(value, 0), MISTAKE_CLEAR_THRESHOLD - 1);
  }

  return { revisionQueueIds: queue, mistakeStreaks: streaks };
}

/**
 * Apply a single graded answer to the mistake state.
 * Returns a new object; never mutates the input.
 */
export function recordMistakeAnswer(
  state: MistakeState,
  questionId: string,
  isCorrect: boolean
): MistakeState {
  if (!questionId) return state;

  const queue = [...(state.revisionQueueIds || [])];
  const streaks = { ...(state.mistakeStreaks || {}) };
  const queued = queue.includes(questionId);

  if (!isCorrect) {
    if (!queued) queue.push(questionId);
    streaks[questionId] = 0;
    return { revisionQueueIds: queue, mistakeStreaks: streaks };
  }

  if (!queued) return { revisionQueueIds: queue, mistakeStreaks: streaks };

  const nextStreak = (streaks[questionId] || 0) + 1;
  if (nextStreak >= MISTAKE_CLEAR_THRESHOLD) {
    delete streaks[questionId];
    return {
      revisionQueueIds: queue.filter((id) => id !== questionId),
      mistakeStreaks: streaks,
    };
  }

  streaks[questionId] = nextStreak;
  return { revisionQueueIds: queue, mistakeStreaks: streaks };
}

/** Number of correct answers still required before the mistake clears. */
export function remainingHits(streak: number | undefined): number {
  const current = Math.min(Math.max(streak || 0, 0), MISTAKE_CLEAR_THRESHOLD);
  return MISTAKE_CLEAR_THRESHOLD - current;
}
