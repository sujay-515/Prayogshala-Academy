import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookCheck,
  BookOpen,
  Microscope,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import type { UserAccount } from '../../types';
import { SITE_CONFIG, isConfigured } from '../../config/site';

interface EditorialStandardsSectionProps {
  currentUser?: UserAccount | null;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  onStartPractice: () => void;
  onNavigateCeeUg: () => void;
}

export const EditorialStandardsSection: React.FC<EditorialStandardsSectionProps> = ({
  currentUser,
  onOpenAuthModal,
  onStartPractice,
  onNavigateCeeUg,
}) => {
  const hasEmail = isConfigured(SITE_CONFIG.CONTACT_EMAIL);

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Editorial Standards Header */}
        <div className="max-w-3xl space-y-3">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">
            04 · Editorial &amp; Exam Standards
          </div>
          <h2
            id="about-heading"
            className="font-serif-heading text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight text-balance"
          >
            Designed around clinical accuracy and exam-room integrity
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-[62ch]">
            {SITE_CONFIG.SITE_NAME} organizes laboratory science items by diagnostic unit, verifies clinical reasoning through differential rationales, and simulates strict timed exam scoring.
          </p>
        </div>

        {/* 3 Governance Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <article className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center">
              <Microscope className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Syllabus-Mapped Taxonomy
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Questions map cleanly across bacteriology, antimicrobial susceptibility, clinical enzymology, anemias, immunohematology, histopathology, and laboratory quality systems for ASCP, NHPC, PSC, DHA, AIMS, and CEE-UG.
            </p>
          </article>

          <article className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center">
              <BookCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Differential Verification
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Explanations document reference intervals, staining reactions, and distractor exclusions so candidates understand why an answer is ruled in or out, backed by textbook references where available.
            </p>
          </article>

          <article className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Timed Assessment Integrity
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Mock examinations withhold answer keys until submission, validate sitting durations server-side, and let candidates flag items or report errata directly inside the review workflow.
            </p>
          </article>
        </div>

        {/* Conditional Errata / Support Strip */}
        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="space-y-1">
            <p className="leading-relaxed">
              Need help with syllabus scope, account syncing, or question errata?
              {hasEmail && (
                <>
                  {' '}
                  Contact{' '}
                  <a
                    href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`}
                    className="font-semibold text-cyan-700 dark:text-cyan-400 hover:underline"
                  >
                    {SITE_CONFIG.CONTACT_EMAIL}
                  </a>
                  .
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0 font-semibold">
            <Link
              to="/help"
              className="inline-flex items-center min-h-[44px] text-cyan-700 dark:text-cyan-400 hover:underline"
            >
              Help Center
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center min-h-[44px] text-cyan-700 dark:text-cyan-400 hover:underline"
            >
              Contact &amp; Errata
            </Link>
          </div>
        </div>

        {/* Closing Conversion Band */}
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 lg:p-12">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <h3 className="font-serif-heading text-2xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight text-balance">
              {!currentUser
                ? `Create your free ${SITE_CONFIG.SITE_NAME} account today`
                : `Continue preparing with ${SITE_CONFIG.SITE_NAME}`}
            </h3>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
              {!currentUser
                ? 'Save your practice accuracy, sync your two-streak Mistakes Notebook across sessions, bookmark high-yield vignettes, and track timed readiness.'
                : 'Jump back into topic practice, test your pacing under timed mock conditions, or sit the 200-question CEE-UG entrance paper.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {!currentUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => (onOpenAuthModal ? onOpenAuthModal('register') : onStartPractice())}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] w-full sm:w-auto rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] font-bold text-sm sm:text-base shadow-sm transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation"
                  >
                    <UserPlus className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={onStartPractice}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] w-full sm:w-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-cyan-600 dark:hover:border-cyan-400 text-slate-900 dark:text-slate-100 font-semibold text-sm sm:text-base transition-colors cursor-pointer touch-manipulation"
                  >
                    <BookOpen className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                    <span>Try Instant Practice</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onStartPractice}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] w-full sm:w-auto rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] font-bold text-sm sm:text-base shadow-sm transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation"
                >
                  <BookOpen className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>Start Practice Session</span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                onClick={onNavigateCeeUg}
                className="inline-flex items-center justify-center gap-1.5 min-h-[48px] px-3 text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors cursor-pointer touch-manipulation"
              >
                <span>Try CEE-UG mock</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
