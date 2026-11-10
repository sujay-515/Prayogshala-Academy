import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Flag,
  Bookmark,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
  Printer,
  AlertCircle,
  Loader2,
  GraduationCap,
  Crown,
} from 'lucide-react';
import { MCQQuestion, ExamCategory, DifficultyLevel } from '../../types';
import { ExamScoreResult, DEFAULT_PENALTY_PER_WRONG } from '../../utils/scoring';
import { formatCountdown, formatNepalTime } from '../../utils/examWindow';
import { computePacing, formatPacingTime, PacingSummary } from '../../utils/pacing';
import {
  CEE_UG_DURATION_MINUTES,
  CEE_UG_PASSING_PERCENTAGE,
  CEE_UG_PENALTY_PER_WRONG,
  CEE_UG_TOTAL_QUESTIONS,
  computeCeeUgAvailability,
} from '../../config/ceeUg';

const DEFAULT_PENALTY_DISPLAY = String(DEFAULT_PENALTY_PER_WRONG);
import { getSafeImageUrl } from '../../utils/urlSecurity';
import { SITE_CONFIG } from '../../config/site';
import { Modal } from '../common/Modal';
import { isVisibleQuestion } from '../../utils/questionVisibility';
import { questionMatchesExamCategory } from '../../utils/examCategories';

interface ExamModeProps {
  questions: MCQQuestion[];
  onCompleteExam: (
    result: {
      title: string;
      score: number;
      correctCount: number;
      total: number;
      timeSpentSeconds: number;
      passed: boolean;
      pacing?: PacingSummary;
    },
    gradedQuestions?: MCQQuestion[],
    userAnswers?: Record<string, string>
  ) => void;
  onBookmarkQuestion: (id: string) => void;
  bookmarkedIds: string[];
  initialExamCategory?: ExamCategory;
  /**
   * Renders a fixed-paper briefing (blueprint, availability, start) instead of the
   * free-form exam builder. Currently used by the standalone CEE-UG entrance mock.
   */
  preset?: 'cee-ug';
  /** Pass mark shown on the scorecard. Defaults to 70 (licensing boards). */
  passingPercentage?: number;
  onPhaseChange?: (phase: 'idle' | 'running' | 'completed') => void;
}

export const ExamMode: React.FC<ExamModeProps> = ({
  questions,
  onCompleteExam,
  onBookmarkQuestion,
  bookmarkedIds,
  initialExamCategory,
  preset,
  passingPercentage,
  onPhaseChange,
}) => {
  const isCeeUg = preset === 'cee-ug';
  const passMark = typeof passingPercentage === 'number' ? passingPercentage : 70;
  const [examCategory, setExamCategory] = useState<ExamCategory | 'All'>(
    isCeeUg ? 'CEE-UG' : initialExamCategory || 'All'
  );
  const [selectedUnit, setSelectedUnit] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'All'>('All');
  const [questionCount, setQuestionCount] = useState<number>(isCeeUg ? CEE_UG_TOTAL_QUESTIONS : 10);
  const [durationMinutes, setDurationMinutes] = useState<number>(isCeeUg ? CEE_UG_DURATION_MINUTES : 15);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
  const [negativeMarking, setNegativeMarking] = useState<boolean>(isCeeUg);
  const [examWindow, setExamWindow] = useState<{
    isOpen: boolean;
    opensAt: string;
    closesAt: string;
  } | null>(null);
  const [clockTick, setClockTick] = useState<number>(() => Date.now());

  const [isExamRunning, setIsExamRunning] = useState<boolean>(false);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState<string>('');
  const [examQuestions, setExamQuestions] = useState<MCQQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [timeAnnouncement, setTimeAnnouncement] = useState<string>('');
  const [isReviewScreenOpen, setIsReviewScreenOpen] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [examResult, setExamResult] = useState<(ExamScoreResult & { pacing?: PacingSummary }) | null>(null);
  const [questionTimings, setQuestionTimings] = useState<Record<string, number>>({});
  const currentQuestionIdRef = useRef<string>('');
  const reviewOpenRef = useRef<boolean>(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [paywallNotice, setPaywallNotice] = useState<{ message: string; quota?: { used: number; limit: number } } | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isExamRunning || examResult) return;
    if (secondsRemaining === 30 * 60) {
      setTimeAnnouncement('30 minutes remaining in examination.');
    } else if (secondsRemaining === 15 * 60) {
      setTimeAnnouncement('15 minutes remaining in examination.');
    } else if (secondsRemaining === 10 * 60) {
      setTimeAnnouncement('10 minutes remaining in examination.');
    } else if (secondsRemaining === 5 * 60) {
      setTimeAnnouncement('5 minutes remaining in examination.');
    } else if (secondsRemaining === 60) {
      setTimeAnnouncement('1 minute remaining in examination.');
    } else if (secondsRemaining === 30) {
      setTimeAnnouncement('30 seconds remaining in examination.');
    }
  }, [secondsRemaining, isExamRunning, examResult]);

  useEffect(() => {
    if (!isCeeUg && initialExamCategory) {
      setExamCategory(initialExamCategory);
    }
  }, [initialExamCategory, isCeeUg]);

  useEffect(() => {
    let cancelled = false;
    const loadWindow = () => {
      fetch('/api/exam-window')
        .then((res) => res.json())
        .then((data) => {
          if (cancelled || !data?.success) return;
          setExamWindow({
            isOpen: Boolean(data.isOpen),
            opensAt: data.opensAt,
            closesAt: data.closesAt,
          });
        })
        .catch(() => {
          // Window status is advisory; the server still enforces it at start.
        });
    };
    loadWindow();
    // Refresh periodically so a closed page picks up the next opening without a reload.
    const refresh = setInterval(loadWindow, 5 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setClockTick(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // SEC-05: Warn user before accidental page refresh or tab closure during an active examination
  useEffect(() => {
    if (!isExamRunning) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isExamRunning]);

  const currentQuestionId = examQuestions[currentIndex]?.id || '';
  useEffect(() => {
    currentQuestionIdRef.current = currentQuestionId;
  }, [currentQuestionId]);
  useEffect(() => {
    reviewOpenRef.current = isReviewScreenOpen;
  }, [isReviewScreenOpen]);

  // Report the current phase so a host page can hide its own chrome during the exam
  const onPhaseChangeRef = useRef(onPhaseChange);
  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange;
  });
  useEffect(() => {
    onPhaseChangeRef.current?.(examResult ? 'completed' : isExamRunning ? 'running' : 'idle');
  }, [isExamRunning, examResult]);

  const publishedQuestions = useMemo(() => {
    return questions.filter((q) => isVisibleQuestion(q));
  }, [questions]);

  const units = useMemo(() => {
    return ['All', ...Array.from(new Set(publishedQuestions.map((q) => q.unit)))];
  }, [publishedQuestions]);

  const filteredPool = useMemo(() => {
    return publishedQuestions.filter((q) => {
      if (examCategory !== 'All' && !questionMatchesExamCategory(q.examCategories, examCategory)) return false;
      if (selectedUnit !== 'All' && q.unit !== selectedUnit) return false;
      if (selectedDifficulty !== 'All' && q.difficulty !== selectedDifficulty) return false;
      return true;
    });
  }, [publishedQuestions, examCategory, selectedUnit, selectedDifficulty]);

  const isGrandTestConfig = !isCeeUg && questionCount >= 200 && durationMinutes >= 180 && negativeMarking;
  const servedCount = Math.min(questionCount, filteredPool.length);

  const windowOpensAt = examWindow ? Date.parse(examWindow.opensAt) : 0;
  const windowClosesAt = examWindow ? Date.parse(examWindow.closesAt) : 0;
  // Until the status loads we defer to the server, which rejects out-of-window starts.
  const isWindowOpen = examWindow
    ? clockTick >= windowOpensAt && clockTick <= windowClosesAt
    : true;
  const windowStatusLabel = !examWindow
    ? 'Checking weekly window...'
    : isWindowOpen
      ? `Open now · closes in ${formatCountdown(windowClosesAt - clockTick)}`
      : `Closed · opens ${formatNepalTime(new Date(windowOpensAt))} (in ${formatCountdown(windowOpensAt - clockTick)})`;
  const grandTestBlocked = isGrandTestConfig && !isWindowOpen;

  const applyGrandTestPreset = () => {
    setExamCategory('All');
    setSelectedUnit('All');
    setSelectedDifficulty('All');
    setQuestionCount(200);
    setDurationMinutes(180);
    setShuffleOptions(true);
    setNegativeMarking(true);
    setStartError(null);
  };

  // Restores the quick-mock defaults, so the control always does something visible
  // even when the Grand Test rules are already applied.
  const resetExamDefaults = () => {
    setExamCategory(initialExamCategory || 'All');
    setSelectedUnit('All');
    setSelectedDifficulty('All');
    setQuestionCount(10);
    setDurationMinutes(15);
    setShuffleOptions(true);
    setNegativeMarking(false);
    setStartError(null);
  };

  const formatScore = (value: number) =>
    Number.isInteger(value) ? String(value) : value.toFixed(2);

  const startExam = async () => {
    setStartError(null);
    setPaywallNotice(null);
    setIsStarting(true);
    try {
      const token = localStorage.getItem('medlab_qbank_auth_token_v1') || localStorage.getItem('medlab_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(isCeeUg ? '/api/cee-ug/exams/start' : '/api/exams/start', {
        method: 'POST',
        headers,
        body: JSON.stringify(
          isCeeUg
            ? { shuffleOptions }
            : {
                examCategory,
                unit: selectedUnit,
                difficulty: selectedDifficulty,
                questionCount,
                durationMinutes,
                shuffleOptions,
                negativeMarking,
              }
        ),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 402 || data?.code === 'PAYWALL') {
        setPaywallNotice({
          message:
            data?.error ||
            'You have used your free mock exam quota. Upgrade to unlock unlimited mock exams and the full question bank.',
          quota: data?.quota,
        });
        return;
      }
      if (res.status === 429) {
        setStartError(
          data?.error ||
          'Exam start limit reached (maximum 10 exam sessions per hour). Please wait before starting another exam.'
        );
        return;
      }
      if (res.ok && data?.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setActiveExamId(data.examId);
        setExamTitle(data.title || '');
        setExamQuestions(data.questions);
        if (typeof data.negativeMarking === 'boolean') setNegativeMarking(data.negativeMarking);
        setCurrentIndex(0);
        setUserAnswers({});
        setQuestionTimings({});
        setFlaggedIds(new Set());
        setSecondsRemaining((typeof data.durationMinutes === 'number' ? data.durationMinutes : durationMinutes) * 60);
        setIsReviewScreenOpen(false);
        setShowConfirmModal(false);
        setExamResult(null);
        setSubmitError(null);
        setIsExamRunning(true);
        return;
      }
      setStartError(data?.error || 'Failed to start examination session. Please check question filters.');
    } catch {
      setStartError('Network error connecting to exam server. Please check your connection and retry.');
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!isExamRunning || examResult) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
      const activeId = currentQuestionIdRef.current;
      if (activeId && !reviewOpenRef.current) {
        setQuestionTimings((prev) => ({ ...prev, [activeId]: (prev[activeId] || 0) + 1 }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isExamRunning, examResult]);

  useEffect(() => {
    if (isExamRunning && !examResult && secondsRemaining === 0) {
      handleFinalSubmit();
    }
  }, [isExamRunning, examResult, secondsRemaining]);

  const handleSelectAnswer = (optId: string) => {
    const q = examQuestions[currentIndex];
    if (!q) return;
    setUserAnswers((prev) => ({ ...prev, [q.id]: optId }));
  };

  const toggleFlag = (id: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFinalSubmit = async () => {
    if (!activeExamId) {
      setSubmitError('No active exam session ID found. Cannot submit.');
      return;
    }

    const timeSpent = durationMinutes * 60 - secondsRemaining;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('medlab_qbank_auth_token_v1') || localStorage.getItem('medlab_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/exams/${activeExamId}/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userAnswers,
          timeSpentSeconds: timeSpent,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data.result) {
        const finalGraded: MCQQuestion[] = Array.isArray(data.gradedQuestions)
          ? data.gradedQuestions
          : examQuestions;
        const pacing = computePacing(
          finalGraded.map((q) => ({
            seconds: questionTimings[q.id] || 0,
            answered: Boolean(userAnswers[q.id]),
            correct: Boolean(userAnswers[q.id] && userAnswers[q.id] === q.correctAnswer),
          }))
        );
        setExamQuestions(finalGraded);
        setExamResult({ ...data.result, pacing });
        setIsExamRunning(false);
        setShowConfirmModal(false);
        setIsReviewScreenOpen(false);

        onCompleteExam(
          {
            title: data.title || `${examCategory === 'All' ? 'Comprehensive' : examCategory} Laboratory Medicine Examination`,
            score: data.result.score,
            correctCount: data.result.correctCount ?? data.result.score,
            total: data.result.total,
            timeSpentSeconds: timeSpent,
            passed: data.result.passed,
            pacing,
          },
          finalGraded,
          userAnswers
        );
        return;
      }

      setSubmitError(data?.error || 'Server error grading examination. Please retry.');
    } catch {
      setSubmitError('Network error submitting exam. Please check your connection and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    const pad = (value: number) => String(value).padStart(2, '0');
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
  };

  // Screen 1: Scorecard / Results
  if (examResult) {
    return (
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <div className="bg-white border border-slate-200 rounded-md p-6 sm:p-8 text-center space-y-4">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Examination Complete
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {examResult.passed ? 'Benchmark Achieved (Passed)' : 'Review Required (Benchmark Not Met)'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            Standard passing threshold is {passMark}%. Review your topic performance below.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto pt-2">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">
                {examResult.negativeMarking ? 'Net score' : 'Score'}
              </span>
              <span className="text-lg font-bold text-slate-900">
                {formatScore(examResult.score)} / {examResult.total}
              </span>
              {examResult.negativeMarking && (
                <span className="text-[10px] text-rose-700 block">
                  {examResult.correctCount} correct − {formatScore(examResult.penaltyPoints)} penalty
                </span>
              )}
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Percentage</span>
              <span className="text-lg font-bold text-slate-900">{examResult.percentage}%</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Time</span>
              <span className="text-lg font-bold text-slate-900">
                {formatTime(examResult.timeSpentSeconds)}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Status</span>
              <span
                className={`text-lg font-bold ${
                  examResult.passed ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {examResult.passed ? 'PASS' : 'FAIL'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
              Correct {examResult.correctCount}
            </span>
            <span className="px-2 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-medium">
              Incorrect {examResult.incorrectCount}
              {examResult.negativeMarking && ` (−${formatScore(examResult.incorrectCount * examResult.penaltyPerWrong)})`}
            </span>
            <span className="px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              Unanswered {examResult.unansweredCount}
            </span>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setExamResult(null);
                startExam();
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Exam</span>
            </button>
            <button
              onClick={() => setExamResult(null)}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium text-xs rounded transition-colors cursor-pointer"
            >
              New exam
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-medium text-xs rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save Scorecard</span>
            </button>
            <Link
              to="/leaderboard"
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium text-xs rounded transition-colors"
            >
              View Leaderboard
            </Link>
          </div>
        </div>

        {/* Subject Breakdown */}
        <div className="bg-white border border-slate-200 rounded-md p-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Subject Breakdown</h3>
          <div className="space-y-2.5">
            {Object.entries(examResult.subjectPerformance).map(([subject, stats]) => (
              <div key={subject} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800">{subject}</span>
                  <span className="text-slate-500">
                    {stats.correct}/{stats.total} ({stats.percentage}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      stats.percentage >= 70 ? 'bg-slate-800' : 'bg-slate-400'
                    }`}
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pacing & study habits */}
        {examResult.pacing && (
          <div className="bg-white border border-slate-200 rounded-md p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Pacing &amp; study habits</h3>
              <span className="text-xs font-medium text-cyan-800">{examResult.pacing.label}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="text-xs text-slate-500 block">Avg / question</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatPacingTime(examResult.pacing.avgSecondsPerQuestion)}
                </span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="text-xs text-slate-500 block">Fastest</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatPacingTime(examResult.pacing.fastestSeconds)}
                </span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="text-xs text-slate-500 block">Slowest</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatPacingTime(examResult.pacing.slowestSeconds)}
                </span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <span className="text-xs text-slate-500 block">Rushing / Overthinking</span>
                <span className="text-lg font-bold text-slate-900">
                  {examResult.pacing.rushingCount} / {examResult.pacing.overthinkingCount}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Rushing = under 20s on an incorrect answer · Overthinking = 90s or more on one question.
            </p>
          </div>
        )}

        {/* Question by question review */}
        <div className="bg-white border border-slate-200 rounded-md p-6 space-y-5">
          <h3 className="text-sm font-semibold text-slate-900">Review Questions</h3>

          <div className="space-y-5">
            {examQuestions.map((q, idx) => {
              const userPick = userAnswers[q.id];
              const isCorrect = userPick === q.correctAnswer;

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-lg border text-xs space-y-3 ${
                    isCorrect ? 'border-slate-200 bg-white' : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="font-semibold text-slate-800">Q{idx + 1}</span>
                      <span>·</span>
                      <span>{q.subject}</span>
                      <span>·</span>
                      <span>{q.difficulty}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onBookmarkQuestion(q.id)}
                        className={`flex items-center gap-1 text-xs transition-colors cursor-pointer ${
                          bookmarkedIds.includes(q.id)
                            ? 'text-amber-700 font-medium'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 ${
                            bookmarkedIds.includes(q.id) ? 'fill-amber-500 text-amber-500' : ''
                          }`}
                        />
                        <span>{bookmarkedIds.includes(q.id) ? 'Bookmarked' : 'Bookmark'}</span>
                      </button>
                      <span
                        className={`font-semibold ${
                          isCorrect ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isCorrect
                          ? 'Correct'
                          : `Incorrect (Your pick: ${userPick || 'None'})`}
                        {!isCorrect && userPick && examResult.negativeMarking && (
                          <span className="ml-1.5 text-rose-600 font-medium">
                            −{formatScore(examResult.penaltyPerWrong)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-slate-900 leading-snug">{q.questionText}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {q.options.map((opt) => {
                      const isOptionCorrect = opt.id === q.correctAnswer;
                      const isOptionSelected = userPick === opt.id;

                      let style = 'bg-slate-50 border-slate-200 text-slate-600';
                      if (isOptionCorrect) {
                        style = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium';
                      } else if (isOptionSelected) {
                        style = 'bg-rose-50 border-rose-300 text-rose-900';
                      }

                      return (
                        <div key={opt.id} className={`p-2 rounded border flex items-start gap-2 ${style}`}>
                          <span className="font-semibold">{opt.id}.</span>
                          <span>{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-700 space-y-1">
                    <div>
                      <strong className="text-slate-900">Explanation: </strong>
                      {q.explanation}
                    </div>
                    {q.reference && (
                      <div className="text-xs text-slate-500 pt-1 border-t border-slate-200">
                        Reference: {q.reference}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Screen 2a: CEE-UG fixed-paper briefing (blueprint, bank readiness, start)
  if (!isExamRunning && isCeeUg) {
    const availability = computeCeeUgAvailability(publishedQuestions, () => true);
    const canStart = availability.totalAvailable > 0 && !isStarting;

    return (
      <div className="max-w-3xl mx-auto py-6 space-y-4">
        <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Sit the CEE-UG mock</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {CEE_UG_TOTAL_QUESTIONS} questions · {CEE_UG_DURATION_MINUTES} minutes · −
                {CEE_UG_PENALTY_PER_WRONG} per wrong answer · {CEE_UG_PASSING_PERCENTAGE}% pass mark
              </p>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
              Available anytime
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Total Questions</span>
              <span className="text-lg font-bold text-slate-900">{CEE_UG_TOTAL_QUESTIONS} Qs</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Available in Bank</span>
              <span className={`text-lg font-bold ${availability.isShort ? 'text-amber-700' : 'text-emerald-700'}`}>
                {availability.totalAvailable}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Time Duration</span>
              <span className="text-lg font-bold text-slate-900">{CEE_UG_DURATION_MINUTES} min</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Negative Marking</span>
              <span className="text-lg font-bold text-rose-700">−{CEE_UG_PENALTY_PER_WRONG}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Question Bank Readiness</span>
              <span className="font-semibold text-slate-900">
                {availability.totalAvailable} / {availability.totalRequired} Questions
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  availability.totalAvailable >= availability.totalRequired ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.round((availability.totalAvailable / availability.totalRequired) * 100))}%`,
                }}
              />
            </div>
          </div>

          {availability.totalAvailable === 0 ? (
            <div role="status" className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs">
              No CEE-UG questions are published yet. An administrator can bulk upload the 200 questions from the admin console.
            </div>
          ) : (
            availability.isShort && (
              <div role="status" className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                {availability.totalAvailable} of {availability.totalRequired} questions are available in the bank. You can start this mock now with the available questions, or bulk upload the remaining questions to reach the full 200-question paper.
              </div>
            )
          )}

          {paywallNotice && (
            <div role="alert" className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium">{paywallNotice.message}</span>
              </div>
              <Link
                to="/pricing"
                className="px-4 py-2 min-h-[44px] inline-flex items-center bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-colors shrink-0"
              >
                View Plans &amp; Unlock
              </Link>
            </div>
          )}

          {startError && (
            <div role="alert" className="p-3.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-950 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{startError}</span>
              </div>
              <button
                type="button"
                onClick={startExam}
                className="px-3.5 py-1.5 min-h-[44px] bg-rose-700 hover:bg-rose-800 text-white rounded font-medium text-xs transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Randomised paper · one sitting = one server session · answers revealed after submission.
            </p>
            <button
              disabled={!canStart}
              onClick={startExam}
              className="px-5 py-2.5 min-h-[44px] bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-medium text-xs sm:text-sm rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Preparing Examination...</span>
                </>
              ) : (
                <>
                  <span>Start CEE-UG Mock</span>
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen 2: Configuration / Start
  if (!isExamRunning) {
    return (
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <title>Mock Examination Simulation | MedLab QBank</title>
        <meta
          name="description"
          content="Timed exam simulation adhering to ASCP, NHPC, PSC, DHA, and AIMS blueprints with server-verified scoring and answer review."
        />
        <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/exam`} />
        <meta property="og:title" content="Mock Examination Simulation | MedLab QBank" />
        <meta
          property="og:description"
          content="Timed exam simulation adhering to ASCP, NHPC, PSC, DHA, and AIMS blueprints with server-verified scoring and answer review."
        />
        <meta property="og:url" content={`${SITE_CONFIG.SITE_URL}/exam`} />

        <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
              Laboratory Medicine Mock Examination
            </h1>
            <Link
              to="/leaderboard"
              className="text-xs font-medium text-cyan-800 hover:text-cyan-950 hover:underline shrink-0"
            >
              Grand Test leaderboard →
            </Link>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Timed mock examination with server-side answer key protection, question review grid, and subject telemetry.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Exam Parameters</h2>
            <Link
              to="/cee-ug"
              className="text-xs font-medium text-cyan-800 hover:text-cyan-950 hover:underline flex items-center gap-1"
            >
              <GraduationCap className="w-3.5 h-3.5 text-cyan-700" />
              <span>Sit CEE-UG entrance mock (200 Qs · 3 hr) →</span>
            </Link>
          </div>

          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-cyan-950 flex items-center gap-1.5">
                Grand Test simulation
                {isGrandTestConfig && (
                  <span className="px-1.5 py-0.5 rounded bg-cyan-700 text-white text-[10px] font-bold uppercase tracking-wide">
                    Active
                  </span>
                )}
              </span>
              <p className="text-xs text-cyan-900 mt-0.5">
                200 questions · 180 minutes · −{DEFAULT_PENALTY_DISPLAY} per wrong answer · all syllabi
              </p>
              <p className={`text-[11px] mt-1 font-medium ${isWindowOpen ? 'text-emerald-700' : 'text-amber-700'}`}>
                Weekly window: {windowStatusLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={isGrandTestConfig ? resetExamDefaults : applyGrandTestPreset}
              className="px-3 py-1.5 rounded-md bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-medium cursor-pointer shrink-0"
            >
              {isGrandTestConfig ? 'Reset to default settings' : 'Load Grand Test preset'}
            </button>
          </div>

          {examCategory === 'CEE-UG' && (
            <div className="rounded-xl border border-cyan-200 bg-cyan-50/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-cyan-950 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-cyan-700" />
                  CEE-UG Entrance Examination (200 Questions · 3 Hours · −0.25 Negative Marking)
                </span>
                <p className="text-xs text-cyan-900 mt-1">
                  CEE-UG entrance mock paper consists of 200 questions with 3 hours duration and −0.25 negative marking.
                </p>
              </div>
              <Link
                to="/cee-ug"
                className="px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer shrink-0 inline-flex items-center gap-1.5 shadow-xs"
              >
                <span>Open CEE-UG Mock Exam</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Examination Category
              </label>
              <select
                value={examCategory}
                onChange={(e) => setExamCategory(e.target.value as any)}
                className="w-full bg-white/70 border border-slate-200/90 rounded-md px-3 py-2 text-xs text-slate-900 shadow-2xs focus:outline-none focus:border-cyan-500 transition-all"
              >
                <option value="All">Comprehensive (All Syllabi)</option>
                <option value="ASCP">ASCP (MLS / MLT)</option>
                <option value="NHPC">NHPC Licensure</option>
                <option value="PSC">PSC Medical Lab</option>
                <option value="DHA">DHA Technologist</option>
                <option value="AIMS">AIMS Professional</option>
                <option value="CEE-UG">CEE-UG Entrance (200 Qs · 3 hr)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Specialty Coverage
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900"
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cognitive Difficulty
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900"
              >
                <option value="All">All Difficulties</option>
                <option value="Memory-based">Memory-based</option>
                <option value="Conceptual">Conceptual</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Question Count
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {[10, 25, 50, 100, 200].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setQuestionCount(cnt)}
                    className={`flex-1 min-w-[58px] py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                      questionCount === cnt
                        ? 'bg-cyan-700 text-white border-cyan-700 font-semibold'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-cyan-50/40'
                    }`}
                  >
                    {cnt} Qs
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Time Limit
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {[15, 30, 60, 120, 180].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDurationMinutes(mins)}
                    className={`flex-1 min-w-[62px] py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                      durationMinutes === mins
                        ? 'bg-cyan-700 text-white border-cyan-700 font-semibold'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-cyan-50/40'
                    }`}
                  >
                    {mins} Min
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-800 block">
                Randomize Question & Option Order
              </span>
              <span className="text-xs text-slate-500">
                Shuffle both question sequence and A–D answer options for exam security
              </span>
            </div>
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              className="w-4 h-4 text-cyan-700 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
            />
          </div>

          <div
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              negativeMarking ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <span className="text-xs font-semibold text-slate-800 block">
                Negative marking (−{DEFAULT_PENALTY_DISPLAY} per wrong answer)
              </span>
              <span className="text-xs text-slate-500">
                Incorrect answers lose marks; unanswered questions are not penalised
              </span>
            </div>
            <input
              type="checkbox"
              aria-label="Negative marking"
              checked={negativeMarking}
              onChange={(e) => setNegativeMarking(e.target.checked)}
              className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
            />
          </div>

          {paywallNotice && (
            <div role="alert" className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium">{paywallNotice.message}</span>
              </div>
              <Link
                to="/pricing"
                className="px-4 py-2 min-h-[44px] inline-flex items-center bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-colors shrink-0"
              >
                View Plans &amp; Unlock
              </Link>
            </div>
          )}

          {startError && (
            <div role="alert" className="p-3.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-950 text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{startError}</span>
              </div>
              <button
                type="button"
                onClick={startExam}
                className="px-3.5 py-1.5 min-h-[44px] bg-rose-700 hover:bg-rose-800 text-white rounded font-medium text-xs transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {grandTestBlocked && (
            <div role="alert" className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Grand Tests only run inside the weekly window (Friday 11:00 → Tuesday 23:59 Nepal time).
                {examWindow && ` Next opening: ${formatNepalTime(new Date(windowOpensAt))}.`}
              </span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Available pool: <strong className="text-slate-900">{filteredPool.length}</strong> questions ·{' '}
              <strong className="text-slate-900">{servedCount}</strong> served · {durationMinutes} min
              {negativeMarking && (
                <span className="text-rose-700 font-medium"> · −{DEFAULT_PENALTY_DISPLAY} per wrong</span>
              )}
              {questionCount > filteredPool.length && (
                <span className="block text-amber-700 mt-0.5">
                  Only {filteredPool.length} question{filteredPool.length === 1 ? '' : 's'} match these
                  filters; the paper will use all of them.
                </span>
              )}
            </span>
            <button
              disabled={filteredPool.length === 0 || isStarting || grandTestBlocked}
              onClick={startExam}
              className="px-5 py-2.5 min-h-[44px] bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-medium text-xs sm:text-sm rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Preparing Examination...</span>
                </>
              ) : (
                <>
                  <span>{isGrandTestConfig ? 'Start Grand Test' : 'Start Examination'}</span>
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen 3: Running Exam Interface
  const currQ = examQuestions[currentIndex];
  const isFlagged = currQ ? flaggedIds.has(currQ.id) : false;
  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = examQuestions.length - answeredCount;

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-5">
      {/* Top Banner with Clock */}
      <div className="glass-panel rounded-xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
        <div className="flex items-center gap-2">
          <div
            role="timer"
            aria-label={`Time remaining: ${formatTime(secondsRemaining)}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-lg bg-slate-100 border border-slate-200/80 font-mono text-xs sm:text-sm font-semibold text-slate-800"
          >
            <Clock className="w-4 h-4 text-cyan-600" aria-hidden="true" />
            <span>{formatTime(secondsRemaining)}</span>
          </div>
          {/* Visually hidden aria-live region announcing time thresholds only (30, 15, 10, 5, 1 min, 30s) */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {timeAnnouncement}
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            {examTitle || `${examCategory === 'All' ? 'Comprehensive' : examCategory} Exam`}
          </span>
          {activeExamId && (
            <span className="text-xs text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 hidden md:inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-600" /> Answer Key Protected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs text-slate-600">
            Answered: <strong className="text-slate-900">{answeredCount}/{examQuestions.length}</strong>
          </span>
          <button
            onClick={() => setIsReviewScreenOpen(!isReviewScreenOpen)}
            className="px-3 py-2 min-h-[44px] rounded-lg border border-slate-300/80 hover:bg-white text-xs text-slate-700 font-medium cursor-pointer transition-colors shadow-2xs"
          >
            {isReviewScreenOpen ? 'Question' : 'Review Grid'}
          </button>
          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-4 py-2 min-h-[44px] rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer transition-colors shadow-xs"
          >
            Submit
          </button>
        </div>
      </div>

      {isReviewScreenOpen ? (
        <div className="glass-panel rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Review Screen</h3>
              <p className="text-xs text-slate-500">
                Check answered, unanswered, and flagged questions.
              </p>
            </div>
            <button
              onClick={() => setIsReviewScreenOpen(false)}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              Resume
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="glass-card p-2.5 rounded-lg">
              <span className="text-slate-500 block">Answered</span>
              <span className="text-base font-bold text-slate-900">{answeredCount}</span>
            </div>
            <div className="glass-card p-2.5 rounded-lg">
              <span className="text-slate-500 block">Unanswered</span>
              <span className="text-base font-bold text-slate-600">{unansweredCount}</span>
            </div>
            <div className="glass-card p-2.5 rounded-lg">
              <span className="text-slate-500 block">Flagged</span>
              <span className="text-base font-bold text-amber-700">{flaggedIds.size}</span>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-2">
            {examQuestions.map((q, idx) => {
              const isAnswered = !!userAnswers[q.id];
              const isFlag = flaggedIds.has(q.id);

              let badge = 'glass-card text-slate-600 hover:bg-white';
              if (isAnswered) badge = 'bg-cyan-700 text-white border-cyan-700 font-semibold shadow-xs';
              if (isFlag) badge += ' ring-2 ring-amber-500';

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsReviewScreenOpen(false);
                  }}
                  aria-label={`Question ${idx + 1}, ${isAnswered ? 'answered' : 'unanswered'}${isFlag ? ', flagged' : ''}`}
                  aria-pressed={currentIndex === idx}
                  className={`p-2 min-h-[44px] min-w-[44px] rounded-lg border text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${badge}`}
                >
                  <span>Q{idx + 1}</span>
                  {isFlag && <span className="sr-only">(Flagged)</span>}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              onClick={() => setIsReviewScreenOpen(false)}
              className="px-3 py-1.5 rounded border border-slate-300 text-xs font-medium text-slate-700 cursor-pointer"
            >
              Continue
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer shadow-xs"
            >
              Finish & Submit
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800">
                Question {currentIndex + 1} of {examQuestions.length}
              </span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span>{currQ.unit}</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span>{currQ.difficulty}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onBookmarkQuestion(currQ.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  bookmarkedIds.includes(currQ.id)
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'glass-card text-slate-600 hover:bg-white'
                }`}
              >
                <Bookmark
                  className={`w-3.5 h-3.5 ${
                    bookmarkedIds.includes(currQ.id) ? 'fill-amber-500 text-amber-700' : ''
                  }`}
                />
                <span>{bookmarkedIds.includes(currQ.id) ? 'Saved' : 'Save'}</span>
              </button>
              <button
                onClick={() => toggleFlag(currQ.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  isFlagged
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'glass-card text-slate-600 hover:bg-white'
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-600' : ''}`} />
                <span>{isFlagged ? 'Flagged' : 'Flag'}</span>
              </button>
            </div>
          </div>

          {currQ.clinicalCase && (
            <div className="glass-card border-l-4 border-l-cyan-600 p-4 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed shadow-xs">
              <span className="font-semibold text-slate-900 block mb-1">Clinical Presentation:</span>
              {currQ.clinicalCase}
            </div>
          )}

          {currQ.tableData && (
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    {currQ.tableData.headers.map((h, idx) => (
                      <th key={idx} className="px-3.5 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                  {currQ.tableData.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-1.5 font-mono">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {getSafeImageUrl(currQ.imageUrl) && (
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <img
                src={getSafeImageUrl(currQ.imageUrl)!}
                alt={currQ.code ? `Image for question ${currQ.code}` : 'Image for question'}
                className="max-h-64 rounded object-contain mx-auto"
              />
            </div>
          )}

          <div id="exam-question-stem" className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
            {currQ.questionText}
          </div>

          <div role="radiogroup" aria-labelledby="exam-question-stem" className="space-y-2.5">
            {currQ.options.map((opt) => {
              const isSelected = userAnswers[currQ.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Option ${opt.id}: ${opt.text}${isSelected ? ' (Selected)' : ''}`}
                  onClick={() => handleSelectAnswer(opt.id)}
                  className={`w-full text-left p-3.5 min-h-[48px] rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-50/80 backdrop-blur-xs border-cyan-500 text-slate-900 ring-1 ring-cyan-500 shadow-xs'
                      : 'glass-card text-slate-800 hover:bg-white hover:border-cyan-300 hover:shadow-xs'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex items-center justify-center w-7 h-7 min-w-[1.75rem] rounded text-xs font-semibold shrink-0 mt-0.5 ${
                      isSelected ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {opt.id}
                  </span>
                  <span className="text-xs sm:text-sm leading-relaxed flex-1">{opt.text}</span>
                  {isSelected && <span className="sr-only">(Selected)</span>}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className="px-4 py-2.5 min-h-[44px] rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-30 text-xs font-medium text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {/* Question indicator on mobile screens */}
            <div className="text-xs font-semibold text-slate-700">
              Question {currentIndex + 1} of {examQuestions.length}
            </div>

            {currentIndex < examQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="px-4 py-2.5 min-h-[44px] rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="px-4 py-2.5 min-h-[44px] rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Review & Submit</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        titleId="confirm-exam-modal-title"
        maxWidth="max-w-sm"
      >
        <div className="bg-white border border-slate-200 w-full rounded-xl p-6 shadow-xl space-y-4">
          <h3 id="confirm-exam-modal-title" className="font-semibold text-slate-900 text-base">
            Submit Examination?
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            You answered <strong className="text-slate-900">{answeredCount}</strong> of{' '}
            <strong className="text-slate-900">{examQuestions.length}</strong> questions.
            {unansweredCount > 0 && (
              <span className="block mt-1 text-slate-500">
                {unansweredCount} question(s) will be marked as unanswered.
              </span>
            )}
          </p>

          {submitError && (
            <div role="alert" className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-950 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              disabled={isSubmitting}
              onClick={() => setShowConfirmModal(false)}
              className="px-3 py-2 min-h-[44px] rounded border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              disabled={isSubmitting}
              onClick={handleFinalSubmit}
              className="px-4 py-2 min-h-[44px] rounded bg-slate-900 text-white text-xs font-medium cursor-pointer hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
