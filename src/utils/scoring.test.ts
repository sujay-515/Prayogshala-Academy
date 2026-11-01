import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateExamScore, identifyWeakAreas, normalizeAnswer } from './scoring';
import { MCQQuestion } from '../types';

test('calculateExamScore computes correct accuracy and subject breakdown', () => {
  const mockQuestions: MCQQuestion[] = [
    {
      id: 'q1',
      code: 'LAB-01',
      questionText: 'Question 1',
      options: [
        { id: 'A', text: 'Ans A' },
        { id: 'B', text: 'Ans B' },
      ],
      correctAnswer: 'A',
      explanation: 'Exp',
      reference: 'Ref',
      unit: 'Clinical Chemistry',
      subject: 'Enzymology',
      topic: 'Liver enzymes',
      difficulty: 'Memory-based',
      examCategories: ['ASCP'],
      status: 'Published',
      createdAt: '',
      updatedAt: '',
      versionHistory: [],
    },
    {
      id: 'q2',
      code: 'LAB-02',
      questionText: 'Question 2',
      options: [
        { id: 'A', text: 'Ans A' },
        { id: 'B', text: 'Ans B' },
      ],
      correctAnswer: 'B',
      explanation: 'Exp',
      reference: 'Ref',
      unit: 'Hematology',
      subject: 'Anemias',
      topic: 'Iron deficiency',
      difficulty: 'Conceptual',
      examCategories: ['ASCP'],
      status: 'Published',
      createdAt: '',
      updatedAt: '',
      versionHistory: [],
    },
  ];

  const result = calculateExamScore(mockQuestions, { q1: 'A', q2: 'A' }, 45, 70);

  assert.equal(result.score, 1);
  assert.equal(result.total, 2);
  assert.equal(result.percentage, 50);
  assert.equal(result.passed, false);
  assert.equal(result.subjectPerformance['Enzymology'].percentage, 100);
  assert.equal(result.subjectPerformance['Anemias'].percentage, 0);
  assert.deepEqual(result.incorrectQuestionIds, ['q2']);
});

test('identifyWeakAreas surfaces subjects with accuracy under threshold', () => {
  const stats = {
    'Blood Banking': { answered: 5, correct: 2 }, // 40%
    'Clinical Enzymology': { answered: 10, correct: 9 }, // 90%
    'Microbiology': { answered: 1, correct: 0 }, // < 3 attempts, ignored
  };

  const weak = identifyWeakAreas(stats, 65);
  assert.equal(weak.length, 1);
  assert.equal(weak[0].subject, 'Blood Banking');
  assert.equal(weak[0].accuracy, 40);
});

test('normalizeAnswer trims whitespace and converts to uppercase', () => {
  assert.equal(normalizeAnswer(' a '), 'A');
  assert.equal(normalizeAnswer('B'), 'B');
  assert.equal(normalizeAnswer(' c\n'), 'C');
  assert.equal(normalizeAnswer(null), '');
  assert.equal(normalizeAnswer(undefined), '');
  assert.equal(normalizeAnswer(123), '');
});

test('calculateExamScore normalizes answer whitespace and case', () => {
  const mockQuestions: MCQQuestion[] = [
    {
      id: 'q1',
      code: 'LAB-01',
      questionText: 'Question 1',
      options: [{ id: 'A', text: 'Ans A' }, { id: 'B', text: 'Ans B' }],
      correctAnswer: 'A',
      explanation: 'Exp',
      reference: 'Ref',
      unit: 'Clinical Chemistry',
      subject: 'Enzymology',
      topic: 'Liver enzymes',
      difficulty: 'Memory-based',
      examCategories: ['ASCP'],
      status: 'Published',
      createdAt: '',
      updatedAt: '',
      versionHistory: [],
    },
  ];
  // Passing ' a ' matches 'A'
  const result = calculateExamScore(mockQuestions, { q1: ' a ' }, 10, 70);
  assert.equal(result.score, 1);
  assert.equal(result.percentage, 100);
});

function makeQuestion(id: string, correctAnswer: 'A' | 'B' | 'C' | 'D'): MCQQuestion {
  return {
    id,
    code: `LAB-${id}`,
    questionText: `Question ${id}`,
    options: [
      { id: 'A', text: 'Ans A' },
      { id: 'B', text: 'Ans B' },
      { id: 'C', text: 'Ans C' },
      { id: 'D', text: 'Ans D' },
    ],
    correctAnswer,
    explanation: 'Exp',
    reference: 'Ref',
    unit: 'Clinical Chemistry',
    subject: 'Enzymology',
    topic: 'Liver enzymes',
    difficulty: 'Memory-based',
    examCategories: ['ASCP'],
    status: 'Published',
    createdAt: '',
    updatedAt: '',
    versionHistory: [],
  };
}

test('negative marking penalises wrong answers but never unanswered ones', () => {
  const questions = [makeQuestion('q1', 'A'), makeQuestion('q2', 'B'), makeQuestion('q3', 'C')];
  const result = calculateExamScore(
    questions,
    { q1: 'A', q2: 'D' }, // q3 left blank
    60,
    70,
    { negativeMarking: true, penaltyPerWrong: 0.25 }
  );

  assert.equal(result.correctCount, 1);
  assert.equal(result.incorrectCount, 1);
  assert.equal(result.unansweredCount, 1);
  assert.equal(result.penaltyPoints, 0.25);
  assert.equal(result.score, 0.75);
  assert.equal(result.percentage, 25);
  assert.equal(result.passed, false);
  assert.deepEqual(result.incorrectQuestionIds, ['q2', 'q3']);
});

test('negative marking can drive the net score below zero', () => {
  const questions = [makeQuestion('q1', 'A'), makeQuestion('q2', 'B')];
  const result = calculateExamScore(
    questions,
    { q1: 'C', q2: 'D' },
    30,
    70,
    { negativeMarking: true, penaltyPerWrong: 0.25 }
  );

  assert.equal(result.score, -0.5);
  assert.equal(result.percentage, -25);
  assert.equal(result.passed, false);
  assert.equal(result.penaltyPoints, 0.5);
});

test('negative marking disabled keeps the raw correct count as the score', () => {
  const questions = [makeQuestion('q1', 'A'), makeQuestion('q2', 'B')];
  const result = calculateExamScore(questions, { q1: 'A', q2: 'D' }, 30, 70, {
    negativeMarking: false,
  });

  assert.equal(result.score, 1);
  assert.equal(result.penaltyPoints, 0);
  assert.equal(result.percentage, 50);
});
