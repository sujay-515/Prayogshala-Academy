import React from 'react';
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  CheckCircle2,
  FileCheck2,
  Lock,
  RotateCcw,
  Timer,
} from 'lucide-react';
import type { SubjectCategory, SubjectUnit, UserAccount } from '../../types';
import { MISTAKE_CLEAR_THRESHOLD } from '../../utils/mistakes';
import { SubjectIcon } from '../SubjectIcon';
import { FALLBACK_SUBJECT_PREVIEWS } from './homeMockData';
import { HorizontalSnapScroller, useScrollReveal } from './homeMotion';

interface MasteryWorkflowSectionProps {
  categories: SubjectCategory[];
  currentUser?: UserAccount | null;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  onSelectSubject?: (subjectName: string) => void;
  onSelectUnit?: (unitName: string) => void;
  onNavigateTab: (
    tab: 'home' | 'practice' | 'exam' | 'cee-ug' | 'mistakes' | 'dashboard' | 'admin'
  ) => void;
}

const DRIFT_DELAYS = ['', 'hp-drift-delay-1', 'hp-drift-delay-2', 'hp-drift-delay-3'] as const;

export const MasteryWorkflowSection: React.FC<MasteryWorkflowSectionProps> = ({
  categories,
  currentUser,
  onOpenAuthModal,
  onSelectSubject,
  onNavigateTab,
}) => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>(0.08);
  const isGuest = !currentUser;

  const openLockedOrRoute = (fn: () => void) => {
    if (isGuest && onOpenAuthModal) {
      onOpenAuthModal('register');
      return;
    }
    fn();
  };

  // Cap at 6-8 subjects total for horizontal snap browsing
  const subjectCards =
    categories.length > 0
      ? categories.slice(0, 8).map((cat) => {
          const units: SubjectUnit[] =
            cat.units || (cat as { subjects?: SubjectUnit[] }).subjects || [];
          return {
            id: cat.id,
            name: cat.name,
            icon: cat.icon,
            unitsCount: units.length,
          };
        })
      : FALLBACK_SUBJECT_PREVIEWS.map((item) => ({ ...item }));

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="py-14 sm:py-20 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
    >
      <div
        ref={ref}
        className={`hp-reveal ${isVisible ? 'is-visible' : ''} max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12`}
      >
        {/* Short Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">
              01 · Study System
            </div>
            <h2
              id="features-heading"
              className="font-serif-heading text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight text-balance"
            >
              Four Tools Built for Retention
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 line-clamp-2">
              {isGuest
                ? 'Preview the core study workflow below. Sign up free to unlock full access.'
                : 'Jump back into topic practice, mocks, mistake recovery, or analytics.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => openLockedOrRoute(() => onNavigateTab(isGuest ? 'practice' : 'dashboard'))}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-cyan-600 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 transition-[border-color,transform] duration-150 active:scale-[0.98] shrink-0 cursor-pointer touch-manipulation"
          >
            {isGuest && <Lock className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" aria-hidden="true" />}
            <span>{isGuest ? 'Sign up to unlock' : 'Open Dashboard'}</span>
            <ArrowRight className="w-4 h-4 text-cyan-700 dark:text-cyan-400" aria-hidden="true" />
          </button>
        </div>

        {/* 4 Visual Feature Preview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Practice & Rationales */}
          <article className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-cyan-500">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" aria-hidden="true" />
                </span>
                {isGuest && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    <Lock className="w-3 h-3" aria-hidden="true" />
                    Preview
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Topic Practice
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Instant A–D option exclusion rationales and textbook citations.
              </p>

              {/* Mini Visual Schematic */}
              <div className="flex items-center gap-1.5 pt-1" aria-hidden="true">
                {(['A', 'B', 'C', 'D'] as const).map((letter, idx) => (
                  <span
                    key={letter}
                    className={`flex-1 py-1 rounded-md text-center font-mono text-[11px] font-bold border ${
                      idx === 0
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => openLockedOrRoute(() => onNavigateTab('practice'))}
              className="inline-flex items-center justify-between w-full min-h-[40px] pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 cursor-pointer touch-manipulation"
            >
              <span>{isGuest ? 'Sign up to unlock' : 'Continue Practice'}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </article>

          {/* Card 2: Timed Mocks */}
          <article className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-cyan-500">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center">
                  <Timer className="w-4 h-4" aria-hidden="true" />
                </span>
                {isGuest && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    <Lock className="w-3 h-3" aria-hidden="true" />
                    Preview
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Timed Mock Exams
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Full board simulations with answer keys locked until submission.
              </p>

              {/* Mini Visual Metric */}
              <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-[11px] font-mono font-bold tabular-nums">
                <span className="text-slate-600 dark:text-slate-400">PACE</span>
                <span className="text-cyan-700 dark:text-cyan-400">180 min · -0.25</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openLockedOrRoute(() => onNavigateTab('exam'))}
              className="inline-flex items-center justify-between w-full min-h-[40px] pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 cursor-pointer touch-manipulation"
            >
              <span>{isGuest ? 'Sign up to unlock' : 'Continue Practice'}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </article>

          {/* Card 3: 2-Streak Mistake Recovery */}
          <article className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-cyan-500">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </span>
                {isGuest && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    <Lock className="w-3 h-3" aria-hidden="true" />
                    Preview
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {MISTAKE_CLEAR_THRESHOLD}-Streak Recovery
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Cleared only after {MISTAKE_CLEAR_THRESHOLD} consecutive correct recalls.
              </p>

              {/* Visual Streak Dots */}
              <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-[11px] font-mono tabular-nums">
                <span className="font-bold text-rose-700 dark:text-rose-400">0/2</span>
                <ArrowRight className="w-3 h-3 text-slate-400" aria-hidden="true" />
                <span className="font-bold text-amber-700 dark:text-amber-400">1/2</span>
                <ArrowRight className="w-3 h-3 text-slate-400" aria-hidden="true" />
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                  {MISTAKE_CLEAR_THRESHOLD}/{MISTAKE_CLEAR_THRESHOLD}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openLockedOrRoute(() => onNavigateTab('mistakes'))}
              className="inline-flex items-center justify-between w-full min-h-[40px] pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 cursor-pointer touch-manipulation"
            >
              <span>{isGuest ? 'Sign up to unlock' : 'Continue Practice'}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </article>

          {/* Card 4: Bookmarks & Readiness Analytics */}
          <article className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-cyan-500">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" aria-hidden="true" />
                </span>
                {isGuest && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    <Lock className="w-3 h-3" aria-hidden="true" />
                    Preview
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Bookmarks &amp; Analytics
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Pin high-yield cards and spot weak units below 70%.
              </p>

              {/* Visual Bar & Bookmark Pill */}
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-[11px] font-mono tabular-nums">
                <Bookmark className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full w-4/5 rounded-full bg-cyan-700 dark:bg-cyan-400" />
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-200">&lt;70%</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openLockedOrRoute(() => onNavigateTab('dashboard'))}
              className="inline-flex items-center justify-between w-full min-h-[40px] pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 cursor-pointer touch-manipulation"
            >
              <span>{isGuest ? 'Sign up to unlock' : 'Dashboard'}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </article>
        </div>

        {/* Horizontal Snap-Scrolling Subject Cards (~3 visible on desktop, 6-8 max) */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Core Lab Subjects
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                {subjectCards.length} featured disciplines · {isGuest ? 'Sign up to unlock topic filters' : 'Select any discipline to launch'}
              </p>
            </div>
          </div>

          <HorizontalSnapScroller
            ariaLabel="Core Laboratory Subjects"
            scrollHintText="Swipe or use ← → keys to browse subjects"
            fadeFromClass="from-slate-50 dark:from-[#050b12]"
          >
            {subjectCards.map((item, idx) => {
              const driftDelay = DRIFT_DELAYS[idx % DRIFT_DELAYS.length];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    openLockedOrRoute(() =>
                      onSelectSubject ? onSelectSubject(item.name) : onNavigateTab('practice')
                    )
                  }
                  className={`hp-card-drift ${driftDelay} group w-[78vw] sm:w-[290px] lg:w-[calc((100%-2.5rem)/3)] shrink-0 snap-start rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 p-5 text-left flex flex-col justify-between gap-4 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer touch-manipulation`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center shrink-0">
                      <SubjectIcon
                        icon={item.icon}
                        name={item.name}
                        className="w-5 h-5"
                        aria-hidden="true"
                      />
                    </div>
                    {isGuest && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                        <Lock className="w-3 h-3" aria-hidden="true" />
                        Locked
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-snug">
                      {item.name}
                    </h4>
                    {item.unitsCount > 0 && (
                      <div className="text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                        {item.unitsCount} curriculum units
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-cyan-700 dark:text-cyan-400">
                    <span>{isGuest ? 'Sign up to unlock' : 'Continue Practice'}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
                </button>
              );
            })}
          </HorizontalSnapScroller>
        </div>
      </div>
    </section>
  );
};
