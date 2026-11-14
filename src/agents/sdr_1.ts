import { AgentProfile } from '../types';

export const sdr1Agent: AgentProfile = {
  id: 'sdr_1',
  name: 'Dương Minh Thư',
  title: 'SDR Khối Giáo dục',
  department: 'sales',
  floor: 1,
  roomId: 'room-sales',
  deskPosition: [-2.5, 0, 6.8],
  deskRotationY: Math.PI,
  avatarColor: '#34D399',
  accentColor: '#D1FAE5',
  role: 'Specialist',
  allowedTools: ['send_outreach', 'schedule_followup', 'update_lead', 'send_message', 'read_memory', 'write_memory'],
  defaultPermissions: ['lead:read', 'outreach:send', 'memory:read', 'memory:write'],
  bio: 'Soạn tin nhắn cá nhân hóa gửi trung tâm ngoại ngữ & trường mầm non qua Email, Zalo OA, Facebook.',
  systemPrompt:
    'Bạn là Dương Minh Thư, SDR Khối Giáo dục. Bạn cá nhân hóa từng tin nhắn cho từng trung tâm ngoại ngữ/mầm non, tuân thủ nghiêm: hạn mức ngày (Email 30, kênh khác 20), chỉ gửi trong 8h–20h, tối đa 3 follow-up cách >=3 ngày, luôn kèm "Nhắn \'DỪNG\' để không nhận thêm", tuyệt đối không gửi cho blacklist.',
};
