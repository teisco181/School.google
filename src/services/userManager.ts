import { UserProfile, GoogleAccount, GoogleEmail, GoogleCalendarEvent, GoogleDriveFile, GoogleTask } from '../types';
import { CryptoService } from './cryptoService';
import { historySyncService } from './historySyncService';
import { cacheEngine } from './cacheEngine';
import { DEFAULT_PRIMARY_ACCOUNT, INITIAL_EMAILS, INITIAL_EVENTS, INITIAL_FILES, INITIAL_TASKS } from './mockDataGenerator';

const USERS_STORAGE_KEY = 'chromeos_multi_user_profiles_v1';
const ACTIVE_USER_ID_KEY = 'chromeos_active_user_id';
const SESSION_AUTH_KEY = 'chromeos_session_authenticated';

class UserManager {
  private users: UserProfile[] = [];
  private activeUser: UserProfile | null = null;
  private isAuthenticated = false;
  private listeners: Array<() => void> = [];
  private inactivityTimer: any = null;

  constructor() {
    this.init();
    this.setupInactivityListener();
  }

  private async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      if (storedUsers) {
        this.users = JSON.parse(storedUsers);
      } else {
        // Initial setup with primary user Teisco
        const salt = CryptoService.generateSalt();
        const initialHash = await CryptoService.hashPassword('1234', salt); // Default quick unlock PIN 1234
        const defaultUser: UserProfile = {
          id: 'usr-primary-teisco',
          name: 'Teisco',
          email: 'teisco181@gmail.com',
          passwordHash: initialHash,
          salt: salt,
          avatarColor: '#4285F4',
          createdAt: Date.now(),
          lastLogin: Date.now(),
          autoLockMinutes: 15,
        };
        this.users = [defaultUser];
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users));
      }

      // Check if session is already authenticated in this browser tab
      const isAuthInSession = sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';
      const activeId = localStorage.getItem(ACTIVE_USER_ID_KEY) || this.users[0]?.id;

      if (activeId) {
        this.activeUser = this.users.find((u) => u.id === activeId) || this.users[0] || null;
      }

      // User must log in every time the app opens fresh!
      this.isAuthenticated = isAuthInSession && Boolean(this.activeUser);

      if (this.activeUser) {
        historySyncService.setUserId(this.activeUser.id);
      }
    } catch (e) {
      console.warn('UserManager initialization error:', e);
    }

    this.notify();
  }

  private setupInactivityListener(): void {
    if (typeof window === 'undefined') return;

    const resetTimer = () => {
      if (!this.isAuthenticated || !this.activeUser) return;
      if (this.inactivityTimer) clearTimeout(this.inactivityTimer);

      const minutes = this.activeUser.autoLockMinutes || 15;
      this.inactivityTimer = setTimeout(() => {
        this.lockSession();
      }, minutes * 60 * 1000);
    };

    window.addEventListener('mousemove', resetTimer, { passive: true });
    window.addEventListener('keydown', resetTimer, { passive: true });
    window.addEventListener('click', resetTimer, { passive: true });
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

  public getUsers(): UserProfile[] {
    return [...this.users];
  }

  public getActiveUser(): UserProfile | null {
    return this.activeUser;
  }

  public getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Log in with PIN or Password
   */
  public async login(userId: string, pinOrPassword: string): Promise<{ success: boolean; error?: string }> {
    const user = this.users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: 'Gebruikersprofiel niet gevonden.' };
    }

    const isValid = await CryptoService.verifyPassword(pinOrPassword, user.salt, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Onjuiste PIN of wachtwoord. Probeer opnieuw.' };
    }

    this.activeUser = user;
    this.isAuthenticated = true;
    user.lastLogin = Date.now();

    sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
    localStorage.setItem(ACTIVE_USER_ID_KEY, user.id);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users));

    historySyncService.setUserId(user.id);
    historySyncService.recordHistoryEntry({
      url: '#login',
      title: `Ingelogd als ${user.name} (${user.email})`,
      category: 'account',
      snippet: 'Beveiligde lokale authenticatie voltooid.',
    });

    this.notify();
    return { success: true };
  }

  /**
   * Register a new user profile on this Chromebook
   */
  public async createProfile(params: {
    name: string;
    email: string;
    pin: string;
    avatarColor?: string;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    if (!params.name.trim() || !params.email.trim() || !params.pin.trim()) {
      return { success: false, error: 'Alle velden inclusief een beveiligings-PIN zijn verplicht.' };
    }

    if (this.users.some((u) => u.email.toLowerCase() === params.email.toLowerCase())) {
      return { success: false, error: 'Er bestaat al een profiel met dit e-mailadres op dit apparaat.' };
    }

    const salt = CryptoService.generateSalt();
    const hash = await CryptoService.hashPassword(params.pin, salt);

    const newUser: UserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      passwordHash: hash,
      salt: salt,
      avatarColor: params.avatarColor || '#0F9D58',
      createdAt: Date.now(),
      lastLogin: Date.now(),
      autoLockMinutes: 15,
    };

    this.users.push(newUser);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users));

    // Automatically authenticate the new user
    this.activeUser = newUser;
    this.isAuthenticated = true;
    sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
    localStorage.setItem(ACTIVE_USER_ID_KEY, newUser.id);
    historySyncService.setUserId(newUser.id);

    historySyncService.recordHistoryEntry({
      url: '#profile-created',
      title: `Nieuw gebruikersprofiel aangemaakt: ${newUser.name}`,
      category: 'account',
      snippet: 'Beveiligd profiel met lokale encryptie aangemaakt.',
    });

    this.notify();
    return { success: true, user: newUser };
  }

  /**
   * Lock the current session ("steeds opnieuw inloggen")
   */
  public lockSession(): void {
    this.isAuthenticated = false;
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    historySyncService.recordHistoryEntry({
      url: '#locked',
      title: 'Sessie vergrendeld',
      category: 'account',
      snippet: 'Beveiligde sessievergrendeling geactiveerd.',
    });
    this.notify();
  }

  /**
   * Log out completely and choose another profile
   */
  public logout(): void {
    this.isAuthenticated = false;
    this.activeUser = null;
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    localStorage.removeItem(ACTIVE_USER_ID_KEY);
    this.notify();
  }

  /**
   * Delete a profile from this device
   */
  public deleteProfile(userId: string): void {
    if (this.users.length <= 1) {
      alert('Er moet minimaal één gebruikersprofiel behouden blijven.');
      return;
    }

    this.users = this.users.filter((u) => u.id !== userId);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users));

    if (this.activeUser?.id === userId) {
      this.logout();
    } else {
      this.notify();
    }
  }
}

export const userManager = new UserManager();
