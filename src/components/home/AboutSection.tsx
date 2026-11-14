import React from 'react';
import { Microscope, Award, BookCheck, ShieldAlert } from 'lucide-react';
import { SITE_CONFIG, isConfigured } from '../../config/site';

export const AboutSection: React.FC = () => {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-950"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="max-w-3xl space-y-4">
          <h2
            id="about-heading"
            className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight"
          >
            Built for clinical precision in medical laboratory licensure
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            {SITE_CONFIG.SITE_NAME} provides question banks, timed mock exams, and structured review for medical laboratory licensure candidates and entrance students.
          </p>
        </div>

        {/* 3 Pillars - Clean Typography & Whitespace */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
          <div className="space-y-2.5">
            <Microscope className="w-6 h-6 text-cyan-700 dark:text-cyan-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Specialized Laboratory Scope
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Practice subjects focus on medical laboratory disciplines: diagnostic bacteriology, antimicrobial susceptibility, clinical enzymology, hemoglobinopathies, immunohematology, and laboratory quality assurance.
            </p>
          </div>

          <div className="space-y-2.5">
            <BookCheck className="w-6 h-6 text-cyan-700 dark:text-cyan-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Evidence-Based Rationales
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Practice items include diagnostic rationales explaining correct answers and distractors, with textbook references where available.
            </p>
          </div>

          <div className="space-y-2.5">
            <Award className="w-6 h-6 text-cyan-700 dark:text-cyan-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Rigorous Remediation
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Learning requires confronting mistakes. Our proprietary Mistakes Recovery workflow isolates incorrect answers and requires two consecutive correct submissions before an item is marked as mastered.
            </p>
          </div>
        </div>

        {/* Curriculum Alignment & Editorial Standards - Hairline Divider */}
        <div className="pt-8 border-t border-slate-200/70 dark:border-white/10 space-y-3">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Syllabus Alignment &amp; Editorial Standards
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl">
            Questions are organized by subject discipline for ASCP, NHPC, PSC, DHA, AIMS, and CEE-UG examinations. Practice sets cover core curriculum topics, standard laboratory reference values, and diagnostic methods.
          </p>
          {isConfigured(SITE_CONFIG.CONTACT_EMAIL) && (
            <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              For syllabus alignment inquiries or errata submissions, contact{' '}
              <a
                href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`}
                className="font-semibold text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-400 underline underline-offset-2"
              >
                {SITE_CONFIG.CONTACT_EMAIL}
              </a>.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
