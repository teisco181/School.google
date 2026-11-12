import React, { useState, useEffect } from 'react';
import { accountManager } from './services/accountManager';
import { userManager } from './services/userManager';
import { historySyncService } from './services/historySyncService';
import { GoogleAccount, UserProfile } from './types';
import { TopNavBar } from './components/TopNavBar';
import { MultiSessionBar } from './components/MultiSessionBar';
import { GoogleAgentView } from './components/GoogleAgentView';
import { InAppBrowserView } from './components/InAppBrowserView';
import { WorkspaceHubView } from './components/WorkspaceHubView';
import { ChromeOSCachePanel } from './components/ChromeOSCachePanel';
import { HistorySyncPanel } from './components/HistorySyncPanel';
import { LoginGate } from './components/LoginGate';
import { AddAccountModal } from './components/AddAccountModal';
import { ComposeEmailModal } from './components/ComposeEmailModal';
import { AddEventModal } from './components/AddEventModal';
import { QuickCommandPalette } from './components/QuickCommandPalette';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(userManager.getIsAuthenticated());
  const [activeUser, setActiveUser] = useState<UserProfile | null>(userManager.getActiveUser());
  const [activeTab, setActiveTab] = useState<'agent' | 'browser' | 'inbox' | 'calendar' | 'drive' | 'cache' | 'history'>('agent');
  const [browserInitialUrl, setBrowserInitialUrl] = useState<string>('https://www.google.com/webhp?igu=1');
  const [accounts, setAccounts] = useState<GoogleAccount[]>(accountManager.getAccounts());
  const [activeAccountId, setActiveAccountId] = useState<string | 'ALL'>(accountManager.getActiveAccountId());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('chromeos_theme') === 'dark' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    }
    return false;
  });

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync state with userManager
  useEffect(() => {
    const unsubscribeUser = userManager.subscribe(() => {
      setIsAuthenticated(userManager.getIsAuthenticated());
      setActiveUser(userManager.getActiveUser());
    });
    return () => unsubscribeUser();
  }, []);

  // Sync state with accountManager
  useEffect(() => {
    const unsubscribeAcc = accountManager.subscribe(() => {
      setAccounts(accountManager.getAccounts());
      setActiveAccountId(accountManager.getActiveAccountId());
    });
    return () => unsubscribeAcc();
  }, []);

  // Sync dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('chromeos_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('chromeos_theme', 'light');
    }
  }, [isDarkMode]);

  // Track tab changes in local browser history (zero-cloud)
  const handleTabChange = (tab: 'agent' | 'browser' | 'inbox' | 'calendar' | 'drive' | 'cache' | 'history') => {
    setActiveTab(tab);
    const titles: Record<string, string> = {
      agent: 'Google Agent Workspace',
      browser: 'In-App Web Browser',
      inbox: 'Gmail Inbox',
      calendar: 'Google Agenda & Taken',
      drive: 'Google Drive Bestanden',
      cache: 'ChromeOS Cache Dashboard',
      history: 'Lokale Browsergeschiedenis Synchronisatie',
    };
    historySyncService.recordHistoryEntry({
      url: `#${tab}`,
      title: titles[tab] || tab,
      category: tab === 'agent' ? 'agent' : tab === 'browser' ? 'search' : tab === 'inbox' ? 'email' : 'agenda',
    });
  };

  const handleOpenInBrowser = (url: string) => {
    setBrowserInitialUrl(url);
    handleTabChange('browser');
  };

  // Global ChromeOS Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K -> Command palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }

      // Ctrl+0 -> All accounts
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        accountManager.setActiveAccount('ALL');
      }

      // Ctrl+1 ... Ctrl+9 -> Switch account
      if ((e.ctrlKey || e.metaKey) && Number(e.key) >= 1 && Number(e.key) <= 9) {
        const idx = Number(e.key) - 1;
        const targetAcc = accounts[idx];
        if (targetAcc) {
          e.preventDefault();
          accountManager.setActiveAccount(targetAcc.id);
        }
      }

      // Alt+A -> Google Agent tab
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleTabChange('agent');
      }

      // Alt+B -> In-App Browser tab
      if (e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleTabChange('browser');
      }

      // Alt+H -> History tab
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        handleTabChange('history');
      }

      // Alt+C -> Cache Panel
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleTabChange('cache');
      }

      // Alt+L -> Lock Session immediately
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        userManager.lockSession();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [accounts]);

  const handleSelectAccount = (id: string | 'ALL') => {
    accountManager.setActiveAccount(id);
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    await accountManager.syncAllAccounts();
    setIsSyncing(false);
  };

  const handleAskAgent = (prompt: string) => {
    handleTabChange('agent');
  };

  // If not authenticated, require logging in with secure PIN / password
  if (!isAuthenticated) {
    return (
      <LoginGate
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          accountManager.init();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      {/* 3-Zone Top Navigation Bar */}
      <TopNavBar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSelectAccount={handleSelectAccount}
        onOpenAddAccount={() => setIsAddAccountOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        activeUser={activeUser}
        onLockSession={() => userManager.lockSession()}
        onLogout={() => userManager.logout()}
      />

      {/* ChromeOS Multi-Session Shelf Bar */}
      <MultiSessionBar
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSelectAccount={handleSelectAccount}
        onOpenAddAccount={() => setIsAddAccountOpen(true)}
        onSyncAll={handleSyncAll}
        isSyncing={isSyncing}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {activeTab === 'agent' && (
          <GoogleAgentView
            accounts={accounts}
            activeAccountId={activeAccountId}
            onSelectAccount={handleSelectAccount}
            onNavigateToTab={handleTabChange}
            onOpenInBrowser={handleOpenInBrowser}
          />
        )}

        {activeTab === 'browser' && (
          <div className="px-4">
            <InAppBrowserView
              accounts={accounts}
              activeAccountId={activeAccountId}
              onSelectAccount={handleSelectAccount}
              initialUrl={browserInitialUrl}
            />
          </div>
        )}

        {activeTab === 'inbox' && (
          <WorkspaceHubView
            viewMode="inbox"
            accounts={accounts}
            activeAccountId={activeAccountId}
            onSelectAccount={handleSelectAccount}
            onOpenCompose={() => setIsComposeOpen(true)}
            onOpenAddEvent={() => setIsAddEventOpen(true)}
            onAskAgent={handleAskAgent}
            onOpenInBrowser={handleOpenInBrowser}
          />
        )}

        {activeTab === 'calendar' && (
          <WorkspaceHubView
            viewMode="calendar"
            accounts={accounts}
            activeAccountId={activeAccountId}
            onSelectAccount={handleSelectAccount}
            onOpenCompose={() => setIsComposeOpen(true)}
            onOpenAddEvent={() => setIsAddEventOpen(true)}
            onAskAgent={handleAskAgent}
            onOpenInBrowser={handleOpenInBrowser}
          />
        )}

        {activeTab === 'drive' && (
          <WorkspaceHubView
            viewMode="drive"
            accounts={accounts}
            activeAccountId={activeAccountId}
            onSelectAccount={handleSelectAccount}
            onOpenCompose={() => setIsComposeOpen(true)}
            onOpenAddEvent={() => setIsAddEventOpen(true)}
            onAskAgent={handleAskAgent}
            onOpenInBrowser={handleOpenInBrowser}
          />
        )}

        {activeTab === 'history' && <HistorySyncPanel onNavigateTab={handleTabChange} />}

        {activeTab === 'cache' && <ChromeOSCachePanel accounts={accounts} />}
      </main>

      {/* Modals & Dialogs */}
      <AddAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        onAccountAdded={(newId) => {
          accountManager.setActiveAccount(newId);
        }}
        onOpenInBrowser={handleOpenInBrowser}
      />

      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        accounts={accounts}
        initialAccountId={activeAccountId}
      />

      <AddEventModal
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        accounts={accounts}
        initialAccountId={activeAccountId}
      />

      <QuickCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        accounts={accounts}
        onSelectAccount={handleSelectAccount}
        onNavigateTab={handleTabChange}
        onAskAgent={handleAskAgent}
      />
    </div>
  );
}
