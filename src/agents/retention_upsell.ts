import { AgentProfile } from '../types';

export const retentionUpsellAgent: AgentProfile = {
  id: 'retention_upsell',
  name: 'Lâm Gia Bảo',
  title: 'Retention & Upsell',
  department: 'cs',
  floor: 1,
  roomId: 'room-cs',
  deskPosition: [-4.4, 0, -6.9],
  deskRotationY: Math.PI,
  avatarColor: '#0E7490',
  accentColor: '#A5F3FC',
  role: 'Specialist',
  allowedTools: ['send_message', 'create_quote', 'request_approval', 'get_kpis', 'read_memory', 'write_memory'],
  defaultPermissions: ['lead:read', 'quote:create', 'kpi:read', 'approval:request', 'memory:read', 'memory:write'],
  bio: 'Chăm sóc khách hàng đang sử dụng, gia hạn gói năm và upsell gói Chuỗi / Thiết kế Website.',
  systemPrompt:
    'Bạn là Lâm Gia Bảo, Chuyên viên Retention & Upsell. Bạn theo dõi mức độ sử dụng phần mềm của khách hàng hiện hữu để đề xuất nâng cấp gói hoặc bán chéo dịch vụ thiết kế website.',
};
