import { CacheMetrics } from '../types';

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number; // in ms
  sizeBytes: number;
  accountId?: string;
}

class ChromeOSCacheEngine {
  private dbName = 'ChromeOS_Workspace_Cache_v1';
  private storeName = 'workspace_cache_store';
  private db: IDBDatabase | null = null;
  private isDbReady = false;

  // L1 In-Memory Fast LRU Cache (max 100 hot items for minimal Chromebook RAM impact)
  private memoryCache = new Map<string, CacheEntry<any>>();
  private maxMemoryItems = 100;

  // Metrics telemetry
  private metrics: CacheMetrics = {
    hitCount: 0,
    missCount: 0,
    totalOperations: 0,
    storageUsedBytes: 0,
    quotaBytes: 0,
    avgRetrievalMs: 0.8,
    memoryItems: 0,
    diskItems: 0,
    lastPurged: Date.now(),
  };

  private latencies: number[] = [0.8, 1.2, 0.5, 0.9];
  private listeners: Array<(metrics: CacheMetrics) => void> = [];

  constructor() {
    this.initIndexedDb();
    this.updateStorageQuota();
  }

  private async initIndexedDb(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      this.isDbReady = false;
      return;
    }

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(this.dbName, 1);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('accountId', 'accountId', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          this.isDbReady = true;
          this.syncDiskMetrics();
          resolve();
        };

        request.onerror = () => {
          console.warn('IndexedDB initialisatiefout, fallback naar geheugencache.');
          this.isDbReady = false;
          resolve();
        };
      } catch (err) {
        console.warn('Fout bij openen IndexedDB:', err);
        this.isDbReady = false;
        resolve();
      }
    });
  }

  public subscribe(callback: (metrics: CacheMetrics) => void): () => void {
    this.listeners.push(callback);
    callback({ ...this.metrics });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify(): void {
    const avg =
      this.latencies.length > 0
        ? Number(
            (
              this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
            ).toFixed(2)
          )
        : 1.0;

    this.metrics = {
      ...this.metrics,
      avgRetrievalMs: avg,
      memoryItems: this.memoryCache.size,
    };

    for (const listener of this.listeners) {
      try {
        listener({ ...this.metrics });
      } catch (e) {
        console.error(e);
      }
    }
  }

  public async get<T>(
    key: string
  ): Promise<{ data: T | null; isHit: boolean; latencyMs: number; source: 'L1-RAM' | 'L2-IndexedDB' | 'MISS' }> {
    const startTime = performance.now();
    this.metrics.totalOperations++;

    // 1. Check L1 In-Memory Cache (Ultra fast < 0.5ms)
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key)!;
      const isExpired = entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl;

      if (!isExpired) {
        // Move to end for LRU refresh
        this.memoryCache.delete(key);
        this.memoryCache.set(key, entry);

        const latency = performance.now() - startTime;
        this.recordLatency(latency);
        this.metrics.hitCount++;
        this.notify();
        return { data: entry.data as T, isHit: true, latencyMs: Number(latency.toFixed(2)), source: 'L1-RAM' };
      } else {
        this.memoryCache.delete(key);
      }
    }

    // 2. Check L2 IndexedDB Cache (Fast persistent < 3ms)
    if (this.isDbReady && this.db) {
      try {
        const dbData = await this.readFromDb<T>(key);
        if (dbData) {
          const isExpired = dbData.ttl > 0 && Date.now() - dbData.timestamp > dbData.ttl;
          if (!isExpired) {
            // Promote to L1 Memory Cache
            this.putInMemory(key, dbData.data, dbData.ttl, dbData.sizeBytes, dbData.accountId);

            const latency = performance.now() - startTime;
            this.recordLatency(latency);
            this.metrics.hitCount++;
            this.notify();
            return { data: dbData.data, isHit: true, latencyMs: Number(latency.toFixed(2)), source: 'L2-IndexedDB' };
          } else {
            this.deleteFromDb(key);
          }
        }
      } catch (err) {
        console.warn('Cache read error:', err);
      }
    }

    // 3. Cache Miss
    const latency = performance.now() - startTime;
    this.recordLatency(latency);
    this.metrics.missCount++;
    this.notify();
    return { data: null, isHit: false, latencyMs: Number(latency.toFixed(2)), source: 'MISS' };
  }

  public async set<T>(key: string, data: T, ttlMs: number = 1000 * 60 * 60 * 24, accountId?: string): Promise<void> {
    const strData = JSON.stringify(data);
    const sizeBytes = new Blob([strData]).size;

    // Save to L1 Memory Cache
    this.putInMemory(key, data, ttlMs, sizeBytes, accountId);

    // Save to L2 IndexedDB
    if (this.isDbReady && this.db) {
      await this.writeToDb(key, data, ttlMs, sizeBytes, accountId);
    }

    this.metrics.storageUsedBytes += sizeBytes;
    this.syncDiskMetrics();
    this.notify();
  }

  private putInMemory<T>(key: string, data: T, ttl: number, sizeBytes: number, accountId?: string): void {
    if (this.memoryCache.size >= this.maxMemoryItems) {
      // Evict oldest (first) item to protect Chromebook RAM
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(key, {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      sizeBytes,
      accountId,
    });
  }

  private readFromDb<T>(key: string): Promise<CacheEntry<T> | null> {
    return new Promise((resolve) => {
      if (!this.db) return resolve(null);
      try {
        const tx = this.db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(key);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  private writeToDb<T>(key: string, data: T, ttl: number, sizeBytes: number, accountId?: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db) return resolve();
      try {
        const tx = this.db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const entry: CacheEntry<T> = {
          key,
          data,
          timestamp: Date.now(),
          ttl,
          sizeBytes,
          accountId,
        };
        store.put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  private deleteFromDb(key: string): void {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.delete(key);
    } catch (e) {}
  }

  public async invalidateAccount(accountId: string): Promise<void> {
    // Clean memory
    for (const [k, v] of this.memoryCache.entries()) {
      if (v.accountId === accountId || k.includes(accountId)) {
        this.memoryCache.delete(k);
      }
    }

    // Clean IndexedDB
    if (this.isDbReady && this.db) {
      try {
        const tx = this.db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.openCursor();
        req.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            if (cursor.value.accountId === accountId || cursor.key.toString().includes(accountId)) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
      } catch (e) {}
    }

    this.syncDiskMetrics();
    this.notify();
  }

  public async clearAll(): Promise<void> {
    this.memoryCache.clear();
    if (this.isDbReady && this.db) {
      try {
        const tx = this.db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).clear();
      } catch (e) {}
    }
    this.metrics.hitCount = 0;
    this.metrics.missCount = 0;
    this.metrics.totalOperations = 0;
    this.metrics.storageUsedBytes = 0;
    this.metrics.diskItems = 0;
    this.metrics.lastPurged = Date.now();
    this.notify();
  }

  private recordLatency(ms: number): void {
    this.latencies.push(ms);
    if (this.latencies.length > 25) {
      this.latencies.shift();
    }
  }

  private async syncDiskMetrics(): Promise<void> {
    if (!this.isDbReady || !this.db) return;

    try {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const countReq = store.count();

      countReq.onsuccess = () => {
        this.metrics.diskItems = countReq.result || 0;
      };

      let totalBytes = 0;
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          totalBytes += cursor.value.sizeBytes || 1024;
          cursor.continue();
        } else {
          this.metrics.storageUsedBytes = totalBytes;
          this.notify();
        }
      };
    } catch (e) {}
  }

  private async updateStorageQuota(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        this.metrics.quotaBytes = estimate.quota || 1024 * 1024 * 1024 * 10; // 10 GB default
        if (estimate.usage) {
          this.metrics.storageUsedBytes = estimate.usage;
        }
      } catch (e) {}
    }
  }

  public getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }
}

export const cacheEngine = new ChromeOSCacheEngine();
