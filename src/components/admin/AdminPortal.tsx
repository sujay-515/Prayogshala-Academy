import React, { useState, useEffect } from 'react';
import {
  Lock,
  LogOut,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import { MCQQuestion, UnitCategory, QuestionStatus, QuestionReport, UserAccount } from '../../types';
import { AdminDashboard } from './AdminDashboard';
import { PdfImportWorkflow } from './PdfImportWorkflow';
import { ManualQuestionManager } from './ManualQuestionManager';
import { CategoryManager } from './CategoryManager';
import { BulkImportExport } from './BulkImportExport';
import { ReportsManager } from './ReportsManager';
import { UserManager } from './UserManager';

interface AdminPortalProps {
  questions: MCQQuestion[];
  categories: UnitCategory[];
  reports: QuestionReport[];
  onSaveQuestion: (question: MCQQuestion) => void;
  onDeleteQuestion: (id: string) => void;
  onBulkDeleteQuestions: (ids: string[]) => boolean;
  onBulkSaveQuestions: (questions: MCQQuestion[]) => void;
  onBulkUpdateStatus: (ids: string[], newStatus: QuestionStatus) => void;
  onUpdateCategories: (categories: UnitCategory[]) => void;
  onImportBulkQuestions: (newQuestions: MCQQuestion[]) => void;
  onResolveReport: (reportId: string, status?: 'Pending' | 'Investigating' | 'Resolved') => void;
  isAdminAuthenticated?: boolean;
  authToken?: string | null;
  currentUser?: UserAccount | null;
  onAdminAuthChange?: (authenticated: boolean, token?: string, user?: any) => void;
  onViewAsStudent?: () => void;
  onExitAdminLogin?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  questions,
  categories,
  reports,
  onSaveQuestion,
  onDeleteQuestion,
  onBulkDeleteQuestions,
  onBulkSaveQuestions,
  onBulkUpdateStatus,
  onUpdateCategories,
  onImportBulkQuestions,
  onResolveReport,
  isAdminAuthenticated = false,
  authToken,
  currentUser,
  onAdminAuthChange,
  onViewAsStudent,
  onExitAdminLogin,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isAdminAuthenticated);
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  useEffect(() => {
    setIsAuthenticated(isAdminAuthenticated);
  }, [isAdminAuthenticated]);

  const [activeSubtab, setActiveSubtab] = useState<
    'dashboard' | 'pdf' | 'manual' | 'categories' | 'bulk' | 'reports' | 'users'
  >(() => {
    try {
      const saved = localStorage.getItem('medlab_admin_subtab');
      if (saved && ['dashboard', 'pdf', 'manual', 'categories', 'bulk', 'reports', 'users'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'dashboard';
  });

  const handleSubtabChange = (subtab: 'dashboard' | 'pdf' | 'manual' | 'categories' | 'bulk' | 'reports' | 'users') => {
    setActiveSubtab(subtab);
    try {
      localStorage.setItem('medlab_admin_subtab', subtab);
    } catch {}
  };
  const [editingQuestionFromReport, setEditingQuestionFromReport] = useState<MCQQuestion | null>(null);

  const pendingReportsCount = reports.filter((r) => r.status === 'Pending').length;

  const handleRenameCategoryEntity = (
    type: 'unit' | 'subject' | 'topic',
    oldName: string,
    newName: string
  ) => {
    const timestamp = new Date().toISOString();
    const renamed = questions
      .filter((q) => q[type] === oldName)
      .map((q) => ({
        ...q,
        [type]: newName,
        updatedAt: timestamp,
      }));
    onBulkSaveQuestions(renamed);
  };

  const authenticateWithServer = async (username: string, password: string) => {
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: username || 'admin', password }),
      });
      const data = await res.json();
      if (res.ok && data.success && (data.user?.role === 'admin' || data.user?.role === 'superadmin')) {
        setIsAuthenticated(true);
        setPasswordInput('');
        onAdminAuthChange?.(true, data.token, data.user);
      } else {
        setAuthError(data.error || 'Restricted access: Invalid administrator credentials.');
      }
    } catch {
      setAuthError('Unable to reach authentication server. Please verify the backend is running.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    authenticateWithServer(usernameInput, passwordInput);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    onAdminAuthChange?.(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="w-full max-w-sm p-6 sm:p-7 glass-panel rounded-2xl shadow-2xl space-y-4 relative z-10 border border-white/80">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200/80">
            <div className="w-7 h-7 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
              <Lock className="w-4 h-4 text-cyan-700" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Staff administration console</h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Authorized laboratory administrators only. Enter your credentials to access the question bank management and PDF ingestion system.
          </p>

          <form onSubmit={handleLogin} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Administrator ID or Email</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Username or staff email..."
                className="w-full bg-white/80 text-xs sm:text-sm text-slate-900 rounded-lg px-3 py-2 border border-slate-200/90 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Passkey</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter administrator password..."
                className="w-full bg-white/80 text-xs sm:text-sm text-slate-900 rounded-lg px-3 py-2 border border-slate-200/90 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 shadow-2xs"
              />
            </div>
            {authError && <p className="text-xs text-rose-600 text-center">{authError}</p>}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2 bg-gradient-to-r from-cyan-700 to-teal-700 hover:from-cyan-800 hover:to-teal-800 disabled:opacity-50 text-white font-medium text-xs sm:text-sm rounded-lg transition-all cursor-pointer shadow-xs"
            >
              {isLoggingIn ? 'Authenticating...' : 'Sign in to admin console'}
            </button>
          </form>

          {onExitAdminLogin && (
            <div className="pt-3 border-t border-slate-200/60 text-center">
              <button
                onClick={onExitAdminLogin}
                className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Return to student portal</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Dedicated Standalone Admin Top Navbar */}
      <header className="bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800/80 sticky top-0 z-40 w-full">

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-14 py-2 sm:py-0 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm tracking-tight text-white">
                MedLab QBank Admin Console
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                SQLite Connected
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onViewAsStudent && (
              <button
                onClick={onViewAsStudent}
                className="px-2.5 sm:px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Preview the live student portal to test published questions and categories"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>View as Student</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="px-2.5 sm:px-3 py-1.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sign out of Admin Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Admin Sub-Navigation Bar */}
        <div className="bg-slate-950/60 backdrop-blur-md border-t border-slate-800/80 px-3 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
            <button
              onClick={() => handleSubtabChange('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeSubtab === 'dashboard'
                  ? 'bg-cyan-700 text-white font-semibold shadow-2xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              Overview Dashboard
            </button>

            <button
              onClick={() => handleSubtabChange('pdf')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeSubtab === 'pdf'
                  ? 'bg-cyan-700 text-white font-semibold shadow-2xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              PDF Ingestion Pipeline
            </button>

            <button
              onClick={() => handleSubtabChange('manual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeSubtab === 'manual'
                  ? 'bg-cyan-700 text-white font-semibold shadow-2xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              Question Bank ({questions.length})
            </button>

            <button
              onClick={() => handleSubtabChange('categories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeSubtab === 'categories'
                  ? 'bg-cyan-700 text-white font-semibold shadow-2xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              Category Hierarchy
            </button>

            <button
              onClick={() => handleSubtabChange('bulk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeSubtab === 'bulk'
                  ? 'bg-cyan-700 text-white font-semibold shadow-2xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              Bulk CSV/JSON & Backup
            </button>

            <button
              onClick={() => handleSubtabChange('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeSubtab === 'reports'
                  ? 'bg-cyan-700 text-white font-semibold shadow-2xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              Student Reports {pendingReportsCount > 0 && `(${pendingReportsCount})`}
            </button>

            <button
              onClick={() => handleSubtabChange('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeSubtab === 'users'
                  ? 'bg-cyan-700 text-white font-semibold shadow-2xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              Staff & Users
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Subtab View */}
      {activeSubtab === 'dashboard' && (
        <AdminDashboard
          questions={questions}
          categories={categories}
          onNavigateSubtab={handleSubtabChange}
          pendingReportsCount={pendingReportsCount}
        />
      )}

      {activeSubtab === 'pdf' && (
        <PdfImportWorkflow
          existingQuestions={questions}
          categories={categories}
          onImportApprovedQuestions={onImportBulkQuestions}
          authToken={authToken}
        />
      )}

      {activeSubtab === 'manual' && (
        <ManualQuestionManager
          questions={questions}
          categories={categories}
          onSaveQuestion={onSaveQuestion}
          onDeleteQuestion={onDeleteQuestion}
          onBulkDeleteQuestions={onBulkDeleteQuestions}
          onBulkSaveQuestions={onBulkSaveQuestions}
          onBulkUpdateStatus={onBulkUpdateStatus}
          initialEditingQuestion={editingQuestionFromReport}
          onClearInitialEditingQuestion={() => setEditingQuestionFromReport(null)}
        />
      )}

      {activeSubtab === 'categories' && (
        <CategoryManager
          categories={categories}
          onUpdateCategories={onUpdateCategories}
          onRenameCategoryEntity={handleRenameCategoryEntity}
        />
      )}

      {activeSubtab === 'bulk' && (
        <BulkImportExport
          questions={questions}
          categories={categories}
          onImportBulkQuestions={onImportBulkQuestions}
          authToken={authToken}
        />
      )}

      {activeSubtab === 'reports' && (
        <ReportsManager
          reports={reports}
          questions={questions}
          onResolveReport={onResolveReport}
          onEditQuestion={(q) => {
            setEditingQuestionFromReport(q);
            handleSubtabChange('manual');
          }}
        />
      )}

      {activeSubtab === 'users' && (
        <UserManager
          currentUser={currentUser}
          authToken={authToken}
        />
      )}
      </main>
    </div>
  );
};
