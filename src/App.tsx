import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Link, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/home/HomeView';
import { BrowseQuestionBank } from './components/browse/BrowseQuestionBank';
import { UserDashboard } from './components/dashboard/UserDashboard';
import { DailyQuestionModal } from './components/DailyQuestionModal';
import { ReportModal } from './components/ReportModal';
import { Modal } from './components/common/Modal';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { DisclaimerPage } from './pages/DisclaimerPage';
import { ContactPage } from './pages/ContactPage';
import { INITIAL_QUESTIONS } from './data/seedQuestions';
import { INITIAL_CATEGORIES } from './data/categories';
import {
  MCQQuestion,
  UnitCategory,
  UserStats,
  QuestionReport,
  QuestionStatus,
  ExamCategory,
  UserAccount,
  toPublicQuestion,
} from './types';
import { X, UserCheck } from 'lucide-react';

// Route-level code-splitting for heavy feature components
const PracticeMode = lazy(() => import('./components/practice/PracticeMode').then((m) => ({ default: m.PracticeMode })));
const ExamMode = lazy(() => import('./components/exam/ExamMode').then((m) => ({ default: m.ExamMode })));
const AdminPortal = lazy(() => import('./components/admin/AdminPortal').then((m) => ({ default: m.AdminPortal })));

function RouteLoadingFallback({ label = 'Loading application component...' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[40vh] flex flex-col items-center justify-center p-8 space-y-3"
    >
      <div className="w-8 h-8 border-3 border-cyan-700 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  isChunkLoadError?: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, isChunkLoadError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const isChunk =
      error?.name === 'ChunkLoadError' ||
      /dynamically imported module|Loading chunk|Failed to fetch dynamically/i.test(error?.message || '');
    return { hasError: true, isChunkLoadError: isChunk };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Application ErrorBoundary]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" aria-live="assertive" className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-8 max-w-md w-full shadow-sm">
            <h2 className="text-xl font-bold text-rose-900 dark:text-rose-200 mb-2">
              {this.state.isChunkLoadError ? 'Update Available or Connection Interrupted' : 'Something went wrong'}
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-6">
              {this.state.isChunkLoadError
                ? 'A newer version of the application or module could not be loaded. Reloading the page will fetch the latest assets.'
                : 'An unexpected application error occurred. You can reload the page to continue.'}
            </p>
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white font-medium rounded-xl transition shadow-sm cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const NotFoundPage: React.FC = () => {
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    let created = false;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
      created = true;
    }
    const prevContent = meta.content;
    meta.content = 'noindex, nofollow';

    return () => {
      if (created && meta && meta.parentNode) {
        meta.parentNode.removeChild(meta);
      } else if (meta) {
        meta.content = prevContent;
      }
    };
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <title>Page Not Found | MedLab QBank</title>
      <meta name="robots" content="noindex,nofollow" />
      <div className="max-w-md w-full">
        <h1 className="text-6xl font-extrabold text-blue-600 dark:text-blue-400 mb-3">404</h1>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Page Not Found</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          The requested page could not be found. It may have been moved or does not exist.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition shadow-sm"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

const STORAGE_KEY_QUESTIONS = 'medlab_qbank_questions_v2';
const STORAGE_KEY_CATEGORIES = 'medlab_qbank_categories_v2';
const STORAGE_KEY_STATS = 'medlab_qbank_stats_v2';
const STORAGE_KEY_REPORTS = 'medlab_qbank_reports_v2';
const STORAGE_KEY_TOKEN = 'medlab_qbank_auth_token_v1';
const STORAGE_KEY_USER = 'medlab_qbank_current_user_v1';

import { hasRevealOnlyFields, sanitizeQuestionsForCache } from './utils/cacheSanitizer';

// Discard legacy data and purge cached question lists containing reveal-only fields
try {
  localStorage.removeItem('medlab_qbank_questions_v1');
  localStorage.removeItem('medlab_qbank_stats_v1');
  localStorage.removeItem('medlab_qbank_reports_v1');
  localStorage.removeItem(STORAGE_KEY_REPORTS);
  const cachedQ = localStorage.getItem(STORAGE_KEY_QUESTIONS);
  if (cachedQ) {
    const parsed = JSON.parse(cachedQ);
    if (Array.isArray(parsed) && hasRevealOnlyFields(parsed)) {
      console.warn('[Cache] Stale client cache contains reveal-only fields; purging.');
      localStorage.removeItem(STORAGE_KEY_QUESTIONS);
    }
  }
} catch {
  // Ignore storage errors
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Navigation & Role - Derived from URL route
  const getActiveTab = (): 'home' | 'browse' | 'practice' | 'exam' | 'dashboard' | 'admin' => {
    const path = location.pathname.toLowerCase();
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/browse')) return 'browse';
    if (path.startsWith('/practice')) return 'practice';
    if (path.startsWith('/exam')) return 'exam';
    if (path.startsWith('/dashboard')) return 'dashboard';
    return 'home';
  };
  const activeTab = getActiveTab();

  const setActiveTab = (tab: 'home' | 'browse' | 'practice' | 'exam' | 'dashboard' | 'admin') => {
    if (tab === 'home') navigate('/');
    else if (tab === 'admin') {
      setIsViewingAsStudent(false);
      navigate('/admin');
    } else {
      navigate(`/${tab}`);
    }
  };

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) {
        const u = JSON.parse(saved);
        return u?.role === 'admin' || u?.role === 'superadmin';
      }
    } catch {}
    return false;
  });
  const [isViewingAsStudent, setIsViewingAsStudent] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cross-tab context state
  const [selectedBrowseUnit, setSelectedBrowseUnit] = useState<string | undefined>(undefined);
  const [selectedPracticeUnit, setSelectedPracticeUnit] = useState<string | undefined>(undefined);
  const [selectedPracticeExam, setSelectedPracticeExam] = useState<ExamCategory | undefined>(undefined);
  const [selectedExamCategory, setSelectedExamCategory] = useState<ExamCategory | undefined>(undefined);
  const [customPracticeSubset, setCustomPracticeSubset] = useState<MCQQuestion[] | null>(null);

  // Auth State
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY_TOKEN));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authResetToken, setAuthResetToken] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');

  // Primary Data Stores (hydrated from SQLite backend via /api/bootstrap with localStorage fallback)
  const [questions, setQuestions] = useState<MCQQuestion[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_QUESTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (hasRevealOnlyFields(parsed)) {
            console.warn('[Cache] Stale client cache contains reveal-only fields; discarding.');
            localStorage.removeItem(STORAGE_KEY_QUESTIONS);
            return [];
          }
          return parsed.map((q) => toPublicQuestion(q) as MCQQuestion);
        }
      }
    } catch (e) {
      console.warn('Failed to load stored questions:', e);
    }
    return [];
  });

  const [categories, setCategories] = useState<UnitCategory[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load stored categories:', e);
    }
    return INITIAL_CATEGORIES;
  });

  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load stored user stats:', e);
    }
    return {
      totalAnswered: 0,
      totalCorrect: 0,
      streakDays: 0,
      lastActiveDate: new Date().toISOString().slice(0, 10),
      bookmarkedIds: [],
      revisionQueueIds: [],
      subjectPerformance: {},
      topicPerformance: {},
      examRecords: [],
    };
  });

  const [reports, setReports] = useState<QuestionReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REPORTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load stored reports:', e);
    }
    return [];
  });

  // Modals state
  const [isDailyQuestionOpen, setIsDailyQuestionOpen] = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState<MCQQuestion | null>(null);

  // URL query parameters synchronization (e.g. ?unit=Hematology&exam=ASCP&q=anemia)
  const queryUnit = searchParams.get('unit') || undefined;
  const queryExam = (searchParams.get('exam') as ExamCategory) || undefined;
  const querySearch = searchParams.get('q');

  useEffect(() => {
    if (querySearch !== null && querySearch !== searchQuery) {
      setSearchQuery(querySearch);
    }
  }, [querySearch]);

  // Detect password reset token from email link on mount
  useEffect(() => {
    const token = searchParams.get('reset_token');
    if (token) {
      setAuthResetToken(token);
      setAuthMode('reset');
      setIsAuthModalOpen(true);
    }
  }, [searchParams]);

  // Hydrate from SQLite Backend on mount
  useEffect(() => {
    const headers: Record<string, string> = {};
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    fetch('/api/bootstrap', { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (Array.isArray(data.questions)) setQuestions(data.questions);
          if (Array.isArray(data.categories)) setCategories(data.categories);
          if (Array.isArray(data.reports)) setReports(data.reports);
          if (data.stats && authToken) setStats(data.stats);
          if (data.user) {
            setCurrentUser(data.user);
            try {
              localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
            } catch {}
            if (data.user.role === 'admin' || data.user.role === 'superadmin') setIsAdmin(true);
          } else if (authToken) {
            handleLogout();
          }
        }
      })
      .catch(() => {
        // Offline fallback uses localStorage state
      });
  }, [authToken]);

  // Keep lightweight localStorage offline cache synchronized (capped at 100 items, public fields only, never answer keys)
  useEffect(() => {
    try {
      const lightweightCache = questions.slice(0, 100).map((q) => {
        const pub = toPublicQuestion(q);
        return pub.imageUrl && pub.imageUrl.startsWith('data:') && pub.imageUrl.length > 2048
          ? { ...pub, imageUrl: undefined }
          : pub;
      });
      localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(lightweightCache));
    } catch (e) {
      console.warn('Storage quota error:', e);
    }
  }, [questions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.warn('Storage quota error:', e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
    } catch (e) {
      console.warn('Storage quota error:', e);
    }
  }, [stats]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
    } catch (e) {
      console.warn('Storage quota error:', e);
    }
  }, [reports]);

  // Helper to build JSON headers with Bearer token
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = authToken || localStorage.getItem(STORAGE_KEY_TOKEN);
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  // Helper to persist stats to SQLite backend (authenticated users only; guests use localStorage)
  const persistStatsToServer = (updatedStats: UserStats) => {
    const token = authToken || localStorage.getItem(STORAGE_KEY_TOKEN);
    if (!token) return;
    fetch('/api/stats', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stats: updatedStats }),
    }).catch(() => {});
  };

  // Handler: Student/User Login, Registration, Forgot Password, or Reset
  const handleUserAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    if (authMode === 'forgot') {
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setAuthSuccessMsg(data.message || 'Password reset link sent to your email.');
        } else {
          setAuthError(data.error || 'Failed to dispatch password reset.');
        }
      } catch {
        setAuthError('Unable to reach authentication server.');
      }
      return;
    }

    if (authMode === 'reset') {
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: authResetToken, newPassword: authPassword }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setAuthSuccessMsg('Password updated successfully! Please sign in with your new credentials.');
          setAuthMode('login');
          setAuthPassword('');
          navigate(location.pathname, { replace: true });
        } else {
          setAuthError(data.error || 'Password reset failed.');
        }
      } catch {
        setAuthError('Unable to reach authentication server.');
      }
      return;
    }

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: authUsername,
          username: authUsername,
          email: authEmail || undefined,
          password: authPassword,
          displayName: authDisplayName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
        try {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
        } catch {}
        setAuthToken(data.token);
        setCurrentUser(data.user);
        if (data.stats) setStats(data.stats);
        if (data.user.role === 'admin' || data.user.role === 'superadmin') {
          setIsAdmin(true);
          setIsViewingAsStudent(false);
          setActiveTab('admin');
          window.history.pushState(null, '', '/admin');
        } else {
          setIsAdmin(false);
          setIsViewingAsStudent(false);
          if (activeTab === 'admin') {
            window.history.replaceState(null, '', '/');
            setActiveTab('home');
          }
        }
        setIsAuthModalOpen(false);
        setAuthPassword('');
      } else {
        setAuthError(data.error || 'Authentication failed.');
      }
    } catch {
      setAuthError('Unable to reach authentication server.');
    }
  };

  const handleLogout = () => {
    if (authToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    setAuthToken(null);
    setCurrentUser(null);
    setIsAdmin(false);
    setIsViewingAsStudent(false);
    if (activeTab === 'admin') {
      window.history.replaceState(null, '', '/');
      setActiveTab('home');
    }
  };

  // Handler: Toggle Bookmark
  const handleToggleBookmark = (id: string) => {
    setStats((prev) => {
      const exists = prev.bookmarkedIds.includes(id);
      const next: UserStats = {
        ...prev,
        bookmarkedIds: exists
          ? prev.bookmarkedIds.filter((bId) => bId !== id)
          : [...prev.bookmarkedIds, id],
      };
      persistStatsToServer(next);
      return next;
    });
  };

  // Helper to compute updated streak days and lastActiveDate
  const computeUpdatedStreak = (prev: UserStats): { streakDays: number; lastActiveDate: string } => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

    if (prev.lastActiveDate === todayStr) {
      return { streakDays: Math.max(1, prev.streakDays), lastActiveDate: todayStr };
    }
    if (prev.lastActiveDate === yesterdayStr) {
      return { streakDays: (prev.streakDays || 0) + 1, lastActiveDate: todayStr };
    }
    return { streakDays: 1, lastActiveDate: todayStr };
  };

  // Handler: Record practice question answer
  const handleRecordAnswer = (question: MCQQuestion, selected: string, isCorrect: boolean) => {
    setStats((prev) => {
      const prevSub = prev.subjectPerformance[question.subject] || { answered: 0, correct: 0 };
      const updatedSubjectPerformance = {
        ...prev.subjectPerformance,
        [question.subject]: {
          answered: prevSub.answered + 1,
          correct: prevSub.correct + (isCorrect ? 1 : 0),
        },
      };

      const prevTop = (prev.topicPerformance || {})[question.topic] || { answered: 0, correct: 0 };
      const updatedTopicPerformance = {
        ...(prev.topicPerformance || {}),
        [question.topic]: {
          answered: prevTop.answered + 1,
          correct: prevTop.correct + (isCorrect ? 1 : 0),
        },
      };

      // Add to revision queue if wrong, remove if correct
      let newRevision = [...prev.revisionQueueIds];
      if (!isCorrect && !newRevision.includes(question.id)) {
        newRevision.push(question.id);
      } else if (isCorrect && newRevision.includes(question.id)) {
        newRevision = newRevision.filter((id) => id !== question.id);
      }

      const streakInfo = computeUpdatedStreak(prev);

      const next: UserStats = {
        ...prev,
        totalAnswered: prev.totalAnswered + 1,
        totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
        streakDays: streakInfo.streakDays,
        lastActiveDate: streakInfo.lastActiveDate,
        subjectPerformance: updatedSubjectPerformance,
        topicPerformance: updatedTopicPerformance,
        revisionQueueIds: newRevision,
      };
      persistStatsToServer(next);
      return next;
    });
  };

  // Handler: Complete Exam
  const handleCompleteExam = (
    result: {
      title: string;
      score: number;
      total: number;
      timeSpentSeconds: number;
      passed: boolean;
    },
    gradedQuestions?: MCQQuestion[],
    userAnswers?: Record<string, string>
  ) => {
    setStats((prev) => {
      const updatedSubjectPerformance = { ...prev.subjectPerformance };
      const updatedTopicPerformance = { ...(prev.topicPerformance || {}) };
      let newRevision = [...prev.revisionQueueIds];

      if (gradedQuestions && userAnswers) {
        for (const q of gradedQuestions) {
          const picked = userAnswers[q.id];
          const isCorrect = Boolean(picked && picked === q.correctAnswer);

          const prevSub = updatedSubjectPerformance[q.subject] || { answered: 0, correct: 0 };
          updatedSubjectPerformance[q.subject] = {
            answered: prevSub.answered + 1,
            correct: prevSub.correct + (isCorrect ? 1 : 0),
          };

          const prevTop = updatedTopicPerformance[q.topic] || { answered: 0, correct: 0 };
          updatedTopicPerformance[q.topic] = {
            answered: prevTop.answered + 1,
            correct: prevTop.correct + (isCorrect ? 1 : 0),
          };

          if (!isCorrect && !newRevision.includes(q.id)) {
            newRevision.push(q.id);
          } else if (isCorrect && newRevision.includes(q.id)) {
            newRevision = newRevision.filter((id) => id !== q.id);
          }
        }
      }

      const streakInfo = computeUpdatedStreak(prev);

      const next: UserStats = {
        ...prev,
        totalAnswered: prev.totalAnswered + result.total,
        totalCorrect: prev.totalCorrect + result.score,
        streakDays: streakInfo.streakDays,
        lastActiveDate: streakInfo.lastActiveDate,
        subjectPerformance: updatedSubjectPerformance,
        topicPerformance: updatedTopicPerformance,
        revisionQueueIds: newRevision,
        examRecords: [
          {
            id: `exam-${Date.now()}`,
            date: new Date().toISOString(),
            ...result,
          },
          ...prev.examRecords,
        ],
      };
      persistStatsToServer(next);
      return next;
    });
  };

  // Handler: Submit Question Report
  const handleSubmitReport = (
    questionId: string,
    questionCode: string,
    reason: any,
    details: string
  ) => {
    const newReport: QuestionReport = {
      id: `rep-${Date.now()}`,
      questionId,
      questionCode,
      reason,
      details,
      submittedAt: new Date().toISOString(),
      status: 'Pending',
    };
    setReports((prev) => [newReport, ...prev]);

    fetch('/api/report-question', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ questionId, questionCode, reason, details }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.reports)) {
          setReports(data.reports);
        }
      })
      .catch(() => {});
  };

  // Handler: Question Bank Modifications (Persisted to SQLite Backend with Admin Auth)
  const handleSaveQuestion = (savedQ: MCQQuestion) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === savedQ.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedQ;
        return next;
      }
      return [savedQ, ...prev];
    });

    fetch('/api/questions', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ question: savedQ }),
    }).catch(() => {});
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    fetch(`/api/questions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).catch(() => {});
  };

  // Bulk delete with single transactional server request
  const handleBulkDeleteQuestions = (ids: string[]): boolean => {
    if (ids.length === 0) return false;
    const idSet = new Set(ids);
    setQuestions((prev) => prev.filter((q) => !idSet.has(q.id)));
    fetch('/api/questions/bulk-delete', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    }).catch(() => {});
    return true;
  };

  // Bulk save (edit) existing questions in one request without touching staging drafts
  const handleBulkSaveQuestions = (updatedItems: MCQQuestion[]) => {
    if (updatedItems.length === 0) return;
    const byId = new Map(updatedItems.map((q) => [q.id, q]));
    setQuestions((prev) => prev.map((q) => byId.get(q.id) || q));
    fetch('/api/questions/bulk-upsert', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ questions: updatedItems }),
    }).catch(() => {});
  };

  const handleBulkUpdateStatus = (ids: string[], newStatus: QuestionStatus) => {
    const timestamp = new Date().toISOString();
    setQuestions((prev) =>
      prev.map((q) => {
        if (ids.includes(q.id)) {
          return {
            ...q,
            status: newStatus,
            updatedAt: timestamp,
            versionHistory: [
              ...q.versionHistory,
              {
                timestamp,
                author: 'Administrator',
                action: `Bulk status update to ${newStatus}`,
              },
            ],
          };
        }
        return q;
      })
    );

    fetch('/api/questions/bulk-status', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids, status: newStatus }),
    }).catch(() => {});
  };

  const handleImportBulkQuestions = (newItems: MCQQuestion[]) => {
    setQuestions((prev) => [...newItems, ...prev]);

    fetch('/api/questions/bulk-import', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ questions: newItems }),
    }).catch(() => {});
  };

  const handleUpdateCategories = (updatedCategories: UnitCategory[]) => {
    setCategories(updatedCategories);
    fetch('/api/categories', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ categories: updatedCategories }),
    }).catch(() => {});
  };

  const handleResolveReport = (
    reportId: string,
    status: 'Pending' | 'Investigating' | 'Resolved' = 'Resolved'
  ) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status } : r))
    );
    fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    }).catch(() => {});
  };

  // Daily Question is deterministic based on current day of year among published questions
  const publishedList = questions.filter((q) => q.status === 'Published');
  const dayIndex = Math.floor(Date.now() / 86400000) % Math.max(1, publishedList.length);
  const dailyQuestion = publishedList[dayIndex] || INITIAL_QUESTIONS[0];

  // Standalone Admin Console Mode (no student navbar, student tabs, or student footer)
  if (activeTab === 'admin' && !isViewingAsStudent) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<RouteLoadingFallback label="Loading Administrative Console..." />}>
          <AdminPortal
            questions={questions}
            categories={categories}
            reports={reports}
            onSaveQuestion={handleSaveQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onBulkDeleteQuestions={handleBulkDeleteQuestions}
            onBulkSaveQuestions={handleBulkSaveQuestions}
            onBulkUpdateStatus={handleBulkUpdateStatus}
            onUpdateCategories={handleUpdateCategories}
            onImportBulkQuestions={handleImportBulkQuestions}
            onResolveReport={handleResolveReport}
            isAdminAuthenticated={isAdmin || currentUser?.role === 'admin' || currentUser?.role === 'superadmin'}
            authToken={authToken}
            currentUser={currentUser}
            onAdminAuthChange={(authenticated, token, user) => {
              setIsAdmin(authenticated);
              if (token) {
                localStorage.setItem(STORAGE_KEY_TOKEN, token);
                setAuthToken(token);
                if (user) {
                  try {
                    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
                  } catch {}
                  setCurrentUser(user);
                }
              } else if (!authenticated) {
                handleLogout();
              }
            }}
            onViewAsStudent={() => {
              setIsViewingAsStudent(true);
              navigate('/');
            }}
            onExitAdminLogin={() => {
              navigate('/');
            }}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-cyan-100 selection:text-cyan-950 relative overflow-x-hidden">
      {/* Liquid glass ambient background meshes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-32 left-1/4 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-cyan-200/20 via-teal-100/15 to-transparent blur-3xl opacity-70" />
        <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-cyan-100/20 via-sky-100/15 to-transparent blur-3xl opacity-60" />
        <div className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-slate-200/30 via-cyan-100/20 to-transparent blur-3xl opacity-50" />
      </div>

      {/* Skip to Main Content Link for Keyboard and Screen Reader Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-600 focus:text-white focus:font-semibold focus:text-xs focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-300"
      >
        Skip to main content
      </a>

      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDailyQuestion={() => setIsDailyQuestionOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalQuestionCount={questions.length}
        currentUser={currentUser}
        isAdmin={isAdmin || currentUser?.role === 'admin' || currentUser?.role === 'superadmin'}
        onReturnToAdmin={() => {
          setIsViewingAsStudent(false);
          navigate('/admin');
        }}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area with React Router */}
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10 focus:outline-none">
        <ErrorBoundary>
          <Suspense fallback={<RouteLoadingFallback label="Loading page..." />}>
            <Routes>
            <Route
              path="/"
            element={
              <HomeView
                categories={categories}
                questions={questions}
                onNavigateTab={setActiveTab}
                onOpenDailyQuestion={() => setIsDailyQuestionOpen(true)}
                onSelectUnit={(unitName) => {
                  setSelectedBrowseUnit(unitName);
                  navigate(`/browse?unit=${encodeURIComponent(unitName)}`);
                }}
                onSelectExam={(exam) => {
                  setSelectedExamCategory(exam);
                  navigate(`/exam?exam=${encodeURIComponent(exam)}`);
                }}
              />
            }
          />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route
            path="/browse"
            element={
              <BrowseQuestionBank
                questions={questions}
                bookmarkedIds={stats.bookmarkedIds}
                onToggleBookmark={handleToggleBookmark}
                onReportQuestion={(q) => setReportingQuestion(q)}
                onStartPracticeWithFilter={(unit, exam, customQuestions) => {
                  setSelectedPracticeUnit(unit);
                  setSelectedPracticeExam(exam);
                  if (customQuestions && customQuestions.length > 0) {
                    setCustomPracticeSubset(customQuestions);
                  }
                  const params = new URLSearchParams();
                  if (unit && unit !== 'All') params.set('unit', unit);
                  if (exam) params.set('exam', exam);
                  const qs = params.toString();
                  navigate(qs ? `/practice?${qs}` : '/practice');
                }}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                initialUnit={queryUnit || selectedBrowseUnit}
              />
            }
          />
          <Route
            path="/practice"
            element={
              <PracticeMode
                questions={questions}
                bookmarkedIds={stats.bookmarkedIds}
                onToggleBookmark={handleToggleBookmark}
                onReportQuestion={(q) => setReportingQuestion(q)}
                onRecordAnswer={handleRecordAnswer}
                customSubset={customPracticeSubset}
                onClearCustomSubset={() => setCustomPracticeSubset(null)}
                initialUnit={queryUnit || selectedPracticeUnit}
                initialExam={queryExam || selectedPracticeExam}
              />
            }
          />
          <Route
            path="/exam"
            element={
              <ExamMode
                questions={questions}
                onCompleteExam={handleCompleteExam}
                onBookmarkQuestion={handleToggleBookmark}
                bookmarkedIds={stats.bookmarkedIds}
                initialExamCategory={queryExam || selectedExamCategory}
              />
            }
          />
          <Route
            path="/dashboard"
            element={
              <UserDashboard
                stats={stats}
                questions={questions}
                onStartPracticeWithQuestions={(customSubset) => {
                  setCustomPracticeSubset(customSubset);
                  navigate('/practice');
                }}
                onRemoveBookmark={handleToggleBookmark}
                onClearRevisionItem={(id) => {
                  setStats((prev) => {
                    const next = {
                      ...prev,
                      revisionQueueIds: prev.revisionQueueIds.filter((rId) => rId !== id),
                    };
                    persistStatsToServer(next);
                    return next;
                  });
                }}
                currentUser={currentUser}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                authToken={authToken}
                onLogout={handleLogout}
              />
            }
          />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  </main>

      {/* Global Modals */}
      <DailyQuestionModal
        question={dailyQuestion}
        isOpen={isDailyQuestionOpen}
        onClose={() => setIsDailyQuestionOpen(false)}
        onBookmark={handleToggleBookmark}
        isBookmarked={dailyQuestion ? stats.bookmarkedIds.includes(dailyQuestion.id) : false}
        onReportQuestion={(q) => setReportingQuestion(q)}
        onRecordAnswer={handleRecordAnswer}
      />

      <ReportModal
        question={reportingQuestion}
        isOpen={!!reportingQuestion}
        onClose={() => setReportingQuestion(null)}
        onSubmitReport={handleSubmitReport}
      />

      {/* Student / User Account Sign In & Registration Modal */}
      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthError('');
          setAuthSuccessMsg('');
        }}
        titleId="auth-modal-title"
        maxWidth="max-w-sm"
      >
        <div className="glass-panel w-full rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto border border-white/80 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                <UserCheck className="w-4 h-4 text-cyan-700" />
              </div>
              <h3 id="auth-modal-title" className="font-semibold text-slate-900 text-sm">
                {authMode === 'login'
                  ? 'Sign In to MedLab QBank'
                  : authMode === 'register'
                  ? 'Create Candidate Account'
                  : authMode === 'forgot'
                  ? 'Recover Account Password'
                  : 'Set New Password'}
              </h3>
            </div>
            <button
              onClick={() => {
                setIsAuthModalOpen(false);
                setAuthError('');
                setAuthSuccessMsg('');
              }}
              aria-label="Close dialog"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

            {(authMode === 'login' || authMode === 'register') && (
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl text-xs border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthSuccessMsg('');
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-medium cursor-pointer transition-all ${
                    authMode === 'login' ? 'bg-white text-cyan-950 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                    setAuthSuccessMsg('');
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-medium cursor-pointer transition-all ${
                    authMode === 'register' ? 'bg-white text-cyan-950 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register Account
                </button>
              </div>
            )}

            {authMode === 'login' && (
              <p className="text-[11px] text-slate-500 text-center">
                Unified login for student study profiles and staff administrative consoles.
              </p>
            )}

            {authMode === 'forgot' && (
              <p className="text-[11px] text-slate-600 leading-relaxed text-center">
                Enter your registered email address and we'll dispatch a secure password reset link via Resend.
              </p>
            )}

            {authSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
                {authSuccessMsg}
              </div>
            )}

            <form onSubmit={handleUserAuthSubmit} className="space-y-3 text-xs sm:text-sm">
              {authMode === 'register' && (
                <>
                  <div>
                    <label htmlFor="auth-register-displayname" className="block font-semibold text-slate-700 mb-1">
                      Full Name / Display Name
                    </label>
                    <input
                      id="auth-register-displayname"
                      type="text"
                      required
                      aria-required="true"
                      aria-invalid={authError ? 'true' : undefined}
                      aria-describedby={authError ? 'auth-error-msg' : undefined}
                      value={authDisplayName}
                      onChange={(e) => setAuthDisplayName(e.target.value)}
                      placeholder="e.g. Dr. A. Sharma"
                      className="w-full bg-white/80 border border-slate-200/90 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-xs sm:text-sm shadow-2xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="auth-register-email" className="block font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      id="auth-register-email"
                      type="email"
                      required
                      aria-required="true"
                      aria-invalid={authError ? 'true' : undefined}
                      aria-describedby={authError ? 'auth-error-msg auth-email-hint' : 'auth-email-hint'}
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="e.g. candidate@university.edu"
                      className="w-full bg-white/80 border border-slate-200/90 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-xs sm:text-sm shadow-2xs"
                    />
                    <span id="auth-email-hint" className="text-[10px] text-slate-500 mt-0.5 block">
                      Used for progress synchronization, receipts, and password recovery.
                    </span>
                  </div>
                </>
              )}

              {authMode === 'forgot' && (
                <div>
                  <label htmlFor="auth-forgot-email" className="block font-semibold text-slate-700 mb-1">
                    Account Email Address
                  </label>
                  <input
                    id="auth-forgot-email"
                    type="email"
                    required
                    aria-required="true"
                    aria-invalid={authError ? 'true' : undefined}
                    aria-describedby={authError ? 'auth-error-msg' : undefined}
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Enter your registered email..."
                    className="w-full bg-white/80 border border-slate-200/90 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-xs sm:text-sm shadow-2xs"
                  />
                </div>
              )}

              {(authMode === 'login' || authMode === 'register') && (
                <div>
                  <label htmlFor="auth-username" className="block font-semibold text-slate-700 mb-1">
                    {authMode === 'login' ? 'Username or Email Address' : 'Unique Username'}
                  </label>
                  <input
                    id="auth-username"
                    type="text"
                    required
                    aria-required="true"
                    aria-invalid={authError ? 'true' : undefined}
                    aria-describedby={authError ? 'auth-error-msg' : undefined}
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder={authMode === 'login' ? 'Enter username or email address...' : 'Choose a unique username...'}
                    className="w-full bg-white/80 border border-slate-200/90 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-xs sm:text-sm shadow-2xs"
                  />
                </div>
              )}

              {(authMode === 'login' || authMode === 'register' || authMode === 'reset') && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="auth-password" className="font-semibold text-slate-700">
                      {authMode === 'reset' ? 'New Password' : 'Password'}
                    </label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot');
                          setAuthError('');
                          setAuthSuccessMsg('');
                        }}
                        className="text-[11px] text-cyan-700 hover:text-cyan-900 font-medium cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    aria-required="true"
                    aria-invalid={authError ? 'true' : undefined}
                    aria-describedby={authError ? 'auth-error-msg' : undefined}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder={authMode === 'reset' ? 'Enter new password (min. 4 characters)...' : 'Enter password...'}
                    className="w-full bg-white/80 border border-slate-200/90 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-xs sm:text-sm shadow-2xs"
                  />
                </div>
              )}

              {authError && (
                <p id="auth-error-msg" role="alert" aria-live="polite" className="text-rose-700 text-xs font-medium">
                  {authError}
                </p>
              )}

              {authMode === 'register' && (
                <p className="text-[11px] text-slate-500 text-center leading-normal">
                  By creating an account you agree to the{' '}
                  <Link
                    to="/terms"
                    className="text-cyan-700 hover:text-cyan-900 underline font-medium"
                    onClick={() => setIsAuthModalOpen(false)}
                  >
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link
                    to="/privacy"
                    className="text-cyan-700 hover:text-cyan-900 underline font-medium"
                    onClick={() => setIsAuthModalOpen(false)}
                  >
                    Privacy Policy
                  </Link>.
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-cyan-700 to-teal-700 hover:from-cyan-800 hover:to-teal-800 text-white font-medium rounded-lg transition-all cursor-pointer text-xs sm:text-sm shadow-xs"
              >
                {authMode === 'login'
                  ? 'Sign In & Continue'
                  : authMode === 'register'
                  ? 'Create Candidate Account'
                  : authMode === 'forgot'
                  ? 'Send Reset Link via Resend'
                  : 'Save New Password & Continue'}
              </button>

              {(authMode === 'forgot' || authMode === 'reset') && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                      setAuthSuccessMsg('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              )}
            </form>
          </div>
        </Modal>

      {/* Footer */}
      <footer className="glass-nav py-6 text-xs text-slate-500 mt-auto relative z-10 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-center sm:text-left">
            <span className="font-semibold text-slate-900 dark:text-white">MedLab QBank</span>
            <span aria-hidden="true">·</span>
            <span>Laboratory Medicine Examination Platform</span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 text-slate-500 dark:text-slate-400">
            <Link to="/privacy" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition">Terms of Service</Link>
            <Link to="/disclaimer" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition">Disclaimer</Link>
            <Link to="/contact" className="hover:text-cyan-700 dark:hover:text-cyan-400 transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
