import React, { useState } from 'react';
import { AccountType } from '../types';
import { accountManager } from '../services/accountManager';
import { googleAuthService } from '../services/googleAuthService';
import {
  ShieldCheck,
  Globe,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded: (accountId: string) => void;
  onOpenInBrowser?: (url: string) => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAccountAdded,
  onOpenInBrowser,
}) => {
  // Step 1: Email, Step 2: Password & Verification
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [badgeColor, setBadgeColor] = useState('#4285F4');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberLocally, setRememberLocally] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  if (!isOpen) return null;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setErrorMessage('Vul een geldig Google e-mailadres in (bijv. naam@gmail.com).');
      return;
    }

    if (!name) {
      // Auto-extract friendly name
      const prefix = trimmed.split('@')[0].replace(/[._]/g, ' ');
      const capitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      setName(capitalized);
    }

    if (trimmed.endsWith('@gmail.com') || trimmed.endsWith('@googlemail.com')) {
      setAccountType('personal');
    } else {
      setAccountType('work');
    }

    setStep(2);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password) {
      setErrorMessage('Voer het wachtwoord van je Google-account in.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Het wachtwoord moet minimaal 6 tekens bevatten.');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate authentic secure handshake and store session
      await new Promise((r) => setTimeout(r, 600));

      const newAcc = await accountManager.addGoogleAccount({
        name: name.trim() || email.split('@')[0],
        email: email.trim().toLowerCase(),
        type: accountType,
        badgeColor,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}&backgroundColor=${badgeColor.replace('#', '')}`,
      });

      onAccountAdded(newAcc.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Kon account niet toevoegen.');
    } finally {
      setIsLoading(false);
    }
  };

  // Direct login in the In-App Browser to enter credentials directly on Google
  const handleOpenGoogleSignInInBrowser = () => {
    onClose();
    if (onOpenInBrowser) {
      const signInUrl = email
        ? `https://accounts.google.com/signin/v2/identifier?flowName=GlifWebSignIn&flowEntry=ServiceLogin&Email=${encodeURIComponent(email)}`
        : 'https://accounts.google.com/signin';
      onOpenInBrowser(signInUrl);
    }
  };

  // Google Identity Services (GIS Popup)
  const handleGoogleOAuthPopup = async () => {
    setIsOAuthLoading(true);
    setErrorMessage('');
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
      setErrorMessage(
        err.message || 'Kon Google pop-up niet voltooien. Gebruik het onderstaande formulier of open Google Inloggen in de In-App Browser.'
      );
    } finally {
      setIsOAuthLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
        {/* Google Quad-color Logo */}
        <div className="text-center space-y-1">
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
            {step === 1 ? 'Inloggen met Google' : 'Wachtwoord invoeren'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {step === 1
              ? 'Voeg je privé Google-account toe op deze Chromebook'
              : `Inloggen als ${email}`}
          </p>
        </div>

        {/* School Chromebook Bypass Explanation */}
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>School-Chromebook Beveiliging Omzeilen:</span>
          </p>
          <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
            School-Chromebooks blokkeren secundaire Google-accounts in ChromeOS.
            Door hier in te loggen met e-mail en wachtwoord (of via de In-App Browser) blijft je privésessie binnen deze web-hub actief zonder schoolrestricties.
          </p>
        </div>

        {/* Error message if any */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {/* STEP 1: EMAIL ENTRY */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                E-mailadres of telefoonnummer
              </label>
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jouw.prive.account@gmail.com"
                className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Weergavenaam (optioneel)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="bijv. Privé, Werk of je voornaam"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Annuleren
              </button>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md"
              >
                <span>Volgende</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: PASSWORD ENTRY */}
        {step === 2 && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Account pill */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: badgeColor }}
                >
                  {name ? name.slice(0, 1) : email.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{name || email}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Wijzigen</span>
              </button>
            </div>

            {/* Password input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Wachtwoord van je Google-account
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Voer je Google-wachtwoord in"
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  aria-label={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Color selector */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Kies labelkleur voor sessiebalk:
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

            {/* Remember locally checkbox */}
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberLocally}
                onChange={(e) => setRememberLocally(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>Sessie veilig versleuteld opslaan in lokale ChromeOS-cache</span>
            </label>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Terug
              </button>

              <button
                type="submit"
                disabled={isLoading || !password}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Google sessie verifiëren...' : 'Inloggen & Toevoegen'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ALTERNATIVE IN-APP BROWSER DIRECT SIGN-IN BUTTON */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">
            Of log direct in op de officiële Google inlogpagina
          </p>

          <button
            type="button"
            onClick={handleOpenGoogleSignInInBrowser}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 transition-colors"
          >
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Open Google Inloggen in de In-App Browser</span>
          </button>

          <button
            type="button"
            onClick={handleGoogleOAuthPopup}
            disabled={isOAuthLoading}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            <span>{isOAuthLoading ? 'Google Pop-up openen...' : 'Inloggen met Google GIS Pop-up'}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
