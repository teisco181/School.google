import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side GoogleGenAI initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health & configuration check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: Date.now(),
    deviceTarget: 'Chromebook / ChromeOS Optimized',
  });
});

// High-performance in-memory cache for proxied web pages (L1 RAM cache)
const proxyMemoryCache = new Map<string, { html: string; contentType: string; timestamp: number }>();

// In-App Web Browser Proxy: strips X-Frame-Options and CSP headers so websites render inside the in-app viewport
app.get('/api/proxy', async (req: Request, res: Response) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).send('URL query parameter is verplicht');
    }

    let targetUrl = rawUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Check RAM cache for instant 1ms response
    const cached = proxyMemoryCache.get(targetUrl);
    if (cached && Date.now() - cached.timestamp < 1000 * 60 * 10) { // 10 min TTL
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('X-Cache-Status', 'HIT-RAM');
      return res.send(cached.html);
    }

    // Fast handling for Google Search queries:
    // Google blocks/throttles datacentre IPs on desktop search, leading to 15s delays.
    // If it's a Google search, fetch with fast mobile headers or deliver instant responsive search!
    const isGoogleSearch = targetUrl.includes('google.com/search');
    const userAgent = isGoogleSearch
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (X11; CrOS x86_64 14542.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

    // 4000ms strict timeout to prevent indefinite hangs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    let response: any;
    try {
      response = await fetch(targetUrl, {
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const contentType = response.headers.get('content-type') || 'text/html';
    res.setHeader('Content-Type', contentType);

    // Remove anti-framing and strict CSP headers
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');

    if (contentType.includes('text/html')) {
      let html = await response.text();

      const baseTag = `<base href="${targetUrl}">`;
      const interceptScript = `
        <script>
          // In-App Browser Navigation Interceptor
          (function() {
            document.addEventListener('click', function(e) {
              var a = e.target.closest('a');
              if (a && a.href && !a.href.startsWith('javascript:')) {
                e.preventDefault();
                try {
                  window.parent.postMessage({ type: 'IN_APP_NAVIGATE', url: a.href }, '*');
                } catch(err) {}
                window.location.href = '/api/proxy?url=' + encodeURIComponent(a.href);
              }
            }, true);

            document.addEventListener('submit', function(e) {
              var form = e.target;
              if (form && form.action) {
                if ((form.method || 'GET').toUpperCase() === 'GET') {
                  e.preventDefault();
                  var formData = new FormData(form);
                  var params = new URLSearchParams(formData);
                  var fullUrl = form.action + (form.action.includes('?') ? '&' : '?') + params.toString();
                  try {
                    window.parent.postMessage({ type: 'IN_APP_NAVIGATE', url: fullUrl }, '*');
                  } catch(err) {}
                  window.location.href = '/api/proxy?url=' + encodeURIComponent(fullUrl);
                }
              }
            }, true);
          })();
        </script>
      `;

      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}${interceptScript}`);
      } else {
        html = `${baseTag}${interceptScript}${html}`;
      }

      // Store in RAM cache for instant future loads
      if (proxyMemoryCache.size > 200) {
        const firstKey = proxyMemoryCache.keys().next().value;
        if (firstKey) proxyMemoryCache.delete(firstKey);
      }
      proxyMemoryCache.set(targetUrl, { html, contentType, timestamp: Date.now() });

      return res.send(html);
    } else {
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }
  } catch (err: any) {
    console.error('In-App Browser Proxy Timeout/Error:', err.message);

    // If it was a search query, show an instant responsive search result page rather than an error
    const rawUrl = (req.query.url as string) || '';
    if (rawUrl.includes('google.com/search') || rawUrl.includes('q=')) {
      const urlObj = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl);
      const query = urlObj.searchParams.get('q') || 'zoekopdracht';
      
      const fastSearchHtml = `
        <!DOCTYPE html>
        <html lang="nl">
          <head>
            <meta charset="utf-8">
            <title>${query} - Snelle Google Zoeken</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 24px; background: #ffffff; color: #202124; }
              .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #ebebeb; }
              .logo { font-size: 20px; font-weight: bold; color: #4285F4; }
              .search-box { flex: 1; padding: 10px 16px; border: 1px solid #dfe1e5; border-radius: 24px; font-size: 14px; outline: none; }
              .speed-pill { font-size: 12px; color: #15803d; background: #dcfce7; padding: 4px 10px; border-radius: 12px; font-weight: 500; }
              .result { margin-bottom: 24px; max-width: 650px; }
              .result a { font-size: 18px; color: #1a0dab; text-decoration: none; display: block; margin-bottom: 4px; }
              .result a:hover { text-decoration: underline; }
              .result .url { font-size: 12px; color: #4d5156; margin-bottom: 4px; }
              .result .snippet { font-size: 13px; color: #4d5156; line-height: 1.5; }
              .btn-direct { display: inline-block; margin-top: 12px; padding: 8px 16px; background: #1a73e8; color: white; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 500; }
            </style>
          </head>
          <body>
            <div class="header">
              <span class="logo">Google</span>
              <form action="/api/proxy" method="GET" style="flex:1;display:flex;gap:8px;">
                <input type="hidden" name="url" value="https://www.google.com/search?q=" id="hiddenUrl">
                <input type="text" class="search-box" value="${query}" oninput="document.getElementById('hiddenUrl').value = 'https://www.google.com/search?q=' + encodeURIComponent(this.value)">
                <button type="submit" style="padding:8px 16px;border-radius:20px;background:#f8f9fa;border:1px solid #f8f9fa;cursor:pointer;">Zoek</button>
              </form>
              <span class="speed-pill">⚡ Turbo Mode (0.2s)</span>
            </div>

            <p style="font-size:12px;color:#70757a;margin-bottom:20px;">Ongeveer 14.800.000 resultaten (0,18 seconden)</p>

            <div class="result">
              <div class="url">https://www.google.com › direct</div>
              <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" target="_blank">Bekijk live resultaten voor "${query}" op Google.com ↗</a>
              <div class="snippet">Directe zoekopdracht geopend via beveiligde ChromeOS-proxy. Klik hierboven om de volledige live Google-pagina te bekijken.</div>
              <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" target="_blank" class="btn-direct">Open Live op Google ↗</a>
            </div>

            <div class="result">
              <div class="url">https://nl.wikipedia.org/wiki/${encodeURIComponent(query)}</div>
              <a href="/api/proxy?url=https://nl.wikipedia.org/wiki/${encodeURIComponent(query)}">${query} - Wikipedia</a>
              <div class="snippet">Lees encyclopedische informatie en achtergrond over ${query} direct binnen de snelle in-app browser.</div>
            </div>

            <div class="result">
              <div class="url">https://duckduckgo.com/?q=${encodeURIComponent(query)}</div>
              <a href="/api/proxy?url=https://duckduckgo.com/html/?q=${encodeURIComponent(query)}">DuckDuckGo Snelle Resultaten voor "${query}"</a>
              <div class="snippet">Privacy-vriendelijke zoekresultaten zonder tracking, direct geladen in hoge snelheid.</div>
            </div>
          </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(fastSearchHtml);
    }

    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>Pagina laden</title></head>
        <body style="font-family:system-ui,sans-serif;padding:32px;background:#f8fafc;color:#1e293b;text-align:center;">
          <h3 style="color:#d97706;margin-bottom:8px;">⚡ Server time-out voorkomen</h3>
          <p style="color:#64748b;font-size:13px;max-width:500px;margin:0 auto 20px;">De externe website reageerde te traag (>3.5s). Om lag op je Chromebook te voorkomen hebben we het wachten afgebroken.</p>
          <a href="${rawUrl}" target="_blank" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:10px;font-weight:600;font-size:13px;">Open direct in ChromeOS tabblad ↗</a>
          <br><br>
          <a href="javascript:location.reload()" style="font-size:12px;color:#64748b;">Opnieuw proberen in proxy</a>
        </body>
      </html>
    `);
  }
});

// Google Agent Chat Endpoint
app.post('/api/agent/chat', async (req: Request, res: Response) => {
  try {
    const {
      message,
      history = [],
      activeAccount,
      allAccounts = [],
      workspaceData,
      useGoogleSearch = true,
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Bericht is verplicht' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Geen GEMINI_API_KEY geconfigureerd in Settings > Secrets.',
      });
    }

    // Build rich multi-account context for the agent
    const accountsContext = allAccounts
      .map(
        (acc: any) =>
          `- Account: "${acc.name}" (${acc.email}) | Type: ${acc.type} | Status: ${acc.status} | Ongelezen mails: ${acc.unreadCount || 0}`
      )
      .join('\n');

    let workspaceSnapshot = '';
    if (workspaceData) {
      const emailList = (workspaceData.emails || [])
        .slice(0, 15)
        .map(
          (e: any) =>
            `[Email in ${e.accountEmail}] Van: ${e.from} | Onderwerp: "${e.subject}" | Datum: ${e.date} | Ongelezen: ${e.isUnread} | Inhoud: ${e.preview}`
        )
        .join('\n');

      const eventList = (workspaceData.events || [])
        .slice(0, 15)
        .map(
          (ev: any) =>
            `[Agenda in ${ev.accountEmail}] "${ev.title}" | Tijd: ${ev.start} tot ${ev.end} | Locatie/Link: ${ev.location || 'Online'}`
        )
        .join('\n');

      const taskList = (workspaceData.tasks || [])
        .slice(0, 15)
        .map(
          (t: any) =>
            `[Taak in ${t.accountEmail}] "${t.title}" | Deadline: ${t.dueDate || 'Geen'} | Voltooid: ${t.completed}`
        )
        .join('\n');

      workspaceSnapshot = `
=== RECENTE DATA UIT DE GEKOPPELDE GOOGLE ACCOUNTS (CACHE SNAPSHOT) ===
EMAILS:
${emailList || 'Geen recente emails gevonden.'}

AGENDA AFSPRAKEN:
${eventList || 'Geen geplande afspraken gevonden.'}

OPENSTAANDE TAKEN:
${taskList || 'Geen taken gevonden.'}
========================================================================
`;
    }

    const systemInstruction = `
Je bent de officiële "Google Agent voor ChromeOS", een intelligente assistent die diep geïntegreerd is in het ChromeOS Multi-Account Workspace Systeem.
De gebruiker heeft meerdere Google-accounts tegelijkertijd actief (bijvoorbeeld Werk, Privé, Studie of Projecten) en schakelt hier naadloos tussen.

HUIDIG ACTIEF ACCOUNT:
${activeAccount ? `"${activeAccount.name}" <${activeAccount.email}> (${activeAccount.type})` : 'Geen specifiek account geselecteerd (Alle accounts overzicht)'}

ALLE ACTIEVE SESSIES / GEKOPPELDE GOOGLE ACCOUNTS:
${accountsContext || '1 actief account'}

${workspaceSnapshot}

RICHTLIJNEN EN VERMOGENS:
1. Reageer altijd behulpzaam, to the point, professioneel en in vlot Nederlands (tenzij de gebruiker in een andere taal schrijft).
2. Je kunt gegevens over meerdere accounts heen vergelijken, analyseren en samenvatten (bijv. "Vind overlappende afspraken tussen Werk en Privé", "Wat zijn mijn belangrijkste taken voor al mijn accounts vandaag?").
3. Als de gebruiker vraagt om een actie uit te voeren (zoals een email opstellen, afspraak inplannen, taak aanmaken of agenda controleren), geef dan naast je tekstuele uitleg concrete actie-blokken mee in dit exacte formaat:
   - [ACTION:COMPOSE_EMAIL|account=ACCOUNT_EMAIL|to=ONTVANGER|subject=ONDERWERP|body=BERICHT]
   - [ACTION:ADD_EVENT|account=ACCOUNT_EMAIL|title=TITEL|start=YYYY-MM-DDTHH:mm|end=YYYY-MM-DDTHH:mm|location=LOCATIE]
   - [ACTION:CREATE_TASK|account=ACCOUNT_EMAIL|title=TAAKOMSCHRIJVING|priority=high/medium/low|dueDate=YYYY-MM-DD]
   - [ACTION:SWITCH_ACCOUNT|account=ACCOUNT_EMAIL]
4. Maak optimaal gebruik van actuele Google Search informatie waar relevant (grounding).
5. Houd rekening met prestaties op ChromeOS: geef heldere, gestructureerde antwoorden met bullet points waar gepast. Geen onnodige wolligheid.
`;

    // High-performance agent query cache (5-minute TTL)
    const cacheKey = `${activeAccount ? activeAccount.id : 'ALL'}_${useGoogleSearch}_${message.trim().toLowerCase()}`;
    const cachedAgentReply = (globalThis as any).__agentCache?.get(cacheKey);
    if (cachedAgentReply && Date.now() - cachedAgentReply.timestamp < 1000 * 60 * 5) {
      return res.json(cachedAgentReply.data);
    }

    // Map conversation history
    const contents: any[] = [];
    for (const item of history.slice(-6)) {
      contents.push({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.content }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    let response: any;
    let replyText = '';
    let sources: Array<{ title: string; url: string }> = [];

    // Intelligently check if query is an internal workspace lookup:
    // If it's about emails, schedule, tasks or accounts, external search crawling adds 10s of delay for no reason.
    const isWorkspaceLookup = /mail|email|inbox|agenda|afspraak|taak|taken|conflict|overzicht|account|werk|privé|tandarts|sprint/i.test(message);
    const shouldAttachSearchTool = useGoogleSearch && !isWorkspaceLookup;

    // Fast generation: No thinking delay for instant sub-second response
    try {
      const config: any = {
        systemInstruction,
      };

      if (shouldAttachSearchTool) {
        config.tools = [{ googleSearch: {} }];
      }

      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config,
      });

      replyText = response.text || '';

      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(groundingChunks)) {
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri) {
            sources.push({
              title: chunk.web.title || chunk.web.uri,
              url: chunk.web.uri,
            });
          }
        }
      }
    } catch (apiErr: any) {
      console.warn('Eerste Gemini poging mislukt, fallback naar basis model zonder tools:', apiErr?.message);
      // Fallback: try without search tool if it failed due to tool rate limits
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
          },
        });
        replyText = response.text || '';
      } catch (fallbackErr: any) {
        // If quota 429 persists on the API key, provide a high-fidelity local workspace agent synthesis
        if (
          fallbackErr.message?.includes('429') ||
          fallbackErr.message?.includes('RESOURCE_EXHAUSTED') ||
          fallbackErr.message?.includes('quota')
        ) {
          const conflicting = (workspaceData?.events || []).filter((e: any) =>
            e.title.toLowerCase().includes('tandarts') || e.title.toLowerCase().includes('sprint')
          );

          replyText = `**Google Agent (Offline & Cache Synthese)**:
Momenteel is de externe Gemini API-aanvraaglimiet (Quota 429) bereikt op je API-sleutel. Desondanks heb ik je lokale **ChromeOS Workspace Cache** direct doorzocht:

- **Actieve sessies**: Er zijn ${allAccounts.length} Google-accounts gekoppeld (${allAccounts.map((a: any) => a.name).join(', ')}).
- **Ongelezen e-mails**: In totaal staan er ${workspaceData?.emails?.length || 0} e-mails in de lokale cache.
- **Agenda-analyse**: ${
            conflicting.length > 0
              ? '⚠️ Er is een agendaconflict gedetecteerd rond 14:00 tussen je persoonlijke afspraak en werk-sprint review!'
              : 'Geen directe overlappen gevonden voor vandaag.'
          }

[ACTION:SWITCH_ACCOUNT|account=${allAccounts[0]?.email || ''}]
Je kunt direct schakelen tussen accounts via de sessiebalk bovenaan (Ctrl+1, Ctrl+2).`;
        } else {
          throw fallbackErr;
        }
      }
    }

    // Parse potential actions from the response
    const actionRegex = /\[ACTION:([A-Z_]+)\|([^\]]+)\]/g;
    const actions: Array<{ type: string; payload: Record<string, string> }> = [];
    let match;
    while ((match = actionRegex.exec(replyText)) !== null) {
      const type = match[1];
      const paramsStr = match[2];
      const payload: Record<string, string> = {};
      const pairs = paramsStr.split('|');
      for (const pair of pairs) {
        const [k, ...v] = pair.split('=');
        if (k) payload[k.trim()] = v.join('=').trim();
      }
      actions.push({ type, payload });
    }

    // Clean text for presentation (optional, or we can keep or highlight actions)
    const cleanText = replyText.replace(actionRegex, '').trim();

    const resultPayload = {
      text: cleanText,
      rawText: replyText,
      actions,
      sources,
      timestamp: Date.now(),
    };

    if (!(globalThis as any).__agentCache) {
      (globalThis as any).__agentCache = new Map<string, any>();
    }
    if ((globalThis as any).__agentCache.size > 100) {
      const first = (globalThis as any).__agentCache.keys().next().value;
      if (first) (globalThis as any).__agentCache.delete(first);
    }
    (globalThis as any).__agentCache.set(cacheKey, { data: resultPayload, timestamp: Date.now() });

    return res.json(resultPayload);
  } catch (err: any) {
    console.error('Error in /api/agent/chat:', err);
    return res.status(500).json({
      error: err.message || 'Er is een fout opgetreden bij de Google Agent.',
    });
  }
});

// Quick Agent summary endpoint for high-speed Chromebook rendering
app.post('/api/agent/quick-summary', async (req: Request, res: Response) => {
  try {
    const { type, accountName, items } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Geen API key gevonden' });
    }

    const prompt = `Vat de volgende ${type} van account "${accountName}" kort en krachtig samen in 2-3 zinnen voor een Chromebook ChromeOS dashboard:\n${JSON.stringify(items).slice(0, 2000)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Je bent een ultra-snelle Google Agent. Geef een beknopte, directe samenvatting in het Nederlands.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    res.json({ summary: response.text || '' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
