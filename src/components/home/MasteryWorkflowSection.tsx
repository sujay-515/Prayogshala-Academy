import React from 'react';
import {
  Activity,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  FileCheck2,
  RotateCcw,
  Timer,
} from 'lucide-react';
import type { SubjectCategory, SubjectUnit } from '../../types';
import { MISTAKE_CLEAR_THRESHOLD } from '../../utils/mistakes';
import { SubjectIcon } from '../SubjectIcon';

interface MasteryWorkflowSectionProps {
  categories: SubjectCategory[];
  onSelectSubject?: (subjectName: string) => void;
  onSelectUnit?: (unitName: string) => void;
  onNavigateTab: (tab: 'home' | 'practice' | 'exam' | 'cee-ug' | 'mistakes' | 'dashboard' | 'admin') => void;
}

export const MasteryWorkflowSection: React.FC<MasteryWorkflowSectionProps> = ({
  categories,
  onSelectSubject,
  onSelectUnit,
  onNavigateTab,
}) => {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Heading */}
        <div className="max-w-3xl space-y-3">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">
            01 · Clinical Mastery Workflow
          </div>
          <h2
            id="features-heading"
            className="font-serif-heading text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight text-balance"
          >
            Built to turn missed questions into durable clinical reasoning
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-[62ch]">
            Every study tool inside Prayogshala Academy shares one closed feedback loop: learn differential rules during practice, trap weaknesses in a two-hit review queue, and validate speed under exam timing.
          </p>
        </div>

        {/* 4-Stage Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6">
          {/* Stage 01: Diagnostic Rationales (7 cols) */}
          <article className="md:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                  <FileCheck2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Stage 01 · Diagnostic Rationales</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Immediate Answer Check
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Option-by-option differential reasoning &amp; textbook citations
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Practice questions go beyond marking A–D right or wrong. Each check reveals why the primary diagnosis fits the laboratory panel, why competing differentials are excluded, and where the guideline is referenced.
              </p>
            </div>

            {/* Clean Visual Schematic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>Confirmed Mechanism</span>
                </div>
                <p className="text-emerald-900 leading-relaxed">
                  Direct laboratory threshold, staining hallmark, or enzyme confirmation behind the keyed option.
                </p>
              </div>
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <Activity className="w-4 h-4 text-rose-700 shrink-0" aria-hidden="true" />
                  <span>Distractor Exclusion</span>
                </div>
                <p className="text-rose-900 leading-relaxed">
                  Explicitly identifies normal vs. discordant markers that rule out close look-alike pathologies.
                </p>
              </div>
            </div>
          </article>

          {/* Stage 02: Mistakes Recovery (5 cols) */}
          <article className="md:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                  <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Stage 02 · Mistakes Notebook</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                  {MISTAKE_CLEAR_THRESHOLD}× Streak Rule
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Two consecutive correct answers to clear any mistake
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Any wrong answer enters your Mistakes Notebook at <span className="font-mono font-semibold">0/{MISTAKE_CLEAR_THRESHOLD}</span>. You must solve it correctly on {MISTAKE_CLEAR_THRESHOLD} consecutive attempts before it clears — preventing single lucky guesses from masking weak areas.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="font-semibold">Wrong answer recorded</span>
                <span className="font-mono font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                  0 / {MISTAKE_CLEAR_THRESHOLD} Queued
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="font-semibold">First successful recall</span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  1 / {MISTAKE_CLEAR_THRESHOLD} Held
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="font-semibold">Second consecutive recall</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {MISTAKE_CLEAR_THRESHOLD} / {MISTAKE_CLEAR_THRESHOLD} Cleared
                </span>
              </div>
            </div>
          </article>

          {/* Stage 03: Bookmarks & Clinical Notes (5 cols) */}
          <article className="md:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                <Bookmark className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Stage 03 · Bookmarks &amp; Notes</span>
              </span>

              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Annotate tricky criteria into custom revision sets
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Save high-yield questions mid-session or during post-mock review, attach personal reference notes or folders, and launch targeted practice runs filtered strictly from your bookmarked deck.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab('practice')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 dark:text-cyan-400 hover:underline min-h-[44px] cursor-pointer touch-manipulation"
              >
                <span>Open Question Bank</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </article>

          {/* Stage 04: Pacing & Readiness Telemetry (7 cols) */}
          <article className="md:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                  <Timer className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Stage 04 · Pacing &amp; Readiness</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  &lt; 70% Weak-Area Flagging
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Track seconds per question, weak units, and readiness bands
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Post-exam analytics compute average, fastest, and slowest seconds per item to catch rushing or over-deliberating habits, automatically flag curriculum units scoring under 70%, and estimate exam readiness from real practice and mock history.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5">
              <div>
                <div className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  &lt; 70%
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  Weak-unit threshold
                </div>
              </div>
              <div className="border-x border-slate-200 dark:border-slate-800 px-2">
                <div className="text-lg sm:text-xl font-extrabold font-mono text-cyan-700 dark:text-cyan-400 tabular-nums">
                  s / item
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  Mean, min &amp; max pace
                </div>
              </div>
              <div>
                <div className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  0–100%
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  Explainable band
                </div>
              </div>
            </div>
          </article>
        </div>

        {/* Live Laboratory Discipline & Curriculum Unit Launcher */}
        {categories.length > 0 && (
          <div className="space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Browse Curriculum by Laboratory Discipline
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Select any specialty or curriculum unit to launch a focused practice session immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('practice')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 dark:text-cyan-400 hover:underline min-h-[44px] shrink-0 cursor-pointer touch-manipulation"
              >
                <span>Explore all disciplines</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const units: SubjectUnit[] =
                  cat.units || (cat as { subjects?: SubjectUnit[] }).subjects || [];

                return (
                  <div
                    key={cat.id}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center shrink-0">
                            <SubjectIcon
                              icon={cat.icon}
                              name={cat.name}
                              className="w-5 h-5"
                              aria-hidden="true"
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-snug">
                              {cat.name}
                            </h4>
                            <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                              {units.length} curriculum {units.length === 1 ? 'unit' : 'units'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {cat.description}
                      </p>

                      {units.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {units.slice(0, 4).map((unit) => (
                            <button
                              key={unit.id}
                              type="button"
                              onClick={() =>
                                onSelectUnit ? onSelectUnit(unit.name) : onNavigateTab('practice')
                              }
                              className="inline-flex items-center text-left text-[11px] font-medium px-3 py-2 min-h-[44px] rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-600 dark:hover:border-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 transition-colors cursor-pointer touch-manipulation"
                            >
                              {unit.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() =>
                          onSelectSubject ? onSelectSubject(cat.name) : onNavigateTab('practice')
                        }
                        className="inline-flex items-center justify-between w-full min-h-[44px] text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 transition-colors cursor-pointer touch-manipulation"
                      >
                        <span>Practice {cat.name}</span>
                        <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
