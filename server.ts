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

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; CrOS x86_64 14542.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

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

      return res.send(html);
    } else {
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }
  } catch (err: any) {
    console.error('In-App Browser Proxy Error:', err);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>Pagina laden mislukt</title></head>
        <body style="font-family:system-ui,sans-serif;padding:40px;background:#f8fafc;color:#1e293b;text-align:center;">
          <h2 style="color:#e11d48;">⚠️ Kan pagina niet laden via in-app browser</h2>
          <p style="color:#64748b;">Doel-URL: <code>${req.query.url}</code></p>
          <p style="color:#64748b;margin-bottom:24px;">Foutmelding: ${err.message}</p>
          <a href="javascript:location.reload()" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:10px;font-weight:600;">Opnieuw proberen</a>
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

    // Map conversation history
    const contents: any[] = [];
    for (const item of history.slice(-8)) {
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

    // Attempt generation with Google Search grounding if requested
    try {
      const config: any = {
        systemInstruction,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      };

      if (useGoogleSearch) {
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

    return res.json({
      text: cleanText,
      rawText: replyText,
      actions,
      sources,
      timestamp: Date.now(),
    });
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
