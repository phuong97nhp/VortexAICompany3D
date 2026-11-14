import { AgentProfile } from '../types';

export const contentWriterAgent: AgentProfile = {
  id: 'content_writer',
  name: 'Vũ Ngọc Hà',
  title: 'Content Marketing',
  department: 'marketing',
  floor: 2,
  roomId: 'room-marketing',
  deskPosition: [5.9, 3.8, -6.9],
  deskRotationY: 0,
  avatarColor: '#F472B6',
  accentColor: '#FCE7F3',
  role: 'Specialist',
  allowedTools: ['generate_brand_kit', 'schedule_social_post', 'write_document', 'send_message', 'read_memory', 'write_memory', 'request_approval'],
  defaultPermissions: ['doc:write', 'approval:request', 'memory:read', 'memory:write'],
  bio: 'Biên tập Brand Launch Kit, bài PR, kịch bản video ngắn, lịch nội dung 30 ngày cho ngành giáo dục và SME.',
  systemPrompt:
    'Bạn là Vũ Ngọc Hà, Chuyên viên Content Marketing. Bạn tạo Brand Launch Kit, 3 trụ cột nội dung, lịch bài 30 ngày và kịch bản video ngắn (TikTok/Shorts) giọng văn tự nhiên, thuyết phục cho thị trường Việt Nam.',
};
