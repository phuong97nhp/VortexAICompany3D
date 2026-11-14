import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type, type FunctionDeclaration, type Schema } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

function toGeminiSchema(raw: Record<string, unknown> | undefined): Schema {
  if (!raw || typeof raw !== 'object') {
    return { type: Type.OBJECT, properties: {} };
  }
  const rawType = String(raw.type || 'object').toLowerCase();
  const mapType = (t: string): Type => {
    switch (t) {
      case 'string':
        return Type.STRING;
      case 'number':
      case 'integer':
        return Type.NUMBER;
      case 'boolean':
        return Type.BOOLEAN;
      case 'array':
        return Type.ARRAY;
      default:
        return Type.OBJECT;
    }
  };

  const out: Schema = { type: mapType(rawType) };
  if (typeof raw.description === 'string') out.description = raw.description;
  if (Array.isArray(raw.enum)) out.enum = raw.enum.map(String);

  if (rawType === 'object' && raw.properties && typeof raw.properties === 'object') {
    const props: Record<string, Schema> = {};
    for (const [k, v] of Object.entries(raw.properties as Record<string, Record<string, unknown>>)) {
      props[k] = toGeminiSchema(v);
    }
    out.properties = props;
    if (Array.isArray(raw.required)) {
      out.required = raw.required.map(String);
    }
  } else if (rawType === 'array' && raw.items && typeof raw.items === 'object') {
    out.items = toGeminiSchema(raw.items as Record<string, unknown>);
  }
  return out;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Health & Environment capability check
  app.get('/api/health', (_req, res) => {
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);
    const hasDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);
    res.json({
      ok: true,
      mode: 'proxy',
      hasGeminiEnvKey: hasGemini,
      hasDeepSeekEnvKey: hasDeepSeek,
      hasDeepSeekKey: hasDeepSeek,
      hasSearchKey: Boolean(process.env.SEARCH_TAVILY_API_KEY || process.env.SEARCH_SERPER_API_KEY),
      dryRunDefault: process.env.DRY_RUN !== 'false',
      dailyTokenBudget: Number(process.env.DAILY_TOKEN_BUDGET || 500000),
      workerUrl: process.env.WORKER_WS_URL || null,
    });
  });

  // Server-side Gemini API proxy using @google/genai
  app.post('/api/llm/gemini', async (req, res) => {
    const apiKey = (process.env.GEMINI_API_KEY || req.body?.manualApiKey || '').trim();
    if (!apiKey) {
      return res.status(400).json({
        error: 'NO_GEMINI_KEY',
        message: 'Chưa có GEMINI_API_KEY trên server hoặc trong Cài đặt.',
      });
    }

    try {
      const {
        model = 'gemini-2.5-flash',
        messages = [],
        tools = [],
        json = false,
        temperature = 0.4,
        maxTokens = 1600,
      } = req.body as {
        model?: string;
        messages?: Array<{ role: string; content: string; name?: string }>;
        tools?: Array<{ type: string; function: { name: string; description: string; parameters?: Record<string, unknown> } }>;
        json?: boolean;
        temperature?: number;
        maxTokens?: number;
      };

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const systemParts: string[] = [];
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      for (const m of messages) {
        if (m.role === 'system') {
          systemParts.push(m.content);
        } else if (m.role === 'assistant') {
          contents.push({ role: 'model', parts: [{ text: m.content || '...' }] });
        } else if (m.role === 'tool') {
          contents.push({
            role: 'user',
            parts: [{ text: `[Kết quả Tool${m.name ? ` ${m.name}` : ''}]: ${m.content}` }],
          });
        } else {
          contents.push({ role: 'user', parts: [{ text: m.content || '' }] });
        }
      }

      if (contents.length === 0) {
        contents.push({ role: 'user', parts: [{ text: 'Xin chào' }] });
      }

      const functionDeclarations: FunctionDeclaration[] = Array.isArray(tools)
        ? tools
            .filter((t) => t?.function?.name)
            .map((t) => ({
              name: t.function.name,
              description: t.function.description || '',
              parameters: toGeminiSchema(t.function.parameters),
            }))
        : [];

      const config: Record<string, unknown> = {
        temperature: typeof temperature === 'number' ? temperature : 0.4,
        maxOutputTokens: maxTokens,
      };
      if (systemParts.length > 0) {
        config.systemInstruction = systemParts.join('\n\n');
      }
      if (json) {
        config.responseMimeType = 'application/json';
      }
      if (functionDeclarations.length > 0) {
        config.tools = [{ functionDeclarations }];
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });

      const textContent = response.text || '';
      const fnCalls = (response.functionCalls || []).map((fc, i) => ({
        id: `gem_tc_${Date.now()}_${i}`,
        name: fc.name || 'unknown_tool',
        arguments: (fc.args as Record<string, unknown>) || {},
      }));

      const meta = response.usageMetadata;
      return res.json({
        content: textContent,
        toolCalls: fnCalls.length > 0 ? fnCalls : undefined,
        usage: {
          promptTokens: meta?.promptTokenCount || 320,
          completionTokens: meta?.candidatesTokenCount || 240,
          totalTokens: meta?.totalTokenCount || 560,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi gọi Gemini API';
      const status = /429|quota|RESOURCE_EXHAUSTED/i.test(msg) ? 429 : 502;
      return res.status(status).json({ error: 'GEMINI_ERROR', message: msg });
    }
  });

  // DeepSeek OpenAI-compatible proxy (supports both /api/llm/deepseek and /api/llm)
  const handleDeepSeekProxy = async (req: express.Request, res: express.Response) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'NO_SERVER_KEY',
        message: 'Server chưa cấu hình DEEPSEEK_API_KEY. Hãy dùng chế độ Trực tiếp hoặc Mô phỏng.',
      });
    }

    try {
      const { model, messages, tools, tool_choice, temperature, max_tokens, response_format } = req.body;
      const payload: Record<string, unknown> = {
        model: model || 'deepseek-chat',
        messages,
      };
      if (model !== 'deepseek-reasoner') {
        if (typeof temperature === 'number') payload.temperature = temperature;
        if (response_format) payload.response_format = response_format;
        if (Array.isArray(tools) && tools.length > 0) {
          payload.tools = tools;
          payload.tool_choice = tool_choice || 'auto';
        }
      }
      if (typeof max_tokens === 'number') payload.max_tokens = max_tokens;

      const upstream = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await upstream.json();
      if (!upstream.ok) {
        return res.status(upstream.status).json(data);
      }
      return res.json(data);
    } catch (err) {
      return res.status(502).json({
        error: 'PROXY_ERROR',
        message: err instanceof Error ? err.message : 'Lỗi kết nối DeepSeek từ proxy',
      });
    }
  };
  app.post('/api/llm/deepseek', handleDeepSeekProxy);
  app.post('/api/llm', handleDeepSeekProxy);

  // Local OpenAI-compatible Server Proxy (useful when running npm run dev locally to bypass browser CORS)
  app.post('/api/llm/local-models', async (req, res) => {
    const { baseUrl, apiKey } = req.body as { baseUrl?: string; apiKey?: string };
    const clean = (baseUrl || 'http://localhost:11434/v1').trim().replace(/\/+$/, '');
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const r = await fetch(`${clean}/models`, { headers });
      const data = await r.json().catch(() => ({}));
      return res.status(r.status).json(data);
    } catch (err) {
      return res.status(502).json({
        error: 'LOCAL_UNREACHABLE',
        message:
          err instanceof Error
            ? `Không nối được tới ${clean} từ server (${err.message}). Nếu đang xem trên AI Studio Cloud, hãy tải code về chạy npm run dev trên máy cá nhân.`
            : 'Local LLM server unreachable',
      });
    }
  });

  app.post('/api/llm/local-proxy', async (req, res) => {
    const { baseUrl, apiKey, payload } = req.body as {
      baseUrl?: string;
      apiKey?: string;
      payload?: Record<string, unknown>;
    };
    const clean = (baseUrl || 'http://localhost:11434/v1').trim().replace(/\/+$/, '');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const r = await fetch(`${clean}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload || {}),
      });
      const data = await r.json().catch(() => ({}));
      return res.status(r.status).json(data);
    } catch (err) {
      return res.status(502).json({
        error: 'LOCAL_PROXY_ERROR',
        message: err instanceof Error ? err.message : 'Lỗi proxy tới Local LLM Server',
      });
    }
  });

  // Public Web Search proxy: Tavily -> Serper -> DuckDuckGo fallback
  app.post('/api/search', async (req, res) => {
    const query = String(req.body?.query || '').trim();
    const limit = Math.min(Number(req.body?.limit || 6), 10);
    if (!query) {
      return res.status(400).json({ error: 'Thiếu từ khóa tìm kiếm' });
    }

    try {
      if (process.env.SEARCH_TAVILY_API_KEY) {
        const r = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: process.env.SEARCH_TAVILY_API_KEY,
            query,
            max_results: limit,
            include_answer: false,
          }),
        });
        if (r.ok) {
          const d = (await r.json()) as { results?: Array<{ title: string; url: string; content: string }> };
          return res.json({
            provider: 'tavily',
            results: (d.results || []).map((x) => ({
              title: x.title,
              url: x.url,
              snippet: x.content,
            })),
          });
        }
      }

      if (process.env.SEARCH_SERPER_API_KEY) {
        const r = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': process.env.SEARCH_SERPER_API_KEY,
          },
          body: JSON.stringify({ q: query, gl: 'vn', hl: 'vi', num: limit }),
        });
        if (r.ok) {
          const d = (await r.json()) as { organic?: Array<{ title: string; link: string; snippet: string }> };
          return res.json({
            provider: 'serper',
            results: (d.organic || []).map((x) => ({
              title: x.title,
              url: x.link,
              snippet: x.snippet,
            })),
          });
        }
      }

      // DuckDuckGo Instant Answer API fallback (public, zero-key)
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const ddgRes = await fetch(ddgUrl);
      if (ddgRes.ok) {
        const ddg = (await ddgRes.json()) as {
          AbstractText?: string;
          AbstractURL?: string;
          Heading?: string;
          RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
        };
        const results: Array<{ title: string; url: string; snippet: string }> = [];
        if (ddg.AbstractText && ddg.AbstractURL) {
          results.push({
            title: ddg.Heading || query,
            url: ddg.AbstractURL,
            snippet: ddg.AbstractText,
          });
        }
        for (const t of ddg.RelatedTopics || []) {
          if (t.Text && t.FirstURL && results.length < limit) {
            results.push({
              title: t.Text.slice(0, 80),
              url: t.FirstURL,
              snippet: t.Text,
            });
          }
        }
        return res.json({ provider: 'duckduckgo', results });
      }

      return res.json({ provider: 'none', results: [] });
    } catch (err) {
      return res.json({
        provider: 'error',
        results: [],
        error: err instanceof Error ? err.message : 'Search error',
      });
    }
  });

  // Safe Public Page Fetcher (never logs in, extracts public contact info only)
  app.post('/api/fetch-page', async (req, res) => {
    const targetUrl = String(req.body?.url || '').trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'URL không hợp lệ' });
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AICompany-PublicLeadBot/1.0 (+https://example.local/bot-info)',
        },
      });
      clearTimeout(timer);

      const html = await response.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 6000);

      const emails = Array.from(new Set(text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])).slice(0, 5);
      const phones = Array.from(new Set(text.match(/(?:\+84|0)(?:\d[\s.-]?){8,10}\d/g) || [])).slice(0, 5);

      return res.json({
        url: targetUrl,
        status: response.status,
        excerpt: text.slice(0, 2000),
        extractedContacts: { emails, phones },
      });
    } catch (err) {
      return res.status(502).json({
        error: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : 'Không tải được trang công khai',
      });
    }
  });

  // Hub.ChuyenWeb.com server-side proxy (enforces URL allowlist & agent identity headers, never logs secrets)
  app.post('/api/hubcw/proxy', async (req, res) => {
    const {
      baseUrl = 'https://hub.chuyenweb.com',
      url,
      method = 'GET',
      token,
      agentId,
      externalUserId,
      requestId,
      idempotencyKey,
      payload,
    } = (req.body || {}) as {
      baseUrl?: string;
      url?: string;
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      token?: string;
      agentId?: string;
      externalUserId?: string;
      requestId?: string;
      idempotencyKey?: string;
      payload?: Record<string, unknown>;
    };

    const cleanBase = String(baseUrl || 'https://hub.chuyenweb.com').trim().replace(/\/+$/, '');
    const targetUrl = String(url || '').trim();
    if (!targetUrl.startsWith(cleanBase) || (!targetUrl.startsWith('https://') && !targetUrl.startsWith('http://'))) {
      return res.status(400).json({
        ok: false,
        error: 'URL đích không thuộc baseUrl đã cấu hình cho Hub.ChuyenWeb.',
      });
    }

    const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    const upperMethod = String(method || 'GET').toUpperCase();
    if (!allowedMethods.has(upperMethod)) {
      return res.status(400).json({ ok: false, error: 'HTTP method không hợp lệ.' });
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Agent-Id': String(agentId || 'unknown'),
        'X-Agent-Request-Id': String(requestId || `req_${Date.now()}`),
      };
      if (externalUserId) headers['X-External-User-Id'] = String(externalUserId);
      if (idempotencyKey) headers['Idempotency-Key'] = String(idempotencyKey);
      if (token && token.trim()) {
        const cleanToken = token.trim();
        headers.Authorization = cleanToken.toLowerCase().startsWith('bearer ')
          ? cleanToken
          : `Bearer ${cleanToken}`;
      }

      const upstream = await fetch(targetUrl, {
        method: upperMethod,
        headers,
        body: upperMethod !== 'GET' && payload ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const contentType = upstream.headers.get('content-type') || '';
      const rawText = await upstream.text();
      let parsed: Record<string, unknown> = {};
      if (contentType.includes('application/json')) {
        try {
          parsed = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
          parsed = { rawText: rawText.slice(0, 600) };
        }
      } else {
        parsed = { rawText: rawText.slice(0, 600) };
      }

      return res.status(upstream.ok ? 200 : upstream.status).json({
        ok: upstream.ok,
        upstreamStatus: upstream.status,
        ...parsed,
      });
    } catch (err) {
      return res.status(502).json({
        ok: false,
        upstreamStatus: 502,
        error: err instanceof Error ? err.message : 'Không kết nối được tới server Hub.ChuyenWeb',
      });
    }
  });

  app.get('/api/worker/status', (_req, res) => {
    res.json({
      ok: Boolean(process.env.WORKER_WS_URL),
      workerUrl: process.env.WORKER_WS_URL || null,
      dryRun: process.env.DRY_RUN !== 'false',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VĂN PHÒNG ẢO 3D – AI COMPANY server running at http://localhost:${PORT}`);
  });
}

startServer();
