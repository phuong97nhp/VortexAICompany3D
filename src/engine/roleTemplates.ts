import { AGENTS } from '../agents';
import { getDefaultAppearance } from './characterAppearance';
import { DepartmentId, RoleTemplate, ToolName } from '../types';

const BASE_ROLE_TEMPLATES: RoleTemplate[] = AGENTS.map((a) => {
  const defApp = getDefaultAppearance(a);
  const extraPerms =
    a.id === 'cfo'
      ? (['expense:request', 'expense:review', 'expense:rule_manage', 'expense:mark_paid'] as const)
      : a.id === 'hr'
      ? (['hr:manage', 'expense:request'] as const)
      : (['expense:request'] as const);
  const extraTools: ToolName[] =
    a.id === 'cfo'
      ? ['request_expense', 'review_expense', 'pay_expense']
      : a.id === 'hr'
      ? ['hire_agent', 'request_expense']
      : ['request_expense'];

  return {
    id: `tpl_${a.id}`,
    title: a.title,
    department: a.department,
    role: a.role,
    usesReasoner: a.usesReasoner,
    defaultTools: Array.from(new Set([...a.allowedTools, ...extraTools])),
    defaultPermissions: Array.from(new Set([...a.defaultPermissions, ...extraPerms])),
    defaultTone:
      a.department === 'exec'
        ? 'Chuyên nghiệp, súc tích, bám sát mục tiêu'
        : a.department === 'cs'
        ? 'Nhẹ nhàng, tận tâm, phản hồi nhanh'
        : a.department === 'sales'
        ? 'Nhiệt huyết, thuyết phục, hướng kết quả'
        : 'Chủ động, rõ ràng, báo cáo bằng số liệu',
    promptTemplate: a.systemPrompt,
    bioTemplate: a.bio,
    gender: [
      'secretary', 'cmo', 'content_writer', 'social_media', 'designer', 'sdr_1',
      'pricing_proposal', 'support_agent', 'onboarding_specialist', 'cfo', 'hr', 'receptionist',
      'legal_researcher', 'compliance_reviewer', 'dpo_agent',
      'aff_scout_home', 'aff_audience', 'aff_review', 'aff_seo', 'aff_channel', 'aff_community', 'aff_compliance',
    ].includes(a.id)
      ? 'female'
      : 'male',
    hairStyle: defApp.hairStyle,
    outfitStyle: defApp.outfitStyle,
    accessory: defApp.accessory,
  };
});

const EXTRA_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'tpl_telesales',
    title: 'Chuyên viên Telesales',
    department: 'sales',
    role: 'Specialist',
    defaultTools: ['find_leads', 'update_lead', 'score_lead', 'send_outreach', 'schedule_followup', 'write_document', 'read_memory', 'write_memory', 'request_expense'],
    defaultPermissions: ['lead:read', 'lead:write', 'outreach:send', 'expense:request', 'memory:read', 'memory:write'],
    defaultTone: 'Tự tin, lịch sự, nắm bắt nhu cầu khách hàng nhanh trong 60 giây đầu',
    promptTemplate: 'Bạn là Chuyên viên Telesales thị trường Việt Nam. Nhiệm vụ: gọi/nhắn tiếp cận khách hàng tiềm năng, khai thác nỗi đau, đặt lịch demo cho Account Executive và cập nhật CRM đầy đủ.',
    bioTemplate: 'Chuyên viên Telesales khai thác nhu cầu qua điện thoại & Zalo, chốt lịch hẹn demo 1-1.',
    gender: 'female',
    hairStyle: 'ponytail',
    outfitStyle: 'shirt',
    accessory: 'headset',
  },
  {
    id: 'tpl_general_accountant',
    title: 'Kế toán Tổng hợp',
    department: 'backoffice',
    role: 'Dept Head',
    defaultTools: ['review_expense', 'pay_expense', 'request_expense', 'write_document', 'generate_report', 'get_kpis', 'ask_ceo', 'read_memory', 'write_memory'],
    defaultPermissions: ['expense:review', 'expense:rule_manage', 'expense:mark_paid', 'expense:request', 'kpi:read', 'doc:write', 'approval:request', 'memory:read', 'memory:write'],
    defaultTone: 'Cẩn trọng, minh bạch, kiểm tra kỹ chứng từ, ngân sách và chống trùng lặp',
    promptTemplate: 'Bạn là Kế toán Tổng hợp phụ trách kiểm tra tầng 1 mọi đề xuất chi phí, đối chiếu ngân sách tháng, phát hiện trùng lặp/bất thường >30%, đối soát hóa đơn chứng từ và đề xuất quy tắc tự duyệt an toàn.',
    bioTemplate: 'Thẩm định chứng từ tầng 1, quản lý ngân sách phòng ban, đối soát sổ chi phí & CAC.',
    gender: 'female',
    hairStyle: 'bun',
    outfitStyle: 'vest',
    accessory: 'glasses',
  },
  {
    id: 'tpl_video_editor',
    title: 'Quay dựng Video Ngắn (Reels/TikTok)',
    department: 'marketing',
    role: 'Specialist',
    defaultTools: ['write_document', 'schedule_social_post', 'generate_brand_kit', 'read_memory', 'write_memory', 'request_expense'],
    defaultPermissions: ['doc:write', 'expense:request', 'memory:read', 'memory:write'],
    defaultTone: 'Sáng tạo, bắt trend nhanh, tối ưu hook 3 giây đầu',
    promptTemplate: 'Bạn là Chuyên viên Quay dựng Video Ngắn (TikTok/YouTube Shorts/Reels). Nhiệm vụ: viết kịch bản phân cảnh 30-60s, hook thu hút, CTA chuyển đổi cao cho phần mềm giáo dục & SME.',
    bioTemplate: 'Sản xuất kịch bản & storyboard video ngắn TikTok/Shorts thu hút khách hàng mục tiêu.',
    gender: 'male',
    hairStyle: 'undercut',
    outfitStyle: 'hoodie',
    accessory: 'cap_hat' as never,
  },
  {
    id: 'tpl_preschool_care',
    title: 'Chuyên viên CSKH Mầm non',
    department: 'cs',
    role: 'Specialist',
    defaultTools: ['send_message', 'write_document', 'update_lead', 'read_memory', 'write_memory', 'request_expense'],
    defaultPermissions: ['lead:read', 'doc:write', 'expense:request', 'memory:read', 'memory:write'],
    defaultTone: 'Nhẹ nhàng, ấm áp, thấu hiểu tâm lý phụ huynh và cô giáo mầm non',
    promptTemplate: 'Bạn là Chuyên viên Chăm sóc Khách hàng Trường Mầm non. Nói chuyện nhẹ nhàng, tận tâm, hướng dẫn sử dụng nhật ký bé, thực đơn và điểm danh qua Zalo trong vòng 5 phút.',
    bioTemplate: 'Hỗ trợ ban giám hiệu & phụ huynh trường mầm non triển khai phần mềm nhanh chóng.',
    gender: 'female',
    hairStyle: 'long_wave',
    outfitStyle: 'casual',
    accessory: 'headset',
  },
  {
    id: 'tpl_fullstack_dev',
    title: 'Kỹ sư Full-stack',
    department: 'product',
    role: 'Specialist',
    defaultTools: ['write_document', 'create_task', 'get_kpis', 'read_memory', 'write_memory', 'request_expense'],
    defaultPermissions: ['doc:write', 'kpi:read', 'expense:request', 'memory:read', 'memory:write'],
    defaultTone: 'Logic, ngắn gọn, chú trọng hiệu năng và độ tin cậy',
    promptTemplate: 'Bạn là Kỹ sư Full-stack xây dựng và tối ưu các module phần mềm quản lý trung tâm, mầm non, kho hàng và website cho khách hàng.',
    bioTemplate: 'Phát triển tính năng, API tích hợp Zalo OA & sandbox demo.',
    gender: 'male',
    hairStyle: 'short_neat',
    outfitStyle: 'hoodie',
    accessory: 'glasses',
  },
  {
    id: 'tpl_legal_assistant',
    title: 'Trợ lý Pháp lý & Hợp đồng',
    department: 'backoffice',
    role: 'Specialist',
    defaultTools: ['write_document', 'create_quote', 'request_approval', 'read_memory', 'write_memory', 'request_expense'],
    defaultPermissions: ['contract:draft', 'doc:write', 'approval:request', 'expense:request', 'memory:read', 'memory:write'],
    defaultTone: 'Chặt chẽ, tuân thủ pháp luật Việt Nam & Nghị định bảo vệ dữ liệu',
    promptTemplate: 'Bạn là Trợ lý Pháp lý kiểm tra điều khoản hợp đồng SaaS, SLA, bảo mật dữ liệu cá nhân (NĐ 13/2023) và chống spam (NĐ 91/2020).',
    bioTemplate: 'Soạn thảo & rà soát hợp đồng, điều khoản SLA và tuân thủ pháp lý.',
    gender: 'female',
    hairStyle: 'bob',
    outfitStyle: 'vest',
    accessory: 'badge',
  },
];

// Normalize extra video editor accessory safely
EXTRA_ROLE_TEMPLATES[2].accessory = 'backpack';

export const ROLE_TEMPLATES: RoleTemplate[] = [...BASE_ROLE_TEMPLATES, ...EXTRA_ROLE_TEMPLATES];

const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];
const MIDDLE_MALE = ['Minh', 'Quốc', 'Gia', 'Hoàng', 'Hữu', 'Đức', 'Tuấn', 'Thanh', 'Văn', 'Anh'];
const FIRST_MALE = ['Huy', 'Long', 'Nam', 'Phước', 'Khánh', 'Bách', 'Vinh', 'Tùng', 'Dũng', 'Kiên', 'Hải', 'Thịnh'];
const MIDDLE_FEMALE = ['Minh', 'Thảo', 'Ngọc', 'Khánh', 'Kim', 'Thu', 'Thanh', 'Bảo', 'Phương', 'Lan'];
const FIRST_FEMALE = ['Anh', 'Lan', 'Hà', 'Linh', 'Vy', 'Ngân', 'Thư', 'Trang', 'Mai', 'Chi', 'Nhi', 'Quỳnh'];

export function generateVietnameseName(gender: 'male' | 'female' = Math.random() > 0.5 ? 'female' : 'male'): string {
  const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  if (gender === 'female') {
    const mn = MIDDLE_FEMALE[Math.floor(Math.random() * MIDDLE_FEMALE.length)];
    const fn = FIRST_FEMALE[Math.floor(Math.random() * FIRST_FEMALE.length)];
    return `${ln} ${mn} ${fn}`;
  }
  const mn = MIDDLE_MALE[Math.floor(Math.random() * MIDDLE_MALE.length)];
  const fn = FIRST_MALE[Math.floor(Math.random() * FIRST_MALE.length)];
  return `${ln} ${mn} ${fn}`;
}

export function buildVietnameseSystemPrompt(params: {
  name: string;
  title: string;
  departmentName: string;
  personalityNote: string;
  toneStyle?: string;
  tools: ToolName[];
  companyName?: string;
}): string {
  const { name, title, departmentName, personalityNote, toneStyle, tools, companyName = 'AI COMPANY VIỆT NAM' } = params;
  return [
    `Bạn là **${name}** – giữ chức vụ **${title}** thuộc phòng **${departmentName}** tại công ty **${companyName}**.`,
    ``,
    `## Nhiệm vụ & Tính cách cốt lõi`,
    personalityNote.trim() || `Thực hiện xuất sắc vai trò ${title}, chủ động phối hợp liên phòng ban và báo cáo kết quả thực tế cho CEO.`,
    ``,
    `## Giọng điệu giao tiếp`,
    toneStyle || 'Chuyên nghiệp, tiếng Việt có dấu chuẩn mực, ngắn gọn và đi thẳng vào kết quả.',
    ``,
    `## Nguyên tắc trung thực & Công cụ`,
    `- Công cụ được cấp phép: ${tools.join(', ')}.`,
    `- TUYỆT ĐỐI KHÔNG tự nhận đã hoàn thành nếu chưa tạo ra kết quả thực trong hệ thống (tài liệu, lead CRM, báo giá, phiếu chi...).`,
    `- Khi thiếu công cụ/quyền hoặc không thể thực hiện, nói rõ lý do và đề xuất phương án tiếp theo.`,
  ].join('\n');
}

export function slugifyVietnameseId(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 28);
}

export function foldVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

export function suggestToolsForDescription(desc: string, baseTools: ToolName[]): ToolName[] {
  const lower = foldVietnamese(desc);
  const set = new Set<ToolName>(baseTools);
  set.add('read_memory');
  set.add('write_memory');
  set.add('request_expense');
  if (lower.includes('lead') || lower.includes('khach') || lower.includes('telesale')) {
    set.add('find_leads');
    set.add('save_lead');
    set.add('update_lead');
  }
  if (lower.includes('gui tin') || lower.includes('zalo') || lower.includes('email') || lower.includes('outreach')) {
    set.add('send_outreach');
    set.add('schedule_followup');
  }
  if (lower.includes('bao gia') || lower.includes('hop dong')) {
    set.add('create_quote');
  }
  if (lower.includes('content') || lower.includes('bai') || lower.includes('viet') || lower.includes('faq') || lower.includes('tai lieu')) {
    set.add('write_document');
  }
  if (lower.includes('social') || lower.includes('facebook') || lower.includes('tiktok')) {
    set.add('schedule_social_post');
    set.add('reply_social_comment');
  }
  if (lower.includes('ads') || lower.includes('quang cao')) {
    set.add('create_ad_campaign');
  }
  if (lower.includes('ke toan') || lower.includes('chi phi') || lower.includes('ngan sach')) {
    set.add('review_expense');
    set.add('pay_expense');
  }
  if (lower.includes('tuyen') || lower.includes('nhan su')) {
    set.add('hire_agent');
  }
  if (lower.includes('affiliate') || lower.includes('hoa hong') || lower.includes('san hang') || lower.includes('sub_id')) {
    set.add('affiliate_search_offers');
    set.add('affiliate_create_link');
    set.add('affiliate_check_links');
    set.add('affiliate_compliance_check');
  }
  if (lower.includes('phap che') || lower.includes('hop dong') || lower.includes('luat') || lower.includes('du lieu ca nhan')) {
    set.add('legal_research');
    set.add('draft_contract');
    set.add('review_contract');
  }
  return Array.from(set);
}

export function suggestDeptFromText(text: string): DepartmentId {
  const l = foldVietnamese(text);
  if (l.includes('phap che') || l.includes('phap ly') || l.includes('hop dong') || l.includes('luat') || l.includes('dpo')) return 'legal';
  if (l.includes('affiliate') || l.includes('lien ket') || l.includes('shopee') || l.includes('san hang')) return 'aff_research';
  if (l.includes('ke toan') || l.includes('tai chinh') || l.includes('nhan su') || l.includes('hr')) return 'backoffice';
  if (l.includes('marketing') || l.includes('content') || l.includes('seo') || l.includes('design') || l.includes('video') || l.includes('ads')) return 'marketing';
  if (l.includes('cskh') || l.includes('cham soc') || l.includes('support') || l.includes('mam non')) return 'cs';
  if (l.includes('dev') || l.includes('code') || l.includes('qa') || l.includes('product') || l.includes('tech')) return 'product';
  if (l.includes('data') || l.includes('kpi') || l.includes('phan tich')) return 'data';
  return 'sales';
}
