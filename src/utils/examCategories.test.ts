import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GENERAL_EXAM_LABEL,
  detectExamCategoriesFromTitle,
  detectExplicitExamCategoryLine,
  formatExamCategories,
  normalizeExamCategories,
  questionMatchesExamCategory,
} from './examCategories';

test('normalizeExamCategories treats missing, empty, and unknown values as untagged (General)', () => {
  assert.deepEqual(normalizeExamCategories(undefined), []);
  assert.deepEqual(normalizeExamCategories(null), []);
  assert.deepEqual(normalizeExamCategories(''), []);
  assert.deepEqual(normalizeExamCategories([]), []);
  assert.deepEqual(normalizeExamCategories(['BOGUS', 'AMT']), []);
  assert.deepEqual(normalizeExamCategories('not-a-board'), []);
});

test('normalizeExamCategories accepts CSV strings, dedupes, and sorts canonically', () => {
  assert.deepEqual(normalizeExamCategories('nhpc, ascp; ASCP / psc'), ['ASCP', 'NHPC', 'PSC']);
  assert.deepEqual(normalizeExamCategories(['CEE-UG', 'ASCP']), ['ASCP', 'CEE-UG']);
  assert.deepEqual(normalizeExamCategories('CEE UG'), ['CEE-UG']);
  assert.deepEqual(normalizeExamCategories('American Society for Clinical Pathology'), ['ASCP']);
});

test('detectExplicitExamCategoryLine extracts categories from explicit metadata lines', () => {
  assert.deepEqual(detectExplicitExamCategoryLine('Exam Categories: ASCP; NHPC'), ['ASCP', 'NHPC']);
  assert.deepEqual(detectExplicitExamCategoryLine('Exam Category: PSC'), ['PSC']);
  assert.deepEqual(detectExplicitExamCategoryLine('Target Exam: DHA'), ['DHA']);
  assert.deepEqual(detectExplicitExamCategoryLine('Boards: ASCP, AIMS'), ['ASCP', 'AIMS']);
  assert.deepEqual(detectExplicitExamCategoryLine('• Exam Categories: CEE-UG'), ['CEE-UG']);
  assert.deepEqual(detectExplicitExamCategoryLine('Exam: PSC'), ['PSC']);
  assert.deepEqual(detectExplicitExamCategoryLine('Examination: NHPC; ASCP'), ['ASCP', 'NHPC']);
});

test('detectExplicitExamCategoryLine rejects clinical notes and non-exam text', () => {
  assert.equal(detectExplicitExamCategoryLine('Physical Exam: Normal vital signs, afebrile'), null);
  assert.equal(detectExplicitExamCategoryLine('Neurological exam: intact and non-focal'), null);
  assert.equal(detectExplicitExamCategoryLine('Exam: Afebrile, clear lung fields'), null);
  assert.equal(detectExplicitExamCategoryLine('Just a normal question stem'), null);
});

test('detectExamCategoriesFromTitle conservatively detects board titles and filenames', () => {
  assert.deepEqual(detectExamCategoriesFromTitle('ASCP 2024'), ['ASCP']);
  assert.deepEqual(detectExamCategoriesFromTitle('Clinical_Pathology_ASCP_2024.pdf'), ['ASCP']);
  assert.deepEqual(detectExamCategoriesFromTitle('NHPC Licensing Examination 2024'), ['NHPC']);
  assert.deepEqual(detectExamCategoriesFromTitle('CEE-UG 2024 Entrance Exam'), ['CEE-UG']);
  assert.deepEqual(detectExamCategoriesFromTitle('PSC 2024 Lab Technologist Exam'), ['PSC']);
  assert.deepEqual(detectExamCategoriesFromTitle('DHA Medical Laboratory Exam 2024'), ['DHA']);
  assert.deepEqual(detectExamCategoriesFromTitle('AIMS 2024 Examination Prep'), ['AIMS']);
});

test('detectExamCategoriesFromTitle prevents mis-tagging of clinical PSC and biochemical DHA', () => {
  // Primary sclerosing cholangitis (PSC) must not be tagged as PSC board exam
  assert.deepEqual(detectExamCategoriesFromTitle('Primary Sclerosing Cholangitis (PSC) Case Review'), []);
  assert.deepEqual(detectExamCategoriesFromTitle('PSC and Ulcerative Colitis in Liver Disease'), []);
  // Biochemical docosahexaenoic acid (DHA) must not be tagged as DHA exam
  assert.deepEqual(detectExamCategoriesFromTitle('Docosahexaenoic Acid (DHA) in Lipid Metabolism'), []);
  // Generic medicine PDF with no board keywords
  assert.deepEqual(detectExamCategoriesFromTitle('General_Clinical_Chemistry.pdf'), []);
});

test('formatExamCategories renders General for untagged questions', () => {
  assert.equal(formatExamCategories([]), GENERAL_EXAM_LABEL);
  assert.equal(formatExamCategories(undefined), 'General');
  assert.equal(formatExamCategories(['ASCP', 'NHPC']), 'ASCP · NHPC');
});

test('questionMatchesExamCategory keeps General questions available under every board', () => {
  // Untagged questions are universal, so an untagged upload never disappears from board filters.
  assert.equal(questionMatchesExamCategory([], 'ASCP'), true);
  assert.equal(questionMatchesExamCategory(undefined, 'PSC'), true);
  // Tagged questions match only their own boards.
  assert.equal(questionMatchesExamCategory(['NHPC'], 'NHPC'), true);
  assert.equal(questionMatchesExamCategory(['NHPC'], 'ASCP'), false);
  // "All" always matches.
  assert.equal(questionMatchesExamCategory(['NHPC'], 'All'), true);
});
