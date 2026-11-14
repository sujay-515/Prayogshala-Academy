import React from 'react';
import { ArrowRight, Stethoscope, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ALL_EXAM_CATEGORIES } from '../../utils/examCategories';
import type { ExamCategory } from '../../types';
import {
  CEE_UG_TOTAL_QUESTIONS,
  CEE_UG_TOTAL_MARKS,
  CEE_UG_DURATION_MINUTES,
  CEE_UG_PENALTY_PER_WRONG,
  CEE_UG_PASSING_PERCENTAGE,
  CEE_UG_NAME,
} from '../../config/ceeUg';

interface ExamsSectionProps {
  onSelectExam?: (exam: ExamCategory) => void;
  onNavigateCeeUg: () => void;
}

export const ExamsSection: React.FC<ExamsSectionProps> = ({
  onSelectExam,
  onNavigateCeeUg,
}) => {
  const boardDescriptions: Record<ExamCategory, { title: string; subtitle: string; scope: string }> = {
    ASCP: {
      title: 'ASCP International (MLS/MLT)',
      subtitle: 'American Society for Clinical Pathology',
      scope: 'Blood Banking, Urinalysis, Chemistry, Hematology, Immunology, Microbiology, Lab Ops',
    },
    NHPC: {
      title: 'NHPC Licensure Exam',
      subtitle: 'Nepal Health Professional Council',
      scope: 'Standard licensure syllabus for Medical Laboratory Technologists and Technicians',
    },
    PSC: {
      title: 'PSC / Lok Sewa Aayog',
      subtitle: 'Public Service Commission (Laboratory)',
      scope: 'Service curriculum MCQs, diagnostic criteria, national laboratory guidelines',
    },
    DHA: {
      title: 'DHA Licensure Exam',
      subtitle: 'Dubai Health Authority',
      scope: 'Clinical pathology, quality assurance, diagnostic protocols for Gulf licensure',
    },
    AIMS: {
      title: 'AIMS Professional Examination',
      subtitle: 'Australian Institute of Medical Scientists',
      scope: 'Discipline-based professional assessment for medical laboratory scientist migration',
    },
    'CEE-UG': {
      title: 'CEE-UG Medical Entrance',
      subtitle: 'Medical Education Commission Entrance',
      scope: 'Biology (80), Chemistry (50), Physics (50), Mental Agility (20) - Standalone Mock',
    },
  };

  return (
    <section
      id="exams"
      aria-labelledby="exams-heading"
      className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h2
            id="exams-heading"
            className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight"
          >
            Calibrated for National &amp; International Licensure
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Every question in the bank is categorized by discipline and tagged with relevant board blueprints. Prepare specifically for your target licensing authority or entrance track.
          </p>
        </div>

        {/* CEE-UG Spotlight Card */}
        <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                CEE-UG Medical Entrance Mock Examination
              </h3>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Simulate the undergraduate medical entrance examination with exact negative marking, full 200-question sittings, and high-stakes 3-hour pacing.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Structure</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{CEE_UG_TOTAL_QUESTIONS} MCQs</span>
                </div>
                <div className="p-3 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Duration</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{CEE_UG_DURATION_MINUTES} Minutes</span>
                </div>
                <div className="p-3 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Total Marks</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{CEE_UG_TOTAL_MARKS} Marks</span>
                </div>
                <div className="p-3 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Negative Marking</span>
                  <span className="text-lg font-bold text-rose-600 dark:text-rose-400">-{CEE_UG_PENALTY_PER_WRONG}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onNavigateCeeUg}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-slate-950 font-bold text-sm shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Launch CEE-UG Entrance Mock</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white/90 dark:bg-slate-950/70 rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Curriculum Blueprint Distribution
              </h4>
              <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-white/5">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600 dark:text-slate-400">Biology (Botany &amp; Zoology)</span>
                  <span className="font-bold text-slate-900 dark:text-white">80 Questions</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600 dark:text-slate-400">Chemistry (Org / Inorg / Phys)</span>
                  <span className="font-bold text-slate-900 dark:text-white">50 Questions</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600 dark:text-slate-400">Physics &amp; Mechanics</span>
                  <span className="font-bold text-slate-900 dark:text-white">50 Questions</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600 dark:text-slate-400">Mental Agility Test (MAT)</span>
                  <span className="font-bold text-slate-900 dark:text-white">20 Questions</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600 dark:text-slate-400">Benchmark Passing Cutoff</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{CEE_UG_PASSING_PERCENTAGE}% Benchmark</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Board Cards Grid (Laboratory Medicine Licensing) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ALL_EXAM_CATEGORIES.filter((cat) => cat !== 'CEE-UG').map((cat) => {
            const info = boardDescriptions[cat];
            return (
              <div
                key={cat}
                className="rounded-xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 space-y-3 hover:border-cyan-500/40 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-base text-slate-900 dark:text-white">
                      {info.title}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {cat}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-cyan-800 dark:text-cyan-400">
                    {info.subtitle}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {info.scope}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Curriculum Aligned
                  </span>
                  {onSelectExam && (
                    <button
                      type="button"
                      onClick={() => onSelectExam(cat)}
                      className="text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore Exam</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
