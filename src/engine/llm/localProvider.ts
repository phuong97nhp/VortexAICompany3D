import {
  LLMProvider,
  LlmChatMessage,
  LlmToolDefinition,
  UnifiedChatRequest,
  UnifiedChatResponse,
  UnifiedToolCall,
} from './types';

export interface LocalProviderConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
  useWorkerProxy?: boolean;
  hasExpressProxy?: boolean;
}

export interface LocalConnectionTestResult {
  ok: boolean;
  models: string[];
  message: string;
  corsHint?: string;
}

function normalizeBaseUrl(url: string): string {
  return (url || 'http://localhost:11434/v1').trim().replace(/\/+$/, '');
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Try substring extraction
  }

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function buildJsonToolInstruction(tools: LlmToolDefinition[]): string {
  const toolSummaries = tools
    .map((t) => {
      const props = (t.function.parameters as { properties?: Record<string, unknown> })?.properties || {};
      return `- "${t.function.name}": ${t.function.description} | args keys: [${Object.keys(props).join(', ')}]`;
    })
    .join('\n');

  return [
    'CHẾ ĐỘ JSON-TOOL BẮT BUỘC:',
    'Bạn PHẢI trả lời DUY NHẤT một đối tượng JSON hợp lệ (không thêm chữ ngoài JSON).',
    'Chọn 1 trong 2 định dạng:',
    '1) Nếu cần gọi công cụ: {"tool": "<ten_cong_cu>", "args": { ...tham_so }}',
    '2) Nếu trả lời trực tiếp cho người dùng/CEO: {"reply": "<nội dung tiếng Việt có dấu>"}',
    'Danh sách công cụ hợp lệ:',
    toolSummaries,
  ].join('\n');
}

function validateJsonToolPayload(
  obj: Record<string, unknown>,
  allowedToolNames: Set<string>
): { valid: true; reply?: string; toolCall?: UnifiedToolCall } | { valid: false; reason: string } {
  if (typeof obj.reply === 'string' && obj.reply.trim().length > 0) {
    return { valid: true, reply: obj.reply.trim() };
  }
  if (typeof obj.tool === 'string' && allowedToolNames.has(obj.tool)) {
    const args =
      obj.args && typeof obj.args === 'object' && !Array.isArray(obj.args)
        ? (obj.args as Record<string, unknown>)
        : {};
    return {
      valid: true,
      toolCall: {
        id: `local_tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: obj.tool,
        arguments: args,
      },
    };
  }
  if (typeof obj.tool === 'string' && !allowedToolNames.has(obj.tool)) {
    return {
      valid: false,
      reason: `Tên tool "${obj.tool}" không hợp lệ. Chỉ dùng: ${Array.from(allowedToolNames).join(', ')}`,
    };
  }
  return {
    valid: false,
    reason: 'JSON phải chứa {"tool": "...", "args": {...}} hoặc {"reply": "..."}.',
  };
}

function buildDiagnosticHint(baseUrl: string, errText: string): string {
  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isHttpLocal = baseUrl.startsWith('http://localhost') || baseUrl.startsWith('http://127.0.0.1');
  if (isHttpsPage && isHttpLocal) {
    return 'Trang đang chạy trên HTTPS nên trình duyệt có thể chặn gọi http://localhost (Mixed Content). Giải pháp: tải mã nguồn về chạy `npm run dev` trên localhost hoặc bật Proxy qua /worker.';
  }
  if (/failed to fetch|networkerror|cors|preflight/i.test(errText)) {
    return 'Lỗi CORS hoặc server Local chưa chạy. Với Ollama hãy đặt biến môi trường `OLLAMA_ORIGINS=*` rồi khởi động lại Ollama; với LM Studio hãy bật CORS trong Server Settings.';
  }
  return 'Kiểm tra Ollama/LM Studio/llama.cpp đã bật server chưa và đúng cổng (Ollama: 11434/v1, LM Studio: 1234/v1).';
}

export async function listLocalModels(cfg: LocalProviderConfig): Promise<LocalConnectionTestResult> {
  const baseUrl = normalizeBaseUrl(cfg.baseUrl);
  const headers: Record<string, string> = {};
  if (cfg.apiKey?.trim()) {
    headers.Authorization = `Bearer ${cfg.apiKey.trim()}`;
  }

  try {
    let res: Response;
    if (cfg.useWorkerProxy && cfg.hasExpressProxy) {
      res = await fetch('/api/llm/local-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey: cfg.apiKey?.trim() }),
      });
    } else {
      res = await fetch(`${baseUrl}/models`, { method: 'GET', headers });
    }

    const data = (await res.json().catch(() => ({}))) as {
      data?: Array<{ id?: string; name?: string }>;
      models?: Array<{ id?: string; name?: string } | string>;
      error?: string;
      message?: string;
    };

    if (!res.ok) {
      const msg = data.message || data.error || `HTTP ${res.status}`;
      return {
        ok: false,
        models: [],
        message: `Không liệt kê được model: ${msg}`,
        corsHint: buildDiagnosticHint(baseUrl, msg),
      };
    }

    const rawList = data.data || data.models || [];
    const models = rawList
      .map((m) => (typeof m === 'string' ? m : m.id || m.name || ''))
      .filter(Boolean);

    return {
      ok: true,
      models,
      message: models.length
        ? `Kết nối thành công! Tìm thấy ${models.length} model tại ${baseUrl}.`
        : `Kết nối được tới ${baseUrl} nhưng chưa có model nào được tải.`,
    };
  } catch (err) {
    const errText = err instanceof Error ? err.message : 'Lỗi kết nối';
    return {
      ok: false,
      models: [],
      message: `Lỗi kết nối tới ${baseUrl}: ${errText}`,
      corsHint: buildDiagnosticHint(baseUrl, errText),
    };
  }
}

export async function testLocalConnection(cfg: LocalProviderConfig): Promise<LocalConnectionTestResult> {
  return listLocalModels(cfg);
}

export class LocalLLMProvider implements LLMProvider {
  readonly id = 'local' as const;
  private getConfig: () => LocalProviderConfig;

  constructor(getConfig: () => LocalProviderConfig) {
    this.getConfig = getConfig;
  }

  private async sendCompletion(
    cfg: LocalProviderConfig,
    model: string,
    messages: LlmChatMessage[],
    opts: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
  ): Promise<{ content: string; promptTokens: number; completionTokens: number; totalTokens: number }> {
    const baseUrl = normalizeBaseUrl(cfg.baseUrl);
    const payload: Record<string, unknown> = {
      model,
      messages,
      temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.3,
      max_tokens: opts.maxTokens || 1200,
    };
    if (opts.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    let res: Response;
    if (cfg.useWorkerProxy && cfg.hasExpressProxy) {
      res = await fetch('/api/llm/local-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          apiKey: cfg.apiKey?.trim() || undefined,
          payload,
        }),
      });
    } else {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cfg.apiKey?.trim()) {
        headers.Authorization = `Bearer ${cfg.apiKey.trim()}`;
      }
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    }

    const data = (await res.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      error?: { message?: string } | string;
      message?: string;
    };

    if (!res.ok) {
      const errMsg =
        typeof data.error === 'string'
          ? data.error
          : data.error?.message || data.message || `Local Server HTTP ${res.status}`;
      const err = new Error(errMsg);
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }

    const content = data.choices?.[0]?.message?.content || '';
    const promptTokens = data.usage?.prompt_tokens || Math.max(100, Math.round(JSON.stringify(messages).length * 0.28));
    const completionTokens = data.usage?.completion_tokens || Math.max(60, Math.round(content.length * 0.35));
    const totalTokens = data.usage?.total_tokens || promptTokens + completionTokens;

    return { content, promptTokens, completionTokens, totalTokens };
  }

  async chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
    const cfg = this.getConfig();
    const model = request.model || cfg.model || 'qwen2.5:7b';
    const hasTools = Boolean(request.tools && request.tools.length > 0);

    // If no tools needed (plain chat or JSON), run directly
    if (!hasTools) {
      const out = await this.sendCompletion(cfg, model, request.messages, {
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        jsonMode: request.json,
      });
      return {
        content: out.content,
        providerUsed: 'local',
        modelUsed: model,
        usage: {
          promptTokens: out.promptTokens,
          completionTokens: out.completionTokens,
          totalTokens: out.totalTokens,
          costUsd: 0, // Local AI is 0đ
          cached: false,
        },
      };
    }

    // JSON-Tool Mode with Schema Verification + up to 2 auto-repair retries
    const tools = request.tools!;
    const allowedToolNames = new Set(tools.map((t) => t.function.name));
    const instruction = buildJsonToolInstruction(tools);
    const workingMessages: LlmChatMessage[] = [
      { role: 'system', content: instruction },
      ...request.messages,
    ];

    let totalPrompt = 0;
    let totalCompletion = 0;
    let lastRaw = '';

    for (let repairAttempt = 0; repairAttempt <= 2; repairAttempt++) {
      const out = await this.sendCompletion(cfg, model, workingMessages, {
        temperature: 0.2,
        maxTokens: request.maxTokens || 1200,
        jsonMode: true,
      });
      totalPrompt += out.promptTokens;
      totalCompletion += out.completionTokens;
      lastRaw = out.content;

      const parsed = extractJsonObject(out.content);
      if (parsed) {
        const validation = validateJsonToolPayload(parsed, allowedToolNames);
        if (validation.valid) {
          return {
            content: validation.reply || '',
            toolCalls: validation.toolCall ? [validation.toolCall] : undefined,
            providerUsed: 'local',
            modelUsed: model,
            usage: {
              promptTokens: totalPrompt,
              completionTokens: totalCompletion,
              totalTokens: totalPrompt + totalCompletion,
              costUsd: 0,
              cached: false,
            },
          };
        }
        workingMessages.push({ role: 'assistant', content: out.content });
        workingMessages.push({
          role: 'user',
          content: `Lỗi schema JSON-tool: ${validation.reason}. Hãy sửa và trả về DUY NHẤT JSON hợp lệ.`,
        });
      } else {
        workingMessages.push({ role: 'assistant', content: out.content });
        workingMessages.push({
          role: 'user',
          content:
            'Đầu ra vừa rồi không phải JSON hợp lệ. Hãy trả về DUY NHẤT JSON theo mẫu {"tool":"...","args":{}} hoặc {"reply":"..."}.',
        });
      }
    }

    // Graceful degradation: if model still outputted plain Vietnamese text after 2 repair retries, treat as reply
    return {
      content: lastRaw || 'Local model không trả về JSON hợp lệ sau 2 lần tự sửa.',
      providerUsed: 'local',
      modelUsed: model,
      usage: {
        promptTokens: totalPrompt,
        completionTokens: totalCompletion,
        totalTokens: totalPrompt + totalCompletion,
        costUsd: 0,
        cached: false,
      },
    };
  }
}
