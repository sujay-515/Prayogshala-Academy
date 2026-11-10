import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  FlaskConical,
  User,
  LogOut,
  X,
  ShieldCheck,
  Moon,
  Sun,
} from 'lucide-react';
import { UserAccount } from '../types';
import type { Theme } from '../utils/theme';

interface NavbarProps {
  activeTab: 'home' | 'browse' | 'practice' | 'exam' | 'cee-ug' | 'mistakes' | 'dashboard' | 'admin';
  setActiveTab: (tab: 'home' | 'browse' | 'practice' | 'exam' | 'cee-ug' | 'mistakes' | 'dashboard' | 'admin') => void;
  onOpenDailyQuestion: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  totalQuestionCount: number;
  currentUser?: UserAccount | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  isAdmin?: boolean;
  onReturnToAdmin?: () => void;
  theme?: Theme;
  onToggleTheme?: () => void;
  mistakeCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenDailyQuestion,
  searchQuery,
  setSearchQuery,
  totalQuestionCount,
  currentUser,
  onOpenAuthModal,
  onLogout,
  isAdmin = false,
  onReturnToAdmin,
  theme = 'light',
  onToggleTheme,
  mistakeCount = 0,
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <header className="glass-nav sticky top-0 z-40 w-full transition-all">
      {/* Brand accent stripe with specular refraction */}
      <div className="h-0.5 bg-gradient-to-r from-cyan-600 via-cyan-400 to-teal-500 w-full shadow-xs" />

      {/* Top quiet metadata line */}
      <div className="border-b border-slate-200/50 bg-white/40 px-3 sm:px-4 py-1.5 text-xs text-slate-500 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-slate-700 font-medium text-xs">
              {totalQuestionCount.toLocaleString()} Verified Questions
            </span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="hidden md:inline text-slate-500">ASCP · NHPC · PSC · DHA · AIMS</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={theme === 'dark'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="inline-flex items-center justify-center w-6 h-6 rounded-md text-slate-500 hover:text-cyan-700 hover:bg-white/60 transition-colors cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={onOpenDailyQuestion}
              className="text-xs text-slate-600 hover:text-cyan-800 transition-colors font-medium cursor-pointer"
            >
              Daily Question
            </button>
            <span className="text-slate-300">|</span>

            {currentUser ? (
              <div className="flex items-center gap-2">
                {isAdmin && onReturnToAdmin && (
                  <button
                    onClick={onReturnToAdmin}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-900 text-cyan-300 hover:bg-slate-800 hover:text-cyan-200 border border-cyan-500/40 shadow-2xs transition-all cursor-pointer"
                    title="Return to Staff Administration Console"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Admin Console</span>
                  </button>
                )}
                <span className="text-xs font-medium text-slate-800 flex items-center gap-1.5 truncate max-w-28 sm:max-w-none">
                  <User className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                  <span className="truncate">{currentUser.displayName}</span>
                  {currentUser.role === 'superadmin' ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 border border-cyan-400/30">
                      Head Admin
                    </span>
                  ) : currentUser.role === 'admin' ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 border border-cyan-200">
                      Staff
                    </span>
                  ) : null}
                </span>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              onOpenAuthModal && (
                <button
                  onClick={onOpenAuthModal}
                  className="text-xs text-slate-600 hover:text-cyan-800 font-medium cursor-pointer flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sign In</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-2 sm:gap-4">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 cursor-pointer shrink-0"
            onClick={() => setActiveTab('home')}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-xs ring-1 ring-white/20">
              <FlaskConical className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <span className="font-semibold text-sm sm:text-base tracking-tight text-slate-900 block leading-tight">
                MedLab QBank
              </span>
            </div>
          </Link>

          {/* Search Input (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-xs relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== 'browse') setActiveTab('browse');
              }}
              placeholder="Search analytes, enzymes, cases..."
              className="w-full bg-white/60 backdrop-blur-xs text-xs sm:text-sm text-slate-900 placeholder-slate-400 rounded-lg pl-9 pr-3 py-1.5 border border-slate-200/90 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 shadow-2xs transition-all"
            />
          </div>

          {/* Mobile Search Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-md transition-colors cursor-pointer shrink-0"
            aria-label="Toggle search input"
          >
            {isMobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 px-1 bg-slate-100/60 backdrop-blur-sm rounded-lg border border-slate-200/60 scrollbar-none shrink-0 max-w-[calc(100vw-120px)] sm:max-w-none">
            <Link
              to="/browse"
              onClick={() => setActiveTab('browse')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all cursor-pointer shrink-0 ${
                activeTab === 'browse'
                  ? 'bg-white/95 text-cyan-950 font-semibold border border-cyan-300/80 shadow-xs'
                  : 'text-slate-600 hover:text-cyan-950 hover:bg-white/60'
              }`}
            >
              Browse
            </Link>

            <Link
              to="/practice"
              onClick={() => setActiveTab('practice')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all cursor-pointer shrink-0 ${
                activeTab === 'practice'
                  ? 'bg-white/95 text-cyan-950 font-semibold border border-cyan-300/80 shadow-xs'
                  : 'text-slate-600 hover:text-cyan-950 hover:bg-white/60'
              }`}
            >
              Practice
            </Link>

            <Link
              to="/exam"
              onClick={() => setActiveTab('exam')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all cursor-pointer shrink-0 ${
                activeTab === 'exam'
                  ? 'bg-white/95 text-cyan-950 font-semibold border border-cyan-300/80 shadow-xs'
                  : 'text-slate-600 hover:text-cyan-950 hover:bg-white/60'
              }`}
            >
              Mock Exam
            </Link>

            <Link
              to="/cee-ug"
              onClick={() => setActiveTab('cee-ug')}
              aria-label="CEE-UG entrance mock examination"
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all cursor-pointer shrink-0 ${
                activeTab === 'cee-ug'
                  ? 'bg-white/95 text-cyan-950 font-semibold border border-cyan-300/80 shadow-xs'
                  : 'text-slate-600 hover:text-cyan-950 hover:bg-white/60'
              }`}
            >
              CEE-UG
            </Link>

            <Link
              to="/mistakes"
              onClick={() => setActiveTab('mistakes')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all cursor-pointer shrink-0 inline-flex items-center gap-1 ${
                activeTab === 'mistakes'
                  ? 'bg-white/95 text-cyan-950 font-semibold border border-cyan-300/80 shadow-xs'
                  : 'text-slate-600 hover:text-cyan-950 hover:bg-white/60'
              }`}
            >
              Mistakes
              {mistakeCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold leading-none">
                  {mistakeCount > 99 ? '99+' : mistakeCount}
                </span>
              )}
            </Link>

            <Link
              to="/dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all cursor-pointer shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-white/95 text-cyan-950 font-semibold border border-cyan-300/80 shadow-xs'
                  : 'text-slate-600 hover:text-cyan-950 hover:bg-white/60'
              }`}
            >
              Analytics
            </Link>
          </nav>
        </div>

        {/* Mobile Search Input Drawer */}
        {isMobileSearchOpen && (
          <div className="md:hidden pb-3 pt-1 border-t border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                autoFocus
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'browse') setActiveTab('browse');
                }}
                placeholder="Search analytes, enzymes, cases..."
                className="w-full bg-slate-50 text-sm text-slate-900 placeholder-slate-400 rounded-md pl-9 pr-3 py-2 border border-slate-200 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};