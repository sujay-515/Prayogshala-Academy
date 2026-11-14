import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  ExamCategory,
  MCQQuestion,
  SubjectCategory,
  SubjectUnit,
  UserAccount,
} from '../../types';
import { SITE_CONFIG } from '../../config/site';
import { isVisibleQuestion } from '../../utils/questionVisibility';
import type { Theme } from '../../utils/theme';
import { ClinicalHero } from './ClinicalHero';
import { MasteryWorkflowSection } from './MasteryWorkflowSection';
import { ExamBlueprintsSection } from './ExamBlueprintsSection';
import { InteractiveSandboxSection } from './InteractiveSandboxSection';
import { EditorialStandardsSection } from './EditorialStandardsSection';
import { HomeFooter } from './HomeFooter';

export interface HomeViewProps {
  categories: SubjectCategory[];
  questions: MCQQuestion[];
  currentUser?: UserAccount | null;
  onNavigateTab: (
    tab: 'home' | 'practice' | 'exam' | 'cee-ug' | 'mistakes' | 'dashboard' | 'admin'
  ) => void;
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
}) => {
  const navigate = useNavigate();

  const publishedCount = useMemo(
    () => questions.filter((q) => isVisibleQuestion(q)).length,
    [questions]
  );

  const unitsCount = useMemo(() => {
    return categories.reduce((total, cat) => {
      const units: SubjectUnit[] =
        cat.units || (cat as { subjects?: SubjectUnit[] }).subjects || [];
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

      {/* 1. Hero + Live Clinical Case Workbench */}
      <ClinicalHero
        currentUser={currentUser}
        onOpenAuthModal={onOpenAuthModal}
        onStartPractice={() => onNavigateTab('practice')}
        onTakeMock={() => onNavigateTab('exam')}
        onOpenDashboard={() => onNavigateTab('dashboard')}
        onOpenDailyQuestion={onOpenDailyQuestion}
        publishedQuestionCount={publishedCount}
        categoriesCount={categories.length}
        unitsCount={unitsCount}
      />

      {/* 2. Features & Live Discipline Explorer (#features) */}
      <MasteryWorkflowSection
        categories={categories}
        onSelectSubject={onSelectSubject}
        onSelectUnit={onSelectUnit}
        onNavigateTab={onNavigateTab}
      />

      {/* 3. Licensing Blueprints, CEE-UG Deck & Weekly Grand Test (#exams) */}
      <ExamBlueprintsSection
        onSelectExam={onSelectExam}
        onNavigateCeeUg={() => onNavigateTab('cee-ug')}
        onTakeMock={() => onNavigateTab('exam')}
        onNavigateLeaderboard={() => navigate('/leaderboard')}
      />

      {/* 4. Interactive Study Sandbox (#demo) */}
      <InteractiveSandboxSection
        onStartPractice={() => onNavigateTab('practice')}
        onNavigateMistakes={() => onNavigateTab('mistakes')}
        onOpenDashboard={() => onNavigateTab('dashboard')}
      />

      {/* 5. Editorial Standards & Closing Conversion Band (#about) */}
      <EditorialStandardsSection
        currentUser={currentUser}
        onOpenAuthModal={onOpenAuthModal}
        onStartPractice={() => onNavigateTab('practice')}
        onNavigateCeeUg={() => onNavigateTab('cee-ug')}
      />

      {/* 6. Homepage Footer */}
      <HomeFooter />
    </div>
  );
};

export default HomeView;
