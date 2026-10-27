/**
 * Pure parsing, validation, duplicate detection, and import/export utilities
 */
import { ExtractedMCQDraft, MCQOption, MCQQuestion, DifficultyLevel, ExamCategory, TableData } from '../types';

/**
 * Calculates string similarity using word-level Jaccard index
 */
export function calculateJaccardSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(
    textA
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097f\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const wordsB = new Set(
    textB
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097f\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  if (wordsA.size === 0 && wordsB.size === 0) return 1.0;
  if (wordsA.size === 0 || wordsB.size === 0) return 0.0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : Number((intersection / union).toFixed(3));
}

/**
 * Checks an extracted question against existing questions to detect potential duplicates
 */
export function findDuplicateQuestion(
  newQuestionStem: string,
  existingQuestions: MCQQuestion[],
  threshold = 0.65
): { existingQuestionId: string; existingCode: string; similarityScore: number } | undefined {
  if (!newQuestionStem || !newQuestionStem.trim()) return undefined;
  let highestMatch: { existingQuestionId: string; existingCode: string; similarityScore: number } | undefined;

  for (const q of existingQuestions) {
    const similarity = calculateJaccardSimilarity(newQuestionStem, q.questionText);
    if (similarity >= threshold) {
      if (!highestMatch || similarity > highestMatch.similarityScore) {
        highestMatch = {
          existingQuestionId: q.id,
          existingCode: q.code,
          similarityScore: similarity,
        };
      }
    }
  }

  return highestMatch;
}

/**
 * Generates the next sequential LAB-XXXX question code without collisions after deletions
 */
export function generateNextQuestionCode(existingQuestions: Array<{ code?: string }>, offset = 0): string {
  let maxNum = existingQuestions.length;
  for (const q of existingQuestions) {
    const m = q.code?.match(/^LAB-(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return `LAB-${String(maxNum + 1 + offset).padStart(4, '0')}`;
}

/**
 * Validates an extracted question and returns a list of error/warning messages
 */
export function validateExtractedQuestion(draft: Partial<ExtractedMCQDraft>): string[] {
  const errors: string[] = [];

  if (!draft.questionText || draft.questionText.trim().length < 15) {
    errors.push('Question stem is missing or too short (minimum 15 characters).');
  }

  const options = draft.options || [];
  if (options.length < 2) {
    errors.push('Question requires at least 2 options.');
  } else if (options.length < 4) {
    errors.push(`Only ${options.length} options found (standard is 4 options A–D).`);
  }

  const emptyOption = options.find((o) => !o.text || o.text.trim().length === 0);
  if (emptyOption) {
    errors.push(`Option ${emptyOption.id} has empty text.`);
  }

  // Check for duplicate option texts within the same question
  const seenOptionTexts = new Map<string, string>();
  for (const opt of options) {
    const norm = (opt.text || '').trim().toLowerCase();
    if (norm.length > 0) {
      const prevId = seenOptionTexts.get(norm);
      if (prevId) {
        errors.push(`Duplicate option text between Option ${prevId} and Option ${opt.id}.`);
      } else {
        seenOptionTexts.set(norm, opt.id);
      }
    }
  }

  if (!draft.correctAnswer || !['A', 'B', 'C', 'D', 'E'].includes(draft.correctAnswer)) {
    errors.push('Missing or invalid correct answer key.');
  } else {
    const hasMatchingOption = options.some((o) => o.id === draft.correctAnswer);
    if (!hasMatchingOption) {
      errors.push(`Answer key '${draft.correctAnswer}' does not match any existing option.`);
    }
  }

  if (!draft.explanation || draft.explanation.trim().length < 10) {
    errors.push('Clinical explanation is missing or incomplete.');
  } else if (draft.correctAnswer && ['A', 'B', 'C', 'D', 'E'].includes(draft.correctAnswer)) {
    // Check for inconsistent answer key between explanation text and selected answer key
    const expMatch = draft.explanation.match(
      /\b(?:correct\s+answer\s+is|answer\s+is\s+option|option\s+([A-E])\s+is\s+correct)\s*(?:option\s*)?([A-E])?\b/i
    );
    const mentionedKey = (expMatch?.[1] || expMatch?.[2] || '').toUpperCase();
    if (mentionedKey && ['A', 'B', 'C', 'D', 'E'].includes(mentionedKey) && mentionedKey !== draft.correctAnswer) {
      errors.push(
        `Inconsistent answer key: Explanation indicates Option ${mentionedKey}, but answer key is '${draft.correctAnswer}'.`
      );
    }
  }

  if (
    draft.questionText &&
    !draft.imageUrl &&
    /\b(?:figure\s+below|image\s+below|shown\s+in\s+the\s+(?:figure|image|photograph|micrograph)|blood\s+smear\s+shown|pictured\s+below)\b/i.test(
      draft.questionText
    )
  ) {
    errors.push('Question stem references an image or figure: verify or attach diagnostic image before publishing.');
  }

  if (typeof draft.confidenceScore === 'number' && draft.confidenceScore < 0.75) {
    errors.push(`Low extraction confidence (${Math.round(draft.confidenceScore * 100)}%): manual review required.`);
  }

  return errors;
}

/**
 * Suggests default category and difficulty based on medical keywords in the question stem.
 * All returned Unit, Subject, and Topic names match INITIAL_CATEGORIES in src/data/categories.ts.
 */
export function inferCategoryFromContent(text: string): {
  unit: string;
  subject: string;
  topic: string;
  difficulty: DifficultyLevel;
} {
  const lower = text.toLowerCase();

  // Clinical Chemistry
  if (lower.includes('troponin') || lower.includes('ck-mb') || lower.includes('cardiac') || lower.includes('myocardial') || lower.includes('bnp')) {
    return { unit: 'Clinical Chemistry', subject: 'Lipid & Cardiac Markers', topic: 'High-Sensitivity Troponin', difficulty: 'Conceptual' };
  }
  if (lower.includes('bilirubin') || lower.includes('alt') || lower.includes('ast') || lower.includes('alkaline phosphatase') || lower.includes('liver') || lower.includes('jaundice') || lower.includes('ggt') || lower.includes('amylase') || lower.includes('lipase')) {
    return { unit: 'Clinical Chemistry', subject: 'Clinical Enzymology & Hepatic Function', topic: 'Transaminases (ALT/AST)', difficulty: 'Conceptual' };
  }
  if (lower.includes('creatinine') || lower.includes('bun') || lower.includes('glomerular') || lower.includes('egfr') || lower.includes('urea') || lower.includes('electrolyte') || lower.includes('anion gap') || lower.includes('acidosis')) {
    return { unit: 'Clinical Chemistry', subject: 'Renal Function & Electrolytes', topic: 'Creatinine Clearance & eGFR', difficulty: 'Memory-based' };
  }
  if (lower.includes('glucose') || lower.includes('hba1c') || lower.includes('insulin') || lower.includes('diabetes') || lower.includes('ketoacidosis') || lower.includes('thyroid') || lower.includes('tsh') || lower.includes('cortisol')) {
    return { unit: 'Clinical Chemistry', subject: 'Endocrinology & Metabolism', topic: 'Glycemic Control & HbA1c', difficulty: 'Conceptual' };
  }

  // Hematology & Hemostasis
  if (lower.includes('leukemia') || lower.includes('blast') || lower.includes('auer rod') || lower.includes('myeloid') || lower.includes('philadelphia') || lower.includes('lymphoma')) {
    return { unit: 'Hematology & Hemostasis', subject: 'Leukocytes & Leukemias', topic: 'Acute Myeloid Leukemia (AML)', difficulty: 'Advanced' };
  }
  if (lower.includes('anemia') || lower.includes('ferritin') || lower.includes('microcytic') || lower.includes('macrocytic') || lower.includes('mcv') || lower.includes('reticulocyte') || lower.includes('sickle') || lower.includes('hemoglobin')) {
    return { unit: 'Hematology & Hemostasis', subject: 'Erythrocytes & Anemias', topic: 'Iron Deficiency vs ACD', difficulty: 'Conceptual' };
  }
  if (lower.includes('inr') || lower.includes('pt ') || lower.includes('prothrombin') || lower.includes('aptt') || lower.includes('factor viii') || lower.includes('factor xiii') || lower.includes('coagulation') || lower.includes('heparin') || lower.includes('willebrand') || lower.includes('platelet')) {
    return { unit: 'Hematology & Hemostasis', subject: 'Platelets & Hemostasis', topic: 'aPTT & Intrinsic Pathway', difficulty: 'Advanced' };
  }

  // Immunohematology (Blood Banking)
  if (lower.includes('rh ') || lower.includes('rh-') || lower.includes('anti-d') || lower.includes('abo') || lower.includes('crossmatch') || lower.includes('transfusion') || lower.includes('coombs') || lower.includes('antiglobulin') || lower.includes('blood group')) {
    return { unit: 'Immunohematology (Blood Banking)', subject: 'Blood Group Systems & Transfusion', topic: 'ABO/Rh Discrepancies & Resolutions', difficulty: 'Advanced' };
  }

  // Clinical Microbiology & Parasitology
  if (lower.includes('plasmodium') || lower.includes('malaria') || lower.includes('babesia') || lower.includes('parasite') || lower.includes('trophozoite') || lower.includes('ova') || lower.includes('fungi') || lower.includes('yeast') || lower.includes('candida') || lower.includes('aspergillus')) {
    return { unit: 'Clinical Microbiology & Parasitology', subject: 'Diagnostic Parasitology & Mycology', topic: 'Blood Parasites (Plasmodium, Babesia)', difficulty: 'Conceptual' };
  }
  if (lower.includes('mic') || lower.includes('kirby-bauer') || lower.includes('carbapenem') || lower.includes('esbl') || lower.includes('mrsa') || lower.includes('vancomycin') || lower.includes('susceptibility')) {
    return { unit: 'Clinical Microbiology & Parasitology', subject: 'Antimicrobial Susceptibility', topic: 'ESBL & Carbapenemase Detection', difficulty: 'Advanced' };
  }
  if (lower.includes('gram-negative') || lower.includes('gram-positive') || lower.includes('staphylococcus') || lower.includes('pseudomonas') || lower.includes('culture') || lower.includes('macconkey') || lower.includes('oxidase') || lower.includes('coagulase') || lower.includes('bacteria') || lower.includes('bacillus')) {
    return { unit: 'Clinical Microbiology & Parasitology', subject: 'Diagnostic Bacteriology', topic: 'Gram-Positive Cocci Identification', difficulty: 'Memory-based' };
  }

  // Immunology & Serology
  if (lower.includes('ana ') || lower.includes('antinuclear') || lower.includes('rheumatoid') || lower.includes('autoantibod') || lower.includes('anca') || lower.includes('complement') || lower.includes('cd4') || lower.includes('cd28') || lower.includes('t cell') || lower.includes('elisa') || lower.includes('hbsag') || lower.includes('syphilis') || lower.includes('hiv')) {
    return { unit: 'Immunology & Serology', subject: 'Autoimmune & Rheumatologic Serology', topic: 'Antinuclear Antibodies (ANA Patterns)', difficulty: 'Conceptual' };
  }

  // Urinalysis & Body Fluids
  if (lower.includes('urinalysis') || lower.includes('urine') || lower.includes('urobilinogen') || lower.includes('cerebrospinal') || lower.includes('csf') || lower.includes('synovial') || lower.includes('pleural') || lower.includes('ascites') || lower.includes('casts')) {
    return { unit: 'Urinalysis & Body Fluids', subject: 'Clinical Urinalysis', topic: 'Reagent Strip Reactions & Interferences', difficulty: 'Conceptual' };
  }

  // Molecular Diagnostics
  if (lower.includes('pcr') || lower.includes('rt-pcr') || lower.includes('sequencing') || lower.includes('reverse transcriptase') || lower.includes('telomerase') || lower.includes('chromosome') || lower.includes('translocation') || lower.includes('bcr-abl') || lower.includes('dna') || lower.includes('mrna')) {
    return { unit: 'Molecular Diagnostics', subject: 'Molecular Techniques & Applications', topic: 'Real-Time Quantitative PCR', difficulty: 'Advanced' };
  }

  // Laboratory Operations & QA
  if (lower.includes('westgard') || lower.includes('levey-jennings') || lower.includes('systematic error') || lower.includes('random error') || lower.includes('standard deviation') || lower.includes('quality control') || lower.includes('analyzer') || lower.includes('carryover') || lower.includes('automation') || lower.includes('segmented flow') || lower.includes('spectrophotometer') || lower.includes('reflectance')) {
    return { unit: 'Laboratory Operations & QA', subject: 'Statistical Quality Control', topic: 'Westgard Multirule Evaluation', difficulty: 'Conceptual' };
  }

  return { unit: 'Clinical Chemistry', subject: 'Clinical Enzymology & Hepatic Function', topic: 'Transaminases (ALT/AST)', difficulty: 'Conceptual' };
}

const DEVANAGARI_OPTION_MAP: Record<string, 'A' | 'B' | 'C' | 'D' | 'E'> = {
  क: 'A',
  ख: 'B',
  ग: 'C',
  घ: 'D',
  ङ: 'E',
};

/**
 * Matches an option line such as:
 * "A) Text", "A. Text", "(A) Text", "[A] Text", "• A. Text", "☐ A) Text", "☐ क) Text"
 * Avoids matching species abbreviations like "E. coli" or explanation bullets like "• A is incorrect:"
 */
function matchOptionLine(line: string): { id: 'A' | 'B' | 'C' | 'D' | 'E'; text: string } | null {
  const trimmed = line.replace(/^[\s•☐☑▪▸❖➢➤\-–]+/, '').trim();

  // Check Devanagari options क), ख), ग), घ), ङ)
  const devMatch = trimmed.match(/^[\(\[]?([कखगघङ])[\)\]\.\:]\s*(.*)/);
  if (devMatch) {
    const mapped = DEVANAGARI_OPTION_MAP[devMatch[1]];
    if (mapped) {
      return { id: mapped, text: (devMatch[2] || '').trim() };
    }
  }

  // Match (A), [A], A), A] with optional space, or A., A: with required space
  const m = trimmed.match(/^(\([A-Ea-e]\)|\[[A-Ea-e]\]|[A-Ea-e][\)\]])\s*(.*)|^([A-Ea-e][\.\:])(?:\s+(.*)|$)/);
  if (!m) return null;

  const token = m[1] || m[3];
  const rest = (m[2] ?? m[4] ?? '').trim();
  const letter = token.replace(/[\(\)\[\]\.\:]/g, '').toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';

  // Guard against taxonomic species abbreviations like "E. coli", "C. difficile", "A. baumannii", "B. cepacia"
  if (token.endsWith('.') && /^[a-z]{3,}\b/.test(rest)) {
    return null;
  }

  // Guard against "A: 2+" inside lab values unless it's a true option
  if (token.endsWith(':') && /^\d+\+/.test(rest)) {
    return null;
  }

  return { id: letter, text: rest };
}

/**
 * Expands lines that contain inline options (e.g. "...? A. Opt1 B. Opt2 C. Opt3 D. Opt4"
 * or "A. Opt1 B. Opt2 C. Opt3 D. Opt4") into individual lines.
 */
function expandInlineOptionsInText(text: string): string {
  const rawLines = text.split(/\r?\n/);
  const expanded: string[] = [];
  let prevLineWasInlineOptions = false;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      expanded.push('');
      prevLineWasInlineOptions = false;
      continue;
    }

    // Don't split inline options on Answer/Explanation lines
    if (/^(?:[•☐▪\-]\s*)?(?:(?:\d+[\.\)]\s*)?(?:Correct\s*Answer|Answer|Ans|Explanation|Rationale|Reference|Ref))\b/i.test(trimmed)) {
      expanded.push(trimmed);
      prevLineWasInlineOptions = false;
      continue;
    }

    // Check if the line contains at least two inline option markers like "A. ... B. ..." or is a wrapped continuation of inline options with "D. ..."
    if (
      /(?:^|\s)[A][\.\)]\s+\S[\s\S]*?\s+[B][\.\)]\s+\S/.test(trimmed) ||
      (prevLineWasInlineOptions && /\s+[C-E][\.\)]\s+[A-Z0-9]/.test(trimmed))
    ) {
      const splitLine = trimmed.replace(/\s+(?=[A-E][\.\)]\s+\S)/g, '\n');
      for (const part of splitLine.split('\n')) {
        if (part.trim()) expanded.push(part.trim());
      }
      prevLineWasInlineOptions = true;
    } else {
      expanded.push(trimmed);
      prevLineWasInlineOptions = false;
    }
  }

  return expanded.join('\n');
}

/**
 * Extracts an end-of-document Answer Key table if present, returning the stripped body text
 * and a map of QuestionNumber -> CorrectAnswer ('A'-'E').
 */
function extractEndOfDocAnswerKey(text: string): {
  cleanedText: string;
  answerKeyMap: Map<number, 'A' | 'B' | 'C' | 'D' | 'E'>;
} {
  const answerKeyMap = new Map<number, 'A' | 'B' | 'C' | 'D' | 'E'>();
  const lines = text.split(/\r?\n/);

  // Search in the last 35% of lines for a standalone "Answer key" / "Answers" header
  const searchStart = Math.floor(lines.length * 0.6);
  let headerLineIdx = -1;

  for (let i = searchStart; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^(?:Answer\s*Key|Answers|Answer\s*Table|Key\s*to\s*Questions)\s*[:\-]?$/i.test(t)) {
      headerLineIdx = i;
      break;
    }
  }

  if (headerLineIdx === -1) {
    return { cleanedText: text, answerKeyMap };
  }

  const tailText = lines.slice(headerLineIdx + 1).join('\n');
  const pairRegex = /\b(\d{1,3})\s*[\.\:\)\-]?\s*(?:\b([A-Ea-e])\b|([कखगघङ]))/g;
  let match: RegExpExecArray | null;
  while ((match = pairRegex.exec(tailText)) !== null) {
    const qNum = parseInt(match[1], 10);
    const rawAns = match[2] || match[3];
    const ans = (DEVANAGARI_OPTION_MAP[rawAns] || rawAns.toUpperCase()) as 'A' | 'B' | 'C' | 'D' | 'E';
    if (qNum >= 1 && qNum <= 500) {
      answerKeyMap.set(qNum, ans);
    }
  }

  if (answerKeyMap.size >= 2) {
    return {
      cleanedText: lines.slice(0, headerLineIdx).join('\n'),
      answerKeyMap,
    };
  }

  return { cleanedText: text, answerKeyMap: new Map() };
}

interface RawQuestionChunk {
  questionNumber?: number;
  lines: string[];
}

/**
 * Segments pre-processed lines into individual question chunks, supporting both:
 * 1. Numbered question documents (1., 2., Q1., Question 1:) with protection against mid-stem numbers & tables
 * 2. Unnumbered question documents (like web mcqs.pdf) anchored by Option A..D groups
 */
function segmentIntoQuestionChunks(cleanedText: string): RawQuestionChunk[] {
  const allLines = cleanedText.split(/\r?\n/).map((l) => l.trim());
  const nonEmptyLines = allLines.filter((l) => l.length > 0);
  if (nonEmptyLines.length === 0) return [];

  // Check if the document uses numbered questions
  const numberedHeaderRegex = /^(?:Q(?:uestion)?\s*#?\s*(\d{1,3})[\.\:\)]?|\[(\d{1,3})\]|(\d{1,3})[\.\:\)])(?:\s+(.*)|$)/i;

  // First pass: test how many sequential numbered questions exist
  const numberedChunks: RawQuestionChunk[] = [];
  let currentChunk: RawQuestionChunk | null = null;
  let currentHasOptionA = false;
  let currentHasOptionB = false;

  for (let i = 0; i < nonEmptyLines.length; i++) {
    const line = nonEmptyLines[i];
    const opt = matchOptionLine(line);
    if (opt?.id === 'A') currentHasOptionA = true;
    if (opt?.id === 'B' && currentHasOptionA) currentHasOptionB = true;

    const numMatch = !opt ? line.match(numberedHeaderRegex) : null;
    if (numMatch) {
      const qNum = parseInt(numMatch[1] || numMatch[2] || numMatch[3], 10);
      const restOfLine = (numMatch[4] || '').trim();

      // Ignore "2. Explanation of the correct answer" or "3. Explanation of the distractors"
      const isExplanationHeader = /^Explanation\b/i.test(restOfLine);

      // Ignore numbered list items or matching-table rows inside a question stem before options A & B have appeared
      const isInsideIncompleteQuestion = currentChunk !== null && !(currentHasOptionA && currentHasOptionB);

      if (!isExplanationHeader && !isInsideIncompleteQuestion) {
        const isFirst = currentChunk === null;
        const prevCompletedOptions = currentHasOptionA && currentHasOptionB;

        if (isFirst || prevCompletedOptions) {
          if (currentChunk && currentChunk.lines.length > 0) {
            numberedChunks.push(currentChunk);
          }
          currentChunk = {
            questionNumber: qNum,
            lines: restOfLine ? [restOfLine] : [],
          };
          currentHasOptionA = false;
          currentHasOptionB = false;
          continue;
        }
      }
    }

    if (currentChunk) {
      currentChunk.lines.push(line);
    }
  }
  if (currentChunk && currentChunk.lines.length > 0) {
    numberedChunks.push(currentChunk);
  }

  // Option-Group (A -> B -> C -> D) segmentation for unnumbered or single-block MCQ documents
  // Find all line indices where an Option A starts and is followed within 6 lines by Option B
  const optionALineIndices: number[] = [];
  for (let i = 0; i < nonEmptyLines.length; i++) {
    const opt = matchOptionLine(nonEmptyLines[i]);
    if (opt?.id === 'A') {
      // Look ahead up to 6 lines for Option B
      let foundB = false;
      for (let j = i + 1; j <= Math.min(nonEmptyLines.length - 1, i + 6); j++) {
        if (matchOptionLine(nonEmptyLines[j])?.id === 'B') {
          foundB = true;
          break;
        }
      }
      if (foundB) {
        optionALineIndices.push(i);
      }
    }
  }

  // Use numberedChunks if the document genuinely uses numbered questions (comparable count of option-bearing chunks to option groups)
  const validNumberedChunks = numberedChunks.filter(
    (c) =>
      c.lines.some((l) => matchOptionLine(l)?.id === 'A') &&
      c.lines.some((l) => matchOptionLine(l)?.id === 'B')
  );
  if (validNumberedChunks.length >= 2 && validNumberedChunks.length >= optionALineIndices.length * 0.7) {
    return numberedChunks;
  }

  if (optionALineIndices.length <= 1) {
    return validNumberedChunks.length > 0 ? numberedChunks : [{ lines: nonEmptyLines }];
  }

  // Determine start line of each question stem preceding each Option A
  const questionStartIndices: number[] = new Array(optionALineIndices.length).fill(0);
  questionStartIndices[0] = 0;

  for (let k = 1; k < optionALineIndices.length; k++) {
    const prevOptA = optionALineIndices[k - 1];
    const currOptA = optionALineIndices[k];

    // Find where the previous question's options end (last option C/D/E before Answer/Explanation or before currOptA)
    let prevLastOptionLine = prevOptA;
    let hasAnswerOrExplanationAfterOptions = false;
    for (let i = prevOptA + 1; i < currOptA; i++) {
      const line = nonEmptyLines[i];
      if (/^(?:[•☐▪\-]\s*)?(?:(?:\d+[\.\)]\s*)?(?:Correct\s*Answer|Answer|Ans|Key|Explanation|Rationale|Discussion|Reference|Ref))\b/i.test(line)) {
        hasAnswerOrExplanationAfterOptions = true;
        break;
      }
      if (matchOptionLine(line)) {
        prevLastOptionLine = i;
      }
    }

    // If the previous question had no Answer/Explanation block, the new question stem starts right after the last option
    if (!hasAnswerOrExplanationAfterOptions) {
      questionStartIndices[k] = prevLastOptionLine + 1;
      continue;
    }

    // Walk backwards from currOptA - 1 to find the start of question k's stem
    let stemStart = currOptA - 1;
    while (stemStart > prevLastOptionLine + 1) {
      const prevLine = nonEmptyLines[stemStart - 1];
      // Stop if prevLine is an Answer/Explanation/Distractor bullet or Reference citation
      if (
        /^(?:[•☐▪\-]\s*)?(?:(?:\d+[\.\)]\s*)?(?:Correct\s*Answer|Answer|Ans|Key|Explanation|Rationale|Discussion|Reference|Ref))\b/i.test(
          prevLine
        ) ||
        /^(?:[•☐▪\-]\s*)?[A-E]\s+is\s+(?:incorrect|correct)\b/i.test(prevLine) ||
        /^(?:i{1,3}|iv|v)[\.\)]\s+/i.test(prevLine) ||
        /\)\s*$/.test(prevLine)
      ) {
        break;
      }
      // If prevLine ends with a period "." and the current stemStart line begins with an interrogative or capital starter,
      // check that we don't split a 2-sentence question stem (a stem is typically 1-4 lines before currOptA)
      if (
        /\.\s*$/.test(prevLine) &&
        /^(?:What|Why|Which|How|When|Where|Who|In\s+|During\s+|According\s+|Contrast\s+|A\s+\d+|A\s+technologist|A\s+medical|A\s+patient|A\s+clinical|An\s+automated|To\s+enhance|Automated\s+sample)\b/.test(
          nonEmptyLines[stemStart]
        )
      ) {
        // Check if prevLine itself was the first sentence of a 2-sentence clinical stem (e.g., "During a routine morning...")
        const prevPrevLine = stemStart - 2 > prevLastOptionLine ? nonEmptyLines[stemStart - 2] : '';
        const prevIsClinicalOpener = /^(?:During\s+a\s+routine|A\s+\d+-year-old|A\s+technologist|In\s+a\s+clinical)\b/.test(
          prevLine
        );
        if (!prevIsClinicalOpener && !(/^(?:During\s+a\s+routine|A\s+\d+-year-old|A\s+technologist)\b/.test(prevPrevLine))) {
          break;
        }
      }
      stemStart--;
    }

    questionStartIndices[k] = Math.max(prevLastOptionLine + 1, stemStart);
  }

  const unnumberedChunks: RawQuestionChunk[] = [];
  for (let k = 0; k < optionALineIndices.length; k++) {
    const start = questionStartIndices[k];
    const end = k + 1 < optionALineIndices.length ? questionStartIndices[k + 1] : nonEmptyLines.length;
    unnumberedChunks.push({
      questionNumber: k + 1,
      lines: nonEmptyLines.slice(start, end),
    });
  }

  return unnumberedChunks;
}

/**
 * Intelligent rule-based parser that handles plain text or OCR/ToUnicode dumps from PDFs
 */
export function parseRawMCQText(
  rawText: string,
  sourceDocument = 'Uploaded_Document.pdf',
  existingQuestions: MCQQuestion[] = []
): ExtractedMCQDraft[] {
  const drafts: ExtractedMCQDraft[] = [];
  if (!rawText || !rawText.trim()) return drafts;

  // 1. Extract End-of-Document Answer Key if present
  const { cleanedText, answerKeyMap } = extractEndOfDocAnswerKey(rawText);

  // 2. Expand inline options ("A. ... B. ... C. ... D. ...") onto separate lines
  const expandedText = expandInlineOptionsInText(cleanedText);

  // 3. Segment into question chunks
  const chunks = segmentIntoQuestionChunks(expandedText);

  let counter = 1;

  for (const chunk of chunks) {
    const lines = chunk.lines.map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    let questionStem = '';
    let imageUrl = '';
    const optionsMap: Partial<Record<'A' | 'B' | 'C' | 'D' | 'E', string>> = {};
    let currentOptionKey: 'A' | 'B' | 'C' | 'D' | 'E' | null = null;
    let answerKey: 'A' | 'B' | 'C' | 'D' | 'E' | '' = '';
    let answerOptionTextHint = '';
    let explanation = '';
    let reference = '';
    let clinicalCase = '';

    let state: 'stem' | 'case' | 'options' | 'answer_pending' | 'answer' | 'explanation' | 'ref' = 'stem';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Extract attached diagnostic figure marker if present
      const figMatch = line.match(/\[ATTACHED_FIGURE:\s*(data:image\/[^\]]+)\]/i);
      if (figMatch) {
        if (!imageUrl) {
          imageUrl = figMatch[1].trim();
        }
        line = line.replace(/\[ATTACHED_FIGURE:\s*(data:image\/[^\]]+)\]/gi, '').trim();
        if (!line) {
          continue;
        }
      }

      // Strip leading document title headers on the very first question if present
      if (
        counter === 1 &&
        state === 'stem' &&
        !questionStem &&
        /^(?:BOARD\s+REVIEW|EXAMINATION\s+REVISION|PRACTICE\s+EXAM|MULTIPLE\s+CHOICE\s+QUESTIONS)\b/i.test(line)
      ) {
        continue;
      }

      // Check for Case vignette header
      if (state === 'stem' && /^case\s*(?:study|presentation|history)?\s*[:\-]/i.test(line)) {
        clinicalCase = line.replace(/^case\s*(?:study|presentation|history)?\s*[:\-]\s*/i, '');
        state = 'case';
        continue;
      }

      // Check for standalone "Correct answer" header where the actual letter is on the next line
      if (/^(?:[•☐▪\-]\s*)?(?:Correct\s*Answer|Answer|Ans|Key)\s*[:\-–]?\s*$/i.test(line)) {
        state = 'answer_pending';
        continue;
      }

      // If previous line was standalone "Correct answer", parse "• B. Segment partitioning..."
      if (state === 'answer_pending') {
        const pendingMatch = line.match(
          /^(?:[•☐☑▪▸\-]\s*)?[\(\[]?([A-Ea-eकखगघङ])[\)\]\.\:]?(?:\s+(.*)|$)/
        );
        if (pendingMatch) {
          const rawChar = pendingMatch[1];
          answerKey = (DEVANAGARI_OPTION_MAP[rawChar] || rawChar.toUpperCase()) as 'A' | 'B' | 'C' | 'D' | 'E';
          answerOptionTextHint = (pendingMatch[2] || '').trim();
          state = 'answer';
          continue;
        }
        state = 'answer';
      }

      // Check for single-line Answer Key pattern:
      // "Answer: B", "Ans: C", "Correct Answer: A. ...", "• Correct answer: B. Open system", "Correct answer : A ; Explanation..."
      const ansMatch = line.match(
        /^(?:[•☐▪\-]\s*)?(?:Correct\s*Answer|Answer|Ans|Correct|Key)\s*[:\-–]\s*[\(\[]?([A-Ea-eकखगघङ])(?![A-Za-z\u0900-\u097F])[\)\]\.\:]?\s*[;,\-–]?\s*(.*)$/i
      );
      if (ansMatch) {
        const rawChar = ansMatch[1];
        const trailing = (ansMatch[2] || '').trim();
        {
          answerKey = (DEVANAGARI_OPTION_MAP[rawChar] || rawChar.toUpperCase()) as 'A' | 'B' | 'C' | 'D' | 'E';
          // If trailing text is after a semicolon (e.g., "Correct answer : A ; Random access discrete analysis..."), treat it as explanation!
          if (line.includes(';') && trailing.length > 15) {
            explanation += (explanation ? ' ' : '') + trailing;
            state = 'explanation';
          } else {
            answerOptionTextHint = trailing;
            state = 'answer';
          }
          continue;
        }
      }

      // Check for text-based Answer Key pattern where the option text is written out without A/B/C/D prefix
      const textAnsMatch = line.match(
        /^(?:[•☐▪\-]\s*)?(?:Correct\s*Answer|Answer|Ans)\s*[:\-–]\s*(.+)$/i
      );
      if (textAnsMatch) {
        answerOptionTextHint = textAnsMatch[1].trim();
        state = 'answer';
        continue;
      }

      // Check for Explanation pattern:
      // "Explanation:", "2. Explanation of the correct answer ...", "• Explanation of the correct answer:", "Explanation In SFA...", "3. Explanation of the distractors"
      const expMatch = line.match(
        /^(?:[•☐▪\-]\s*)?(?:\d+[\.\)]\s*)?(?:Explanation(?:\s+of\s+the\s+(?:correct\s+answer|distractors))?|Rationale|Discussion|Clinical\s+Pearl)(?:\s*[:\-–]\s*|\s+|$)(.*)/i
      );
      if (expMatch) {
        const expContent = (expMatch[1] || '').trim();
        if (expContent && !/^of\s+the\s+distractors$/i.test(expContent)) {
          explanation += (explanation ? ' ' : '') + expContent;
        }
        state = 'explanation';
        continue;
      }

      // Check for Reference pattern: "Ref:", "Reference:", "Source:"
      const refMatch = line.match(/^(?:Reference|Ref|Source)\s*[:\-–]\s*(.*)/i);
      if (refMatch) {
        reference = (refMatch[1] || '').trim();
        state = 'ref';
        continue;
      }

      // Only match Option A-E when we are in 'stem', 'case', or 'options' state (NEVER inside explanation or ref!)
      if (state === 'stem' || state === 'case' || state === 'options') {
        const optMatch = matchOptionLine(line);
        if (optMatch) {
          currentOptionKey = optMatch.id;
          optionsMap[currentOptionKey] = optMatch.text;
          state = 'options';
          continue;
        }
      }

      // Handle multi-line continuations
      if (state === 'options' && currentOptionKey) {
        optionsMap[currentOptionKey] = ((optionsMap[currentOptionKey] || '') + ' ' + line).trim();
      } else if (state === 'explanation') {
        explanation += (explanation ? ' ' : '') + line;
      } else if (state === 'answer') {
        if (!answerKey && answerOptionTextHint) {
          answerOptionTextHint = (answerOptionTextHint + ' ' + line).trim();
        } else {
          // Only append to explanation if this line is not simply the wrapped continuation of the repeated correct option text
          const selectedOptText = answerKey ? (optionsMap[answerKey] || '').toLowerCase() : '';
          if (!selectedOptText || !selectedOptText.includes(line.toLowerCase())) {
            explanation += (explanation ? ' ' : '') + line;
          }
        }
      } else if (state === 'ref') {
        reference += (reference ? ' ' : '') + line;
      } else if (state === 'case') {
        clinicalCase += (clinicalCase ? ' ' : '') + line;
      } else {
        // Only strip leading question number on the first line of the stem so embedded table rows (1. Neutrophil...) stay intact
        const cleanLine = !questionStem
          ? line.replace(/^(?:Q(?:uestion)?\s*#?\s*\d+[\.\:\)]?|\[\d+\]|\d+[\.\:\)]\s+)/i, '')
          : line;
        if (cleanLine) {
          questionStem += (questionStem ? ' ' : '') + cleanLine;
        }
      }
    }

    // Extract trailing parenthetical textbook reference from explanation if reference is empty
    if (!reference && explanation) {
      const trailingRefMatch = explanation.match(/\(([^()]{10,160}(?:Chapter|Section|Ed\.|Edition|Lancet|Tietz|Henry|Rodak|CLSI|Vonderschmitt)[^()]*)\)\s*$/i);
      if (trailingRefMatch) {
        reference = trailingRefMatch[1].trim();
      }
    }

    // Look up answer key from End-of-Document Answer Key table if not found inline
    const qNum = chunk.questionNumber ?? counter;
    if (!answerKey && answerKeyMap.has(qNum)) {
      answerKey = answerKeyMap.get(qNum)!;
    }

    // Resolve text-only answerOptionTextHint against optionsMap if answerKey is still empty
    if (!answerKey && answerOptionTextHint) {
      const normHint = answerOptionTextHint.toLowerCase().replace(/\s+/g, ' ').trim();
      for (const id of ['A', 'B', 'C', 'D', 'E'] as const) {
        const optText = (optionsMap[id] || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (optText && (optText === normHint || optText.includes(normHint) || normHint.includes(optText))) {
          answerKey = id;
          break;
        }
      }
    }

    const optionsList: MCQOption[] = (['A', 'B', 'C', 'D', 'E'] as const)
      .map((id) => ({
        id,
        text: (optionsMap[id] || '').trim(),
      }))
      .filter((o) => o.text.length > 0);

    // Skip non-question noise blocks that have 0 options and no answer key
    if (optionsList.length === 0 && !answerKey) {
      continue;
    }

    // Skip prose/specification section outlines (e.g., "A. Heading ... B. Heading ...") that lack answer keys, explanations, and interrogative cues
    const avgOptionLength =
      optionsList.length > 0
        ? optionsList.reduce((sum, o) => sum + o.text.length, 0) / optionsList.length
        : 0;
    const hasInterrogativeCue =
      /[?\:_]|(?:\b(?:which|what|why|how|when|where|who|following|match|select|identify|most\s+likely|best\s+describes|correct|true|false|except)\b)/i.test(
        questionStem
      );
    if (!answerKey && !explanation && (avgOptionLength > 220 || !hasInterrogativeCue)) {
      continue;
    }

    // If still no answerKey, check if explanation starts by naming one of the option texts (e.g., "Sequential analyzers process...")
    let inferredFromExplanation = false;
    if (!answerKey && explanation && optionsList.length >= 2) {
      const expLower = explanation.toLowerCase();
      for (const opt of optionsList) {
        const optClean = opt.text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        if (optClean.length >= 6 && expLower.startsWith(optClean.slice(0, Math.min(18, optClean.length)))) {
          answerKey = opt.id;
          inferredFromExplanation = true;
          break;
        }
      }
    }

    if (!reference) {
      reference = `Extracted from ${sourceDocument}`;
    }

    const categoryInference = inferCategoryFromContent(`${questionStem} ${explanation}`);

    const hasCompleteOptions = optionsList.length >= 4;
    const hasExplicitAnswer = Boolean(answerKey) && !inferredFromExplanation;
    const hasExplanation = explanation.trim().length >= 10;

    let confidenceScore = 0.95;
    if (!hasExplicitAnswer || !hasCompleteOptions) {
      confidenceScore = 0.65;
    } else if (!hasExplanation) {
      confidenceScore = 0.85;
    }

    // Parse matching table or pipe-delimited table if present in questionStem
    let tableData: TableData | undefined;
    const pipeLines = chunk.lines.filter((l) => l.includes('|') && !matchOptionLine(l));
    if (pipeLines.length >= 2) {
      const parsedRows = pipeLines.map((l) =>
        l
          .split('|')
          .map((c) => c.trim())
          .filter((c) => c.length > 0)
      );
      if (parsedRows[0].length >= 2 && parsedRows.every((r) => r.length === parsedRows[0].length)) {
        tableData = {
          headers: parsedRows[0],
          rows: parsedRows.slice(1),
        };
        for (const pl of pipeLines) {
          questionStem = questionStem.replace(pl, '').trim();
        }
      }
    }

    if (!tableData && /\bMatch\s+the\b/i.test(questionStem)) {
      const colMatch = questionStem.match(
        /^(.*?)\s*Column\s+I\s*(\([^)]+\))?\s*Column\s+II\s*(\([^)]+\))?\s*(1\.\s+[\s\S]+)$/i
      );
      if (colMatch) {
        const stemIntro = colMatch[1].trim();
        const col1Header = `Column I ${colMatch[2] || ''}`.trim();
        const col2Header = `Column II ${colMatch[3] || ''}`.trim();
        const itemsBody = colMatch[4];
        const rowRegex = /(\d+\.\s+[^0-9]+?)\s+([A-E]\.\s+[^0-9]+?)(?=\s+\d+\.\s+|$)/g;
        const rows: string[][] = [];
        let rm: RegExpExecArray | null;
        while ((rm = rowRegex.exec(itemsBody)) !== null) {
          rows.push([rm[1].trim(), rm[2].trim()]);
        }
        if (rows.length >= 3) {
          questionStem = stemIntro;
          tableData = {
            headers: [col1Header, col2Header],
            rows,
          };
        }
      } else {
        // Also support space-separated matching tables like "# Inclusion Body Letter Virus 1 Negri bodies A Cytomegalovirus ..."
        const altMatch = questionStem.match(
          /^(.*?:)\s*(?:#\s*Inclusion\s+Body\s+Letter\s+Virus\s*)?(1[\.\s]+[\s\S]+)$/i
        );
        if (altMatch) {
          const stemIntro = altMatch[1].trim();
          const itemsBody = altMatch[2];
          const rowRegex = /(\d+[\.\s]+[^0-9]+?)\s+([A-E][\.\s]+[^0-9]+?)(?=\s+\d+[\.\s]+|$)/g;
          const rows: string[][] = [];
          let rm: RegExpExecArray | null;
          while ((rm = rowRegex.exec(itemsBody)) !== null) {
            rows.push([rm[1].trim(), rm[2].trim()]);
          }
          if (rows.length >= 3) {
            questionStem = stemIntro;
            tableData = {
              headers: ['Column I', 'Column II'],
              rows,
            };
          }
        }
      }
    }

    const draftItem: ExtractedMCQDraft = {
      id: `ext-${Date.now()}-${counter}`,
      tempCode: `EXT-${String(counter).padStart(4, '0')}`,
      questionText: questionStem.trim(),
      imageUrl: imageUrl || undefined,
      options: optionsList,
      correctAnswer: answerKey,
      explanation:
        explanation.trim() ||
        (answerKey
          ? `Correct Answer: Option ${answerKey}${
              optionsMap[answerKey] ? ` (${optionsMap[answerKey]})` : ''
            }. Verify clinical rationale during staging review.`
          : ''),
      reference: reference.trim(),
      clinicalCase: clinicalCase.trim() || undefined,
      tableData,
      unit: categoryInference.unit,
      subject: categoryInference.subject,
      topic: categoryInference.topic,
      difficulty: categoryInference.difficulty,
      examCategories: ['ASCP', 'NHPC'],
      sourceDocument,
      confidenceScore,
      validationErrors: [],
      selectedForImport: true,
      status: 'Staged',
    };

    // Run validation checks
    draftItem.validationErrors = validateExtractedQuestion(draftItem);
    if (inferredFromExplanation) {
      draftItem.validationErrors.push(
        `Answer key '${answerKey}' was inferred from the explanation text: please verify.`
      );
    }

    // Check for duplicate against existing questions in database
    const duplicate = findDuplicateQuestion(draftItem.questionText, existingQuestions);
    if (duplicate) {
      draftItem.duplicateWarning = duplicate;
      draftItem.validationErrors.push(
        `High similarity (${Math.round(duplicate.similarityScore * 100)}%) with existing question ${duplicate.existingCode}.`
      );
    } else {
      // Also check for duplicates within the current extracted batch
      for (const earlier of drafts) {
        const batchSim = calculateJaccardSimilarity(draftItem.questionText, earlier.questionText);
        if (batchSim >= 0.75) {
          draftItem.duplicateWarning = {
            existingQuestionId: earlier.id,
            existingCode: earlier.tempCode,
            similarityScore: batchSim,
          };
          draftItem.validationErrors.push(
            `Duplicate within uploaded batch: Matches ${earlier.tempCode} (${Math.round(batchSim * 100)}%).`
          );
          break;
        }
      }
    }

    drafts.push(draftItem);
    counter++;
  }

  return drafts;
}

/**
 * Generates sample CSV template for bulk question upload
 */
export function generateCSVTemplate(): string {
  const headers = [
    'QuestionStem',
    'OptionA',
    'OptionB',
    'OptionC',
    'OptionD',
    'CorrectAnswer',
    'Explanation',
    'Reference',
    'Unit',
    'Subject',
    'Topic',
    'Difficulty',
    'ExamCategories',
  ];

  const exampleRow = [
    '"What is the primary indicator of acute coronary syndrome that rises within 3-6 hours and remains elevated for up to 10-14 days?"',
    '"Cardiac Troponin I / T"',
    '"Myoglobin"',
    '"Creatine Kinase-MB"',
    '"Lactate Dehydrogenase-1"',
    '"A"',
    '"Cardiac troponins (cTnI and cTnT) are gold standard biomarkers for myocardial infarction with high cardiac specificity."',
    '"Tietz Textbook of Clinical Chemistry and Molecular Diagnostics, 6th Ed."',
    '"Clinical Chemistry"',
    '"Lipid & Cardiac Markers"',
    '"High-Sensitivity Troponin"',
    '"Conceptual"',
    '"ASCP;NHPC;PSC"',
  ];

  return `${headers.join(',')}\n${exampleRow.join(',')}`;
}

/**
 * Parses uploaded CSV text into MCQ question drafts (supports multi-line quoted CSV fields)
 */
export function parseCSVToMCQ(
  csvText: string,
  sourceDocument = 'bulk_upload.csv',
  existingQuestions: MCQQuestion[] = []
): ExtractedMCQDraft[] {
  if (!csvText || !csvText.trim()) return [];

  // Full quote-aware CSV row parser (handles newlines inside quoted fields)
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (ch === '"') {
      if (inQuotes && csvText[i + 1] === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((ch === '\r' || ch === '\n') && !inQuotes) {
      if (ch === '\r' && csvText[i + 1] === '\n') i++;
      currentRow.push(currentCell.trim());
      currentCell = '';
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += ch;
    }
  }
  currentRow.push(currentCell.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const drafts: ExtractedMCQDraft[] = [];

  for (let idx = 1; idx < rows.length; idx++) {
    const row = rows[idx];
    if (row.length < 6) continue;

    const [
      stem,
      optA,
      optB,
      optC,
      optD,
      answer,
      explanation = '',
      reference = '',
      unit = '',
      subject = '',
      topic = '',
      difficulty = 'Conceptual',
      examCategoriesStr = 'ASCP;NHPC',
    ] = row;

    const options: MCQOption[] = [
      { id: 'A' as const, text: optA || '' },
      { id: 'B' as const, text: optB || '' },
      { id: 'C' as const, text: optC || '' },
      { id: 'D' as const, text: optD || '' },
    ].filter((o) => o.text.length > 0);

    const validDifficulty: DifficultyLevel =
      difficulty === 'Memory-based' || difficulty === 'Advanced' ? difficulty : 'Conceptual';

    const examCategories: ExamCategory[] = examCategoriesStr
      .split(/[\;\,\/]/)
      .map((e) => e.trim().toUpperCase())
      .filter((e): e is ExamCategory => ['NHPC', 'PSC', 'ASCP', 'DHA', 'AIMS'].includes(e as ExamCategory));

    const inferred = inferCategoryFromContent(`${stem} ${explanation}`);

    const draftItem: ExtractedMCQDraft = {
      id: `csv-${Date.now()}-${idx}`,
      tempCode: `CSV-${String(idx).padStart(4, '0')}`,
      questionText: stem.trim(),
      options,
      correctAnswer: (answer.trim().toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E') || '',
      explanation: explanation.trim() || 'Comprehensive laboratory rationale and diagnostic reference.',
      reference: reference.trim() || 'Clinical Laboratory Standards Institute (CLSI)',
      unit: unit.trim() || inferred.unit,
      subject: subject.trim() || inferred.subject,
      topic: topic.trim() || inferred.topic,
      difficulty: validDifficulty,
      examCategories: examCategories.length > 0 ? examCategories : ['ASCP', 'NHPC'],
      sourceDocument,
      confidenceScore: 0.98,
      validationErrors: [],
      selectedForImport: true,
      status: 'Staged',
    };

    draftItem.validationErrors = validateExtractedQuestion(draftItem);
    const duplicate = findDuplicateQuestion(draftItem.questionText, existingQuestions);
    if (duplicate) {
      draftItem.duplicateWarning = duplicate;
      draftItem.validationErrors.push(
        `Duplicate check: Matches ${duplicate.existingCode} (${Math.round(duplicate.similarityScore * 100)}%)`
      );
    }

    drafts.push(draftItem);
  }

  return drafts;
}
