import { RoleRouteEntry, RoutingPresetId, RoutingTaskGroup } from '../../types';
import { getLiveAgentById } from '../liveRegistry';

export function getTaskGroupForAgent(agentId: string, isMemorySummary?: boolean): RoutingTaskGroup {
  if (isMemorySummary) return 'memory_summary';
  const liveAgent = getLiveAgentById(agentId);
  if (liveAgent) {
    if (liveAgent.role === 'CEO' || liveAgent.role === 'Exec' || liveAgent.role === 'Dept Head') {
      return 'leadership';
    }
    if (liveAgent.department === 'marketing') return 'marketing';
    if (liveAgent.department === 'sales') {
      if (liveAgent.id.includes('sdr') || liveAgent.id.includes('lead') || liveAgent.id.includes('provisioning')) {
        return 'sales_sdr';
      }
      return 'sales_closing';
    }
    if (liveAgent.department === 'backoffice' || liveAgent.department === 'data') {
      return 'sales_closing';
    }
    return 'product_cs';
  }

  if (['secretary', 'coo', 'cmo', 'sales_director', 'tech_lead'].includes(agentId)) {
    return 'leadership';
  }
  if (['market_research', 'content_writer', 'seo_specialist', 'social_media', 'ads_specialist', 'designer'].includes(agentId)) {
    return 'marketing';
  }
  if (['lead_hunter_edu', 'lead_hunter_smb', 'account_provisioning', 'sdr_1', 'sdr_2'].includes(agentId)) {
    return 'sales_sdr';
  }
  if (['account_executive', 'pricing_proposal', 'cfo', 'legal', 'hr', 'data_analyst'].includes(agentId)) {
    return 'sales_closing';
  }
  return 'product_cs';
}

export function buildRoutingPreset(preset: RoutingPresetId, localModel = 'qwen2.5:7b'): RoleRouteEntry[] {
  switch (preset) {
    case 'economy':
      return [
        { group: 'leadership', label: 'Lãnh đạo (Thư ký, CMO, Sales Dir, Tech Lead)', provider: 'gemini', model: 'gemini-2.5-flash' },
        { group: 'marketing', label: 'Marketing (Research, Content, SEO, Ads)', provider: 'gemini', model: 'gemini-2.5-flash' },
        { group: 'sales_sdr', label: 'Sales Lead Hunter & SDR', provider: 'local', model: localModel },
        { group: 'sales_closing', label: 'AE, Pricing, CFO, Data', provider: 'gemini', model: 'gemini-2.5-flash' },
        { group: 'product_cs', label: 'Product & Customer Success', provider: 'gemini', model: 'gemini-2.5-flash' },
        { group: 'memory_summary', label: 'Tóm tắt bộ nhớ Agent', provider: 'local', model: localModel },
      ];
    case 'quality':
      return [
        { group: 'leadership', label: 'Lãnh đạo (Thư ký, CMO, Sales Dir, Tech Lead)', provider: 'gemini', model: 'gemini-2.5-pro' },
        { group: 'marketing', label: 'Marketing (Research, Content, SEO, Ads)', provider: 'gemini', model: 'gemini-2.5-pro' },
        { group: 'sales_sdr', label: 'Sales Lead Hunter & SDR', provider: 'deepseek', model: 'deepseek-chat' },
        { group: 'sales_closing', label: 'AE, Pricing, CFO, Data', provider: 'deepseek', model: 'deepseek-reasoner' },
        { group: 'product_cs', label: 'Product & Customer Success', provider: 'gemini', model: 'gemini-2.5-flash' },
        { group: 'memory_summary', label: 'Tóm tắt bộ nhớ Agent', provider: 'gemini', model: 'gemini-2.5-flash' },
      ];
    case 'offline':
      return [
        { group: 'leadership', label: 'Lãnh đạo (Thư ký, CMO, Sales Dir, Tech Lead)', provider: 'local', model: localModel },
        { group: 'marketing', label: 'Marketing (Research, Content, SEO, Ads)', provider: 'local', model: localModel },
        { group: 'sales_sdr', label: 'Sales Lead Hunter & SDR', provider: 'local', model: localModel },
        { group: 'sales_closing', label: 'AE, Pricing, CFO, Data', provider: 'local', model: localModel },
        { group: 'product_cs', label: 'Product & Customer Success', provider: 'local', model: localModel },
        { group: 'memory_summary', label: 'Tóm tắt bộ nhớ Agent', provider: 'local', model: localModel },
      ];
    case 'balanced':
    default:
      return [
        { group: 'leadership', label: 'Lãnh đạo (Thư ký, CMO, Sales Dir, Tech Lead)', provider: 'gemini', model: 'gemini-2.5-pro' },
        { group: 'marketing', label: 'Marketing (Research, Content, SEO, Ads)', provider: 'gemini', model: 'gemini-2.5-flash' },
        { group: 'sales_sdr', label: 'Sales Lead Hunter & SDR', provider: 'gemini', model: 'gemini-2.5-flash' },
        { group: 'sales_closing', label: 'AE, Pricing, CFO, Data', provider: 'gemini', model: 'gemini-2.5-flash' },
        { group: 'product_cs', label: 'Product & Customer Success', provider: 'gemini', model: 'gemini-2.5-flash' },
        { group: 'memory_summary', label: 'Tóm tắt bộ nhớ Agent', provider: 'gemini', model: 'gemini-2.5-flash' },
      ];
  }
}

export const ROUTING_PRESET_LABELS: Record<RoutingPresetId, string> = {
  balanced: 'Cân bằng (Mặc định AI Studio)',
  economy: 'Tiết kiệm',
  quality: 'Chất lượng cao',
  offline: 'Chạy offline hoàn toàn (Local)',
};
