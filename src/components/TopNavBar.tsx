import React from 'react';
import { GoogleAccount, UserProfile } from '../types';
import { userManager } from '../services/userManager';
import { Zap, Moon, Sun, Laptop, History, Lock, LogOut } from 'lucide-react';

interface TopNavBarProps {
  activeTab: 'agent' | 'inbox' | 'calendar' | 'drive' | 'cache' | 'history';
  setActiveTab: (tab: 'agent' | 'inbox' | 'calendar' | 'drive' | 'cache' | 'history') => void;
  accounts: GoogleAccount[];
  activeAccountId: string | 'ALL';
  onSelectAccount: (id: string | 'ALL') => void;
  onOpenAddAccount: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  activeUser: UserProfile | null;
  onLockSession: () => void;
  onLogout: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeTab,
  setActiveTab,
  accounts,
  activeAccountId,
  onSelectAccount,
  onOpenAddAccount,
  isDarkMode,
  onToggleDarkMode,
  activeUser,
  onLockSession,
  onLogout,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const activeAccount =
    activeAccountId === 'ALL'
      ? null
      : accounts.find((a) => a.id === activeAccountId) || null;

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Zone 1: Single Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('agent');
          }}
          className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap"
        >
          {/* Google Quad-color Logo Mark */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>
          <span className="text-base font-semibold">Google Agent</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/50">
            <Laptop className="w-3 h-3" />
            ChromeOS Beveiligd
          </span>
        </a>
      </div>

      {/* Zone 2: 5 Clean Single-Line Nav Links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
        <button
          onClick={() => setActiveTab('agent')}
          className={`pb-0.5 whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'agent'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Google Agent
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`pb-0.5 whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'inbox'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Gmail Inbox
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-0.5 whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'calendar'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Agenda & Taken
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-0.5 whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5 text-blue-500" />
          Geschiedenis
        </button>
        <button
          onClick={() => setActiveTab('cache')}
          className={`pb-0.5 whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
            activeTab === 'cache'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          ChromeOS Cache
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action (Multi-Account Switcher & Session Menu) */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Licht thema' : 'Donker thema'}
          aria-label="Thema wisselen"
          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Lock Session Fast Button */}
        <button
          onClick={onLockSession}
          title="Sessie nu vergrendelen (steeds opnieuw inloggen)"
          className="p-2 text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Vergrendel sessie"
        >
          <Lock className="w-4 h-4" />
        </button>

        {/* Account Dropdown Switcher */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Google accounts beheren"
          >
            {activeAccount ? (
              <img
                src={activeAccount.avatarUrl}
                alt={activeAccount.name}
                className="w-7 h-7 rounded-full object-cover ring-2"
                style={{ borderColor: activeAccount.badgeColor }}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: activeUser?.avatarColor || '#4285F4' }}
              >
                {activeUser?.name.slice(0, 1) || 'U'}
              </div>
            )}

            <div className="text-left hidden lg:block">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[140px]">
                {activeAccount ? activeAccount.name : activeUser ? activeUser.name : 'Google Account'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate max-w-[140px]">
                {activeAccount ? activeAccount.email : activeUser ? activeUser.email : 'Ingelogd'}
              </p>
            </div>

            <svg
              className={`w-3.5 h-3.5 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Google Account Switcher Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60 mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Actief Gebruikersprofiel
                  </p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {activeUser?.name} ({activeUser?.email})
                  </p>
                </div>
                <span className="text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  Beveiligd
                </span>
              </div>

              {/* Option: All Accounts (Unified concurrent view) */}
              <button
                onClick={() => {
                  onSelectAccount('ALL');
                  setDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left mb-1 ${
                  activeAccountId === 'ALL'
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 font-medium'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center text-xs font-bold shrink-0">
                  ⚡
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">Alle Accounts Gecombineerd</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Gelijktijdige multi-sessie weergave
                  </p>
                </div>
                {activeAccountId === 'ALL' && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                )}
              </button>

              {/* List of Accounts */}
              <div className="space-y-1 max-h-48 overflow-y-auto my-1">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      onSelectAccount(acc.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-left ${
                      activeAccountId === acc.id
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <img
                      src={acc.avatarUrl}
                      alt={acc.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                      style={{ border: `2px solid ${acc.badgeColor}` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold truncate">{acc.name}</p>
                        {acc.isCurrentBrowserAccount && (
                          <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1 rounded">
                            Standaard
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{acc.email}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Add another Google account button */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-2 space-y-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenAddAccount();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nog een Google-account toevoegen
                </button>

                {/* Session lock & user logout */}
                <div className="grid grid-cols-2 gap-1 pt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLockSession();
                    }}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Vergrendelen</span>
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Uitloggen</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
