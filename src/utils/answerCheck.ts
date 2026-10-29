/**
 * Answer checking utility for PracticeMode, DailyQuestionModal, and BrowseQuestionBank
 * Calls POST /api/questions/:id/check with credentials and handles rate-limits and network errors
 */

export interface CheckAnswerSuccess {
  success: true;
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  reference?: string;
  options?: { id: string; text: string; rationale?: string }[];
}

export type CheckAnswerResult =
  | { status: 200; data: CheckAnswerSuccess }
  | { status: number; error: string; isRateLimit: boolean };

export async function checkQuestionAnswer(
  questionId: string,
  selected: string
): Promise<CheckAnswerResult> {
  const token = localStorage.getItem('medlab_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`/api/questions/${encodeURIComponent(questionId)}/check`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ selected }),
    });

    const data = await res.json().catch(() => null);

    if (res.status === 429) {
      return {
        status: 429,
        error:
          data?.error ||
          'You have reached the answer check limit. Please sign in or try again later.',
        isRateLimit: true,
      };
    }

    if (!res.ok) {
      return {
        status: res.status,
        error: data?.error || 'Unable to verify answer. Please try again.',
        isRateLimit: false,
      };
    }

    return {
      status: 200,
      data: data as CheckAnswerSuccess,
    };
  } catch {
    return {
      status: 0,
      error: 'Network error checking answer. Please check your connection and retry.',
      isRateLimit: false,
    };
  }
}
