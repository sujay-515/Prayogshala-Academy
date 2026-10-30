/**
 * Pure scoring and performance analytics utilities
 */
import { MCQQuestion } from '../types';

export interface ExamScoreResult {
  score: number;
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

export function calculateExamScore(
  questions: MCQQuestion[],
  userAnswers: Record<string, string>,
  timeSpentSeconds = 0,
  passingPercentage = 70
): ExamScoreResult {
  let score = 0;
  const incorrectQuestionIds: string[] = [];
  const subjectPerformance: Record<string, { correct: number; total: number; percentage: number }> = {};

  for (const q of questions) {
    if (!subjectPerformance[q.subject]) {
      subjectPerformance[q.subject] = { correct: 0, total: 0, percentage: 0 };
    }
    subjectPerformance[q.subject].total += 1;

    const answer = userAnswers[q.id];
    if (answer && normalizeAnswer(answer) === normalizeAnswer(q.correctAnswer)) {
      score += 1;
      subjectPerformance[q.subject].correct += 1;
    } else {
      incorrectQuestionIds.push(q.id);
    }
  }

  // Calculate percentages per subject
  for (const sub of Object.keys(subjectPerformance)) {
    const data = subjectPerformance[sub];
    data.percentage = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
  }

  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = percentage >= passingPercentage;

  return {
    score,
    total,
    percentage,
    passed,
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
