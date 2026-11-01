import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyMistakeState,
  normalizeMistakes,
  recordMistakeAnswer,
  remainingHits,
  MISTAKE_CLEAR_THRESHOLD,
} from './mistakes';

test('a wrong answer enters the queue with a zero streak', () => {
  const next = recordMistakeAnswer(emptyMistakeState(), 'q1', false);
  assert.deepEqual(next.revisionQueueIds, ['q1']);
  assert.equal(next.mistakeStreaks.q1, 0);
});

test('one correct answer keeps the mistake queued at 1/2', () => {
  let state = recordMistakeAnswer(emptyMistakeState(), 'q1', false);
  state = recordMistakeAnswer(state, 'q1', true);
  assert.deepEqual(state.revisionQueueIds, ['q1']);
  assert.equal(state.mistakeStreaks.q1, 1);
  assert.equal(remainingHits(state.mistakeStreaks.q1), 1);
});

test('two consecutive correct answers clear the mistake', () => {
  let state = recordMistakeAnswer(emptyMistakeState(), 'q1', false);
  state = recordMistakeAnswer(state, 'q1', true);
  state = recordMistakeAnswer(state, 'q1', true);
  assert.deepEqual(state.revisionQueueIds, []);
  assert.equal(state.mistakeStreaks.q1, undefined);
});

test('a wrong answer after one correct hit resets the streak', () => {
  let state = recordMistakeAnswer(emptyMistakeState(), 'q1', false);
  state = recordMistakeAnswer(state, 'q1', true);
  state = recordMistakeAnswer(state, 'q1', false);
  assert.equal(state.mistakeStreaks.q1, 0);
  assert.deepEqual(state.revisionQueueIds, ['q1']);
});

test('correct answers on questions outside the queue are a no-op', () => {
  const state = recordMistakeAnswer(emptyMistakeState(), 'q9', true);
  assert.deepEqual(state.revisionQueueIds, []);
  assert.deepEqual(state.mistakeStreaks, {});
});

test('repeated wrong answers do not duplicate the queue entry', () => {
  let state = recordMistakeAnswer(emptyMistakeState(), 'q1', false);
  state = recordMistakeAnswer(state, 'q1', false);
  assert.deepEqual(state.revisionQueueIds, ['q1']);
});

test('normalizeMistakes dedupes, caps streaks and drops junk values', () => {
  const state = normalizeMistakes(['q1', 'q1', 'q2', '', 42 as unknown as string], {
    q1: 9,
    q2: Number.NaN,
  });
  assert.deepEqual(state.revisionQueueIds, ['q1', 'q2']);
  assert.equal(state.mistakeStreaks.q1, MISTAKE_CLEAR_THRESHOLD - 1);
  assert.equal(state.mistakeStreaks.q2, 0);
});

test('normalizeMistakes tolerates missing legacy fields', () => {
  const state = normalizeMistakes(undefined, undefined);
  assert.deepEqual(state.revisionQueueIds, []);
  assert.deepEqual(state.mistakeStreaks, {});
});
