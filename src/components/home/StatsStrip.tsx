import React from 'react';
import { ALL_EXAM_CATEGORIES } from '../../utils/examCategories';

interface StatsStripProps {
  publishedQuestionCount: number;
  categoriesCount: number;
  unitsCount: number;
}

export const StatsStrip: React.FC<StatsStripProps> = ({
  publishedQuestionCount,
  categoriesCount,
  unitsCount,
}) => {
  const stats = [
    {
      value: publishedQuestionCount > 0 ? `${publishedQuestionCount.toLocaleString()}+` : '0',
      label: 'Practice Questions',
      description: 'Peer-reviewed clinical & entrance MCQs',
    },
    {
      value: categoriesCount > 0 ? `${categoriesCount}` : '0',
      label: 'Specialty Disciplines',
      description: 'Hematology, Biochemistry, Micro & more',
    },
    {
      value: unitsCount > 0 ? `${unitsCount}` : '0',
      label: 'Curriculum Units',
      description: 'Focused high-yield topic modules',
    },
    {
      value: `${ALL_EXAM_CATEGORIES.length}`,
      label: 'Licensing Boards',
      description: 'ASCP, NHPC, PSC, DHA, AIMS & CEE-UG',
    },
  ];

  return (
    <section
      aria-label="Question Bank Statistics"
      className="py-10 sm:py-14 border-y border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((item, idx) => (
            <div
              key={idx}
              className="text-center lg:text-left space-y-1 p-2 sm:p-3"
            >
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                <span className="text-cyan-700 dark:text-cyan-400">{item.value}</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {item.label}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
