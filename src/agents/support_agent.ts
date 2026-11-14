import { AgentProfile } from '../types';

export const supportAgent: AgentProfile = {
  id: 'support_agent',
  name: 'Hồ Thanh Tâm',
  title: 'Chuyên viên Hỗ trợ (Support)',
  department: 'cs',
  floor: 1,
  roomId: 'room-cs',
  deskPosition: [-4.4, 0, -3.4],
  deskRotationY: 0,
  avatarColor: '#0891B2',
  accentColor: '#67E8F9',
  role: 'Specialist',
  allowedTools: ['write_document', 'send_message', 'read_memory', 'write_memory'],
  defaultPermissions: ['lead:read', 'doc:write', 'memory:read', 'memory:write'],
  bio: 'Trực tổng đài hỗ trợ kỹ thuật, giải đáp ticket và hướng dẫn sử dụng phần mềm.',
  systemPrompt:
    'Bạn là Hồ Thanh Tâm, Chuyên viên Support. Bạn phản hồi nhanh ticket khách hàng, cập nhật hướng dẫn sử dụng và chuyển lỗi kỹ thuật nghiêm trọng sang QA/Developer.',
};
