import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertCircle,
  RotateCcw,
  Check,
  Award,
  Layers,
  Save,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Info,
} from 'lucide-react';
import { MCQQuestion, ExamCategory } from '../../types';
import { EXAM_SYLLABI, ExamSyllabusInfo } from '../exam/ExamMode';
import {
  CEE_UG_DURATION_MINUTES,
  CEE_UG_PASSING_PERCENTAGE,
  CEE_UG_PENALTY_PER_WRONG,
  computeCeeUgAvailability,
} from '../../config/ceeUg';
import { questionMatchesExamCategory } from '../../utils/examCategories';

export interface AdminMockSetConfig {
  syllabusCode: string;
  setNumber: number;
  durationMinutes: number;
  negativeMarking: boolean;
  penaltyPerWrong: number;
  passingPercentage: number;
  updatedAt?: string;
}

interface MockSetManagerProps {
  questions: MCQQuestion[];
  authToken?: string | null;
}

export const MockSetManager: React.FC<MockSetManagerProps> = ({
  questions,
  authToken,
}) => {
  const [selectedSyllabusCode, setSelectedSyllabusCode] = useState<string>('CEE-UG');
  const [serverConfigs, setServerConfigs] = useState<Record<string, AdminMockSetConfig>>({});
  const [localDrafts, setLocalDrafts] = useState<Record<string, AdminMockSetConfig>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saved' | 'saving' | 'error' | null>>({});
  const [globalMessage, setGlobalMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const activeSyllabus: ExamSyllabusInfo =
    EXAM_SYLLABI.find((s) => s.code === selectedSyllabusCode) || EXAM_SYLLABI[0];

  const getSyllabusDefaults = (spec: ExamSyllabusInfo) => {
    const isCeeUg = spec.code === 'CEE-UG';
    return {
      durationMinutes: isCeeUg ? CEE_UG_DURATION_MINUTES : spec.durationMinutes,
      negativeMarking: isCeeUg ? true : spec.penaltyPerWrong > 0,
      penaltyPerWrong: isCeeUg ? CEE_UG_PENALTY_PER_WRONG : spec.penaltyPerWrong,
      passingPercentage: isCeeUg ? CEE_UG_PASSING_PERCENTAGE : spec.passingPercentage,
    };
  };

  // Fetch configs from server on mount
  useEffect(() => {
    let isMounted = true;
    const fetchConfigs = async () => {
      try {
        const res = await fetch('/api/mock-sets/configs');
        const data = await res.json().catch(() => null);
        if (isMounted && res.ok && data?.success && Array.isArray(data.configs)) {
          const map: Record<string, AdminMockSetConfig> = {};
          for (const cfg of data.configs) {
            const key = `${cfg.syllabusCode}_set_${cfg.setNumber}`;
            map[key] = cfg;
          }
          setServerConfigs(map);
        }
      } catch (err) {
        console.warn('[MockSetManager] Failed to load server configs', err);
      }
    };
    fetchConfigs();
    return () => {
      isMounted = false;
    };
  }, []);

  const getConfigForSet = (syllabusCode: string, setNum: number): AdminMockSetConfig => {
    const key = `${syllabusCode}_set_${setNum}`;
    if (localDrafts[key]) return localDrafts[key];
    if (serverConfigs[key]) return serverConfigs[key];
    const spec = EXAM_SYLLABI.find((s) => s.code === syllabusCode) || EXAM_SYLLABI[0];
    const def = getSyllabusDefaults(spec);
    return {
      syllabusCode,
      setNumber: setNum,
      ...def,
    };
  };

  const isSetCustomized = (syllabusCode: string, setNum: number): boolean => {
    const cfg = getConfigForSet(syllabusCode, setNum);
    const spec = EXAM_SYLLABI.find((s) => s.code === syllabusCode) || EXAM_SYLLABI[0];
    const def = getSyllabusDefaults(spec);
    return (
      cfg.durationMinutes !== def.durationMinutes ||
      cfg.negativeMarking !== def.negativeMarking ||
      (cfg.negativeMarking && cfg.penaltyPerWrong !== def.penaltyPerWrong) ||
      cfg.passingPercentage !== def.passingPercentage
    );
  };

  const handleUpdateDraft = (
    syllabusCode: string,
    setNum: number,
    partial: Partial<AdminMockSetConfig>
  ) => {
    const key = `${syllabusCode}_set_${setNum}`;
    const current = getConfigForSet(syllabusCode, setNum);
    const updated: AdminMockSetConfig = {
      ...current,
      ...partial,
      durationMinutes:
        typeof partial.durationMinutes === 'number'
          ? Math.max(5, Math.min(300, Math.round(partial.durationMinutes)))
          : current.durationMinutes,
      penaltyPerWrong:
        typeof partial.penaltyPerWrong === 'number'
          ? Math.max(0, Number(partial.penaltyPerWrong.toFixed(2)))
          : current.penaltyPerWrong,
      passingPercentage:
        typeof partial.passingPercentage === 'number'
          ? Math.max(1, Math.min(100, Math.round(partial.passingPercentage)))
          : current.passingPercentage,
    };
    setLocalDrafts((prev) => ({ ...prev, [key]: updated }));
  };

  const handleSaveSet = async (syllabusCode: string, setNum: number) => {
    const key = `${syllabusCode}_set_${setNum}`;
    const cfg = getConfigForSet(syllabusCode, setNum);
    setSaveStatus((prev) => ({ ...prev, [key]: 'saving' }));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = authToken || localStorage.getItem('prayogshala_auth_token') || localStorage.getItem('prayogshala_auth_token_v1');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/mock-sets/configs', {
        method: 'PUT',
        headers,
        body: JSON.stringify(cfg),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data.config) {
        setServerConfigs((prev) => ({ ...prev, [key]: data.config }));
        setSaveStatus((prev) => ({ ...prev, [key]: 'saved' }));
        setTimeout(() => {
          setSaveStatus((prev) => ({ ...prev, [key]: null }));
        }, 2500);
      } else {
        setSaveStatus((prev) => ({ ...prev, [key]: 'error' }));
        setGlobalMessage({ text: data?.error || 'Failed to save set configuration', type: 'error' });
      }
    } catch {
      setSaveStatus((prev) => ({ ...prev, [key]: 'error' }));
      setGlobalMessage({ text: 'Network error saving set configuration', type: 'error' });
    }
  };

  const handleResetSet = async (syllabusCode: string, setNum: number) => {
    const key = `${syllabusCode}_set_${setNum}`;
    try {
      const headers: Record<string, string> = {};
      const token = authToken || localStorage.getItem('prayogshala_auth_token') || localStorage.getItem('prayogshala_auth_token_v1');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/mock-sets/configs/${syllabusCode}/${setNum}`, {
        method: 'DELETE',
        headers,
      });

      setServerConfigs((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setLocalDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      setGlobalMessage({ text: `Set ${setNum} reverted to official blueprint defaults`, type: 'info' });
      setTimeout(() => setGlobalMessage(null), 3000);
    } catch {
      setGlobalMessage({ text: 'Failed to reset set on server', type: 'error' });
    }
  };

  const handleApplyToAllSets = async (sourceSetNum: number) => {
    const sourceCfg = getConfigForSet(selectedSyllabusCode, sourceSetNum);
    const updates: Promise<any>[] = [];
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = authToken || localStorage.getItem('prayogshala_auth_token') || localStorage.getItem('prayogshala_auth_token_v1');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    for (let setNum = 1; setNum <= activeSyllabus.totalSets; setNum++) {
      const payload: AdminMockSetConfig = {
        ...sourceCfg,
        syllabusCode: selectedSyllabusCode,
        setNumber: setNum,
      };
      updates.push(
        fetch('/api/mock-sets/configs', {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        }).then((res) => res.json().catch(() => null))
      );
    }

    try {
      const results = await Promise.all(updates);
      const newConfigs = { ...serverConfigs };
      for (const res of results) {
        if (res?.success && res?.config) {
          const key = `${res.config.syllabusCode}_set_${res.config.setNumber}`;
          newConfigs[key] = res.config;
        }
      }
      setServerConfigs(newConfigs);
      setLocalDrafts({});
      setGlobalMessage({
        text: `Applied Set ${sourceSetNum}'s time and negative marking parameters to all ${activeSyllabus.totalSets} sets of ${activeSyllabus.title}`,
        type: 'success',
      });
      setTimeout(() => setGlobalMessage(null), 4000);
    } catch {
      setGlobalMessage({ text: 'Error applying parameters to all sets', type: 'error' });
    }
  };

  // Published question counts for readiness check
  const publishedQuestions = questions.filter((q) => q.status === 'Published');
  const availableCount = publishedQuestions.filter((q) =>
    activeSyllabus.code === 'All'
      ? true
      : questionMatchesExamCategory(q.examCategories, activeSyllabus.code as ExamCategory)
  ).length;

  const ceeUgAvailability = computeCeeUgAvailability(publishedQuestions, () => true);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-800">
                <Award className="w-4 h-4 text-cyan-700" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Mock Examination Set Settings
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              Configure sitting duration (minutes) and negative marking rules for each model paper set across all examination syllabi. Changes saved here govern all student mock examination sessions.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Server-Enforced Grading &amp; Timing</span>
          </div>
        </div>

        {globalMessage && (
          <div
            role="alert"
            className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-all ${
              globalMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : globalMessage.type === 'error'
                ? 'bg-rose-50 text-rose-900 border border-rose-200'
                : 'bg-cyan-50 text-cyan-900 border border-cyan-200'
            }`}
          >
            <span>{globalMessage.text}</span>
            <button
              onClick={() => setGlobalMessage(null)}
              className="text-slate-400 hover:text-slate-700 font-bold px-1.5"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Syllabus Selector Tabs */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-700" />
          <span>Select Examination Board / Syllabus</span>
        </label>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {EXAM_SYLLABI.map((spec) => {
            const isSelected = spec.code === selectedSyllabusCode;
            return (
              <button
                key={spec.code}
                onClick={() => setSelectedSyllabusCode(spec.code)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-cyan-700 text-white border-cyan-700 shadow-2xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>{spec.title}</span>
                <span className={`ml-2 text-[10px] px-1.5 py-0.2 rounded ${
                  isSelected ? 'bg-cyan-800 text-cyan-100' : 'bg-slate-100 text-slate-600'
                }`}>
                  {spec.totalSets} Sets
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Syllabus Blueprint Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
              {activeSyllabus.code}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              {activeSyllabus.title} ({activeSyllabus.fullName})
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-snug">
            {activeSyllabus.description}
          </p>
        </div>

        {/* Blueprint Specs Pill Grid */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
            <span className="text-slate-400 block text-[10px] font-medium">Blueprint Time</span>
            <span className="font-bold text-slate-900">{activeSyllabus.durationMinutes} min</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
            <span className="text-slate-400 block text-[10px] font-medium">Standard Penalty</span>
            <span className="font-bold text-rose-700">
              {activeSyllabus.penaltyPerWrong > 0 ? `−${activeSyllabus.penaltyPerWrong}` : 'None'}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
            <span className="text-slate-400 block text-[10px] font-medium">Standard Pass</span>
            <span className="font-bold text-emerald-700">{activeSyllabus.passingPercentage}%</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-900">
            <span className="text-cyan-600 block text-[10px] font-medium">Question Bank</span>
            <span className="font-bold text-cyan-950">
              {activeSyllabus.code === 'CEE-UG' ? ceeUgAvailability.totalAvailable : availableCount} Published
            </span>
          </div>
        </div>
      </div>

      {/* Model Paper Sets Configuration Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-700" />
              <span>Model Paper Sets for {activeSyllabus.title}</span>
            </h3>
            <p className="text-xs text-slate-500">
              Edit the time and negative marking for individual sets. Changes will apply immediately to students.
            </p>
          </div>

          <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded">
            {activeSyllabus.totalSets} Standardized Sets
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: activeSyllabus.totalSets }, (_, idx) => idx + 1).map((setNum) => {
            const key = `${activeSyllabus.code}_set_${setNum}`;
            const cfg = getConfigForSet(activeSyllabus.code, setNum);
            const isCustom = isSetCustomized(activeSyllabus.code, setNum);
            const status = saveStatus[key];

            return (
              <div
                key={setNum}
                className={`bg-white rounded-xl p-5 border flex flex-col justify-between space-y-4 transition-all shadow-2xs hover:shadow-xs ${
                  isCustom ? 'border-cyan-300 ring-1 ring-cyan-200' : 'border-slate-200'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-900 bg-cyan-100/70 border border-cyan-200 rounded-md px-2.5 py-0.5">
                        Set {setNum}
                      </span>
                      {isCustom ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5">
                          Admin Customized
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-md px-1.5 py-0.5">
                          Official Default
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyToAllSets(setNum)}
                      className="text-[10px] font-medium text-slate-500 hover:text-cyan-800 flex items-center gap-1 cursor-pointer transition-colors"
                      title={`Copy Set ${setNum}'s time and negative marking to all 5 sets`}
                    >
                      <Copy className="w-3 h-3" />
                      <span>Sync to All Sets</span>
                    </button>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {activeSyllabus.title} · Model Set {setNum}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {activeSyllabus.standardQuestionCount} questions paper sitting
                    </p>
                  </div>

                  {/* Section 1: Time Duration */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Duration (Minutes)</span>
                      </label>
                      <span className="text-xs font-bold text-cyan-900 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                        {cfg.durationMinutes} min
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      {[15, 30, 45, 50, 60, 90, 120, 180].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() =>
                            handleUpdateDraft(activeSyllabus.code, setNum, { durationMinutes: mins })
                          }
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded border cursor-pointer transition-colors ${
                            cfg.durationMinutes === mins
                              ? 'bg-cyan-700 text-white border-cyan-700 shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="range"
                        min={5}
                        max={300}
                        step={5}
                        value={cfg.durationMinutes}
                        onChange={(e) =>
                          handleUpdateDraft(activeSyllabus.code, setNum, {
                            durationMinutes: parseInt(e.target.value, 10) || 50,
                          })
                        }
                        className="w-full accent-cyan-700 h-1.5 bg-slate-200 rounded cursor-pointer"
                        aria-label={`Time duration slider for Set ${setNum}`}
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min={5}
                          max={300}
                          value={cfg.durationMinutes}
                          onChange={(e) =>
                            handleUpdateDraft(activeSyllabus.code, setNum, {
                              durationMinutes: parseInt(e.target.value, 10) || 5,
                            })
                          }
                          className="w-14 text-center py-0.5 px-1 text-xs border border-slate-300 rounded font-semibold text-slate-800"
                          aria-label={`Time duration in minutes for Set ${setNum}`}
                        />
                        <span className="text-[11px] text-slate-500">m</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Negative Marking */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-slate-500" />
                        <span>Negative Marking</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateDraft(activeSyllabus.code, setNum, {
                            negativeMarking: !cfg.negativeMarking,
                          })
                        }
                        className={`px-2.5 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                          cfg.negativeMarking
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {cfg.negativeMarking ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {cfg.negativeMarking && (
                      <div className="space-y-1.5 pl-2 border-l-2 border-rose-200">
                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <span>Penalty per wrong answer</span>
                          <span className="font-bold text-rose-700">−{cfg.penaltyPerWrong} mark</span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {[0.2, 0.25, 0.33, 0.5, 1.0].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() =>
                                handleUpdateDraft(activeSyllabus.code, setNum, { penaltyPerWrong: p })
                              }
                              className={`px-2 py-0.5 text-[11px] font-semibold rounded border cursor-pointer transition-colors ${
                                cfg.penaltyPerWrong === p
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              −{p}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[11px] text-slate-500">Custom penalty:</span>
                          <input
                            type="number"
                            min={0}
                            max={5}
                            step={0.05}
                            value={cfg.penaltyPerWrong}
                            onChange={(e) =>
                              handleUpdateDraft(activeSyllabus.code, setNum, {
                                penaltyPerWrong: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 text-center py-0.5 px-1 text-xs border border-slate-300 rounded font-semibold text-slate-800"
                            aria-label={`Custom penalty per wrong answer for Set ${setNum}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Passing Standard */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-600">Passing Standard</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={cfg.passingPercentage}
                          onChange={(e) =>
                            handleUpdateDraft(activeSyllabus.code, setNum, {
                              passingPercentage: parseInt(e.target.value, 10) || 70,
                            })
                          }
                          className="w-14 text-center py-0.5 px-1 text-xs border border-slate-300 rounded font-semibold text-slate-800"
                          aria-label={`Passing percentage for Set ${setNum}`}
                        />
                        <span className="text-xs text-slate-500">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  {isCustom ? (
                    <button
                      type="button"
                      onClick={() => handleResetSet(activeSyllabus.code, setNum)}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-rose-600 rounded border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Reset this set back to official blueprint defaults"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      <span>Blueprint</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSaveSet(activeSyllabus.code, setNum)}
                    disabled={status === 'saving'}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      status === 'saved'
                        ? 'bg-emerald-600 text-white'
                        : status === 'error'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {status === 'saving' ? (
                      <span>Saving...</span>
                    ) : status === 'saved' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Save Set {setNum}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
