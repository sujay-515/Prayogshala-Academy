/**
 * Pure scoring and performance analytics utilities
 */
import { MCQQuestion } from '../types';

export const DEFAULT_PENALTY_PER_WRONG = 0.25;

export interface ExamScoringOptions {
  /** Deduct marks for incorrect answers (unanswered questions are never penalised). */
  negativeMarking?: boolean;
  /** Marks deducted per incorrect answer. */
  penaltyPerWrong?: number;
}

export interface ExamScoreResult {
  /** Net score after any negative-marking penalty; may be fractional or negative. */
  score: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  penaltyPoints: number;
  penaltyPerWrong: number;
  negativeMarking: boolean;
  total: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  subjectPerformance: Record<string, { correct: number; total: number; percentage: number }>;
  incorrectQuestionIds: string[];
}

export function normalizeAnswer(ans: unknown): string {
  if (typeof ans !== 'string') return '';
  return ans.trim().toUpperCase();
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateExamScore(
  questions: MCQQuestion[],
  userAnswers: Record<string, string>,
  timeSpentSeconds = 0,
  passingPercentage = 70,
  options: ExamScoringOptions = {}
): ExamScoreResult {
  const negativeMarking = Boolean(options.negativeMarking);
  const penaltyPerWrong =
    typeof options.penaltyPerWrong === 'number' && Number.isFinite(options.penaltyPerWrong)
      ? Math.max(0, options.penaltyPerWrong)
      : DEFAULT_PENALTY_PER_WRONG;

  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  const incorrectQuestionIds: string[] = [];
  const subjectPerformance: Record<string, { correct: number; total: number; percentage: number }> = {};

  for (const q of questions) {
    if (!subjectPerformance[q.subject]) {
      subjectPerformance[q.subject] = { correct: 0, total: 0, percentage: 0 };
    }
    subjectPerformance[q.subject].total += 1;

    const answer = normalizeAnswer(userAnswers[q.id]);

    if (!answer) {
      unansweredCount += 1;
      incorrectQuestionIds.push(q.id);
      continue;
    }

    if (answer === normalizeAnswer(q.correctAnswer)) {
      correctCount += 1;
      subjectPerformance[q.subject].correct += 1;
    } else {
      incorrectCount += 1;
      incorrectQuestionIds.push(q.id);
    }
  }

  for (const sub of Object.keys(subjectPerformance)) {
    const data = subjectPerformance[sub];
    data.percentage = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
  }

  const total = questions.length;
  const penaltyPoints = negativeMarking ? round2(incorrectCount * penaltyPerWrong) : 0;
  const score = round2(correctCount - penaltyPoints);
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  return {
    score,
    correctCount,
    incorrectCount,
    unansweredCount,
    penaltyPoints,
    penaltyPerWrong,
    negativeMarking,
    total,
    percentage,
    passed: percentage >= passingPercentage,
    timeSpentSeconds,
    subjectPerformance,
    incorrectQuestionIds,
  };
}

export interface WeakAreaInsight {
  subject: string;
  topic?: string;
  accuracy: number;
  totalAttempted: number;
  recommendedAction: string;
}

export function identifyWeakAreas(
  subjectStats: Record<string, { answered: number; correct: number }>,
  threshold = 65
): WeakAreaInsight[] {
  const weakAreas: WeakAreaInsight[] = [];

  for (const [subject, stats] of Object.entries(subjectStats)) {
    if (stats.answered >= 3) {
      const accuracy = Math.round((stats.correct / stats.answered) * 100);
      if (accuracy < threshold) {
        weakAreas.push({
          subject,
          accuracy,
          totalAttempted: stats.answered,
          recommendedAction: `Focus on ${subject} key diagnostic pathways and review high-yield MCQs.`,
        });
      }
    }
  }

  return weakAreas.sort((a, b) => a.accuracy - b.accuracy);
}
