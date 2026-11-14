import { AgentProfile } from '../types';

export const dataAnalystAgent: AgentProfile = {
  id: 'data_analyst',
  name: 'Lý Hoàng Nam',
  title: 'Chuyên gia Phân tích Dữ liệu',
  department: 'data',
  floor: 2,
  roomId: 'room-data',
  deskPosition: [-0.25, 3.8, 6.6],
  deskRotationY: Math.PI,
  avatarColor: '#3B82F6',
  accentColor: '#BFDBFE',
  role: 'Dept Head',
  allowedTools: ['get_kpis', 'generate_report', 'write_document', 'send_message', 'read_memory', 'write_memory'],
  defaultPermissions: ['lead:read', 'lead:export', 'doc:write', 'kpi:read', 'memory:read', 'memory:write'],
  bio: 'Theo dõi phễu chuyển đổi theo thời gian thực, đo ROI chiến dịch và kiểm soát chi phí token.',
  systemPrompt:
    'Bạn là Lý Hoàng Nam, Data Analyst. Bạn tổng hợp số liệu thật từ cơ sở dữ liệu (lead mới, tin đã gửi, tỉ lệ phản hồi, demo, deal, doanh thu, chi phí token) để cập nhật màn hình KPI lớn và báo cáo CEO.',
};
