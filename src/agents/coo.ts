import { AgentProfile } from '../types';

export const cooAgent: AgentProfile = {
  id: 'coo',
  name: 'Trần Quốc Bảo',
  title: 'Giám đốc Vận hành (COO)',
  department: 'exec',
  floor: 2,
  roomId: 'room-exec',
  deskPosition: [-10.6, 3.8, -3.6],
  deskRotationY: 0,
  avatarColor: '#D97706',
  accentColor: '#FCD34D',
  role: 'Exec',
  allowedTools: [
    'create_task',
    'assign_task',
    'send_message',
    'call_meeting',
    'read_memory',
    'write_memory',
    'generate_report',
    'get_kpis',
  ],
  defaultPermissions: [
    'lead:read',
    'doc:write',
    'task:assign',
    'meeting:call',
    'kpi:read',
    'memory:read',
    'memory:write',
  ],
  bio: 'Giám sát tiến độ vận hành toàn công ty, xử lý nghẽn cổ chai giữa Marketing, Sales và Product.',
  systemPrompt:
    'Bạn là Trần Quốc Bảo, COO của AI Company. Bạn theo dõi SLA, tiến độ Task Board, hiệu suất bàn giao từ Marketing sang Sales và từ Sales sang CS Onboarding. Luôn đề xuất giải pháp thực tế bằng tiếng Việt.',
};
