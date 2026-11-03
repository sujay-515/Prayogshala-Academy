// Draft template - not legal advice
import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../config/site';
import { Cookie, HardDrive, ShieldCheck, Settings2, Mail } from 'lucide-react';

const STORAGE_ROWS: Array<{ key: string; purpose: string; lifetime: string }> = [
  {
    key: 'medlab_theme_v1',
    purpose: 'Remembers whether you chose the light or dark theme.',
    lifetime: 'Until you clear site data.',
  },
  {
    key: 'medlab_qbank_auth_token_v1',
    purpose: 'Bearer token used to authenticate your API requests. Sent in the Authorization header, not as a cookie.',
    lifetime: 'Until you sign out, or until the server-side session expires after 7 days.',
  },
  {
    key: 'medlab_qbank_current_user_v1',
    purpose: 'Caches your display name, username and role so the interface can render immediately.',
    lifetime: 'Until you sign out.',
  },
  {
    key: 'medlab_qbank_stats_v2',
    purpose: 'Offline copy of your progress (answers, bookmarks, personal notes, mistakes, completed exam attempt history) so the app still works if the network drops. In-progress active exams are held only while taking an exam and purged upon submission.',
    lifetime: 'Until you sign out; the server copy remains while your account exists.',
  },
  {
    key: 'medlab_qbank_questions_v2, medlab_qbank_categories_v2',
    purpose: 'Public cache of published question stems and the syllabus tree to reduce repeat downloads.',
    lifetime: 'Until cleared; stale or unsafe entries are discarded automatically.',
  },
  {
    key: 'medlab_admin_subtab',
    purpose: 'Remembers the last administration console tab you used.',
    lifetime: 'Until you sign out.',
  },
];

export const CookiesPage: React.FC = () => {
  const canonicalUrl = `${SITE_CONFIG.SITE_URL}/cookies`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <title>{`Cookie & Storage Policy | ${SITE_CONFIG.SITE_NAME}`}</title>
      <meta
        name="description"
        content="How MedLab QBank uses cookies and browser storage, which keys are stored, why, and how to clear them."
      />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={`Cookie & Storage Policy | ${SITE_CONFIG.SITE_NAME}`} />
      <meta
        property="og:description"
        content="How MedLab QBank uses cookies and browser storage, which keys are stored, why, and how to clear them."
      />
      <meta property="og:url" content={canonicalUrl} />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Cookie className="w-4 h-4" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Cookie &amp; Storage Policy
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Last Updated: {SITE_CONFIG.LAST_UPDATED} • Operated by {SITE_CONFIG.OPERATOR_NAME} (
            {SITE_CONFIG.OPERATOR_COUNTRY})
          </p>
        </div>

        <div className="space-y-8 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-500" />
              <span>1. Scope</span>
            </h2>
            <p className="mb-3">
              {SITE_CONFIG.SITE_NAME} is a browser application. It does not use advertising cookies, cross-site
              tracking pixels or third-party analytics SDKs. Session authentication uses a bearer token sent in
              the <strong>Authorization</strong> header rather than a cookie.
            </p>
            <p className="mb-3">
              The application does use your browser&apos;s <strong>localStorage</strong> for the small set of
              preferences and caches listed below. Because these entries are essential to signing in, preserving
              your progress and keeping the interface responsive, they cannot be switched off individually while
              using the platform.
            </p>
            <p>
              Additionally, our service worker utilizes the browser <strong>Cache Storage</strong> API (cache name <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">medlab-shell-v2</code>) solely to pre-cache the static application shell (HTML, compiled JavaScript, CSS stylesheets, and icons) for fast page loading and offline resilience. Cache Storage never stores API responses, question data, personal statistics, or authorization headers, and can be cleared at any time via browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
              2. What We Store
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="min-w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Key</th>
                    <th className="px-3 py-2 font-semibold">Purpose</th>
                    <th className="px-3 py-2 font-semibold">Lifetime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {STORAGE_ROWS.map((row) => (
                    <tr key={row.key} className="align-top">
                      <td className="px-3 py-2.5 font-mono text-[11px] sm:text-xs text-slate-800 dark:text-slate-200">
                        {row.key}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{row.purpose}</td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{row.lifetime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              No passwords, answer keys or payment credentials are ever written to browser storage. Completed exam attempts are retained in your account statistics until account deletion, whereas in-progress active exam sessions are ephemeral and purged immediately upon exam submission.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
              3. Third-Party Requests
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li>
                <strong>Google Fonts</strong> is used to load the IBM Plex typefaces. The request is made
                directly by your browser to Google&apos;s font servers and is subject to Google&apos;s privacy
                terms.
              </li>
              <li>
                <strong>Supabase</strong> is used only when the operator enables optional cloud sync. If it is
                disabled, no Supabase requests are made from your browser.
              </li>
              <li>
                <strong>No advertising networks, remarketing tags or social plugins</strong> are loaded by this
                application.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-500" />
              <span>4. Managing or Clearing Storage</span>
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li>
                <strong>Sign out</strong> from the navbar or the dashboard. This removes the auth token, cached
                profile, progress cache and reports from your browser.
              </li>
              <li>
                <strong>Browser controls</strong> let you view and delete site data for this domain. Clearing all
                site data signs you out and resets the theme preference.
              </li>
              <li>
                <strong>Server-side data</strong> is unaffected by clearing browser storage. Use{' '}
                <em>Download My Data</em> or <em>Delete Account</em> in the dashboard to manage the stored copy.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              <span>5. Security</span>
            </h2>
            <p>
              Storage entries are scoped to this domain and are not readable by other sites. Session tokens are
              stored as SHA-256 hashes on the server and expire automatically. Because browser storage is
              readable by scripts running on this origin, we enforce a Content Security Policy and never inject
              untrusted HTML.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
              6. Changes and Contact
            </h2>
            <p className="mb-3">
              If the storage keys or third-party requests change materially, this page will be updated with a new
              timestamp. For questions about this policy, contact{' '}
              <a
                href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`}
                className="text-blue-600 dark:text-blue-400 underline"
              >
                {SITE_CONFIG.CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Return to MedLab QBank
          </Link>
          <div className="flex flex-wrap gap-4">
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <Link to="/terms" className="hover:underline">Terms</Link>
            <Link to="/disclaimer" className="hover:underline">Disclaimer</Link>
            <Link to="/contact" className="hover:underline flex items-center gap-1">
              <Mail className="w-3 h-3" /> Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
