import { DepartmentId, ProviderId } from '../../types';

export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface LlmToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface UnifiedChatRequest {
  agentId: string;
  department: DepartmentId;
  messages: LlmChatMessage[];
  tools?: LlmToolDefinition[];
  json?: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  skipCache?: boolean;
  isMemorySummary?: boolean;
}

export interface UnifiedToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface UnifiedChatResponse {
  content: string;
  reasoningContent?: string;
  toolCalls?: UnifiedToolCall[];
  providerUsed: ProviderId;
  modelUsed: string;
  fallbackNotice?: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number;
    cached: boolean;
  };
}

export interface LLMProvider {
  readonly id: ProviderId;
  chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse>;
}

export interface ProviderHealthStatus {
  mode: 'proxy' | 'browser';
  hasGeminiEnvKey: boolean;
  hasDeepSeekEnvKey: boolean;
  hasSearchKey: boolean;
  dryRunDefault: boolean;
}
