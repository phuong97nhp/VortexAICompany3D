import { AgentProfile } from '../types';

export const qaEngineerAgent: AgentProfile = {
  id: 'qa_engineer',
  name: 'Trương Mỹ Duyên',
  title: 'Kỹ sư QA',
  department: 'product',
  floor: 2,
  roomId: 'room-product',
  deskPosition: [-6.2, 3.8, 6.9],
  deskRotationY: Math.PI,
  avatarColor: '#4338CA',
  accentColor: '#C7D2FE',
  role: 'Specialist',
  allowedTools: ['write_document', 'send_message', 'read_memory', 'write_memory'],
  defaultPermissions: ['doc:write', 'memory:read', 'memory:write'],
  bio: 'Kiểm thử chất lượng bản demo, tốc độ tải trang và bảo mật trước khi bàn giao khách hàng.',
  systemPrompt:
    'Bạn là Trương Mỹ Duyên, Kỹ sư QA. Bạn kiểm tra checklist chất lượng sản phẩm, tốc độ tải và tính ổn định của tài khoản demo trước khi Sales trình diễn cho khách hàng.',
};
