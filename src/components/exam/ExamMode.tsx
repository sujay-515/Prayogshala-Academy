import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { MCQQuestion, ExamCategory, DifficultyLevel } from '../../types';
import { calculateExamScore, ExamScoreResult } from '../../utils/scoring';
import { getSafeImageUrl } from '../../utils/urlSecurity';
import { SITE_CONFIG } from '../../config/site';
import { Modal } from '../common/Modal';

interface ExamModeProps {
  questions: MCQQuestion[];
  onCompleteExam: (
    result: {
      title: string;
      score: number;
      total: number;
      timeSpentSeconds: number;
      passed: boolean;
    },
    gradedQuestions?: MCQQuestion[],
    userAnswers?: Record<string, string>
  ) => void;
  onBookmarkQuestion: (id: string) => void;
  bookmarkedIds: string[];
  initialExamCategory?: ExamCategory;
}

export const ExamMode: React.FC<ExamModeProps> = ({
  questions,
  onCompleteExam,
  onBookmarkQuestion,
  bookmarkedIds,
  initialExamCategory,
}) => {
  const [examCategory, setExamCategory] = useState<ExamCategory | 'All'>(initialExamCategory || 'ASCP');
  const [selectedUnit, setSelectedUnit] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'All'>('All');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);

  const [isExamRunning, setIsExamRunning] = useState<boolean>(false);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [examQuestions, setExamQuestions] = useState<MCQQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [timeAnnouncement, setTimeAnnouncement] = useState<string>('');
  const [isReviewScreenOpen, setIsReviewScreenOpen] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [examResult, setExamResult] = useState<ExamScoreResult | null>(null);

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
    if (initialExamCategory) {
      setExamCategory(initialExamCategory);
    }
  }, [initialExamCategory]);

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

  const publishedQuestions = useMemo(() => {
    return questions.filter((q) => q.status === 'Published');
  }, [questions]);

  const units = useMemo(() => {
    return ['All', ...Array.from(new Set(publishedQuestions.map((q) => q.unit)))];
  }, [publishedQuestions]);

  const filteredPool = useMemo(() => {
    return publishedQuestions.filter((q) => {
      if (examCategory !== 'All' && !q.examCategories.includes(examCategory)) return false;
      if (selectedUnit !== 'All' && q.unit !== selectedUnit) return false;
      if (selectedDifficulty !== 'All' && q.difficulty !== selectedDifficulty) return false;
      return true;
    });
  }, [publishedQuestions, examCategory, selectedUnit, selectedDifficulty]);

  const startExam = async () => {
    try {
      const res = await fetch('/api/exams/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examCategory,
          unit: selectedUnit,
          difficulty: selectedDifficulty,
          questionCount,
          durationMinutes,
          shuffleOptions,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setActiveExamId(data.examId);
        setExamQuestions(data.questions);
        setCurrentIndex(0);
        setUserAnswers({});
        setFlaggedIds(new Set());
        setSecondsRemaining(durationMinutes * 60);
        setIsReviewScreenOpen(false);
        setShowConfirmModal(false);
        setExamResult(null);
        setIsExamRunning(true);
        return;
      }
    } catch {
      // Fallback to local generation if offline
    }

    const pool = [...filteredPool];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const chosen = pool.slice(0, questionCount).map((q) => {
      if (!shuffleOptions || q.options.length <= 1) return q;
      const taggedOpts = q.options.map((o) => ({
        text: o.text,
        wasCorrect: o.id === q.correctAnswer,
      }));
      for (let i = taggedOpts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [taggedOpts[i], taggedOpts[j]] = [taggedOpts[j], taggedOpts[i]];
      }
      const newOpts = q.options.map((opt, idx) => ({ id: opt.id, text: taggedOpts[idx].text }));
      const correctIdx = taggedOpts.findIndex((o) => o.wasCorrect);
      const newCorrect = correctIdx >= 0 ? newOpts[correctIdx].id : q.correctAnswer;
      return { ...q, options: newOpts, correctAnswer: newCorrect };
    });

    setActiveExamId(null);
    setExamQuestions(chosen);
    setCurrentIndex(0);
    setUserAnswers({});
    setFlaggedIds(new Set());
    setSecondsRemaining(durationMinutes * 60);
    setIsReviewScreenOpen(false);
    setShowConfirmModal(false);
    setExamResult(null);
    setIsExamRunning(true);
  };

  useEffect(() => {
    if (!isExamRunning || examResult) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
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
    const timeSpent = durationMinutes * 60 - secondsRemaining;

    if (activeExamId) {
      try {
        const res = await fetch(`/api/exams/${activeExamId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAnswers,
            timeSpentSeconds: timeSpent,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.result) {
          const finalGraded: MCQQuestion[] = Array.isArray(data.gradedQuestions)
            ? data.gradedQuestions
            : examQuestions;
          setExamQuestions(finalGraded);
          setExamResult(data.result);
          setIsExamRunning(false);
          setShowConfirmModal(false);
          setIsReviewScreenOpen(false);

          onCompleteExam(
            {
              title: `${examCategory === 'All' ? 'Comprehensive' : examCategory} Laboratory Medicine Examination`,
              score: data.result.score,
              total: data.result.total,
              timeSpentSeconds: timeSpent,
              passed: data.result.passed,
            },
            finalGraded,
            userAnswers
          );
          return;
        }
      } catch {
        // Fallback below
      }
    }

    const result = calculateExamScore(examQuestions, userAnswers, timeSpent, 70);
    setExamResult(result);
    setIsExamRunning(false);
    setShowConfirmModal(false);
    setIsReviewScreenOpen(false);

    onCompleteExam(
      {
        title: `${examCategory === 'All' ? 'Comprehensive' : examCategory} Laboratory Medicine Examination`,
        score: result.score,
        total: result.total,
        timeSpentSeconds: timeSpent,
        passed: result.passed,
      },
      examQuestions,
      userAnswers
    );
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
            Standard passing threshold is 70%. Review your topic performance below.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto pt-2">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Score</span>
              <span className="text-lg font-bold text-slate-900">
                {examResult.score} / {examResult.total}
              </span>
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
                            ? 'text-amber-600 font-medium'
                            : 'text-slate-400 hover:text-slate-700'
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
                        {isCorrect ? 'Correct' : `Incorrect (Your pick: ${userPick || 'None'})`}
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
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
            Laboratory Medicine Mock Examination
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Timed mock examination with server-side answer key protection, question review grid, and subject telemetry.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-5">
          <h2 className="text-sm font-semibold text-slate-900">Exam Parameters</h2>

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
              <div className="flex items-center gap-2">
                {[10, 25, 50].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setQuestionCount(cnt)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
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
              <div className="flex items-center gap-2">
                {[15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDurationMinutes(mins)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
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

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Available pool: <strong className="text-slate-900">{filteredPool.length}</strong> questions
            </span>
            <button
              disabled={filteredPool.length === 0}
              onClick={startExam}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-medium text-xs sm:text-sm rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Start Examination</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
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
            {examCategory === 'All' ? 'Comprehensive' : examCategory} Exam
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
                    bookmarkedIds.includes(currQ.id) ? 'fill-amber-500 text-amber-600' : ''
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
                alt={currQ.code ? `Specimen image or clinical chart for question ${currQ.code}` : "Clinical laboratory diagnostic specimen or chart"}
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

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleFinalSubmit}
              className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs font-medium cursor-pointer hover:bg-slate-800 transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
