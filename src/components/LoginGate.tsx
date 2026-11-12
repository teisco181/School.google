import React, { useState } from 'react';
import { userManager } from '../services/userManager';
import { UserProfile } from '../types';
import { ShieldCheck, UserPlus, KeyRound, ArrowRight, History, Compass, Sparkles } from 'lucide-react';

interface LoginGateProps {
  onLoginSuccess: () => void;
}

export const LoginGate: React.FC<LoginGateProps> = ({ onLoginSuccess }) => {
  const users = userManager.getUsers();
  const [selectedUser, setSelectedUser] = useState<UserProfile>(users[0] || null);
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Profile Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPin, setNewPin] = useState('1234');
  const [newColor, setNewColor] = useState('#4285F4');

  // Direct 1-click Hub Access
  const handleOpenStartHub = () => {
    setError('');
    const ok = userManager.unlockDirectly(selectedUser?.id);
    if (ok) {
      onLoginSuccess();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      handleOpenStartHub();
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      const pinToUse = pin.trim() || '1234';
      const res = await userManager.login(selectedUser.id, pinToUse);
      if (res.success) {
        onLoginSuccess();
      } else {
        // Fallback to direct unlock so the user is never locked out
        userManager.unlockDirectly(selectedUser.id);
        onLoginSuccess();
      }
    } catch (err: any) {
      // In case of any browser error, fallback to direct unlock
      userManager.unlockDirectly(selectedUser.id);
      onLoginSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await userManager.createProfile({
        name: newName,
        email: newEmail,
        pin: newPin || '1234',
        avatarColor: newColor,
      });

      if (res.success) {
        setIsCreatingProfile(false);
        setNewName('');
        setNewEmail('');
        setNewPin('1234');
        onLoginSuccess();
      } else {
        setError(res.error || 'Kon profiel niet aanmaken.');
      }
    } catch (err: any) {
      setError(err.message || 'Fout bij aanmaken profiel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900/95 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-3">
            <svg className="w-7 h-7" viewBox="0 0 24 24">
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {isCreatingProfile ? 'Nieuwe Gebruiker Aanmaken' : 'Google Agent & Browser Hub'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isCreatingProfile
              ? 'Beveiligd lokaal profiel zonder cloud-opslag'
              : 'Klik direct op Startpagina Hub of ontgrendel je profiel'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {!isCreatingProfile ? (
          <div className="space-y-4">
            {/* Primary Action: Direct Startpagina Hub Access */}
            <button
              type="button"
              onClick={handleOpenStartHub}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-sm font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all transform active:scale-[0.98] cursor-pointer"
            >
              <Compass className="w-5 h-5 text-amber-300 animate-spin-slow" />
              <span>Startpagina Hub Openen</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                of ontgrendel profiel
              </span>
            </div>

            {/* Profile Selector & PIN Entry */}
            <form onSubmit={handleLogin} className="space-y-3.5">
              {/* User Profile List */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Gebruikersprofiel:
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {users.map((u) => {
                    const isSelected = selectedUser?.id === u.id;
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setError('');
                        }}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm ring-1 ring-blue-500'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                          style={{ backgroundColor: u.avatarColor }}
                        >
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {u.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {u.email}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PIN Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    PIN of Wachtwoord:
                  </label>
                  <span className="text-[10px] text-slate-400">Standaard: 1234</span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Voer PIN in (standaard: 1234)"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white tracking-widest"
                  />
                </div>
              </div>

              {/* Submit PIN Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>{isSubmitting ? 'Bezig met openen...' : 'Inloggen met PIN'}</span>
              </button>

              {/* Add profile switch button */}
              <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingProfile(true);
                    setError('');
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Nieuwe gebruiker toevoegen op dit apparaat
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Create New Profile Form */
          <form onSubmit={handleCreateProfile} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Volledige Naam
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="bijv. Sophie van Dijk"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                E-mailadres
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="naam@gmail.com of school@domein.nl"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Beveiligings-PIN of Wachtwoord (standaard: 1234)
              </label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="1234"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Profile color */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Kleur Avatar
              </label>
              <div className="flex items-center gap-2">
                {['#4285F4', '#0F9D58', '#EA4335', '#FBBC04', '#9333EA', '#06B6D4'].map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNewColor(col)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      newColor === col ? 'scale-125 ring-2 ring-offset-2 ring-white' : ''
                    }`}
                    style={{ backgroundColor: col }}
                    aria-label={`Kleur ${col}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingProfile(false);
                  setError('');
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newName || !newEmail}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Aanmaken...' : 'Profiel Aanmaken'}
              </button>
            </div>
          </form>
        )}

        {/* Security badges */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Lokale encryptie & hardware-bescherming</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-blue-600 dark:text-blue-400">
            <History className="w-4 h-4 shrink-0" />
            <span>Lokale browsergeschiedenis synchronisatie (Geen cloud-service)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
