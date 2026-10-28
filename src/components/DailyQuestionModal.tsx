import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Bookmark } from 'lucide-react';
import { MCQQuestion } from '../types';
import { getSafeImageUrl } from '../utils/urlSecurity';
import { Modal } from './common/Modal';

interface DailyQuestionModalProps {
  question?: MCQQuestion | null;
  isOpen: boolean;
  onClose: () => void;
  onBookmark: (id: string) => void;
  isBookmarked: boolean;
  onReportQuestion: (q: MCQQuestion) => void;
  onRecordAnswer?: (question: MCQQuestion, selected: string, isCorrect: boolean) => void;
}

export const DailyQuestionModal: React.FC<DailyQuestionModalProps> = ({
  question,
  isOpen,
  onClose,
  onBookmark,
  isBookmarked,
  onReportQuestion,
  onRecordAnswer,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  useEffect(() => {
    setSelectedOption(null);
    setHasSubmitted(false);
  }, [question?.id, isOpen]);

  if (!isOpen) return null;

  if (!question) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} titleId="no-daily-q-title" maxWidth="max-w-md">
        <div className="bg-white border border-slate-200 w-full rounded-md shadow-xl p-6 text-center space-y-4">
          <div className="space-y-1">
            <h3 id="no-daily-q-title" className="font-semibold text-slate-900 text-base">
              No question available today
            </h3>
            <p className="text-xs text-slate-500">
              Please check back tomorrow or practice with the question bank.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  const isCorrect = selectedOption === question.correctAnswer;

  const handleSubmit = () => {
    if (selectedOption && !hasSubmitted) {
      setHasSubmitted(true);
      onRecordAnswer?.(question, selectedOption, selectedOption === question.correctAnswer);
    }
  };

  const handleReset = () => {
    setSelectedOption(null);
    setHasSubmitted(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId="daily-question-title" maxWidth="max-w-2xl">
      <div className="glass-panel w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] border border-white/80">
        <div className="glass-nav px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200/70 flex items-center justify-between">
          <div>
            <h3 id="daily-question-title" className="font-semibold text-slate-900 text-sm sm:text-base">
              Question of the day
            </h3>
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-500 flex-wrap">
              <span className="font-medium text-cyan-900">{question.unit}</span>
              <span aria-hidden="true">·</span>
              <span>{question.topic}</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-slate-700">{question.difficulty}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
          {question.clinicalCase && (
            <div className="glass-card p-3.5 rounded-lg text-xs text-slate-700 leading-relaxed border-l-2 border-l-cyan-600">
              <span className="font-semibold text-slate-900 block mb-1">Clinical Vignette</span>
              {question.clinicalCase}
            </div>
          )}

          {question.tableData && (
            <div className="overflow-x-auto rounded-lg border border-slate-200/80 bg-white/70 backdrop-blur-xs shadow-2xs">
              <table className="min-w-full divide-y divide-slate-200/80 text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-700">
                  <tr>
                    {question.tableData.headers.map((h, idx) => (
                      <th key={idx} className="px-3.5 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/60 text-slate-800">
                  {question.tableData.rows.map((row, rIdx) => (
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

          {getSafeImageUrl(question.imageUrl) && (
            <div className="glass-card p-3 rounded-lg">
              <img
                src={getSafeImageUrl(question.imageUrl)!}
                alt={question.code ? `Image for question ${question.code}` : 'Image for question'}
                className="max-h-56 rounded object-contain mx-auto shadow-2xs"
              />
            </div>
          )}

          <div className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
            {question.questionText}
          </div>

          {/* Options */}
          <div className="space-y-2">
            {question.options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              const isTheCorrectOne = opt.id === question.correctAnswer;

              let btnStyles = 'bg-white/80 border-slate-200/90 text-slate-800 hover:bg-white hover:border-cyan-300 shadow-2xs';
              if (hasSubmitted) {
                if (isTheCorrectOne) {
                  btnStyles = 'bg-emerald-50/90 border-emerald-500 text-emerald-950 font-medium shadow-2xs';
                } else if (isSelected && !isTheCorrectOne) {
                  btnStyles = 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-2xs';
                } else {
                  btnStyles = 'bg-slate-50/50 border-slate-200/50 text-slate-400 opacity-60';
                }
              } else if (isSelected) {
                btnStyles = 'bg-cyan-50/90 border-cyan-500 text-slate-900 ring-1 ring-cyan-500 shadow-2xs';
              }

              return (
                <button
                  key={opt.id}
                  disabled={hasSubmitted}
                  onClick={() => setSelectedOption(opt.id)}
                  className={`w-full text-left p-3 rounded-lg border backdrop-blur-xs transition-all flex items-start gap-3 cursor-pointer ${btnStyles}`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 min-w-[1.75rem] rounded text-xs font-semibold shrink-0 mt-0.5 transition-colors ${
                      isSelected ? 'bg-cyan-700 text-white shadow-xs' : 'bg-slate-100/80 text-slate-700'
                    }`}
                  >
                    {opt.id}
                  </span>
                  <span className="text-xs sm:text-sm leading-relaxed">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback & Explanation */}
          {hasSubmitted && (
            <div className={`p-4 rounded-lg border backdrop-blur-xs text-sm ${isCorrect ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-2xs' : 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-2xs'}`}>
              <div className="flex items-center gap-2 font-semibold mb-2">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Correct Answer</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Incorrect. The correct answer is option {question.correctAnswer}.</span>
                  </>
                )}
              </div>
              <div className="text-slate-700 text-xs sm:text-sm leading-relaxed space-y-2 mt-2">
                <div>
                  <strong className="text-slate-900 font-semibold">Clinical Rationale: </strong>
                  {question.explanation}
                </div>
                {question.reference && (
                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-200/80">
                    <span className="font-semibold text-slate-600">Reference: </span>
                    {question.reference}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50/80 backdrop-blur-md px-4 sm:px-6 py-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => onBookmark(question.id)}
              className={`text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                isBookmarked ? 'text-amber-800 font-semibold' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
            <button
              onClick={() => onReportQuestion(question)}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Report Issue
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!hasSubmitted ? (
              <button
                disabled={!selectedOption}
                onClick={handleSubmit}
                className="px-4 py-2 bg-gradient-to-r from-cyan-700 to-teal-700 hover:from-cyan-800 hover:to-teal-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium rounded-lg transition-all shadow-xs cursor-pointer"
              >
                Submit
              </button>
            ) : (
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-white/90 border border-slate-200/90 hover:bg-white text-slate-700 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
