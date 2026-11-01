/**
 * Heuristic score projection.
 *
 * Deliberately simple and explainable: practice accuracy blended with recent
 * mock performance, then shrunk toward 50 when the sample is thin so a handful
 * of lucky answers cannot produce a 99% "prediction".
 */
import type { UserStats } from '../types';

export type PredictionConfidence = 'low' | 'medium' | 'high';

export interface PredictedPerformance {
  available: boolean;
  reason?: string;
  predicted: number;
  low: number;
  high: number;
  percentile: number;
  confidence: PredictionConfidence;
  mockCount: number;
  answered: number;
  basis: string;
}

const MIN_ANSWERS = 20;

const PERCENTILE_ANCHORS: Array<[number, number]> = [
  [0, 2],
  [40, 15],
  [50, 35],
  [60, 55],
  [70, 75],
  [80, 90],
  [90, 97],
  [100, 99],
];

export function percentileForScore(score: number): number {
  const clamped = Math.min(100, Math.max(0, score));
  for (let i = 1; i < PERCENTILE_ANCHORS.length; i++) {
    const [x1, y1] = PERCENTILE_ANCHORS[i - 1];
    const [x2, y2] = PERCENTILE_ANCHORS[i];
    if (clamped <= x2) {
      const ratio = x2 === x1 ? 0 : (clamped - x1) / (x2 - x1);
      return Math.round(y1 + ratio * (y2 - y1));
    }
  }
  return 99;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function predictPerformance(stats: UserStats): PredictedPerformance {
  const answered = Math.max(0, stats.totalAnswered || 0);
  const mockCount = Array.isArray(stats.examRecords) ? stats.examRecords.length : 0;

  if (mockCount === 0 && answered < MIN_ANSWERS) {
    return {
      available: false,
      reason: `Answer at least ${MIN_ANSWERS} questions or complete one mock exam to unlock a projection.`,
      predicted: 0,
      low: 0,
      high: 0,
      percentile: 0,
      confidence: 'low',
      mockCount,
      answered,
      basis: '',
    };
  }

  const overallAccuracy =
    answered > 0 ? clamp((stats.totalCorrect / stats.totalAnswered) * 100) : 50;

  const recentMocks = [...(stats.examRecords || [])]
    .slice(0, 5)
    .map((record) => (record.total > 0 ? (record.score / record.total) * 100 : 0));

  const mockAverage = recentMocks.length
    ? recentMocks.reduce((sum, value) => sum + value, 0) / recentMocks.length
    : null;

  const mockWeight = mockCount > 0 ? Math.min(0.65, 0.2 + 0.1 * mockCount) : 0;
  const blended =
    mockAverage !== null ? overallAccuracy * (1 - mockWeight) + mockAverage * mockWeight : overallAccuracy;

  const confidence: PredictionConfidence =
    answered >= 100 && mockCount >= 3
      ? 'high'
      : answered >= 30 || mockCount >= 1
        ? 'medium'
        : 'low';

  const shrink = confidence === 'high' ? 1 : confidence === 'medium' ? 0.8 : 0.55;
  const predicted = clamp(blended * shrink + 50 * (1 - shrink));

  const margin = confidence === 'high' ? 3 : confidence === 'medium' ? 5 : 8;

  return {
    available: true,
    predicted: Math.round(predicted),
    low: Math.round(clamp(predicted - margin)),
    high: Math.round(clamp(predicted + margin)),
    percentile: percentileForScore(predicted),
    confidence,
    mockCount,
    answered,
    basis: `${mockCount} mock${mockCount === 1 ? '' : 's'} · ${answered} practice answer${answered === 1 ? '' : 's'}`,
  };
}
