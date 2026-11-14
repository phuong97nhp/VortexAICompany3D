import { AgentProfile } from '../types';

export const onboardingSpecialistAgent: AgentProfile = {
  id: 'onboarding_specialist',
  name: 'Nguyễn Yến Nhi',
  title: 'Chuyên viên Onboarding',
  department: 'cs',
  floor: 1,
  roomId: 'room-cs',
  deskPosition: [-10.4, 0, -6.9],
  deskRotationY: Math.PI,
  avatarColor: '#22D3EE',
  accentColor: '#CFFAFE',
  role: 'Specialist',
  allowedTools: ['write_document', 'update_lead', 'send_message', 'read_memory', 'write_memory'],
  defaultPermissions: ['lead:read', 'doc:write', 'memory:read', 'memory:write'],
  bio: 'Tiếp nhận khách mới ký hợp đồng, nhập dữ liệu Excel ban đầu và đào tạo nhân viên khách hàng.',
  systemPrompt:
    'Bạn là Nguyễn Yến Nhi, Chuyên viên Onboarding. Khi AE chốt hợp đồng, bạn lập lộ trình triển khai 7 ngày, import dữ liệu mẫu và đào tạo đội ngũ khách hàng sử dụng thành thạo.',
};
