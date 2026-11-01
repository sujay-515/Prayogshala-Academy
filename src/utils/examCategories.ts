/**
 * Exam-category helpers.
 *
 * Examination tags (ASCP, NHPC, PSC, DHA, AIMS, CEE-UG) are *optional* metadata.
 * A question with no tags is treated as "General": it belongs to the whole bank and
 * stays reachable from every examination filter in practice, browse, and mock exams.
 */
import type { ExamCategory } from '../types';

/** Canonical display/validation order for examination categories. */
export const ALL_EXAM_CATEGORIES: ExamCategory[] = [
  'ASCP',
  'NHPC',
  'PSC',
  'DHA',
  'AIMS',
  'CEE-UG',
];

/** Aliases for explicit line detection and CSV normalization. */
const EXAM_ALIASES: Record<string, ExamCategory> = {
  ASCP: 'ASCP',
  'AMERICAN SOCIETY FOR CLINICAL PATHOLOGY': 'ASCP',
  NHPC: 'NHPC',
  'NEPAL HEALTH PROFESSIONAL COUNCIL': 'NHPC',
  PSC: 'PSC',
  'PUBLIC SERVICE COMMISSION': 'PSC',
  'LOK SEWA': 'PSC',
  'LOK SEWA AAYOG': 'PSC',
  DHA: 'DHA',
  'DUBAI HEALTH AUTHORITY': 'DHA',
  AIMS: 'AIMS',
  'AUSTRALIAN INSTITUTE OF MEDICAL SCIENTISTS': 'AIMS',
  'CEE-UG': 'CEE-UG',
  'CEE UG': 'CEE-UG',
  'CEE_UG': 'CEE-UG',
  CEE: 'CEE-UG',
};

/** Label used wherever an untagged question is displayed. */
export const GENERAL_EXAM_LABEL = 'General';

/**
 * Coerces arbitrary input (CSV cells, JSON payloads, legacy rows, DB records) into a
 * deduplicated, canonically ordered list of valid exam categories.
 *
 * Unknown values are dropped and a missing/invalid value becomes `[]` — never a
 * default board — so uploading a question never forces an examination tag on it.
 */
export function normalizeExamCategories(input: unknown): ExamCategory[] {
  const rawValues = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(/[;,\/|]/)
      : [];

  const seen = new Set<ExamCategory>();
  for (const raw of rawValues) {
    const value = String(raw ?? '').trim().toUpperCase();
    const mapped = EXAM_ALIASES[value];
    if (mapped) {
      seen.add(mapped);
    }
  }

  return ALL_EXAM_CATEGORIES.filter((category) => seen.has(category));
}

/**
 * Detects whether a line represents an explicit examination metadata line
 * (e.g., "Exam Categories: ASCP; NHPC", "Exam Category: PSC", "Target Exam: DHA", "Boards: ASCP").
 *
 * Returns the normalized ExamCategory array if matched, or null if this is not an explicit metadata line.
 *
 * Conservative guard: Never matches clinical notes like "Physical Exam: Normal" or bare medical text.
 */
export function detectExplicitExamCategoryLine(line: string): ExamCategory[] | null {
  if (!line || typeof line !== 'string') return null;
  const trimmed = line.trim();

  // Pattern 1: Unambiguous metadata labels: "Exam Categories:", "Exam Category:", "Target Exam(s):", "Exam Board(s):", "Boards:"
  const explicitLabelMatch = trimmed.match(
    /^(?:[•☐▪\-\*]\s*)?(?:Exam\s*Categories|Exam\s*Category|Target\s*Exams?|Exam\s*Boards?|Boards?)\s*[:\-–]\s*(.+)$/i
  );
  if (explicitLabelMatch) {
    return normalizeExamCategories(explicitLabelMatch[1]);
  }

  // Pattern 2: Short "Exam:" or "Examination:" label - strictly check that the following content consists of valid exam tags
  // to avoid matching clinical examination lines like "Physical Exam: Afebrile" or "Neurological exam: intact"
  const shortExamMatch = trimmed.match(
    /^(?:[•☐▪\-\*]\s*)?(?:Exam|Examination)\s*[:\-–]\s*(.+)$/i
  );
  if (shortExamMatch) {
    const candidate = shortExamMatch[1].trim();
    // Exclude clinical/physical examination indicators
    if (
      /\b(?:normal|afebrile|intact|clear|benign|unremarkable|vitals|murmur|pupils|reflexes|edema|icteric|sclera|tender|bp|hr|temp)\b/i.test(
        candidate
      )
    ) {
      return null;
    }
    const detected = normalizeExamCategories(candidate);
    if (detected.length > 0) {
      return detected;
    }
  }

  return null;
}

/**
 * Detects examination categories conservatively from a document title, header banner, or source filename.
 * (e.g., "ASCP 2024", "Clinical_Pathology_ASCP_2024.pdf", "NHPC Licensing Exam 2024", "CEE-UG 2024 Entrance").
 *
 * CONSERVATIVE DETECTION RULES:
 * To avoid mis-tagging in laboratory medicine:
 * - Bare "PSC" in question text or titles referencing liver pathology (Primary Sclerosing Cholangitis)
 *   is STRICTLY AVOIDED. "PSC" is only recognized when qualified with exam/board/year terms (e.g. "PSC 2024", "PSC Exam", "PSC Lok Sewa")
 *   or "Public Service Commission", and never if "cholangitis" is mentioned.
 * - Bare "DHA" is only recognized with exam/year qualifiers or "Dubai Health Authority", never if "docosahexaenoic" or "dihydroxyacetone" is mentioned.
 * - Bare "AIMS" is only recognized with exam/year qualifiers or "Australian Institute of Medical Scientists".
 * - "ASCP" (American Society for Clinical Pathology) and "NHPC" (Nepal Health Professional Council) are recognized on word boundaries.
 * - "CEE-UG" is recognized on word boundaries.
 */
export function detectExamCategoriesFromTitle(titleOrFilename: string): ExamCategory[] {
  if (!titleOrFilename || typeof titleOrFilename !== 'string') return [];
  const text = titleOrFilename.trim();
  if (!text) return [];

  // Replace underscores and hyphens with spaces for word-boundary matching on filenames (e.g. "Clinical_Pathology_ASCP_2024.pdf")
  const spaceDelimited = text.replace(/[_\-]+/g, ' ');

  const detected = new Set<ExamCategory>();

  // 1. ASCP - American Society for Clinical Pathology
  if (
    /\bASCP\b/i.test(spaceDelimited) ||
    /\bAmerican\s+Society\s+for\s+Clinical\s+Pathology\b/i.test(spaceDelimited)
  ) {
    detected.add('ASCP');
  }

  // 2. NHPC - Nepal Health Professional Council
  if (
    /\bNHPC\b/i.test(spaceDelimited) ||
    /\bNepal\s+Health\s+Professional\s+Council\b/i.test(spaceDelimited)
  ) {
    detected.add('NHPC');
  }

  // 3. CEE-UG - Common Entrance Examination Undergraduate
  if (
    /\bCEE\s*UG\b/i.test(spaceDelimited) ||
    /\bCommon\s+Entrance\s+Examination\b/i.test(spaceDelimited)
  ) {
    detected.add('CEE-UG');
  }

  // 4. PSC - Public Service Commission / Lok Sewa Aayog
  // Guard against Primary Sclerosing Cholangitis (PSC)
  const isLiverDiseasePsc = /\b(?:cholangitis|biliary|liver|ulcerative\s+colitis|p\s*anca|beaded)\b/i.test(
    spaceDelimited
  );
  if (!isLiverDiseasePsc) {
    if (
      /\b(?:Public\s+Service\s+Commission|Lok\s*Sewa(?:\s*Aayog)?)\b/i.test(spaceDelimited) ||
      (/\bPSC\b/i.test(spaceDelimited) &&
        /\b(?:Exam|Examination|20\d\d|Board|Licens|Lok\s*Sewa|Test|Review|Syllabus|Lab)\b/i.test(
          spaceDelimited
        ))
    ) {
      detected.add('PSC');
    }
  }

  // 5. DHA - Dubai Health Authority
  // Guard against Docosahexaenoic Acid or Dihydroxyacetone (DHA)
  const isBiochemDha = /\b(?:docosahexaenoic|fatty\s+acid|omega|dihydroxyacetone)\b/i.test(
    spaceDelimited
  );
  if (!isBiochemDha) {
    if (
      /\bDubai\s+Health\s+Authority\b/i.test(spaceDelimited) ||
      (/\bDHA\b/i.test(spaceDelimited) &&
        /\b(?:Exam|Examination|20\d\d|Board|Licens|Test|Review|Assessment|Questions?)\b/i.test(
          spaceDelimited
        ))
    ) {
      detected.add('DHA');
    }
  }

  // 6. AIMS - Australian Institute of Medical Scientists
  if (
    /\bAustralian\s+Institute\s+of\s+Medical\s+Scientists\b/i.test(spaceDelimited) ||
    (/\bAIMS\b/i.test(spaceDelimited) &&
      /\b(?:Exam|Examination|20\d\d|Board|Licens|Test|Review|Questions?)\b/i.test(
        spaceDelimited
      ))
  ) {
    detected.add('AIMS');
  }

  return ALL_EXAM_CATEGORIES.filter((category) => detected.has(category));
}

/**
 * Match a question against an examination filter.
 *
 * Untagged questions are "General" and are considered applicable to every examination,
 * so they stay reachable from board-specific practice/mock filters instead of becoming
 * invisible after an untagged upload. A tagged question only matches its own boards.
 */
export function questionMatchesExamCategory(
  categories: unknown,
  exam: ExamCategory | 'All' | undefined
): boolean {
  if (!exam || exam === 'All') return true;
  const normalized = normalizeExamCategories(categories);
  if (normalized.length === 0) return true;
  return normalized.includes(exam);
}

/**
 * Human-readable category string for question cards/badges.
 * Untagged questions render as "General" instead of an empty string.
 */
export function formatExamCategories(categories: unknown, separator = ' · '): string {
  const normalized = normalizeExamCategories(categories);
  return normalized.length > 0 ? normalized.join(separator) : GENERAL_EXAM_LABEL;
}
