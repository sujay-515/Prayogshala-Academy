import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Bookmark,
  Flag,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Loader2,
  Crown,
  Search,
  X,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { MCQQuestion, SubjectCategory, SubjectUnit } from '../../types';
import { INITIAL_CATEGORIES } from '../../data/categories';
import { getSafeImageUrl } from '../../utils/urlSecurity';
import { SITE_CONFIG } from '../../config/site';
import { checkQuestionAnswer, CheckAnswerSuccess } from '../../utils/answerCheck';
import { isVisibleQuestion } from '../../utils/questionVisibility';
import { SubjectIcon, getSubjectColorClasses } from '../SubjectIcon';

interface PracticeModeProps {
  questions: MCQQuestion[];
  bookmarkedIds: string[];
  onToggleBookmark: (id: string) => void;
  onReportQuestion: (question: MCQQuestion) => void;
  onRecordAnswer: (question: MCQQuestion, selected: string, isCorrect: boolean) => void;
  categories?: SubjectCategory[];
  customSubset?: MCQQuestion[] | null;
  onClearCustomSubset?: () => void;
  initialUnit?: string;
  initialSubject?: string;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({
  questions,
  bookmarkedIds,
  onToggleBookmark,
  onReportQuestion,
  onRecordAnswer,
  categories,
  customSubset,
  onClearCustomSubset,
  initialUnit,
  initialSubject,
  searchQuery,
  setSearchQuery,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeCategories = useMemo(() => {
    return categories && categories.length > 0 ? categories : INITIAL_CATEGORIES;
  }, [categories]);

  // Read initial values from props or URL query params
  const paramSubject = searchParams.get('subject') || initialSubject || initialUnit || null;
  const paramUnit = searchParams.get('unit') || null;

  // Selected subject: null means user is on the Subjects Directory page
  const [selectedSubject, setSelectedSubject] = useState<string | null>(() => {
    if (paramSubject && paramSubject !== 'All') {
      const match = activeCategories.find(
        (c) => c.name.toLowerCase() === paramSubject.toLowerCase()
      );
      return match ? match.name : paramSubject;
    }
    return null;
  });

  const [selectedUnit, setSelectedUnit] = useState<string | null>(paramUnit);
  const [localSearch, setLocalSearch] = useState<string>(searchQuery || '');

  // Active Session State
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [sessionQuestions, setSessionQuestions] = useState<MCQQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealedStatus, setRevealedStatus] = useState<Record<string, boolean>>({});
  const [checkResults, setCheckResults] = useState<Record<string, CheckAnswerSuccess>>({});
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkError, setCheckError] = useState<{
    optionId: string;
    message: string;
    isRateLimit: boolean;
    isPaywall?: boolean;
    quota?: { unit: string; used: number; limit: number };
  } | null>(null);
  const [ariaAnnouncement, setAriaAnnouncement] = useState<string>('');

  useEffect(() => {
    if (searchQuery !== undefined) {
      setLocalSearch(searchQuery);
    }
  }, [searchQuery]);

  const handleSearchChange = (val: string) => {
    setLocalSearch(val);
    if (setSearchQuery) {
      setSearchQuery(val);
    }
  };

  // Sync external navigation / props changes
  useEffect(() => {
    const s = searchParams.get('subject') || initialSubject || initialUnit;
    if (s && s !== 'All') {
      const match = activeCategories.find((c) => c.name.toLowerCase() === s.toLowerCase());
      setSelectedSubject(match ? match.name : s);
    }
  }, [searchParams, initialSubject, initialUnit, activeCategories]);

  // Automatically start custom subset session when passed from Dashboard or Mistakes
  useEffect(() => {
    if (customSubset && customSubset.length > 0) {
      setSessionQuestions(customSubset);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setRevealedStatus({});
      setCheckResults({});
      setCheckError(null);
      setIsChecking(false);
      setAriaAnnouncement('');
      setIsSessionActive(true);
    }
  }, [customSubset]);

  const currentCategoryObj = useMemo(() => {
    if (!selectedSubject) return null;
    return activeCategories.find((c) => c.name === selectedSubject) || null;
  }, [activeCategories, selectedSubject]);

  const unitsInCurrentSubject: SubjectUnit[] = useMemo(() => {
    if (!currentCategoryObj) return [];
    return currentCategoryObj.units || currentCategoryObj.subjects || [];
  }, [currentCategoryObj]);

  const getSubjectQuestionCount = (subjectName: string) => {
    return questions.filter(
      (q) => isVisibleQuestion(q) && (q.subject === subjectName || q.unit === subjectName)
    ).length;
  };

  const getUnitQuestionCount = (subjectName: string, unitName: string) => {
    return questions.filter(
      (q) =>
        isVisibleQuestion(q) &&
        (q.subject === subjectName || q.unit === subjectName) &&
        (q.unit === unitName || q.subject === unitName)
    ).length;
  };

  const totalQuestionCount = questions.filter(isVisibleQuestion).length;

  const handleSelectSubject = (subjectName: string) => {
    setSelectedSubject(subjectName);
    setSelectedUnit(null);
    setSearchParams({ subject: subjectName });
  };

  const handleBackToSubjects = () => {
    setIsSessionActive(false);
    setSelectedSubject(null);
    setSelectedUnit(null);
    setSearchParams({});
  };

  const handleBackToUnits = () => {
    setIsSessionActive(false);
    onClearCustomSubset?.();
  };

  // Launch questions for a chosen unit (or for the whole subject if unitName is omitted)
  const handleStartPractice = (unitName?: string | null) => {
    onClearCustomSubset?.();
    const targetUnit = unitName !== undefined ? unitName : selectedUnit;
    setSelectedUnit(targetUnit);

    let pool = questions.filter((q) => {
      if (!isVisibleQuestion(q)) return false;
      if (selectedSubject && q.subject !== selectedSubject && q.unit !== selectedSubject) return false;
      if (targetUnit && q.unit !== targetUnit && q.subject !== targetUnit) return false;
      if (localSearch.trim()) {
        const query = localSearch.trim().toLowerCase();
        const match =
          q.questionText.toLowerCase().includes(query) ||
          q.code.toLowerCase().includes(query) ||
          q.topic.toLowerCase().includes(query) ||
          (q.clinicalCase && q.clinicalCase.toLowerCase().includes(query)) ||
          q.options.some((o) => o.text.toLowerCase().includes(query));
        if (!match) return false;
      }
      return true;
    });

    setSessionQuestions(pool);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setRevealedStatus({});
    setCheckResults({});
    setCheckError(null);
    setIsChecking(false);
    setAriaAnnouncement('');
    setIsSessionActive(true);
  };

  const currentQ = sessionQuestions[currentIndex];
  const isRevealed = currentQ ? !!revealedStatus[currentQ.id] : false;
  const isBookmarked = currentQ ? bookmarkedIds.includes(currentQ.id) : false;

  const handleSelectOption = async (optId: string) => {
    if (!currentQ || isRevealed || isChecking) return;
    setCheckError(null);
    setIsChecking(true);
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));
    setAriaAnnouncement(`Checking option ${optId}...`);

    const result = await checkQuestionAnswer(currentQ.id, optId);
    setIsChecking(false);

    if (result.ok) {
      const data = result.data;
      setRevealedStatus((prev) => ({ ...prev, [currentQ.id]: true }));
      setCheckResults((prev) => ({ ...prev, [currentQ.id]: data }));
      setAriaAnnouncement(
        data.correct
          ? `Correct. Option ${optId} is the correct answer.`
          : `Incorrect. Option ${optId} is incorrect. The correct answer is Option ${data.correctAnswer}.`
      );
      onRecordAnswer(currentQ, optId, data.correct);
    } else {
      setCheckError({
        optionId: optId,
        message: result.error,
        isRateLimit: result.isRateLimit,
        isPaywall: result.isPaywall,
        quota: result.quota,
      });
      setAriaAnnouncement(`Error: ${result.error}`);
    }
  };

  const handleNext = () => {
    if (currentIndex < sessionQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setCheckError(null);
      setAriaAnnouncement('');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setCheckError(null);
      setAriaAnnouncement('');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isSessionActive || !currentQ) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        return;
      }
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (currentQ.options[idx] && !isRevealed && !isChecking) {
          handleSelectOption(currentQ.options[idx].id);
        }
      }
      if (['a', 'b', 'c', 'd', 'e'].includes(e.key.toLowerCase())) {
        const id = e.key.toUpperCase();
        if (currentQ.options.some((o) => o.id === id) && !isRevealed && !isChecking) {
          handleSelectOption(id);
        }
      }
      if ((e.key === 'ArrowRight' || e.key === 'Enter') && isRevealed) {
        handleNext();
      }
      if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSessionActive, currentQ, isRevealed, isChecking, currentIndex, sessionQuestions.length]);

  const sessionStats = useMemo(() => {
    let correct = 0;
    let answered = 0;
    sessionQuestions.forEach((q) => {
      const res = checkResults[q.id];
      if (res) {
        answered++;
        if (res.correct) correct++;
      }
    });
    return {
      answered,
      correct,
      pct: answered > 0 ? Math.round((correct / answered) * 100) : 0,
    };
  }, [sessionQuestions, revealedStatus, checkResults]);

  // =========================================================================
  // VIEW 1: All Subjects Directory (when no subject is selected)
  // =========================================================================
  if (!selectedSubject && !isSessionActive) {
    return (
      <div className="max-w-6xl mx-auto py-6 space-y-6">
        <title>Laboratory Subjects Practice | Prayogshala Academy</title>
        <meta
          name="description"
          content="Select any laboratory medicine subject to view curriculum units and practice high-yield exam questions."
        />
        <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/practice`} />

        {/* Hero Header */}
        <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Laboratory Medicine Practice
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">
                Choose a subject to explore its curriculum units and start interactive practice drills.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                {activeCategories.length} Subjects · {totalQuestionCount} MCQs
              </span>
            </div>
          </div>

          {/* Real-time Search Box */}
          <div className="pt-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search questions across all subjects by analyte, test, bacteria, or clinical condition..."
                className="w-full bg-white/90 border border-slate-200/90 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 shadow-2xs transition-all"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Subjects Grid (15 Standard Subjects) */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between border-b border-slate-200/70 pb-2">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Laboratory Subjects ({activeCategories.length})
            </h2>
            <span className="text-xs text-slate-500">
              Click any subject to open its units
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeCategories.map((cat) => {
              const qCount = getSubjectQuestionCount(cat.name);
              const unitsList = cat.units || cat.subjects || [];
              const colorClasses = getSubjectColorClasses(cat.name);

              return (
                <div
                  key={cat.id}
                  onClick={() => handleSelectSubject(cat.name)}
                  className="glass-panel glass-panel-hover rounded-xl p-5 cursor-pointer flex flex-col justify-between group space-y-4 transition-all hover:border-slate-300"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClasses.iconBg} ${colorClasses.iconColor} group-hover:scale-105 transition-transform`}
                      >
                        <SubjectIcon name={cat.name} icon={cat.icon} className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-xs text-slate-700 bg-slate-100/90 px-2.5 py-0.5 rounded-md border border-slate-200/60">
                        {qCount} MCQs
                      </span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm group-hover:text-cyan-800 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {unitsList.length} {unitsList.length === 1 ? 'unit' : 'units'}
                      </p>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 group-hover:text-slate-900 font-medium">
                    <span>Explore units</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: Subject Page - List of Units (when a subject is selected)
  // =========================================================================
  if (selectedSubject && !isSessionActive) {
    const colorClasses = getSubjectColorClasses(selectedSubject);
    const subjectQCount = getSubjectQuestionCount(selectedSubject);

    return (
      <div className="max-w-5xl mx-auto py-6 space-y-6">
        <title>{selectedSubject} | Units & Practice | Prayogshala Academy</title>
        <meta
          name="description"
          content={`Practice MCQs and review clinical units for ${selectedSubject}.`}
        />
        <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/practice?subject=${encodeURIComponent(selectedSubject)}`} />

        {/* Back Link */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackToSubjects}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Subjects</span>
          </button>
        </div>

        {/* Subject Hero Header */}
        <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClasses.iconBg} ${colorClasses.iconColor} shadow-2xs`}
              >
                <SubjectIcon name={selectedSubject} icon={currentCategoryObj?.icon} className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Subject Overview
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {selectedSubject}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                  {currentCategoryObj?.description || 'Curriculum units, clinical cases, and examination questions.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:self-center">
              <button
                type="button"
                onClick={() => handleStartPractice(null)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Practice All Units ({subjectQCount} MCQs)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Units List */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between border-b border-slate-200/70 pb-2">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Units in {selectedSubject} ({unitsInCurrentSubject.length})
            </h2>
            <span className="text-xs text-slate-500">
              Click any unit to load questions and start practice
            </span>
          </div>

          <div className="space-y-3">
            {unitsInCurrentSubject.map((unit, index) => {
              const unitQCount = getUnitQuestionCount(selectedSubject, unit.name);

              return (
                <div
                  key={unit.id}
                  onClick={() => handleStartPractice(unit.name)}
                  className="glass-panel glass-panel-hover rounded-xl p-5 cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-cyan-400"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Unit {index + 1}
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-cyan-800 transition-colors">
                        {unit.name}
                      </h3>
                    </div>

                    {/* Topics Pill Tags */}
                    {unit.topics && unit.topics.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {unit.topics.map((topic, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/70"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 sm:self-center">
                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/70">
                      {unitQCount} MCQs
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartPractice(unit.name);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-700 group-hover:bg-cyan-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>Practice Unit</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}

            {unitsInCurrentSubject.length === 0 && (
              <div className="glass-panel rounded-xl p-8 text-center text-slate-500 text-xs">
                No units configured for this subject yet.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: Active Question Practice Screen (Questions load on clicking unit)
  // =========================================================================
  if (!currentQ) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="glass-panel rounded-2xl p-8 space-y-3">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900">
            No questions available for this unit
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {selectedUnit
              ? `There are currently no active questions published under ${selectedSubject} > ${selectedUnit}.`
              : `There are currently no active questions published under ${selectedSubject}.`}
          </p>
          <div className="pt-2">
            <button
              onClick={handleBackToUnits}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg cursor-pointer"
            >
              ← Back to Units List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-5">
      <title>{currentQ.subject} Practice | Prayogshala Academy</title>
      <meta
        name="description"
        content="Interactive practice question with immediate clinical rationale and references."
      />
      <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/practice`} />

      {/* Session Header */}
      <div className="glass-panel rounded-xl p-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToUnits}
            className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Back to Units list"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900">
              Question {currentIndex + 1} of {sessionQuestions.length}
            </span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span className="inline-flex items-center gap-1 font-medium text-slate-800">
              <SubjectIcon name={currentQ.subject} className="w-3.5 h-3.5 text-slate-500" />
              {currentQ.subject}
            </span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span className="font-medium text-slate-700">{currentQ.unit}</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span className="text-slate-500">{currentQ.difficulty}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-600">
            Accuracy: <strong className="text-slate-900">{sessionStats.pct}%</strong> ({sessionStats.correct}/{sessionStats.answered})
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleBookmark(currentQ.id)}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                isBookmarked ? 'text-amber-700 bg-amber-50' : 'text-slate-500 hover:text-slate-700'
              }`}
              title={isBookmarked ? 'Bookmarked' : 'Bookmark question'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-600' : ''}`} />
            </button>
            <button
              onClick={() => onReportQuestion(currentQ)}
              className="p-1.5 rounded text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              title="Report question error"
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Screen Reader Live Region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {ariaAnnouncement}
      </div>

      {/* Question Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-6">
        <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
          <span className="font-semibold text-slate-900">{currentQ.code}</span>
          <span>Topic: {currentQ.topic}</span>
        </div>

        {/* Clinical Vignette */}
        {currentQ.clinicalCase && (
          <div className="p-3.5 bg-cyan-50/50 border-l-3 border-cyan-600 rounded-r-lg text-xs leading-relaxed text-slate-800">
            <span className="font-semibold text-cyan-900 block mb-0.5">Clinical Case Vignette:</span>
            {currentQ.clinicalCase}
          </div>
        )}

        {/* Question Stem */}
        <h2 className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
          {currentQ.questionText}
        </h2>

        {/* Question Image */}
        {currentQ.imageUrl && getSafeImageUrl(currentQ.imageUrl) && (
          <div className="rounded-xl overflow-hidden border border-slate-200/80 bg-slate-50 max-h-72 flex items-center justify-center">
            <img
              src={getSafeImageUrl(currentQ.imageUrl) || ''}
              alt="Clinical laboratory specimen, smear, or chart"
              className="max-h-72 object-contain"
            />
          </div>
        )}

        {/* Options */}
        <div className="space-y-2.5 pt-2" role="radiogroup" aria-label="Question options">
          {currentQ.options.map((opt) => {
            const isSelected = selectedAnswers[currentQ.id] === opt.id;
            const res = checkResults[currentQ.id];
            const isCorrectAnswer = res && res.correctAnswer === opt.id;
            const isWrongSelection = isRevealed && isSelected && !isCorrectAnswer;

            let btnStyle = 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 text-slate-900 bg-white/70';
            if (isRevealed) {
              if (isCorrectAnswer) {
                btnStyle = 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium ring-1 ring-emerald-500';
              } else if (isWrongSelection) {
                btnStyle = 'border-rose-400 bg-rose-50/70 text-rose-950 ring-1 ring-rose-400';
              } else {
                btnStyle = 'border-slate-200 text-slate-400 opacity-60 bg-white/40';
              }
            } else if (isSelected) {
              btnStyle = 'border-cyan-600 bg-cyan-50 text-cyan-950 font-medium ring-1 ring-cyan-600';
            }

            return (
              <button
                key={opt.id}
                role="radio"
                aria-checked={isSelected}
                disabled={isRevealed || isChecking}
                onClick={() => handleSelectOption(opt.id)}
                className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm flex items-start justify-between gap-3 transition-all cursor-pointer disabled:cursor-default ${btnStyle}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-xs font-semibold shrink-0 mt-0.5 ${
                      isRevealed && isCorrectAnswer
                        ? 'bg-emerald-600 text-white'
                        : isRevealed && isWrongSelection
                        ? 'bg-rose-600 text-white'
                        : isSelected
                        ? 'bg-cyan-700 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {opt.id}
                  </span>
                  <span className="leading-relaxed">{opt.text}</span>
                </div>

                <div className="shrink-0 mt-0.5">
                  {isChecking && isSelected && (
                    <Loader2 className="w-4 h-4 text-cyan-700 animate-spin" />
                  )}
                  {isRevealed && isCorrectAnswer && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  {isRevealed && isWrongSelection && (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Check Error / Rate Limit Warning */}
        {checkError && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
              checkError.isPaywall
                ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                : checkError.isRateLimit
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">
                {checkError.isPaywall ? 'Free Tier Limit Reached' : 'Unable to verify answer'}
              </span>
              <p className="mt-0.5 leading-relaxed">{checkError.message}</p>
              {checkError.isPaywall && (
                <div className="mt-2.5 flex items-center gap-2">
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md shadow-2xs"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Upgrade to Full Access</span>
                  </Link>
                  <span className="text-[11px] text-amber-800">Unlimited questions across all subjects</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rationale & Explanation (Revealed after check) */}
        {isRevealed && checkResults[currentQ.id] && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div
              className={`p-4 rounded-xl border space-y-2 ${
                checkResults[currentQ.id].correct
                  ? 'bg-emerald-50/40 border-emerald-200/80 text-emerald-950'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {checkResults[currentQ.id].correct ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-slate-600" />
                )}
                <span className="font-semibold text-xs uppercase tracking-wider">
                  {checkResults[currentQ.id].correct ? 'Correct Diagnostic Rationale' : 'Clinical Explanation'}
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-800">
                {checkResults[currentQ.id].explanation}
              </p>
            </div>

            {/* Reference Citation */}
            {checkResults[currentQ.id].reference && (
              <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-700">Reference: </span>
                {checkResults[currentQ.id].reference}
              </div>
            )}
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            disabled={currentIndex === 0}
            onClick={handlePrev}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <span className="text-xs text-slate-500">
            {currentIndex + 1} / {sessionQuestions.length}
          </span>

          {currentIndex < sessionQuestions.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          ) : (
            <button
              onClick={handleBackToUnits}
              className="px-4 py-2 text-xs font-medium text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Finish & Return to Units</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
