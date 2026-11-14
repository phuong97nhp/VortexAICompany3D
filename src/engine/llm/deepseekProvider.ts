import { LLMProvider, UnifiedChatRequest, UnifiedChatResponse } from './types';

const DEEPSEEK_DIRECT_URL = 'https://api.deepseek.com/chat/completions';

const DEEPSEEK_PRICING: Record<string, { input: number; output: number }> = {
  'deepseek-chat': { input: 0.27 / 1_000_000, output: 1.1 / 1_000_000 },
  'deepseek-reasoner': { input: 0.55 / 1_000_000, output: 2.19 / 1_000_000 },
};

export interface DeepSeekProviderConfig {
  mode: 'proxy' | 'direct';
  apiKey: string;
  hasServerKey: boolean;
  hasServerProxy: boolean;
}

export class DeepSeekLLMProvider implements LLMProvider {
  readonly id = 'deepseek' as const;
  private getConfig: () => DeepSeekProviderConfig;

  constructor(getConfig: () => DeepSeekProviderConfig) {
    this.getConfig = getConfig;
  }

  async chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
    const cfg = this.getConfig();
    const model = request.model === 'deepseek-reasoner' ? 'deepseek-reasoner' : 'deepseek-chat';

    const useDirect = cfg.mode === 'direct' || (!cfg.hasServerKey && Boolean(cfg.apiKey.trim()));
    if (!useDirect && !cfg.hasServerKey) {
      throw new Error('Chưa có DEEPSEEK_API_KEY trên server hoặc trong Cài đặt.');
    }
    if (useDirect && !cfg.apiKey.trim()) {
      throw new Error('Chưa nhập DeepSeek API Key trong Cài đặt.');
    }

    const endpoint = useDirect ? DEEPSEEK_DIRECT_URL : '/api/llm/deepseek';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (useDirect) {
      headers.Authorization = `Bearer ${cfg.apiKey.trim()}`;
    }

    // Rule: deepseek-reasoner does NOT accept tools or temperature
    const isReasoner = model === 'deepseek-reasoner';
    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
      max_tokens: request.maxTokens || 1500,
    };

    if (!isReasoner) {
      body.temperature = typeof request.temperature === 'number' ? request.temperature : 0.4;
      if (request.tools && request.tools.length > 0) {
        body.tools = request.tools;
        body.tool_choice = 'auto';
      }
      if (request.json) {
        body.response_format = { type: 'json_object' };
      }
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as {
      choices?: Array<{
        message?: {
          content?: string;
          reasoning_content?: string;
          tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
        };
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      error?: { message?: string } | string;
      message?: string;
    };

    if (!res.ok) {
      const msg =
        typeof data.error === 'string'
          ? data.error
          : data.error?.message || data.message || `DeepSeek HTTP ${res.status}`;
      const err = new Error(msg);
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }

    const choiceMsg = data.choices?.[0]?.message;
    const promptTokens = data.usage?.prompt_tokens || 350;
    const completionTokens = data.usage?.completion_tokens || 250;
    const totalTokens = data.usage?.total_tokens || promptTokens + completionTokens;
    const price = DEEPSEEK_PRICING[model] || DEEPSEEK_PRICING['deepseek-chat'];

    const toolCalls = choiceMsg?.tool_calls?.map((tc) => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(tc.function.arguments || '{}');
      } catch {
        parsed = {};
      }
      return { id: tc.id, name: tc.function.name, arguments: parsed };
    });

    return {
      content: choiceMsg?.content || '',
      reasoningContent: choiceMsg?.reasoning_content,
      toolCalls,
      providerUsed: 'deepseek',
      modelUsed: model,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
        costUsd: promptTokens * price.input + completionTokens * price.output,
        cached: false,
      },
    };
  }
}
