import React, { useState, useEffect, useRef } from 'react';
import { GoogleAccount } from '../types';
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
  Layers,
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

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
              title: title || (url.includes('google.com') ? 'Google' : url.replace(/^https?:\/\//, '').split('/')[0]),
            }
          : t
      )
    );

    // Record into local zero-cloud browser history
    historySyncService.recordHistoryEntry({
      url,
      title: title || url,
      category: 'search',
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
      // Don't close last tab, just reset to Google
      navigateTo('https://www.google.com');
      return;
    }
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[remaining.length - 1].id);
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
                <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
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
            placeholder="Zoek op Google of typ een webadres (bijv. google.com of accounts.google.com)..."
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 whitespace-nowrap text-[11px] font-medium transition-colors shrink-0"
          >
            <span>{bm.icon}</span>
            <span>{bm.label}</span>
          </button>
        ))}
      </div>

      {/* 4. Embedded Web Viewport (Proxied without opening external tabs) */}
      <div className="flex-1 bg-white relative overflow-hidden">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={proxySrc}
          title={activeTab.title}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        />
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
