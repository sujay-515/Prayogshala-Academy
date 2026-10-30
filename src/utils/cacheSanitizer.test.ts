import test from 'node:test';
import assert from 'node:assert/strict';
import { hasRevealOnlyFields, sanitizeQuestionsForCache } from './cacheSanitizer';

test('cacheSanitizer tests', async (t) => {
  await t.test('detects correctAnswer in cached question', () => {
    const list = [
      { id: 'q1', questionText: 'Probe', options: [{ id: 'A', text: 'Opt' }], correctAnswer: 'A' },
    ];
    assert.equal(hasRevealOnlyFields(list), true);
  });

  await t.test('detects explanation in cached question', () => {
    const list = [
      { id: 'q1', questionText: 'Probe', options: [{ id: 'A', text: 'Opt' }], explanation: 'Secret reason' },
    ];
    assert.equal(hasRevealOnlyFields(list), true);
  });

  await t.test('detects reference in cached question', () => {
    const list = [
      { id: 'q1', questionText: 'Probe', options: [{ id: 'A', text: 'Opt' }], reference: 'Textbook page 12' },
    ];
    assert.equal(hasRevealOnlyFields(list), true);
  });

  await t.test('detects per-option rationale in cached question', () => {
    const list = [
      {
        id: 'q1',
        questionText: 'Probe',
        options: [{ id: 'A', text: 'Opt', rationale: 'Why A is right' }],
      },
    ];
    assert.equal(hasRevealOnlyFields(list), true);
  });

  await t.test('returns false for pure public question', () => {
    const list = [
      {
        id: 'q1',
        code: 'LAB-001',
        questionText: 'Probe question text',
        options: [
          { id: 'A', text: 'Opt A' },
          { id: 'B', text: 'Opt B' },
        ],
        unit: 'Hematology',
        subject: 'RBCs',
        difficulty: 'Easy',
      },
    ];
    assert.equal(hasRevealOnlyFields(list), false);
  });

  await t.test('sanitizeQuestionsForCache removes all reveal and admin fields', () => {
    const rawList: any[] = [
      {
        id: 'q1',
        code: 'LAB-001',
        questionText: 'Probe',
        options: [{ id: 'A', text: 'Opt A', rationale: 'Secret' }],
        correctAnswer: 'A',
        explanation: 'Secret explanation',
        reference: 'Secret citation',
        sourceDocument: 'exam.pdf',
        pageNumber: 12,
        versionHistory: [],
        flags: [],
      },
    ];
    const sanitized = sanitizeQuestionsForCache(rawList);
    assert.equal(hasRevealOnlyFields(sanitized), false);
    assert.equal((sanitized[0] as any).correctAnswer, undefined);
    assert.equal((sanitized[0] as any).explanation, undefined);
    assert.equal((sanitized[0] as any).reference, undefined);
    assert.equal((sanitized[0] as any).sourceDocument, undefined);
    assert.equal(sanitized[0].options[0].rationale, undefined);
  });
});
