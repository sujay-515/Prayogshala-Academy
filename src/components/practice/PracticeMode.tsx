import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Bookmark,
  Flag,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { MCQQuestion, ExamCategory } from '../../types';
import { getSafeImageUrl } from '../../utils/urlSecurity';
import { SITE_CONFIG } from '../../config/site';

interface PracticeModeProps {
  questions: MCQQuestion[];
  bookmarkedIds: string[];
  onToggleBookmark: (id: string) => void;
  onReportQuestion: (question: MCQQuestion) => void;
  onRecordAnswer: (question: MCQQuestion, selected: string, isCorrect: boolean) => void;
  customSubset?: MCQQuestion[] | null;
  onClearCustomSubset?: () => void;
  initialUnit?: string;
  initialExam?: ExamCategory;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({
  questions,
  bookmarkedIds,
  onToggleBookmark,
  onReportQuestion,
  onRecordAnswer,
  customSubset,
  onClearCustomSubset,
  initialUnit,
  initialExam,
}) => {
  // Filters & Setup
  const [selectedUnit, setSelectedUnit] = useState<string>(initialUnit || 'All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedExam, setSelectedExam] = useState<string>(initialExam || 'All');
  const [questionCountLimit, setQuestionCountLimit] = useState<number>(10);
  const [isRandomized, setIsRandomized] = useState<boolean>(true);

  // Active Session State
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [sessionQuestions, setSessionQuestions] = useState<MCQQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealedStatus, setRevealedStatus] = useState<Record<string, boolean>>({});

  // Automatically start custom subset session when passed from Dashboard or Browse
  useEffect(() => {
    if (customSubset && customSubset.length > 0) {
      setSessionQuestions(customSubset);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setRevealedStatus({});
      setIsSessionActive(true);
    }
  }, [customSubset]);

  useEffect(() => {
    if (initialUnit) setSelectedUnit(initialUnit);
    if (initialExam) setSelectedExam(initialExam);
  }, [initialUnit, initialExam]);

  const units = useMemo(() => {
    const set = new Set(questions.filter((q) => q.status === 'Published').map((q) => q.unit));
    return ['All', ...Array.from(set)];
  }, [questions]);

  const subjects = useMemo(() => {
    const set = new Set(
      questions
        .filter((q) => q.status === 'Published' && (selectedUnit === 'All' || q.unit === selectedUnit))
        .map((q) => q.subject)
    );
    return ['All', ...Array.from(set)];
  }, [questions, selectedUnit]);

  const exams: ('All' | ExamCategory)[] = ['All', 'ASCP', 'NHPC', 'PSC', 'DHA', 'AIMS'];
  const difficulties = ['All', 'Memory-based', 'Conceptual', 'Advanced'];

  const filteredPool = useMemo(() => {
    return questions.filter((q) => {
      if (q.status !== 'Published') return false;
      if (selectedUnit !== 'All' && q.unit !== selectedUnit) return false;
      if (selectedSubject !== 'All' && q.subject !== selectedSubject) return false;
      if (selectedDifficulty !== 'All' && q.difficulty !== selectedDifficulty) return false;
      if (selectedExam !== 'All' && !q.examCategories.includes(selectedExam as ExamCategory)) return false;
      return true;
    });
  }, [questions, selectedUnit, selectedSubject, selectedDifficulty, selectedExam]);

  const startSession = () => {
    onClearCustomSubset?.();
    let pool = [...filteredPool];
    if (isRandomized) {
      pool.sort(() => Math.random() - 0.5);
    }
    const finalSet = pool.slice(0, questionCountLimit);
    setSessionQuestions(finalSet);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setRevealedStatus({});
    setIsSessionActive(true);
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
    onClearCustomSubset?.();
  };

  const currentQ = sessionQuestions[currentIndex];
  const isRevealed = currentQ ? !!revealedStatus[currentQ.id] : false;
  const isBookmarked = currentQ ? bookmarkedIds.includes(currentQ.id) : false;

  const handleSelectOption = (optId: string) => {
    if (!currentQ || isRevealed) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));
  };

  const handleCheckAnswer = () => {
    if (!currentQ || !selectedAnswers[currentQ.id]) return;
    setRevealedStatus((prev) => ({ ...prev, [currentQ.id]: true }));
    const chosen = selectedAnswers[currentQ.id];
    const isCorrect = chosen === currentQ.correctAnswer;
    onRecordAnswer(currentQ, chosen, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex < sessionQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const sessionStats = useMemo(() => {
    let answered = 0;
    let correct = 0;
    for (const q of sessionQuestions) {
      if (revealedStatus[q.id]) {
        answered++;
        if (selectedAnswers[q.id] === q.correctAnswer) {
          correct++;
        }
      }
    }
    const pct = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    return { answered, correct, pct };
  }, [sessionQuestions, revealedStatus, selectedAnswers]);

  if (!isSessionActive || !currentQ) {
    return (
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <title>Practice Mode | MedLab QBank</title>
        <meta
          name="description"
          content="Interactive practice mode with instant clinical rationales, difficulty filters, and question bookmarking for medical lab exams."
        />
        <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/practice`} />
        <meta property="og:title" content="Practice Mode | MedLab QBank" />
        <meta
          property="og:description"
          content="Interactive practice mode with instant clinical rationales, difficulty filters, and question bookmarking for medical lab exams."
        />
        <meta property="og:url" content={`${SITE_CONFIG.SITE_URL}/practice`} />

        <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-2">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
            Configure practice session
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Select a laboratory unit, subject, or examination syllabus. Questions are presented one by one with immediate diagnostic rationales and reference citations.
          </p>
        </div>

        {/* Configuration Form */}
        <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Laboratory Medicine Unit
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => {
                  setSelectedUnit(e.target.value);
                  setSelectedSubject('All');
                }}
                className="w-full bg-white/70 border border-slate-200/90 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs transition-all"
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u === 'All' ? 'All Specialty Units (Mixed)' : u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Subject Filter
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-white/70 border border-slate-200/90 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs transition-all"
              >
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s === 'All' ? 'All Subjects (Mixed)' : s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Licensing Syllabus
              </label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="w-full bg-white/70 border border-slate-200/90 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs transition-all"
              >
                {exams.map((e) => (
                  <option key={e} value={e}>
                    {e === 'All' ? 'All Examination Boards' : `${e} Examination`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cognitive Difficulty
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full bg-white/70 border border-slate-200/90 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs transition-all"
              >
                {difficulties.map((d) => (
                  <option key={d} value={d}>
                    {d === 'All' ? 'All Difficulties' : d}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Question Count
              </label>
              <div className="flex items-center gap-2">
                {[5, 10, 20, 50].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setQuestionCountLimit(cnt)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                      questionCountLimit === cnt
                        ? 'bg-cyan-700 text-white border-cyan-700 font-semibold'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-cyan-50/40'
                    }`}
                  >
                    {cnt} Questions
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Randomized Order</span>
                <span className="text-xs text-slate-500">Shuffle questions for varied clinical exposure</span>
              </div>
              <input
                type="checkbox"
                checked={isRandomized}
                onChange={(e) => setIsRandomized(e.target.checked)}
                className="w-4 h-4 text-cyan-700 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Available pool: <strong className="text-slate-900">{filteredPool.length}</strong> questions
            </span>
            <button
              disabled={filteredPool.length === 0}
              onClick={startSession}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-medium text-xs sm:text-sm rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Begin Practice</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Practice Question Screen
  return (
    <div className="max-w-3xl mx-auto py-6 space-y-5">
      <title>Practice Mode | MedLab QBank</title>
      <meta
        name="description"
        content="Interactive practice mode with instant clinical rationales, difficulty filters, and question bookmarking for medical lab exams."
      />
      <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/practice`} />
      <meta property="og:title" content="Practice Mode | MedLab QBank" />
      <meta
        property="og:description"
        content="Interactive practice mode with instant clinical rationales, difficulty filters, and question bookmarking for medical lab exams."
      />
      <meta property="og:url" content={`${SITE_CONFIG.SITE_URL}/practice`} />

      {/* Session Header */}
      <div className="glass-panel rounded-xl p-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={handleEndSession}
            className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="End Session"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900">
              Question {currentIndex + 1} of {sessionQuestions.length}
            </span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span>{currentQ.unit}</span>
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
              className="p-1.5 rounded text-slate-500 hover:text-rose-700 transition-colors cursor-pointer"
              title="Report issue"
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Question Paper Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="text-xs text-slate-500 font-medium">
          {currentQ.code} · {currentQ.subject} · {currentQ.topic}
          {currentQ.subtopic ? ` · ${currentQ.subtopic}` : ''}
        </div>

        {/* Clinical Vignette if applicable */}
        {currentQ.clinicalCase && (
          <div className="glass-card border-l-4 border-l-cyan-600 p-4 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed shadow-xs">
            <span className="font-semibold text-slate-900 block mb-1">Clinical Presentation:</span>
            {currentQ.clinicalCase}
          </div>
        )}

        {/* Clinical Table if applicable */}
        {currentQ.tableData && (
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  {currentQ.tableData.headers.map((h, idx) => (
                    <th key={idx} className="px-3.5 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                {currentQ.tableData.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-1.5 font-mono">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Diagnostic Image if applicable */}
        {getSafeImageUrl(currentQ.imageUrl) && (
          <div className="bg-slate-50 p-3 rounded border border-slate-200">
            <img
              src={getSafeImageUrl(currentQ.imageUrl)!}
              alt={currentQ.code ? `Image for question ${currentQ.code}` : 'Image for question'}
              className="max-h-64 rounded object-contain mx-auto"
            />
          </div>
        )}

        {/* Question Stem */}
        <div id="practice-question-stem" className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
          {currentQ.questionText}
        </div>

        {/* Option Choices */}
        <div role="radiogroup" aria-labelledby="practice-question-stem" className="space-y-2.5">
          {currentQ.options.map((option) => {
            const isSelected = selectedAnswers[currentQ.id] === option.id;
            const isCorrectAnswer = option.id === currentQ.correctAnswer;

            let cardStyles = 'glass-card hover:bg-white hover:border-cyan-300 text-slate-800 hover:shadow-xs';

            if (isRevealed) {
              if (isCorrectAnswer) {
                cardStyles = 'bg-emerald-50/90 border-emerald-400 text-emerald-950 font-medium shadow-xs';
              } else if (isSelected && !isCorrectAnswer) {
                cardStyles = 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-xs';
              } else {
                cardStyles = 'bg-slate-50/40 border-slate-200/60 text-slate-400 opacity-60';
              }
            } else if (isSelected) {
              cardStyles = 'bg-cyan-50/80 backdrop-blur-xs border-cyan-500 text-slate-900 ring-1 ring-cyan-500 shadow-xs';
            }

            const stateText = isRevealed
              ? isCorrectAnswer
                ? ' (Correct Answer)'
                : isSelected
                ? ' (Incorrect Selection)'
                : ''
              : isSelected
              ? ' (Selected)'
              : '';

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                disabled={isRevealed}
                aria-checked={isSelected}
                aria-label={`Option ${option.id}: ${option.text}${stateText}`}
                onClick={() => handleSelectOption(option.id)}
                className={`w-full text-left p-3.5 min-h-[48px] rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${cardStyles}`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex items-center justify-center w-7 h-7 min-w-[1.75rem] rounded text-xs font-semibold shrink-0 mt-0.5 ${
                    isRevealed && isCorrectAnswer
                      ? 'bg-emerald-700 text-white'
                      : isRevealed && isSelected && !isCorrectAnswer
                      ? 'bg-rose-700 text-white'
                      : isSelected
                      ? 'bg-cyan-700 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {option.id}
                </span>
                <span className="text-xs sm:text-sm leading-relaxed flex-1">{option.text}</span>
                {stateText && <span className="sr-only">{stateText}</span>}
              </button>
            );
          })}
        </div>

        {/* Check Answer Button */}
        {!isRevealed && (
          <div className="pt-2 flex justify-end">
            <button
              disabled={!selectedAnswers[currentQ.id]}
              onClick={handleCheckAnswer}
              className="px-5 py-2.5 min-h-[44px] bg-cyan-700 hover:bg-cyan-800 disabled:opacity-40 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              Check Answer
            </button>
          </div>
        )}

        {/* Clinical Rationale & Reference Box */}
        {isRevealed && (
          <div className="p-4.5 rounded border bg-slate-50 border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              {selectedAnswers[currentQ.id] === currentQ.correctAnswer ? (
                <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Correct: Option {currentQ.correctAnswer}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-800 font-semibold text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Incorrect. The correct answer is Option {currentQ.correctAnswer}.</span>
                </div>
              )}
            </div>

            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
              <div>
                <strong className="text-slate-900 font-semibold block mb-0.5">Clinical Rationale:</strong>
                <p>{currentQ.explanation}</p>
              </div>

              {currentQ.reference && (
                <div className="pt-2.5 border-t border-slate-200 text-xs text-slate-500">
                  <span className="font-semibold text-slate-600">Reference: </span>
                  {currentQ.reference}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="glass-panel rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap shadow-xs">
        <button
          disabled={currentIndex === 0}
          onClick={handlePrev}
          className="px-4 py-2.5 min-h-[44px] rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-30 text-xs font-medium text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        {/* Question indicator for mobile devices */}
        <div className="sm:hidden text-xs font-semibold text-slate-700">
          Q {currentIndex + 1} of {sessionQuestions.length}
        </div>

        {/* Question navigator bubbles */}
        <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-center max-w-md">
          {sessionQuestions.map((q, idx) => {
            const isCurr = idx === currentIndex;
            const isAnsweredQ = revealedStatus[q.id];
            const isCorrectQ = isAnsweredQ && selectedAnswers[q.id] === q.correctAnswer;

            let dotStyles = 'bg-white border-slate-200 text-slate-600';
            if (isAnsweredQ) {
              dotStyles = isCorrectQ ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300';
            }
            if (isCurr) {
              dotStyles += ' ring-2 ring-cyan-600 font-bold';
            }

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Question ${idx + 1}, ${
                  !isAnsweredQ
                    ? 'unanswered'
                    : isCorrectQ
                    ? 'answered correctly'
                    : 'answered incorrectly'
                }${isCurr ? ', current' : ''}`}
                aria-current={isCurr ? 'step' : undefined}
                className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded border text-xs transition-all cursor-pointer flex items-center justify-center ${dotStyles}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {currentIndex < sessionQuestions.length - 1 ? (
          <button
            onClick={handleNext}
            className="px-4 py-2.5 min-h-[44px] rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Next</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        ) : (
          <button
            onClick={handleEndSession}
            className="px-4 py-2.5 min-h-[44px] rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Complete session</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
