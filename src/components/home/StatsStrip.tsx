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
  const allStats = [
    {
      rawValue: publishedQuestionCount,
      value: `${publishedQuestionCount.toLocaleString()}+`,
      label: 'Practice Questions',
      description: 'Multiple-choice practice items',
    },
    {
      rawValue: categoriesCount,
      value: `${categoriesCount}`,
      label: 'Specialty Disciplines',
      description: 'Hematology, Biochemistry, Micro & more',
    },
    {
      rawValue: unitsCount,
      value: `${unitsCount}`,
      label: 'Curriculum Units',
      description: 'Topic divisions within subjects',
    },
    {
      rawValue: ALL_EXAM_CATEGORIES.length,
      value: `${ALL_EXAM_CATEGORIES.length}`,
      label: 'Licensing Boards',
      description: 'ASCP, NHPC, PSC, DHA, AIMS & CEE-UG',
    },
  ];

  const visibleStats = allStats.filter((item) => item.rawValue > 0);

  if (visibleStats.length === 0) {
    return null;
  }

  const gridColsClass =
    visibleStats.length === 1
      ? 'grid-cols-1 max-w-sm mx-auto'
      : visibleStats.length === 2
      ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
      : visibleStats.length === 3
      ? 'grid-cols-1 sm:grid-cols-3 max-w-4xl mx-auto'
      : 'grid-cols-2 lg:grid-cols-4';

  return (
    <section
      aria-label="Question Bank Statistics"
      className="py-10 sm:py-14 border-y border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid ${gridColsClass} gap-6 lg:gap-8`}>
          {visibleStats.map((item, idx) => (
            <div
              key={idx}
              className={`${visibleStats.length <= 2 ? 'text-center' : 'text-center lg:text-left'} space-y-1 p-2 sm:p-3`}
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
