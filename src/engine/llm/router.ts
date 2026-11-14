import { CompanySettings, ProviderId, TokenUsageRecord } from '../../types';
import { DeepSeekLLMProvider } from './deepseekProvider';
import { GeminiLLMProvider } from './geminiProvider';
import { LocalLLMProvider } from './localProvider';
import { MockLLMProvider } from './mockProvider';
import { getTaskGroupForAgent } from './presets';
import {
  LLMProvider,
  LlmChatMessage,
  LlmToolDefinition,
  ProviderHealthStatus,
  UnifiedChatRequest,
  UnifiedChatResponse,
} from './types';

interface CacheEntry {
  expiresAt: number;
  response: UnifiedChatResponse;
}

export class LLMRouter implements LLMProvider {
  readonly id = 'gemini' as const;

  private cache = new Map<string, CacheEntry>();
  private activeCount = 0;
  private readonly maxConcurrency = 2;
  private queue: Array<() => void> = [];
  private requestTimestamps: number[] = [];
  private readonly maxPerMinute = 36;
  private cachedHealth: ProviderHealthStatus | null = null;

  private getSettingsFn?: () => CompanySettings;
  private getTodayTokensByProviderFn?: (provider: ProviderId) => number;
  private onUsageCallback?: (rec: TokenUsageRecord) => void;
  private onErrorBannerFn?: (msg: string) => void;
  private onFallbackNoticeFn?: (msg: string) => void;

  private gemini: GeminiLLMProvider;
  private deepseek: DeepSeekLLMProvider;
  private local: LocalLLMProvider;
  private mock: MockLLMProvider;

  constructor() {
    this.gemini = new GeminiLLMProvider(() => ({
      manualApiKey: this.getSettingsFn?.().geminiApiKey,
    }));
    this.deepseek = new DeepSeekLLMProvider(() => {
      const s = this.getSettingsFn?.();
      return {
        mode: s?.deepseekMode || 'proxy',
        apiKey: s?.deepseekApiKey || '',
        hasServerKey: Boolean(this.cachedHealth?.hasDeepSeekEnvKey),
        hasServerProxy: this.cachedHealth?.mode === 'proxy',
      };
    });
    this.local = new LocalLLMProvider(() => {
      const s = this.getSettingsFn?.();
      return {
        baseUrl: s?.localBaseUrl || 'http://localhost:11434/v1',
        model: s?.localModel || 'qwen2.5:7b',
        apiKey: s?.localApiKey || '',
        useWorkerProxy: Boolean(s?.localUseWorkerProxy),
        hasExpressProxy: this.cachedHealth?.mode === 'proxy',
      };
    });
    this.mock = new MockLLMProvider();
  }

  configure(opts: {
    getSettings: () => CompanySettings;
    getTodayTokensByProvider: (provider: ProviderId) => number;
    onUsage: (rec: TokenUsageRecord) => void;
    onErrorBanner: (msg: string) => void;
    onFallbackNotice?: (msg: string) => void;
  }) {
    this.getSettingsFn = opts.getSettings;
    this.getTodayTokensByProviderFn = opts.getTodayTokensByProvider;
    this.onUsageCallback = opts.onUsage;
    this.onErrorBannerFn = opts.onErrorBanner;
    this.onFallbackNoticeFn = opts.onFallbackNotice;
  }

  async detectEnvironment(): Promise<ProviderHealthStatus> {
    if (this.cachedHealth) return this.cachedHealth;
    try {
      const res = await fetch('/api/health', { method: 'GET' });
      if (res.ok) {
        const data = (await res.json()) as Partial<ProviderHealthStatus> & { hasDeepSeekKey?: boolean };
        this.cachedHealth = {
          mode: 'proxy',
          hasGeminiEnvKey: Boolean(data.hasGeminiEnvKey),
          hasDeepSeekEnvKey: Boolean(data.hasDeepSeekEnvKey ?? data.hasDeepSeekKey),
          hasSearchKey: Boolean(data.hasSearchKey),
          dryRunDefault: data.dryRunDefault !== false,
        };
        return this.cachedHealth;
      }
    } catch {
      // Browser-only static hosting
    }
    this.cachedHealth = {
      mode: 'browser',
      hasGeminiEnvKey: false,
      hasDeepSeekEnvKey: false,
      hasSearchKey: false,
      dryRunDefault: true,
    };
    return this.cachedHealth;
  }

  clearHealthCache() {
    this.cachedHealth = null;
  }

  private async acquireSlot(): Promise<void> {
    while (this.activeCount >= this.maxConcurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < 60_000);
    if (this.requestTimestamps.length >= this.maxPerMinute) {
      const waitMs = 60_000 - (now - this.requestTimestamps[0]) + 150;
      await new Promise((r) => setTimeout(r, waitMs));
    }
    this.requestTimestamps.push(Date.now());
    this.activeCount++;
  }

  private releaseSlot() {
    this.activeCount = Math.max(0, this.activeCount - 1);
    const next = this.queue.shift();
    if (next) next();
  }

  private getProviderInstance(id: ProviderId): LLMProvider {
    switch (id) {
      case 'gemini':
        return this.gemini;
      case 'deepseek':
        return this.deepseek;
      case 'local':
        return this.local;
      case 'mock':
      default:
        return this.mock;
    }
  }

  private isProviderConfigured(id: ProviderId, settings: CompanySettings, health: ProviderHealthStatus): boolean {
    if (id === 'mock') return true;
    if (id === 'gemini') {
      return (health.mode === 'proxy' && health.hasGeminiEnvKey) || Boolean(settings.geminiApiKey?.trim());
    }
    if (id === 'deepseek') {
      return (health.mode === 'proxy' && health.hasDeepSeekEnvKey) || Boolean(settings.deepseekApiKey?.trim());
    }
    if (id === 'local') {
      return Boolean(settings.localBaseUrl?.trim() && settings.localModel?.trim());
    }
    return false;
  }

  private resolveTargetForRequest(
    request: UnifiedChatRequest,
    settings: CompanySettings
  ): { provider: ProviderId; model: string } {
    if (settings.primaryProvider === 'mock') {
      return { provider: 'mock', model: 'mock-vn' };
    }

    const group = getTaskGroupForAgent(request.agentId, request.isMemorySummary);
    const route = settings.roleRoutes?.find((r) => r.group === group);
    if (route) {
      return {
        provider: route.provider,
        model: request.model || route.model,
      };
    }

    // Fallback to primaryProvider defaults
    const provider = settings.primaryProvider || 'gemini';
    const isLeadership = group === 'leadership';
    const defaultModel =
      provider === 'gemini'
        ? isLeadership
          ? 'gemini-2.5-pro'
          : 'gemini-2.5-flash'
        : provider === 'deepseek'
        ? isLeadership && !request.tools?.length
          ? 'deepseek-reasoner'
          : 'deepseek-chat'
        : provider === 'local'
        ? settings.localModel || 'qwen2.5:7b'
        : 'mock-vn';

    return { provider, model: request.model || defaultModel };
  }

  private defaultModelForProvider(provider: ProviderId, agentId: string, settings: CompanySettings, hasTools: boolean): string {
    const isLeadership = getTaskGroupForAgent(agentId) === 'leadership';
    if (provider === 'gemini') return isLeadership ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    if (provider === 'deepseek') return isLeadership && !hasTools ? 'deepseek-reasoner' : 'deepseek-chat';
    if (provider === 'local') return settings.localModel || 'qwen2.5:7b';
    return 'mock-vn';
  }

  private async executeWithRetry(
    providerId: ProviderId,
    request: UnifiedChatRequest
  ): Promise<UnifiedChatResponse> {
    const provider = this.getProviderInstance(providerId);
    if (providerId === 'mock') {
      return provider.chat(request);
    }

    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await provider.chat(request);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const status = (err as Error & { status?: number })?.status;
        const retryable = status === 429 || (status && status >= 500) || /network|timeout|fetch/i.test(lastError.message);
        if (!retryable || attempt === maxRetries) {
          throw lastError;
        }
        const backoff = 700 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }

    throw lastError || new Error(`Provider ${providerId} lỗi không xác định`);
  }

  private buildCacheKey(provider: ProviderId, model: string, req: UnifiedChatRequest): string {
    const tail = req.messages.slice(-3).map((m) => `${m.role}:${m.content}`).join('|');
    return `${provider}::${model}::${req.agentId}::${tail}`;
  }

  private recordUsage(request: UnifiedChatRequest, resp: UnifiedChatResponse) {
    if (!this.onUsageCallback) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    this.onUsageCallback({
      id: `tok_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      dateKey: todayKey,
      agentId: request.agentId,
      department: request.department,
      provider: resp.providerUsed,
      model: resp.modelUsed,
      promptTokens: resp.usage.promptTokens,
      completionTokens: resp.usage.completionTokens,
      totalTokens: resp.usage.totalTokens,
      costUsd: resp.usage.costUsd,
      cached: resp.usage.cached,
      timestamp: Date.now(),
    });
  }

  async chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
    const settings = this.getSettingsFn?.();
    if (settings?.killSwitchActive) {
      throw new Error('KILL SWITCH đang bật: Đã chặn mọi cuộc gọi LLM.');
    }

    const health = await this.detectEnvironment();
    const resolved = settings
      ? this.resolveTargetForRequest(request, settings)
      : { provider: 'mock' as ProviderId, model: 'mock-vn' };

    // Build fallback chain: [primary/route -> fallbackProvider -> mock]
    const candidates: Array<{ provider: ProviderId; model: string; reason?: string }> = [];
    const seen = new Set<ProviderId>();

    const tryPushCandidate = (prov: ProviderId, model: string, reason?: string) => {
      if (seen.has(prov)) return;
      seen.add(prov);
      candidates.push({ provider: prov, model, reason });
    };

    tryPushCandidate(resolved.provider, resolved.model);
    if (settings?.fallbackProvider && settings.fallbackProvider !== resolved.provider) {
      tryPushCandidate(
        settings.fallbackProvider,
        this.defaultModelForProvider(settings.fallbackProvider, request.agentId, settings, Boolean(request.tools?.length))
      );
    }
    tryPushCandidate('mock', 'mock-vn');

    // Prompt cache check on primary target
    const primaryCacheKey = this.buildCacheKey(candidates[0].provider, candidates[0].model, request);
    if (!request.skipCache) {
      const hit = this.cache.get(primaryCacheKey);
      if (hit && hit.expiresAt > Date.now()) {
        const cachedResp: UnifiedChatResponse = {
          ...hit.response,
          usage: { ...hit.response.usage, cached: true, costUsd: 0 },
        };
        this.recordUsage(request, cachedResp);
        return cachedResp;
      }
    }

    await this.acquireSlot();
    try {
      const failureReasons: string[] = [];

      for (let idx = 0; idx < candidates.length; idx++) {
        const cand = candidates[idx];

        // Check configuration
        if (settings && cand.provider !== 'mock' && !this.isProviderConfigured(cand.provider, settings, health)) {
          failureReasons.push(`${cand.provider} chưa có key/cấu hình`);
          continue;
        }

        // Check per-provider daily token budget
        if (settings && cand.provider !== 'mock') {
          const used = this.getTodayTokensByProviderFn?.(cand.provider) || 0;
          const limit = settings.providerBudgets?.[cand.provider] ?? settings.dailyTokenBudget ?? 500000;
          if (used >= limit) {
            const budgetMsg = `Provider "${cand.provider}" đã chạm ngân sách ngày (${used.toLocaleString('vi-VN')}/${limit.toLocaleString('vi-VN')} tokens).`;
            failureReasons.push(budgetMsg);
            continue;
          }
        }

        try {
          const resp = await this.executeWithRetry(cand.provider, {
            ...request,
            model: cand.model,
          });

          // If failover occurred from non-mock primary (and not simply unconfigured mock mode)
          if (idx > 0 && candidates[0].provider !== 'mock') {
            const reasonSummary = failureReasons.join('; ');
            // Only alert noisily if primary WAS configured or fell back to another real provider;
            // if user hasn't set any keys at all, keep notice gentle on first failover
            const notice = `Đã tự động chuyển dự phòng từ [${candidates[0].provider}] → [${cand.provider}] (${reasonSummary}).`;
            resp.fallbackNotice = notice;
            this.onErrorBannerFn?.(notice);
            this.onFallbackNoticeFn?.(notice);
          }

          const ttl = cand.provider === 'mock' ? 60_000 : 120_000;
          this.cache.set(primaryCacheKey, { expiresAt: Date.now() + ttl, response: resp });
          this.recordUsage(request, resp);
          return resp;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          failureReasons.push(`${cand.provider}: ${errMsg}`);
        }
      }

      // Guaranteed mock fallback
      const mockResp = await this.mock.chat(request);
      this.recordUsage(request, mockResp);
      return mockResp;
    } finally {
      this.releaseSlot();
    }
  }
}

export const llmRouter = new LLMRouter();

// Clean facade preserving easy imports across engine modules
export const llmClient = {
  configure: llmRouter.configure.bind(llmRouter),
  detectEnvironment: llmRouter.detectEnvironment.bind(llmRouter),
  clearHealthCache: llmRouter.clearHealthCache.bind(llmRouter),
  chat: llmRouter.chat.bind(llmRouter),
};

export type { LlmChatMessage, LlmToolDefinition, UnifiedChatRequest, UnifiedChatResponse };
