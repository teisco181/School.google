import { GoogleAccount, GoogleEmail, GoogleCalendarEvent, GoogleDriveFile, GoogleTask, AccountType } from '../types';
import { cacheEngine } from './cacheEngine';
import { historySyncService } from './historySyncService';
import { INITIAL_ACCOUNTS, INITIAL_EMAILS, INITIAL_EVENTS, INITIAL_FILES, INITIAL_TASKS } from './mockDataGenerator';

const ACCOUNTS_CACHE_KEY = 'google_accounts_list_v2';
const EMAILS_CACHE_KEY = 'google_emails_list_v2';
const EVENTS_CACHE_KEY = 'google_events_list_v2';
const FILES_CACHE_KEY = 'google_files_list_v2';
const TASKS_CACHE_KEY = 'google_tasks_list_v2';
const ACTIVE_ACCOUNT_CACHE_KEY = 'google_active_account_id_v2';

class GoogleAccountManager {
  private accounts: GoogleAccount[] = [];
  private activeAccountId: string | 'ALL' = 'ALL';
  private emails: GoogleEmail[] = [];
  private events: GoogleCalendarEvent[] = [];
  private files: GoogleDriveFile[] = [];
  private tasks: GoogleTask[] = [];

  private listeners: Array<() => void> = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public async init(): Promise<void> {
    // Load from cacheEngine (L1 or L2 IndexedDB)
    const [accResult, emailResult, eventResult, fileResult, taskResult, activeIdResult] = await Promise.all([
      cacheEngine.get<GoogleAccount[]>(ACCOUNTS_CACHE_KEY),
      cacheEngine.get<GoogleEmail[]>(EMAILS_CACHE_KEY),
      cacheEngine.get<GoogleCalendarEvent[]>(EVENTS_CACHE_KEY),
      cacheEngine.get<GoogleDriveFile[]>(FILES_CACHE_KEY),
      cacheEngine.get<GoogleTask[]>(TASKS_CACHE_KEY),
      cacheEngine.get<string>(ACTIVE_ACCOUNT_CACHE_KEY),
    ]);

    if (accResult.data && accResult.data.length > 0) {
      this.accounts = accResult.data;
      this.emails = emailResult.data || INITIAL_EMAILS;
      this.events = eventResult.data || INITIAL_EVENTS;
      this.files = fileResult.data || INITIAL_FILES;
      this.tasks = taskResult.data || INITIAL_TASKS;
      this.activeAccountId = activeIdResult.data || this.accounts[0]?.id || 'ALL';
    } else {
      // First run: populate clean single default account without alt fake accounts
      this.accounts = INITIAL_ACCOUNTS;
      this.emails = INITIAL_EMAILS;
      this.events = INITIAL_EVENTS;
      this.files = INITIAL_FILES;
      this.tasks = INITIAL_TASKS;
      this.activeAccountId = this.accounts[0]?.id || 'ALL';

      await this.persistAll();
    }

    this.recalculateAccountCounters();
    this.isInitialized = true;
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    if (this.isInitialized) {
      listener();
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error(e);
      }
    }
  }

  private async persistAll(): Promise<void> {
    await Promise.all([
      cacheEngine.set(ACCOUNTS_CACHE_KEY, this.accounts),
      cacheEngine.set(EMAILS_CACHE_KEY, this.emails),
      cacheEngine.set(EVENTS_CACHE_KEY, this.events),
      cacheEngine.set(FILES_CACHE_KEY, this.files),
      cacheEngine.set(TASKS_CACHE_KEY, this.tasks),
      cacheEngine.set(ACTIVE_ACCOUNT_CACHE_KEY, this.activeAccountId),
    ]);
  }

  private recalculateAccountCounters(): void {
    for (const acc of this.accounts) {
      acc.unreadEmails = this.emails.filter((e) => e.accountId === acc.id && e.isUnread).length;
      acc.pendingTasks = this.tasks.filter((t) => t.accountId === acc.id && !t.completed).length;
      acc.todayEventsCount = this.events.filter((ev) => ev.accountId === acc.id).length;
    }
  }

  // Getters
  public getAccounts(): GoogleAccount[] {
    return [...this.accounts];
  }

  public getActiveAccountId(): string | 'ALL' {
    return this.activeAccountId;
  }

  public getActiveAccount(): GoogleAccount | null {
    if (this.activeAccountId === 'ALL') return null;
    return this.accounts.find((a) => a.id === this.activeAccountId) || null;
  }

  public setActiveAccount(id: string | 'ALL'): void {
    this.activeAccountId = id;
    cacheEngine.set(ACTIVE_ACCOUNT_CACHE_KEY, id);

    const targetAcc = this.accounts.find((a) => a.id === id);
    historySyncService.recordHistoryEntry({
      url: id === 'ALL' ? '#accounts/all' : `#account/${id}`,
      title: id === 'ALL' ? 'Alle accounts gecombineerd' : `Sessie gewisseld naar ${targetAcc?.name || id}`,
      category: 'account',
      snippet: targetAcc ? targetAcc.email : 'Multi-sessie overzicht',
    });

    this.notify();
  }

  public getEmails(accountId?: string | 'ALL'): GoogleEmail[] {
    const target = accountId || this.activeAccountId;
    if (target === 'ALL') return [...this.emails];
    return this.emails.filter((e) => e.accountId === target);
  }

  public getEvents(accountId?: string | 'ALL'): GoogleCalendarEvent[] {
    const target = accountId || this.activeAccountId;
    if (target === 'ALL') return [...this.events];
    return this.events.filter((ev) => ev.accountId === target);
  }

  public getFiles(accountId?: string | 'ALL'): GoogleDriveFile[] {
    const target = accountId || this.activeAccountId;
    if (target === 'ALL') return [...this.files];
    return this.files.filter((f) => f.accountId === target);
  }

  public getTasks(accountId?: string | 'ALL'): GoogleTask[] {
    const target = accountId || this.activeAccountId;
    if (target === 'ALL') return [...this.tasks];
    return this.tasks.filter((t) => t.accountId === target);
  }

  // Multi-Account Operations
  public async addGoogleAccount(params: {
    name: string;
    email: string;
    type: AccountType;
    badgeColor?: string;
    avatarUrl?: string;
  }): Promise<GoogleAccount> {
    const defaultColors = ['#4285F4', '#0F9D58', '#EA4335', '#FBBC04', '#9333EA', '#06B6D4'];
    const color = params.badgeColor || defaultColors[this.accounts.length % defaultColors.length];

    const newId = `acc-${Date.now()}`;
    const newAccount: GoogleAccount = {
      id: newId,
      name: params.name,
      email: params.email,
      avatarUrl:
        params.avatarUrl ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(params.name)}&backgroundColor=${color.replace('#', '')}`,
      badgeColor: color,
      type: params.type,
      status: 'active',
      lastSyncTime: Date.now(),
      unreadEmails: 1,
      pendingTasks: 1,
      todayEventsCount: 0,
      storageUsedKb: 850,
      isCurrentBrowserAccount: false,
    };

    this.accounts.push(newAccount);

    // Initial confirmation email for the newly added account
    const welcomeEmail: GoogleEmail = {
      id: `email-${Date.now()}`,
      accountId: newId,
      accountEmail: params.email,
      from: 'Google Accounts <no-reply@accounts.google.com>',
      to: params.email,
      subject: `Account gekoppeld: ${params.name}`,
      preview: 'Je account is succesvol toegevoegd aan de lokale multi-sessie omgeving...',
      body: `Beste ${params.name},\n\nJe Google-account (${params.email}) is nu actief gekoppeld. Deze sessie is lokaal opgeslagen en beveiligd met browsergeschiedenis-synchronisatie.\n\nJe kunt nu e-mails lezen, agenda-afspraken beheren en bestanden synchroniseren zonder cloud-tussenkomst.\n\nMet vriendelijke groet,\nGoogle Accounts`,
      date: 'Zojuist',
      isUnread: true,
      isStarred: false,
      labels: ['Inbox', 'Beveiliging'],
    };

    this.emails.unshift(welcomeEmail);
    this.recalculateAccountCounters();
    this.activeAccountId = newId;

    // Record into local browser history
    historySyncService.recordHistoryEntry({
      url: `#account/add/${newId}`,
      title: `Google-account toegevoegd: ${params.name} (${params.email})`,
      category: 'account',
      snippet: `Type: ${params.type}`,
    });

    await this.persistAll();
    this.notify();
    return newAccount;
  }

  public async removeAccount(accountId: string): Promise<void> {
    if (this.accounts.length <= 1) {
      alert('Je moet minimaal één actief Google-account behouden.');
      return;
    }

    const removing = this.accounts.find((a) => a.id === accountId);
    this.accounts = this.accounts.filter((a) => a.id !== accountId);
    this.emails = this.emails.filter((e) => e.accountId !== accountId);
    this.events = this.events.filter((ev) => ev.accountId !== accountId);
    this.files = this.files.filter((f) => f.accountId !== accountId);
    this.tasks = this.tasks.filter((t) => t.accountId !== accountId);

    if (this.activeAccountId === accountId) {
      this.activeAccountId = this.accounts[0]?.id || 'ALL';
    }

    if (removing) {
      historySyncService.recordHistoryEntry({
        url: '#account/removed',
        title: `Account verwijderd: ${removing.name}`,
        category: 'account',
      });
    }

    await cacheEngine.invalidateAccount(accountId);
    await this.persistAll();
    this.notify();
  }

  // Actions with browser history synchronization
  public async toggleEmailRead(emailId: string): Promise<void> {
    const email = this.emails.find((e) => e.id === emailId);
    if (email) {
      email.isUnread = !email.isUnread;
      this.recalculateAccountCounters();
      await cacheEngine.set(EMAILS_CACHE_KEY, this.emails);
      await cacheEngine.set(ACCOUNTS_CACHE_KEY, this.accounts);

      historySyncService.recordHistoryEntry({
        url: `#mail/${email.id}`,
        title: `E-mail ${email.isUnread ? 'ongelezen' : 'gelezen'}: ${email.subject}`,
        category: 'email',
        snippet: email.preview,
      });

      this.notify();
    }
  }

  public async toggleEmailStar(emailId: string): Promise<void> {
    const email = this.emails.find((e) => e.id === emailId);
    if (email) {
      email.isStarred = !email.isStarred;
      await cacheEngine.set(EMAILS_CACHE_KEY, this.emails);
      this.notify();
    }
  }

  public async composeEmail(params: {
    accountId: string;
    to: string;
    subject: string;
    body: string;
  }): Promise<GoogleEmail> {
    const acc = this.accounts.find((a) => a.id === params.accountId) || this.accounts[0];
    const newEmail: GoogleEmail = {
      id: `email-sent-${Date.now()}`,
      accountId: acc.id,
      accountEmail: acc.email,
      from: `${acc.name} <${acc.email}>`,
      to: params.to,
      subject: params.subject,
      preview: params.body.slice(0, 80) + '...',
      body: params.body,
      date: 'Zojuist',
      isUnread: false,
      isStarred: false,
      labels: ['Verzonden'],
    };

    this.emails.unshift(newEmail);
    await cacheEngine.set(EMAILS_CACHE_KEY, this.emails);

    // Synchronize into local browser history
    historySyncService.recordHistoryEntry({
      url: `#mail/sent/${newEmail.id}`,
      title: `E-mail verzonden: ${params.subject}`,
      category: 'email',
      snippet: `Naar: ${params.to} van ${acc.email}`,
    });

    this.notify();
    return newEmail;
  }

  public async addCalendarEvent(params: {
    accountId: string;
    title: string;
    start: string;
    end: string;
    location?: string;
    dateStr?: string;
  }): Promise<GoogleCalendarEvent> {
    const acc = this.accounts.find((a) => a.id === params.accountId) || this.accounts[0];
    const newEvent: GoogleCalendarEvent = {
      id: `ev-${Date.now()}`,
      accountId: acc.id,
      accountEmail: acc.email,
      title: params.title,
      start: params.start,
      end: params.end,
      dateStr: params.dateStr || new Date().toISOString().split('T')[0],
      location: params.location || 'Google Meet',
      color: acc.badgeColor,
      isMeeting: true,
    };

    this.events.push(newEvent);
    this.recalculateAccountCounters();
    await cacheEngine.set(EVENTS_CACHE_KEY, this.events);
    await cacheEngine.set(ACCOUNTS_CACHE_KEY, this.accounts);

    // Synchronize into local browser history
    historySyncService.recordHistoryEntry({
      url: `#agenda/event/${newEvent.id}`,
      title: `Afspraak gepland: ${params.title}`,
      category: 'agenda',
      snippet: `${params.start} - ${params.end} in ${acc.name}`,
    });

    this.notify();
    return newEvent;
  }

  public async addTask(params: {
    accountId: string;
    title: string;
    dueDate?: string;
    priority?: 'high' | 'medium' | 'low';
  }): Promise<GoogleTask> {
    const acc = this.accounts.find((a) => a.id === params.accountId) || this.accounts[0];
    const newTask: GoogleTask = {
      id: `task-${Date.now()}`,
      accountId: acc.id,
      accountEmail: acc.email,
      title: params.title,
      dueDate: params.dueDate || 'Vandaag',
      completed: false,
      priority: params.priority || 'medium',
    };

    this.tasks.unshift(newTask);
    this.recalculateAccountCounters();
    await cacheEngine.set(TASKS_CACHE_KEY, this.tasks);
    await cacheEngine.set(ACCOUNTS_CACHE_KEY, this.accounts);

    // Synchronize into local browser history
    historySyncService.recordHistoryEntry({
      url: `#taken/task/${newTask.id}`,
      title: `Taak toegevoegd: ${params.title}`,
      category: 'agenda',
      snippet: `Deadline: ${newTask.dueDate}`,
    });

    this.notify();
    return newTask;
  }

  public async toggleTask(taskId: string): Promise<void> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.recalculateAccountCounters();
      await cacheEngine.set(TASKS_CACHE_KEY, this.tasks);
      await cacheEngine.set(ACCOUNTS_CACHE_KEY, this.accounts);
      this.notify();
    }
  }

  public async syncAllAccounts(): Promise<void> {
    for (const acc of this.accounts) {
      acc.status = 'syncing';
    }
    this.notify();

    await new Promise((r) => setTimeout(r, 400));

    for (const acc of this.accounts) {
      acc.status = 'active';
      acc.lastSyncTime = Date.now();
    }
    await this.persistAll();
    this.notify();
  }

  public getWorkspaceSnapshot(): {
    emails: Array<{ accountEmail: string; from: string; subject: string; date: string; isUnread: boolean; preview: string }>;
    events: Array<{ accountEmail: string; title: string; start: string; end: string; location?: string }>;
    tasks: Array<{ accountEmail: string; title: string; dueDate?: string; completed: boolean }>;
  } {
    return {
      emails: this.emails.slice(0, 15).map((e) => ({
        accountEmail: e.accountEmail,
        from: e.from,
        subject: e.subject,
        date: e.date,
        isUnread: e.isUnread,
        preview: e.preview,
      })),
      events: this.events.slice(0, 15).map((ev) => ({
        accountEmail: ev.accountEmail,
        title: ev.title,
        start: ev.start,
        end: ev.end,
        location: ev.location,
      })),
      tasks: this.tasks.slice(0, 15).map((t) => ({
        accountEmail: t.accountEmail,
        title: t.title,
        dueDate: t.dueDate,
        completed: t.completed,
      })),
    };
  }
}

export const accountManager = new GoogleAccountManager();
