// Draft template - not legal advice
import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../config/site';
import { Mail, Flag, MessageSquare, MapPin, Building2, HelpCircle } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const canonicalUrl = `${SITE_CONFIG.SITE_URL}/contact`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <title>{`Contact & Support | ${SITE_CONFIG.SITE_NAME}`}</title>
      <meta
        name="description"
        content="Get in touch with the MedLab QBank editorial team for question reporting, account support, and partnership inquiries."
      />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={`Contact & Support | ${SITE_CONFIG.SITE_NAME}`} />
      <meta
        property="og:description"
        content="Get in touch with the MedLab QBank team for support, feedback, and question reporting."
      />
      <meta property="og:url" content={canonicalUrl} />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Mail className="w-4 h-4" />
            <span>Support & Assistance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Contact & Support
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Have questions, feedback, or need account assistance? We are here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Direct Email Inquiries
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                For administrative, privacy requests, institutional licensing, or technical bug reports:
              </p>
              <a
                href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`}
                className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:underline break-all"
              >
                {SITE_CONFIG.CONTACT_EMAIL}
              </a>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{SITE_CONFIG.OPERATOR_NAME}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{SITE_CONFIG.OPERATOR_COUNTRY}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                <Flag className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Question Quality Reports
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Found a typo, incorrect answer key, ambiguous explanation, or missing image in a question?
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Please use the in-app <strong>Report Flag</strong> icon located beneath each question in Practice Mode or the Question Bank browser. This automatically links your report directly to the question's unique identifier (<code className="text-[11px] font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">LAB-XXXX</code>) for faster review by our medical review team.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Link
                to="/browse"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Browse Questions to Practice & Report</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Return to MedLab QBank
          </Link>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <Link to="/terms" className="hover:underline">Terms</Link>
            <Link to="/disclaimer" className="hover:underline">Disclaimer</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
