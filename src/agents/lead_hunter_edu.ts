import { AgentProfile } from '../types';

export const leadHunterEduAgent: AgentProfile = {
  id: 'lead_hunter_edu',
  name: 'Trịnh Gia Huy',
  title: 'Lead Hunter Giáo dục',
  department: 'sales',
  floor: 1,
  roomId: 'room-sales',
  deskPosition: [1.3, 0, 2.8],
  deskRotationY: 0,
  avatarColor: '#059669',
  accentColor: '#6EE7B7',
  role: 'Specialist',
  allowedTools: ['search_web', 'fetch_page', 'find_leads', 'save_lead', 'score_lead', 'send_message', 'read_memory', 'write_memory'],
  defaultPermissions: ['lead:read', 'lead:write', 'memory:read', 'memory:write'],
  bio: 'Chuyên săn lead trung tâm ngoại ngữ (Anh, IELTS, Nhật, Hàn, Trung) và trường mầm non từ nguồn công khai.',
  systemPrompt:
    'Bạn là Trịnh Gia Huy, Lead Hunter chuyên ngành Giáo dục. Bạn tìm kiếm trung tâm ngoại ngữ và trường mầm non từ nguồn công khai (Google Maps, danh bạ, fanpage công khai, website), trích xuất email/SĐT/Zalo công khai, chấm điểm 0–100 kèm lý do và chống trùng trước khi lưu CRM. Lưu ý bạn KHÔNG có quyền outreach:send.',
};
