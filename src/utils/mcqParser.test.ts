import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRawMCQText,
  validateExtractedQuestion,
  generateNextQuestionCode,
  inferCategoryFromContent,
  parseCSVToMCQ,
} from './mcqParser';
import { INITIAL_CATEGORIES } from '../data/categories';

test('parseRawMCQText parses numbered MCQs with end-of-document answer key, checkbox symbols, and Devanagari options', () => {
  const rawText = `
1. Which anticoagulant is recommended by CLSI for routine coagulation studies?
☐ A) EDTA
☐B)Sodium citrate (3.2%)
☐ C) Lithium heparin
☐ D) Sodium fluoride

2. नेपालको जनस्वास्थ्य प्रयोगशाला सम्बन्धी प्रश्न:
☐ क) पहिलो विकल्प
☐ ख) दोस्रो विकल्प
☐ ग) तेस्रो विकल्प
☐ घ) चौथो विकल्प

3. Match the following leukocyte anomalies with their classic morphology:
Anomaly | Classic Feature
1. Pelger-Huet | Bilobed spectacles nucleus
2. May-Hegglin | Döhle-like inclusion bodies
3. Alder-Reilly | Dense azurophilic granules
4. Chediak-Higashi | Giant lysosomal granules
☐ A) 1-a, 2-b, 3-c, 4-d
☐ B) 1-b, 2-a, 3-d, 4-c
☐ C) 1-c, 2-d, 3-a, 4-b
☐ D) 1-d, 2-c, 3-b, 4-a

Answer Key:
1 B
2 ग
3 A
`;

  const drafts = parseRawMCQText(rawText, 'Test_Exam.pdf');
  assert.equal(drafts.length, 3);

  // Q1: attached checkbox option B)Sodium citrate (3.2%) and end-of-doc answer key B
  assert.equal(drafts[0].options.length, 4);
  assert.equal(drafts[0].options[1].id, 'B');
  assert.equal(drafts[0].options[1].text, 'Sodium citrate (3.2%)');
  assert.equal(drafts[0].correctAnswer, 'B');

  // Q2: Devanagari options mapped to A-D and answer key ग mapped to C
  assert.equal(drafts[1].options.length, 4);
  assert.equal(drafts[1].options[2].id, 'C');
  assert.equal(drafts[1].options[2].text, 'तेस्रो विकल्प');
  assert.equal(drafts[1].correctAnswer, 'C');

  // Q3: Matching table extracted into tableData
  assert.ok(drafts[2].tableData);
  assert.deepEqual(drafts[2].tableData?.headers, ['Anomaly', 'Classic Feature']);
  assert.equal(drafts[2].tableData?.rows.length, 4);
  assert.equal(drafts[2].correctAnswer, 'A');
});

test('parseRawMCQText parses unnumbered MCQs with inline options and multi-line Correct answer', () => {
  const rawText = `
What is the primary enzyme deficient in Classic Galactosemia?
A. Galactokinase B. Galactose-1-phosphate uridyltransferase C. UDP-galactose-4-epimerase D. Aldose reductase
Correct answer: Galactose-1-phosphate
uridyltransferase
Explanation:
1. GALT deficiency leads to accumulation of galactose-1-phosphate.
2. Infants present with jaundice, hepatomegaly, and E. coli sepsis.

Which bacteria shows tumbling motility at 25°C?
A. Listeria monocytogenes B. Corynebacterium diphtheriae C. Bacillus anthracis D. Erysipelothrix rhusiopathiae
Correct answer: B. Listeria monocytogenes
Explanation: Listeria exhibits characteristic tumbling motility at room temperature.
`;

  const drafts = parseRawMCQText(rawText, 'Unnumbered.pdf');
  assert.equal(drafts.length, 2);
  assert.equal(drafts[0].options.length, 4);
  assert.equal(drafts[0].correctAnswer, 'B');
  assert.ok(drafts[0].explanation.includes('GALT deficiency'));

  assert.equal(drafts[1].options.length, 4);
  assert.equal(drafts[1].correctAnswer, 'B');
});

test('parseRawMCQText returns 0 false-positive questions on specification documents without MCQ options', () => {
  const specOutline = `
1. Architecture Overview
1.1 System Requirements
A. Frontend Portal
B. Admin Management
2. Security Policy
2.1 Role-Based Access Control
`;
  const drafts = parseRawMCQText(specOutline, 'spec.pdf');
  assert.equal(drafts.length, 0);
});

test('validateExtractedQuestion flags missing options, missing answer key, or duplicate option text', () => {
  const validWarnings = validateExtractedQuestion({
    questionText: 'Which stain is used for reticulocytes?',
    options: [
      { id: 'A', text: 'New methylene blue' },
      { id: 'B', text: 'Wright-Giemsa' },
      { id: 'C', text: 'Prussian blue' },
      { id: 'D', text: 'Sudan Black B' },
    ],
    correctAnswer: 'A',
    explanation: 'Supravital staining with New methylene blue precipitates ribosomal RNA.',
  });
  assert.equal(validWarnings.length, 0);

  const invalidWarnings = validateExtractedQuestion({
    questionText: 'Short?',
    options: [
      { id: 'A', text: 'Same' },
      { id: 'B', text: 'Same' },
    ],
    correctAnswer: '',
    explanation: '',
  });
  assert.ok(invalidWarnings.some((w) => w.includes('Only 2 options found')));
  assert.ok(invalidWarnings.some((w) => w.includes('Duplicate option text')));
  assert.ok(invalidWarnings.some((w) => w.includes('Missing or invalid correct answer key')));
});

test('inferCategoryFromContent maps questions to INITIAL_CATEGORIES units and subjects', () => {
  const cat = inferCategoryFromContent(
    'Patient presents with elevated troponin, AST, ALT, and bilirubin on spectrophotometry.'
  );
  const unitObj = INITIAL_CATEGORIES.find((u) => u.name === cat.unit);
  assert.ok(unitObj, `Expected unit "${cat.unit}" to exist in INITIAL_CATEGORIES`);
  const subjectObj = unitObj?.subjects.find((s) => s.name === cat.subject);
  assert.ok(subjectObj, `Expected subject "${cat.subject}" to exist in unit "${cat.unit}"`);
});

test('generateNextQuestionCode increments from highest existing LAB-XXXX code without collision', () => {
  const existing = [{ code: 'LAB-0005' }, { code: 'LAB-0040' }, { code: 'LAB-0012' }];
  assert.equal(generateNextQuestionCode(existing, 0), 'LAB-0041');
  assert.equal(generateNextQuestionCode(existing, 4), 'LAB-0045');
});

test('parseCSVToMCQ reads the trailing HighYield column and defaults to false when absent', () => {
  const header =
    'QuestionStem,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Explanation,Reference,Unit,Subject,Topic,Difficulty,ExamCategories,HighYield';
  const flagged =
    'Which analyte is the gold standard for myocardial infarction?,Troponin,Myoglobin,CK-MB,LDH,A,Rationale,Tietz,Clinical Chemistry,Cardiac Markers,Troponin,Conceptual,ASCP,Yes';
  const unflagged =
    'Which anticoagulant is used for coagulation studies?,EDTA,Citrate,Heparin,Oxalate,B,Rationale,CLSI,Hematology,Coagulation,PT,Conceptual,NHPC,';

  const drafts = parseCSVToMCQ([header, flagged, unflagged].join('\n'));

  assert.equal(drafts.length, 2);
  assert.equal(drafts[0].isHighYield, true);
  assert.equal(drafts[1].isHighYield, false);
});

test('parseCSVToMCQ leaves exam categories empty when the column is blank or unrecognised', () => {
  const header =
    'QuestionStem,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Explanation,Reference,Unit,Subject,Topic,Difficulty,ExamCategories,HighYield';
  const blank =
    'Which analyte is the gold standard for myocardial infarction?,Troponin,Myoglobin,CK-MB,LDH,A,Rationale,Tietz,Clinical Chemistry,Cardiac Markers,Troponin,Conceptual,,Yes';
  const unknown =
    'Which anticoagulant is used for coagulation studies?,EDTA,Citrate,Heparin,Oxalate,B,Rationale,CLSI,Hematology,Coagulation,PT,Conceptual,BOGUS,';
  const tagged =
    'Which stain is used for reticulocytes?,New methylene blue,Wright-Giemsa,Prussian blue,Sudan Black B,A,Rationale,CLSI,Hematology,RBC,Stains,Conceptual,ascp; nhpc,';

  const drafts = parseCSVToMCQ([header, blank, unknown, tagged].join('\n'));

  assert.equal(drafts.length, 3);
  // No implicit ASCP/NHPC fallback: an untagged upload stays General.
  assert.deepEqual(drafts[0].examCategories, []);
  assert.deepEqual(drafts[1].examCategories, []);
  // Known values are normalised and kept in canonical order.
  assert.deepEqual(drafts[2].examCategories, ['ASCP', 'NHPC']);
});

test('parseCSVToMCQ reads an optional trailing PastPaper column', () => {
  const header =
    'QuestionStem,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Explanation,Reference,Unit,Subject,Topic,Difficulty,ExamCategories,HighYield,PastPaper';
  const withPaper =
    'Which analyte is the gold standard for myocardial infarction?,Troponin,Myoglobin,CK-MB,LDH,A,Rationale,Tietz,Clinical Chemistry,Cardiac Markers,Troponin,Conceptual,ASCP,Yes,ASCP 2024';
  const withoutPaper =
    'Which anticoagulant is used for coagulation studies?,EDTA,Citrate,Heparin,Oxalate,B,Rationale,CLSI,Hematology,Coagulation,PT,Conceptual,NHPC,,';
  const drafts = parseCSVToMCQ([header, withPaper, withoutPaper].join('\n'));
  assert.equal(drafts[0].pastPaper, 'ASCP 2024');
  assert.equal(drafts[1].pastPaper, undefined);
});

test('parseRawMCQText detects explicit "Exam Categories: ASCP; NHPC" metadata line and does not leak it into question stem', () => {
  const rawText = `
Exam Categories: ASCP; NHPC

1. What is the normal fasting plasma glucose level in a healthy adult?
A) 70-99 mg/dL
B) 100-125 mg/dL
C) 126-140 mg/dL
D) 140-200 mg/dL
Answer: A
Explanation: Normal fasting blood glucose according to ADA guidelines is 70 to 99 mg/dL.
`;

  const drafts = parseRawMCQText(rawText, 'General_Document.pdf');
  assert.equal(drafts.length, 1);
  assert.deepEqual(drafts[0].examCategories, ['ASCP', 'NHPC']);
  assert.ok(!drafts[0].questionText.includes('Exam Categories'));
  assert.ok(!drafts[0].explanation.includes('Exam Categories'));
});

test('parseRawMCQText detects exam category from title such as "ASCP 2024" or source filename', () => {
  const rawTextWithTitle = `
ASCP 2024 Clinical Pathology Board Review

1. Which biomarker is most sensitive for myocardial injury?
A) Cardiac Troponin I
B) Myoglobin
C) CK-MB
D) AST
Answer: A
Explanation: Cardiac troponins I and T are the gold standard biomarkers for myocardial necrosis.
`;

  const draftsFromTitle = parseRawMCQText(rawTextWithTitle, 'Document.pdf');
  assert.equal(draftsFromTitle.length, 1);
  assert.deepEqual(draftsFromTitle[0].examCategories, ['ASCP']);

  const rawTextWithoutTitle = `
1. Which biomarker is most sensitive for myocardial injury?
A) Cardiac Troponin I
B) Myoglobin
C) CK-MB
D) AST
Answer: A
Explanation: Cardiac troponins I and T are the gold standard biomarkers for myocardial necrosis.
`;

  const draftsFromFilename = parseRawMCQText(rawTextWithoutTitle, 'ASCP_2024_Board_Review.pdf');
  assert.equal(draftsFromFilename.length, 1);
  assert.deepEqual(draftsFromFilename[0].examCategories, ['ASCP']);
});

test('parseRawMCQText strictly avoids tagging bare "PSC" in question text (Primary Sclerosing Cholangitis)', () => {
  const rawText = `
1. A 40-year-old male with ulcerative colitis presents with pruritus and jaundice. Imaging shows beaded bile ducts, diagnosing PSC. Which laboratory finding is most characteristic?
A) Markedly elevated alkaline phosphatase
B) Decreased total bilirubin
C) Normal serum GGT
D) Elevated lipase > 1000 U/L
Answer: A
Explanation: Primary sclerosing cholangitis (PSC) is an inflammatory cholestatic liver disorder presenting with elevated ALP and GGT.
`;

  const drafts = parseRawMCQText(rawText, 'Clinical_Liver_Disease.pdf');
  assert.equal(drafts.length, 1);
  // Must NOT mis-tag PSC liver disease as PSC examination category
  assert.deepEqual(drafts[0].examCategories, []);
});

test('parseRawMCQText supports per-question explicit "Exam Category: PSC" metadata line', () => {
  const rawText = `
1. A question intended specifically for the Public Service Commission exam:
A) Option A text
B) Option B text
C) Option C text
D) Option D text
Answer: A
Explanation: Detailed rationale for this question.
Exam Category: PSC
`;

  const drafts = parseRawMCQText(rawText, 'Questions.pdf');
  assert.equal(drafts.length, 1);
  assert.deepEqual(drafts[0].examCategories, ['PSC']);
  assert.ok(!drafts[0].explanation.includes('Exam Category: PSC'));
});
