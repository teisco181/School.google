import React, { useState } from 'react';
import { GoogleAccount, GoogleEmail, GoogleCalendarEvent, GoogleDriveFile, GoogleTask } from '../types';
import { accountManager } from '../services/accountManager';
import { googleAuthService } from '../services/googleAuthService';
import {
  Mail,
  Calendar,
  FileText,
  CheckSquare,
  Search,
  Star,
  Plus,
  AlertTriangle,
  Clock,
  MapPin,
  Sparkles,
  ExternalLink,
  Filter,
  CheckCircle2,
} from 'lucide-react';

interface WorkspaceHubViewProps {
  viewMode: 'inbox' | 'calendar' | 'drive';
  accounts: GoogleAccount[];
  activeAccountId: string | 'ALL';
  onSelectAccount: (id: string | 'ALL') => void;
  onOpenCompose: () => void;
  onOpenAddEvent: () => void;
  onAskAgent: (prompt: string) => void;
}

export const WorkspaceHubView: React.FC<WorkspaceHubViewProps> = ({
  viewMode,
  accounts,
  activeAccountId,
  onSelectAccount,
  onOpenCompose,
  onOpenAddEvent,
  onAskAgent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<GoogleEmail | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const emails = accountManager.getEmails(activeAccountId);
  const events = accountManager.getEvents(activeAccountId);
  const files = accountManager.getFiles(activeAccountId);
  const tasks = accountManager.getTasks(activeAccountId);

  // Find any conflicting events across all accounts!
  const allEvents = accountManager.getEvents('ALL');
  const conflictingEvents = allEvents.filter((ev) => ev.isConflicting);

  // Filtered lists
  const filteredEmails = emails.filter(
    (e) =>
      e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAccountColor = (accountEmail: string) => {
    const acc = accounts.find((a) => a.email.toLowerCase() === accountEmail.toLowerCase());
    return acc ? acc.badgeColor : '#4285F4';
  };

  const getAccountName = (accountEmail: string) => {
    const acc = accounts.find((a) => a.email.toLowerCase() === accountEmail.toLowerCase());
    return acc ? acc.name : accountEmail;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Zoek in ${viewMode === 'inbox' ? 'e-mails' : viewMode === 'calendar' ? "agenda's" : 'Google Drive'}...`}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>

        {/* Account Filter Pill */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={activeAccountId}
            onChange={(e) => onSelectAccount(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Filteren op Google Account"
          >
            <option value="ALL">🌐 Alle accounts ({accounts.length})</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.email})
              </option>
            ))}
          </select>

          {/* Primary Action Button per view */}
          {viewMode === 'inbox' && (
            <button
              onClick={onOpenCompose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nieuwe e-mail</span>
            </button>
          )}

          {viewMode === 'calendar' && (
            <button
              onClick={onOpenAddEvent}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Afspraak plannen</span>
            </button>
          )}

          {/* Ask Agent button */}
          <button
            onClick={() => {
              if (viewMode === 'inbox') {
                onAskAgent('Vat mijn recente e-mails samen en vertel wat prioriteit heeft.');
              } else if (viewMode === 'calendar') {
                onAskAgent('Welke afspraken heb ik vandaag en zijn er conflicten tussen mijn accounts?');
              } else {
                onAskAgent('Welke Google Drive bestanden zijn onlangs bewerkt en waar moet ik op letten?');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl border border-blue-200 dark:border-blue-800/60 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Agent Samenvatting</span>
          </button>
        </div>
      </div>

      {/* Real Google Workspace authuser Launcher Bar (bypasses school Chromebook OS restrictions) */}
      {(() => {
        const targetEmail =
          activeAccountId !== 'ALL'
            ? accounts.find((a) => a.id === activeAccountId)?.email
            : accounts[0]?.email;
        if (!targetEmail) return null;
        const urls = googleAuthService.getGoogleServiceUrls(targetEmail);
        return (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-blue-700 dark:text-blue-300">Google Multi-Login Sessie:</span>
              <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-100">
                {targetEmail}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 hidden sm:inline">Open in officiële Google app:</span>
              <a
                href={urls.gmail}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors"
                title={`Open Gmail voor ${targetEmail}`}
              >
                <Mail className="w-3.5 h-3.5 text-red-500" />
                <span>Gmail</span>
                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
              </a>
              <a
                href={urls.calendar}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors"
                title={`Open Google Agenda voor ${targetEmail}`}
              >
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Agenda</span>
                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
              </a>
              <a
                href={urls.drive}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors"
                title={`Open Google Drive voor ${targetEmail}`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Drive</span>
                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
              </a>
            </div>
          </div>
        );
      })()}

      {/* VIEW: GMAIL INBOX */}
      {viewMode === 'inbox' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {activeAccountId === 'ALL'
                  ? `Gecombineerde Inbox (${filteredEmails.length} berichten)`
                  : `Inbox: ${getAccountName(activeAccountId)}`}
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              {filteredEmails.filter((e) => e.isUnread).length} ongelezen
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredEmails.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                Geen e-mails gevonden voor deze zoekopdracht of dit account.
              </div>
            ) : (
              filteredEmails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`flex items-center gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                    email.isUnread
                      ? 'bg-blue-50/30 dark:bg-blue-950/20 font-semibold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {/* Account Badge indicator */}
                  <div
                    className="w-2 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: getAccountColor(email.accountEmail) }}
                    title={`Account: ${email.accountEmail}`}
                  />

                  {/* Star */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      accountManager.toggleEmailStar(email.id);
                    }}
                    className="text-slate-300 hover:text-amber-400 p-1 shrink-0"
                    aria-label="Ster toevoegen"
                  >
                    <Star
                      className={`w-4 h-4 ${email.isStarred ? 'text-amber-400 fill-amber-400' : ''}`}
                    />
                  </button>

                  {/* Sender & Account */}
                  <div className="w-48 shrink-0 min-w-0">
                    <p className="text-xs text-slate-900 dark:text-white truncate">
                      {email.from.split('<')[0]}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {email.accountEmail}
                    </p>
                  </div>

                  {/* Subject and Preview */}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-900 dark:text-white mr-2 truncate">
                      {email.subject}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate hidden sm:inline">
                      - {email.preview}
                    </span>
                  </div>

                  {/* Labels */}
                  <div className="hidden lg:flex items-center gap-1 shrink-0">
                    {email.labels.map((lbl, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>

                  {/* Date */}
                  <div className="text-right text-[11px] text-slate-400 dark:text-slate-500 shrink-0 font-mono">
                    {email.date}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW: GOOGLE AGENDA & TAKEN */}
      {viewMode === 'calendar' && (
        <div className="space-y-6">
          {/* Conflict Warning Banner if Work and Personal overlap */}
          {conflictingEvents.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Agenda-conflict gedetecteerd tussen 2 Google Accounts!
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    Om 14:00 - 15:00 overlapt <strong>"Sprint Review" (Werk)</strong> met{' '}
                    <strong>"Tandartscontrole" (Persoonlijk)</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  onAskAgent(
                    'Er is een agendaconflict tussen mijn werk sprint review en tandartscontrole vanmiddag. Hoe kan ik dit het beste oplossen of verzetten?'
                  )
                }
                className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors shrink-0 whitespace-nowrap shadow-sm"
              >
                Vraag Agent om Oplossing
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Calendar Timeline */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Vandaag & Komende Afspraken ({events.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>

              <div className="space-y-3">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      ev.isConflicting
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: ev.color }}
                        />
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                          {ev.title}
                        </h4>
                        {ev.isConflicting && (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.2 rounded">
                            Overlap
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300 shrink-0">
                        {ev.start} - {ev.end}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Account: <strong>{ev.accountEmail}</strong>
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Google Tasks & Checklist */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Google Taken ({tasks.filter((t) => !t.completed).length})
                  </h3>
                </div>
              </div>

              {/* Add Quick Task Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTaskTitle.trim()) return;
                  const targetAcc =
                    activeAccountId === 'ALL' ? accounts[0].id : activeAccountId;
                  accountManager.addTask({
                    accountId: targetAcc,
                    title: newTaskTitle.trim(),
                    priority: 'medium',
                  });
                  setNewTaskTitle('');
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Snelle taak toevoegen..."
                  className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shrink-0"
                  aria-label="Taak toevoegen"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Task Items */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => accountManager.toggleTask(task.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      task.completed
                        ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/40 text-slate-400 dark:text-slate-500'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-blue-600 focus:ring-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-medium leading-tight ${
                          task.completed ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span>{task.accountEmail.split('@')[0]}</span>
                        {task.dueDate && <span>· {task.dueDate}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: GOOGLE DRIVE */}
      {viewMode === 'drive' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Google Drive Bestanden ({filteredFiles.length})
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Gekoppeld aan lokale ChromeOS cache
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between gap-4 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor:
                        file.type === 'doc'
                          ? '#4285F420'
                          : file.type === 'sheet'
                            ? '#0F9D5820'
                            : file.type === 'slide'
                              ? '#FBBC0420'
                              : '#EA433520',
                      color:
                        file.type === 'doc'
                          ? '#4285F4'
                          : file.type === 'sheet'
                            ? '#0F9D58'
                            : file.type === 'slide'
                              ? '#D97706'
                              : '#EA4335',
                    }}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {file.accountEmail} · Gewijzigd: {file.lastModified}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-slate-500">{file.size}</span>
                  <button
                    onClick={() =>
                      onAskAgent(
                        `Kun je het document "${file.name}" van account ${file.accountEmail} analyseren of een samenvatting geven?`
                      )
                    }
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    Agent Inspectie
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Reader Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                  Account: {selectedEmail.accountEmail}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {selectedEmail.subject}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Van: <strong>{selectedEmail.from}</strong> aan <strong>{selectedEmail.to}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                aria-label="Sluiten"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed max-h-80 overflow-y-auto">
              {selectedEmail.body}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  const replyPrompt = `Schrijf een professionele reactie op deze e-mail van ${selectedEmail.from} met onderwerp "${selectedEmail.subject}".`;
                  setSelectedEmail(null);
                  onAskAgent(replyPrompt);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Laat Google Agent reply opstellen
              </button>

              <button
                onClick={() => setSelectedEmail(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
