import React from 'react';
import {
  RotateCcw,
  Bookmark,
  BarChart3,
  Timer,
  Clock,
  TrendingUp,
  FileText,
  AlertCircle,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { FeatureRow } from './FeatureRow';
import { ExplanationCardPreview } from './ExplanationCardPreview';
import { MISTAKE_CLEAR_THRESHOLD } from '../../utils/mistakes';
import {
  CEE_UG_TOTAL_QUESTIONS,
  CEE_UG_DURATION_MINUTES,
  CEE_UG_PENALTY_PER_WRONG,
  CEE_UG_TOTAL_MARKS,
} from '../../config/ceeUg';
import {
  GRAND_TEST_OPEN_DAY,
  GRAND_TEST_OPEN_HOUR,
  GRAND_TEST_CLOSE_DAY,
} from '../../utils/examWindow';

export const FeaturesSection: React.FC = () => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const grandOpenDay = dayNames[GRAND_TEST_OPEN_DAY];
  const grandCloseDay = dayNames[GRAND_TEST_CLOSE_DAY];

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-8 sm:mb-16">
        <div className="inline-block px-3 py-1 rounded-full bg-cyan-100 text-cyan-900 dark:bg-cyan-950/80 dark:text-cyan-300 font-bold text-xs uppercase tracking-wider border border-cyan-200/80 dark:border-cyan-800/40">
          Engineered for Exam Day
        </div>
        <h2
          id="features-heading"
          className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight"
        >
          Everything you need to qualify your medical licensure
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Prayogshala Academy replaces rote memorization with verified diagnostic reasoning, paced timed simulations, and strict mistake remediation.
        </p>
      </div>

      <div className="divide-y divide-slate-200/70 dark:divide-white/10">
        {/* Feature 1: Clinical Practice & Rationales */}
        <FeatureRow
          label="Targeted Practice"
          heading="Diagnostic rationales for every option"
          description="Practice curriculum units across all 15 laboratory disciplines. Immediate answer checks reveal why the correct diagnosis applies and why alternative differentials are excluded."
          bullets={[
            'Full clinical vignettes covering diagnostic criteria and laboratory methods',
            'Differential rationales explaining distractor options',
            'Canonical textbook and guideline citations for authoritative review',
          ]}
          visual={<ExplanationCardPreview />}
        />

        {/* Feature 2: Mistakes Recovery */}
        <FeatureRow
          reversed
          label="Error Remediation"
          heading={`Two consecutive correct answers to clear any mistake`}
          description={`Every question answered incorrectly is automatically routed to your personal Mistakes Notebook. A question remains in your remediation queue until you answer it correctly on ${MISTAKE_CLEAR_THRESHOLD} consecutive attempts, eliminating lucky guesses.`}
          bullets={[
            `Rigorous ${MISTAKE_CLEAR_THRESHOLD}-streak clearing requirement prevents premature removal`,
            'Dedicated remediation mode to practice only your active mistake queue',
            'Real-time mistake counter in the navigation bar keeps revision top-of-mind',
          ]}
          visual={
            <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg border border-slate-200/80 dark:border-white/10">
              <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Mistakes Notebook</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Strict two-step remediation</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-300">
                  Active Queue
                </span>
              </div>

              {/* Sample Mistake Item */}
              <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-rose-900 dark:text-rose-300">Immunohematology</span>
                  <span className="text-slate-500 dark:text-slate-400">Streak: 1 / {MISTAKE_CLEAR_THRESHOLD}</span>
                </div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                  Which test differentiates rouleaux formation from true antibody-mediated red cell agglutination?
                </p>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-medium">1 more correct answer required to clear</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                    Saline Replacement
                  </span>
                </div>
              </div>

              <div className="rounded-xl p-3 bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>Mistakes cleared this week:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">14 Questions Mastered</span>
              </div>
            </div>
          }
        />

        {/* Feature 3: Bookmarks & Study Notes */}
        <FeatureRow
          label="Personal Knowledge Base"
          heading="Save questions and record diagnostic notes"
          description="Flag challenging clinical concepts during practice or mock reviews. Attach custom study notes directly to each question to build a high-yield reference library tailored to your weak points."
          bullets={[
            'One-click bookmarking during practice and timed exam reviews',
            'Editable in-place study notes for clinical mnemonics and criteria',
            'Start custom practice sessions filtered directly from your bookmarked items',
          ]}
          visual={
            <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg border border-slate-200/80 dark:border-white/10">
              <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                    <Bookmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Bookmarks Library</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Saved items with personal annotations</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-400">
                  Custom Practice Ready
                </span>
              </div>

              {/* Sample Bookmark with Note */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Clinical Microbiology</span>
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <Bookmark className="w-3 h-3 fill-current" /> Flagged
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                  Which test differentiates Staphylococcus aureus from other catalase-positive Gram-positive cocci?
                </p>

                {/* Study Note Preview */}
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-950 dark:text-amber-200 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>Study Note</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Bound coagulase (clumping factor) tested via slide; free coagulase tested via rabbit plasma tube test (4h incubation at 35°C).
                  </p>
                </div>
              </div>
            </div>
          }
        />

        {/* Feature 4: Analytics, Pacing & Readiness */}
        <FeatureRow
          reversed
          label="Performance Analytics"
          heading="Track subject accuracy, pacing, and estimated readiness"
          description="Identify your weakest syllabus sections before exam day. Detailed analytics monitor your average, fastest, and slowest seconds per question, active study streaks, and heuristic score projection."
          bullets={[
            'Discipline breakdown automatically highlights units below 70% accuracy',
            'Pacing metrics measure seconds per item to prevent running out of time',
            'Explainable predicted score based on real practice and mock attempts',
          ]}
          visual={
            <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg border border-slate-200/80 dark:border-white/10">
              <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Readiness &amp; Pacing</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Diagnostic telemetry</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> High Readiness
                </span>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Average Pacing</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block flex items-baseline gap-1">
                    42s <span className="text-[11px] font-normal text-slate-500">/ MCQ</span>
                  </span>
                  <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-medium">Optimal for 180m exams</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Estimated Score</span>
                  <span className="text-xl font-bold text-cyan-700 dark:text-cyan-400 mt-0.5 block">
                    78% <span className="text-[11px] font-normal text-slate-500">±4%</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Above pass threshold</span>
                </div>
              </div>

              {/* Subject Breakdown Bars */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Clinical Hematology</span>
                    <span className="font-bold text-slate-900 dark:text-white">84%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-cyan-600 dark:bg-cyan-400 rounded-full" style={{ width: '84%' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Bacteriology &amp; AST</span>
                    <span className="font-bold text-slate-900 dark:text-white">76%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-cyan-600 dark:bg-cyan-400 rounded-full" style={{ width: '76%' }} />
                  </div>
                </div>
              </div>
            </div>
          }
        />

        {/* Feature 5: Standardized Timed Mock Exams & Grand Tests */}
        <FeatureRow
          label="Exam Simulation"
          heading="Timed mock sittings and weekly Grand Tests"
          description={`Experience actual test conditions with official blueprints, strict countdown timers, and standardized negative marking. Sit the weekly national Grand Test every ${grandOpenDay} through ${grandCloseDay}.`}
          bullets={[
            `CEE-UG Entrance: ${CEE_UG_TOTAL_QUESTIONS} questions, ${CEE_UG_DURATION_MINUTES} minutes, -${CEE_UG_PENALTY_PER_WRONG} negative marking`,
            'Board-specific blueprints for ASCP, NHPC, PSC, DHA, and AIMS',
            `Weekly Grand Test window (${grandOpenDay} 11:00 AM to ${grandCloseDay} midnight)`,
          ]}
          visual={
            <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg border border-slate-200/80 dark:border-white/10">
              <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center">
                    <Timer className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Exam Simulation Engine</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Strict blueprint calibrator</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 uppercase tracking-wider">
                  CEE-UG Standard
                </span>
              </div>

              {/* Blueprint Metrics Table */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Questions</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {CEE_UG_TOTAL_QUESTIONS}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Duration</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {CEE_UG_DURATION_MINUTES}m
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Penalty</span>
                  <span className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">
                    -{CEE_UG_PENALTY_PER_WRONG}
                  </span>
                </div>
              </div>

              {/* Grand Test Schedule Banner */}
              <div className="p-3 rounded-xl bg-cyan-50/80 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 text-xs text-cyan-950 dark:text-cyan-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" />
                  <span>
                    <strong>Grand Test Window:</strong> {grandOpenDay} 11:00 AM – {grandCloseDay}
                  </span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
            </div>
          }
        />
      </div>
    </section>
  );
};
