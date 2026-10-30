import test from 'node:test';
import assert from 'node:assert/strict';
import { getDailyQuestion, hashDateString, getLocalDateString } from './dailyQuestion';
import { MCQQuestion } from '../types';

const mockQuestions: MCQQuestion[] = [
  {
    id: 'q-3',
    code: 'LAB-003',
    questionText: 'Question 3',
    options: [{ id: 'A', text: 'Opt A' }, { id: 'B', text: 'Opt B' }],
    correctAnswer: 'A',
    explanation: 'Exp 3',
    reference: 'Ref 3',
    unit: 'Clinical Chemistry',
    subject: 'Sub',
    topic: 'Top',
    difficulty: 'Conceptual',
    examCategories: ['ASCP'],
    status: 'Published',
    createdAt: '',
    updatedAt: '',
    versionHistory: [],
  },
  {
    id: 'q-1',
    code: 'LAB-001',
    questionText: 'Question 1',
    options: [{ id: 'A', text: 'Opt A' }, { id: 'B', text: 'Opt B' }],
    correctAnswer: 'A',
    explanation: 'Exp 1',
    reference: 'Ref 1',
    unit: 'Hematology',
    subject: 'Sub',
    topic: 'Top',
    difficulty: 'Conceptual',
    examCategories: ['ASCP'],
    status: 'Published',
    createdAt: '',
    updatedAt: '',
    versionHistory: [],
  },
  {
    id: 'q-2',
    code: 'LAB-002',
    questionText: 'Question 2',
    options: [{ id: 'A', text: 'Opt A' }, { id: 'B', text: 'Opt B' }],
    correctAnswer: 'B',
    explanation: 'Exp 2',
    reference: 'Ref 2',
    unit: 'Microbiology',
    subject: 'Sub',
    topic: 'Top',
    difficulty: 'Conceptual',
    examCategories: ['ASCP'],
    status: 'Published',
    createdAt: '',
    updatedAt: '',
    versionHistory: [],
  },
  {
    id: 'q-draft',
    code: 'LAB-000',
    questionText: 'Draft Question',
    options: [{ id: 'A', text: 'Opt A' }, { id: 'B', text: 'Opt B' }],
    correctAnswer: 'A',
    explanation: 'Exp',
    reference: 'Ref',
    unit: 'Immunology',
    subject: 'Sub',
    topic: 'Top',
    difficulty: 'Conceptual',
    examCategories: ['ASCP'],
    status: 'Draft',
    createdAt: '',
    updatedAt: '',
    versionHistory: [],
  },
];

test('getDailyQuestion handles empty question lists and unpublished questions gracefully', () => {
  assert.equal(getDailyQuestion([]), null);
  assert.equal(getDailyQuestion(null as any), null);
  // Only drafts in list
  assert.equal(getDailyQuestion([mockQuestions[3]]), null);
});

test('getDailyQuestion sorts deterministically by code and selects identical question for identical date string', () => {
  const dateStr = '2026-10-30';
  const q1 = getDailyQuestion(mockQuestions, dateStr);
  const q2 = getDailyQuestion(mockQuestions, dateStr);

  assert.ok(q1);
  assert.equal(q1.status, 'Published');
  assert.equal(q1.id, q2?.id);

  // Timezone independence: Passing identical YYYY-MM-DD returns identical question regardless of timezone
  const simulatedToktoDate = '2026-11-01';
  const simulatedNyDate = '2026-11-01';
  const qTokyo = getDailyQuestion(mockQuestions, simulatedToktoDate);
  const qNY = getDailyQuestion(mockQuestions, simulatedNyDate);
  assert.equal(qTokyo?.id, qNY?.id);
});

test('getDailyQuestion produces varied deterministic output across simulated dates', () => {
  const dates = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'];
  const results = dates.map((d) => getDailyQuestion(mockQuestions, d)?.id);

  // All results must be valid published question IDs
  for (const id of results) {
    assert.ok(['q-1', 'q-2', 'q-3'].includes(id!));
  }

  // Not all results should be identical across 5 different dates
  const uniqueResults = new Set(results);
  assert.ok(uniqueResults.size >= 2);
});

test('getLocalDateString formats dates as YYYY-MM-DD', () => {
  const testDate = new Date(2026, 4, 9); // May 9, 2026 local time
  assert.equal(getLocalDateString(testDate), '2026-05-09');
});
