import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  Search,
  FlaskConical,
  User,
  LogOut,
  X,
  ShieldCheck,
  Moon,
  Sun,
  Sparkles,
  BarChart3,
  AlertCircle,
  Bookmark,
  LogIn,
} from 'lucide-react';
import { UserAccount } from '../types';
import type { Theme } from '../utils/theme';

interface NavbarProps {
  activeTab: 'home' | 'browse' | 'practice' | 'exam' | 'cee-ug' | 'mistakes' | 'dashboard' | 'admin';
  setActiveTab: (tab: 'home' | 'browse' | 'practice' | 'exam' | 'cee-ug' | 'mistakes' | 'dashboard' | 'admin') => void;
  onOpenDailyQuestion: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  totalQuestionCount?: number;
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
  currentUser,
  onOpenAuthModal,
  onLogout,
  isAdmin = false,
  onReturnToAdmin,
  theme = 'light',
  onToggleTheme,
  mistakeCount = 0,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const userBtnRef = useRef<HTMLButtonElement>(null);

  // Monitor scroll state for smooth persistent glass transition
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(target) &&
        userBtnRef.current &&
        !userBtnRef.current.contains(target)
      ) {
        setIsUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsSearchOpen(false);
      }
    }

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 pointer-events-none bg-transparent transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          {/* Brand Logo & Name - Plain, without island */}
          <div className="pointer-events-auto shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2 text-slate-900 dark:text-white transition-opacity hover:opacity-90 cursor-pointer group"
              onClick={() => setActiveTab('home')}
            >
              <FlaskConical className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-600 dark:text-cyan-400 group-hover:rotate-6 transition-transform" />
              <span className="font-extrabold text-base sm:text-lg tracking-tight block leading-tight">
                MedLab<span className="text-cyan-600 dark:text-cyan-400">QBank</span>
              </span>
            </Link>
          </div>

          {/* Island 2: Floating Translucent Navigation Pill (overflow-visible so dropdown is never clipped) */}
          <div className="pointer-events-auto relative flex items-center shrink-0 max-w-[calc(100vw-180px)] sm:max-w-none">
            <nav
              aria-label="Primary navigation"
              className="bg-black/35 dark:bg-black/45 backdrop-blur-md border border-white/20 shadow-lg shadow-black/10 rounded-full p-1 sm:p-1.5 flex items-center gap-0.5 sm:gap-1 text-white overflow-visible"
            >
              {/* Scrollable Tab Links Container */}
              <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none max-w-[calc(100vw-190px)] sm:max-w-none">
                {/* Home Tab */}
                <Link
                  to="/"
                  onClick={() => setActiveTab('home')}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'home'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Home</span>
                </Link>

                {/* Browse Tab */}
                <Link
                  to="/browse"
                  onClick={() => setActiveTab('browse')}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 ${
                    activeTab === 'browse'
                      ? 'bg-white text-slate-950 font-semibold shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Browse
                </Link>

                {/* Practice Tab */}
                <Link
                  to="/practice"
                  onClick={() => setActiveTab('practice')}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 ${
                    activeTab === 'practice'
                      ? 'bg-white text-slate-950 font-semibold shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Practice
                </Link>

                {/* Mock Exam Tab */}
                <Link
                  to="/exam"
                  onClick={() => setActiveTab('exam')}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 ${
                    activeTab === 'exam'
                      ? 'bg-white text-slate-950 font-semibold shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Mock Exam
                </Link>

                {/* CEE-UG Tab */}
                <Link
                  to="/cee-ug"
                  onClick={() => setActiveTab('cee-ug')}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 ${
                    activeTab === 'cee-ug'
                      ? 'bg-white text-slate-950 font-semibold shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  CEE-UG
                </Link>
              </div>

              {/* Subtle Divider */}
              <div className="h-4 w-px bg-white/25 mx-0.5 sm:mx-1 shrink-0" aria-hidden="true" />

              {/* Search Icon & Expandable Input */}
              <div className="relative flex items-center shrink-0">
                {isSearchOpen ? (
                  <div className="flex items-center gap-1 pl-1 pr-1">
                    <input
                      type="search"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (activeTab !== 'browse') setActiveTab('browse');
                      }}
                      placeholder="Search questions..."
                      className="w-28 sm:w-40 bg-white/15 text-white placeholder-white/50 text-xs rounded-full px-3 py-1 border border-white/20 focus:outline-none focus:border-cyan-400 focus:bg-white/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      aria-label="Close search"
                      className="p-1 text-white/60 hover:text-white rounded-full transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    aria-label="Search questions"
                    title="Search questions"
                    className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Direct Theme Toggle (Sun / Moon) */}
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-300" />
                  ) : (
                    <Moon className="w-4 h-4 text-cyan-200" />
                  )}
                </button>
              )}

              {/* User Profile & Features Menu Button */}
              <div className="relative shrink-0">
                <button
                  ref={userBtnRef}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUserMenuOpen((prev) => !prev);
                    setIsSearchOpen(false);
                  }}
                  aria-label="User account, mistakes, and analysis menu"
                  aria-expanded={isUserMenuOpen}
                  title="User Menu (Mistakes, Analysis, Bookmarks)"
                  className={`p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer relative flex items-center justify-center ${
                    isUserMenuOpen || activeTab === 'mistakes' || activeTab === 'dashboard'
                      ? 'bg-white/25 text-white ring-2 ring-cyan-400'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <User className="w-4 h-4" />
                  {mistakeCount > 0 && !isUserMenuOpen && (
                    <span
                      className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-1 ring-slate-900"
                      title={`${mistakeCount} mistakes to review`}
                    />
                  )}
                </button>
              </div>

              {/* Daily Question Sparkles Icon (No Numbering) */}
              <button
                type="button"
                onClick={onOpenDailyQuestion}
                aria-label="Daily Question Challenge"
                title="Daily Question Challenge"
                className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
              </button>
            </nav>

            {/* User Dropdown Menu - Matches active theme (light in light mode, dark in dark mode) */}
            {isUserMenuOpen && (
              <div
                ref={userMenuRef}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2.5 w-72 sm:w-80 rounded-2xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white backdrop-blur-2xl border border-slate-200/80 dark:border-white/15 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* User Profile Header */}
                <div className="px-3 py-2.5 mb-2 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {currentUser ? currentUser.displayName : 'Guest Learner'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {currentUser?.email || 'Study progress stored locally'}
                    </p>
                  </div>
                  {currentUser ? (
                    currentUser.role === 'superadmin' ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-500/40 shrink-0">
                        Head Admin
                      </span>
                    ) : currentUser.role === 'admin' ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-400/30 shrink-0">
                        Staff
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-white/10 shrink-0">
                        Student
                      </span>
                    )
                  ) : (
                    onOpenAuthModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenAuthModal();
                        }}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 transition-colors shrink-0 cursor-pointer"
                      >
                        Sign In
                      </button>
                    )
                  )}
                </div>

                {/* Primary Tools: Mistakes & Analysis */}
                <div className="space-y-1">
                  {/* Mistakes Notebook */}
                  <Link
                    to="/mistakes"
                    onClick={() => {
                      setActiveTab('mistakes');
                      setIsUserMenuOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      activeTab === 'mistakes'
                        ? 'bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-500/30'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:border dark:border-rose-500/25 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">Mistakes Notebook</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Review & master incorrect questions</div>
                      </div>
                    </div>
                    {mistakeCount > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {mistakeCount > 99 ? '99+' : mistakeCount}
                      </span>
                    )}
                  </Link>

                  {/* Analysis & Dashboard */}
                  <Link
                    to="/dashboard"
                    onClick={() => {
                      setActiveTab('dashboard');
                      setIsUserMenuOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      activeTab === 'dashboard'
                        ? 'bg-cyan-50 text-cyan-900 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-200 dark:border-cyan-500/30'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:border dark:border-cyan-500/25 dark:text-cyan-400 flex items-center justify-center shrink-0">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">Analysis & Performance</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Pacing, readiness & subject breakdown</div>
                      </div>
                    </div>
                  </Link>

                  {/* Saved Bookmarks */}
                  <Link
                    to="/bookmarks"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                    }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:border dark:border-amber-500/25 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Bookmark className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">Saved Bookmarks</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Flagged questions library</div>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Divider */}
                <div className="my-2 border-t border-slate-200/80 dark:border-white/10" />

                {/* Actions & Settings */}
                <div className="space-y-0.5">
                  {isAdmin && onReturnToAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onReturnToAdmin();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-cyan-300 hover:bg-slate-100 dark:hover:bg-cyan-950/40 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <span>Staff Administration Console</span>
                    </button>
                  )}

                  {!currentUser && onOpenAuthModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenAuthModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <LogIn className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <span>Sign In / Create Account</span>
                    </button>
                  )}

                  {currentUser && onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      {/* Spacer to prevent page content from being obscured beneath the fixed navbar */}
      <div className="h-16 sm:h-18 pointer-events-none" aria-hidden="true" />
    </>
  );
};
