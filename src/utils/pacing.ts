/**
 * Pacing analytics derived from per-question time in a timed mock.
 * Pure functions so the scoring loop stays testable and deterministic.
 */

export type PacingHabit = 'rushing' | 'overthinking' | 'balanced' | 'insufficient';

export interface PacingAnswer {
  seconds: number;
  answered: boolean;
  correct: boolean;
}

export interface PacingSummary {
  totalSeconds: number;
  timedQuestions: number;
  avgSecondsPerQuestion: number;
  fastestSeconds: number;
  slowestSeconds: number;
  rushingCount: number;
  overthinkingCount: number;
  steadyCount: number;
  habit: PacingHabit;
  label: string;
}

export const RUSHING_THRESHOLD_SECONDS = 20;
export const OVERTHINKING_THRESHOLD_SECONDS = 90;
const MIN_TIMED_QUESTIONS = 5;

const HABIT_LABELS: Record<PacingHabit, string> = {
  rushing: 'Rushing — slow down on low-confidence items.',
  overthinking: 'Overthinking — set a per-question cap and move on.',
  balanced: 'Balanced — speed and accuracy are in sync.',
  insufficient: 'Not enough timed questions to judge pacing yet.',
};

export function computePacing(entries: PacingAnswer[]): PacingSummary {
  const timed = entries.filter((entry) => Number.isFinite(entry.seconds) && entry.seconds > 0);

  if (timed.length === 0) {
    return {
      totalSeconds: 0,
      timedQuestions: 0,
      avgSecondsPerQuestion: 0,
      fastestSeconds: 0,
      slowestSeconds: 0,
      rushingCount: 0,
      overthinkingCount: 0,
      steadyCount: 0,
      habit: 'insufficient',
      label: HABIT_LABELS.insufficient,
    };
  }

  const totalSeconds = timed.reduce((sum, entry) => sum + entry.seconds, 0);
  const times = timed.map((entry) => entry.seconds);
  const avgSecondsPerQuestion = Math.round(totalSeconds / timed.length);
  const fastestSeconds = Math.min(...times);
  const slowestSeconds = Math.max(...times);

  const rushingCount = timed.filter(
    (entry) => entry.seconds < RUSHING_THRESHOLD_SECONDS && !entry.correct
  ).length;
  const overthinkingCount = timed.filter(
    (entry) => entry.seconds >= OVERTHINKING_THRESHOLD_SECONDS
  ).length;
  const steadyCount = Math.max(0, timed.length - rushingCount - overthinkingCount);

  let habit: PacingHabit = 'balanced';
  if (timed.length < MIN_TIMED_QUESTIONS) {
    habit = 'insufficient';
  } else if (rushingCount / timed.length >= 0.25) {
    habit = 'rushing';
  } else if (overthinkingCount / timed.length >= 0.3) {
    habit = 'overthinking';
  }

  return {
    totalSeconds,
    timedQuestions: timed.length,
    avgSecondsPerQuestion,
    fastestSeconds,
    slowestSeconds,
    rushingCount,
    overthinkingCount,
    steadyCount,
    habit,
    label: HABIT_LABELS[habit],
  };
}

export function formatPacingTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}
