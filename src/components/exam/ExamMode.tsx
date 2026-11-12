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
  Layers,
  Award,
  Check,
  BookOpen,
  SlidersHorizontal,
} from 'lucide-react';
import { MCQQuestion, ExamCategory } from '../../types';
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

export interface ExamSyllabusInfo {
  code: ExamCategory | 'All';
  title: string;
  fullName: string;
  subtitle: string;
  description: string;
  standardQuestionCount: number;
  durationMinutes: number;
  penaltyPerWrong: number;
  passingPercentage: number;
  totalSets: number;
}

export const EXAM_SYLLABI: ExamSyllabusInfo[] = [
  {
    code: 'ASCP',
    title: 'ASCP MLS / MLT',
    fullName: 'American Society for Clinical Pathology',
    subtitle: 'Generalist & Specialist Licensure',
    description: 'Gold-standard international clinical laboratory licensure examination covering Clinical Chemistry, Hematology, Microbiology, Immunohematology, and Urinalysis.',
    standardQuestionCount: 50,
    durationMinutes: 50,
    penaltyPerWrong: 0.25,
    passingPercentage: 70,
    totalSets: 5,
  },
  {
    code: 'NHPC',
    title: 'NHPC Licensure',
    fullName: 'Nepal Health Professional Council',
    subtitle: 'Medical Laboratory Technologist / MLT Licensure',
    description: 'Official national licensure examination blueprint administered by NHPC for professional registration of Medical Laboratory Technologists and Technicians.',
    standardQuestionCount: 50,
    durationMinutes: 50,
    penaltyPerWrong: 0.25,
    passingPercentage: 70,
    totalSets: 5,
  },
  {
    code: 'PSC',
    title: 'PSC Medical Lab',
    fullName: 'Public Service Commission (Lok Sewa)',
    subtitle: 'Public Service Commission Syllabus',
    description: 'Government civil service competitive examination for Laboratory Technicians and Technologists under the Ministry of Health and Population.',
    standardQuestionCount: 50,
    durationMinutes: 50,
    penaltyPerWrong: 0.25,
    passingPercentage: 70,
    totalSets: 5,
  },
  {
    code: 'DHA',
    title: 'DHA Technologist',
    fullName: 'Dubai Health Authority',
    subtitle: 'Dubai Health Authority Clinical Exam',
    description: 'Prometric-style clinical laboratory licensure test for medical laboratory technologists practicing in Dubai/UAE healthcare facilities.',
    standardQuestionCount: 50,
    durationMinutes: 50,
    penaltyPerWrong: 0.25,
    passingPercentage: 70,
    totalSets: 5,
  },
  {
    code: 'AIMS',
    title: 'AIMS Professional',
    fullName: 'Australian Institute of Medical Scientists',
    subtitle: 'Australian Institute of Medical Scientists',
    description: 'Professional assessment examination for Medical Laboratory Scientists seeking certification and migration assessment in Australia.',
    standardQuestionCount: 50,
    durationMinutes: 50,
    penaltyPerWrong: 0.25,
    passingPercentage: 70,
    totalSets: 5,
  },
  {
    code: 'CEE-UG',
    title: 'CEE-UG Entrance',
    fullName: 'Medical Education Commission (MEC)',
    subtitle: 'MECEE-BL Medical Entrance Mock',
    description: 'Full-length 200-question medical entrance mock based on the official CEE-UG blueprint: 3 hours, 200 marks, −0.25 negative marking.',
    standardQuestionCount: 200,
    durationMinutes: 180,
    penaltyPerWrong: 0.25,
    passingPercentage: 50,
    totalSets: 5,
  },
  {
    code: 'All',
    title: 'Comprehensive Mock',
    fullName: 'Multi-Board Laboratory Medicine',
    subtitle: 'All Syllabi Combined Practice Paper',
    description: 'Cross-disciplinary mock test drawing questions across all examination boards and laboratory specialties for full-spectrum assessment.',
    standardQuestionCount: 50,
    durationMinutes: 50,
    penaltyPerWrong: 0.25,
    passingPercentage: 70,
    totalSets: 5,
  },
];

export interface SetExamConfig {
  durationMinutes: number;
  negativeMarking: boolean;
  penaltyPerWrong: number;
}

export function getSetStorageKey(syllabusCode: string, setNum: number): string {
  return `prayogshala_mock_set_cfg_${syllabusCode}_set_${setNum}`;
}

export function loadSetExamConfig(
  syllabusCode: string,
  setNum: number,
  defaultDuration: number,
  defaultPenalty: number
): SetExamConfig {
  try {
    const raw = localStorage.getItem(getSetStorageKey(syllabusCode, setNum));
    if (raw) {
      const parsed = JSON.parse(raw);
      const duration =
        typeof parsed.durationMinutes === 'number' && parsed.durationMinutes >= 5 && parsed.durationMinutes <= 300
          ? Math.round(parsed.durationMinutes)
          : defaultDuration;
      const neg = typeof parsed.negativeMarking === 'boolean' ? parsed.negativeMarking : defaultPenalty > 0;
      const pen =
        typeof parsed.penaltyPerWrong === 'number' && parsed.penaltyPerWrong >= 0
          ? Number(parsed.penaltyPerWrong.toFixed(2))
          : defaultPenalty;
      return { durationMinutes: duration, negativeMarking: neg, penaltyPerWrong: pen };
    }
  } catch {}
  return {
    durationMinutes: defaultDuration,
    negativeMarking: defaultPenalty > 0,
    penaltyPerWrong: defaultPenalty,
  };
}

export function saveSetExamConfig(
  syllabusCode: string,
  setNum: number,
  config: SetExamConfig
): void {
  try {
    localStorage.setItem(getSetStorageKey(syllabusCode, setNum), JSON.stringify(config));
  } catch {}
}

export function clearSetExamConfig(syllabusCode: string, setNum: number): void {
  try {
    localStorage.removeItem(getSetStorageKey(syllabusCode, setNum));
  } catch {}
}

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
  const [selectedSyllabus, setSelectedSyllabus] = useState<(ExamCategory | 'All') | null>(
    isCeeUg ? 'CEE-UG' : (initialExamCategory || null)
  );
  const [examCategory, setExamCategory] = useState<ExamCategory | 'All'>(
    isCeeUg ? 'CEE-UG' : (initialExamCategory || 'ASCP')
  );
  const [selectedSet, setSelectedSet] = useState<number>(1);
  const [startingSetNumber, setStartingSetNumber] = useState<number | null>(null);
  const [editingSetNumber, setEditingSetNumber] = useState<number | null>(null);
  const [setConfigs, setSetConfigs] = useState<Record<string, SetExamConfig>>({});

  const getEffectiveSetConfig = (
    category: string,
    setNum: number,
    defaultDuration: number,
    defaultPenalty: number
  ): SetExamConfig => {
    const key = `${category}_set_${setNum}`;
    if (setConfigs[key]) return setConfigs[key];
    return loadSetExamConfig(category, setNum, defaultDuration, defaultPenalty);
  };

  const handleUpdateSetConfig = (
    category: string,
    setNum: number,
    defaultDuration: number,
    defaultPenalty: number,
    partial: Partial<SetExamConfig>
  ) => {
    const key = `${category}_set_${setNum}`;
    const current = getEffectiveSetConfig(category, setNum, defaultDuration, defaultPenalty);
    const updated: SetExamConfig = {
      ...current,
      ...partial,
      durationMinutes:
        typeof partial.durationMinutes === 'number'
          ? Math.max(5, Math.min(300, Math.round(partial.durationMinutes)))
          : current.durationMinutes,
      penaltyPerWrong:
        typeof partial.penaltyPerWrong === 'number'
          ? Math.max(0, Number(partial.penaltyPerWrong.toFixed(2)))
          : current.penaltyPerWrong,
    };
    saveSetExamConfig(category, setNum, updated);
    setSetConfigs((prev) => ({ ...prev, [key]: updated }));
  };

  const handleResetSetConfig = (
    category: string,
    setNum: number,
    defaultDuration: number,
    defaultPenalty: number
  ) => {
    const key = `${category}_set_${setNum}`;
    clearSetExamConfig(category, setNum);
    setSetConfigs((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const [durationMinutes, setDurationMinutes] = useState<number>(isCeeUg ? CEE_UG_DURATION_MINUTES : 50);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
  const [negativeMarking, setNegativeMarking] = useState<boolean>(true);
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
      setSelectedSyllabus(initialExamCategory);
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

  const windowOpensAt = examWindow ? Date.parse(examWindow.opensAt) : 0;
  const windowClosesAt = examWindow ? Date.parse(examWindow.closesAt) : 0;
  const isWindowOpen = examWindow
    ? clockTick >= windowOpensAt && clockTick <= windowClosesAt
    : true;
  const windowStatusLabel = !examWindow
    ? 'Checking weekly window...'
    : isWindowOpen
      ? `Open now · closes in ${formatCountdown(windowClosesAt - clockTick)}`
      : `Closed · opens ${formatNepalTime(new Date(windowOpensAt))} (in ${formatCountdown(windowOpensAt - clockTick)})`;

  const formatScore = (value: number) =>
    Number.isInteger(value) ? String(value) : value.toFixed(2);

  const startExamWithSet = async (category: ExamCategory | 'All', setNum: number) => {
    setStartError(null);
    setPaywallNotice(null);
    setIsStarting(true);
    setStartingSetNumber(setNum);
    setSelectedSet(setNum);

    const isCeeUgMock = category === 'CEE-UG' || isCeeUg;
    const syllabusSpec = EXAM_SYLLABI.find((s) => s.code === category) || EXAM_SYLLABI[0];
    const defaultDuration = isCeeUgMock ? CEE_UG_DURATION_MINUTES : syllabusSpec.durationMinutes;
    const defaultPenalty = isCeeUgMock ? CEE_UG_PENALTY_PER_WRONG : syllabusSpec.penaltyPerWrong;
    const targetCount = isCeeUgMock ? CEE_UG_TOTAL_QUESTIONS : syllabusSpec.standardQuestionCount;

    const setCfg = getEffectiveSetConfig(category, setNum, defaultDuration, defaultPenalty);
    const targetDuration = setCfg.durationMinutes;
    const targetNegative = setCfg.negativeMarking;
    const targetPenalty = targetNegative ? setCfg.penaltyPerWrong : 0;

    try {
      const token = localStorage.getItem('prayogshala_auth_token_v1') || localStorage.getItem('prayogshala_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(isCeeUgMock ? '/api/cee-ug/exams/start' : '/api/exams/start', {
        method: 'POST',
        headers,
        body: JSON.stringify(
          isCeeUgMock
            ? {
                shuffleOptions: true,
                setNumber: setNum,
                durationMinutes: targetDuration,
                negativeMarking: targetNegative,
                penaltyPerWrong: targetPenalty,
              }
            : {
                examCategory: category,
                setNumber: setNum,
                questionCount: targetCount,
                durationMinutes: targetDuration,
                shuffleOptions: true,
                negativeMarking: targetNegative,
                penaltyPerWrong: targetPenalty,
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
        setExamTitle(data.title || `${category === 'All' ? 'Comprehensive' : category} Mock Exam · Set ${setNum}`);
        setExamQuestions(data.questions);
        setExamCategory(category);
        if (typeof data.negativeMarking === 'boolean') {
          setNegativeMarking(data.negativeMarking);
        } else {
          setNegativeMarking(targetNegative);
        }
        setCurrentIndex(0);
        setUserAnswers({});
        setQuestionTimings({});
        setFlaggedIds(new Set());
        const dur = typeof data.durationMinutes === 'number' ? data.durationMinutes : targetDuration;
        setDurationMinutes(dur);
        setSecondsRemaining(dur * 60);
        setIsReviewScreenOpen(false);
        setShowConfirmModal(false);
        setExamResult(null);
        setSubmitError(null);
        setIsExamRunning(true);
        return;
      }
      setStartError(data?.error || 'Failed to start examination session. Please check question availability.');
    } catch {
      setStartError('Network error connecting to exam server. Please check your connection and retry.');
    } finally {
      setIsStarting(false);
      setStartingSetNumber(null);
    }
  };

  const startExam = () => startExamWithSet(selectedSyllabus || 'ASCP', selectedSet);

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
      const token = localStorage.getItem('prayogshala_auth_token_v1') || localStorage.getItem('prayogshala_auth_token');
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
              onClick={() => {
                setExamResult(null);
                if (!isCeeUg) {
                  setSelectedSyllabus(null);
                }
              }}
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

  // Screen 2A: Exam Types Selection (Overview)
  if (!isExamRunning && !selectedSyllabus && !isCeeUg) {
    return (
      <div className="max-w-4xl mx-auto py-6 space-y-7">
        <title>Mock Examination Simulation | {SITE_CONFIG.SITE_NAME}</title>
        <meta
          name="description"
          content="Timed exam simulation adhering to ASCP, NHPC, PSC, DHA, AIMS, and CEE-UG blueprints with standardized model question sets."
        />
        <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/exam`} />

        {/* Header Hero */}
        <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-800 bg-cyan-50 border border-cyan-200 rounded-full px-2.5 py-1 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-700" />
                Standardized Licensure &amp; Entrance Simulation
              </span>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
                Mock Examination
              </h1>
            </div>
            <Link
              to="/leaderboard"
              className="text-xs font-medium text-cyan-800 hover:text-cyan-950 hover:underline shrink-0"
            >
              Grand Test leaderboard →
            </Link>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
            Select an examination board or syllabus below to view its official blueprint specifications and choose from 5 standardized model paper sets.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-700" />
              Standard Timed Sittings
            </span>
            <span>•</span>
            <span>Negative Marking Simulation</span>
            <span>•</span>
            <span>Protected Server Answer Keys</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">Instant Scorecard &amp; Rationales</span>
          </div>
        </div>

        {/* Exam Types Grid */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between border-b border-slate-200/70 pb-2">
            <div className="space-y-0.5">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-700" />
                <span>Select Examination Type</span>
              </h2>
              <p className="text-xs text-slate-500">
                Click any exam to view test blueprint details and access its model paper sets
              </p>
            </div>
            <span className="text-xs font-medium text-cyan-900 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded">
              {EXAM_SYLLABI.length} Syllabi Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {EXAM_SYLLABI.map((s) => {
              const count = publishedQuestions.filter((q) =>
                s.code === 'All' ? true : questionMatchesExamCategory(q.examCategories, s.code as ExamCategory)
              ).length;

              return (
                <div
                  key={s.code}
                  onClick={() => {
                    setSelectedSyllabus(s.code);
                    setSelectedSet(1);
                    setStartError(null);
                    setPaywallNotice(null);
                  }}
                  className="glass-panel glass-panel-hover rounded-xl p-5 cursor-pointer flex flex-col justify-between space-y-4 border border-slate-200/80 hover:border-cyan-400 hover:shadow-xs transition-all duration-200 group text-left"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold px-2 py-0.5 rounded text-xs uppercase tracking-wider bg-slate-100 text-slate-800 group-hover:bg-cyan-100 group-hover:text-cyan-900 transition-colors">
                        {s.code}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {count} questions
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-cyan-800 transition-colors">
                        {s.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-snug mt-1">
                        {s.subtitle}
                      </p>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-200/60 flex items-center justify-between">
                      <span>{s.standardQuestionCount} MCQs · {s.durationMinutes} min</span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {s.penaltyPerWrong > 0 ? `−${s.penaltyPerWrong}` : 'No'} penalty
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-cyan-800 group-hover:text-cyan-950">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{s.totalSets} Model Sets</span>
                    </span>
                    <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>View Sets</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Screen 2B: Dedicated Exam Set Paper Page
  if (!isExamRunning && (selectedSyllabus || isCeeUg)) {
    const activeCode = selectedSyllabus || (isCeeUg ? 'CEE-UG' : 'ASCP');
    const activeSpec = EXAM_SYLLABI.find((s) => s.code === activeCode) || EXAM_SYLLABI[0];
    const availableQuestionsForActive = publishedQuestions.filter((q) =>
      activeSpec.code === 'All' ? true : questionMatchesExamCategory(q.examCategories, activeSpec.code as ExamCategory)
    ).length;
    const servedForActive = Math.min(activeSpec.standardQuestionCount, availableQuestionsForActive);
    const ceeUgAvailability = computeCeeUgAvailability(publishedQuestions, () => true);

    return (
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        <title>{activeSpec.title} Model Sets | {SITE_CONFIG.SITE_NAME}</title>
        <meta
          name="description"
          content={`Timed model paper sets for ${activeSpec.title}. Calibrated to official blueprint with server-verified scoring.`}
        />
        <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/exam`} />

        {/* Top Back Navigation Bar */}
        {!isCeeUg && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setSelectedSyllabus(null);
                setStartError(null);
                setPaywallNotice(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-cyan-900 bg-white/90 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-3.5 py-2 transition-all cursor-pointer shadow-2xs group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-slate-500 group-hover:text-cyan-900" />
              <span>Back to Exam Types</span>
            </button>
            <span className="text-xs font-medium text-slate-500">
              {activeSpec.code} Licensure Simulation
            </span>
          </div>
        )}

        {/* Exam Detail Header Card (Consolidated Blueprint & Specs) */}
        <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-5 border border-slate-200/90 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-50 border border-cyan-200 rounded-full px-2.5 py-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-700" />
                {activeSpec.code} Blueprint Specification
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {activeSpec.title}
              </h1>
              <p className="text-xs font-medium text-slate-600">
                {activeSpec.fullName} · {activeSpec.subtitle}
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 shrink-0">
              {activeSpec.totalSets} Model Sets
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {activeSpec.description}
          </p>

          {/* Blueprint Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block mb-0.5">Total Questions</span>
              <span className="text-lg font-bold text-slate-900">
                {servedForActive} <span className="text-xs text-slate-400 font-normal">/ {activeSpec.standardQuestionCount} Qs</span>
              </span>
            </div>
            <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block mb-0.5">Time Duration</span>
              <span className="text-lg font-bold text-slate-900">{activeSpec.durationMinutes} min</span>
            </div>
            <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block mb-0.5">Negative Marking</span>
              <span className={`text-lg font-bold ${activeSpec.penaltyPerWrong > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                {activeSpec.penaltyPerWrong > 0 ? `−${activeSpec.penaltyPerWrong}` : '0'} <span className="text-xs text-slate-500 font-normal">per wrong</span>
              </span>
            </div>
            <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block mb-0.5">Passing Standard</span>
              <span className="text-lg font-bold text-emerald-700">{activeSpec.passingPercentage}%</span>
            </div>
          </div>

          {/* CEE-UG Readiness Progress Bar */}
          {activeSpec.code === 'CEE-UG' && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Question Bank Readiness</span>
                <span className="font-bold text-slate-900">
                  {ceeUgAvailability.totalAvailable} / {ceeUgAvailability.totalRequired} Questions
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    ceeUgAvailability.totalAvailable >= ceeUgAvailability.totalRequired ? 'bg-emerald-600' : 'bg-amber-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((ceeUgAvailability.totalAvailable / ceeUgAvailability.totalRequired) * 100))}%`,
                  }}
                />
              </div>
              {ceeUgAvailability.totalAvailable === 0 ? (
                <div role="status" className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                  No CEE-UG questions are published yet. An administrator can bulk upload the 200 questions from the admin console.
                </div>
              ) : (
                ceeUgAvailability.isShort && (
                  <div role="status" className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                    {ceeUgAvailability.totalAvailable} of {ceeUgAvailability.totalRequired} questions are available in the bank. You can start this mock now with the available questions, or bulk upload the remaining questions to reach the full 200-question paper.
                  </div>
                )
              )}
            </div>
          )}

          {/* General Empty Question Bank Warning */}
          {activeSpec.code !== 'CEE-UG' && availableQuestionsForActive === 0 && (
            <div role="status" className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs">
              No questions are currently published for {activeSpec.title}. Please import questions from the Admin Console.
            </div>
          )}

          {/* Paywall Notice */}
          {paywallNotice && (
            <div
              role="alert"
              className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs"
            >
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

          {/* Start Error */}
          {startError && (
            <div
              role="alert"
              className="p-3.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-950 text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{startError}</span>
              </div>
              <button
                type="button"
                onClick={() => startExamWithSet(activeSpec.code, selectedSet)}
                className="px-3.5 py-1.5 min-h-[44px] bg-rose-700 hover:bg-rose-800 text-white rounded font-medium text-xs transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Model Paper Sets Section */}
        <div className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-slate-200/70 pb-2">
            <div className="space-y-0.5">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-cyan-700" />
                <span>Select Model Paper Set</span>
              </h2>
              <p className="text-xs text-slate-500">
                Choose a standardized test paper to begin your timed mock simulation
              </p>
            </div>
            <span className="text-xs font-medium text-cyan-900 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded">
              {activeSpec.totalSets} Standard Sets
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: activeSpec.totalSets }, (_, idx) => idx + 1).map((setNum) => {
              const isThisSetStarting = isStarting && startingSetNumber === setNum;
              const canStartPaper =
                (activeSpec.code === 'CEE-UG' ? ceeUgAvailability.totalAvailable > 0 : availableQuestionsForActive > 0) &&
                !isStarting;

              const defaultDuration = activeSpec.code === 'CEE-UG' ? CEE_UG_DURATION_MINUTES : activeSpec.durationMinutes;
              const defaultPenalty = activeSpec.code === 'CEE-UG' ? CEE_UG_PENALTY_PER_WRONG : activeSpec.penaltyPerWrong;
              const setCfg = getEffectiveSetConfig(activeSpec.code, setNum, defaultDuration, defaultPenalty);

              const isCustomized =
                setCfg.durationMinutes !== defaultDuration ||
                setCfg.negativeMarking !== (defaultPenalty > 0) ||
                (setCfg.negativeMarking && setCfg.penaltyPerWrong !== defaultPenalty);
              const isEditing = editingSetNumber === setNum;

              return (
                <div
                  key={setNum}
                  className={`glass-panel rounded-xl p-5 flex flex-col justify-between space-y-4 border transition-all ${
                    isEditing
                      ? 'border-cyan-400 ring-2 ring-cyan-100 shadow-md'
                      : isCustomized
                      ? 'border-cyan-300 shadow-2xs hover:shadow-xs'
                      : 'border-slate-200/90 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-900 bg-cyan-100/70 border border-cyan-200 rounded-md px-2.5 py-0.5">
                          Set {setNum}
                        </span>
                        {isCustomized && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5">
                            Customized
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        Model Paper
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {activeSpec.title} · Set {setNum}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Full-length paper sitting with server-calibrated question distribution and instant scorecard.
                      </p>
                    </div>

                    {/* Current Set Parameters & Modify Button */}
                    <div className="flex items-center justify-between text-xs bg-slate-50/90 rounded-lg p-2.5 border border-slate-200/70">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-slate-800" title="Time duration for this set">
                          <Clock className="w-3.5 h-3.5 text-cyan-700" />
                          <span>{setCfg.durationMinutes} min</span>
                        </span>
                        <span className="text-slate-300">|</span>
                        <span
                          className={`flex items-center gap-1 font-semibold ${
                            setCfg.negativeMarking ? 'text-rose-700' : 'text-slate-600'
                          }`}
                          title="Negative marking rule for this set"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{setCfg.negativeMarking ? `−${setCfg.penaltyPerWrong} penalty` : 'No penalty'}</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingSetNumber(isEditing ? null : setNum)}
                        className="text-[11px] font-bold text-cyan-800 hover:text-cyan-950 px-2 py-1 rounded bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
                        aria-label={`Modify time and negative marking for Set ${setNum}`}
                      >
                        <SlidersHorizontal className="w-3 h-3 text-cyan-700" />
                        <span>{isEditing ? 'Hide' : 'Modify'}</span>
                      </button>
                    </div>

                    {/* Expandable Configuration Drawer */}
                    {isEditing && (
                      <div className="p-3 bg-white rounded-lg border border-cyan-300/80 shadow-xs space-y-3 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-700" />
                            Set {setNum} Custom Settings
                          </span>
                          {isCustomized && (
                            <button
                              type="button"
                              onClick={() => handleResetSetConfig(activeSpec.code, setNum, defaultDuration, defaultPenalty)}
                              className="text-[11px] font-medium text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                              title="Reset to official blueprint defaults"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reset Default</span>
                            </button>
                          )}
                        </div>

                        {/* Time Duration */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="font-semibold text-slate-700 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              Time Duration
                            </label>
                            <span className="text-[11px] font-bold text-cyan-900 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                              {setCfg.durationMinutes} min
                            </span>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap">
                            {[15, 30, 45, 50, 60, 90, 120, 180].map((mins) => (
                              <button
                                key={mins}
                                type="button"
                                onClick={() =>
                                  handleUpdateSetConfig(activeSpec.code, setNum, defaultDuration, defaultPenalty, {
                                    durationMinutes: mins,
                                  })
                                }
                                className={`px-2 py-0.5 text-[11px] font-semibold rounded border cursor-pointer transition-colors ${
                                  setCfg.durationMinutes === mins
                                    ? 'bg-cyan-700 text-white border-cyan-700 shadow-2xs'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {mins}m
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="range"
                              min={5}
                              max={300}
                              step={5}
                              value={setCfg.durationMinutes}
                              onChange={(e) =>
                                handleUpdateSetConfig(activeSpec.code, setNum, defaultDuration, defaultPenalty, {
                                  durationMinutes: parseInt(e.target.value, 10) || 50,
                                })
                              }
                              className="w-full accent-cyan-700 h-1.5 bg-slate-200 rounded cursor-pointer"
                              aria-label={`Time duration slider for Set ${setNum}`}
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                min={5}
                                max={300}
                                value={setCfg.durationMinutes}
                                onChange={(e) =>
                                  handleUpdateSetConfig(activeSpec.code, setNum, defaultDuration, defaultPenalty, {
                                    durationMinutes: parseInt(e.target.value, 10) || 5,
                                  })
                                }
                                className="w-14 text-center py-0.5 px-1 text-xs border border-slate-300 rounded font-semibold text-slate-800"
                                aria-label={`Time duration in minutes for Set ${setNum}`}
                              />
                              <span className="text-[11px] text-slate-500">min</span>
                            </div>
                          </div>
                        </div>

                        {/* Negative Marking */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <label className="font-semibold text-slate-700 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-slate-500" />
                              Negative Marking
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSetConfig(activeSpec.code, setNum, defaultDuration, defaultPenalty, {
                                  negativeMarking: !setCfg.negativeMarking,
                                })
                              }
                              className={`px-2.5 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                                setCfg.negativeMarking
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {setCfg.negativeMarking ? 'Enabled' : 'Disabled'}
                            </button>
                          </div>

                          {setCfg.negativeMarking && (
                            <div className="space-y-1.5 pl-2 border-l-2 border-rose-200">
                              <div className="flex items-center justify-between text-[11px] text-slate-600">
                                <span>Penalty per wrong answer</span>
                                <span className="font-bold text-rose-700">−{setCfg.penaltyPerWrong} mark</span>
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                {[0.2, 0.25, 0.33, 0.5, 1.0].map((p) => (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSetConfig(activeSpec.code, setNum, defaultDuration, defaultPenalty, {
                                        penaltyPerWrong: p,
                                      })
                                    }
                                    className={`px-2 py-0.5 text-[11px] font-semibold rounded border cursor-pointer transition-colors ${
                                      setCfg.penaltyPerWrong === p
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    −{p}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 pt-0.5">
                                <span className="text-[11px] text-slate-500">Custom penalty:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={5}
                                  step={0.05}
                                  value={setCfg.penaltyPerWrong}
                                  onChange={(e) =>
                                    handleUpdateSetConfig(activeSpec.code, setNum, defaultDuration, defaultPenalty, {
                                      penaltyPerWrong: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-16 text-center py-0.5 px-1 text-xs border border-slate-300 rounded font-semibold text-slate-800"
                                  aria-label={`Custom penalty per wrong answer for Set ${setNum}`}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingSetNumber(null)}
                            className="px-3 py-1 bg-cyan-700 hover:bg-cyan-800 text-white text-[11px] font-semibold rounded cursor-pointer transition-colors shadow-2xs"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    disabled={!canStartPaper}
                    onClick={() => startExamWithSet(activeSpec.code, setNum)}
                    className="w-full py-2.5 min-h-[44px] bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {isThisSetStarting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                        <span>Preparing Set {setNum}...</span>
                      </>
                    ) : (
                      <>
                        <span>Start Set {setNum}</span>
                        <ArrowRight className="w-4 h-4 text-cyan-400" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
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
