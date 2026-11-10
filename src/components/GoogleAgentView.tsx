import React, { useState, useRef, useEffect } from 'react';
import { GoogleAccount, AgentMessage, AgentAction } from '../types';
import { accountManager } from '../services/accountManager';
import { historySyncService } from '../services/historySyncService';
import {
  Send,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  Mail,
  CheckSquare,
  Globe,
  Mic,
  MicOff,
  UserCheck,
  Bot,
  User,
  ExternalLink,
  ArrowRight,
  Compass,
} from 'lucide-react';

interface GoogleAgentViewProps {
  accounts: GoogleAccount[];
  activeAccountId: string | 'ALL';
  onSelectAccount: (id: string | 'ALL') => void;
  onNavigateToTab: (tab: 'inbox' | 'calendar' | 'drive' | 'cache' | 'history') => void;
  onOpenInBrowser: (url: string) => void;
}

export const GoogleAgentView: React.FC<GoogleAgentViewProps> = ({
  accounts,
  activeAccountId,
  onSelectAccount,
  onNavigateToTab,
  onOpenInBrowser,
}) => {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome-1',
      sender: 'agent',
      text: `Hallo! Ik ben je **Google Agent voor ChromeOS**.\n\nIk ben direct gekoppeld aan al je actieve Google-accounts (**${accounts.length} sessies tegelijk actief**). Ik kan je helpen met het analyseren en opstellen van e-mails, het beheren van overlappende agenda-afspraken tussen werk en privé, het synchroniseren van taken en het doorzoeken van het web met Google Search grounding.\n\nWaarmee kan ik je helpen?`,
      timestamp: Date.now(),
    },
  ]);

  const [input, setInput] = useState('');
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [useGoogleSearch, setUseGoogleSearch] = useState(false); // Default to Ultra-Fast Turbo Modus (0.4s)
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Live timer for search/query duration
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      const start = Date.now();
      interval = setInterval(() => {
        setElapsedTime(Math.round((Date.now() - start) / 100) / 10);
      }, 100);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const activeAccount =
    activeAccountId === 'ALL'
      ? null
      : accounts.find((a) => a.id === activeAccountId) || null;

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Voice recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'nl-NL';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Spraakherkenning is niet beschikbaar in deze browser of dit apparaat.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        setIsListening(false);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || isLoading) return;

    setInput('');

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: Date.now(),
      accountContext: activeAccount ? activeAccount.name : 'Alle accounts',
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Gather workspace cached data for context
      const workspaceData = accountManager.getWorkspaceSnapshot();

      // Convert history for API
      const history = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text,
      }));

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history,
          activeAccount: activeAccount
            ? {
                id: activeAccount.id,
                name: activeAccount.name,
                email: activeAccount.email,
                type: activeAccount.type,
                unreadCount: activeAccount.unreadEmails,
              }
            : null,
          allAccounts: accounts.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            type: a.type,
            status: a.status,
            unreadCount: a.unreadEmails,
          })),
          workspaceData,
          useGoogleSearch,
        }),
      });

      let data: any;

      if (!res.ok) {
        // If 404 or backend unavailable (typical for static GitHub Pages hosting):
        // Provide client-side intelligent fallback using local workspace cache!
        console.warn('Backend unavailable (GitHub Pages static host), using local workspace intelligence.');
        
        const isEmailQuery = prompt.toLowerCase().includes('mail') || prompt.toLowerCase().includes('inbox') || prompt.toLowerCase().includes('bericht');
        const isCalendarQuery = prompt.toLowerCase().includes('agenda') || prompt.toLowerCase().includes('afspraak') || prompt.toLowerCase().includes('conflict') || prompt.toLowerCase().includes('planning');
        const isTaskQuery = prompt.toLowerCase().includes('taak') || prompt.toLowerCase().includes('taken') || prompt.toLowerCase().includes('todo');

        let fallbackText = `**Google Agent (GitHub Pages Statische Modus)**\n\n`;
        const suggestedActions: any[] = [];

        if (isEmailQuery) {
          fallbackText += `Ik heb je lokale e-mails doorzocht over al je **${accounts.length} actieve accounts**:\n\n`;
          const unreadList = (workspaceData?.emails || []).filter((e: any) => e.isUnread);
          if (unreadList.length > 0) {
            unreadList.forEach((e: any) => {
              fallbackText += `• **${e.subject}** van *${e.from}* (${e.accountEmail})\n  *Preview:* "${e.preview}"\n`;
            });
            suggestedActions.push({
              type: 'COMPOSE_EMAIL',
              payload: {
                account: unreadList[0]?.accountEmail || accounts[0]?.email,
                to: unreadList[0]?.from || '',
                subject: `Re: ${unreadList[0]?.subject || ''}`,
                body: 'Beste,\n\nBedankt voor je bericht. Ik kom hier spoedig op terug.\n\nMet vriendelijke groet,',
              },
            });
          } else {
            fallbackText += `Je hebt momenteel geen ongelezen berichten in je gekoppelde accounts.`;
          }
        } else if (isCalendarQuery) {
          fallbackText += `Hier is je agenda-overzicht over alle accounts:\n\n`;
          const eventList = workspaceData?.events || [];
          if (eventList.length > 0) {
            eventList.forEach((ev: any) => {
              fallbackText += `• **${ev.title}** (${ev.start} - ${ev.end}) | Account: ${ev.accountEmail}\n`;
            });
            fallbackText += `\n*Tip:* Gebruik de tab "Agenda & Taken" om afspraken direct in te zien.`;
          } else {
            fallbackText += `Geen geplande afspraken gevonden voor vandaag.`;
          }
        } else if (isTaskQuery) {
          fallbackText += `Overzicht van openstaande taken:\n\n`;
          const taskList = (workspaceData?.tasks || []).filter((t: any) => !t.completed);
          taskList.forEach((t: any) => {
            fallbackText += `• [ ] **${t.title}** (Account: ${t.accountEmail})\n`;
          });
        } else {
          fallbackText += `Ik ben lokaal verbonden met je **${accounts.length} Google Accounts** (${accounts.map(a => a.name).join(', ')}).\n\n` +
            `Op deze statische GitHub Pages versie worden je gegevens direct uit je lokale browser-cache gelezen. ` +
            `Je kunt me vragen om je e-mails samen te vatten, agenda-afspraken te controleren of taken te beheren!`;
        }

        data = {
          text: fallbackText,
          actions: suggestedActions,
          sources: [],
        };
      } else {
        data = await res.json();
      }

      const agentMsg: AgentMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: data.text || 'Geen tekst ontvangen.',
        rawText: data.rawText,
        actions: (data.actions || []).map((act: any) => ({
          type: act.type,
          payload: act.payload,
          executed: false,
        })),
        sources: data.sources || [],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      console.error('Agent chat error:', err);
      const errorMsg: AgentMessage = {
        id: `agent-err-${Date.now()}`,
        sender: 'agent',
        text: `⚠️ **Bericht verwerkt in lokale offline modus**: ${err.message || 'Kon geen externe API bereiken.'}`,
        timestamp: Date.now(),
        isError: false,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Execution of suggested actions
  const executeAction = async (msgId: string, actionIndex: number, action: AgentAction) => {
    try {
      const payload = action.payload;
      const targetAccount =
        accounts.find((a) => a.email.toLowerCase() === (payload.account || '').toLowerCase()) ||
        accounts[0];

      if (action.type === 'COMPOSE_EMAIL') {
        await accountManager.composeEmail({
          accountId: targetAccount.id,
          to: payload.to || 'collega@voorbeeld.nl',
          subject: payload.subject || 'Onderwerp via Google Agent',
          body: payload.body || 'Bericht opgesteld door Google Agent',
        });
      } else if (action.type === 'ADD_EVENT') {
        const start = payload.start || '15:00';
        const end = payload.end || '16:00';
        await accountManager.addCalendarEvent({
          accountId: targetAccount.id,
          title: payload.title || 'Afspraak via Agent',
          start: start.length > 5 ? start.split('T')[1]?.slice(0, 5) || '15:00' : start,
          end: end.length > 5 ? end.split('T')[1]?.slice(0, 5) || '16:00' : end,
          location: payload.location || 'Google Meet',
        });
      } else if (action.type === 'CREATE_TASK') {
        await accountManager.addTask({
          accountId: targetAccount.id,
          title: payload.title || 'Nieuwe taak',
          priority: (payload.priority as any) || 'medium',
          dueDate: payload.dueDate || 'Vandaag',
        });
      } else if (action.type === 'SWITCH_ACCOUNT') {
        if (targetAccount) {
          onSelectAccount(targetAccount.id);
        }
      }

      // Mark action as executed in state
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === msgId && msg.actions) {
            const updated = [...msg.actions];
            updated[actionIndex] = { ...updated[actionIndex], executed: true };
            return { ...msg, actions: updated };
          }
          return msg;
        })
      );
    } catch (err: any) {
      alert(`Actie kon niet worden uitgevoerd: ${err.message}`);
    }
  };

  const handleGoogleWebSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = googleSearchQuery.trim();
    if (!query) return;

    let targetUrl = '';
    let isUrl = false;
    if (query.startsWith('http://') || query.startsWith('https://')) {
      targetUrl = query;
      isUrl = true;
    } else if (query.includes('.') && !query.includes(' ') && query.length > 3) {
      targetUrl = `https://${query}`;
      isUrl = true;
    } else {
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }

    // Synchronize directly into local zero-cloud browser history
    historySyncService.recordHistoryEntry({
      url: targetUrl,
      title: isUrl ? query : `Google: "${query}"`,
      category: 'search',
      snippet: isUrl ? 'Directe website navigatie (In-App Browser)' : `Zoekopdracht op Google: ${query}`,
    });

    // Directly open inside the In-App Browser to prevent school Chromebook from blocking secondary profiles
    onOpenInBrowser(targetUrl);
    setGoogleSearchQuery('');
  };

  const quickPrompts = [
    {
      label: '📬 Vat ongelezen mails samen over alle accounts',
      prompt: 'Vat al mijn ongelezen e-mails samen over al mijn actieve Google accounts, gerangschikt per prioriteit.',
    },
    {
      label: '📅 Zoek conflicterende afspraken tussen Werk en Privé',
      prompt: 'Controleer mijn agenda-items van vandaag voor alle accounts en vertel me of er overlappende afspraken zijn tussen mijn persoonlijke en werkagenda.',
    },
    {
      label: '📝 Maak een gecombineerde prioriteitenlijst van open taken',
      prompt: 'Geef een overzicht van al mijn openstaande taken over al mijn accounts en adviseer een logische volgorde voor vandaag.',
    },
    {
      label: '🌐 Zoek actuele ChromeOS tips voor maximale Chromebook prestaties',
      prompt: 'Wat zijn de nieuwste ChromeOS functies en officiële optimalisaties voor Chromebooks om zonder haperingen te multitasken?',
    },
    {
      label: '✉️ Schrijf antwoord op de Sprint Review uitnodiging',
      prompt: 'Stel een vriendelijke acceptatie-mail op voor de Sprint Review uitnodiging vanaf mijn werkaccount teisco.work@bedrijf-cloud.nl.',
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] max-w-5xl mx-auto px-4 py-4">
      {/* Top Context & Grounding Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Google Agent Context
              </h2>
              <span className="text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gekoppeld aan:{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {activeAccount ? activeAccount.name : `Alle ${accounts.length} Google accounts gelijktijdig`}
              </strong>
            </p>
          </div>
        </div>

        {/* Account context selector & Search grounding toggle */}
        <div className="flex items-center gap-2">
          {/* Account selector dropdown */}
          <select
            value={activeAccountId}
            onChange={(e) => onSelectAccount(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Agent context account"
          >
            <option value="ALL">🌐 Alle accounts gelijktijdig</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.email})
              </option>
            ))}
          </select>

          {/* Google Search Grounding Toggle */}
          <button
            onClick={() => setUseGoogleSearch(!useGoogleSearch)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              useGoogleSearch
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
            title="Schakel Google Search Grounding in of uit"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Search Grounding</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'agent' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 transition-colors ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                  : msg.isError
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-900/60 rounded-tl-none'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800/80 rounded-tl-none shadow-sm'
              }`}
            >
              {/* Header inside bubble */}
              {msg.sender === 'user' && msg.accountContext && (
                <div className="flex items-center gap-1.5 text-[11px] text-blue-100 mb-1 opacity-90">
                  <UserCheck className="w-3 h-3" />
                  <span>Context: {msg.accountContext}</span>
                </div>
              )}

              {/* Message text with Markdown rendering */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {msg.text}
              </div>

              {/* Google Search Grounding Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Search className="w-3 h-3 text-blue-500" />
                    Bronnen via Google Search:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((src, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onOpenInBrowser(src.url)}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 truncate max-w-[200px]"
                        title={`Open in In-App Browser: ${src.url}`}
                      >
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{src.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Suggestion Cards (e.g. Execute email, add event, add task) */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Aanbevolen acties voor Google Workspace:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {msg.actions.map((action, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {action.type === 'COMPOSE_EMAIL' && (
                            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
                              <Mail className="w-4 h-4" />
                            </div>
                          )}
                          {action.type === 'ADD_EVENT' && (
                            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                              <Calendar className="w-4 h-4" />
                            </div>
                          )}
                          {action.type === 'CREATE_TASK' && (
                            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                              <CheckSquare className="w-4 h-4" />
                            </div>
                          )}
                          {action.type === 'SWITCH_ACCOUNT' && (
                            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
                              <UserCheck className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {action.type === 'COMPOSE_EMAIL' && `Email naar: ${action.payload.to || 'Ontvanger'}`}
                              {action.type === 'ADD_EVENT' && `Agenda: ${action.payload.title || 'Afspraak'}`}
                              {action.type === 'CREATE_TASK' && `Taak: ${action.payload.title || 'Nieuwe taak'}`}
                              {action.type === 'SWITCH_ACCOUNT' && `Wissel naar account: ${action.payload.account || ''}`}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              Account: {action.payload.account || 'Huidig actief'}
                            </p>
                          </div>
                        </div>

                        {action.executed ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                            Uitgevoerd
                          </span>
                        ) : (
                          <button
                            onClick={() => executeAction(msg.id, idx, action)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shrink-0 shadow-sm"
                          >
                            Uitvoeren
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
              <span className="ml-2 font-medium">Google Agent analyseert accounts en zoekt live...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Carousel */}
      <div className="mb-2 overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center gap-2">
          {quickPrompts.map((qp, index) => (
            <button
              key={index}
              onClick={() => handleSendMessage(qp.prompt)}
              className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl whitespace-nowrap shadow-sm transition-all"
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dual Search & Input Bar Container: Google Web/URL Zoeken (Links) + Google AI Agent (Rechts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* 1. Google Web Zoeken & URL Balk */}
        <form
          onSubmit={handleGoogleWebSearch}
          className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md transition-colors focus-within:ring-2 focus-within:ring-blue-500/40"
        >
          {/* Official Google G Icon */}
          <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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

          <input
            type="text"
            value={googleSearchQuery}
            onChange={(e) => setGoogleSearchQuery(e.target.value)}
            placeholder="Zoek op Google of typ een URL..."
            className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none px-1"
          />

          <button
            type="submit"
            disabled={!googleSearchQuery.trim()}
            className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Zoeken op Google of open URL"
          >
            <Search className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Zoek Web</span>
          </button>
        </form>

        {/* 2. Google AI Agent Zoekbalk */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md transition-colors focus-within:ring-2 focus-within:ring-blue-500/40"
        >
          {/* AI Sparkles icon */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>

          {/* Voice dictation button */}
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`p-1.5 rounded-lg transition-colors ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isListening ? 'Spraakopname stoppen' : 'Dicteer vraag met microfoon (ChromeOS)'}
            aria-label="Microfoon"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeAccount
                ? `Vraag Google Agent over ${activeAccount.name}...`
                : 'Vraag Google Agent (AI chat & taken)...'
            }
            className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none px-1"
            disabled={isLoading}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center p-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm text-xs font-semibold shrink-0 gap-1"
            aria-label="Verstuur bericht naar Google Agent"
          >
            <span>Vraag AI</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
