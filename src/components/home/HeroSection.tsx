import React from 'react';
import { ArrowRight, BookOpen, GraduationCap, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';
import { SITE_CONFIG } from '../../config/site';

interface HeroSectionProps {
  onStartPractice: () => void;
  onTakeMock: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartPractice,
  onTakeMock,
}) => {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 overflow-hidden"
    >
      {/* Soft Ambient Cyan Mesh Background */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-cyan-200/25 via-teal-100/20 to-transparent dark:from-cyan-900/15 dark:via-teal-950/10 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Headline, Value Proposition, Action CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Editorial Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-100/90 dark:bg-cyan-950/70 border border-cyan-200/80 dark:border-cyan-800/40 text-cyan-900 dark:text-cyan-300 text-xs font-semibold tracking-wide shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-cyan-600 dark:bg-cyan-400 animate-pulse" aria-hidden="true" />
              <span>Medical Laboratory Science &amp; Entrance Preparation</span>
            </div>

            {/* Main Headline */}
            <h1
              id="hero-heading"
              className="text-3xl sm:text-5xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.12]"
            >
              Master Laboratory Medicine with{' '}
              <span className="text-cyan-700 dark:text-cyan-400 underline decoration-cyan-400/40 decoration-wavy decoration-2 underline-offset-4">
                Diagnostic Precision
              </span>
            </h1>

            {/* One-Line Value Proposition */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Curated clinical question banks, full-length timed mock exams, and structured mistake recovery for ASCP, NHPC, PSC, DHA, AIMS licensure and CEE-UG medical entrance.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                type="button"
                onClick={onStartPractice}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-slate-950 font-bold text-sm sm:text-base shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <BookOpen className="w-5 h-5 shrink-0" />
                <span>Start Preparing</span>
                <ArrowRight className="w-4 h-4 shrink-0 ml-0.5" />
              </button>

              <button
                type="button"
                onClick={onTakeMock}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 text-slate-800 dark:text-white font-semibold text-sm sm:text-base border border-slate-300/80 dark:border-white/15 shadow-xs hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <GraduationCap className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>Take Mock Examination</span>
              </button>
            </div>

            {/* Trust Micro-Bullets */}
            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Server-verified answer keys</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Official examination blueprints</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Standardized negative marking</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive App Preview Area */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer decorative card frame */}
              <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-200/80 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 ml-1.5 tracking-tight">
                      Practice Simulator · Active Unit
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300 uppercase tracking-wider">
                    Live Session
                  </span>
                </div>

                {/* Sample Vignette */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Question 1 of 20</span>
                    <span className="flex items-center gap-1 text-cyan-700 dark:text-cyan-400 font-medium text-[11px]">
                      <Sparkles className="w-3 h-3 text-amber-500" /> High-Yield Analytic
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                    A patient with severe metabolic acidosis exhibits an elevated anion gap of 22 mEq/L. Which laboratory etiology accounts for this unmeasured anion accumulation?
                  </p>

                  <div className="space-y-2 pt-1" role="presentation">
                    <div className="p-2.5 rounded-xl border border-cyan-600 dark:border-cyan-400 bg-cyan-50/80 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-200 flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-cyan-700 dark:bg-cyan-400 text-white dark:text-slate-950 flex items-center justify-center text-[11px] font-bold">
                          A
                        </span>
                        <span>Diabetic ketoacidosis (β-hydroxybutyrate)</span>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" />
                    </div>

                    <div className="p-2.5 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-600 dark:text-slate-300 flex items-center gap-2.5 text-xs opacity-80">
                      <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[11px] font-semibold">
                        B
                      </span>
                      <span>Severe diarrhea (bicarbonate loss)</span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-600 dark:text-slate-300 flex items-center gap-2.5 text-xs opacity-80">
                      <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[11px] font-semibold">
                        C
                      </span>
                      <span>Renal tubular acidosis Type 2</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      Instant clinical explanation and differential diagnosis displayed immediately upon submission.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
