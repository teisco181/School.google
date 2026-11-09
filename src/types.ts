export type AccountType = 'personal' | 'work' | 'school' | 'developer';
export type SessionStatus = 'active' | 'syncing' | 'offline' | 'paused';

export interface GoogleAccount {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  badgeColor: string; // Hex or Tailwind color
  type: AccountType;
  status: SessionStatus;
  lastSyncTime: number;
  unreadEmails: number;
  pendingTasks: number;
  todayEventsCount: number;
  storageUsedKb: number;
  isCurrentBrowserAccount?: boolean;
  accessToken?: string;
}

export interface GoogleEmail {
  id: string;
  accountId: string;
  accountEmail: string;
  from: string;
  to: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  isUnread: boolean;
  isStarred: boolean;
  labels: string[];
}

export interface GoogleCalendarEvent {
  id: string;
  accountId: string;
  accountEmail: string;
  title: string;
  start: string; // ISO string or '10:00'
  end: string;
  dateStr: string; // YYYY-MM-DD
  location?: string;
  attendees?: string[];
  color: string;
  isMeeting?: boolean;
  isConflicting?: boolean;
}

export interface GoogleDriveFile {
  id: string;
  accountId: string;
  accountEmail: string;
  name: string;
  type: 'doc' | 'sheet' | 'slide' | 'pdf' | 'folder';
  size: string;
  lastModified: string;
  starred: boolean;
  sharedWith?: string[];
}

export interface GoogleTask {
  id: string;
  accountId: string;
  accountEmail: string;
  title: string;
  dueDate?: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface AgentAction {
  type: string;
  payload: Record<string, string>;
  executed?: boolean;
}

export interface AgentSource {
  title: string;
  url: string;
}

export interface AgentMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  rawText?: string;
  timestamp: number;
  accountContext?: string;
  actions?: AgentAction[];
  sources?: AgentSource[];
  isError?: boolean;
  isThinking?: boolean;
}

export interface CacheMetrics {
  hitCount: number;
  missCount: number;
  totalOperations: number;
  storageUsedBytes: number;
  quotaBytes: number;
  avgRetrievalMs: number;
  memoryItems: number;
  diskItems: number;
  lastPurged: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // SHA-256 hash
  salt: string;
  avatarColor: string;
  createdAt: number;
  lastLogin: number;
  autoLockMinutes: number;
}

export interface BrowserHistoryEntry {
  id: string;
  userId: string;
  url: string;
  title: string;
  category: 'agent' | 'email' | 'agenda' | 'drive' | 'search' | 'account';
  timestamp: number;
  visitCount: number;
  snippet?: string;
}

export interface HistorySyncStats {
  totalEntries: number;
  lastSyncTimestamp: number;
  isSyncActive: boolean;
  browserSyncMode: 'local_native' | 'file_sync';
  syncStorageBytes: number;
}

