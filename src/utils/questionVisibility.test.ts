import test from 'node:test';
import assert from 'node:assert/strict';
import { isVisibleQuestion } from './questionVisibility';

test('isVisibleQuestion treats a stripped public status as published', () => {
  assert.equal(isVisibleQuestion({}), true);
  assert.equal(isVisibleQuestion({ status: 'Published' }), true);
});

test('isVisibleQuestion hides drafts, archived and under-review records', () => {
  assert.equal(isVisibleQuestion({ status: 'Draft' }), false);
  assert.equal(isVisibleQuestion({ status: 'Archived' }), false);
  assert.equal(isVisibleQuestion({ status: 'Under-Review' }), false);
  assert.equal(isVisibleQuestion({ status: 'Approved' }), false);
});

test('isVisibleQuestion rejects nullish questions', () => {
  assert.equal(isVisibleQuestion(null), false);
  assert.equal(isVisibleQuestion(undefined), false);
});
