import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileSearch,
  RotateCcw,
  Timer,
  XCircle,
} from 'lucide-react';
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

interface InteractiveSandboxSectionProps {
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
  onStartPractice,
  onNavigateMistakes,
  onOpenDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<SandboxTabId>('practice');

  // Tab 1: Rationale Inspector state
  const [inspectorCaseIdx, setInspectorCaseIdx] = useState(0);
  const activeInspectorCase = CLINICAL_DEMO_CASES[inspectorCaseIdx] || CLINICAL_DEMO_CASES[0];

  // Tab 2: 2-Streak Mistake Simulator state (powered by real recordMistakeAnswer logic)
  const [mistakeState, setMistakeState] = useState<MistakeState>(INITIAL_MISTAKE_STATE);
  const [mistakeHistory, setMistakeHistory] = useState<string[]>([
    'Missed in timed mock → Entered Mistakes Queue at 0/2 streak.',
  ]);

  const isQueued = mistakeState.revisionQueueIds.includes(INITIAL_MISTAKE_DEMO_ID);
  const currentStreak = isQueued
    ? mistakeState.mistakeStreaks[INITIAL_MISTAKE_DEMO_ID] ?? 0
    : MISTAKE_CLEAR_THRESHOLD;

  const handleSimulateMistakeAttempt = (isCorrect: boolean) => {
    setMistakeState((prev) => {
      // If already cleared, re-queue on wrong or restart cleanly on explicit reset
      if (!prev.revisionQueueIds.includes(INITIAL_MISTAKE_DEMO_ID)) {
        if (!isCorrect) {
          const next = recordMistakeAnswer(prev, INITIAL_MISTAKE_DEMO_ID, false);
          setMistakeHistory((h) => [
            'Incorrect recall → Re-entered Mistakes Queue at 0/2 streak.',
            ...h.slice(0, 3),
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
          `2nd consecutive correct recall → Cleared from Mistakes Queue (${MISTAKE_CLEAR_THRESHOLD}/${MISTAKE_CLEAR_THRESHOLD}).`,
          ...h.slice(0, 3),
        ]);
      } else if (isCorrect) {
        setMistakeHistory((h) => [
          `1st correct recall → Streak advanced to ${nextStreak}/${MISTAKE_CLEAR_THRESHOLD} (1 more required).`,
          ...h.slice(0, 3),
        ]);
      } else {
        setMistakeHistory((h) => [
          'Incorrect recall → Streak reset to 0/2; item stays queued.',
          ...h.slice(0, 3),
        ]);
      }
      return next;
    });
  };

  const handleResetMistakeDemo = () => {
    setMistakeState(INITIAL_MISTAKE_STATE);
    setMistakeHistory(['Reset simulation → Item queued at 0/2 streak.']);
  };

  // Tab 3: Pacing & Telemetry Explorer state
  const [selectedProfileId, setSelectedProfileId] =
    useState<TelemetryProfile['id']>('balanced');
  const activeProfile =
    TELEMETRY_DEMO_PROFILES.find((p) => p.id === selectedProfileId) ||
    TELEMETRY_DEMO_PROFILES[0];

  const tabs: {
    id: SandboxTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'practice', label: 'Rationale Inspector', icon: FileSearch },
    { id: 'mistakes', label: '2-Streak Mistake Lab', icon: RotateCcw },
    { id: 'analytics', label: 'Pacing & Readiness', icon: BarChart3 },
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
      className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Heading */}
        <div className="max-w-3xl space-y-3">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">
            03 · Interactive Study Sandbox
          </div>
          <h2
            id="demo-heading"
            className="font-serif-heading text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight text-balance"
          >
            Test the diagnostic mechanisms before opening a session
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-[62ch]">
            Inspect how differential rationales rule out look-alike diagnoses, trigger the two-consecutive-hit mistake rule live, and explore how pacing telemetry flags weak syllabus units.
          </p>
        </div>

        {/* Keyboard-Operable Tab Strip */}
        <div
          role="tablist"
          aria-label="Interactive study sandbox modes"
          className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3"
        >
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
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
                className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-[background-color,color,border-color] duration-150 ease-out cursor-pointer touch-manipulation border ${
                  selected
                    ? 'bg-cyan-700 text-white border-cyan-700 dark:bg-cyan-400 dark:text-[#04131d] dark:border-cyan-400 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-cyan-600 dark:hover:border-cyan-400'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Panel 1: Rationale Inspector */}
        {activeTab === 'practice' && (
          <div
            id="sandbox-panel-practice"
            role="tabpanel"
            aria-labelledby="sandbox-tab-practice"
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-8 space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Option-by-Option Differential Rationale Breakdown
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  Every practice item includes specific exclusion reasoning for distractors alongside the confirmed mechanism.
                </p>
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Choose specialty vignette">
                {CLINICAL_DEMO_CASES.map((item, idx) => {
                  const isActive = idx === inspectorCaseIdx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setInspectorCaseIdx(idx)}
                      aria-pressed={isActive}
                      className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-semibold border transition-colors cursor-pointer touch-manipulation ${
                        isActive
                          ? 'bg-cyan-50 border-cyan-500 text-cyan-900 dark:text-cyan-300'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-600'
                      }`}
                    >
                      {item.discipline}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-600 dark:text-slate-400">
                  <span>{activeInspectorCase.code} · {activeInspectorCase.unit}</span>
                  <span>Boards: {activeInspectorCase.boards.join(', ')}</span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  {activeInspectorCase.patientSummary}{' '}
                  <strong className="font-semibold text-slate-900 dark:text-slate-100">
                    {activeInspectorCase.questionStem}
                  </strong>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeInspectorCase.options.map((opt) => {
                  const isKeyed = opt.id === activeInspectorCase.correctAnswer;
                  return (
                    <div
                      key={opt.id}
                      className={`rounded-xl border p-4 space-y-2 ${
                        isKeyed
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                          <span className="w-6 h-6 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center font-mono text-xs">
                            {opt.id}
                          </span>
                          <span>{opt.text}</span>
                        </span>
                        {isKeyed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Keyed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 shrink-0">
                            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Excluded</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {opt.rationale}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="italic">Citation: {activeInspectorCase.reference}</span>
                <button
                  type="button"
                  onClick={onStartPractice}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-3 font-bold text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer touch-manipulation"
                >
                  <span>Practice full bank</span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panel 2: Live 2-Streak Mistake Recovery Lab */}
        {activeTab === 'mistakes' && (
          <div
            id="sandbox-panel-mistakes"
            role="tabpanel"
            aria-labelledby="sandbox-tab-mistakes"
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-8 space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-4">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Interactive Mistakes Queue Engine ({MISTAKE_CLEAR_THRESHOLD} Consecutive Hits Required)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Test the exact recovery engine used inside the app. Getting a queued question right once advances its streak to <span className="font-mono font-semibold">1/2</span>; missing resets it to <span className="font-mono font-semibold">0/2</span>. Only two consecutive correct answers clear the item.
                  </p>
                </div>

                {/* Simulated Queued Card */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      {CLINICAL_DEMO_CASES[2].code} · {CLINICAL_DEMO_CASES[2].discipline}
                    </span>
                    <span
                      role="status"
                      aria-live="polite"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold border tabular-nums ${
                        !isQueued
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                          : currentStreak === 1
                          ? 'bg-amber-50 border-amber-300 text-amber-800 dark:text-amber-300'
                          : 'bg-rose-50 border-rose-300 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {!isQueued
                        ? `Cleared (${MISTAKE_CLEAR_THRESHOLD}/${MISTAKE_CLEAR_THRESHOLD})`
                        : `Queued · Streak ${currentStreak}/${MISTAKE_CLEAR_THRESHOLD}`}
                    </span>
                  </div>

                  {/* Progress Indicator */}
                  <div className="grid grid-cols-2 gap-2" aria-hidden="true">
                    <div
                      className={`h-2.5 rounded-full transition-colors duration-200 ${
                        currentStreak >= 1
                          ? 'bg-emerald-600 dark:bg-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                    <div
                      className={`h-2.5 rounded-full transition-colors duration-200 ${
                        !isQueued
                          ? 'bg-emerald-600 dark:bg-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSimulateMistakeAttempt(true)}
                      disabled={!isQueued}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] text-xs font-bold transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Simulate Correct Recall (+1)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulateMistakeAttempt(false)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-slate-900 border border-rose-300 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-xs font-bold transition-colors cursor-pointer touch-manipulation"
                    >
                      <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Simulate Wrong Answer (Reset)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetMistakeDemo}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-400 cursor-pointer touch-manipulation"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Event Log */}
              <div className="lg:col-span-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    State Transition Log
                  </span>
                  <button
                    type="button"
                    onClick={onNavigateMistakes}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 dark:text-cyan-400 hover:underline min-h-[44px] cursor-pointer"
                  >
                    <span>Open Mistakes Notebook</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300" aria-live="polite">
                  {mistakeHistory.map((entry, i) => (
                    <li
                      key={`${entry}-${i}`}
                      className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3 py-2 leading-relaxed"
                    >
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Panel 3: Pacing & Readiness Telemetry Explorer */}
        {activeTab === 'analytics' && (
          <div
            id="sandbox-panel-analytics"
            role="tabpanel"
            aria-labelledby="sandbox-tab-analytics"
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-8 space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Sample Candidate Pacing &amp; Weak-Unit Diagnostics
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  Switch sample telemetry profiles to see how Prayogshala Academy isolates timing habits and flags units below 70%.
                </p>
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Sample pacing profile selector">
                {TELEMETRY_DEMO_PROFILES.map((profile) => {
                  const active = profile.id === selectedProfileId;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => setSelectedProfileId(profile.id)}
                      aria-pressed={active}
                      className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-semibold border transition-colors cursor-pointer touch-manipulation ${
                        active
                          ? 'bg-cyan-50 border-cyan-500 text-cyan-900 dark:text-cyan-300'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-600'
                      }`}
                    >
                      {profile.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Timing & Verdict Metrics */}
              <div className="lg:col-span-6 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block">
                      Mean Pace
                    </span>
                    <span className="text-xl font-extrabold font-mono text-cyan-700 dark:text-cyan-400 tabular-nums mt-0.5 block">
                      {activeProfile.avgSeconds}s
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block">
                      Fastest
                    </span>
                    <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-0.5 block">
                      {activeProfile.fastestSeconds}s
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block">
                      Slowest
                    </span>
                    <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-0.5 block">
                      {activeProfile.slowestSeconds}s
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block">
                      Accuracy
                    </span>
                    <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-0.5 block">
                      {activeProfile.accuracyPct}%
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                      <Timer className="w-4 h-4 text-cyan-700 dark:text-cyan-400" aria-hidden="true" />
                      <span>{activeProfile.pacingVerdict}</span>
                    </span>
                    <span className="text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                      {activeProfile.readinessBand}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {activeProfile.pacingAdvice}
                  </p>
                </div>
              </div>

              {/* Unit Accuracy & <70% Flagging */}
              <div className="lg:col-span-6 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Discipline Unit Accuracy (Illustrative Sample)
                  </span>
                  <button
                    type="button"
                    onClick={onOpenDashboard}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 dark:text-cyan-400 hover:underline min-h-[44px] cursor-pointer"
                  >
                    <span>Open Your Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>

                <div className="space-y-3">
                  {activeProfile.weakUnits.map((item) => {
                    const isWeak = item.accuracy < 70;
                    return (
                      <div key={item.unit} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {item.unit}
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-mono font-bold tabular-nums shrink-0">
                            {isWeak && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-400">
                                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Needs Review</span>
                              </span>
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
                        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
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
