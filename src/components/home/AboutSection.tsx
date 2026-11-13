import React from 'react';
import { Microscope, Award, BookCheck, ShieldAlert } from 'lucide-react';
import { SITE_CONFIG } from '../../config/site';

export const AboutSection: React.FC = () => {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-950"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="max-w-3xl space-y-4">
          <div className="inline-block px-3 py-1 rounded-full bg-cyan-100 text-cyan-900 dark:bg-cyan-950/80 dark:text-cyan-300 font-bold text-xs uppercase tracking-wider border border-cyan-200/80 dark:border-cyan-800/40">
            About {SITE_CONFIG.SITE_NAME}
          </div>
          <h2
            id="about-heading"
            className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight"
          >
            Built for clinical precision in medical laboratory licensure
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            {SITE_CONFIG.SITE_NAME} was founded to address the critical gap in rigorous, syllabus-aligned examination preparation for laboratory professionals and medical candidates.
          </p>
        </div>

        {/* 3 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400 flex items-center justify-center">
              <Microscope className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Specialized Laboratory Scope
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Unlike generic medical question banks, our items focus on actual bench science: diagnostic bacteriology, antimicrobial susceptibility (AST), clinical enzymology, hemoglobinopathies, immunohematology, and laboratory quality assurance.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400 flex items-center justify-center">
              <BookCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Evidence-Based Rationales
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Every practice item includes a diagnostic explanation citing canonical laboratory textbooks (Henry's Clinical Diagnosis, Rodak's Hematology, Bailey &amp; Scott's Microbiology) so candidates learn the clinical mechanism behind each finding.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Rigorous Remediation
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Learning requires confronting mistakes. Our proprietary Mistakes Recovery workflow isolates incorrect answers and requires two consecutive correct submissions before an item is marked as mastered.
            </p>
          </div>
        </div>

        {/* Mission Statement & Operator Narrative Block */}
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 space-y-3">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Editorial Integrity &amp; Authorship
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {/* [PLACEHOLDER: Insert institutional founder statement or editorial background below] */}
            Questions are authored and verified by experienced laboratory medicine educators and pathologists. We do not use web scraping or automated scraping scripts. All clinical questions are peer-reviewed for diagnostic consistency, standard reference ranges, and syllabus compliance across ASCP, NHPC, PSC, DHA, AIMS, and CEE-UG examination standards.
          </p>
          <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400">
            For institutional syllabus alignment or editorial inquiries, contact{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {SITE_CONFIG.CONTACT_EMAIL}
            </span>.
          </div>
        </div>
      </div>
    </section>
  );
};
