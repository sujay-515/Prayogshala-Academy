import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Compass,
  Target,
  GraduationCap,
  Stethoscope,
  Search,
  FlaskConical,
  User,
  LogOut,
  X,
  Menu,
  ShieldCheck,
  Moon,
  Sun,
  CalendarDays,
  BarChart3,
  AlertCircle,
  Bookmark,
  LogIn,
  Crown,
  ArrowRight,
} from 'lucide-react';
import { UserAccount } from '../types';
import type { Theme } from '../utils/theme';

interface NavbarProps {
  activeTab: 'home' | 'practice' | 'exam' | 'cee-ug' | 'mistakes' | 'dashboard' | 'admin';
  setActiveTab: (tab: 'home' | 'practice' | 'exam' | 'cee-ug' | 'mistakes' | 'dashboard' | 'admin') => void;
  onOpenDailyQuestion: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  totalQuestionCount?: number;
  currentUser?: UserAccount | null;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
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
  const [isMobileLandingOpen, setIsMobileLandingOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHomepage = location.pathname === '/';

  const userMenuRef = useRef<HTMLDivElement>(null);
  const userBtnRef = useRef<HTMLButtonElement>(null);
  const userBtnMobileRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(target) &&
        userBtnRef.current &&
        !userBtnRef.current.contains(target) &&
        userBtnMobileRef.current &&
        !userBtnMobileRef.current.contains(target)
      ) {
        setIsUserMenuOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(target) &&
        !(target as HTMLElement).closest('button[data-search-trigger]')
      ) {
        setIsSearchOpen(false);
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

  // Shared Theme-Aware User Dropdown Menu
  const renderUserDropdown = () => (
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

        {/* Pricing / Full Access */}
        <Link
          to="/pricing"
          onClick={() => {
            setIsUserMenuOpen(false);
          }}
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
            location.pathname.startsWith('/pricing')
              ? 'bg-amber-50 text-amber-950 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/30 font-semibold'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:border dark:border-amber-500/25 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Full Access &amp; Pricing</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Unlock all 11 units &amp; unlimited mocks</div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 dark:bg-amber-400 dark:text-slate-950 uppercase tracking-wider">
            PRO
          </span>
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
  );

  // Dedicated landing header and navigation when viewing the homepage ('/')
  if (isHomepage) {
    return (
      <>
        {/* Sticky Landing Navbar for Homepage */}
        <header className="sticky top-0 inset-x-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
            {/* Brand Logo & Name */}
            <div className="shrink-0">
              <Link
                to="/"
                className="flex items-center gap-2.5 text-slate-900 dark:text-white transition-opacity hover:opacity-90 cursor-pointer group"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-label="Prayogshala Academy Home"
              >
                <img
                  src="/brand/svg/logo-mark-cyan.svg"
                  alt="Prayogshala Logo"
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 group-hover:scale-105 transition-transform drop-shadow-[0_2px_8px_rgba(6,182,212,0.35)]"
                />
                <div className="flex flex-col leading-tight">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight block text-slate-900 dark:text-white">
                    Prayogshala
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.24em] text-cyan-600 dark:text-cyan-400 uppercase block">
                    Academy
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Anchor Links */}
            <nav
              aria-label="Homepage sections"
              className="hidden md:flex items-center gap-6 lg:gap-8 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300"
            >
              <a
                href="#features"
                className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors py-2"
              >
                Features
              </a>
              <a
                href="#exams"
                className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors py-2"
              >
                Exams
              </a>
              <a
                href="#demo"
                className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors py-2"
              >
                Demo
              </a>
              <a
                href="#pricing"
                className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors py-2"
              >
                Pricing
              </a>
              <a
                href="#about"
                className="hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors py-2"
              >
                About
              </a>
            </nav>

            {/* Desktop Right Cluster: Theme, Auth / Dashboard, CTA */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-300" />
                  ) : (
                    <Moon className="w-4 h-4 text-cyan-700" />
                  )}
                </button>
              )}

              {currentUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('dashboard');
                      navigate('/dashboard');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px]"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="relative shrink-0">
                    <button
                      ref={userBtnRef}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsUserMenuOpen((prev) => !prev);
                      }}
                      aria-label="User account menu"
                      aria-expanded={isUserMenuOpen}
                      className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer min-h-[44px]"
                    >
                      <User className="w-4 h-4" />
                    </button>
                    {isUserMenuOpen && renderUserDropdown()}
                  </div>
                </>
              ) : (
                <>
                  {onOpenAuthModal && (
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal('login')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer min-h-[44px]"
                    >
                      <LogIn className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <span>Sign In</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAuthModal) {
                        onOpenAuthModal('register');
                      } else {
                        setActiveTab('practice');
                        navigate('/practice');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer min-h-[44px]"
                  >
                    <span>Sign Up Free</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            {/* Mobile Utility & Menu Toggle */}
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-300" />
                  ) : (
                    <Moon className="w-4 h-4 text-cyan-700" />
                  )}
                </button>
              )}

              {currentUser && (
                <div className="relative">
                  <button
                    ref={userBtnMobileRef}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsUserMenuOpen((prev) => !prev);
                    }}
                    aria-label="User account menu"
                    aria-expanded={isUserMenuOpen}
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <User className="w-4 h-4" />
                  </button>
                  {isUserMenuOpen && renderUserDropdown()}
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsMobileLandingOpen((prev) => !prev)}
                aria-label={isMobileLandingOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMobileLandingOpen}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                {isMobileLandingOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Panel */}
          {isMobileLandingOpen && (
            <div
              className="md:hidden border-t border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150"
              role="region"
              aria-label="Mobile navigation links"
            >
              <nav className="flex flex-col space-y-1">
                <a
                  href="#features"
                  onClick={() => setIsMobileLandingOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 min-h-[44px] flex items-center"
                >
                  Features
                </a>
                <a
                  href="#exams"
                  onClick={() => setIsMobileLandingOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 min-h-[44px] flex items-center"
                >
                  Exams
                </a>
                <a
                  href="#demo"
                  onClick={() => setIsMobileLandingOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 min-h-[44px] flex items-center"
                >
                  Demo
                </a>
                <a
                  href="#pricing"
                  onClick={() => setIsMobileLandingOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 min-h-[44px] flex items-center"
                >
                  Pricing
                </a>
                <a
                  href="#about"
                  onClick={() => setIsMobileLandingOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 min-h-[44px] flex items-center"
                >
                  About
                </a>
              </nav>

              <div className="pt-2 border-t border-slate-200/70 dark:border-white/10 space-y-2">
                {currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileLandingOpen(false);
                      setActiveTab('dashboard');
                      navigate('/dashboard');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] font-bold text-sm min-h-[44px]"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileLandingOpen(false);
                        if (onOpenAuthModal) {
                          onOpenAuthModal('register');
                        } else {
                          setActiveTab('practice');
                          navigate('/practice');
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-[#04131d] font-bold text-sm min-h-[44px]"
                    >
                      <span>Sign Up Free</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {onOpenAuthModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileLandingOpen(false);
                          onOpenAuthModal('login');
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 text-slate-800 dark:text-white font-semibold text-sm hover:bg-slate-100 dark:hover:bg-white/10 min-h-[44px]"
                      >
                        <LogIn className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        <span>Sign In</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </header>

        {/* For signed-in users on homepage, show the floating bottom dock so they retain their navigation */}
        {currentUser && (
          <div className="md:hidden fixed bottom-3 inset-x-0 z-40 flex flex-col items-center pointer-events-none px-3">
            <nav
              aria-label="Mobile navigation dock"
              className="pointer-events-auto bg-black/30 dark:bg-black/40 backdrop-blur-2xl backdrop-saturate-150 border border-white/25 shadow-2xl shadow-black/30 rounded-2xl px-1.5 py-1.5 flex items-center justify-between gap-0.5 w-full max-w-[390px] text-white"
            >
              <Link
                to="/"
                onClick={() => {
                  setActiveTab('home');
                  setIsSearchOpen(false);
                }}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${
                  activeTab === 'home'
                    ? 'bg-white/25 text-white font-semibold shadow-xs'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                <Home className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] tracking-tight leading-none">Home</span>
              </Link>

              <Link
                to="/practice"
                onClick={() => {
                  setActiveTab('practice');
                  setIsSearchOpen(false);
                }}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${
                  activeTab === 'practice'
                    ? 'bg-white/25 text-white font-semibold shadow-xs'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                <Target className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] tracking-tight leading-none">Practice</span>
              </Link>

              <Link
                to="/exam"
                onClick={() => {
                  setActiveTab('exam');
                  setIsSearchOpen(false);
                }}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${
                  activeTab === 'exam'
                    ? 'bg-white/25 text-white font-semibold shadow-xs'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] tracking-tight leading-none">Exam</span>
              </Link>

              <Link
                to="/cee-ug"
                onClick={() => {
                  setActiveTab('cee-ug');
                  setIsSearchOpen(false);
                }}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${
                  activeTab === 'cee-ug'
                    ? 'bg-white/25 text-white font-semibold shadow-xs'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                <Stethoscope className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] tracking-tight leading-none">CEE-UG</span>
              </Link>
            </nav>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* ── TOP HEADER (Fixed Minimal Header) ────────────────── */}
      <header className="fixed top-0 inset-x-0 z-40 pointer-events-none bg-transparent transition-all">
        <div className="w-full bg-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            {/* Brand Logo & Name - Prayogshala Academy */}
            <div className="pointer-events-auto shrink-0">
              <Link
                to="/"
                className="flex items-center gap-2.5 text-slate-900 dark:text-white transition-opacity hover:opacity-90 cursor-pointer group"
                onClick={() => setActiveTab('home')}
                aria-label="Prayogshala Academy Home"
              >
                <img
                  src="/brand/svg/logo-mark-cyan.svg"
                  alt="Prayogshala Logo"
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 group-hover:scale-105 transition-transform drop-shadow-[0_2px_8px_rgba(6,182,212,0.35)]"
                />
                <div className="flex flex-col leading-tight">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight block text-slate-900 dark:text-white">
                    Prayogshala
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.24em] text-cyan-600 dark:text-cyan-400 uppercase block">
                    Academy
                  </span>
                </div>
              </Link>
            </div>

            {/* ── DESKTOP: Full Floating Pill Navbar (md:flex, hidden on mobile) ── */}
            <div className="hidden md:flex pointer-events-auto relative items-center shrink-0">
              <nav
                aria-label="Desktop primary navigation"
                className="bg-black/25 dark:bg-black/35 backdrop-blur-xl backdrop-saturate-150 border border-white/25 shadow-xl shadow-black/15 rounded-full p-1 sm:p-1.5 flex items-center gap-0.5 sm:gap-1 text-white overflow-visible"
              >
                  {/* Home */}
                  <Link
                    to="/"
                    onClick={() => setActiveTab('home')}
                    className={`flex flex-col items-center justify-center min-w-[50px] sm:min-w-[56px] py-1 px-2 rounded-xl transition-all ${
                      activeTab === 'home'
                        ? 'bg-white text-slate-950 font-semibold shadow-sm'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Home className="w-4 h-4 mb-0.5 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-none">Home</span>
                  </Link>

                  {/* Practice */}
                  <Link
                    to="/practice"
                    onClick={() => setActiveTab('practice')}
                    className={`flex flex-col items-center justify-center min-w-[50px] sm:min-w-[56px] py-1 px-2 rounded-xl transition-all ${
                      activeTab === 'practice'
                        ? 'bg-white text-slate-950 font-semibold shadow-sm'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Target className="w-4 h-4 mb-0.5 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-none">Practice</span>
                  </Link>

                  {/* Mock Exam */}
                  <Link
                    to="/exam"
                    onClick={() => setActiveTab('exam')}
                    className={`flex flex-col items-center justify-center min-w-[50px] sm:min-w-[56px] py-1 px-2 rounded-xl transition-all ${
                      activeTab === 'exam'
                        ? 'bg-white text-slate-950 font-semibold shadow-sm'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 mb-0.5 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-none">Mock</span>
                  </Link>

                  {/* CEE-UG */}
                  <Link
                    to="/cee-ug"
                    onClick={() => setActiveTab('cee-ug')}
                    className={`flex flex-col items-center justify-center min-w-[50px] sm:min-w-[56px] py-1 px-2 rounded-xl transition-all ${
                      activeTab === 'cee-ug'
                        ? 'bg-white text-slate-950 font-semibold shadow-sm'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4 mb-0.5 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-none">CEE-UG</span>
                  </Link>

                  {/* Pricing / Upgrade */}
                  <Link
                    to="/pricing"
                    className={`flex flex-col items-center justify-center min-w-[50px] sm:min-w-[56px] py-1 px-2 rounded-xl transition-all ${
                      location.pathname.startsWith('/pricing')
                        ? 'bg-amber-300 text-slate-950 font-bold shadow-sm'
                        : 'text-amber-200 hover:text-amber-100 hover:bg-white/10'
                    }`}
                  >
                    <Crown className="w-4 h-4 mb-0.5 text-amber-300 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium leading-none">Upgrade</span>
                  </Link>

                  {/* Subtle Divider */}
                  <div className="h-6 w-px bg-white/25 mx-0.5 sm:mx-1 shrink-0" aria-hidden="true" />

                  {/* Desktop Search */}
                  <div className="relative flex items-center shrink-0">
                    {isSearchOpen ? (
                      <div className="flex items-center gap-1 pl-1 pr-1">
                        <input
                          type="search"
                          autoFocus
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (activeTab !== 'practice') setActiveTab('practice');
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
                        data-search-trigger
                        onClick={() => setIsSearchOpen(true)}
                        aria-label="Search questions"
                        title="Search questions"
                        className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Desktop Theme Toggle */}
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

                  {/* Desktop User Profile Button */}
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

                  {/* Desktop Daily Question */}
                  <button
                    type="button"
                    onClick={onOpenDailyQuestion}
                    aria-label="Daily Question Challenge"
                    title="Daily Question Challenge"
                    className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
                  >
                    <CalendarDays className="w-4 h-4 text-cyan-300" />
                  </button>
                </nav>

                {/* Desktop User Dropdown Menu */}
                {isUserMenuOpen && renderUserDropdown()}
              </div>

            {/* ── MOBILE: Utility Cluster (md:hidden) ── */}
            <div className="flex md:hidden pointer-events-auto relative items-center shrink-0">
              <div className="bg-black/25 dark:bg-black/35 backdrop-blur-xl backdrop-saturate-150 border border-white/25 shadow-xl shadow-black/15 rounded-full p-1 flex items-center gap-1 text-white">
                {/* Daily Question */}
                <button
                  type="button"
                  onClick={onOpenDailyQuestion}
                  aria-label="Daily Question Challenge"
                  title="Daily Question Challenge"
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
                >
                  <CalendarDays className="w-4 h-4 text-cyan-300" />
                </button>

                {/* Theme Toggle */}
                {onToggleTheme && (
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-amber-300" />
                    ) : (
                      <Moon className="w-4 h-4 text-cyan-200" />
                    )}
                  </button>
                )}

                <div className="h-4 w-px bg-white/20 mx-0.5 shrink-0" aria-hidden="true" />

                {/* Mobile User Profile Button */}
                <button
                  ref={userBtnMobileRef}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUserMenuOpen((prev) => !prev);
                    setIsSearchOpen(false);
                  }}
                  aria-label="User account, mistakes, and analysis menu"
                  aria-expanded={isUserMenuOpen}
                  title="User Menu (Mistakes, Analysis, Bookmarks)"
                  className={`p-1.5 rounded-full transition-colors cursor-pointer relative flex items-center justify-center ${
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

              {/* Mobile User Dropdown Menu */}
              {isUserMenuOpen && renderUserDropdown()}
            </div>
          </div>
        </div>
      </header>

      {/* Top Spacer to prevent content from hiding beneath the fixed header */}
      <div className="h-16 sm:h-18 pointer-events-none" aria-hidden="true" />

      {/* ── MOBILE: Bottom Floating Navigation Dock (md:hidden) ── */}
      <div className="md:hidden fixed bottom-3 inset-x-0 z-40 flex flex-col items-center pointer-events-none px-3">
          {/* Mobile Search Popover Drawer */}
          {isSearchOpen && (
            <div
              ref={searchRef}
              className="pointer-events-auto mb-2 w-full max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/20 shadow-2xl rounded-2xl p-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (activeTab !== 'practice') setActiveTab('practice');
                  }}
                  placeholder="Search analytes, cases, questions..."
                  className="w-full bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs rounded-xl pl-9 pr-8 py-2 border border-slate-200 dark:border-white/10 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  aria-label="Close search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Mobile Floating Dock: Vertical Stack (Icon Top, Label Underneath) */}
          <nav
            aria-label="Mobile navigation dock"
            className="pointer-events-auto bg-black/30 dark:bg-black/40 backdrop-blur-2xl backdrop-saturate-150 border border-white/25 shadow-2xl shadow-black/30 rounded-2xl px-1.5 py-1.5 flex items-center justify-between gap-0.5 w-full max-w-[390px] text-white"
          >
            {/* Home */}
            <Link
              to="/"
              onClick={() => {
                setActiveTab('home');
                setIsSearchOpen(false);
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${
                activeTab === 'home'
                  ? 'bg-white/25 text-white font-semibold shadow-xs'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] tracking-tight leading-none">Home</span>
            </Link>

            {/* Practice */}
            <Link
              to="/practice"
              onClick={() => {
                setActiveTab('practice');
                setIsSearchOpen(false);
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${
                activeTab === 'practice'
                  ? 'bg-white/25 text-white font-semibold shadow-xs'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <Target className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] tracking-tight leading-none">Practice</span>
            </Link>

            {/* Mock Exam */}
            <Link
              to="/exam"
              onClick={() => {
                setActiveTab('exam');
                setIsSearchOpen(false);
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${
                activeTab === 'exam'
                  ? 'bg-white/25 text-white font-semibold shadow-xs'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] tracking-tight leading-none">Exam</span>
            </Link>

            {/* CEE-UG */}
            <Link
              to="/cee-ug"
              onClick={() => {
                setActiveTab('cee-ug');
                setIsSearchOpen(false);
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${
                activeTab === 'cee-ug'
                  ? 'bg-white/25 text-white font-semibold shadow-xs'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <Stethoscope className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] tracking-tight leading-none">CEE-UG</span>
            </Link>

            {/* Search */}
            <button
              type="button"
              data-search-trigger
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
                isSearchOpen
                  ? 'bg-white/25 text-white font-semibold shadow-xs'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] tracking-tight leading-none">Search</span>
            </button>
          </nav>
        </div>
    </>
  );
};
