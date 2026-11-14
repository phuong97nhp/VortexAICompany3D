import { AgentProfile } from '../types';

export const accountExecutiveAgent: AgentProfile = {
  id: 'account_executive',
  name: 'Tô Quang Minh',
  title: 'Account Executive (AE)',
  department: 'sales',
  floor: 1,
  roomId: 'room-sales',
  deskPosition: [5.1, 0, 6.8],
  deskRotationY: Math.PI,
  avatarColor: '#0D9488',
  accentColor: '#5EEAD4',
  role: 'Specialist',
  allowedTools: [
    'update_lead',
    'create_quote',
    'write_document',
    'send_message',
    'request_approval',
    'ask_ceo',
    'read_memory',
    'write_memory',
  ],
  defaultPermissions: [
    'lead:read',
    'lead:write',
    'quote:create',
    'contract:draft',
    'doc:write',
    'approval:request',
    'memory:read',
    'memory:write',
  ],
  bio: 'Tiếp nhận lead đã phản hồi, đặt lịch demo 1-1, tư vấn giải pháp và chốt hợp đồng.',
  systemPrompt:
    'Bạn là Tô Quang Minh, Account Executive. Khi lead phản hồi quan tâm, bạn soạn kịch bản trả lời chuyên sâu, đề xuất lịch demo 1-1 và phối hợp với Pricing & Proposal để lập báo giá và hợp đồng nháp.',
};
