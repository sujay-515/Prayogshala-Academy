import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Timer,
  XCircle,
} from 'lucide-react';
import type { UserAccount } from '../../types';
import {
  MISTAKE_CLEAR_THRESHOLD,
  recordMistakeAnswer,
  type MistakeState,
} from '../../utils/mistakes';
import {
  CLINICAL_DEMO_CASES,
  TELEMETRY_DEMO_PROFILES,
  type TelemetryProfile,
} from './homeMockData';
import { useScrollReveal } from './homeMotion';

interface InteractiveSandboxSectionProps {
  currentUser?: UserAccount | null;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  onStartPractice: () => void;
  onNavigateMistakes: () => void;
  onOpenDashboard: () => void;
}

type SandboxTabId = 'practice' | 'mistakes' | 'analytics';

const INITIAL_MISTAKE_DEMO_ID = CLINICAL_DEMO_CASES[2].id;
const INITIAL_MISTAKE_STATE: MistakeState = {
  revisionQueueIds: [INITIAL_MISTAKE_DEMO_ID],
  mistakeStreaks: { [INITIAL_MISTAKE_DEMO_ID]: 0 },
};

export const InteractiveSandboxSection: React.FC<InteractiveSandboxSectionProps> = ({
  currentUser,
  onOpenAuthModal,
  onStartPractice,
  onNavigateMistakes,
  onOpenDashboard,
}) => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>(0.08);
  const isGuest = !currentUser;
  const [activeTab, setActiveTab] = useState<SandboxTabId>('practice');

  const openLockedOrRun = (fn: () => void) => {
    if (isGuest && onOpenAuthModal) {
      onOpenAuthModal('register');
      return;
    }
    fn();
  };

  // Tab 1: Rationale Inspector state
  const [inspectorCaseIdx, setInspectorCaseIdx] = useState(0);
  const activeInspectorCase = CLINICAL_DEMO_CASES[inspectorCaseIdx] || CLINICAL_DEMO_CASES[0];

  // Tab 2: 2-Streak Mistake Simulator state (powered by real recordMistakeAnswer logic)
  const [mistakeState, setMistakeState] = useState<MistakeState>(INITIAL_MISTAKE_STATE);
  const [mistakeHistory, setMistakeHistory] = useState<string[]>([
    'Sample missed item queued at 0/2 streak.',
  ]);

  const isQueued = mistakeState.revisionQueueIds.includes(INITIAL_MISTAKE_DEMO_ID);
  const currentStreak = isQueued
    ? mistakeState.mistakeStreaks[INITIAL_MISTAKE_DEMO_ID] ?? 0
    : MISTAKE_CLEAR_THRESHOLD;

  const handleSimulateMistakeAttempt = (isCorrect: boolean) => {
    setMistakeState((prev) => {
      if (!prev.revisionQueueIds.includes(INITIAL_MISTAKE_DEMO_ID)) {
        if (!isCorrect) {
          const next = recordMistakeAnswer(prev, INITIAL_MISTAKE_DEMO_ID, false);
          setMistakeHistory((h) => [
            'Missed recall → Re-queued at 0/2 streak.',
            ...h.slice(0, 2),
          ]);
          return next;
        }
        return prev;
      }

      const next = recordMistakeAnswer(prev, INITIAL_MISTAKE_DEMO_ID, isCorrect);
      const stillQueued = next.revisionQueueIds.includes(INITIAL_MISTAKE_DEMO_ID);
      const nextStreak = next.mistakeStreaks[INITIAL_MISTAKE_DEMO_ID] ?? 0;

      if (isCorrect && !stillQueued) {
        setMistakeHistory((h) => [
          `2nd right answer → Cleared (${MISTAKE_CLEAR_THRESHOLD}/${MISTAKE_CLEAR_THRESHOLD}).`,
          ...h.slice(0, 2),
        ]);
      } else if (isCorrect) {
        setMistakeHistory((h) => [
          `1st right answer → Streak ${nextStreak}/${MISTAKE_CLEAR_THRESHOLD}.`,
          ...h.slice(0, 2),
        ]);
      } else {
        setMistakeHistory((h) => [
          'Wrong recall → Reset to 0/2 streak.',
          ...h.slice(0, 2),
        ]);
      }
      return next;
    });
  };

  const handleResetMistakeDemo = () => {
    setMistakeState(INITIAL_MISTAKE_STATE);
    setMistakeHistory(['Reset sample → Queued at 0/2 streak.']);
  };

  // Tab 3: Sample Telemetry Explorer state
  const [selectedProfileId, setSelectedProfileId] =
    useState<TelemetryProfile['id']>('balanced');
  const activeProfile =
    TELEMETRY_DEMO_PROFILES.find((p) => p.id === selectedProfileId) ||
    TELEMETRY_DEMO_PROFILES[0];

  const tabs: {
    id: SandboxTabId;
    label: string;
  }[] = [
    { id: 'practice', label: 'Rationale Sample' },
    { id: 'mistakes', label: '2-Streak Sample' },
    { id: 'analytics', label: 'Pacing Sample' },
  ];

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = tabs.length - 1;
    else return;

    e.preventDefault();
    const targetId = tabs[nextIndex].id;
    setActiveTab(targetId);
    document.getElementById(`sandbox-tab-${targetId}`)?.focus();
  };

  return (
    <section
      id="demo"
      aria-labelledby="demo-heading"
      className="hp-section-tinted py-14 sm:py-20 border-t border-slate-200/80 dark:border-slate-800"
    >
      <div
        ref={ref}
        className={`hp-reveal ${isVisible ? 'is-visible' : ''} max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8`}
      >
        {/* Short Heading */}
        <div className="space-y-2 max-w-xl">
          <h2
            id="demo-heading"
            className="font-serif-heading text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight text-balance"
          >
            Interactive Sample Study Sandbox
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 line-clamp-2">
            Try sample rationales, 2-streak clearing, and pacing visuals below.
          </p>
        </div>

        {/* Keyboard-Operable Tab Strip */}
        <div
          role="tablist"
          aria-label="Interactive sample preview modes"
          className="flex flex-wrap gap-6 border-b border-slate-200 dark:border-slate-800"
        >
          {tabs.map((tab, idx) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`sandbox-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`sandbox-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`pb-3 min-h-[44px] text-xs sm:text-sm font-bold border-b-2 -mb-px transition-colors cursor-pointer touch-manipulation ${
                  selected
                    ? 'border-cyan-700 text-cyan-700 dark:border-cyan-400 dark:text-cyan-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Panel 1: Sample Rationale Inspector */}
        {activeTab === 'practice' && (
          <div
            id="sandbox-panel-practice"
            role="tabpanel"
            aria-labelledby="sandbox-tab-practice"
            className="hp-card rounded-2xl p-5 sm:p-6 space-y-5"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Sample Option-by-Option Rationale Breakdown
              </h3>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Choose sample vignette">
                {CLINICAL_DEMO_CASES.map((item, idx) => {
                  const isActive = idx === inspectorCaseIdx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setInspectorCaseIdx(idx)}
                      aria-pressed={isActive}
                      className={`px-3 py-1.5 min-h-[40px] rounded-xl text-xs font-semibold border transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] cursor-pointer touch-manipulation ${
                        isActive
                          ? 'bg-cyan-50 border-cyan-500 text-cyan-900 dark:text-cyan-300'
                          : 'hp-well text-slate-700 dark:text-slate-300 hover:border-cyan-500'
                      }`}
                    >
                      {item.discipline}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hp-well rounded-xl p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                <span>Sample · {activeInspectorCase.code}</span>
                <span>{activeInspectorCase.boards.join(' · ')}</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                {activeInspectorCase.questionStem}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeInspectorCase.options.map((opt) => {
                const isKeyed = opt.id === activeInspectorCase.correctAnswer;
                return (
                  <div
                    key={opt.id}
                    className={`rounded-xl border p-3.5 space-y-1.5 ${
                      isKeyed
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'hp-well'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        <span className="w-5 h-5 rounded bg-white/80 dark:bg-white/10 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-mono text-[11px] shrink-0">
                          {opt.id}
                        </span>
                        <span className="truncate">{opt.text}</span>
                      </span>
                      {isKeyed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" aria-hidden="true" />
                      )}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-snug">
                      {opt.rationale}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400 italic truncate">
                Ref: {activeInspectorCase.reference}
              </span>
              <button
                type="button"
                onClick={() => openLockedOrRun(onStartPractice)}
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] font-bold transition-[background-color,transform] duration-150 active:scale-[0.98] cursor-pointer touch-manipulation"
              >
                <span>{isGuest ? 'Try in Question Bank' : 'Continue Practice'}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Panel 2: Sample 2-Streak Mistake Lab */}
        {activeTab === 'mistakes' && (
          <div
            id="sandbox-panel-mistakes"
            role="tabpanel"
            aria-labelledby="sandbox-tab-mistakes"
            className="hp-card rounded-2xl p-5 sm:p-6 space-y-5"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Sample {MISTAKE_CLEAR_THRESHOLD}-Streak Mistake Simulator
                  </h3>
                  <span
                    role="status"
                    aria-live="polite"
                    className={`text-xs font-mono font-bold tabular-nums ${
                      !isQueued
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : currentStreak === 1
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {!isQueued
                      ? `Cleared (${MISTAKE_CLEAR_THRESHOLD}/${MISTAKE_CLEAR_THRESHOLD})`
                      : `Queued · ${currentStreak}/${MISTAKE_CLEAR_THRESHOLD}`}
                  </span>
                </div>

                {/* Progress Indicator */}
                <div className="grid grid-cols-2 gap-2" aria-hidden="true">
                  <div
                    className={`h-2.5 rounded-full transition-colors duration-200 ${
                      currentStreak >= 1
                        ? 'bg-emerald-600 dark:bg-emerald-400'
                        : 'bg-slate-200 dark:bg-white/10'
                    }`}
                  />
                  <div
                    className={`h-2.5 rounded-full transition-colors duration-200 ${
                      !isQueued
                        ? 'bg-emerald-600 dark:bg-emerald-400'
                        : 'bg-slate-200 dark:bg-white/10'
                    }`}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSimulateMistakeAttempt(true)}
                    disabled={!isQueued}
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] text-xs font-bold transition-[background-color,transform] duration-150 active:scale-[0.98] cursor-pointer touch-manipulation"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Right Recall (+1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateMistakeAttempt(false)}
                    className="hp-well inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl border-rose-300 text-rose-700 dark:text-rose-400 hover:bg-rose-50 text-xs font-bold transition-[background-color,transform] duration-150 active:scale-[0.98] cursor-pointer touch-manipulation"
                  >
                    <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Wrong Recall (Reset)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetMistakeDemo}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-cyan-700 cursor-pointer touch-manipulation"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 hp-well rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Sample Log
                  </span>
                  <button
                    type="button"
                    onClick={() => openLockedOrRun(onNavigateMistakes)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:underline min-h-[36px] cursor-pointer"
                  >
                    <span>{isGuest ? 'Try Mistakes Queue' : 'Open Mistakes'}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300" aria-live="polite">
                  {mistakeHistory.map((entry, i) => (
                    <li
                      key={`${entry}-${i}`}
                      className="hp-card rounded-lg px-3 py-2 truncate"
                    >
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Panel 3: Sample Pacing & Telemetry Explorer */}
        {activeTab === 'analytics' && (
          <div
            id="sandbox-panel-analytics"
            role="tabpanel"
            aria-labelledby="sandbox-tab-analytics"
            className="hp-card rounded-2xl p-5 sm:p-6 space-y-5"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Sample Candidate Telemetry
              </h3>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Sample pacing profile selector">
                {TELEMETRY_DEMO_PROFILES.map((profile) => {
                  const active = profile.id === selectedProfileId;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => setSelectedProfileId(profile.id)}
                      aria-pressed={active}
                      className={`px-3 py-1.5 min-h-[40px] rounded-xl text-xs font-semibold border transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] cursor-pointer touch-manipulation ${
                        active
                          ? 'bg-cyan-50 border-cyan-500 text-cyan-900 dark:text-cyan-300'
                          : 'hp-well text-slate-700 dark:text-slate-300 hover:border-cyan-500'
                      }`}
                    >
                      {profile.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Numeric Tiles */}
              <div className="lg:col-span-6 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="hp-well rounded-xl p-3">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block">Mean</span>
                    <span className="text-lg font-extrabold font-mono text-cyan-700 dark:text-cyan-400 tabular-nums">
                      {activeProfile.avgSeconds}s
                    </span>
                  </div>
                  <div className="hp-well rounded-xl p-3">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block">Fastest</span>
                    <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                      {activeProfile.fastestSeconds}s
                    </span>
                  </div>
                  <div className="hp-well rounded-xl p-3">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block">Slowest</span>
                    <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                      {activeProfile.slowestSeconds}s
                    </span>
                  </div>
                  <div className="hp-well rounded-xl p-3">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block">Accuracy</span>
                    <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                      {activeProfile.accuracyPct}%
                    </span>
                  </div>
                </div>

                <div className="hp-well rounded-xl p-3.5 flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                    <Timer className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                    <span>{activeProfile.pacingVerdict}</span>
                  </span>
                  <span className="font-mono font-semibold text-cyan-700 dark:text-cyan-400 tabular-nums">
                    {activeProfile.readinessBand}
                  </span>
                </div>
              </div>

              {/* Sample Unit Bars */}
              <div className="lg:col-span-6 hp-well rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Sample Unit Accuracy
                  </span>
                  <button
                    type="button"
                    onClick={() => openLockedOrRun(onOpenDashboard)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:underline min-h-[36px] cursor-pointer"
                  >
                    <span>{isGuest ? 'View Full Telemetry' : 'Dashboard'}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {activeProfile.weakUnits.map((item) => {
                    const isWeak = item.accuracy < 70;
                    return (
                      <div key={item.unit} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {item.unit}
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono font-bold tabular-nums shrink-0">
                            {isWeak && (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" aria-hidden="true" />
                            )}
                            <span
                              className={
                                isWeak
                                  ? 'text-rose-700 dark:text-rose-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                              }
                            >
                              {item.accuracy}%
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                              isWeak
                                ? 'bg-rose-600 dark:bg-rose-400'
                                : 'bg-emerald-600 dark:bg-emerald-400'
                            }`}
                            style={{ width: `${item.accuracy}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
