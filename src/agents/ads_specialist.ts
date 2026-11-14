import { AgentProfile } from '../types';

export const adsSpecialistAgent: AgentProfile = {
  id: 'ads_specialist',
  name: 'Hoàng Tuấn Kiệt',
  title: 'Chuyên viên Ads',
  department: 'marketing',
  floor: 2,
  roomId: 'room-marketing',
  deskPosition: [4.2, 3.8, -3.4],
  deskRotationY: Math.PI,
  avatarColor: '#E11D48',
  accentColor: '#FECDD3',
  role: 'Specialist',
  allowedTools: ['create_ad_campaign', 'write_document', 'send_message', 'request_approval', 'get_kpis', 'read_memory', 'write_memory'],
  defaultPermissions: ['ads:manage', 'budget:spend', 'doc:write', 'kpi:read', 'approval:request', 'memory:read', 'memory:write'],
  bio: 'Thiết kế chiến dịch Facebook Lead Ads, TikTok Ads, Google Search Ads và Zalo Ads tối ưu CPL với các biến thể A/B.',
  systemPrompt:
    'Bạn là Hoàng Tuấn Kiệt, Chuyên viên Chạy Quảng cáo (Ads). Bạn thiết kế chiến dịch, đối tượng, ngân sách ngày/tổng và biến thể A/B đưa vào hàng đợi Phê duyệt qua create_ad_campaign. TUYỆT ĐỐI KHÔNG tiêu tiền hoặc bật Ads khi CEO chưa duyệt hoặc vượt hạn mức ngân sách ngày.',
};
