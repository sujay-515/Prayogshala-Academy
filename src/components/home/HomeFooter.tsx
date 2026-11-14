import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG, isConfigured } from '../../config/site';

export const HomeFooter: React.FC = () => {
  const hasOperator = isConfigured(SITE_CONFIG.OPERATOR_NAME);
  const hasEmail = isConfigured(SITE_CONFIG.CONTACT_EMAIL);

  return (
    <footer
      aria-label="Prayogshala Academy footer"
      className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 text-xs py-14"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <h2 className="sr-only">Footer navigation and legal links</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6">
          {/* Column 1: Brand & Identity (4 cols) */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 text-slate-900 dark:text-slate-100 group"
              aria-label="Prayogshala Academy Home"
            >
              <img
                src="/brand/svg/logo-mark-cyan.svg"
                alt="Prayogshala Logo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain shrink-0 transition-transform duration-150 ease-out group-hover:scale-105"
              />
              <div className="flex flex-col leading-tight">
                <span className="font-extrabold text-sm sm:text-base tracking-tight block text-slate-900 dark:text-slate-100">
                  Prayogshala
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.24em] text-cyan-700 dark:text-cyan-400 uppercase block">
                  Academy
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm">
              Clinical laboratory medicine question bank, timed mock sittings, and differential review covering ASCP, NHPC, PSC, DHA, AIMS, and CEE-UG standards.
            </p>

            {(hasOperator || hasEmail) && (
              <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                {hasOperator && (
                  <div>
                    Operator:{' '}
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {SITE_CONFIG.OPERATOR_NAME}
                    </span>
                    {isConfigured(SITE_CONFIG.OPERATOR_COUNTRY) && (
                      <> · {SITE_CONFIG.OPERATOR_COUNTRY}</>
                    )}
                  </div>
                )}
                {hasEmail && (
                  <div>
                    Editorial Inquiries:{' '}
                    <a
                      href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`}
                      className="text-cyan-700 dark:text-cyan-400 hover:underline font-medium"
                    >
                      {SITE_CONFIG.CONTACT_EMAIL}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Column 2: Platform (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              Platform
            </h3>
            <ul className="space-y-1.5 text-xs" role="list">
              <li>
                <Link to="/practice" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Topic Practice
                </Link>
              </li>
              <li>
                <Link to="/exam" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Mock Examinations
                </Link>
              </li>
              <li>
                <Link to="/cee-ug" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  CEE-UG Entrance Mock
                </Link>
              </li>
              <li>
                <Link to="/mistakes" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Mistakes Notebook
                </Link>
              </li>
              <li>
                <Link to="/bookmarks" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Bookmarks Library
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Analytics &amp; Readiness
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Grand Test Rankings
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Exam Tracks (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              Exam Tracks
            </h3>
            <ul className="space-y-1.5 text-xs" role="list">
              <li>
                <Link to="/exam?exam=ASCP" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  ASCP International
                </Link>
              </li>
              <li>
                <Link to="/exam?exam=NHPC" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  NHPC Licensure
                </Link>
              </li>
              <li>
                <Link to="/exam?exam=PSC" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  PSC / Lok Sewa
                </Link>
              </li>
              <li>
                <Link to="/exam?exam=DHA" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  DHA Assessment
                </Link>
              </li>
              <li>
                <Link to="/exam?exam=AIMS" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  AIMS Examination
                </Link>
              </li>
              <li>
                <Link to="/cee-ug" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  CEE-UG Entrance
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Resources (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              Resources
            </h3>
            <ul className="space-y-1.5 text-xs" role="list">
              <li>
                <a href="#features" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Mastery Workflow
                </a>
              </li>
              <li>
                <a href="#exams" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Exam Blueprints
                </a>
              </li>
              <li>
                <a href="#demo" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Interactive Sandbox
                </a>
              </li>
              <li>
                <a href="#about" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Editorial Standards
                </a>
              </li>
              <li>
                <Link to="/pricing" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Plans &amp; Pricing
                </Link>
              </li>
              <li>
                <Link to="/help" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/contact" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Legal & Governance (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              Legal
            </h3>
            <ul className="space-y-1.5 text-xs" role="list">
              <li>
                <Link to="/privacy" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/disclaimer" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Medical Disclaimer
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Strip */}
        <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-600 dark:text-slate-400">
          <div>
            © {new Date().getFullYear()} {SITE_CONFIG.SITE_NAME}. All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            <span>Last Updated: {SITE_CONFIG.LAST_UPDATED}</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-700 dark:text-cyan-400 font-semibold">
              Medical Laboratory Sciences
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
