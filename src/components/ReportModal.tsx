import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { MCQQuestion } from '../types';
import { Modal } from './common/Modal';

interface ReportModalProps {
  question: MCQQuestion | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (questionId: string, questionCode: string, reason: any, details: string) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  question,
  isOpen,
  onClose,
  onSubmitReport,
}) => {
  const [reason, setReason] = useState<'Incorrect Answer' | 'Ambiguous Wording' | 'Typo/Grammar' | 'Outdated Reference' | 'Other'>('Incorrect Answer');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !question) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitReport(question.id, question.code, reason, details);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setDetails('');
      onClose();
    }, 1500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleId="report-modal-title"
      maxWidth="max-w-lg"
    >
      <div className="glass-panel w-full rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col border border-white/80 animate-in fade-in zoom-in-95 duration-200">
        <div className="glass-nav px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <h3 id="report-modal-title" className="font-semibold text-slate-900 text-sm sm:text-base">
              Report Question Content
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 sm:p-8 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-base font-semibold text-slate-900">Report Submitted</h4>
            <p className="text-xs sm:text-sm text-slate-600">
              Thank you for helping maintain scientific rigor in our Laboratory Medicine Question Bank.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            <div className="glass-card p-3 rounded-lg border-l-2 border-l-rose-500 text-xs text-slate-700">
              <span className="font-semibold text-slate-900 block mb-1">
                {question.code} · {question.subject}
              </span>
              <p className="line-clamp-2 italic text-slate-600 break-words">{question.questionText}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Issue Category
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="w-full bg-white/85 backdrop-blur-xs border border-slate-200/90 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 shadow-2xs cursor-pointer"
              >
                <option value="Incorrect Answer">Incorrect Answer Key</option>
                <option value="Ambiguous Wording">Ambiguous Question Wording</option>
                <option value="Typo/Grammar">Typo or Grammatical Issue</option>
                <option value="Outdated Reference">Outdated CLSI / Diagnostic Reference</option>
                <option value="Other">Other Clinical Issue</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Correction Details or Comments
              </label>
              <textarea
                required
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain the discrepancy and provide the textbook or guideline citation if possible..."
                className="w-full bg-white/85 backdrop-blur-xs border border-slate-200/90 rounded-lg p-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 shadow-2xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-lg text-xs font-medium transition-all shadow-xs cursor-pointer"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
