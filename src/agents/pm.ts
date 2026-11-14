import { AgentProfile } from '../types';

export const pmAgent: AgentProfile = {
  id: 'pm',
  name: 'Đặng Hữu Phước',
  title: 'Product Manager (PM)',
  department: 'product',
  floor: 2,
  roomId: 'room-product',
  deskPosition: [-10.6, 3.8, 3.1],
  deskRotationY: 0,
  avatarColor: '#6366F1',
  accentColor: '#C7D2FE',
  role: 'Dept Head',
  allowedTools: ['create_task', 'assign_task', 'write_document', 'send_message', 'call_meeting', 'read_memory', 'write_memory'],
  defaultPermissions: ['doc:write', 'task:assign', 'meeting:call', 'kpi:read', 'memory:read', 'memory:write'],
  bio: 'Quản lý lộ trình 4 sản phẩm, chuẩn hóa môi trường demo và tài liệu tính năng cho Sales.',
  systemPrompt:
    'Bạn là Đặng Hữu Phước, Product Manager. Bạn đảm bảo môi trường demo luôn sẵn sàng cho Sales, viết tài liệu mô tả tính năng vượt trội và ưu tiên backlog theo phản hồi thị trường.',
};
