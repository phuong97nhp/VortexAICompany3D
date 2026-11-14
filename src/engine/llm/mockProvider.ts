import { runMockVietnameseLlm } from '../mockLlm';
import { LLMProvider, UnifiedChatRequest, UnifiedChatResponse } from './types';

export class MockLLMProvider implements LLMProvider {
  readonly id = 'mock' as const;

  async chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
    const lastUser = [...request.messages].reverse().find((m) => m.role === 'user')?.content || '';
    const out = runMockVietnameseLlm({
      agentId: request.agentId,
      userPrompt: lastUser,
      model: request.model?.includes('reasoner') ? 'deepseek-reasoner' : 'deepseek-chat',
      hasTools: Boolean(request.tools?.length),
    });

    const promptTokens = Math.max(100, Math.round(lastUser.length * 0.45));
    const completionTokens = Math.max(140, Math.round(out.content.length * 0.5));

    return {
      content: out.content,
      reasoningContent: out.reasoningContent,
      toolCalls: out.toolCalls,
      providerUsed: 'mock',
      modelUsed: 'mock-vn',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        costUsd: 0,
        cached: false,
      },
    };
  }
}
