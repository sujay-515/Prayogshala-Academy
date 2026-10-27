import React, { useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { QuestionReport, MCQQuestion } from '../../types';

interface ReportsManagerProps {
  reports: QuestionReport[];
  questions: MCQQuestion[];
  onResolveReport: (reportId: string, status?: 'Pending' | 'Investigating' | 'Resolved') => void;
  onEditQuestion: (q: MCQQuestion) => void;
}

export const ReportsManager: React.FC<ReportsManagerProps> = ({
  reports,
  questions,
  onResolveReport,
  onEditQuestion,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const filteredReports = reports.filter((r) => {
    if (filterStatus !== 'All' && r.status !== filterStatus) return false;
    return true;
  });

  const questionMap = new Map<string, MCQQuestion>();
  questions.forEach((q) => questionMap.set(q.id, q));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Student Reports & Quality Queue</h2>
          <p className="text-xs text-slate-500">
            Review potential discrepancies, ambiguous wording, and citations reported by students.
          </p>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100 p-1 rounded-lg overflow-x-auto scrollbar-none max-w-full">
          {['All', 'Pending', 'Investigating', 'Resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filterStatus === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p>No reports currently matching this status.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {filteredReports.map((report) => {
              const question = questionMap.get(report.questionId);

              return (
                <div key={report.id} className="p-5 space-y-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-slate-900">{report.questionCode}</span>
                      <span className="text-slate-300">·</span>
                      <span className="font-medium text-rose-700">{report.reason}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">
                        {new Date(report.submittedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {report.status === 'Pending' && (
                        <button
                          onClick={() => onResolveReport(report.id, 'Investigating')}
                          className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-medium cursor-pointer flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Investigate</span>
                        </button>
                      )}

                      {report.status === 'Investigating' && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Investigating
                        </span>
                      )}

                      {report.status !== 'Resolved' ? (
                        <button
                          onClick={() => onResolveReport(report.id, 'Resolved')}
                          className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-medium cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                        </span>
                      )}

                      {question && (
                        <button
                          onClick={() => onEditQuestion(question)}
                          className="px-2.5 py-1 rounded bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-medium cursor-pointer"
                        >
                          Edit Question
                        </button>
                      )}
                    </div>
                  </div>

                  {question && (
                    <p className="text-slate-600 italic bg-slate-50 p-2.5 rounded border border-slate-200">
                      &quot;{question.questionText}&quot;
                    </p>
                  )}

                  <div className="text-slate-700">
                    <strong className="text-slate-900 font-medium">Reporter Notes: </strong>
                    {report.details}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
