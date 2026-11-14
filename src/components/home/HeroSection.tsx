import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import type { Theme } from '../../utils/theme';

interface HeroSectionProps {
  onStartPractice: () => void;
  onTakeMock: () => void;
  theme?: Theme;
  categoriesCount?: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartPractice,
  onTakeMock,
  theme = 'light',
  categoriesCount,
}) => {
  const screenshotSrc =
    theme === 'dark'
      ? '/brand/screenshots/practice-dark.webp'
      : '/brand/screenshots/practice-light.webp';
  const screenshotMobileSrc =
    theme === 'dark'
      ? '/brand/screenshots/practice-mobile-dark.webp'
      : '/brand/screenshots/practice-mobile-light.webp';

  return (
    <section
      aria-labelledby="hero-heading"
      className="pt-10 sm:pt-16 pb-14 sm:pb-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headline, Value Proposition, Action CTAs (5/12 on desktop) */}
          <div className="lg:col-span-5 space-y-5 text-left order-1">
            <h1
              id="hero-heading"
              className="font-serif text-3xl sm:text-4xl lg:text-[44px] font-medium text-slate-900 dark:text-white tracking-tight leading-[1.18]"
            >
              Question bank and timed mock exams for medical laboratory licensure
            </h1>

            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Curated clinical question banks, timed mock exams, and automatic review of the questions you got wrong for ASCP, NHPC, PSC, DHA, AIMS, and CEE-UG.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
              <button
                type="button"
                onClick={onStartPractice}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-slate-950 font-bold text-sm sm:text-base shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <BookOpen className="w-5 h-5 shrink-0" />
                <span>Start Practice Session</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={onTakeMock}
                className="inline-flex items-center gap-1.5 text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors py-2 cursor-pointer"
              >
                <span>Take a timed mock exam</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>

            {categoriesCount && categoriesCount > 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                {categoriesCount} laboratory disciplines · Licensing and entrance exam blueprints
              </p>
            ) : null}
          </div>

          {/* Right Column: Single Flat Framed Practice Screenshot (7/12 on desktop) */}
          <div className="lg:col-span-7 order-2">
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 aspect-[16/10] w-full">
              <picture className="w-full h-full block">
                <source
                  media="(max-width: 639px)"
                  srcSet={screenshotMobileSrc}
                />
                <img
                  src={screenshotSrc}
                  alt="Practice mode interface with clinical question and explanation"
                  width={1280}
                  height={800}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-cover object-top block"
                />
              </picture>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
