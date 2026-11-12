import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  LifeBuoy,
  Rocket,
  BookOpen,
  ClipboardCheck,
  AlertTriangle,
  Bookmark,
  BarChart3,
  Trophy,
  UserCog,
  Smartphone,
  Wrench,
  Mail,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SITE_CONFIG } from '../config/site';

interface HelpItem {
  q: string;
  a: string;
}

interface HelpSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: HelpItem[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    icon: Rocket,
    items: [
      {
        q: 'What is Prayogshala Academy?',
        a: 'A question bank and timed mock-exam platform for laboratory medicine. It covers clinical chemistry, hematology, microbiology, blood banking, immunology, molecular biology, urinalysis and laboratory operations, with explanations and textbook references for every published question.',
      },
      {
        q: 'Which examinations are covered?',
        a: 'Questions can be tagged to ASCP, NHPC, PSC, DHA, AIMS and CEE-UG, but tagging is optional — untagged questions are treated as General and remain available under every examination filter. Use the Examination Category filter in Practice or Mock Exam to focus on one board, or leave it on “All” for a comprehensive mix. The CEE-UG entrance mock is a separate full-length paper under “CEE-UG” in the navigation.',
      },
      {
        q: 'Do I need an account to practise?',
        a: 'No. Guest practice is available, but guest answer checks are rate-limited more tightly and progress is stored only in this browser. A free account syncs stats, bookmarks, mistakes and exam history to the server.',
      },
      {
        q: 'How is progress synced?',
        a: 'Signed-in progress is saved through the stats API and reloaded on every device you sign in on. If the operator has enabled Supabase sync, the server copy is also mirrored to the cloud.',
      },
      {
        q: 'Is there a mobile app?',
        a: 'The site is an installable Progressive Web App. On iPhone use Share → Add to Home Screen; on Android Chrome use the menu → Install app. The app shell works offline, but questions, grading and stats still need a network connection.',
      },
    ],
  },
  {
    id: 'practice',
    title: 'Practice sessions',
    icon: BookOpen,
    items: [
      {
        q: 'How do I build a practice session?',
        a: 'Open Practice, choose a specialty unit, subject, examination board, difficulty and (optionally) a past paper, pick 5, 10, 20 or 50 questions and start. Questions can be shuffled; answers are checked instantly.',
      },
      {
        q: 'What do the toggles mean?',
        a: '“High-Yield Mode” restricts the pool to questions editors flagged as highest value. “Bookmarks only” restricts it to questions you have saved. Both can be combined with any filter.',
      },
      {
        q: 'What happens after I answer?',
        a: 'The answer is verified on the server, then the correct option, the clinical rationale and the textbook reference are revealed. Your accuracy updates immediately and wrong answers enter Mistakes Recovery.',
      },
      {
        q: 'Why is the available pool zero?',
        a: 'No published question matches the current filter combination. Reset the filters or widen the unit/subject. Past-paper filters only list papers that actually have tagged questions.',
      },
      {
        q: 'Can I practise only bookmarked questions?',
        a: 'Yes — use the “Bookmarks only” toggle in Practice or Browse, or open the Bookmark library and use “Practice N bookmarks” to drill a folder or search result.',
      },
    ],
  },
  {
    id: 'mock-exams',
    title: 'Mock exams & Grand Tests',
    icon: ClipboardCheck,
    items: [
      {
        q: 'How do I configure a mock exam?',
        a: 'Choose an exam category, specialty coverage, difficulty, question count (10–200) and time limit (15–180 minutes), then start. Options and question order can be shuffled, and the review grid lets you flag questions before submitting.',
      },
      {
        q: 'What is a Grand Test?',
        a: 'The full-length preset: 200 questions, 180 minutes, all syllabi, shuffled options and a −0.25 penalty per incorrect answer. Load it with one click from the Mock Exam screen.',
      },
      {
        q: 'When can I take a Grand Test?',
        a: 'Weekly windows run from Friday 11:00 to Tuesday 23:59 Nepal time (UTC+05:45). The window is closed on Wednesday, Thursday and Friday morning; the exam page shows a live countdown to the next opening and the server rejects out-of-window starts.',
      },
      {
        q: 'How does negative marking work?',
        a: 'With negative marking enabled, each incorrect answer deducts 0.25 marks. Unanswered questions are never penalised. The scorecard shows correct, incorrect and unanswered counts, the penalty, and the net score used for the 70% pass threshold.',
      },
      {
        q: 'Can I pause or resume an exam?',
        a: 'No. The timer runs server-side and the active attempt lives in memory. Refreshing, closing the tab or navigating away forfeits the attempt and returns no score.',
      },
      {
        q: 'Where do I see results?',
        a: 'After submitting you get the net score, percentage, pass/fail status, subject breakdown, pacing summary and a full question-by-question review with bookmarks. The scorecard can be printed or saved as a PDF from the browser.',
      },
    ],
  },
  {
    id: 'mistakes',
    title: 'Mistakes Recovery',
    icon: AlertTriangle,
    items: [
      {
        q: 'How does a question enter Mistakes?',
        a: 'Any wrong answer in practice, the daily question, Browse, or a mock exam is queued automatically. Unanswered mock questions also enter the queue because they still represent a knowledge gap.',
      },
      {
        q: 'How do I clear a mistake?',
        a: 'Answer the same question correctly twice in a row. One correct answer moves it to 1/2; a wrong answer resets it to 0/2. There is intentionally no manual clear button — the two-hit rule prevents lucky guesses from clearing a gap.',
      },
      {
        q: 'Where do I find the list?',
        a: 'The Mistakes tab in the navbar shows a live count. The page lists open mistakes with subject/search filters, progress dots and review actions; the dashboard also shows the queue with remaining hits.',
      },
    ],
  },
  {
    id: 'bookmarks',
    title: 'Bookmarks & notes',
    icon: Bookmark,
    items: [
      {
        q: 'How do I save a question?',
        a: 'Tap the bookmark icon on any question in Browse, Practice, the daily question, or a mock review. It appears immediately in the bookmark library and the dashboard.',
      },
      {
        q: 'Can I add notes and folders?',
        a: 'Yes. In the Bookmark library each card has a free-text folder and a study note. Notes autosave after you stop typing (or when you leave the field) and folders are created simply by typing a new name.',
      },
      {
        q: 'Does removing a bookmark delete my note?',
        a: 'Yes. Notes and folders are stored alongside the bookmark; removing the bookmark removes its metadata too.',
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics & pacing',
    icon: BarChart3,
    items: [
      {
        q: 'What is the predicted score based on?',
        a: 'A heuristic that blends your overall practice accuracy with your five most recent mocks. Thin samples are pulled toward the cohort average, and the card shows a likely range plus a projected percentile. It is an estimate, not a guarantee of exam performance.',
      },
      {
        q: 'Why is the prediction locked?',
        a: 'The projection unlocks after 20 answered questions or one completed mock exam, so a handful of answers cannot produce a misleading number.',
      },
      {
        q: 'How is pacing calculated?',
        a: 'Only timed mock exams record per-question time. “Rushing” counts questions answered incorrectly in under 20 seconds; “overthinking” counts questions that took 90 seconds or more. The scorecard and dashboard show averages, extremes and the resulting study-habit label.',
      },
      {
        q: 'How are weak areas chosen?',
        a: 'Subjects with at least three attempts and accuracy below 70% are listed as targeted remediation, with a one-click drill that builds a practice session from that subject.',
      },
    ],
  },
  {
    id: 'leaderboard',
    title: 'Leaderboard',
    icon: Trophy,
    items: [
      {
        q: 'How is the leaderboard ranked?',
        a: 'Only Grand Tests count. Each candidate’s best attempt in the current (or most recently closed) weekly window is ranked by percentage, then correct answers, then completion time.',
      },
      {
        q: 'Why am I not on the board?',
        a: 'You must be signed in, have a verified email address, and complete a 200-question / 180-minute Grand Test inside the weekly window. Regular mocks and guest attempts are never ranked.',
      },
      {
        q: 'Does retaking hurt my rank?',
        a: 'No. The board keeps your best attempt per window, so a weaker retake does not replace a stronger score.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account, email & security',
    icon: UserCog,
    items: [
      {
        q: 'Why should I verify my email?',
        a: 'Verification enables leaderboard ranking and confirms the address used for password recovery. Unverified accounts remain fully usable for practice and mocks; only ranking is withheld. Use the dashboard banner to resend the link.',
      },
      {
        q: 'The verification email never arrived. What now?',
        a: 'Check spam first. If the operator is still using Resend’s test sender, only the Resend account owner’s address can receive mail — other addresses are rejected. In development the verification link is printed to the server terminal as “[Email Dev] Verification link…”. Ask the operator to verify a domain at resend.com/domains for real delivery.',
      },
      {
        q: 'How many devices can stay signed in?',
        a: 'Five. Signing in on a sixth device signs out the oldest session. The dashboard lists active devices and offers “Sign out other devices”.',
      },
      {
        q: 'I forgot my password.',
        a: 'Use “Forgot password?” on the sign-in dialog. The reset link is valid for one hour, and completing a reset signs out existing sessions.',
      },
      {
        q: 'Can I download or delete my data?',
        a: 'Yes. Signed-in users can download a JSON export from the dashboard and delete their account after confirming their password. Deleting the account removes the stored profile and progress.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: Wrench,
    items: [
      {
        q: '“Answer check limit reached”',
        a: 'Answer checks are rate-limited to protect the bank. Guests get a smaller allowance than signed-in users; wait for the window to reset or sign in for a higher limit.',
      },
      {
        q: '“Weekly Grand Tests are open Friday 11:00…”',
        a: 'You tried to start a 200-question / 180-minute paper outside the weekly window. Use a shorter mock, or return when the countdown on the exam screen reaches zero.',
      },
      {
        q: 'The page works but questions do not load offline',
        a: 'The service worker caches the app shell, not API responses. Previously loaded questions may still appear from the local cache, but new questions, grading and stats require a connection.',
      },
      {
        q: 'Something looks wrong with a question.',
        a: 'Use the report flag on the question in Browse or Practice. Reports go to the quality queue where an administrator can review the stem, answer key and explanation.',
      },
    ],
  },
];

const ALL_SECTIONS_ID = 'all';

export const HelpPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>(ALL_SECTIONS_ID);

  const filteredSections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return HELP_SECTIONS.map((section) => {
      if (activeSection !== ALL_SECTIONS_ID && section.id !== activeSection) {
        return { ...section, items: [] };
      }
      if (!needle) return section;
      return {
        ...section,
        items: section.items.filter(
          (item) =>
            item.q.toLowerCase().includes(needle) || item.a.toLowerCase().includes(needle)
        ),
      };
    }).filter((section) => section.items.length > 0);
  }, [query, activeSection]);

  const resultCount = filteredSections.reduce((total, section) => total + section.items.length, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <title>{`Help Center | ${SITE_CONFIG.SITE_NAME}`}</title>
      <meta
        name="description"
        content="Answers about practice sessions, mock exams, Grand Tests, mistakes recovery, bookmarks, analytics, the leaderboard and account security."
      />
      <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/help`} />
      <meta property="og:title" content={`Help Center | ${SITE_CONFIG.SITE_NAME}`} />
      <meta
        property="og:description"
        content="Answers about practice sessions, mock exams, Grand Tests, mistakes recovery, bookmarks, analytics, the leaderboard and account security."
      />
      <meta property="og:url" content={`${SITE_CONFIG.SITE_URL}/help`} />

      <div className="text-center space-y-2 mb-6">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-cyan-700/10 border border-cyan-700/20 text-cyan-700">
          <LifeBuoy className="w-5 h-5" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Help Center
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Short answers about how practice, mocks, Grand Tests, mistakes, bookmarks and accounts work.
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help, e.g. negative marking, mistakes, leaderboard..."
            aria-label="Search help articles"
            className="w-full bg-white/70 border border-slate-200/90 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSection(ALL_SECTIONS_ID)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              activeSection === ALL_SECTIONS_ID
                ? 'bg-cyan-700 text-white border-cyan-700'
                : 'bg-white/70 text-slate-700 border-slate-200/90 hover:bg-white'
            }`}
          >
            All topics
          </button>
          {HELP_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                activeSection === section.id
                  ? 'bg-cyan-700 text-white border-cyan-700'
                  : 'bg-white/70 text-slate-700 border-slate-200/90 hover:bg-white'
              }`}
            >
              <section.icon className="w-3 h-3" />
              {section.title}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-3 mb-2">
        {resultCount} answer{resultCount === 1 ? '' : 's'}
        {query.trim() ? ` matching “${query.trim()}”` : ''}
      </p>

      {filteredSections.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-2">
          <Search className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900">No matching help articles</h2>
          <p className="text-xs text-slate-500">
            Try a shorter phrase, or email{' '}
            <a href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`} className="text-cyan-700 underline">
              {SITE_CONFIG.CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-6 mt-2">
          {filteredSections.map((section) => (
            <section key={section.id} aria-labelledby={`help-${section.id}`}>
              <h2
                id={`help-${section.id}`}
                className="text-sm font-semibold uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-2"
              >
                <section.icon className="w-4 h-4 text-cyan-700" />
                {section.title}
              </h2>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <details
                    key={item.q}
                    open={Boolean(query.trim())}
                    className="glass-panel rounded-xl px-4 py-3 group"
                  >
                    <summary className="flex items-center justify-between gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <span className="text-sm font-medium text-slate-900">{item.q}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2.5">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="glass-panel rounded-2xl p-6 mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Still need help?</h2>
          <p className="text-xs text-slate-500 mt-1">
            Send us the question code, your device/browser and what happened.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-medium"
          >
            <Mail className="w-3.5 h-3.5" />
            Email support
          </a>
          <Link
            to="/contact"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50"
          >
            Contact page
          </Link>
        </div>
      </div>
    </div>
  );
};
