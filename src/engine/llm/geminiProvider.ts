import { LLMProvider, UnifiedChatRequest, UnifiedChatResponse } from './types';

const GEMINI_PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  'gemini-2.5-pro': { input: 1.25 / 1_000_000, output: 10.0 / 1_000_000 },
};

export interface GeminiProviderConfig {
  manualApiKey?: string;
}

export class GeminiLLMProvider implements LLMProvider {
  readonly id = 'gemini' as const;
  private getConfig: () => GeminiProviderConfig;

  constructor(getConfig: () => GeminiProviderConfig) {
    this.getConfig = getConfig;
  }

  async chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
    const model = request.model || 'gemini-2.5-flash';
    const cfg = this.getConfig();

    const res = await fetch('/api/llm/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: request.messages,
        tools: request.tools,
        json: Boolean(request.json),
        temperature: request.temperature,
        maxTokens: request.maxTokens || 1600,
        manualApiKey: cfg.manualApiKey?.trim() || undefined,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      content?: string;
      toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
      usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
      error?: string;
      message?: string;
    };

    if (!res.ok) {
      const err = new Error(data.message || data.error || `Gemini HTTP ${res.status}`);
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }

    const promptTokens = data.usage?.promptTokens || 320;
    const completionTokens = data.usage?.completionTokens || 240;
    const totalTokens = data.usage?.totalTokens || promptTokens + completionTokens;
    const price = GEMINI_PRICING[model] || GEMINI_PRICING['gemini-2.5-flash'];
    const costUsd = promptTokens * price.input + completionTokens * price.output;

    return {
      content: data.content || '',
      toolCalls: data.toolCalls,
      providerUsed: 'gemini',
      modelUsed: model,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
        costUsd,
        cached: false,
      },
    };
  }
}
