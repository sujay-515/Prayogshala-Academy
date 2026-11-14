import React, { useMemo } from 'react';
import {
  ArrowRight,
  Award,
  CalendarClock,
  GraduationCap,
  Stethoscope,
  Trophy,
} from 'lucide-react';
import type { ExamCategory, UserAccount } from '../../types';
import { ALL_EXAM_CATEGORIES } from '../../utils/examCategories';
import {
  CEE_UG_DURATION_MINUTES,
  CEE_UG_PASSING_PERCENTAGE,
  CEE_UG_PENALTY_PER_WRONG,
  CEE_UG_TOTAL_QUESTIONS,
} from '../../config/ceeUg';
import {
  formatCountdown,
  formatNepalTime,
  getGrandTestWindow,
} from '../../utils/examWindow';
import { BOARD_SPECIFICATIONS, CEE_UG_BLUEPRINT_DOMAINS } from './homeMockData';
import { HorizontalSnapScroller, useScrollReveal } from './homeMotion';

interface ExamBlueprintsSectionProps {
  currentUser?: UserAccount | null;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  onSelectExam?: (exam: ExamCategory) => void;
  onNavigateCeeUg: () => void;
  onTakeMock: () => void;
  onNavigateLeaderboard: () => void;
}

export const ExamBlueprintsSection: React.FC<ExamBlueprintsSectionProps> = ({
  currentUser,
  onOpenAuthModal,
  onSelectExam,
  onNavigateCeeUg,
  onTakeMock,
  onNavigateLeaderboard,
}) => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>(0.08);
  const isGuest = !currentUser;

  const openLockedOrRun = (fn: () => void) => {
    if (isGuest && onOpenAuthModal) {
      onOpenAuthModal('register');
      return;
    }
    fn();
  };

  const grandWindow = useMemo(() => getGrandTestWindow(), []);
  const nowMs = Date.now();
  const countdownText = grandWindow.isOpen
    ? `Closes in ${formatCountdown(grandWindow.closesAt.getTime() - nowMs)}`
    : `Opens in ${formatCountdown(grandWindow.opensAt.getTime() - nowMs)}`;

  return (
    <section
      id="exams"
      aria-labelledby="exams-heading"
      className="hp-section-base py-14 sm:py-20 border-t border-slate-200/80 dark:border-slate-800"
    >
      <div
        ref={ref}
        className={`hp-reveal ${isVisible ? 'is-visible' : ''} max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10`}
      >
        {/* Short Heading */}
        <div className="space-y-2 max-w-xl">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">
            02 · Exam Blueprints
          </div>
          <h2
            id="exams-heading"
            className="font-serif-heading text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight text-balance"
          >
            Six Licensing &amp; Entrance Exam Tracks
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 line-clamp-2">
            Scroll board tracks and CEE-UG mocks below.
          </p>
        </div>

        {/* Pop-Out Horizontal Scroller (~3 focal cards visible on desktop) */}
        <HorizontalSnapScroller
          ariaLabel="Exam Tracks"
          scrollHintText="Swipe or use ← → keys to browse exams"
        >
          {ALL_EXAM_CATEGORIES.map((examCode) => {
            const spec = BOARD_SPECIFICATIONS[examCode];
            const isEntrance = examCode === 'CEE-UG';

            return (
              <button
                key={examCode}
                type="button"
                data-scroller-card=""
                data-focal="true"
                onClick={() =>
                  openLockedOrRun(() => {
                    if (isEntrance) {
                      onNavigateCeeUg();
                    } else if (onSelectExam) {
                      onSelectExam(examCode);
                    } else {
                      onTakeMock();
                    }
                  })
                }
                className="hp-card hp-pop-card group w-[78vw] sm:w-[290px] lg:w-[calc((100%-2.5rem)/3)] shrink-0 snap-start rounded-2xl p-5 text-left flex flex-col justify-between gap-4 cursor-pointer touch-manipulation"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-800 dark:text-cyan-300 font-mono text-xs font-bold transition-transform duration-200 ease-out group-hover:scale-105">
                      {isEntrance ? (
                        <GraduationCap className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <Award className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      )}
                      <span>{spec.code}</span>
                    </span>
                    <span className="hp-well px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {spec.jurisdiction}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {spec.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {spec.focus}
                    </p>
                  </div>

                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate">
                    {spec.keyDomains}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-cyan-700 dark:text-cyan-400">
                  <span>{isGuest ? 'Explore Track' : 'Continue Practice'}</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
              </button>
            );
          })}
        </HorizontalSnapScroller>

        {/* Compact CEE-UG Metrics & Weekly Grand Test Bar */}
        <div className="hp-card rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                <Stethoscope className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>CEE-UG Timed Pattern</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                Weighted Biology, Chemistry, Physics, and MAT distribution with live countdown.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center shrink-0">
              <div className="hp-well rounded-xl px-2.5 py-2">
                <div className="text-sm sm:text-base font-extrabold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {CEE_UG_TOTAL_QUESTIONS}
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400">MCQs</div>
              </div>
              <div className="hp-well rounded-xl px-2.5 py-2">
                <div className="text-sm sm:text-base font-extrabold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {CEE_UG_DURATION_MINUTES}m
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400">Timer</div>
              </div>
              <div className="hp-well rounded-xl px-2.5 py-2">
                <div className="text-sm sm:text-base font-extrabold font-mono text-rose-700 dark:text-rose-400 tabular-nums">
                  -{CEE_UG_PENALTY_PER_WRONG}
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400">Penalty</div>
              </div>
              <div className="hp-well rounded-xl px-2.5 py-2">
                <div className="text-sm sm:text-base font-extrabold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {CEE_UG_PASSING_PERCENTAGE}%
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400">Pass</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
              role="img"
              aria-label="CEE-UG distribution: Biology 40%, Chemistry 25%, Physics 25%, MAT 10%"
            >
              {CEE_UG_BLUEPRINT_DOMAINS.map((domain) => (
                <div
                  key={domain.label}
                  className={domain.barClass}
                  style={{ width: `${domain.sharePct}%` }}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
              {CEE_UG_BLUEPRINT_DOMAINS.map((domain) => (
                <span key={domain.label} className="inline-flex items-center gap-1.5 tabular-nums">
                  <span className={`w-2 h-2 rounded-xs ${domain.barClass}`} aria-hidden="true" />
                  <span>{domain.label}</span>
                  <span className="font-mono font-bold">({domain.sharePct}%)</span>
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono font-bold border ${
                  grandWindow.isOpen
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                    : 'bg-cyan-50 border-cyan-200 text-cyan-800 dark:text-cyan-300'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{grandWindow.isOpen ? 'Grand Test Live' : 'Weekly Grand Test'}</span>
              </span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                {countdownText}
              </span>
              <span className="text-slate-600 dark:text-slate-400 tabular-nums">
                ({formatNepalTime(grandWindow.opensAt)} NPT)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => openLockedOrRun(onNavigateLeaderboard)}
                className="hp-well inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl hover:border-cyan-500 text-xs font-bold text-slate-900 dark:text-slate-100 transition-[border-color,transform] duration-150 active:scale-[0.98] cursor-pointer touch-manipulation"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                <span>Rankings</span>
              </button>

              <button
                type="button"
                onClick={() => openLockedOrRun(onNavigateCeeUg)}
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] text-xs font-bold transition-[background-color,transform] duration-150 active:scale-[0.98] cursor-pointer touch-manipulation"
              >
                <span>{isGuest ? 'Try CEE-UG Mock' : 'Launch CEE-UG'}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
