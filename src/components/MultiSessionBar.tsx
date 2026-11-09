import React from 'react';
import { GoogleAccount } from '../types';
import { Plus, CheckCircle, RefreshCw, Layers } from 'lucide-react';

interface MultiSessionBarProps {
  accounts: GoogleAccount[];
  activeAccountId: string | 'ALL';
  onSelectAccount: (id: string | 'ALL') => void;
  onOpenAddAccount: () => void;
  onSyncAll: () => void;
  isSyncing: boolean;
}

export const MultiSessionBar: React.FC<MultiSessionBarProps> = ({
  accounts,
  activeAccountId,
  onSelectAccount,
  onOpenAddAccount,
  onSyncAll,
  isSyncing,
}) => {
  return (
    <div className="bg-slate-100/90 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/80 px-6 py-2 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        {/* Active Google Sessions Tabs */}
        <div className="flex items-center gap-2">
          <span className="hidden xl:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2 shrink-0">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            Sessies ({accounts.length}):
          </span>

          {/* Unified 'Alle Accounts' tab */}
          <button
            onClick={() => onSelectAccount('ALL')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              activeAccountId === 'ALL'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <span>Alle Accounts (Multi-Sessie)</span>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded-md font-mono text-slate-600 dark:text-slate-300">
              Ctrl+0
            </span>
          </button>

          {/* Individual Accounts */}
          {accounts.map((acc, index) => {
            const isActive = activeAccountId === acc.id;
            return (
              <button
                key={acc.id}
                onClick={() => onSelectAccount(acc.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
                }`}
                title={`Schakel naar ${acc.email} (Ctrl+${index + 1})`}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: acc.badgeColor }}
                />
                <span className="truncate max-w-[120px] sm:max-w-[150px]">{acc.name}</span>

                {acc.unreadEmails > 0 && (
                  <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full px-1.5 py-0.2 leading-none shrink-0">
                    {acc.unreadEmails}
                  </span>
                )}

                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
                  Ctrl+{index + 1}
                </span>
              </button>
            );
          })}

          {/* Add Account Button */}
          <button
            onClick={onOpenAddAccount}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-dashed border-blue-300 dark:border-blue-800 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Account toevoegen</span>
          </button>
        </div>

        {/* Global Sync and Chromebook Performance Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
            title="Synchroniseer alle accounts naar lokale cache"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Synchroniseren...' : 'Nu syncen'}</span>
          </button>

          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/40">
            <CheckCircle className="w-3 h-3" />
            <span>ChromeOS Zero-Lag Cache Actief</span>
          </div>
        </div>
      </div>
    </div>
  );
};
