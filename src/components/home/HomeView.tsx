import React from 'react';
import {
  BookOpen,
  Timer,
  ArrowRight,
  Sparkles,
  Award,
} from 'lucide-react';
import { ExamCategory, MCQQuestion, UserAccount } from '../../types';
import { SITE_CONFIG } from '../../config/site';
import { isVisibleQuestion } from '../../utils/questionVisibility';

interface HomeViewProps {
  categories: any[];
  questions: MCQQuestion[];
  currentUser?: UserAccount | null;
  onNavigateTab: (tab: 'home' | 'practice' | 'exam' | 'cee-ug' | 'mistakes' | 'dashboard' | 'admin') => void;
  onOpenDailyQuestion: () => void;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  onSelectSubject?: (subjectName: string) => void;
  onSelectUnit?: (unitName: string) => void;
  onSelectExam?: (exam: ExamCategory) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  categories,
  questions,
  onNavigateTab,
  onOpenDailyQuestion,
}) => {
  const publishedQuestions = questions.filter((q) => isVisibleQuestion(q));
  const publishedCount = publishedQuestions.length;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_CONFIG.SITE_URL}/#website`,
        url: SITE_CONFIG.SITE_URL,
        name: SITE_CONFIG.SITE_NAME,
        description:
          'Medical laboratory examination preparation question bank covering Hematology, Clinical Chemistry, Microbiology, Blood Banking, and Immunology.',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_CONFIG.SITE_URL}/practice?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_CONFIG.SITE_URL}/#organization`,
        name: SITE_CONFIG.SITE_NAME,
        url: SITE_CONFIG.SITE_URL,
        logo: `${SITE_CONFIG.SITE_URL}/favicon.svg`,
      },
    ],
  };

  return (
    <div className="space-y-10 pb-20">
      <title>{SITE_CONFIG.SITE_NAME} · Clinical Laboratory Medicine Question Bank</title>
      <meta
        name="description"
        content="Medical laboratory examination preparation question bank covering Hematology, Clinical Chemistry, Microbiology, Blood Banking, and Immunology."
      />
      <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/`} />
      <meta property="og:title" content={`${SITE_CONFIG.SITE_NAME} · Clinical Laboratory Medicine Question Bank`} />
      <meta
        property="og:description"
        content="Medical laboratory examination preparation question bank covering Hematology, Clinical Chemistry, Microbiology, Blood Banking, and Immunology."
      />
      <meta property="og:url" content={`${SITE_CONFIG.SITE_URL}/`} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Editorial Overview Section */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Soft liquid glass internal specular highlight */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-100/40 via-teal-50/20 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none blur-2xl" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          <div className="lg:col-span-8 space-y-4">
            <div className="glass-pill inline-flex items-center gap-2 px-3 py-1 rounded-full text-cyan-800 dark:text-cyan-300 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
              Clinical Laboratory Science &amp; Pathology
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug">
              Structured question bank for licensing and laboratory certification
            </h1>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Curated multiple-choice questions covering clinical enzymology, hematopathology, bacteriology, and immunohematology. Review individual topics with full diagnostic rationales or sit timed examinations calibrated to licensing standards.
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => onNavigateTab('practice')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-medium rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>Begin Practice Session</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('exam')}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-medium rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
              >
                <Timer className="w-4 h-4" />
                <span>Take Mock Examination</span>
              </button>

              <button
                type="button"
                onClick={onOpenDailyQuestion}
                className="glass-card hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all text-center cursor-pointer hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Question of the Day</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200/70 dark:border-white/10 space-y-3">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Question Bank Scope
            </h2>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 divide-y divide-slate-200/60 dark:divide-white/5">
              <div className="flex justify-between items-center py-1">
                <span>Verified questions:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{publishedCount} MCQs</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Specialty modules:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{categories.length} Disciplines</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Licensing boards:</span>
                <span className="font-semibold text-slate-900 dark:text-white">6 Syllabi</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 dark:border-white/10">
              <button
                type="button"
                onClick={() => onNavigateTab('practice')}
                className="text-xs text-cyan-800 dark:text-cyan-400 hover:text-cyan-950 dark:hover:text-cyan-300 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Search and practice all items</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeView;
