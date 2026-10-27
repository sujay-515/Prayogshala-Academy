/**
 * Laboratory Medicine Question Bank Types & Data Models
 */

export type DifficultyLevel = 'Memory-based' | 'Conceptual' | 'Advanced';

export type ExamCategory = 'NHPC' | 'PSC' | 'ASCP' | 'DHA' | 'AIMS';

export type QuestionStatus = 'Draft' | 'Under-Review' | 'Approved' | 'Published' | 'Archived';

export interface MCQOption {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
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
  status: QuestionStatus;
  sourceDocument?: string;
  pageNumber?: number;
  createdAt: string;
  updatedAt: string;
  versionHistory: VersionAudit[];
  flags?: string[];
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
  revisionQueueIds: string[];
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
  }[];
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
}
