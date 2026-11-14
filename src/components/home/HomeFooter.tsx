import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG, isConfigured } from '../../config/site';

export const HomeFooter: React.FC = () => {
  const hasOperator = isConfigured(SITE_CONFIG.OPERATOR_NAME);
  const hasEmail = isConfigured(SITE_CONFIG.CONTACT_EMAIL);
  return (
    <footer
      aria-label="Prayogshala Academy footer"
      className="border-t border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 text-xs py-14"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Column 1: Brand & Identity (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 text-slate-900 dark:text-white group"
              aria-label="Prayogshala Academy Home"
            >
              <img
                src="/brand/svg/logo-mark-cyan.svg"
                alt="Prayogshala Logo"
                className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform drop-shadow-[0_2px_8px_rgba(6,182,212,0.35)]"
              />
              <div className="flex flex-col leading-tight">
                <span className="font-extrabold text-sm sm:text-base tracking-tight block text-slate-900 dark:text-white">
                  Prayogshala
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.24em] text-cyan-600 dark:text-cyan-400 uppercase block">
                  Academy
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
              Comprehensive clinical laboratory medicine examination preparation and medical entrance mock tests covering ASCP, NHPC, PSC, DHA, AIMS, and CEE-UG standards.
            </p>

            {(hasOperator || hasEmail) && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                {hasOperator && (
                  <div>
                    Operator:{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {SITE_CONFIG.OPERATOR_NAME}
                    </span>
                    {isConfigured(SITE_CONFIG.OPERATOR_COUNTRY) && (
                      <> · {SITE_CONFIG.OPERATOR_COUNTRY}</>
                    )}
                  </div>
                )}
                {hasEmail && (
                  <div>
                    Editorial &amp; Licensure Inquiries:{' '}
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

          {/* Column 2: Platform Links (lg:col-span-2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Platform
            </h4>
            <ul className="space-y-2 text-xs" role="list">
              <li>
                <Link to="/practice" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Topic Practice
                </Link>
              </li>
              <li>
                <Link to="/exam" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Mock Examinations
                </Link>
              </li>
              <li>
                <Link to="/cee-ug" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  CEE-UG Entrance Mock
                </Link>
              </li>
              <li>
                <Link to="/mistakes" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Mistakes Notebook
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Analytics &amp; Readiness
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Grand Test Rankings
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company & Resources (lg:col-span-2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Resources
            </h4>
            <ul className="space-y-2 text-xs" role="list">
              <li>
                <a href="#about" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  About Methodology
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Exam Engine Features
                </a>
              </li>
              <li>
                <Link to="/help" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Compliance (lg:col-span-3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Legal &amp; Compliance
            </h4>
            <ul className="space-y-2 text-xs" role="list">
              <li>
                <Link to="/privacy" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/disclaimer" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Medical &amp; Exam Disclaimer
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 dark:text-slate-400">
          <div>
            © {new Date().getFullYear()} {SITE_CONFIG.SITE_NAME}. All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            <span>Last Updated: {SITE_CONFIG.LAST_UPDATED}</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-700 dark:text-cyan-400 font-medium">
              Medical Laboratory Sciences
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
