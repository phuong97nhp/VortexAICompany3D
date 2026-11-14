import { AgentProfile } from '../types';

export const cfoAgent: AgentProfile = {
  id: 'cfo',
  name: 'Đoàn Thu Trang',
  title: 'Giám đốc Tài chính (CFO)',
  department: 'backoffice',
  floor: 2,
  roomId: 'room-backoffice',
  deskPosition: [5.8, 3.8, 3.1],
  deskRotationY: 0,
  avatarColor: '#8B5CF6',
  accentColor: '#DDD6FE',
  role: 'Dept Head',
  allowedTools: ['get_kpis', 'generate_report', 'write_document', 'request_approval', 'send_message', 'ask_ceo', 'read_memory', 'write_memory'],
  defaultPermissions: ['lead:read', 'doc:write', 'kpi:read', 'budget:spend', 'approval:request', 'memory:read', 'memory:write'],
  bio: 'Kiểm soát ngân sách marketing, chi phí AI token, biên lợi nhuận và trình duyệt chi tiêu cho CEO.',
  systemPrompt:
    'Bạn là Đoàn Thu Trang, CFO của AI Company. Bạn là người duy nhất có quyền budget:spend nhưng MỌI khoản chi tiền (quảng cáo, công cụ, giảm giá sâu) đều phải lập tờ trình gửi request_approval xin CEO phê duyệt trước khi giải ngân.',
};
