import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FlaskConical,
  LogIn,
  RotateCcw,
  ShieldCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';
import type { UserAccount } from '../../types';
import { ALL_EXAM_CATEGORIES } from '../../utils/examCategories';
import { CLINICAL_DEMO_CASES, type OptionId } from './homeMockData';

interface ClinicalHeroProps {
  currentUser?: UserAccount | null;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  onStartPractice: () => void;
  onTakeMock: () => void;
  onOpenDashboard: () => void;
  onOpenDailyQuestion: () => void;
  publishedQuestionCount: number;
  categoriesCount: number;
  unitsCount: number;
}

export const ClinicalHero: React.FC<ClinicalHeroProps> = ({
  currentUser,
  onOpenAuthModal,
  onStartPractice,
  onTakeMock,
  onOpenDashboard,
  onOpenDailyQuestion,
  publishedQuestionCount,
  categoriesCount,
  unitsCount,
}) => {
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, OptionId | null>>({});

  const activeCase = CLINICAL_DEMO_CASES[activeCaseIndex] || CLINICAL_DEMO_CASES[0];
  const selectedOption = selectedAnswers[activeCase.id] ?? null;
  const isAnswered = selectedOption !== null;
  const isCorrect = selectedOption === activeCase.correctAnswer;
  const selectedOptionObj = activeCase.options.find((opt) => opt.id === selectedOption);
  const correctOptionObj = activeCase.options.find((opt) => opt.id === activeCase.correctAnswer);

  const handleSelectOption = (optionId: OptionId) => {
    setSelectedAnswers((prev) => ({ ...prev, [activeCase.id]: optionId }));
  };

  const handleResetCase = () => {
    setSelectedAnswers((prev) => ({ ...prev, [activeCase.id]: null }));
  };

  const rawStats = [
    {
      rawValue: publishedQuestionCount,
      value: `${publishedQuestionCount.toLocaleString()}+`,
      label: 'Published MCQs',
      note: 'Vetted clinical bank',
    },
    {
      rawValue: categoriesCount,
      value: `${categoriesCount}`,
      label: 'Lab Disciplines',
      note: 'Core diagnostic fields',
    },
    {
      rawValue: unitsCount,
      value: `${unitsCount}`,
      label: 'Syllabus Units',
      note: 'Targeted study modules',
    },
    {
      rawValue: ALL_EXAM_CATEGORIES.length,
      value: `${ALL_EXAM_CATEGORIES.length}`,
      label: 'Exam Blueprints',
      note: 'ASCP to CEE-UG',
    },
  ];
  const visibleStats = rawStats.filter((item) => item.rawValue > 0);

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative pt-8 sm:pt-12 lg:pt-16 pb-12 sm:pb-16 lg:pb-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Value Proposition, Account-First Conversion & Live Stats */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-800 dark:text-cyan-400">
              <FlaskConical className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Clinical Laboratory Medicine · {ALL_EXAM_CATEGORIES.join(' · ')}</span>
            </div>

            <h1
              id="hero-heading"
              className="font-serif-heading text-3xl sm:text-4xl lg:text-[42px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-[1.15] text-balance"
            >
              Master clinical laboratory diagnostics with structured vignettes and timed mocks
            </h1>

            <p className="text-base sm:text-[17px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-[60ch]">
              Built for medical laboratory licensure and entrance candidates. Check every answer against option-by-option differential rationales, clear mistakes with two consecutive correct recalls, and simulate real exam timing.
            </p>

            {/* Primary & Secondary Conversion Actions */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {!currentUser ? (
                  <>
                    <button
                      type="button"
                      onClick={() => (onOpenAuthModal ? onOpenAuthModal('register') : onStartPractice())}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] font-bold text-sm sm:text-base shadow-sm transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation"
                    >
                      <UserPlus className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>Create Free Account</span>
                      <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={onStartPractice}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-cyan-600 dark:hover:border-cyan-400 text-slate-900 dark:text-slate-100 font-semibold text-sm sm:text-base transition-[border-color,background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation"
                    >
                      <BookOpen className="w-4 h-4 shrink-0 text-cyan-700 dark:text-cyan-400" aria-hidden="true" />
                      <span>Try Instant Practice</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onStartPractice}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] font-bold text-sm sm:text-base shadow-sm transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation"
                    >
                      <BookOpen className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>Continue Practice</span>
                      <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={onOpenDashboard}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-cyan-600 dark:hover:border-cyan-400 text-slate-900 dark:text-slate-100 font-semibold text-sm sm:text-base transition-[border-color,background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation"
                    >
                      <span>Candidate Dashboard</span>
                    </button>
                  </>
                )}
              </div>

              {/* Auxiliary Actions */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                {!currentUser && onOpenAuthModal && (
                  <button
                    type="button"
                    onClick={() => onOpenAuthModal('login')}
                    className="inline-flex items-center gap-1.5 min-h-[44px] hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors cursor-pointer touch-manipulation"
                  >
                    <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Sign in to sync progress</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenDailyQuestion}
                  className="inline-flex items-center gap-1.5 min-h-[44px] hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors cursor-pointer touch-manipulation"
                >
                  <CalendarDays className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Question of the Day</span>
                </button>

                <button
                  type="button"
                  onClick={onTakeMock}
                  className="inline-flex items-center gap-1.5 min-h-[44px] hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors cursor-pointer touch-manipulation"
                >
                  <span>Take a timed mock exam</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Live Verified Repository Telemetry (Hides any metric at 0) */}
            {visibleStats.length > 0 && (
              <div
                aria-label="Live Question Bank Metrics"
                className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-slate-200/80 dark:border-slate-800"
              >
                {visibleStats.map((stat) => (
                  <div key={stat.label} className="space-y-0.5">
                    <div className="text-2xl sm:text-3xl font-extrabold text-cyan-700 dark:text-cyan-400 tracking-tight tabular-nums">
                      {stat.value}
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {stat.label}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      {stat.note}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive Clinical Case Micro-Simulator */}
          <div className="lg:col-span-6">
            <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              {/* Workbench Instrument Header */}
              <div className="px-4 sm:px-5 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tracking-tight truncate">
                    {activeCase.code} · {activeCase.discipline}
                  </span>
                </div>

                {/* Case Switcher */}
                <div className="flex items-center gap-1" role="group" aria-label="Sample clinical case selector">
                  {CLINICAL_DEMO_CASES.map((item, idx) => {
                    const active = idx === activeCaseIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveCaseIndex(idx)}
                        aria-pressed={active}
                        className={`px-3 min-h-[44px] rounded-lg text-xs font-semibold transition-[background-color,color] duration-150 ease-out cursor-pointer touch-manipulation ${
                          active
                            ? 'bg-cyan-700 text-white dark:bg-cyan-400 dark:text-[#04131d]'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                        }`}
                      >
                        Case {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Case Body */}
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  <span>Unit: {activeCase.unit}</span>
                  <span>Boards: {activeCase.boards.join(' · ')}</span>
                </div>

                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  {activeCase.patientSummary}
                </p>

                {/* Laboratory Analyte Panel (Tabular Numerals) */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Laboratory Findings
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeCase.labPanel.map((row) => {
                      const isFlagged = row.flag && row.flag !== 'Normal';
                      return (
                        <div
                          key={row.analyte}
                          className="flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {row.analyte}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                              Ref: {row.reference}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums block">
                              {row.value}
                            </span>
                            {isFlagged && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                                Flag: {row.flag}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Question Stem */}
                <p className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {activeCase.questionStem}
                </p>

                {/* Interactive Options A-D */}
                <div className="space-y-2" role="radiogroup" aria-label={`Options for ${activeCase.code}`}>
                  {activeCase.options.map((opt) => {
                    const isSelected = selectedOption === opt.id;
                    const isOptionCorrect = opt.id === activeCase.correctAnswer;

                    let rowStyle =
                      'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-cyan-600 dark:hover:border-cyan-400 text-slate-800 dark:text-slate-200';
                    if (isAnswered) {
                      if (isOptionCorrect) {
                        rowStyle =
                          'bg-emerald-50 border-emerald-400 text-emerald-950 dark:text-emerald-100';
                      } else if (isSelected && !isOptionCorrect) {
                        rowStyle =
                          'bg-rose-50 border-rose-400 text-rose-950 dark:text-rose-100';
                      } else {
                        rowStyle =
                          'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-400 opacity-80';
                      }
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleSelectOption(opt.id)}
                        className={`w-full text-left flex items-center justify-between gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl border text-xs sm:text-sm transition-[border-color,background-color,transform] duration-150 ease-out active:scale-[0.99] cursor-pointer touch-manipulation ${rowStyle}`}
                      >
                        <span className="flex items-start gap-2.5 min-w-0">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0 mt-0.5">
                            {opt.id}
                          </span>
                          <span className="font-medium leading-snug">{opt.text}</span>
                        </span>

                        {isAnswered && isOptionCorrect && (
                          <CheckCircle2
                            className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        {isAnswered && isSelected && !isOptionCorrect && (
                          <XCircle
                            className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Live Rationale Feedback Panel */}
                {isAnswered ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`rounded-xl border p-3.5 space-y-2 text-xs leading-relaxed ${
                      isCorrect
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 dark:text-emerald-100'
                        : 'bg-rose-50 border-rose-300 text-rose-950 dark:text-rose-100'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                      <span>
                        {isCorrect
                          ? `Correct (${activeCase.correctAnswer}) · Diagnostic reasoning verified`
                          : `Incorrect (${selectedOption}) · Correct answer is ${activeCase.correctAnswer}`}
                      </span>
                      <span className="text-[11px] font-mono">
                        {isCorrect ? 'Mastery check passed' : 'Mistakes Queue: 0/2 streak'}
                      </span>
                    </div>

                    {!isCorrect && selectedOptionObj && (
                      <p className="text-slate-800 dark:text-slate-200">
                        <strong className="font-semibold">Why {selectedOption} is excluded:</strong>{' '}
                        {selectedOptionObj.rationale}
                      </p>
                    )}

                    {correctOptionObj && (
                      <p className="text-slate-800 dark:text-slate-200">
                        <strong className="font-semibold">Why {activeCase.correctAnswer} applies:</strong>{' '}
                        {correctOptionObj.rationale}
                      </p>
                    )}

                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                      <span className="text-slate-700 dark:text-slate-300 italic">
                        Ref: {activeCase.reference}
                      </span>
                      <button
                        type="button"
                        onClick={handleResetCase}
                        className="inline-flex items-center gap-1 min-h-[44px] px-2 font-semibold text-cyan-800 dark:text-cyan-300 hover:underline cursor-pointer touch-manipulation"
                      >
                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        <span>Retry case</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" aria-hidden="true" />
                      <span>Sample demo case — select an option to inspect option-by-option rationales</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
