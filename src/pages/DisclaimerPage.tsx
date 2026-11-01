// Draft template - not legal advice
import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../config/site';
import { AlertCircle, BookOpen, ShieldAlert, Flag, ShieldCheck } from 'lucide-react';

export const DisclaimerPage: React.FC = () => {
  const canonicalUrl = `${SITE_CONFIG.SITE_URL}/disclaimer`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <title>{`Medical & Educational Disclaimer | ${SITE_CONFIG.SITE_NAME}`}</title>
      <meta
        name="description"
        content="Medical and educational disclaimer for MedLab QBank detailing non-affiliation with ASCP, NHPC, PSC, DHA, and AIMS, and content attribution."
      />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={`Medical & Educational Disclaimer | ${SITE_CONFIG.SITE_NAME}`} />
      <meta
        property="og:description"
        content="Educational disclaimer for MedLab QBank detailing non-affiliation with examination boards and content attribution."
      />
      <meta property="og:url" content={canonicalUrl} />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Medical & Educational Disclaimer
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Published: {SITE_CONFIG.LAST_UPDATED} • {SITE_CONFIG.SITE_NAME}
          </p>
        </div>

        <div className="space-y-8 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          <section className="bg-red-50 dark:bg-red-950/20 p-5 rounded-2xl border border-red-200 dark:border-red-900/40">
            <h2 className="text-base sm:text-lg font-bold text-red-950 dark:text-red-200 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span>1. Educational Use Only — Not Medical or Diagnostic Advice</span>
            </h2>
            <p className="text-xs sm:text-sm text-red-900 dark:text-red-300 leading-relaxed">
              All questions, clinical cases, laboratory values, reference ranges, and scientific explanations provided on {SITE_CONFIG.SITE_NAME} are intended <strong>exclusively for academic review and examination simulation</strong> by medical laboratory science students and professionals. They do NOT constitute clinical medical advice, diagnostic recommendations, patient management protocols, or professional laboratory standards of care. Never make medical diagnosis or patient treatment decisions based on materials found on this platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-500" />
              <span>2. Trademark & Non-Affiliation Notice</span>
            </h2>
            <p className="mb-3">
              {SITE_CONFIG.SITE_NAME} is an independent educational tool. The designations, acronyms, and board names referenced throughout our question bank—including but not limited to:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium mb-3">
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <strong>ASCP / ASCPi</strong> — American Society for Clinical Pathology
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <strong>NHPC</strong> — Nepal Health Professional Council
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <strong>PSC</strong> — Public Service Commission (Lok Sewa Aayog)
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <strong>DHA</strong> — Dubai Health Authority
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <strong>AIMS</strong> — Australian Institute of Medical Scientists
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <strong>CEE-UG / MECEE-BL</strong> — Medical Education Commission (MEC), Nepal
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              — are trademarks or registered trademarks of their respective governing entities. Use of these names on this platform is solely for categorical reference to assist candidates in aligning practice sessions with their desired syllabus. {SITE_CONFIG.SITE_NAME} is not endorsed by, sponsored by, or directly affiliated with any of these credentialing organizations.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <span>3. Content Sources and Citations</span>
            </h2>
            <p className="mb-2">
              Question items, diagnostic parameters, and rationale citations are constructed with reference to open educational curricula and peer-recognized textbooks in laboratory medicine (such as Henry's Clinical Diagnosis and Management by Laboratory Methods, Rodak's Hematology, Tietz Fundamentals of Clinical Chemistry, and Bailey & Scott's Diagnostic Microbiology).
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Citations are provided for academic study purposes under fair educational principles.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Flag className="w-5 h-5 text-amber-500" />
              <span>4. Reporting Discrepancies and Infringement Notices</span>
            </h2>
            <p className="mb-2">
              We strive for rigorous scientific precision. If you identify a factual error, ambiguous question stem, outdated reference range, or suspect copyright infringement:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Use the <strong>Flag Question</strong> button located directly beneath any MCQ in practice or exam review mode to submit feedback to our editorial review team.</li>
              <li>For legal, copyright, or takedown requests, contact our designated agent directly at{' '}
                <a href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`} className="text-blue-600 dark:text-blue-400 underline">
                  {SITE_CONFIG.CONTACT_EMAIL}
                </a>.
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Return to MedLab QBank
          </Link>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <Link to="/terms" className="hover:underline">Terms</Link>
            <Link to="/contact" className="hover:underline">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
