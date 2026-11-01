import test from 'node:test';
import assert from 'node:assert/strict';
import { computePacing, formatPacingTime, PacingAnswer } from './pacing';

function entry(seconds: number, correct: boolean): PacingAnswer {
  return { seconds, answered: true, correct };
}

test('pacing is insufficient for empty or very short sessions', () => {
  assert.equal(computePacing([]).habit, 'insufficient');
  assert.equal(computePacing([entry(10, true), entry(12, false)]).habit, 'insufficient');
});

test('fast incorrect answers flag a rushing habit', () => {
  const entries = [
    entry(8, false),
    entry(9, false),
    entry(10, false),
    entry(60, true),
    entry(65, true),
    entry(70, true),
    entry(80, true),
    entry(85, true),
  ];
  const pacing = computePacing(entries);
  assert.equal(pacing.rushingCount, 3);
  assert.equal(pacing.habit, 'rushing');
  assert.match(pacing.label, /Rushing/i);
});

test('long deliberations flag overthinking', () => {
  const entries = [
    entry(120, true),
    entry(130, true),
    entry(95, false),
    entry(30, true),
    entry(40, true),
    entry(50, true),
    entry(25, true),
  ];
  const pacing = computePacing(entries);
  assert.equal(pacing.overthinkingCount, 3);
  assert.equal(pacing.habit, 'overthinking');
});

test('steady sessions report balanced pacing with summary stats', () => {
  const entries = [40, 45, 50, 55, 60, 65].map((seconds) => entry(seconds, true));
  const pacing = computePacing(entries);
  assert.equal(pacing.timedQuestions, 6);
  assert.equal(pacing.totalSeconds, 315);
  assert.equal(pacing.avgSecondsPerQuestion, 53);
  assert.equal(pacing.fastestSeconds, 40);
  assert.equal(pacing.slowestSeconds, 65);
  assert.equal(pacing.habit, 'balanced');
});

test('untimed questions are ignored', () => {
  const entries = [entry(0, false), entry(0, false), ...Array.from({ length: 5 }, () => entry(50, true))];
  const pacing = computePacing(entries);
  assert.equal(pacing.timedQuestions, 5);
  assert.equal(pacing.avgSecondsPerQuestion, 50);
});

test('formatPacingTime renders seconds and minutes', () => {
  assert.equal(formatPacingTime(0), '0s');
  assert.equal(formatPacingTime(45), '45s');
  assert.equal(formatPacingTime(90), '1m 30s');
  assert.equal(formatPacingTime(3600), '60m 0s');
});
