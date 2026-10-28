// Draft template - not legal advice
import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../config/site';
import { Shield, Lock, Database, Mail, Server, RefreshCw } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  const canonicalUrl = `${SITE_CONFIG.SITE_URL}/privacy`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <title>{`Privacy Policy | ${SITE_CONFIG.SITE_NAME}`}</title>
      <meta
        name="description"
        content="Privacy Policy for MedLab QBank detailing data collection, storage, third-party processors, localStorage usage, and user rights."
      />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={`Privacy Policy | ${SITE_CONFIG.SITE_NAME}`} />
      <meta
        property="og:description"
        content="Privacy Policy for MedLab QBank detailing data collection, storage, third-party processors, and user rights."
      />
      <meta property="og:url" content={canonicalUrl} />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Shield className="w-4 h-4" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Last Updated: {SITE_CONFIG.LAST_UPDATED} • Operated by {SITE_CONFIG.OPERATOR_NAME} ({SITE_CONFIG.OPERATOR_COUNTRY})
          </p>
        </div>

        <div className="space-y-8 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
              1. Information We Collect
            </h2>
            <p className="mb-3">
              When you use {SITE_CONFIG.SITE_NAME}, we collect and store only the minimal information required to provide our examination simulation and question bank services:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li><strong>Account Credentials:</strong> Email address, username, display name, and a cryptographically salted scrypt password hash. Plaintext passwords are never stored or logged.</li>
              <li><strong>Examination & Learning Performance:</strong> Answer selections, exam scores, time elapsed, bookmarks, revision queue items, and category accuracy breakdowns.</li>
              <li><strong>Question Feedback:</strong> Content reports, error flags, and feedback you voluntarily submit regarding question quality.</li>
              <li><strong>Technical Metadata:</strong> IP address (used solely for sliding-window rate limiting to protect platform availability).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
              2. Purpose and Legal Basis for Processing
            </h2>
            <p>
              We process your data strictly to authenticate user sessions, calculate personal performance metrics, deliver simulated licensure exam scores, and maintain server reliability and security.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              <span>3. Data Storage and Retention</span>
            </h2>
            <p className="mb-2">
              Your data is stored in a structured SQLite relational database running on our secured host server. If optional cloud backup is enabled, encrypted records may be synchronized to Supabase.
            </p>
            <p>
              Session tokens and password reset tokens are stored as SHA-256 hashes at rest and expire automatically after 7 days and 1 hour respectively. Active exam records are purged upon exam submission. Personal study data is retained until you request account deletion.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" />
              <span>4. Third-Party Sub-Processors</span>
            </h2>
            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-emerald-500" /> Resend (Transactional Email)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Processes user email addresses strictly to deliver password reset tokens, welcome confirmations, and administrator staff invites. Resend does not use email addresses for marketing.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-purple-500" /> Google Gemini API (Administrative OCR Only)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Used solely by administrators to parse and extract text from uploaded medical test documents. Student personal data, names, emails, and examination responses are never transmitted to AI processors.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
              5. LocalStorage and Tracking Technologies
            </h2>
            <p className="mb-2">
              {SITE_CONFIG.SITE_NAME} uses browser <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">localStorage</code> exclusively for strictly necessary operational purposes:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm mb-3">
              <li>Authentication session token storage (<code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">medlab_qbank_auth_token_v1</code>).</li>
              <li>Local visual display preferences (light/dark theme).</li>
            </ul>
            <p className="text-xs bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200">
              We do not utilize third-party tracking cookies, advertising pixels, or cross-site tracking analytics. If third-party analytical cookies are added in the future, an explicit cookie consent banner will be provided before placement.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
              6. Your Data Rights & Deletion Requests
            </h2>
            <p className="mb-2">
              You retain the right to inspect, export, or permanently delete your account and associated study records.
            </p>
            <p>
              To request a copy of your stored learning records or to permanently erase your account, contact our privacy team at{' '}
              <a
                href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`}
                className="text-blue-600 dark:text-blue-400 font-medium underline underline-offset-2"
              >
                {SITE_CONFIG.CONTACT_EMAIL}
              </a>
              . Deletion requests are processed within 30 business days.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
              7. Children's Privacy
            </h2>
            <p>
              {SITE_CONFIG.SITE_NAME} is intended for adult students and medical laboratory professionals. We do not knowingly collect personal information from individuals under the age of 16.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-500" />
              <span>8. Policy Updates</span>
            </h2>
            <p>
              We may update this policy periodically to reflect changes in our platform or legal requirements. Material updates will be documented on this page with an updated timestamp.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Return to MedLab QBank
          </Link>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:underline">Terms</Link>
            <Link to="/disclaimer" className="hover:underline">Disclaimer</Link>
            <Link to="/contact" className="hover:underline">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
