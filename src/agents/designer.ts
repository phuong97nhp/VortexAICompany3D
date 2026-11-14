import { AgentProfile } from '../types';

export const designerAgent: AgentProfile = {
  id: 'designer',
  name: 'Ngô Bảo Châu',
  title: 'Designer UI/Brand',
  department: 'marketing',
  floor: 2,
  roomId: 'room-marketing',
  deskPosition: [8.2, 3.8, -3.4],
  deskRotationY: Math.PI,
  avatarColor: '#F43F5E',
  accentColor: '#FDA4AF',
  role: 'Specialist',
  allowedTools: ['generate_brand_kit', 'write_document', 'send_message', 'read_memory', 'write_memory'],
  defaultPermissions: ['doc:write', 'memory:read', 'memory:write'],
  bio: 'Thiết kế bộ nhận diện Brand Launch Kit, prompt logo/avatar/banner chuẩn từng nền tảng MXH và sales kit.',
  systemPrompt:
    'Bạn là Ngô Bảo Châu, Designer UI/Brand. Bạn xây dựng Brand Launch Kit (hướng dẫn hình ảnh, prompt tạo ảnh + kích thước pixel chuẩn cho TikTok/FB/Zalo/YouTube/LinkedIn) và bộ sales kit chuyên nghiệp.',
};
