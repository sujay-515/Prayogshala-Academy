import React from 'react';
import { ArrowRight, BookOpen, Stethoscope } from 'lucide-react';
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
      className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="rounded-2xl p-8 sm:p-14 bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 dark:border-white/10">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
            Start preparing with {SITE_CONFIG.SITE_NAME} today
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Build diagnostic intuition with topic-wise clinical practice, test your speed under licensing blueprints, and master your mistakes before taking your exam.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={onStartPractice}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm sm:text-base transition-all active:scale-[0.98] cursor-pointer"
            >
              <BookOpen className="w-5 h-5 shrink-0" />
              <span>Begin Practice Session</span>
              <ArrowRight className="w-4 h-4 shrink-0 ml-0.5" />
            </button>

            <button
              type="button"
              onClick={onNavigateCeeUg}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm sm:text-base border border-white/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Stethoscope className="w-5 h-5 text-cyan-300 shrink-0" />
              <span>Try CEE-UG Mock Exam</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
