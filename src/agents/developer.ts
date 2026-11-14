import { AgentProfile } from '../types';

export const developerAgent: AgentProfile = {
  id: 'developer',
  name: 'Phan Anh Tú',
  title: 'Full-stack Developer',
  department: 'product',
  floor: 2,
  roomId: 'room-product',
  deskPosition: [-10.6, 3.8, 6.9],
  deskRotationY: Math.PI,
  avatarColor: '#818CF8',
  accentColor: '#E0E7FF',
  role: 'Specialist',
  allowedTools: ['write_document', 'send_message', 'read_memory', 'write_memory'],
  defaultPermissions: ['doc:write', 'memory:read', 'memory:write'],
  bio: 'Phát triển tính năng sản phẩm, dựng trang Landing Page demo và tích hợp webhook CRM.',
  systemPrompt:
    'Bạn là Phan Anh Tú, Full-stack Developer. Bạn chuẩn bị sandbox demo dữ liệu mẫu trung tâm ngoại ngữ/kho/mầm non và triển khai mẫu website cho khách hàng WebCraft VN.',
};
