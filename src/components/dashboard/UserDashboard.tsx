import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Trash2,
  UserCheck,
  UserPlus,
  Download,
  KeyRound,
  CheckCircle2,
  Target,
  Gauge,
  Folder,
  MonitorSmartphone,
} from 'lucide-react';
import { MCQQuestion, UserStats, UserAccount } from '../../types';
import { identifyWeakAreas } from '../../utils/scoring';
import { clearUserScopedStorage } from '../../utils/storage';
import { SITE_CONFIG } from '../../config/site';
import { Modal } from '../common/Modal';
import { isVisibleQuestion } from '../../utils/questionVisibility';
import { remainingHits } from '../../utils/mistakes';
import { predictPerformance } from '../../utils/prediction';
import { formatPacingTime } from '../../utils/pacing';
import { folderFor } from '../../utils/bookmarks';

interface UserDashboardProps {
  stats: UserStats;
  questions: MCQQuestion[];
  onStartPracticeWithQuestions: (questions: MCQQuestion[]) => void;
  onRemoveBookmark: (id: string) => void;
  currentUser?: UserAccount | null;
  onOpenAuthModal?: () => void;
  authToken?: string | null;
  onLogout?: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  stats,
  questions,
  onStartPracticeWithQuestions,
  onRemoveBookmark,
  currentUser,
  onOpenAuthModal,
  authToken,
  onLogout,
}) => {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [sessions, setSessions] = useState<Array<{ device: string; createdAt: string; current: boolean }> | null>(null);
  const [maxSessions, setMaxSessions] = useState(5);
  const [sessionsError, setSessionsError] = useState('');
  const [sessionsMessage, setSessionsMessage] = useState('');
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [isSubmittingPw, setIsSubmittingPw] = useState(false);

  // Data export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // Account deletion modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Leaderboard privacy preference
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(!currentUser?.leaderboardHidden);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);

  useEffect(() => {
    setShowOnLeaderboard(!currentUser?.leaderboardHidden);
  }, [currentUser?.leaderboardHidden]);

  const handleToggleLeaderboardPrivacy = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextShow = e.target.checked;
    setShowOnLeaderboard(nextShow);
    setIsUpdatingPrivacy(true);
    setPrivacyMessage(null);
    try {
      const res = await fetch('/api/auth/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ leaderboardHidden: !nextShow }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update leaderboard preference.');
      }
      if (currentUser) {
        currentUser.leaderboardHidden = !nextShow;
      }
      setPrivacyMessage(nextShow ? 'Your name is now visible on the leaderboard.' : 'Your name is hidden from public leaderboards.');
    } catch (err: any) {
      setShowOnLeaderboard(!nextShow); // revert
      setPrivacyMessage(err.message || 'Error updating preference.');
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };
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

  const prediction = useMemo(() => predictPerformance(stats), [stats]);

  const pacingHistory = useMemo(() => {
    const paced = stats.examRecords.filter((record) => Boolean(record.pacing));
    if (paced.length === 0) return null;
    const recent = paced.slice(0, 5);
    const sum = (pick: (pacing: NonNullable<(typeof recent)[number]['pacing']>) => number) =>
      recent.reduce((total, record) => total + pick(record.pacing!), 0);
    return {
      count: recent.length,
      averageSeconds: Math.round(sum((p) => p.avgSecondsPerQuestion) / recent.length),
      fastestSeconds: Math.min(...recent.map((record) => record.pacing!.fastestSeconds)),
      slowestSeconds: Math.max(...recent.map((record) => record.pacing!.slowestSeconds)),
      rushingCount: sum((p) => p.rushingCount),
      overthinkingCount: sum((p) => p.overthinkingCount),
      latestLabel: recent[0].pacing!.label,
    };
  }, [stats.examRecords]);

  const handleDownloadData = async () => {
    setIsExporting(true);
    setExportError('');
    try {
      const token = authToken || localStorage.getItem('medlab_qbank_auth_token_v1');
      const res = await fetch('/api/auth/export', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        if (res.status === 401) {
          clearUserScopedStorage();
          onLogout?.();
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to export account data.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medlab-qbank-export-${currentUser?.username || 'user'}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setExportError(err.message || 'Error downloading data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    setIsSubmittingPw(true);
    try {
      const token = authToken || localStorage.getItem('medlab_qbank_auth_token_v1');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 401) {
          clearUserScopedStorage();
          onLogout?.();
        }
        throw new Error(data.error || 'Failed to update password.');
      }
      setPwSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err.message || 'Error changing password.');
    } finally {
      setIsSubmittingPw(false);
    }
  };

  const handleConfirmDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    setIsDeleting(true);
    try {
      const token = authToken || localStorage.getItem('medlab_qbank_auth_token_v1');
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete account.');
      }
      setIsDeleteModalOpen(false);
      clearUserScopedStorage();
      if (onLogout) {
        onLogout();
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting account.');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadSessions = () => {
    if (!authToken) {
      setSessions(null);
      return;
    }
    fetch('/api/auth/sessions', { headers: { Authorization: `Bearer ${authToken}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setSessions(data.sessions);
          setMaxSessions(data.maxSessions || 5);
          setSessionsError('');
        }
      })
      .catch(() => setSessionsError('Unable to load active devices.'));
  };

  useEffect(() => {
    loadSessions();
  }, [authToken]);

  const handleRevokeOtherSessions = async () => {
    if (!authToken) return;
    setIsRevokingSessions(true);
    setSessionsMessage('');
    setSessionsError('');
    try {
      const res = await fetch('/api/auth/sessions/revoke-others', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setSessionsMessage(
          data.revoked > 0
            ? `Signed out ${data.revoked} other device${data.revoked === 1 ? '' : 's'}.`
            : 'No other devices were signed in.'
        );
        loadSessions();
      } else {
        setSessionsError(data?.error || 'Could not revoke other sessions.');
      }
    } catch {
      setSessionsError('Network error while revoking sessions.');
    } finally {
      setIsRevokingSessions(false);
    }
  };

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
          <span className="text-xs text-slate-500">{stats.totalCorrect} answered correctly</span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-xs text-slate-500 block">Cumulative accuracy</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{overallAccuracy}%</span>
          <span className="text-xs text-slate-500">Target passing rate: 70%</span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-xs text-slate-500 block">Mock examinations</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats.examRecords.length}</span>
          <span className="text-xs text-slate-500">
            {stats.examRecords.filter((e) => e.passed).length} passed benchmark
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-xs text-slate-500 block">Study streak</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats.streakDays} Days</span>
          <span className="text-xs text-slate-500">Consecutive days active</span>
        </div>
      </div>

      {/* Predicted performance */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-700" />
            Predicted performance
          </h3>
          {prediction.available && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${
                prediction.confidence === 'high'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : prediction.confidence === 'medium'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {prediction.confidence} confidence
            </span>
          )}
        </div>

        {prediction.available ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-slate-500 block">Projected score</span>
                <span className="text-3xl font-bold text-slate-900 block mt-0.5">
                  {prediction.predicted}%
                </span>
                <span className="text-xs text-slate-500">
                  Likely range {prediction.low}–{prediction.high}%
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Projected percentile</span>
                <span className="text-2xl font-bold text-cyan-800 block mt-0.5">
                  {prediction.percentile}th
                </span>
                <span className="text-xs text-slate-500">
                  Roughly top {Math.max(1, 100 - prediction.percentile)}% of candidates
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Basis</span>
                <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                  {prediction.basis}
                </span>
                <span className="text-xs text-slate-500">
                  Practice accuracy blended with recent mock scores
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
              Heuristic projection, not a guarantee. It is pulled toward the cohort average when your
              sample is small, and it weights your five most recent mocks most heavily.
            </p>
          </>
        ) : (
          <div className="flex items-start gap-2 text-xs text-slate-600">
            <Target className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>{prediction.reason}</span>
          </div>
        )}
      </div>

      {/* Pacing & study habits */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-700" />
            Pacing &amp; study habits
          </h3>
          {pacingHistory && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Last {pacingHistory.count} timed mock{pacingHistory.count === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {pacingHistory ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-slate-500 block">Average per question</span>
                <span className="text-2xl font-bold text-slate-900 block mt-0.5">
                  {formatPacingTime(pacingHistory.averageSeconds)}
                </span>
                <span className="text-xs text-slate-500">
                  Fastest {formatPacingTime(pacingHistory.fastestSeconds)} · slowest{' '}
                  {formatPacingTime(pacingHistory.slowestSeconds)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Study habit</span>
                <span className="text-sm font-semibold text-slate-800 block mt-1">
                  {pacingHistory.latestLabel}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Rushing / Overthinking</span>
                <span className="text-2xl font-bold text-slate-900 block mt-0.5">
                  {pacingHistory.rushingCount} / {pacingHistory.overthinkingCount}
                </span>
                <span className="text-xs text-slate-500">Questions under 20s wrong · 90s+ each</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
              Captured inside timed mock exams. Use it to decide whether to slow down on weak topics or
              set a per-question time cap.
            </p>
          </>
        ) : (
          <div className="flex items-start gap-2 text-xs text-slate-600">
            <Gauge className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>Complete a timed mock exam to unlock pacing analytics.</span>
          </div>
        )}
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
                (q) => isVisibleQuestion(q) && q.subject === weak.subject
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
                        matchingQuestions.length > 0 ? matchingQuestions : questions.filter((q) => isVisibleQuestion(q))
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
            <p className="text-xs text-slate-500 py-4 text-center">
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
            <p className="text-xs text-slate-500 py-4 text-center">
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
            <Link
              to="/mistakes"
              className="text-xs text-cyan-800 hover:text-cyan-950 font-medium cursor-pointer"
            >
              Open Mistakes Recovery →
            </Link>
          </div>

          {revisionQuestions.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No missed questions queued. Wrong answers from practice, daily questions and mocks land here automatically.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              {revisionQuestions.map((q) => {
                const streak = Math.min(stats.mistakeStreaks?.[q.id] || 0, 1);
                return (
                  <div
                    key={q.id}
                    className="glass-card p-3 rounded-xl flex items-start justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-800 block">{q.code} · {q.subject}</span>
                      <p className="text-slate-600 line-clamp-1">{q.questionText}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="flex gap-1" aria-hidden="true">
                          {[0, 1].map((i) => (
                            <span
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                i < streak ? 'bg-emerald-600' : 'bg-slate-300'
                              }`}
                            />
                          ))}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                          {remainingHits(streak)} correct to clear
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onStartPracticeWithQuestions([q])}
                      className="px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-medium hover:bg-slate-800 cursor-pointer shrink-0"
                    >
                      Review
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bookmarks */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100/80 pb-2.5">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Saved bookmarks ({bookmarkedQuestions.length})
            </h3>
            <Link
              to="/bookmarks"
              className="text-xs text-cyan-800 hover:text-cyan-950 font-medium cursor-pointer"
            >
              Open library →
            </Link>
          </div>

          {bookmarkedQuestions.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No bookmarked questions saved yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              {bookmarkedQuestions.map((q) => (
                <div
                  key={q.id}
                  className="glass-card p-3 rounded-xl flex items-start justify-between gap-2 shadow-2xs"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800 block">{q.code} · {q.subject}</span>
                    <p className="text-slate-600 line-clamp-1">{q.questionText}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px]">
                        <Folder className="w-2.5 h-2.5" />
                        {folderFor(stats.bookmarkMeta, q.id)}
                      </span>
                      {stats.bookmarkMeta?.[q.id]?.note && (
                        <span className="text-[10px] text-slate-500 italic line-clamp-1">
                          “{stats.bookmarkMeta[q.id]?.note}”
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveBookmark(q.id)}
                    className="p-1 text-slate-400 hover:text-amber-600 cursor-pointer shrink-0"
                    title="Remove bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {bookmarkedQuestions.length > 0 && (
            <button
              onClick={() => onStartPracticeWithQuestions(bookmarkedQuestions)}
              className="w-full py-1.5 rounded-md border border-cyan-200 bg-cyan-50 text-cyan-900 text-xs font-medium hover:bg-cyan-100 transition-colors cursor-pointer"
            >
              Practice all {bookmarkedQuestions.length} bookmarks
            </button>
          )}
        </div>
      </div>

      {/* Exam History Log */}
      <div className="glass-panel rounded-2xl p-6 space-y-3.5 shadow-xs">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
          Examination history
        </h3>

        {stats.examRecords.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
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
                        {Number.isInteger(rec.score) ? rec.score : rec.score.toFixed(2)}/{rec.total} ({pct}%)
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

      {/* Account Settings & Privacy Controls */}
      {currentUser ? (
        <section aria-labelledby="account-settings-heading" className="glass-panel rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-200/80 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="account-settings-heading" className="text-sm font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-700" aria-hidden="true" />
                <span>Account & Privacy Controls</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Signed in as <strong className="text-slate-800">{currentUser.username}</strong> ({currentUser.email || 'No email registered'}) · Role: <span className="capitalize font-medium">{currentUser.role}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadData}
                disabled={isExporting}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-cyan-700" aria-hidden="true" />
                <span>{isExporting ? 'Exporting...' : 'Download My Data'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeletePassword('');
                  setDeleteError('');
                  setIsDeleteModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-700" aria-hidden="true" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>

          {exportError && (
            <p role="alert" aria-live="polite" className="text-xs text-rose-700 font-medium">
              {exportError}
            </p>
          )}

          {/* Leaderboard Privacy Toggle */}
          <div className="pt-2 border-b border-slate-200/80 pb-5 max-w-xl">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
              Leaderboard Privacy
            </h4>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showOnLeaderboard}
                disabled={isUpdatingPrivacy}
                onChange={handleToggleLeaderboardPrivacy}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600 cursor-pointer"
              />
              <div>
                <span className="text-xs font-medium text-slate-800">
                  Show my name on the leaderboard
                </span>
                <p className="text-2xs text-slate-500 mt-0.5">
                  When enabled, your display name and rank appear on the weekly Grand Test leaderboard. When disabled, your entries are omitted from the public board, but you can still view your own private rank.
                </p>
                {privacyMessage && (
                  <p className="text-2xs mt-1 text-cyan-800 font-medium">{privacyMessage}</p>
                )}
              </div>
            </label>
          </div>

          {/* Change Password Sub-section */}
          <div className="max-w-xl space-y-4">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Change Account Password
            </h4>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label htmlFor="dashboard-current-pw" className="block text-xs font-medium text-slate-700 mb-1">
                  Current Password <span className="text-rose-600" aria-hidden="true">*</span>
                </label>
                <input
                  id="dashboard-current-pw"
                  type="password"
                  required
                  aria-required="true"
                  aria-invalid={pwError ? 'true' : undefined}
                  aria-describedby={pwError ? 'dashboard-pw-error' : undefined}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/20 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dashboard-new-pw" className="block text-xs font-medium text-slate-700 mb-1">
                    New Password (min 8 chars) <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="dashboard-new-pw"
                    type="password"
                    required
                    aria-required="true"
                    aria-invalid={pwError ? 'true' : undefined}
                    aria-describedby={pwError ? 'dashboard-pw-error' : undefined}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/20 shadow-2xs"
                  />
                </div>
                <div>
                  <label htmlFor="dashboard-confirm-pw" className="block text-xs font-medium text-slate-700 mb-1">
                    Confirm New Password <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="dashboard-confirm-pw"
                    type="password"
                    required
                    aria-required="true"
                    aria-invalid={pwError ? 'true' : undefined}
                    aria-describedby={pwError ? 'dashboard-pw-error' : undefined}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/20 shadow-2xs"
                  />
                </div>
              </div>

              {pwError && (
                <p id="dashboard-pw-error" role="alert" aria-live="polite" className="text-xs text-rose-700 font-medium">
                  {pwError}
                </p>
              )}

              {pwSuccess && (
                <p role="status" aria-live="polite" className="text-xs text-emerald-700 font-medium">
                  {pwSuccess}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmittingPw}
                className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingPw ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Active devices */}
          <div className="max-w-xl space-y-3 pt-5 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MonitorSmartphone className="w-3.5 h-3.5 text-cyan-700" />
                Active devices
              </h4>
              <span className="text-xs text-slate-500">
                {sessions ? `${sessions.length} of ${maxSessions}` : '—'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Up to {maxSessions} devices can stay signed in. Signing in elsewhere signs out the oldest session.
            </p>

            {sessionsError && (
              <p role="alert" className="text-xs text-rose-700 font-medium">{sessionsError}</p>
            )}

            {sessions && sessions.length > 0 && (
              <ul className="space-y-1.5">
                {sessions.map((item, index) => (
                  <li
                    key={`${item.createdAt}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs"
                  >
                    <span className="text-slate-700 font-medium flex items-center gap-1.5">
                      {item.device}
                      {item.current && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          This device
                        </span>
                      )}
                    </span>
                    <span className="text-slate-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {sessionsMessage && (
              <p role="status" aria-live="polite" className="text-xs text-emerald-700 font-medium">
                {sessionsMessage}
              </p>
            )}

            <button
              type="button"
              onClick={handleRevokeOtherSessions}
              disabled={isRevokingSessions || !sessions || sessions.length <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {isRevokingSessions ? 'Signing out...' : 'Sign out other devices'}
            </button>
          </div>
        </section>
      ) : (
        <section className="glass-panel rounded-2xl p-6 text-center space-y-3 shadow-xs">
          <KeyRound className="w-8 h-8 text-cyan-700 mx-auto" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900">
            Account & Cloud Synchronization
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Sign in or register a candidate account to sync your study progress across devices, download your data archive, and manage account credentials.
          </p>
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Sign In / Register
            </button>
          )}
        </section>
      )}

      {/* Account Deletion Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        titleId="delete-account-title"
        ariaLabel="Confirm Permanent Account Deletion"
        maxWidth="max-w-md"
      >
        <div className="p-6 space-y-4">
          <h3 id="delete-account-title" className="text-base font-bold text-slate-900">
            Confirm Permanent Account Deletion
          </h3>
          <div className="flex items-start gap-3 text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <strong className="font-semibold block">This action is permanent and cannot be undone.</strong>
              <span>
                Your profile, login credentials, active sessions, study records, and mock exam results will be immediately erased. Any question error reports you previously submitted will be retained in anonymized form (user reference removed).
              </span>
            </div>
          </div>

          <form onSubmit={handleConfirmDeleteAccount} className="space-y-3">
            <div>
              <label htmlFor="delete-account-password" className="block text-xs font-semibold text-slate-700 mb-1">
                Enter Current Password to Confirm Deletion <span className="text-rose-600" aria-hidden="true">*</span>
              </label>
              <input
                id="delete-account-password"
                type="password"
                required
                aria-required="true"
                aria-invalid={deleteError ? 'true' : undefined}
                aria-describedby={deleteError ? 'delete-account-error' : undefined}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your password..."
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600/20 shadow-2xs"
              />
            </div>

            {deleteError && (
              <p id="delete-account-error" role="alert" aria-live="polite" className="text-xs text-rose-700 font-medium">
                {deleteError}
              </p>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDeleting}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting Account...' : 'Permanently Delete My Account'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
