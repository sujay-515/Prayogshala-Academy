import React from 'react';

interface FeatureRowProps {
  label?: string;
  heading: string;
  description: string;
  bullets: string[];
  visual: React.ReactNode;
  reversed?: boolean;
}

export const FeatureRow: React.FC<FeatureRowProps> = ({
  heading,
  description,
  bullets,
  visual,
  reversed = false,
}) => {
  return (
    <div className="py-12 sm:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
        {/* Text Content */}
        <div
          className={`lg:col-span-6 space-y-4 ${
            reversed ? 'lg:order-2 lg:pl-4' : 'lg:order-1 lg:pr-4'
          }`}
        >
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
            {heading}
          </h3>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {description}
          </p>

          <ul className="space-y-2.5 pt-2" role="list">
            {bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 dark:bg-cyan-400 mt-2 shrink-0" aria-hidden="true" />
                <span className="leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Visual Component */}
        <div
          className={`lg:col-span-6 ${
            reversed ? 'lg:order-1' : 'lg:order-2'
          }`}
        >
          <div className="w-full max-w-xl mx-auto lg:max-w-none">
            {visual}
          </div>
        </div>
      </div>
    </div>
  );
};
