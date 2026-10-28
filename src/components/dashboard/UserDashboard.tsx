import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Trash2,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { MCQQuestion, UserStats, UserAccount } from '../../types';
import { identifyWeakAreas } from '../../utils/scoring';
import { SITE_CONFIG } from '../../config/site';

interface UserDashboardProps {
  stats: UserStats;
  questions: MCQQuestion[];
  onStartPracticeWithQuestions: (questions: MCQQuestion[]) => void;
  onRemoveBookmark: (id: string) => void;
  onClearRevisionItem: (id: string) => void;
  currentUser?: UserAccount | null;
  onOpenAuthModal?: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  stats,
  questions,
  onStartPracticeWithQuestions,
  onRemoveBookmark,
  onClearRevisionItem,
  currentUser,
  onOpenAuthModal,
}) => {
  const questionMap = useMemo(() => {
    const map = new Map<string, MCQQuestion>();
    for (const q of questions) {
      map.set(q.id, q);
    }
    return map;
  }, [questions]);

  const bookmarkedQuestions = useMemo(() => {
    return stats.bookmarkedIds
      .map((id) => questionMap.get(id))
      .filter((q): q is MCQQuestion => !!q);
  }, [stats.bookmarkedIds, questionMap]);

  const revisionQuestions = useMemo(() => {
    return stats.revisionQueueIds
      .map((id) => questionMap.get(id))
      .filter((q): q is MCQQuestion => !!q);
  }, [stats.revisionQueueIds, questionMap]);

  const weakAreas = useMemo(() => {
    return identifyWeakAreas(stats.subjectPerformance, 70);
  }, [stats.subjectPerformance]);

  const overallAccuracy =
    stats.totalAnswered > 0
      ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
      : 0;

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      <title>Candidate Dashboard | MedLab QBank</title>
      <meta
        name="description"
        content="Track your medical laboratory examination preparation analytics, accuracy by subject unit, study streak, and revision queue."
      />
      <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/dashboard`} />
      <meta property="og:title" content="Candidate Dashboard | MedLab QBank" />
      <meta
        property="og:description"
        content="Track your medical laboratory examination preparation analytics, accuracy by subject unit, study streak, and revision queue."
      />
      <meta property="og:url" content={`${SITE_CONFIG.SITE_URL}/dashboard`} />
      <meta name="robots" content="noindex,nofollow" />

      {/* Title & Account Banner */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Performance analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Subject and topic accuracy, targeted remediation, and revision queue
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="px-3 py-1.5 rounded bg-slate-100 border border-slate-200 text-xs text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="truncate">
                {currentUser.displayName} ({currentUser.username})
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-100 border border-slate-200 rounded p-2 sm:px-3 sm:py-1.5 text-xs w-full sm:w-auto">
              <span className="text-slate-600 font-medium">Guest practice mode</span>
              {onOpenAuthModal && (
                <button
                  onClick={onOpenAuthModal}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium flex items-center gap-1 cursor-pointer w-full sm:w-auto justify-center"
                >
                  <UserPlus className="w-3 h-3 text-cyan-400" />
                  <span>Sign In / Register</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Unified Metrics Bar */}
      <div className="glass-panel rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200/60 grid grid-cols-2 sm:grid-cols-4 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5">
          <span className="text-xs text-slate-500 block">Total attempted</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats.totalAnswered}</span>
          <span className="text-xs text-slate-400">{stats.totalCorrect} answered correctly</span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-xs text-slate-500 block">Cumulative accuracy</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{overallAccuracy}%</span>
          <span className="text-xs text-slate-400">Target passing rate: 70%</span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-xs text-slate-500 block">Mock examinations</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats.examRecords.length}</span>
          <span className="text-xs text-slate-400">
            {stats.examRecords.filter((e) => e.passed).length} passed benchmark
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-xs text-slate-500 block">Study streak</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats.streakDays} Days</span>
          <span className="text-xs text-slate-400">Consecutive days active</span>
        </div>
      </div>

      {/* Weak Areas Card */}
      {weakAreas.length > 0 && (
        <div className="glass-card border border-amber-300/70 rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Targeted remediation: Topics below 70% threshold</span>
            </div>
            <span className="text-xs text-amber-800">Prioritize these sections</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {weakAreas.map((weak) => {
              const matchingQuestions = questions.filter(
                (q) => q.status === 'Published' && q.subject === weak.subject
              );
              return (
                <div
                  key={weak.subject}
                  className="bg-white/80 border border-amber-200/90 p-3 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 block">{weak.subject}</span>
                    <span className="text-slate-600">
                      Accuracy: {weak.accuracy}% ({weak.totalAttempted} answered)
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      onStartPracticeWithQuestions(
                        matchingQuestions.length > 0 ? matchingQuestions : questions.filter((q) => q.status === 'Published')
                      )
                    }
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-xs shrink-0 cursor-pointer shadow-xs"
                  >
                    Drill topic
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject & Topic Performance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
            Subject-wise accuracy
          </h3>

          {Object.keys(stats.subjectPerformance).length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Complete practice sessions to populate subject metrics.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.subjectPerformance).map(([subject, perf]) => {
                const accuracy = perf.answered > 0 ? Math.round((perf.correct / perf.answered) * 100) : 0;
                return (
                  <div key={subject} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">{subject}</span>
                      <span className="text-slate-500">
                        {perf.correct}/{perf.answered} ({accuracy}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-700 rounded-full"
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Topic Performance */}
        <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
            Topic-wise accuracy
          </h3>

          {!stats.topicPerformance || Object.keys(stats.topicPerformance).length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Answer questions across specific diagnostic topics to view topic metrics.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.topicPerformance).map(([topic, perf]) => {
                const accuracy = perf.answered > 0 ? Math.round((perf.correct / perf.answered) * 100) : 0;
                return (
                  <div key={topic} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 truncate pr-2">{topic}</span>
                      <span className="text-slate-500 shrink-0">
                        {perf.correct}/{perf.answered} ({accuracy}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-700 rounded-full"
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Revision Queue & Bookmarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revision Bank */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100/80 pb-2.5">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Missed question queue ({revisionQuestions.length})
            </h3>
            {revisionQuestions.length > 0 && (
              <button
                onClick={() => onStartPracticeWithQuestions(revisionQuestions)}
                className="text-xs text-cyan-800 hover:text-cyan-950 font-medium cursor-pointer"
              >
                Practice missed questions
              </button>
            )}
          </div>

          {revisionQuestions.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No missed questions currently queued for revision.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              {revisionQuestions.map((q) => (
                <div
                  key={q.id}
                  className="glass-card p-3 rounded-xl flex items-start justify-between gap-2 shadow-2xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800 block">{q.code} · {q.subject}</span>
                    <p className="text-slate-600 line-clamp-1">{q.questionText}</p>
                  </div>
                  <button
                    onClick={() => onClearRevisionItem(q.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookmarks */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100/80 pb-2.5">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Saved bookmarks ({bookmarkedQuestions.length})
            </h3>
            {bookmarkedQuestions.length > 0 && (
              <button
                onClick={() => onStartPracticeWithQuestions(bookmarkedQuestions)}
                className="text-xs text-cyan-800 hover:text-cyan-950 font-medium cursor-pointer"
              >
                Practice bookmarked items
              </button>
            )}
          </div>

          {bookmarkedQuestions.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No bookmarked questions saved yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              {bookmarkedQuestions.map((q) => (
                <div
                  key={q.id}
                  className="glass-card p-3 rounded-xl flex items-start justify-between gap-2 shadow-2xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800 block">{q.code} · {q.subject}</span>
                    <p className="text-slate-600 line-clamp-1">{q.questionText}</p>
                  </div>
                  <button
                    onClick={() => onRemoveBookmark(q.id)}
                    className="p-1 text-slate-400 hover:text-amber-600 cursor-pointer"
                    title="Remove bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exam History Log */}
      <div className="glass-panel rounded-2xl p-6 space-y-3.5 shadow-xs">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
          Examination history
        </h3>

        {stats.examRecords.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No mock examination sessions completed yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Exam title</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stats.examRecords.map((rec) => {
                  const pct = rec.total > 0 ? Math.round((rec.score / rec.total) * 100) : 0;
                  return (
                    <tr key={rec.id}>
                      <td className="px-3 py-2 text-slate-500">
                        {new Date(rec.date).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">{rec.title}</td>
                      <td className="px-3 py-2">
                        {rec.score}/{rec.total} ({pct}%)
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        <span className={rec.passed ? 'text-emerald-700' : 'text-rose-700'}>
                          {rec.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
