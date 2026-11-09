import React, { useState } from 'react';
import { AccountType } from '../types';
import { accountManager } from '../services/accountManager';
import { googleAuthService } from '../services/googleAuthService';
import { ShieldCheck, UserPlus, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded: (accountId: string) => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAccountAdded,
}) => {
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [badgeColor, setBadgeColor] = useState('#4285F4');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [oAuthError, setOAuthError] = useState('');

  if (!isOpen) return null;

  // Sign in via official Google OAuth Popup (allows logging into any real Google account)
  const handleGoogleOAuthSignIn = async () => {
    setIsOAuthLoading(true);
    setOAuthError('');
    try {
      const profile = await googleAuthService.signInWithGooglePopup({
        emailHint: email || undefined,
      });

      const newAcc = await accountManager.addGoogleAccount({
        name: profile.name,
        email: profile.email,
        type: profile.email.endsWith('@gmail.com') ? 'personal' : 'work',
        badgeColor: '#4285F4',
        avatarUrl: profile.picture,
      });

      onAccountAdded(newAcc.id);
      onClose();
    } catch (err: any) {
      console.warn('Google OAuth popup:', err);
      setOAuthError(
        err.message || 'Kon Google pop-up niet openen. Gebruik het onderstaande formulier om je echte account direct toe te voegen.'
      );
    } finally {
      setIsOAuthLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert('Vul a.u.b. je naam en echte Google e-mailadres in.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newAcc = await accountManager.addGoogleAccount({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        type: accountType,
        badgeColor,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}&backgroundColor=${badgeColor.replace('#', '')}`,
      });

      onAccountAdded(newAcc.id);
      onClose();
    } catch (err: any) {
      alert(`Fout bij toevoegen account: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
        {/* Google Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-1">
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
            Echt Google-Account Toevoegen
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Koppel je echte privé-account (bijv. <strong>@gmail.com</strong>) op een Chromebook waar je school geen secundaire accounts toestaat.
          </p>
        </div>

        {/* School Chromebook Explainer Banner */}
        <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            Oplossing voor School-Chromebooks:
          </p>
          <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
            Omdat de ChromeOS-beheerder van je school secundaire accounts blokkeert in de systeeminstellingen,
            maakt deze web-hub gebruik van officiële Google <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.2 rounded font-mono">authuser</code>-sessies.
            Hierdoor kun je je privé Gmail, Agenda en Drive direct openen en gelijktijdig gebruiken met de Google Agent!
          </p>
        </div>

        {/* PRIMARY METHOD: Google Official Popup Login Button */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleGoogleOAuthSignIn}
            disabled={isOAuthLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl shadow-sm hover:shadow transition-all group"
          >
            {/* Google Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {isOAuthLoading ? 'Google Login Venster Openen...' : 'Inloggen met Google (GIS Popup)'}
            </span>
          </button>

          {oAuthError && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200">
              {oAuthError}
            </p>
          )}
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 uppercase font-semibold shrink-0">
            of voer je accountgegevens handmatig in
          </span>
        </div>

        {/* MANUAL ENTRY FORM */}
        <form onSubmit={handleManualSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Account Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccountType('personal')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                  accountType === 'personal'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Privé Account (@gmail.com)
              </button>
              <button
                type="button"
                onClick={() => setAccountType('work')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                  accountType === 'work'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Werk / Ander Domein
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Je Echte Google E-mailadres
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bijv. jouw.prive.account@gmail.com"
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Weergavenaam (voor in de sessiebalk)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="bijv. Privé, Werk of je voornaam"
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Google Label Kleur
            </label>
            <div className="flex items-center gap-2">
              {['#4285F4', '#0F9D58', '#EA4335', '#FBBC04', '#9333EA', '#06B6D4'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBadgeColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    badgeColor === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-800 dark:ring-white' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Kleur ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name || !email}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Account toevoegen...' : 'Account Koppelen'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
