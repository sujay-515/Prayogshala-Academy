/**
 * Laboratory Medicine Question Bank Types & Data Models
 */
import type { PacingSummary } from '../utils/pacing';

export type DifficultyLevel = 'Memory-based' | 'Conceptual' | 'Advanced';

export type ExamCategory = 'NHPC' | 'PSC' | 'ASCP' | 'DHA' | 'AIMS';

export type QuestionStatus = 'Draft' | 'Under-Review' | 'Approved' | 'Published' | 'Archived';

export interface MCQOption {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
  rationale?: string;
}

export interface VersionAudit {
  timestamp: string;
  author: string;
  action: string;
  note?: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface MCQQuestion {
  id: string;
  code: string; // e.g. "LAB-0142"
  questionText: string;
  options: MCQOption[];
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation: string;
  reference: string;
  clinicalCase?: string;
  tableData?: TableData;
  imageUrl?: string;
  unit: string;
  subject: string;
  topic: string;
  subtopic?: string;
  difficulty: DifficultyLevel;
  examCategories: ExamCategory[];
  /** Editorially flagged as high-yield for the High-Yield practice mode. */
  isHighYield?: boolean;
  status: QuestionStatus;
  sourceDocument?: string;
  pageNumber?: number;
  createdAt: string;
  updatedAt: string;
  versionHistory: VersionAudit[];
  flags?: string[];
}

export interface PublicMCQQuestion {
  id: string;
  code: string;
  questionText: string;
  options: MCQOption[];
  clinicalCase?: string;
  tableData?: TableData;
  imageUrl?: string;
  unit: string;
  subject: string;
  topic: string;
  subtopic?: string;
  difficulty: DifficultyLevel;
  examCategories: ExamCategory[];
  isHighYield?: boolean;
}

/**
 * Strict allowlist serializer converting full stored MCQ data into public candidate shape.
 * Strips all REVEAL-ONLY fields (correctAnswer, explanation, reference) and ADMIN-ONLY fields
 * (status, audit history, source PDF info, internal flags).
 */
export function toPublicQuestion(q: MCQQuestion): PublicMCQQuestion {
  const pub: PublicMCQQuestion = {
    id: q.id,
    code: q.code,
    questionText: q.questionText,
    options: (q.options || []).map((opt) => ({
      id: opt.id,
      text: opt.text,
    })),
    unit: q.unit,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    examCategories: Array.isArray(q.examCategories) ? [...q.examCategories] : [],
  };

  if (q.clinicalCase) pub.clinicalCase = q.clinicalCase;
  if (q.tableData) {
    pub.tableData = {
      headers: [...q.tableData.headers],
      rows: q.tableData.rows.map((row) => [...row]),
    };
  }
  if (q.imageUrl) pub.imageUrl = q.imageUrl;
  if (q.subtopic) pub.subtopic = q.subtopic;
  if (q.isHighYield) pub.isHighYield = true;

  return pub;
}

export interface GradedExamQuestion extends PublicMCQQuestion {
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation: string;
  reference?: string;
}

export function toGradedExamQuestion(q: MCQQuestion): GradedExamQuestion {
  const pub = toPublicQuestion(q);
  return {
    ...pub,
    options: (q.options || []).map((opt) => ({
      id: opt.id,
      text: opt.text,
      ...(opt.rationale ? { rationale: opt.rationale } : {}),
    })),
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    reference: q.reference || '',
  };
}

export interface ExtractedMCQDraft {
  id: string;
  tempCode: string;
  questionText: string;
  options: MCQOption[];
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E' | '';
  explanation: string;
  reference: string;
  clinicalCase?: string;
  tableData?: TableData;
  imageUrl?: string;
  unit: string;
  subject: string;
  topic: string;
  subtopic?: string;
  difficulty: DifficultyLevel;
  examCategories: ExamCategory[];
  isHighYield?: boolean;
  sourceDocument: string;
  pageNumber?: number;
  confidenceScore: number; // 0 to 1
  validationErrors: string[];
  duplicateWarning?: {
    existingQuestionId: string;
    existingCode: string;
    similarityScore: number;
  };
  selectedForImport: boolean;
  status: 'Staged' | 'Approved' | 'Rejected';
}

export interface UnitCategory {
  id: string;
  name: string;
  description: string;
  subjects: {
    id: string;
    name: string;
    topics: string[];
  }[];
}

export interface ExamSession {
  id: string;
  title: string;
  mode: 'practice' | 'mock_exam';
  examCategory?: ExamCategory;
  questions: MCQQuestion[];
  userAnswers: Record<string, string>;
  flaggedQuestionIds: string[];
  startedAt: string;
  timeLimitMinutes?: number;
  completedAt?: string;
  score?: number;
  totalQuestions: number;
}

export interface UserStats {
  totalAnswered: number;
  totalCorrect: number;
  streakDays: number;
  lastActiveDate: string;
  bookmarkedIds: string[];
  /** Optional note/folder metadata keyed by bookmarked question ID. */
  bookmarkMeta?: Record<string, BookmarkMeta>;
  revisionQueueIds: string[];
  /** Consecutive-correct progress for each queued mistake (0 or 1; 2 clears). */
  mistakeStreaks?: Record<string, number>;
  subjectPerformance: Record<string, { answered: number; correct: number }>;
  topicPerformance?: Record<string, { answered: number; correct: number }>;
  examRecords: {
    id: string;
    date: string;
    title: string;
    score: number;
    total: number;
    timeSpentSeconds: number;
    passed: boolean;
    /** Optional pacing analytics captured for timed mock attempts. */
    pacing?: PacingSummary;
  }[];
}

export interface BookmarkMeta {
  note?: string;
  folder?: string;
  updatedAt?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  email?: string;
  role: 'superadmin' | 'admin' | 'student';
  displayName: string;
  token?: string;
  createdAt?: string;
}

export interface QuestionReport {
  id: string;
  questionId: string;
  questionCode: string;
  reason: 'Incorrect Answer' | 'Ambiguous Wording' | 'Typo/Grammar' | 'Outdated Reference' | 'Other';
  details: string;
  submittedAt: string;
  status: 'Pending' | 'Investigating' | 'Resolved';
  userId?: string | null;
}
