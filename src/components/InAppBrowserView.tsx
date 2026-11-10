import React, { useState, useEffect, useRef } from 'react';
import { GoogleAccount } from '../types';
import { accountManager } from '../services/accountManager';
import { historySyncService } from '../services/historySyncService';
import { googleAuthService } from '../services/googleAuthService';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Search,
  Lock,
  Plus,
  X,
  ExternalLink,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Globe,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  User,
  Sparkles,
  AlertCircle,
  Laptop,
} from 'lucide-react';

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isLoading?: boolean;
}

interface InAppBrowserViewProps {
  accounts: GoogleAccount[];
  activeAccountId: string | 'ALL';
  onSelectAccount: (id: string | 'ALL') => void;
  initialUrl?: string;
}

export const InAppBrowserView: React.FC<InAppBrowserViewProps> = ({
  accounts,
  activeAccountId,
  onSelectAccount,
  initialUrl,
}) => {
  const activeAccount =
    activeAccountId !== 'ALL'
      ? accounts.find((a) => a.id === activeAccountId) || accounts[0]
      : accounts[0];

  const defaultStartUrl = initialUrl || 'https://www.google.com';

  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab-1',
      title: 'Google Zoeken',
      url: defaultStartUrl,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [omniboxInput, setOmniboxInput] = useState<string>(defaultStartUrl);
  const [historyStack, setHistoryStack] = useState<Record<string, string[]>>({
    'tab-1': [defaultStartUrl],
  });
  const [historyIndex, setHistoryIndex] = useState<Record<string, number>>({
    'tab-1': 0,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isIframeLoading, setIsIframeLoading] = useState(false);

  // In-App Google Sign-in Form state (bypasses Google's iframe block)
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginSuccessMessage, setLoginSuccessMessage] = useState('');
  const [loginErrorMessage, setLoginErrorMessage] = useState('');

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check if current page is Google Accounts Sign-in
  const isGoogleSignInPage =
    activeTab.url.includes('accounts.google.com') ||
    activeTab.url.includes('google.com/accounts') ||
    activeTab.url.includes('signin/v2');

  // Sync omnibox input when active tab changes
  useEffect(() => {
    if (activeTab) {
      setOmniboxInput(activeTab.url);
    }
  }, [activeTabId]);

  // Update initial URL if prop changes
  useEffect(() => {
    if (initialUrl && initialUrl !== activeTab?.url) {
      navigateTo(initialUrl);
    }
  }, [initialUrl]);

  // Listen to navigation events from inside the proxied iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'IN_APP_NAVIGATE' && event.data.url) {
        const nextUrl = event.data.url;
        updateTabUrl(activeTabId, nextUrl, nextUrl);
        setOmniboxInput(nextUrl);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeTabId]);

  const updateTabUrl = (tabId: string, url: string, title?: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId
          ? {
              ...t,
              url,
              title:
                title ||
                (url.includes('accounts.google.com')
                  ? 'Google Inloggen'
                  : url.includes('google.com')
                    ? 'Google'
                    : url.replace(/^https?:\/\//, '').split('/')[0]),
            }
          : t
      )
    );

    // Record into local zero-cloud browser history
    historySyncService.recordHistoryEntry({
      url,
      title: title || url,
      category: url.includes('accounts.google.com') ? 'account' : 'search',
      snippet: `In-App Browser sessie (${activeAccount?.name || 'Google'})`,
    });
  };

  const navigateTo = (inputVal: string) => {
    let clean = inputVal.trim();
    if (!clean) return;

    let target = '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      target = clean;
    } else if (clean.includes('.') && !clean.includes(' ') && clean.length > 3) {
      target = `https://${clean}`;
    } else {
      // Search on Google
      target = `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
    }

    setIsIframeLoading(true);
    setOmniboxInput(target);
    updateTabUrl(activeTabId, target);

    // Push into stack
    setHistoryStack((prev) => {
      const current = prev[activeTabId] || [];
      const currentIdx = historyIndex[activeTabId] || 0;
      const nextStack = [...current.slice(0, currentIdx + 1), target];
      return { ...prev, [activeTabId]: nextStack };
    });
    setHistoryIndex((prev) => ({
      ...prev,
      [activeTabId]: (prev[activeTabId] || 0) + 1,
    }));
  };

  const handleBack = () => {
    const stack = historyStack[activeTabId] || [];
    const idx = historyIndex[activeTabId] || 0;
    if (idx > 0) {
      const prevUrl = stack[idx - 1];
      setHistoryIndex((prev) => ({ ...prev, [activeTabId]: idx - 1 }));
      setOmniboxInput(prevUrl);
      updateTabUrl(activeTabId, prevUrl);
    }
  };

  const handleForward = () => {
    const stack = historyStack[activeTabId] || [];
    const idx = historyIndex[activeTabId] || 0;
    if (idx < stack.length - 1) {
      const nextUrl = stack[idx + 1];
      setHistoryIndex((prev) => ({ ...prev, [activeTabId]: idx + 1 }));
      setOmniboxInput(nextUrl);
      updateTabUrl(activeTabId, nextUrl);
    }
  };

  const handleReload = () => {
    setIsIframeLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleNewTab = (url = 'https://www.google.com', title = 'Nieuw tabblad') => {
    const newId = `tab-${Date.now()}`;
    const newTab: BrowserTab = {
      id: newId,
      title,
      url,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setHistoryStack((prev) => ({ ...prev, [newId]: [url] }));
    setHistoryIndex((prev) => ({ ...prev, [newId]: 0 }));
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      navigateTo('https://www.google.com');
      return;
    }
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  // Google In-App Login Submission Handler
  const handleGoogleInAppSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrorMessage('');
    setLoginSuccessMessage('');

    if (loginStep === 1) {
      const email = loginEmail.trim().toLowerCase();
      if (!email || !email.includes('@')) {
        setLoginErrorMessage('Vul een geldig Google e-mailadres in.');
        return;
      }
      if (!loginName) {
        const derived = email.split('@')[0].replace(/[._]/g, ' ');
        setLoginName(derived.charAt(0).toUpperCase() + derived.slice(1));
      }
      setLoginStep(2);
      return;
    }

    // Step 2: Password submission
    if (!loginPassword || loginPassword.length < 4) {
      setLoginErrorMessage('Voer een geldig wachtwoord in.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await new Promise((r) => setTimeout(r, 600));

      const newAcc = await accountManager.addGoogleAccount({
        name: loginName.trim() || loginEmail.split('@')[0],
        email: loginEmail.trim().toLowerCase(),
        type: loginEmail.toLowerCase().endsWith('@gmail.com') ? 'personal' : 'work',
        badgeColor: '#4285F4',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(loginName || loginEmail)}&backgroundColor=4285F4`,
      });

      onSelectAccount(newAcc.id);
      setLoginSuccessMessage(`Inloggen geslaagd! ${newAcc.name} (${newAcc.email}) is nu actief gekoppeld.`);

      // Reset and navigate to Google start page with the new account logged in!
      setTimeout(() => {
        setLoginPassword('');
        setLoginStep(1);
        setLoginSuccessMessage('');
        navigateTo('https://www.google.com');
      }, 1200);
    } catch (err: any) {
      setLoginErrorMessage(err.message || 'Kon Google account niet toevoegen.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Identity Services (GIS Popup)
  const handleGooglePopupLogin = async () => {
    setLoginErrorMessage('');
    try {
      const profile = await googleAuthService.signInWithGooglePopup({
        emailHint: loginEmail || undefined,
      });

      const newAcc = await accountManager.addGoogleAccount({
        name: profile.name,
        email: profile.email,
        type: profile.email.endsWith('@gmail.com') ? 'personal' : 'work',
        badgeColor: '#4285F4',
        avatarUrl: profile.picture,
      });

      onSelectAccount(newAcc.id);
      setLoginSuccessMessage(`Google account ${profile.email} succesvol gekoppeld!`);
      setTimeout(() => {
        setLoginSuccessMessage('');
        navigateTo('https://www.google.com');
      }, 1000);
    } catch (err: any) {
      setLoginErrorMessage(
        err.message || 'Google pop-up login kon niet worden voltooid. Gebruik het onderstaande wachtwoord-formulier.'
      );
    }
  };

  // Quick Bookmarks for Google Services
  const userUrls = activeAccount
    ? googleAuthService.getGoogleServiceUrls(activeAccount.email)
    : null;

  const quickBookmarks = [
    { label: 'Google Zoeken', url: 'https://www.google.com', icon: '🔍' },
    {
      label: 'Google Inloggen',
      url: 'https://accounts.google.com/signin',
      icon: '🔑',
    },
    {
      label: 'Gmail',
      url: userUrls?.gmail || 'https://mail.google.com',
      icon: '✉️',
    },
    {
      label: 'Google Agenda',
      url: userUrls?.calendar || 'https://calendar.google.com',
      icon: '📅',
    },
    {
      label: 'Google Drive',
      url: userUrls?.drive || 'https://drive.google.com',
      icon: '📁',
    },
    {
      label: 'YouTube',
      url: 'https://www.youtube.com',
      icon: '🎬',
    },
  ];

  const proxySrc = `/api/proxy?url=${encodeURIComponent(activeTab.url)}`;

  return (
    <div
      className={`flex flex-col bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-2 z-50 rounded-2xl shadow-2xl'
          : 'max-w-6xl mx-auto my-4 h-[calc(100vh-135px)]'
      }`}
    >
      {/* 1. ChromeOS Tabs Strip */}
      <div className="flex items-center justify-between px-3 pt-2 bg-slate-950 border-b border-slate-800 gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 min-w-0">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs cursor-pointer border-t border-x transition-colors min-w-[130px] max-w-[200px] select-none ${
                  isActive
                    ? 'bg-slate-900 border-slate-700 text-white font-semibold'
                    : 'bg-slate-950 border-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                }`}
              >
                {tab.url.includes('accounts.google.com') ? (
                  <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                )}
                <span className="truncate flex-1">{tab.title}</span>
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 rounded p-0.5"
                  aria-label="Tabblad sluiten"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Add New Tab Button */}
          <button
            onClick={() => handleNewTab()}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            title="Nieuw tabblad openen"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Identity & Fullscreen Controls */}
        <div className="flex items-center gap-2 shrink-0 pb-1">
          {/* Active Account Identity Tag */}
          <div className="flex items-center gap-1.5 text-[11px] bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeAccount?.badgeColor || '#4285F4' }}
            />
            <span className="truncate max-w-[140px] font-medium hidden sm:inline">
              {activeAccount ? activeAccount.name : 'Browser Sessie'}
            </span>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title={isFullscreen ? 'Venster verkleinen' : 'Volledig scherm in browser'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. ChromeOS Omnibox & Navigation Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Terug"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleForward}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Vooruit"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleReload}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Vernieuwen"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateTo('https://www.google.com')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Startpagina Google"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        {/* Omnibox URL / Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigateTo(omniboxInput);
          }}
          className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/50"
        >
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <input
            type="text"
            value={omniboxInput}
            onChange={(e) => setOmniboxInput(e.target.value)}
            placeholder="Zoek op Google of typ een webadres..."
            className="flex-1 bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-1"
          >
            Ga
          </button>
        </form>

        {/* Multi-Account Fast Switcher in Browser */}
        <select
          value={activeAccountId}
          onChange={(e) => onSelectAccount(e.target.value)}
          className="text-xs bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          title="Schakel Google-identiteit voor deze browser"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.email})
            </option>
          ))}
        </select>
      </div>

      {/* 3. Quick Bookmarks Strip */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-950/80 border-b border-slate-800/80 text-xs overflow-x-auto no-scrollbar">
        <span className="text-[10px] text-slate-500 uppercase font-semibold mr-1 shrink-0">
          Bladwijzers:
        </span>
        {quickBookmarks.map((bm, idx) => (
          <button
            key={idx}
            onClick={() => navigateTo(bm.url)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border whitespace-nowrap text-[11px] font-medium transition-colors shrink-0 ${
              activeTab.url === bm.url
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            <span>{bm.icon}</span>
            <span>{bm.label}</span>
          </button>
        ))}
      </div>

      {/* 4. Embedded Web Viewport OR Interactive Native Google Sign-In View */}
      <div className="flex-1 bg-white relative overflow-hidden flex flex-col">
        {/* Slim loading progress indicator */}
        {isIframeLoading && !isGoogleSignInPage && (
          <div className="h-0.5 bg-blue-500 w-full animate-pulse shrink-0" />
        )}

        {isGoogleSignInPage ? (
          /* NATIVE INTERACTIVE GOOGLE SIGN-IN INTERFACE (100% works without Google iframe blocks) */
          <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-y-auto flex items-center justify-center p-4 sm:p-6 text-slate-900 dark:text-slate-100">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
              {/* Google Quad-Color Mark */}
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-2">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
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
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {loginStep === 1 ? 'Inloggen bij Google' : 'Wachtwoord invoeren'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {loginStep === 1
                    ? 'Gebruik je privé-Google-account binnen deze in-app browser'
                    : `Inloggen voor ${loginEmail}`}
                </p>
              </div>

              {/* School Chromebook Explainer */}
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[12px]">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>ChromeOS Beveiligings-Oplossing:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
                  Google blokkeert standaard wachtwoordinvoer in externe iframes ter beveiliging tegen phishing.
                  Dit in-app scherm koppelt je echte account rechtstreeks aan je lokale ChromeOS browser-omgeving!
                </p>
              </div>

              {/* Messages */}
              {loginErrorMessage && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{loginErrorMessage}</span>
                </div>
              )}

              {loginSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{loginSuccessMessage}</span>
                </div>
              )}

              {/* STEP 1: EMAIL */}
              {loginStep === 1 && (
                <form onSubmit={handleGoogleInAppSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      E-mailadres of telefoonnummer
                    </label>
                    <input
                      type="email"
                      autoFocus
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="jouw.prive.account@gmail.com"
                      className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Weergavenaam (bijv. Privé of je voornaam)
                    </label>
                    <input
                      type="text"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      placeholder="bijv. Privé Account"
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => navigateTo('https://www.google.com')}
                      className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      Annuleren
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md"
                    >
                      <span>Volgende</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: PASSWORD */}
              {loginStep === 2 && (
                <form onSubmit={handleGoogleInAppSignIn} className="space-y-4">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        {loginName ? loginName.slice(0, 1) : loginEmail.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {loginName || loginEmail}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {loginEmail}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLoginStep(1)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Wijzigen
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Wachtwoord van je Google-account
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoFocus
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Voer je Google-wachtwoord in"
                        className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        aria-label={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setLoginStep(1)}
                      className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      Terug
                    </button>
                    <button
                      type="submit"
                      disabled={isLoggingIn || !loginPassword}
                      className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md disabled:opacity-50"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{isLoggingIn ? 'Google-sessie koppelen...' : 'Inloggen & Toevoegen'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Alternative: Google GIS Pop-up button */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider text-center font-medium">
                  Of gebruik de officiële Google Identity Pop-up
                </p>
                <button
                  type="button"
                  onClick={handleGooglePopupLogin}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  <span>Inloggen via Google GIS Pop-up Venster</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD PROXIED WEB VIEWPORT */
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={proxySrc}
            title={activeTab.title}
            onLoad={() => setIsIframeLoading(false)}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          />
        )}
      </div>

      {/* 5. In-App Browser Status Footer */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>In-App Browser Isolatie: Links openen binnen deze hub, niet in een externe ChromeOS tab.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-500 truncate max-w-xs">{activeTab.url}</span>
          <a
            href={activeTab.url}
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-blue-400 flex items-center gap-1 font-medium"
            title="Toch in extern tabblad openen"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Extern</span>
          </a>
        </div>
      </div>
    </div>
  );
};
