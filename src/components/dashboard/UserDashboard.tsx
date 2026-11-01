import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Trash2,
  UserCheck,
  UserPlus,
  Download,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { MCQQuestion, UserStats, UserAccount } from '../../types';
import { identifyWeakAreas } from '../../utils/scoring';
import { clearUserScopedStorage } from '../../utils/storage';
import { SITE_CONFIG } from '../../config/site';
import { Modal } from '../common/Modal';
import { isVisibleQuestion } from '../../utils/questionVisibility';

interface UserDashboardProps {
  stats: UserStats;
  questions: MCQQuestion[];
  onStartPracticeWithQuestions: (questions: MCQQuestion[]) => void;
  onRemoveBookmark: (id: string) => void;
  onClearRevisionItem: (id: string) => void;
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
  onClearRevisionItem,
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
            <p className="text-xs text-slate-500 py-4 text-center">
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
