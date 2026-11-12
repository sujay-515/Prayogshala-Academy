import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Search, Star } from 'lucide-react';
import { MCQQuestion, UserStats } from '../../types';
import { isVisibleQuestion } from '../../utils/questionVisibility';
import { remainingHits } from '../../utils/mistakes';
import { SITE_CONFIG } from '../../config/site';

interface MistakesRecoveryProps {
  stats: UserStats;
  questions: MCQQuestion[];
  onStartPracticeWithQuestions: (questions: MCQQuestion[]) => void;
}

export const MistakesRecovery: React.FC<MistakesRecoveryProps> = ({
  stats,
  questions,
  onStartPracticeWithQuestions,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [query, setQuery] = useState<string>('');

  const { mistakeQuestions, unavailableCount, nearClearCount } = useMemo(() => {
    const queuedIds = new Set(stats.revisionQueueIds || []);
    const available = questions.filter((q) => queuedIds.has(q.id) && isVisibleQuestion(q));

    let nearClear = 0;
    for (const q of available) {
      if ((stats.mistakeStreaks?.[q.id] || 0) >= 1) nearClear++;
    }

    return {
      mistakeQuestions: available,
      unavailableCount: Math.max(0, queuedIds.size - available.length),
      nearClearCount: nearClear,
    };
  }, [stats.revisionQueueIds, stats.mistakeStreaks, questions]);

  const subjects = useMemo(() => {
    return ['All', ...Array.from(new Set(mistakeQuestions.map((q) => q.subject))).sort()];
  }, [mistakeQuestions]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return mistakeQuestions.filter((q) => {
      if (selectedSubject !== 'All' && q.subject !== selectedSubject) return false;
      if (!needle) return true;
      return (
        q.questionText.toLowerCase().includes(needle) ||
        q.code.toLowerCase().includes(needle) ||
        q.topic.toLowerCase().includes(needle) ||
        q.subject.toLowerCase().includes(needle)
      );
    });
  }, [mistakeQuestions, selectedSubject, query]);

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <title>Mistakes Recovery | Prayogshala Academy</title>
      <meta
        name="description"
        content="Review missed laboratory medicine questions. Each mistake clears only after two consecutive correct answers."
      />
      <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/mistakes`} />
      <meta name="robots" content="noindex,nofollow" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Mistakes Recovery
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Every wrong answer from practice, the daily question and mock exams is logged here.
            A mistake clears only after <strong className="text-slate-800">two consecutive correct answers</strong>.
          </p>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={() => onStartPracticeWithQuestions(filtered)}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>Drill {filtered.length} mistake{filtered.length === 1 ? '' : 's'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="glass-panel rounded-xl p-4">
          <span className="text-xs text-slate-500 block">Open mistakes</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{mistakeQuestions.length}</span>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <span className="text-xs text-slate-500 block">One correct away</span>
          <span className="text-2xl font-bold text-emerald-700 mt-1 block">{nearClearCount}</span>
        </div>
        <div className="glass-panel rounded-xl p-4 col-span-2 sm:col-span-1">
          <span className="text-xs text-slate-500 block">Unavailable</span>
          <span className="text-2xl font-bold text-slate-500 mt-1 block">{unavailableCount}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Archived or removed questions</span>
        </div>
      </div>

      {mistakeQuestions.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900">No open mistakes</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Nothing queued right now. Answer practice questions or sit a mock exam and any incorrect
            response will appear here for recovery.
          </p>
          {unavailableCount > 0 && (
            <p className="text-xs text-amber-700 max-w-md mx-auto flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {unavailableCount} queued question{unavailableCount === 1 ? ' is' : 's are'} no longer in the
              published bank and cannot be drilled.
            </p>
          )}
          <Link
            to="/practice"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
          >
            Start practising
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </Link>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="glass-panel rounded-xl p-3 flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search missed questions..."
                aria-label="Search missed questions"
                className="w-full bg-white/70 border border-slate-200/90 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              aria-label="Filter mistakes by subject"
              className="bg-white/70 border border-slate-200/90 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-cyan-500"
            >
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject === 'All' ? 'All subjects' : subject}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-xs text-slate-500">
              No mistakes match this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((q) => {
                const streak = Math.min(stats.mistakeStreaks?.[q.id] || 0, 1);
                const remaining = remainingHits(streak);
                return (
                  <div key={q.id} className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-cyan-800 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200/60">
                        {q.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-700 font-medium">{q.unit}</span>
                      <span aria-hidden="true">·</span>
                      <span>{q.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span>{q.topic}</span>
                      <span aria-hidden="true">·</span>
                      <span>{q.difficulty}</span>
                      {q.isHighYield && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          High-Yield
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-slate-900 leading-snug">{q.questionText}</p>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="flex gap-1" aria-hidden="true">
                          {[0, 1].map((i) => (
                            <span
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i < streak ? 'bg-emerald-600' : 'bg-slate-300'
                              }`}
                            />
                          ))}
                        </span>
                        <span className="text-xs font-medium text-amber-800">
                          {remaining === 1 ? '1 more correct answer to clear' : '2 correct answers to clear'}
                        </span>
                      </div>
                      <button
                        onClick={() => onStartPracticeWithQuestions([q])}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        Review this question
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
