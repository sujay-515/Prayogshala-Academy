import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import type { UserAccount } from '../../types';
import { SITE_CONFIG, isConfigured } from '../../config/site';

interface HomeFooterProps {
  currentUser?: UserAccount | null;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
}

export const HomeFooter: React.FC<HomeFooterProps> = ({
  currentUser,
  onOpenAuthModal,
}) => {
  const hasOperator = isConfigured(SITE_CONFIG.OPERATOR_NAME);
  const hasEmail = isConfigured(SITE_CONFIG.CONTACT_EMAIL);
  const isGuest = !currentUser;

  const renderGatedLink = (to: string, label: string) => {
    if (isGuest && onOpenAuthModal) {
      return (
        <button
          type="button"
          onClick={() => onOpenAuthModal('register')}
          className="inline-flex items-center gap-1.5 py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors cursor-pointer text-left"
        >
          <span>{label}</span>
          <Lock className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
        </button>
      );
    }

    return (
      <Link to={to} className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
        {label}
      </Link>
    );
  };

  return (
    <footer
      aria-label="Prayogshala Academy footer"
      className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs py-12"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <h2 className="sr-only">Footer navigation and legal links</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6">
          {/* Column 1: Brand & Identity (4 cols) */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-3">
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

            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm line-clamp-2">
              Medical laboratory question bank and timed mocks for ASCP, NHPC, PSC, DHA, AIMS, and CEE-UG.
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
                    Contact:{' '}
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
          <div className="lg:col-span-2 space-y-2.5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              Platform
            </h3>
            <ul className="space-y-1 text-xs" role="list">
              <li>{renderGatedLink('/practice', 'Topic Practice')}</li>
              <li>{renderGatedLink('/exam', 'Mock Exams')}</li>
              <li>{renderGatedLink('/cee-ug', 'CEE-UG Mock')}</li>
              <li>{renderGatedLink('/mistakes', 'Mistake Recovery')}</li>
              <li>{renderGatedLink('/bookmarks', 'Bookmarks')}</li>
              <li>{renderGatedLink('/dashboard', 'Analytics')}</li>
              <li>{renderGatedLink('/leaderboard', 'Rankings')}</li>
            </ul>
          </div>

          {/* Column 3: Exam Tracks (2 cols) */}
          <div className="lg:col-span-2 space-y-2.5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              Exam Tracks
            </h3>
            <ul className="space-y-1 text-xs" role="list">
              <li>{renderGatedLink('/exam?exam=ASCP', 'ASCP International')}</li>
              <li>{renderGatedLink('/exam?exam=NHPC', 'NHPC Licensure')}</li>
              <li>{renderGatedLink('/exam?exam=PSC', 'PSC / Lok Sewa')}</li>
              <li>{renderGatedLink('/exam?exam=DHA', 'DHA Assessment')}</li>
              <li>{renderGatedLink('/exam?exam=AIMS', 'AIMS Examination')}</li>
              <li>{renderGatedLink('/cee-ug', 'CEE-UG Entrance')}</li>
            </ul>
          </div>

          {/* Column 4: Explore & Pricing (2 cols) */}
          <div className="lg:col-span-2 space-y-2.5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              Explore
            </h3>
            <ul className="space-y-1 text-xs" role="list">
              <li>
                <a href="#features" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#exams" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Exam Tracks
                </a>
              </li>
              <li>
                <a href="#demo" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Sample Sandbox
                </a>
              </li>
              <li>
                <a href="#pricing" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <Link to="/pricing" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Full Checkout
                </Link>
              </li>
              <li>
                <Link to="/help" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/contact" className="inline-block py-1 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Legal (2 cols) */}
          <div className="lg:col-span-2 space-y-2.5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              Legal
            </h3>
            <ul className="space-y-1 text-xs" role="list">
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

        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-600 dark:text-slate-400">
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
