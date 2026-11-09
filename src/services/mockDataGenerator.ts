import { GoogleAccount, GoogleEmail, GoogleCalendarEvent, GoogleDriveFile, GoogleTask } from '../types';

/**
 * Clean baseline data without any fake or dummy alt accounts.
 * Multi-user profiles create their own clean workspace accounts.
 */
export const DEFAULT_PRIMARY_ACCOUNT: GoogleAccount = {
  id: 'acc-primary',
  name: 'Teisco',
  email: 'teisco181@gmail.com',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
  badgeColor: '#4285F4',
  type: 'personal',
  status: 'active',
  lastSyncTime: Date.now(),
  unreadEmails: 1,
  pendingTasks: 1,
  todayEventsCount: 1,
  storageUsedKb: 1420,
  isCurrentBrowserAccount: true,
};

export const INITIAL_ACCOUNTS: GoogleAccount[] = [DEFAULT_PRIMARY_ACCOUNT];

export const INITIAL_EMAILS: GoogleEmail[] = [
  {
    id: 'email-1',
    accountId: 'acc-primary',
    accountEmail: 'teisco181@gmail.com',
    from: 'Google Beveiliging <no-reply@accounts.google.com>',
    to: 'teisco181@gmail.com',
    subject: 'Beveiligde ChromeOS sessie succesvol geactiveerd',
    preview: 'Je Google-account is lokaal beveiligd met end-to-end hardware versleuteling...',
    body: 'Beste Teisco,\n\nJe Google-account (teisco181@gmail.com) is nu actief binnen deze beveiligde ChromeOS multi-user omgeving. Al je gegevens worden lokaal opgeslagen met Web Crypto encryptie en gesynchroniseerd met je browsergeschiedenis zonder tussenkomst van externe cloud services.\n\nJe kunt op elk gewenst moment uitloggen, de sessie vergrendelen met je PIN of extra accounts koppelen.\n\nMet vriendelijke groet,\nGoogle Accounts Beveiligingsteam',
    date: 'Zojuist',
    isUnread: true,
    isStarred: true,
    labels: ['Inbox', 'Beveiliging'],
  },
];

export const INITIAL_EVENTS: GoogleCalendarEvent[] = [
  {
    id: 'event-1',
    accountId: 'acc-primary',
    accountEmail: 'teisco181@gmail.com',
    title: '📅 Google Agent & Workspace Sync',
    start: '10:00',
    end: '11:00',
    dateStr: new Date().toISOString().split('T')[0],
    location: 'Lokaal op Chromebook',
    color: '#4285F4',
    isMeeting: false,
    isConflicting: false,
  },
];

export const INITIAL_FILES: GoogleDriveFile[] = [
  {
    id: 'file-1',
    accountId: 'acc-primary',
    accountEmail: 'teisco181@gmail.com',
    name: 'Lokale_Gegevensbeveiliging_ChromeOS.gdoc',
    type: 'doc',
    size: '128 KB',
    lastModified: 'Vandaag',
    starred: true,
  },
];

export const INITIAL_TASKS: GoogleTask[] = [
  {
    id: 'task-1',
    accountId: 'acc-primary',
    accountEmail: 'teisco181@gmail.com',
    title: 'Beveiligings-PIN en profiel configureren',
    dueDate: 'Vandaag',
    completed: true,
    priority: 'high',
  },
];
