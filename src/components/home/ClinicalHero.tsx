import React, { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bookmark,
  CheckCircle2,
  FlaskConical,
  LayoutDashboard,
  Lock,
  LogIn,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Timer,
  UserPlus,
  XCircle,
} from 'lucide-react';
import type { UserAccount } from '../../types';
import { ALL_EXAM_CATEGORIES } from '../../utils/examCategories';
import { useCountUp, useScrollReveal } from './homeMotion';
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

interface StatMetricProps {
  rawValue: number;
  suffix?: string;
  label: string;
  isVisible: boolean;
}

const AnimatedHeroStat: React.FC<StatMetricProps> = ({
  rawValue,
  suffix = '',
  label,
  isVisible,
}) => {
  const animated = useCountUp(rawValue, isVisible, 900);
  return (
    <div className="space-y-0.5">
      <div className="text-2xl sm:text-3xl font-extrabold text-cyan-700 dark:text-cyan-400 tracking-tight tabular-nums">
        {animated.toLocaleString()}
        {suffix}
      </div>
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</div>
    </div>
  );
};

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
  const { ref: statsRef, isVisible: statsVisible } = useScrollReveal<HTMLDivElement>(0.1);

  const activeCase = CLINICAL_DEMO_CASES[activeCaseIndex] || CLINICAL_DEMO_CASES[0];
  const selectedOption = selectedAnswers[activeCase.id] ?? null;
  const isAnswered = selectedOption !== null;
  const isCorrect = selectedOption === activeCase.correctAnswer;
  const selectedOptionObj = activeCase.options.find((opt) => opt.id === selectedOption);
  const correctOptionObj = activeCase.options.find((opt) => opt.id === activeCase.correctAnswer);

  const openGuestSignup = () => {
    if (onOpenAuthModal) {
      onOpenAuthModal('register');
    } else {
      onStartPractice();
    }
  };

  const handleSelectOption = (optionId: OptionId) => {
    setSelectedAnswers((prev) => ({ ...prev, [activeCase.id]: optionId }));
  };

  const handleResetCase = () => {
    setSelectedAnswers((prev) => ({ ...prev, [activeCase.id]: null }));
  };

  const visibleStats = [
    { rawValue: publishedQuestionCount, suffix: '+', label: 'Live Questions' },
    { rawValue: categoriesCount, suffix: '', label: 'Lab Subjects' },
    { rawValue: unitsCount, suffix: '', label: 'Study Units' },
    { rawValue: ALL_EXAM_CATEGORIES.length, suffix: '', label: 'Exam Tracks' },
  ].filter((item) => item.rawValue > 0);

  const featureChips = [
    { label: 'Practice', icon: BookOpen, action: onStartPractice },
    { label: 'Mocks', icon: Timer, action: onTakeMock },
    { label: '2-Streak Fix', icon: RotateCcw, action: onOpenDashboard },
    { label: 'Bookmarks', icon: Bookmark, action: onStartPractice },
    { label: 'Analytics', icon: BarChart3, action: onOpenDashboard },
  ];

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative pt-8 sm:pt-12 lg:pt-14 pb-12 sm:pb-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Short Headline, Auth-Gated CTAs, Real Count-Up Telemetry */}
          <div className="lg:col-span-6 space-y-5">
            <div className="hp-hero-stage-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-300">
              <FlaskConical className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{ALL_EXAM_CATEGORIES.join(' · ')}</span>
            </div>

            <div className="hp-hero-stage-2 space-y-3">
              <h1
                id="hero-heading"
                className="font-serif-heading text-3xl sm:text-4xl lg:text-[44px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-[1.12] text-balance"
              >
                Clinical Lab Board Prep, Built Right.
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-[52ch] line-clamp-2">
                Timed mocks, differential rationales, and 2-streak mistake recovery for medical lab exams.
              </p>
            </div>

            {/* Primary & Secondary CTAs */}
            <div className="hp-hero-stage-3 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {!currentUser ? (
                  <>
                    <button
                      type="button"
                      onClick={openGuestSignup}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] font-bold text-sm sm:text-base shadow-sm transition-[background-color,transform] duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer touch-manipulation"
                    >
                      <UserPlus className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>Create Free Account</span>
                      <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => (onOpenAuthModal ? onOpenAuthModal('login') : openGuestSignup())}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-cyan-600 dark:hover:border-cyan-400 text-slate-900 dark:text-slate-100 font-semibold text-sm sm:text-base transition-[border-color,transform] duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer touch-manipulation"
                    >
                      <LogIn className="w-4 h-4 shrink-0 text-cyan-700 dark:text-cyan-400" aria-hidden="true" />
                      <span>Sign In</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onStartPractice}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] font-bold text-sm sm:text-base shadow-sm transition-[background-color,transform] duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer touch-manipulation"
                    >
                      <BookOpen className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>Continue Practice</span>
                      <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={onOpenDashboard}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-cyan-600 dark:hover:border-cyan-400 text-slate-900 dark:text-slate-100 font-semibold text-sm sm:text-base transition-[border-color,transform] duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer touch-manipulation"
                    >
                      <LayoutDashboard className="w-4 h-4 shrink-0 text-cyan-700 dark:text-cyan-400" aria-hidden="true" />
                      <span>Dashboard</span>
                    </button>

                    <button
                      type="button"
                      onClick={onOpenDailyQuestion}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-semibold text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer touch-manipulation"
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Daily Q</span>
                    </button>
                  </>
                )}
              </div>

              {/* Compact Visual Feature Lock Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {featureChips.map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => (!currentUser ? openGuestSignup() : chip.action())}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-[border-color,transform] duration-150 active:scale-[0.97] cursor-pointer touch-manipulation"
                      title={!currentUser ? 'Sign up to unlock' : `Open ${chip.label}`}
                    >
                      <Icon className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                      <span>{chip.label}</span>
                      {!currentUser && (
                        <Lock className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
                {!currentUser && (
                  <span className="text-[11px] font-semibold text-cyan-800 dark:text-cyan-300 px-1">
                    Sign up to unlock
                  </span>
                )}
              </div>
            </div>

            {/* Live Count-Up Telemetry (Strictly > 0 real stats) */}
            {visibleStats.length > 0 && (
              <div
                ref={statsRef}
                aria-label="Live Question Bank Metrics"
                className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-slate-200/80 dark:border-slate-800"
              >
                {visibleStats.map((stat) => (
                  <AnimatedHeroStat
                    key={stat.label}
                    rawValue={stat.rawValue}
                    suffix={stat.suffix}
                    label={stat.label}
                    isVisible={statsVisible}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Floating Sample Clinical Case Simulator */}
          <div className="lg:col-span-6 hp-hero-stage-4">
            <div className="hp-float-slow glass-panel rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
              {/* Workbench Instrument Header */}
              <div className="px-4 sm:px-5 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-[10px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 shrink-0">
                    Sample
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tracking-tight truncate">
                    {activeCase.code}
                  </span>
                </div>

                <div className="flex items-center gap-1" role="group" aria-label="Sample case selector">
                  {CLINICAL_DEMO_CASES.map((item, idx) => {
                    const active = idx === activeCaseIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveCaseIndex(idx)}
                        aria-pressed={active}
                        className={`px-3 min-h-[40px] rounded-lg text-xs font-semibold transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] cursor-pointer touch-manipulation ${
                          active
                            ? 'bg-cyan-700 text-white dark:bg-cyan-400 dark:text-[#04131d]'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                        }`}
                      >
                        Sample {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sample Case Body */}
              <div className="p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  <span className="truncate">{activeCase.discipline}</span>
                  <span className="shrink-0">{activeCase.boards.join(' · ')}</span>
                </div>

                {/* Compact Lab Panel */}
                <div className="grid grid-cols-2 gap-2">
                  {activeCase.labPanel.map((row) => {
                    const isFlagged = row.flag && row.flag !== 'Normal';
                    return (
                      <div
                        key={row.analyte}
                        className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {row.analyte}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                            {row.reference}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums block">
                            {row.value}
                          </span>
                          {isFlagged && (
                            <span className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-400">
                              {row.flag}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {activeCase.questionStem}
                </p>

                {/* Options A-D */}
                <div className="space-y-1.5" role="radiogroup" aria-label={`Sample options for ${activeCase.code}`}>
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
                          'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-400 opacity-75';
                      }
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleSelectOption(opt.id)}
                        className={`w-full text-left flex items-center justify-between gap-2.5 px-3 py-2 min-h-[42px] rounded-xl border text-xs sm:text-[13px] transition-[border-color,background-color,transform] duration-150 ease-out active:scale-[0.99] cursor-pointer touch-manipulation ${rowStyle}`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 shrink-0">
                            {opt.id}
                          </span>
                          <span className="font-medium truncate">{opt.text}</span>
                        </span>

                        {isAnswered && isOptionCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                        )}
                        {isAnswered && isSelected && !isOptionCorrect && (
                          <XCircle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Instant Feedback + Guest Lock Action */}
                {isAnswered ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`rounded-xl border p-3 space-y-2 text-xs ${
                      isCorrect
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 dark:text-emerald-100'
                        : 'bg-rose-50 border-rose-300 text-rose-950 dark:text-rose-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-bold">
                      <span>
                        {isCorrect ? `Correct (${activeCase.correctAnswer})` : `Key: ${activeCase.correctAnswer}`}
                      </span>
                      <button
                        type="button"
                        onClick={handleResetCase}
                        className="inline-flex items-center gap-1 font-semibold text-cyan-800 dark:text-cyan-300 hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        <span>Retry</span>
                      </button>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                      {!isCorrect && selectedOptionObj
                        ? selectedOptionObj.rationale
                        : correctOptionObj?.rationale}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                      <span>Tap any option to preview clinical rationale</span>
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    {!currentUser ? 'Full bank unlocked on sign-up' : 'Ready in your workspace'}
                  </span>
                  <button
                    type="button"
                    onClick={() => (!currentUser ? openGuestSignup() : onStartPractice())}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-cyan-50 border border-cyan-200 text-xs font-bold text-cyan-800 dark:text-cyan-300 hover:bg-cyan-100 transition-[background-color,transform] duration-150 active:scale-[0.98] cursor-pointer touch-manipulation"
                  >
                    {!currentUser && <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                    <span>{!currentUser ? 'Sign up to unlock' : 'Continue Practice'}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
