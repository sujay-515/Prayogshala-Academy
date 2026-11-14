import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookCheck,
  BookOpen,
  LayoutDashboard,
  Microscope,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import type { UserAccount } from '../../types';
import { SITE_CONFIG, isConfigured } from '../../config/site';
import { useScrollReveal } from './homeMotion';

interface EditorialStandardsSectionProps {
  currentUser?: UserAccount | null;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  onStartPractice: () => void;
  onNavigateDashboard: () => void;
}

export const EditorialStandardsSection: React.FC<EditorialStandardsSectionProps> = ({
  currentUser,
  onOpenAuthModal,
  onStartPractice,
  onNavigateDashboard,
}) => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>(0.08);
  const hasEmail = isConfigured(SITE_CONFIG.CONTACT_EMAIL);
  const isGuest = !currentUser;

  const openGuestSignup = () => {
    if (onOpenAuthModal) {
      onOpenAuthModal('register');
    } else {
      onStartPractice();
    }
  };

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="hp-section-tinted py-14 sm:py-20 border-t border-slate-200/80 dark:border-slate-800"
    >
      <div
        ref={ref}
        className={`hp-reveal ${isVisible ? 'is-visible' : ''} max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10`}
      >
        {/* Short Heading */}
        <div className="space-y-2 max-w-xl">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">
            05 · Clinical Standards
          </div>
          <h2
            id="about-heading"
            className="font-serif-heading text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight text-balance"
          >
            Built for Clinical Exam Precision
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 line-clamp-2">
            Unit-mapped taxonomy, verified rationales, and server-timed mock exams.
          </p>
        </div>

        {/* 3 Visual Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <article className="hp-card rounded-2xl p-5 space-y-2.5 transition-[border-color,transform] duration-150 hover:-translate-y-0.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center">
              <Microscope className="w-4 h-4" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Syllabus-Mapped Units
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
              Aligned with ASCP, NHPC, PSC, DHA, AIMS, and CEE-UG curricula.
            </p>
          </article>

          <article className="hp-card rounded-2xl p-5 space-y-2.5 transition-[border-color,transform] duration-150 hover:-translate-y-0.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center">
              <BookCheck className="w-4 h-4" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Cited Rationales
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
              Option exclusions backed by lab thresholds and textbook chapters.
            </p>
          </article>

          <article className="hp-card rounded-2xl p-5 space-y-2.5 transition-[border-color,transform] duration-150 hover:-translate-y-0.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Server-Timed Integrity
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
              Answer keys withheld until finish with instant errata reporting.
            </p>
          </article>
        </div>

        {/* Support Strip */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
          <span>
            Questions or errata?
            {hasEmail && (
              <>
                {' '}
                Email{' '}
                <a
                  href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`}
                  className="font-semibold text-cyan-700 dark:text-cyan-400 hover:underline"
                >
                  {SITE_CONFIG.CONTACT_EMAIL}
                </a>
                .
              </>
            )}
          </span>
          <div className="flex items-center gap-4 font-semibold">
            <Link to="/help" className="text-cyan-700 dark:text-cyan-400 hover:underline py-1">
              Help Center
            </Link>
            <Link to="/contact" className="text-cyan-700 dark:text-cyan-400 hover:underline py-1">
              Contact &amp; Errata
            </Link>
          </div>
        </div>

        {/* Compact Closing Conversion Band */}
        <div className="hp-card rounded-2xl p-6 sm:p-8 text-center space-y-4">
          <h3 className="font-serif-heading text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-balance">
            {isGuest ? 'Ready to Start Your Preparation?' : 'Resume Your Preparation'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto line-clamp-2">
            {isGuest
              ? 'Create a free account to save accuracy, track 2-streak fixes, and sit timed mocks.'
              : 'Jump back into adaptive practice or review your readiness dashboard.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            {isGuest ? (
              <>
                <button
                  type="button"
                  onClick={openGuestSignup}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] w-full sm:w-auto rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] font-bold text-sm shadow-sm transition-[background-color,transform] duration-150 active:scale-[0.98] cursor-pointer touch-manipulation"
                >
                  <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </button>

                <Link
                  to="/pricing"
                  className="hp-well inline-flex items-center justify-center gap-1.5 px-5 py-3 min-h-[48px] w-full sm:w-auto rounded-xl hover:border-cyan-500 text-slate-900 dark:text-slate-100 font-semibold text-sm transition-[border-color,transform] duration-150 active:scale-[0.98]"
                >
                  <span>View Plans</span>
                  <ArrowRight className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onStartPractice}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] w-full sm:w-auto rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] font-bold text-sm shadow-sm transition-[background-color,transform] duration-150 active:scale-[0.98] cursor-pointer touch-manipulation"
                >
                  <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Continue Practice</span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={onNavigateDashboard}
                  className="hp-well inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] w-full sm:w-auto rounded-xl hover:border-cyan-500 text-slate-900 dark:text-slate-100 font-semibold text-sm transition-[border-color,transform] duration-150 active:scale-[0.98] cursor-pointer touch-manipulation"
                >
                  <LayoutDashboard className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                  <span>Dashboard</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
