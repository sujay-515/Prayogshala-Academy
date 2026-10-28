// Draft template - not legal advice
import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../config/site';
import { FileText, ShieldAlert, Award, AlertTriangle, Scale } from 'lucide-react';

export const TermsPage: React.FC = () => {
  const canonicalUrl = `${SITE_CONFIG.SITE_URL}/terms`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <title>{`Terms of Service | ${SITE_CONFIG.SITE_NAME}`}</title>
      <meta
        name="description"
        content="Terms of Service for MedLab QBank governing account access, acceptable use, intellectual property, and service limitations."
      />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={`Terms of Service | ${SITE_CONFIG.SITE_NAME}`} />
      <meta
        property="og:description"
        content="Terms of Service for MedLab QBank governing account access, acceptable use, and service limitations."
      />
      <meta property="og:url" content={canonicalUrl} />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <FileText className="w-4 h-4" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Effective Date: {SITE_CONFIG.LAST_UPDATED} • Governed under the laws of {SITE_CONFIG.OPERATOR_COUNTRY}
          </p>
        </div>

        <div className="space-y-8 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, registering for, or using {SITE_CONFIG.SITE_NAME} ("the Platform"), operated by {SITE_CONFIG.OPERATOR_NAME}, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must discontinue using the Platform immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
              2. User Accounts and Role Permissions
            </h2>
            <p className="mb-2">
              Public registration grants a student account by default. You are responsible for safeguarding your login credentials and maintaining the confidentiality of your session token.
            </p>
            <p>
              Administrative access is granted strictly through existing system administrators. Any attempt to elevate privileges without authorization is a violation of these terms and grounds for immediate termination.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span>3. Acceptable Use Policy</span>
            </h2>
            <p className="mb-2">When using the Platform, you agree that you will not:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li>Scrape, crawl, harvest, or bulk-export question data or explanations through automated bots or scripts.</li>
              <li>Circumvent or tamper with examination timers, scoring engines, or rate-limiting safeguards.</li>
              <li>Attempt SQL injection, cross-site scripting (XSS), prototype pollution, or payload tampering.</li>
              <li>Share administrative access tokens or credentials with unauthorized third parties.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
              4. Content Ownership & Intellectual Property
            </h2>
            <p>
              The platform design, source code, question categorization taxonomies, algorithmic scoring mechanisms, and curated question compilations are the intellectual property of {SITE_CONFIG.OPERATOR_NAME} or its licensors. Unauthorized commercial redistribution or mirroring is strictly prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-500" />
              <span>5. Educational Assessment Only — No Guarantee of Licensure</span>
            </h2>
            <p className="mb-2">
              The multiple-choice questions, timed exam sessions, and accuracy percentages on {SITE_CONFIG.SITE_NAME} are provided solely as study aids for personal knowledge reinforcement.
            </p>
            <p className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs">
              <strong>Important:</strong> Achieving a passing score or high accuracy on {SITE_CONFIG.SITE_NAME} does not guarantee that you will pass any actual professional licensing or certification examination (including ASCP, NHPC, PSC, DHA, or AIMS).
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>6. Limitation of Liability</span>
            </h2>
            <p>
              The platform is provided on an "as-is" and "as-available" basis without warranties of any kind. In no event shall {SITE_CONFIG.OPERATOR_NAME} be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use this platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
              7. Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate any user account without prior notice if we determine that the user has violated these terms, attempted system exploitation, or engaged in abusive reporting behavior.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-500" />
              <span>8. Governing Law</span>
            </h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of {SITE_CONFIG.OPERATOR_COUNTRY}, without regard to its conflict of law provisions. Any disputes shall be subject to the exclusive jurisdiction of the competent courts of {SITE_CONFIG.OPERATOR_COUNTRY}.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Return to MedLab QBank
          </Link>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <Link to="/disclaimer" className="hover:underline">Disclaimer</Link>
            <Link to="/contact" className="hover:underline">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
