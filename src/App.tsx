import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/home/HomeView';
import { BrowseQuestionBank } from './components/browse/BrowseQuestionBank';
import { PracticeMode } from './components/practice/PracticeMode';
import { ExamMode } from './components/exam/ExamMode';
import { UserDashboard } from './components/dashboard/UserDashboard';
import { AdminPortal } from './components/admin/AdminPortal';
import { DailyQuestionModal } from './components/DailyQuestionModal';
import { ReportModal } from './components/ReportModal';
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
} from './types';
import { X, UserCheck } from 'lucide-react';

const STORAGE_KEY_QUESTIONS = 'medlab_qbank_questions_v2';
const STORAGE_KEY_CATEGORIES = 'medlab_qbank_categories_v2';
const STORAGE_KEY_STATS = 'medlab_qbank_stats_v2';
const STORAGE_KEY_REPORTS = 'medlab_qbank_reports_v2';
const STORAGE_KEY_TOKEN = 'medlab_qbank_auth_token_v1';
const STORAGE_KEY_USER = 'medlab_qbank_current_user_v1';

// Purge legacy temporary seed and test data from localStorage
try {
  localStorage.removeItem('medlab_qbank_questions_v1');
  localStorage.removeItem('medlab_qbank_stats_v1');
  localStorage.removeItem('medlab_qbank_reports_v1');
  localStorage.removeItem(STORAGE_KEY_QUESTIONS);
  localStorage.removeItem(STORAGE_KEY_REPORTS);
} catch {
  // Ignore storage errors
}

export default function App() {
  // Navigation & Role - Admin mode is isolated to direct URL path (/admin)
  const [activeTab, setActiveTab] = useState<'home' | 'browse' | 'practice' | 'exam' | 'dashboard' | 'admin'>(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (path.startsWith('/admin') || hash === '#admin' || search.includes('admin=1')) {
      return 'admin';
    }
    return 'home';
  });

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
        return u?.role === 'admin';
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
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authError, setAuthError] = useState('');

  // Primary Data Stores (hydrated from SQLite backend via /api/bootstrap with localStorage fallback)
  const [questions, setQuestions] = useState<MCQQuestion[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_QUESTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_QUESTIONS.length) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load stored questions:', e);
    }
    return INITIAL_QUESTIONS;
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

  // Synchronize browser URL address bar with activeTab state (/admin for admin portal, / for students)
  useEffect(() => {
    if (activeTab === 'admin' && !isViewingAsStudent) {
      if (window.location.pathname !== '/admin') {
        window.history.pushState(null, '', '/admin' + (window.location.hash || ''));
      }
    } else {
      if (window.location.pathname === '/admin') {
        window.history.pushState(null, '', '/');
      }
    }
  }, [activeTab, isViewingAsStudent]);

  // Support direct URL address bar navigation and browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.startsWith('/admin') || hash === '#admin') {
        setIsViewingAsStudent(false);
        setActiveTab('admin');
      } else if (activeTab === 'admin') {
        setActiveTab('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);

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
          if (data.stats) setStats(data.stats);
          if (data.user) {
            setCurrentUser(data.user);
            try {
              localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
            } catch {}
            if (data.user.role === 'admin') setIsAdmin(true);
          } else if (authToken) {
            handleLogout();
          }
        }
      })
      .catch(() => {
        // Offline fallback uses localStorage state
      });
  }, [authToken]);

  // Keep lightweight localStorage offline cache synchronized (capped at 100 items without heavy base64 images)
  useEffect(() => {
    try {
      const lightweightCache = questions.slice(0, 100).map((q) =>
        q.imageUrl && q.imageUrl.startsWith('data:') && q.imageUrl.length > 2048
          ? { ...q, imageUrl: undefined }
          : q
      );
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

  // Helper to persist stats to SQLite backend
  const persistStatsToServer = (updatedStats: UserStats) => {
    fetch('/api/stats', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stats: updatedStats }),
    }).catch(() => {});
  };

  // Handler: Student/User Login or Registration
  const handleUserAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUsername,
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
        if (data.user.role === 'admin') {
          setIsAdmin(true);
          // Public student sign-in modal does NOT switch the user to the admin console.
          // Staff administration console is strictly accessed by direct URL (/admin).
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
        isAdminAuthenticated={isAdmin || currentUser?.role === 'admin'}
        authToken={authToken}
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
          window.history.replaceState(null, '', '/');
          setActiveTab('home');
        }}
        onExitAdminLogin={() => {
          window.history.replaceState(null, '', '/');
          setActiveTab('home');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-cyan-100 selection:text-cyan-950">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDailyQuestion={() => setIsDailyQuestionOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalQuestionCount={questions.length}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {activeTab === 'home' && (
          <HomeView
            categories={categories}
            questions={questions}
            onNavigateTab={setActiveTab}
            onOpenDailyQuestion={() => setIsDailyQuestionOpen(true)}
            onSelectUnit={(unitName) => {
              setSelectedBrowseUnit(unitName);
              setActiveTab('browse');
            }}
            onSelectExam={(exam) => {
              setSelectedExamCategory(exam);
              setActiveTab('exam');
            }}
          />
        )}

        {activeTab === 'browse' && (
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
              setActiveTab('practice');
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            initialUnit={selectedBrowseUnit}
          />
        )}

        {activeTab === 'practice' && (
          <PracticeMode
            questions={questions}
            bookmarkedIds={stats.bookmarkedIds}
            onToggleBookmark={handleToggleBookmark}
            onReportQuestion={(q) => setReportingQuestion(q)}
            onRecordAnswer={handleRecordAnswer}
            customSubset={customPracticeSubset}
            onClearCustomSubset={() => setCustomPracticeSubset(null)}
            initialUnit={selectedPracticeUnit}
            initialExam={selectedPracticeExam}
          />
        )}

        {activeTab === 'exam' && (
          <ExamMode
            questions={questions}
            onCompleteExam={handleCompleteExam}
            onBookmarkQuestion={handleToggleBookmark}
            bookmarkedIds={stats.bookmarkedIds}
            initialExamCategory={selectedExamCategory}
          />
        )}

        {activeTab === 'dashboard' && (
          <UserDashboard
            stats={stats}
            questions={questions}
            onStartPracticeWithQuestions={(customSubset) => {
              setCustomPracticeSubset(customSubset);
              setActiveTab('practice');
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
          />
        )}
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
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-md p-5 sm:p-6 shadow-xl space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-700" />
                <h3 className="font-semibold text-slate-900 text-sm">
                  {authMode === 'login' ? 'Sign in to MedLab QBank' : 'Create student account'}
                </h3>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
                className={`flex-1 py-1.5 rounded font-medium cursor-pointer ${
                  authMode === 'login' ? 'bg-white text-cyan-950 font-semibold shadow-xs' : 'text-slate-600'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                }}
                className={`flex-1 py-1.5 rounded font-medium cursor-pointer ${
                  authMode === 'register' ? 'bg-white text-cyan-950 font-semibold shadow-xs' : 'text-slate-600'
                }`}
              >
                Register Account
              </button>
            </div>

            <form onSubmit={handleUserAuthSubmit} className="space-y-3 text-xs sm:text-sm">
              {authMode === 'register' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name / Display Name</label>
                  <input
                    type="text"
                    required
                    value={authDisplayName}
                    onChange={(e) => setAuthDisplayName(e.target.value)}
                    placeholder="e.g. Dr. A. Sharma"
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-xs sm:text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="Enter student username..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-xs sm:text-sm"
                />
              </div>

              {authError && <p className="text-rose-600 text-xs">{authError}</p>}

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md transition-colors cursor-pointer text-xs sm:text-sm shadow-xs"
              >
                {authMode === 'login' ? 'Sign In & Sync Progress' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Academic Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-center sm:text-left">
            <span className="font-semibold text-slate-900">MedLab QBank Diagnostic Platform</span>
            <span aria-hidden="true">·</span>
            <span>Laboratory Medicine & Pathology Licensing Repository</span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-4 text-slate-500 text-center sm:text-right">
            <span>CLSI & ISO 15189 Standards</span>
            <span aria-hidden="true">·</span>
            <span>ASCP / NHPC / PSC / DHA / AIMS Syllabi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
