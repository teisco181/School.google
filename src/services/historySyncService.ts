import { BrowserHistoryEntry, HistorySyncStats } from '../types';

const HISTORY_STORE_KEY = 'chromeos_local_browser_history_v1';

class HistorySyncService {
  private history: BrowserHistoryEntry[] = [];
  private isSyncActive = true;
  private listeners: Array<() => void> = [];
  private currentUserId: string = 'guest';

  constructor() {
    this.loadFromStorage();
    this.setupBrowserStateListener();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(`${HISTORY_STORE_KEY}_${this.currentUserId}`);
      if (stored) {
        this.history = JSON.parse(stored);
      } else {
        this.history = [];
      }
    } catch (e) {
      this.history = [];
    }
  }

  public setUserId(userId: string): void {
    this.currentUserId = userId;
    this.loadFromStorage();
    this.notify();
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        `${HISTORY_STORE_KEY}_${this.currentUserId}`,
        JSON.stringify(this.history.slice(0, 500)) // Cap to 500 entries for optimal Chromebook memory
      );
    } catch (e) {}
  }

  private setupBrowserStateListener(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.title) {
        this.recordHistoryEntry({
          url: window.location.pathname + window.location.hash,
          title: event.state.title,
          category: event.state.category || 'external',
          snippet: event.state.snippet,
        });
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    listener();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {}
    }
  }

  /**
   * Record a navigation or interaction into browser history (without any cloud service)
   */
  public recordHistoryEntry(params: {
    url: string;
    title: string;
    category: 'agent' | 'email' | 'agenda' | 'drive' | 'search' | 'account';
    snippet?: string;
  }): void {
    if (!this.isSyncActive) return;

    // Synchronize with native window.history without triggering a page reload
    if (typeof window !== 'undefined' && window.history && typeof window.history.pushState === 'function') {
      const hash = params.url.startsWith('#') ? params.url : `#${params.url}`;
      try {
        window.history.replaceState(
          { title: params.title, category: params.category, snippet: params.snippet },
          params.title,
          hash
        );
      } catch (e) {}
    }

    const existingIndex = this.history.findIndex(
      (h) => h.url === params.url && h.title === params.title
    );

    if (existingIndex >= 0) {
      // Update timestamp and increment visitCount
      this.history[existingIndex].timestamp = Date.now();
      this.history[existingIndex].visitCount += 1;
      if (params.snippet) this.history[existingIndex].snippet = params.snippet;
      // Move to top
      const item = this.history.splice(existingIndex, 1)[0];
      this.history.unshift(item);
    } else {
      const newEntry: BrowserHistoryEntry = {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId: this.currentUserId,
        url: params.url,
        title: params.title,
        category: params.category,
        timestamp: Date.now(),
        visitCount: 1,
        snippet: params.snippet,
      };
      this.history.unshift(newEntry);
    }

    this.saveToStorage();
    this.notify();
  }

  public getHistory(limit = 100): BrowserHistoryEntry[] {
    return this.history.slice(0, limit);
  }

  public searchHistory(query: string): BrowserHistoryEntry[] {
    if (!query.trim()) return this.history.slice(0, 50);
    const q = query.toLowerCase();
    return this.history
      .filter(
        (h) =>
          h.title.toLowerCase().includes(q) ||
          h.url.toLowerCase().includes(q) ||
          (h.snippet && h.snippet.toLowerCase().includes(q))
      )
      .slice(0, 50);
  }

  public clearHistory(): void {
    this.history = [];
    this.saveToStorage();
    this.notify();
  }

  public deleteEntry(id: string): void {
    this.history = this.history.filter((h) => h.id !== id);
    this.saveToStorage();
    this.notify();
  }

  public toggleSync(active?: boolean): void {
    this.isSyncActive = active !== undefined ? active : !this.isSyncActive;
    this.notify();
  }

  public getStats(): HistorySyncStats {
    const rawData = JSON.stringify(this.history);
    return {
      totalEntries: this.history.length,
      lastSyncTimestamp: this.history[0]?.timestamp || Date.now(),
      isSyncActive: this.isSyncActive,
      browserSyncMode: 'local_native',
      syncStorageBytes: new Blob([rawData]).size,
    };
  }

  /**
   * Export history locally as JSON file (100% offline, zero cloud)
   */
  public exportHistoryLocally(): void {
    const dataStr = JSON.stringify(this.history, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chromeos_browser_geschiedenis_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import history locally from a JSON file
   */
  public importHistoryLocally(jsonString: string): { success: boolean; count: number } {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        const validEntries: BrowserHistoryEntry[] = parsed.filter(
          (item) => item.title && item.url
        );
        this.history = [...validEntries, ...this.history].slice(0, 500);
        this.saveToStorage();
        this.notify();
        return { success: true, count: validEntries.length };
      }
      return { success: false, count: 0 };
    } catch (e) {
      return { success: false, count: 0 };
    }
  }
}

export const historySyncService = new HistorySyncService();
