import { GoogleGenAI, Type, type FunctionDeclaration, type Schema } from '@google/genai';

export type WorkerProviderId = 'gemini' | 'deepseek' | 'local';

export interface WorkerChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface WorkerToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
  };
}

export interface WorkerChatRequest {
  provider?: WorkerProviderId;
  model?: string;
  messages: WorkerChatMessage[];
  tools?: WorkerToolDef[];
  json?: boolean;
}

export interface WorkerChatResponse {
  providerUsed: WorkerProviderId;
  modelUsed: string;
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

function toGeminiSchema(raw: Record<string, unknown> | undefined): Schema {
  if (!raw || typeof raw !== 'object') return { type: Type.OBJECT, properties: {} };
  const t = String(raw.type || 'object').toLowerCase();
  const typeEnum =
    t === 'string'
      ? Type.STRING
      : t === 'number' || t === 'integer'
      ? Type.NUMBER
      : t === 'boolean'
      ? Type.BOOLEAN
      : t === 'array'
      ? Type.ARRAY
      : Type.OBJECT;
  const out: Schema = { type: typeEnum };
  if (typeof raw.description === 'string') out.description = raw.description;
  if (raw.properties && typeof raw.properties === 'object') {
    out.properties = Object.fromEntries(
      Object.entries(raw.properties as Record<string, Record<string, unknown>>).map(([k, v]) => [k, toGeminiSchema(v)])
    );
    if (Array.isArray(raw.required)) out.required = raw.required.map(String);
  }
  return out;
}

export async function runWorkerLlmChat(req: WorkerChatRequest): Promise<WorkerChatResponse> {
  const provider = req.provider || ((process.env.LLM_PROVIDER as WorkerProviderId) || 'gemini');

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('worker thiếu GEMINI_API_KEY');
    const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    const model = req.model || 'gemini-2.5-flash';

    const systemParts: string[] = [];
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const m of req.messages) {
      if (m.role === 'system') systemParts.push(m.content);
      else if (m.role === 'assistant') contents.push({ role: 'model', parts: [{ text: m.content }] });
      else contents.push({ role: 'user', parts: [{ text: m.content }] });
    }

    const functionDeclarations: FunctionDeclaration[] = (req.tools || []).map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: toGeminiSchema(t.function.parameters),
    }));

    const config: Record<string, unknown> = {};
    if (systemParts.length) config.systemInstruction = systemParts.join('\n\n');
    if (req.json) config.responseMimeType = 'application/json';
    if (functionDeclarations.length) config.tools = [{ functionDeclarations }];

    const res = await ai.models.generateContent({ model, contents, config });
    return {
      providerUsed: 'gemini',
      modelUsed: model,
      content: res.text || '',
      toolCalls: res.functionCalls?.map((fc, i) => ({
        id: `w_gem_${Date.now()}_${i}`,
        name: fc.name || 'unknown',
        arguments: (fc.args as Record<string, unknown>) || {},
      })),
      usage: {
        promptTokens: res.usageMetadata?.promptTokenCount || 300,
        completionTokens: res.usageMetadata?.candidatesTokenCount || 200,
        totalTokens: res.usageMetadata?.totalTokenCount || 500,
      },
    };
  }

  if (provider === 'deepseek') {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('worker thiếu DEEPSEEK_API_KEY');
    const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
    const model = req.model || 'deepseek-chat';
    const isReasoner = model === 'deepseek-reasoner';
    const payload: Record<string, unknown> = { model, messages: req.messages };
    if (!isReasoner && req.tools?.length) {
      payload.tools = req.tools;
      payload.tool_choice = 'auto';
    }
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    const d = (await r.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
        };
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const msg = d.choices?.[0]?.message;
    return {
      providerUsed: 'deepseek',
      modelUsed: model,
      content: msg?.content || '',
      toolCalls: msg?.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      })),
      usage: {
        promptTokens: d.usage?.prompt_tokens || 300,
        completionTokens: d.usage?.completion_tokens || 200,
        totalTokens: d.usage?.total_tokens || 500,
      },
    };
  }

  // Local OpenAI-compatible server with JSON-tool mode
  const baseUrl = (process.env.LOCAL_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, '');
  const model = req.model || process.env.LOCAL_MODEL || 'qwen2.5:7b';
  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: req.messages, temperature: 0.3 }),
  });
  const d = (await r.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  return {
    providerUsed: 'local',
    modelUsed: model,
    content: d.choices?.[0]?.message?.content || '',
    usage: {
      promptTokens: d.usage?.prompt_tokens || 250,
      completionTokens: d.usage?.completion_tokens || 180,
      totalTokens: d.usage?.total_tokens || 430,
    },
  };
}
