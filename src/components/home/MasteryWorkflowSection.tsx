import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileCheck2,
  RotateCcw,
  Timer,
} from 'lucide-react';
import type { SubjectCategory, SubjectUnit, UserAccount } from '../../types';
import { MISTAKE_CLEAR_THRESHOLD } from '../../utils/mistakes';
import { SubjectIcon } from '../SubjectIcon';
import { FALLBACK_SUBJECT_PREVIEWS } from './homeMockData';
import {
  HorizontalSnapScroller,
  usePrefersReducedMotion,
  useScrollReveal,
} from './homeMotion';

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

const STEP_DELAYS = ['0ms', '100ms', '190ms', '260ms'] as const;

export const MasteryWorkflowSection: React.FC<MasteryWorkflowSectionProps> = ({
  categories,
  currentUser,
  onOpenAuthModal,
  onSelectSubject,
  onNavigateTab,
}) => {
  const { ref: sectionRef, isVisible } = useScrollReveal<HTMLDivElement>(0.08);
  const { ref: gridRef, isVisible: gridVisible } = useScrollReveal<HTMLDivElement>(0.15);
  const prefersReduced = usePrefersReducedMotion();

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isGridPaused, setIsGridPaused] = useState(false);

  const isGuest = !currentUser;

  useEffect(() => {
    if (!gridVisible || prefersReduced || isGridPaused) return;
    const timer = window.setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % 4);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [gridVisible, prefersReduced, isGridPaused]);

  const openLockedOrRoute = (fn: () => void) => {
    if (isGuest && onOpenAuthModal) {
      onOpenAuthModal('register');
      return;
    }
    fn();
  };

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
      className="hp-section-tinted py-14 sm:py-20 border-t border-slate-200/80 dark:border-slate-800"
    >
      <div
        ref={sectionRef}
        className={`hp-reveal ${isVisible ? 'is-visible' : ''} max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14`}
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
                ? 'One connected loop from practice rationales to timed exam telemetry.'
                : 'Jump back into topic practice, mocks, mistake recovery, or analytics.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => openLockedOrRoute(() => onNavigateTab(isGuest ? 'practice' : 'dashboard'))}
            className="hp-card inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 active:scale-[0.98] shrink-0 cursor-pointer touch-manipulation"
          >
            <span>{isGuest ? 'Start Free Practice' : 'Open Dashboard'}</span>
            <ArrowRight className="w-4 h-4 text-cyan-700 dark:text-cyan-400" aria-hidden="true" />
          </button>
        </div>

        {/* Staggered Scroll-Choreographed 4-Step Study Loop with Live Micro-Demos */}
        <div
          ref={gridRef}
          onMouseLeave={() => setIsGridPaused(false)}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
        >
          {/* Step 01: Topic Practice + Animated Rationale Matrix */}
          <article
            onMouseEnter={() => {
              setIsGridPaused(true);
              setActiveStepIndex(0);
            }}
            onFocusCapture={() => {
              setIsGridPaused(true);
              setActiveStepIndex(0);
            }}
            style={{ '--step-delay': STEP_DELAYS[0] } as React.CSSProperties}
            className={`hp-card hp-step-card ${gridVisible ? 'is-visible' : ''} ${
              activeStepIndex === 0 ? 'hp-card-highlight' : ''
            } group rounded-2xl p-5 flex flex-col justify-between gap-4`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <FileCheck2 className="w-4 h-4" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-mono font-bold text-cyan-700 dark:text-cyan-400">
                  STEP 01
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Topic Practice
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Instant A–D option rationales with lab cutoff citations.
              </p>

              {/* Animated Micro-Demo */}
              <div className="hp-well rounded-xl p-2.5 space-y-2" aria-hidden="true">
                <div className="flex items-center gap-1.5">
                  {(['A', 'B', 'C', 'D'] as const).map((letter, idx) => {
                    const hit = idx === 0 && (activeStepIndex === 0 || gridVisible);
                    return (
                      <span
                        key={letter}
                        className={`flex-1 py-1 rounded-md text-center font-mono text-[11px] font-bold border transition-colors duration-300 ${
                          hit
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                            : 'bg-white/60 dark:bg-white/5 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {letter}
                      </span>
                    );
                  })}
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    style={
                      {
                        '--bar-scale': activeStepIndex === 0 ? 0.92 : 0.68,
                        '--bar-delay': '100ms',
                      } as React.CSSProperties
                    }
                    className="hp-demo-bar h-full w-full rounded-full bg-emerald-600 dark:bg-emerald-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openLockedOrRoute(() => onNavigateTab('practice'))}
              className="inline-flex items-center justify-between w-full min-h-[40px] pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 cursor-pointer touch-manipulation"
            >
              <span>{isGuest ? 'Explore Practice' : 'Continue Practice'}</span>
              <ArrowRight
                className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </article>

          {/* Step 02: Timed Mocks + Animated Pacing Sweep */}
          <article
            onMouseEnter={() => {
              setIsGridPaused(true);
              setActiveStepIndex(1);
            }}
            onFocusCapture={() => {
              setIsGridPaused(true);
              setActiveStepIndex(1);
            }}
            style={{ '--step-delay': STEP_DELAYS[1] } as React.CSSProperties}
            className={`hp-card hp-step-card ${gridVisible ? 'is-visible' : ''} ${
              activeStepIndex === 1 ? 'hp-card-highlight' : ''
            } group rounded-2xl p-5 flex flex-col justify-between gap-4`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <Timer className="w-4 h-4" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-mono font-bold text-cyan-700 dark:text-cyan-400">
                  STEP 02
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Timed Mock Exams
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Board-calibrated mocks with answer keys withheld until finish.
              </p>

              {/* Animated Timer Micro-Demo */}
              <div className="hp-well rounded-xl p-2.5 space-y-2" aria-hidden="true">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold tabular-nums">
                  <span className="text-slate-600 dark:text-slate-300">54 s / item</span>
                  <span className="text-cyan-700 dark:text-cyan-400">180 min</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    style={
                      {
                        '--bar-scale': activeStepIndex === 1 ? 0.85 : 0.6,
                        '--bar-delay': '180ms',
                      } as React.CSSProperties
                    }
                    className="hp-demo-bar h-full w-full rounded-full bg-cyan-700 dark:bg-cyan-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openLockedOrRoute(() => onNavigateTab('exam'))}
              className="inline-flex items-center justify-between w-full min-h-[40px] pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 cursor-pointer touch-manipulation"
            >
              <span>{isGuest ? 'Preview Mock Mode' : 'Continue Practice'}</span>
              <ArrowRight
                className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </article>

          {/* Step 03: 2-Streak Recovery + Connected Node Progress */}
          <article
            onMouseEnter={() => {
              setIsGridPaused(true);
              setActiveStepIndex(2);
            }}
            onFocusCapture={() => {
              setIsGridPaused(true);
              setActiveStepIndex(2);
            }}
            style={{ '--step-delay': STEP_DELAYS[2] } as React.CSSProperties}
            className={`hp-card hp-step-card ${gridVisible ? 'is-visible' : ''} ${
              activeStepIndex === 2 ? 'hp-card-highlight' : ''
            } group rounded-2xl p-5 flex flex-col justify-between gap-4`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-mono font-bold text-cyan-700 dark:text-cyan-400">
                  STEP 03
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {MISTAKE_CLEAR_THRESHOLD}-Streak Recovery
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Wrong items clear only after {MISTAKE_CLEAR_THRESHOLD} consecutive right solves.
              </p>

              {/* Animated Pipeline Demo */}
              <div className="hp-well rounded-xl p-2.5 space-y-2" aria-hidden="true">
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                  <span className="font-bold text-rose-700 dark:text-rose-400">0/2</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">1/2</span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 ${
                      activeStepIndex === 2 ? 'hp-demo-pulse' : ''
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {MISTAKE_CLEAR_THRESHOLD}/{MISTAKE_CLEAR_THRESHOLD}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    style={
                      {
                        '--bar-scale': activeStepIndex === 2 ? 1 : 0.72,
                        '--bar-delay': '240ms',
                      } as React.CSSProperties
                    }
                    className="hp-demo-bar h-full w-full rounded-full bg-emerald-600 dark:bg-emerald-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openLockedOrRoute(() => onNavigateTab('mistakes'))}
              className="inline-flex items-center justify-between w-full min-h-[40px] pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 cursor-pointer touch-manipulation"
            >
              <span>{isGuest ? 'Try 2-Streak Flow' : 'Continue Practice'}</span>
              <ArrowRight
                className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </article>

          {/* Step 04: Bookmarks & Analytics + Animated Telemetry Bars */}
          <article
            onMouseEnter={() => {
              setIsGridPaused(true);
              setActiveStepIndex(3);
            }}
            onFocusCapture={() => {
              setIsGridPaused(true);
              setActiveStepIndex(3);
            }}
            style={{ '--step-delay': STEP_DELAYS[3] } as React.CSSProperties}
            className={`hp-card hp-step-card ${gridVisible ? 'is-visible' : ''} ${
              activeStepIndex === 3 ? 'hp-card-highlight' : ''
            } group rounded-2xl p-5 flex flex-col justify-between gap-4`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <BarChart3 className="w-4 h-4" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-mono font-bold text-cyan-700 dark:text-cyan-400">
                  STEP 04
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Bookmarks &amp; Analytics
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                Pin tough cases and isolate weak units scoring below 70%.
              </p>

              {/* Animated Unit Bars Micro-Demo */}
              <div className="hp-well rounded-xl p-2.5 space-y-1.5" aria-hidden="true">
                {[
                  { label: 'HEM', pct: 0.84, delay: '120ms', cls: 'bg-cyan-700 dark:bg-cyan-400' },
                  { label: 'AST', pct: 0.58, delay: '200ms', cls: 'bg-rose-600 dark:bg-rose-400' },
                ].map((bar) => (
                  <div key={bar.label} className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="w-7 text-slate-600 dark:text-slate-300 font-bold">{bar.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        style={
                          {
                            '--bar-scale': bar.pct,
                            '--bar-delay': bar.delay,
                          } as React.CSSProperties
                        }
                        className={`hp-demo-bar h-full w-full rounded-full ${bar.cls}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => openLockedOrRoute(() => onNavigateTab('dashboard'))}
              className="inline-flex items-center justify-between w-full min-h-[40px] pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 cursor-pointer touch-manipulation"
            >
              <span>{isGuest ? 'Preview Analytics' : 'Dashboard'}</span>
              <ArrowRight
                className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </article>
        </div>

        {/* Pop-Out Horizontal Subject Carousel (~3 focal cards visible) */}
        <div className="space-y-4 pt-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Core Lab Subjects
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {subjectCards.length} featured disciplines · Swipe or use arrow keys to browse
            </p>
          </div>

          <HorizontalSnapScroller
            ariaLabel="Core Laboratory Subjects"
            scrollHintText="Swipe or use ← → keys to browse subjects"
          >
            {subjectCards.map((item) => (
              <button
                key={item.id}
                type="button"
                data-scroller-card=""
                data-focal="true"
                onClick={() =>
                  openLockedOrRoute(() =>
                    onSelectSubject ? onSelectSubject(item.name) : onNavigateTab('practice')
                  )
                }
                className="hp-card hp-pop-card group w-[78vw] sm:w-[290px] lg:w-[calc((100%-2.5rem)/3)] shrink-0 snap-start rounded-2xl p-5 text-left flex flex-col justify-between gap-4 cursor-pointer touch-manipulation"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-rotate-3">
                    <SubjectIcon
                      icon={item.icon}
                      name={item.name}
                      className="w-5 h-5"
                      aria-hidden="true"
                    />
                  </div>
                  {item.unitsCount > 0 && (
                    <span className="hp-well px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums shrink-0">
                      {item.unitsCount} units
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 leading-snug">
                  {item.name}
                </h4>

                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-cyan-700 dark:text-cyan-400">
                  <span>{isGuest ? 'Explore Discipline' : 'Continue Practice'}</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
              </button>
            ))}
          </HorizontalSnapScroller>
        </div>
      </div>
    </section>
  );
};
