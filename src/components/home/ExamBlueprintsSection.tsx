import React, { useMemo } from 'react';
import {
  ArrowRight,
  Award,
  CalendarClock,
  GraduationCap,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  Trophy,
} from 'lucide-react';
import type { ExamCategory } from '../../types';
import { ALL_EXAM_CATEGORIES } from '../../utils/examCategories';
import {
  CEE_UG_DURATION_MINUTES,
  CEE_UG_PASSING_PERCENTAGE,
  CEE_UG_PENALTY_PER_WRONG,
  CEE_UG_TOTAL_MARKS,
  CEE_UG_TOTAL_QUESTIONS,
} from '../../config/ceeUg';
import {
  formatCountdown,
  formatNepalTime,
  getGrandTestWindow,
} from '../../utils/examWindow';
import { BOARD_SPECIFICATIONS, CEE_UG_BLUEPRINT_DOMAINS } from './homeMockData';

interface ExamBlueprintsSectionProps {
  onSelectExam?: (exam: ExamCategory) => void;
  onNavigateCeeUg: () => void;
  onTakeMock: () => void;
  onNavigateLeaderboard: () => void;
}

export const ExamBlueprintsSection: React.FC<ExamBlueprintsSectionProps> = ({
  onSelectExam,
  onNavigateCeeUg,
  onTakeMock,
  onNavigateLeaderboard,
}) => {
  const licensingBoards = ALL_EXAM_CATEGORIES.filter((cat) => cat !== 'CEE-UG');

  const grandWindow = useMemo(() => getGrandTestWindow(), []);
  const nowMs = Date.now();
  const countdownText = grandWindow.isOpen
    ? `Closes in ${formatCountdown(grandWindow.closesAt.getTime() - nowMs)}`
    : `Opens in ${formatCountdown(grandWindow.opensAt.getTime() - nowMs)}`;

  return (
    <section
      id="exams"
      aria-labelledby="exams-heading"
      className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Section Header */}
        <div className="max-w-3xl space-y-3">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">
            02 · Examination Blueprints &amp; Timed Sittings
          </div>
          <h2
            id="exams-heading"
            className="font-serif-heading text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight text-balance"
          >
            Calibrated for national licensure boards and medical entrance exams
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-[62ch]">
            Questions are organized by specialty discipline and tagged to target examination standards. Choose a board-specific mock or assemble a custom timed paper.
          </p>
        </div>

        {/* Licensing Boards 3x2 Grid (5 Boards + Custom Mock Builder Card) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {licensingBoards.map((board) => {
            const spec = BOARD_SPECIFICATIONS[board];
            return (
              <article
                key={board}
                className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-800 dark:text-cyan-300 font-mono text-xs font-bold">
                      <Award className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{spec.code}</span>
                    </span>
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      {spec.jurisdiction}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {spec.title}
                    </h3>
                    <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                      {spec.governingBody}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {spec.focus}
                  </p>

                  <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200/80 dark:border-slate-800">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Scope: </span>
                    {spec.keyDomains}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => (onSelectExam ? onSelectExam(board) : onTakeMock())}
                  className="inline-flex items-center justify-between w-full min-h-[44px] px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-600 dark:hover:border-cyan-400 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 transition-colors cursor-pointer touch-manipulation"
                >
                  <span>Launch {spec.code} Mock Exam</span>
                  <ArrowRight className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                </button>
              </article>
            );
          })}

          {/* 6th Balanced Grid Card: Custom Mock Paper Generator */}
          <article className="rounded-2xl bg-cyan-50/80 dark:bg-slate-950 border border-cyan-200 dark:border-cyan-500/40 p-5 sm:p-6 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300 font-mono text-xs font-bold">
                  <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>CUSTOM</span>
                </span>
                <span className="text-[11px] font-medium text-cyan-800 dark:text-cyan-300">
                  Configurable Timing
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  Custom Timed Mock Simulator
                </h3>
                <p className="text-xs font-semibold text-cyan-800 dark:text-cyan-400">
                  Tailored Question Count &amp; Discipline Mix
                </p>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Configure 1–200 items, set custom countdown durations (5–300 minutes), filter by discipline or high-yield tags, and simulate negative marking before exam day.
              </p>
            </div>

            <button
              type="button"
              onClick={onTakeMock}
              className="inline-flex items-center justify-between w-full min-h-[44px] px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-xs sm:text-sm font-bold text-white dark:text-[#04131d] transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation"
            >
              <span>Configure Custom Mock</span>
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>
          </article>
        </div>

        {/* CEE-UG Medical Entrance Command Deck */}
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Blueprint Details */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                <GraduationCap className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Standalone Entrance Simulator · MECEE-BL Pattern</span>
              </div>

              <h3 className="font-serif-heading text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                CEE-UG Medical Entrance Mock Examination
              </h3>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-[60ch]">
                Replicate the full 3-hour undergraduate medical entrance paper under strict countdown timing, section blueprint weighting, and standardized negative marking.
              </p>

              {/* Blueprint Key Figures */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">
                    Total Items
                  </span>
                  <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-0.5 block">
                    {CEE_UG_TOTAL_QUESTIONS} MCQs
                  </span>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">
                    Duration
                  </span>
                  <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-0.5 block">
                    {CEE_UG_DURATION_MINUTES} Mins
                  </span>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">
                    Maximum Marks
                  </span>
                  <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-0.5 block">
                    {CEE_UG_TOTAL_MARKS} Marks
                  </span>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">
                    Wrong Penalty
                  </span>
                  <span className="text-lg font-extrabold font-mono text-rose-700 dark:text-rose-400 tabular-nums mt-0.5 block">
                    -{CEE_UG_PENALTY_PER_WRONG}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={onNavigateCeeUg}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] font-bold text-sm shadow-sm transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation"
                >
                  <Stethoscope className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Launch CEE-UG Entrance Mock</span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Right Subject Weighting Breakdown */}
            <div className="lg:col-span-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                  <span>Subject Distribution</span>
                </h4>
                <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                  {CEE_UG_TOTAL_QUESTIONS} Total
                </span>
              </div>

              {/* Stacked Blueprint Bar */}
              <div
                className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                role="img"
                aria-label="CEE-UG distribution: Biology 40%, Chemistry 25%, Physics 25%, Mental Agility Test 10%"
              >
                {CEE_UG_BLUEPRINT_DOMAINS.map((domain) => (
                  <div
                    key={domain.label}
                    className={domain.barClass}
                    style={{ width: `${domain.sharePct}%` }}
                  />
                ))}
              </div>

              <div className="divide-y divide-slate-200/80 dark:divide-slate-800 text-xs">
                {CEE_UG_BLUEPRINT_DOMAINS.map((domain) => (
                  <div
                    key={domain.label}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                      <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${domain.barClass}`} aria-hidden="true" />
                      <span>{domain.label}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
                      {domain.questions} Qs ({domain.sharePct}%)
                    </span>
                  </div>
                ))}
                <div className="pt-2.5 flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Practice Benchmark Threshold
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
                    {CEE_UG_PASSING_PERCENTAGE}% Cutoff
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Weekly National Grand Test Window */}
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${
                  grandWindow.isOpen
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                    : 'bg-cyan-50 border-cyan-200 text-cyan-800 dark:text-cyan-300'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {grandWindow.isOpen
                    ? 'Weekly Grand Test Open Now'
                    : 'Weekly Grand Test Schedule'}
                </span>
              </span>
              <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                {countdownText}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Synchronized Weekly Grand Test (Friday 11:00 AM – Tuesday Midnight NPT)
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 tabular-nums">
              Current cycle window: <span className="font-semibold text-slate-800 dark:text-slate-200">{formatNepalTime(grandWindow.opensAt)}</span> to <span className="font-semibold text-slate-800 dark:text-slate-200">{formatNepalTime(grandWindow.closesAt)}</span> (NPT). All candidates sit the identical paper for ranked standing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onNavigateLeaderboard}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-cyan-600 dark:hover:border-cyan-400 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 transition-colors cursor-pointer touch-manipulation"
            >
              <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
              <span>View Rankings</span>
            </button>

            <button
              type="button"
              onClick={onTakeMock}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-xs sm:text-sm font-bold text-white dark:text-[#04131d] transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation"
            >
              <span>Open Exam Lobby</span>
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
