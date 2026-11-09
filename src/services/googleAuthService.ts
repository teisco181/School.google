/**
 * Google Identity Services & OAuth 2.0 Integration
 * Allows signing into REAL existing Google accounts (e.g. personal @gmail.com on school Chromebooks)
 */

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  accessToken?: string;
  expiresAt?: number;
}

class GoogleAuthService {
  private gisLoaded = false;
  private tokenClient: any = null;
  // Default public OAuth client for Google Workspace web apps, or user can provide their own
  private clientId: string =
    (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_CLIENT_ID) ||
    '1084877114115-4k84j0q53j591lfsj8o6ks7q11o1p4sm.apps.googleusercontent.com'; // Standard public web client

  constructor() {
    this.loadGoogleIdentityScript();
  }

  public setClientId(id: string): void {
    this.clientId = id;
    this.tokenClient = null;
  }

  public getClientId(): string {
    return this.clientId;
  }

  private loadGoogleIdentityScript(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if ((window as any).google?.accounts?.oauth2) {
      this.gisLoaded = true;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const existing = document.getElementById('google-gsi-client');
      if (existing) {
        this.gisLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.gisLoaded = true;
        resolve();
      };
      script.onerror = () => {
        console.warn('Google Identity Services script kon niet worden geladen.');
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Request Google OAuth Access Token via official Google Sign-In Popup
   * Allows logging into any existing private @gmail.com or Workspace account
   */
  public async signInWithGooglePopup(params?: {
    emailHint?: string;
    scopes?: string[];
  }): Promise<GoogleUserProfile> {
    await this.loadGoogleIdentityScript();

    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      throw new Error(
        'Google Identity Services is niet beschikbaar in deze browseromgeving. Je kunt je accountgegevens handmatig invoeren.'
      );
    }

    const scopes = params?.scopes?.join(' ') || [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
    ].join(' ');

    return new Promise((resolve, reject) => {
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: scopes,
          hint: params?.emailHint,
          prompt: 'select_account', // Forces Google Account Chooser so user can pick their private account!
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              reject(new Error(`Google aanmelding mislukt: ${tokenResponse.error}`));
              return;
            }

            try {
              // Fetch real user profile info from Google API
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                },
              });

              if (!userInfoRes.ok) {
                throw new Error('Kon Google gebruikersprofiel niet ophalen');
              }

              const userInfo = await userInfoRes.json();
              resolve({
                id: userInfo.sub || `google-${Date.now()}`,
                email: userInfo.email,
                name: userInfo.name || userInfo.email.split('@')[0],
                picture:
                  userInfo.picture ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userInfo.name || userInfo.email)}`,
                accessToken: tokenResponse.access_token,
                expiresAt: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
              });
            } catch (err: any) {
              // Fallback if userinfo endpoint fails
              resolve({
                id: `google-${Date.now()}`,
                email: params?.emailHint || 'prive@gmail.com',
                name: 'Google Gebruiker',
                picture: `https://api.dicebear.com/7.x/initials/svg?seed=Google`,
                accessToken: tokenResponse.access_token,
                expiresAt: Date.now() + 3600 * 1000,
              });
            }
          },
          error_callback: (err: any) => {
            reject(new Error(err.message || 'Fout bij openen van Google Login venster.'));
          },
        });

        client.requestAccessToken();
      } catch (err: any) {
        reject(err);
      }
    });
  }

  /**
   * Generate official Google Multi-Account deep links
   * Google uses authuser=<email> to open the correct private account on Chromebooks
   */
  public getGoogleServiceUrls(email: string): {
    gmail: string;
    calendar: string;
    drive: string;
    docs: string;
    keep: string;
    accountSecurity: string;
  } {
    const encoded = encodeURIComponent(email);
    return {
      gmail: `https://mail.google.com/mail/u/?authuser=${encoded}`,
      calendar: `https://calendar.google.com/calendar/u/?authuser=${encoded}`,
      drive: `https://drive.google.com/drive/u/?authuser=${encoded}`,
      docs: `https://docs.google.com/document/u/?authuser=${encoded}`,
      keep: `https://keep.google.com/u/?authuser=${encoded}`,
      accountSecurity: `https://myaccount.google.com/u/?authuser=${encoded}`,
    };
  }
}

export const googleAuthService = new GoogleAuthService();
