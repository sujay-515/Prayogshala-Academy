import React, { useMemo } from 'react';
import { ExamCategory, MCQQuestion, UserAccount, SubjectCategory } from '../../types';
import { SITE_CONFIG } from '../../config/site';
import { isVisibleQuestion } from '../../utils/questionVisibility';
import type { Theme } from '../../utils/theme';
import { HeroSection } from './HeroSection';
import { StatsStrip } from './StatsStrip';
import { FeaturesSection } from './FeaturesSection';
import { ExamsSection } from './ExamsSection';
import { DemoSection } from './DemoSection';
import { AboutSection } from './AboutSection';
import { FinalCtaSection } from './FinalCtaSection';
import { HomeFooter } from './HomeFooter';

export interface HomeViewProps {
  categories: SubjectCategory[];
  questions: MCQQuestion[];
  currentUser?: UserAccount | null;
  onNavigateTab: (tab: 'home' | 'practice' | 'exam' | 'cee-ug' | 'mistakes' | 'dashboard' | 'admin') => void;
  onOpenDailyQuestion: () => void;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  onSelectSubject?: (subjectName: string) => void;
  onSelectUnit?: (unitName: string) => void;
  onSelectExam?: (exam: ExamCategory) => void;
  theme?: Theme;
}

export const HomeView: React.FC<HomeViewProps> = ({
  categories,
  questions,
  currentUser,
  onNavigateTab,
  onOpenDailyQuestion,
  onOpenAuthModal,
  onSelectSubject,
  onSelectUnit,
  onSelectExam,
  theme = 'light',
}) => {
  const publishedQuestions = useMemo(
    () => questions.filter((q) => isVisibleQuestion(q)),
    [questions]
  );
  const publishedCount = publishedQuestions.length;

  const unitsCount = useMemo(() => {
    return categories.reduce((total, cat) => {
      const units = cat.units || (cat as any).subjects || [];
      return total + units.length;
    }, 0);
  }, [categories]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_CONFIG.SITE_URL}/#website`,
        url: SITE_CONFIG.SITE_URL,
        name: SITE_CONFIG.SITE_NAME,
        description: SITE_CONFIG.SITE_DESCRIPTION,
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
        '@type': 'EducationalOrganization',
        '@id': `${SITE_CONFIG.SITE_URL}/#organization`,
        name: SITE_CONFIG.SITE_NAME,
        url: SITE_CONFIG.SITE_URL,
        logo: `${SITE_CONFIG.SITE_URL}/brand/svg/logo-mark-cyan.svg`,
        description: SITE_CONFIG.SITE_DESCRIPTION,
      },
    ],
  };

  return (
    <div className="w-full space-y-0 text-slate-900 dark:text-slate-100">
      <title>{SITE_CONFIG.SITE_NAME} · Laboratory Medicine Question Bank &amp; Mock Exams</title>
      <meta name="description" content={SITE_CONFIG.SITE_DESCRIPTION} />
      <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/`} />
      <meta
        property="og:title"
        content={`${SITE_CONFIG.SITE_NAME} · Laboratory Medicine Question Bank & Mock Exams`}
      />
      <meta property="og:description" content={SITE_CONFIG.SITE_DESCRIPTION} />
      <meta property="og:url" content={`${SITE_CONFIG.SITE_URL}/`} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content={`${SITE_CONFIG.SITE_NAME} · Laboratory Medicine Question Bank & Mock Exams`}
      />
      <meta name="twitter:description" content={SITE_CONFIG.SITE_DESCRIPTION} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1. Hero Section */}
      <HeroSection
        onStartPractice={() => onNavigateTab('practice')}
        onTakeMock={() => onNavigateTab('exam')}
      />

      {/* 2. Stats Strip */}
      <StatsStrip
        publishedQuestionCount={publishedCount}
        categoriesCount={categories.length}
        unitsCount={unitsCount}
      />

      {/* 3. Features Section ("Built for high scores" / Exam Day) */}
      <FeaturesSection />

      {/* 4. Exams & Curriculum Scope Section */}
      <ExamsSection
        onSelectExam={onSelectExam}
        onNavigateCeeUg={() => onNavigateTab('cee-ug')}
      />

      {/* 5. See It in Action Demo Section */}
      <DemoSection theme={theme} />

      {/* 6. About & Educational Scope Section */}
      <AboutSection />

      {/* 7. Final CTA Section */}
      <FinalCtaSection
        onStartPractice={() => onNavigateTab('practice')}
        onNavigateCeeUg={() => onNavigateTab('cee-ug')}
      />

      {/* 8. 4-Column Homepage-Specific Footer */}
      <HomeFooter />
    </div>
  );
};

export default HomeView;
