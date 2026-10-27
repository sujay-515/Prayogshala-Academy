import React, { useState } from 'react';
import {
  Search,
  FlaskConical,
  User,
  LogOut,
  X,
} from 'lucide-react';
import { UserAccount } from '../types';

interface NavbarProps {
  activeTab: 'home' | 'browse' | 'practice' | 'exam' | 'dashboard' | 'admin';
  setActiveTab: (tab: 'home' | 'browse' | 'practice' | 'exam' | 'dashboard' | 'admin') => void;
  onOpenDailyQuestion: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  totalQuestionCount: number;
  currentUser?: UserAccount | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
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
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 w-full">
      {/* Top quiet metadata line */}
      <div className="border-b border-slate-100 bg-slate-50/70 px-3 sm:px-4 py-1.5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-medium text-slate-700 hidden sm:inline">Clinical Laboratory Knowledge Base</span>
            <span className="font-medium text-slate-700 sm:hidden">MedLab QBank</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-medium">
              {totalQuestionCount.toLocaleString()} MCQs
            </span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="hidden md:inline text-slate-500">ASCP, NHPC, PSC, DHA & AIMS</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenDailyQuestion}
              className="text-xs text-slate-600 hover:text-cyan-800 transition-colors font-medium cursor-pointer"
            >
              Daily Question
            </button>
            <span className="text-slate-300">|</span>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-800 flex items-center gap-1.5 truncate max-w-28 sm:max-w-none">
                  <User className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  <span className="truncate">{currentUser.displayName}</span>
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
                  className="text-xs text-slate-600 hover:text-cyan-800 font-medium cursor-pointer"
                >
                  Student Sign In
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
          <div
            className="flex items-center gap-2.5 cursor-pointer shrink-0"
            onClick={() => setActiveTab('home')}
          >
            <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center text-cyan-400 shrink-0">
              <FlaskConical className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <span className="font-semibold text-sm sm:text-base tracking-tight text-slate-900 block leading-tight">
                MedLab QBank
              </span>
              <span className="text-xs text-slate-500 block">Clinical Pathology</span>
            </div>
          </div>

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
              className="w-full bg-slate-50 text-xs sm:text-sm text-slate-900 placeholder-slate-400 rounded-md pl-9 pr-3 py-1.5 border border-slate-200 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
            />
          </div>

          {/* Mobile Search Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer shrink-0"
            aria-label="Toggle search input"
          >
            {isMobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 scrollbar-none shrink-0 max-w-[calc(100vw-120px)] sm:max-w-none">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition-colors cursor-pointer shrink-0 ${
                activeTab === 'browse'
                  ? 'bg-cyan-50 text-cyan-950 font-semibold border border-cyan-200/80'
                  : 'text-slate-600 hover:text-cyan-900 hover:bg-slate-50'
              }`}
            >
              Browse
            </button>

            <button
              onClick={() => setActiveTab('practice')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition-colors cursor-pointer shrink-0 ${
                activeTab === 'practice'
                  ? 'bg-cyan-50 text-cyan-950 font-semibold border border-cyan-200/80'
                  : 'text-slate-600 hover:text-cyan-900 hover:bg-slate-50'
              }`}
            >
              Practice
            </button>

            <button
              onClick={() => setActiveTab('exam')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition-colors cursor-pointer shrink-0 ${
                activeTab === 'exam'
                  ? 'bg-cyan-50 text-cyan-950 font-semibold border border-cyan-200/80'
                  : 'text-slate-600 hover:text-cyan-900 hover:bg-slate-50'
              }`}
            >
              Mock Exam
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition-colors cursor-pointer shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-cyan-50 text-cyan-950 font-semibold border border-cyan-200/80'
                  : 'text-slate-600 hover:text-cyan-900 hover:bg-slate-50'
              }`}
            >
              Analytics
            </button>
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
