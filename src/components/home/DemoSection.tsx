import React, { useState } from 'react';
import {
  Target,
  BarChart3,
  RotateCcw,
  GraduationCap,
  Bookmark,
  ImageIcon,
} from 'lucide-react';
import type { Theme } from '../../utils/theme';

interface DemoSectionProps {
  theme?: Theme;
}

type DemoTab = 'practice' | 'analytics' | 'mistakes' | 'exams' | 'bookmarks';

interface TabItem {
  id: DemoTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  screenshotLight: string;
  screenshotDark: string;
  placeholderCaption: string;
}

export const DemoSection: React.FC<DemoSectionProps> = ({ theme = 'light' }) => {
  const [activeTab, setActiveTab] = useState<DemoTab>('practice');
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const tabs: TabItem[] = [
    {
      id: 'practice',
      label: 'Practice',
      icon: Target,
      description: 'Interactive question interface with diagnostic rationales and reference citations',
      screenshotLight: '/brand/screenshots/practice-light.webp',
      screenshotDark: '/brand/screenshots/practice-dark.webp',
      placeholderCaption: 'Practice view showing clinical vignette, checked option, and diagnostic rationale',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Candidate performance telemetry: subject accuracy, study streaks, and pacing telemetry',
      screenshotLight: '/brand/screenshots/analytics-light.webp',
      screenshotDark: '/brand/screenshots/analytics-dark.webp',
      placeholderCaption: 'Analytics dashboard displaying discipline accuracy breakdown, pacing time, and score estimate',
    },
    {
      id: 'mistakes',
      label: 'Mistakes',
      icon: RotateCcw,
      description: 'Dedicated Mistakes Notebook requiring 2 consecutive correct attempts to master items',
      screenshotLight: '/brand/screenshots/mistakes-light.webp',
      screenshotDark: '/brand/screenshots/mistakes-dark.webp',
      placeholderCaption: 'Mistakes recovery notebook with active remediation queue and streak indicators',
    },
    {
      id: 'exams',
      label: 'Exams',
      icon: GraduationCap,
      description: 'Standardized timed examination simulation with countdown timer and instant scoring',
      screenshotLight: '/brand/screenshots/exams-light.webp',
      screenshotDark: '/brand/screenshots/exams-dark.webp',
      placeholderCaption: 'Timed exam mode interface with countdown timer, question navigator, and review palette',
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: Bookmark,
      description: 'Saved questions library with custom student annotations and high-yield notes',
      screenshotLight: '/brand/screenshots/bookmarks-light.webp',
      screenshotDark: '/brand/screenshots/bookmarks-dark.webp',
      placeholderCaption: 'Bookmarks library with filterable flagged questions and inline clinical notes',
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];
  const activeImage = theme === 'dark' ? currentTab.screenshotDark : currentTab.screenshotLight;
  const hasError = imageError[activeImage];

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    setActiveTab(tabs[nextIndex].id);
    const nextButton = document.getElementById(`demo-tab-${tabs[nextIndex].id}`);
    nextButton?.focus();
  };

  return (
    <section
      id="demo"
      aria-labelledby="demo-heading"
      className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10"
    >
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <h2
          id="demo-heading"
          className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight"
        >
          An interface built for focused clinical study
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Clean typography, distraction-free layouts, and immediate clinical feedback designed specifically for rigorous laboratory examination prep.
        </p>
      </div>

      {/* Tablist */}
      <div className="flex justify-center border-b border-slate-200/70 dark:border-white/10">
        <div
          role="tablist"
          aria-label="Application feature demonstrations"
          className="flex gap-4 sm:gap-8 overflow-x-auto max-w-full -mb-[1px]"
        >
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`demo-tab-${tab.id}`}
                role="tab"
                aria-selected={isSelected}
                aria-controls={`demo-panel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`inline-flex items-center gap-2 pb-3.5 text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer min-h-[44px] border-b-2 ${
                  isSelected
                    ? 'border-cyan-700 dark:border-cyan-400 text-cyan-800 dark:text-cyan-300'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-700 dark:text-cyan-400' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Panel */}
      <div
        id={`demo-panel-${currentTab.id}`}
        role="tabpanel"
        aria-labelledby={`demo-tab-${currentTab.id}`}
        tabIndex={0}
        className="space-y-4 focus:outline-none"
      >
        <div className="space-y-3">
          <div className="text-left space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {currentTab.label} Overview
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {currentTab.description}
            </p>
          </div>

          {/* Screenshot Display with Clean Fallback Preview - Single Framed Box */}
          <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 aspect-[16/10] flex items-center justify-center">
            {!hasError ? (
              <img
                src={activeImage}
                alt={`${currentTab.label} screen demonstration in ${theme} mode`}
                width={1280}
                height={800}
                loading="lazy"
                decoding="async"
                onError={() => setImageError((prev) => ({ ...prev, [activeImage]: true }))}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              /* High-fidelity fallback slot when local webp image has not yet been rendered */
              <div className="p-6 sm:p-10 w-full h-full flex flex-col justify-between bg-gradient-to-br from-white/90 via-slate-50/80 to-cyan-50/30 dark:from-slate-900/90 dark:via-slate-950/80 dark:to-cyan-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-400" />
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 ml-2">
                      prayogshala.app/{currentTab.id}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    [SCREENSHOT PLACEHOLDER: {currentTab.id}-{theme}.webp]
                  </span>
                </div>

                <div className="my-auto text-center space-y-3 max-w-lg mx-auto py-6">
                  <currentTab.icon className="w-8 h-8 text-cyan-700 dark:text-cyan-400 mx-auto" />
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {currentTab.placeholderCaption}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Live capture from local test environment. Clean data layout with zero synthetic student metrics.
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-white/10 pt-3">
                  <span>Target Ratio: 16:10 · WebP Optimized</span>
                  <span className="text-cyan-700 dark:text-cyan-400 font-medium">
                    Native Application Engine
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
