import test from 'node:test';
import assert from 'node:assert/strict';
import { predictPerformance, percentileForScore } from './prediction';
import type { UserStats } from '../types';

function stats(partial: Partial<UserStats>): UserStats {
  return {
    totalAnswered: 0,
    totalCorrect: 0,
    streakDays: 0,
    lastActiveDate: '2026-11-01',
    bookmarkedIds: [],
    revisionQueueIds: [],
    mistakeStreaks: {},
    subjectPerformance: {},
    topicPerformance: {},
    examRecords: [],
    ...partial,
  };
}

function record(score: number, total: number) {
  return {
    id: `exam-${score}-${total}`,
    date: '2026-11-01T00:00:00.000Z',
    title: 'Mock',
    score,
    total,
    timeSpentSeconds: 60,
    passed: score / total >= 0.7,
  };
}

test('prediction is unavailable until there is enough signal', () => {
  const empty = predictPerformance(stats({}));
  assert.equal(empty.available, false);
  assert.match(empty.reason || '', /20 questions|mock/i);

  const thin = predictPerformance(stats({ totalAnswered: 10, totalCorrect: 8 }));
  assert.equal(thin.available, false);
});

test('practice-only accuracy is shrunk toward 50 while confidence is medium', () => {
  const result = predictPerformance(stats({ totalAnswered: 40, totalCorrect: 32 }));
  assert.equal(result.available, true);
  assert.equal(result.confidence, 'medium');
  assert.ok(result.predicted >= 70 && result.predicted <= 80, `unexpected ${result.predicted}`);
  assert.ok(result.low < result.predicted && result.high > result.predicted);
});

test('recent mocks pull the projection toward mock performance', () => {
  const practiceHeavy = predictPerformance(stats({ totalAnswered: 200, totalCorrect: 180 }));
  const withMocks = predictPerformance(
    stats({
      totalAnswered: 200,
      totalCorrect: 180,
      examRecords: [record(60, 100), record(62, 100), record(58, 100)],
    })
  );
  assert.ok(withMocks.predicted < practiceHeavy.predicted);
  assert.equal(withMocks.confidence, 'high');
  assert.ok(withMocks.predicted < 85);
});

test('bands stay inside 0-100', () => {
  const perfect = predictPerformance(
    stats({
      totalAnswered: 500,
      totalCorrect: 500,
      examRecords: [record(100, 100), record(100, 100), record(100, 100)],
    })
  );
  assert.ok(perfect.high <= 100);
  assert.ok(perfect.low >= 0);
  assert.equal(perfect.percentile, 99);
});

test('percentile mapping is monotonic', () => {
  let previous = -1;
  for (let score = 0; score <= 100; score += 5) {
    const value = percentileForScore(score);
    assert.ok(value >= previous, `percentile dropped at ${score}`);
    previous = value;
  }
  assert.equal(percentileForScore(70), 75);
  assert.equal(percentileForScore(0), 2);
});
