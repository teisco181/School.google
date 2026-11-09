import React, { useState, useEffect } from 'react';
import { GoogleAccount } from '../types';
import { accountManager } from '../services/accountManager';
import { Search, Sparkles, Mail, Calendar, UserCheck, Zap } from 'lucide-react';

interface QuickCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: GoogleAccount[];
  onSelectAccount: (id: string | 'ALL') => void;
  onNavigateTab: (tab: 'agent' | 'inbox' | 'calendar' | 'drive' | 'cache') => void;
  onAskAgent: (prompt: string) => void;
}

export const QuickCommandPalette: React.FC<QuickCommandPaletteProps> = ({
  isOpen,
  onClose,
  accounts,
  onSelectAccount,
  onNavigateTab,
  onAskAgent,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Toggle palette
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const emails = accountManager.getEmails('ALL');
  const events = accountManager.getEvents('ALL');

  const filteredAccounts = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.email.toLowerCase().includes(query.toLowerCase())
  );

  const filteredEmails = emails
    .filter(
      (e) =>
        e.subject.toLowerCase().includes(query.toLowerCase()) ||
        e.from.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 3);

  const filteredEvents = events
    .filter((ev) => ev.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-blue-500 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek in alle Google accounts of typ een vraag voor de Agent..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-3">
          {/* Ask Agent direct action */}
          {query.trim().length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">
                Google Agent Actie
              </p>
              <button
                onClick={() => {
                  onClose();
                  onAskAgent(query);
                  onNavigateTab('agent');
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-left transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Vraag Google Agent: "{query}"</p>
                  <p className="text-[11px] text-slate-400">
                    Doorzoek alle gekoppelde accounts en voer uit
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Accounts section */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">
              Google Accounts
            </p>
            <div className="space-y-1">
              <button
                onClick={() => {
                  onSelectAccount('ALL');
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Alle Accounts Gecombineerd
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Ctrl+0</span>
              </button>

              {filteredAccounts.map((acc, idx) => (
                <button
                  key={acc.id}
                  onClick={() => {
                    onSelectAccount(acc.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: acc.badgeColor }}
                    />
                    <div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {acc.name}
                      </p>
                      <p className="text-[10px] text-slate-400">{acc.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Ctrl+{idx + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Emails preview */}
          {filteredEmails.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">
                E-mails
              </p>
              <div className="space-y-1">
                {filteredEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => {
                      onNavigateTab('inbox');
                      onClose();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {email.subject}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {email.from} · {email.accountEmail}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Events preview */}
          {filteredEvents.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">
                Agenda Afspraken
              </p>
              <div className="space-y-1">
                {filteredEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => {
                      onNavigateTab('calendar');
                      onClose();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {ev.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {ev.start} - {ev.end} · {ev.accountEmail}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
