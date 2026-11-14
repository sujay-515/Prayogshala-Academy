import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { SITE_CONFIG } from '../../config/site';

interface FinalCtaSectionProps {
  onStartPractice: () => void;
  onNavigateCeeUg: () => void;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({
  onStartPractice,
  onNavigateCeeUg,
}) => {
  return (
    <section
      aria-label="Call to Action"
      className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-slate-950"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-slate-900 dark:text-white tracking-tight leading-tight">
          Start preparing with {SITE_CONFIG.SITE_NAME} today
        </h2>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
          Practice questions by topic, test your speed under timed exam conditions, and review the questions you miss.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={onStartPractice}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-slate-950 font-bold text-sm sm:text-base shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <BookOpen className="w-5 h-5 shrink-0" />
            <span>Start Practice Session</span>
            <ArrowRight className="w-4 h-4 shrink-0 ml-0.5" />
          </button>

          <button
            type="button"
            onClick={onNavigateCeeUg}
            className="inline-flex items-center gap-1.5 text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors py-2 cursor-pointer"
          >
            <span>Try CEE-UG mock exam</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>
    </section>
  );
};
