import React, { useState, useEffect } from 'react';
import { historySyncService } from '../services/historySyncService';
import { BrowserHistoryEntry, HistorySyncStats } from '../types';
import {
  History,
  Download,
  Upload,
  Trash2,
  Search,
  CheckCircle,
  ExternalLink,
  Shield,
  Clock,
  Sparkles,
  Mail,
  Calendar,
  Layers,
} from 'lucide-react';

interface HistorySyncPanelProps {
  onNavigateTab: (tab: 'agent' | 'inbox' | 'calendar' | 'drive' | 'cache') => void;
}

export const HistorySyncPanel: React.FC<HistorySyncPanelProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<HistorySyncStats>(historySyncService.getStats());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [historyList, setHistoryList] = useState<BrowserHistoryEntry[]>([]);

  useEffect(() => {
    const unsubscribe = historySyncService.subscribe(() => {
      setStats(historySyncService.getStats());
      setHistoryList(historySyncService.getHistory(150));
    });
    return () => unsubscribe();
  }, []);

  const filteredHistory = historyList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.snippet && item.snippet.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = historySyncService.importHistoryLocally(content);
      if (res.success) {
        alert(`${res.count} browsergeschiedenis-items lokaal geïmporteerd!`);
      } else {
        alert('Ongeldig geschiedenis-bestand.');
      }
    };
    reader.readAsText(file);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'agent':
        return <Sparkles className="w-3.5 h-3.5 text-blue-500" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-red-500" />;
      case 'agenda':
        return <Calendar className="w-3.5 h-3.5 text-amber-500" />;
      case 'account':
        return <Layers className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">
            <History className="w-3.5 h-3.5" />
            Zero-Cloud Lokale Browsergeschiedenis Synchronisatie
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Browsergeschiedenis & Sessielog
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Alle geopende e-mails, agenda-afspraken, zoekopdrachten en interacties met de Google Agent
            worden automatisch gesynchroniseerd met de <strong>lokale browsergeschiedenis</strong> via de{' '}
            Web History API. Er wordt <strong>géén externe cloud-dienst</strong> geraadpleegd: je privacy en data
            blijven 100% lokaal op dit Chromebook bewaard.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={() => historySyncService.exportHistoryLocally()}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Geschiedenis Exporteren (JSON)</span>
            </button>

            <label className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Geschiedenis Importeren</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>

            <button
              onClick={() => {
                if (confirm('Weet je zeker dat je alle lokale geschiedenis wilt wissen?')) {
                  historySyncService.clearHistory();
                }
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-medium rounded-xl border border-red-900/60 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Geschiedenis Wissen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Status KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Synchronisatiestatus</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {stats.isSyncActive ? 'Actief & Verbonden' : 'Gepauzeerd'}
          </p>
          <p className="text-[11px] text-slate-400">
            Native ChromeOS window.history tracking
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Totaal Geregistreerd</span>
            <History className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {stats.totalEntries} items
          </p>
          <p className="text-[11px] text-slate-400">
            Navigaties, e-mails, taken en prompts
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Cloud Afhankelijkheid</span>
            <Shield className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            0% Cloud (Volledig Lokaal)
          </p>
          <p className="text-[11px] text-slate-400">
            Opslag: {Math.max(1, Math.round(stats.syncStorageBytes / 1024))} KB op apparaat
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek in lokale browsergeschiedenis..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {['all', 'agent', 'email', 'agenda', 'account'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs rounded-lg capitalize transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat === 'all' ? 'Alles' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* History List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-96 overflow-y-auto pr-1">
          {filteredHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Geen geschiedenis gevonden voor deze filters.
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {item.snippet ? `${item.snippet} · ` : ''}
                      <span className="font-mono text-slate-500">{item.url}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => historySyncService.deleteEntry(item.id)}
                    className="text-slate-300 hover:text-red-500 p-1"
                    title="Verwijder dit item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
