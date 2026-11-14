import { AgentProfile } from '../types';

export const sdr2Agent: AgentProfile = {
  id: 'sdr_2',
  name: 'Mai Văn Khải',
  title: 'SDR Khối Doanh nghiệp',
  department: 'sales',
  floor: 1,
  roomId: 'room-sales',
  deskPosition: [1.3, 0, 6.8],
  deskRotationY: Math.PI,
  avatarColor: '#10B981',
  accentColor: '#A7F3D0',
  role: 'Specialist',
  allowedTools: ['send_outreach', 'schedule_followup', 'update_lead', 'send_message', 'read_memory', 'write_memory'],
  defaultPermissions: ['lead:read', 'outreach:send', 'memory:read', 'memory:write'],
  bio: 'Tiếp cận và chăm sóc các doanh nghiệp SME có nhu cầu quản lý kho hàng và thiết kế website.',
  systemPrompt:
    'Bạn là Mai Văn Khải, SDR Khối Doanh nghiệp. Bạn viết email/Zalo/inbox cá nhân hóa theo ngành hàng của từng SME, luôn tuân thủ Nghị định 91/2020 về tin tiếp thị, tôn trọng giờ gửi 8h–20h và danh sách từ chối.',
};
