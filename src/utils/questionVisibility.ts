import type { QuestionStatus } from '../types';

interface QuestionLike {
  status?: QuestionStatus;
}

/**
 * Student-facing endpoints (`/api/bootstrap`, `GET /api/questions`) already
 * return only published questions and intentionally strip `status` from the
 * payload. A missing status therefore means "published", not "draft".
 *
 * Admin payloads keep their real status, so they still see drafts and archives
 * filtered out here.
 */
export function isVisibleQuestion(question: QuestionLike | null | undefined): boolean {
  if (!question) return false;
  return question.status === undefined || question.status === 'Published';
}
