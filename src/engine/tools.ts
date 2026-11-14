import { getAgentById } from '../agents';
import { PRODUCTS, getProductById } from '../config/products';
import { useCompanyStore } from '../store/useCompanyStore';
import {
  AdCampaignItem,
  ApprovalType,
  AskCeoQuestion,
  DocumentCategory,
  LeadItem,
  LeadStage,
  Permission,
  ScheduledSocialPost,
  SocialPlatformId,
  TaskPriority,
  ToolName,
} from '../types';
import { LlmToolDefinition } from './llm';
import { buildDefaultBrandLaunchKit, PLATFORM_META } from './marketingSeeds';
import { authorize, TOOL_PERMISSION_MAP } from './rbac';

export const TOOL_DEFINITIONS: Record<ToolName, LlmToolDefinition> = {
  create_task: {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Tạo công việc mới trên Task Board.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          assignedTo: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          productId: { type: 'string' },
        },
        required: ['title', 'assignedTo'],
      },
    },
  },
  assign_task: {
    type: 'function',
    function: {
      name: 'assign_task',
      description: 'Giao việc cụ thể cho một agent khác và thông báo.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          assignedTo: { type: 'string' },
          priority: { type: 'string' },
        },
        required: ['title', 'assignedTo'],
      },
    },
  },
  send_message: {
    type: 'function',
    function: {
      name: 'send_message',
      description: 'Gửi tin nhắn lên kênh chat hoặc DM cho agent/CEO.',
      parameters: {
        type: 'object',
        properties: {
          channelId: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['channelId', 'content'],
      },
    },
  },
  call_meeting: {
    type: 'function',
    function: {
      name: 'call_meeting',
      description: 'Triệu tập cuộc họp liên phòng ban tại Phòng Họp Lớn tầng 1.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          participants: { type: 'array', items: { type: 'string' } },
        },
        required: ['topic'],
      },
    },
  },
  write_document: {
    type: 'function',
    function: {
      name: 'write_document',
      description: 'Lưu tài liệu Markdown vào Kho tài liệu công ty.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          category: { type: 'string' },
          content: { type: 'string' },
          productId: { type: 'string' },
        },
        required: ['title', 'content'],
      },
    },
  },
  search_web: {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Tìm kiếm thông tin công khai từ web (Tavily/Serper/DuckDuckGo hoặc mô phỏng).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    },
  },
  fetch_page: {
    type: 'function',
    function: {
      name: 'fetch_page',
      description: 'Đọc thông tin liên hệ công khai trên một trang web.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string' } },
        required: ['url'],
      },
    },
  },
  read_memory: {
    type: 'function',
    function: {
      name: 'read_memory',
      description: 'Đọc bộ nhớ ngắn hạn và dài hạn của agent.',
      parameters: { type: 'object', properties: {} },
    },
  },
  write_memory: {
    type: 'function',
    function: {
      name: 'write_memory',
      description: 'Ghi chú kinh nghiệm mới vào bộ nhớ.',
      parameters: {
        type: 'object',
        properties: { note: { type: 'string' } },
        required: ['note'],
      },
    },
  },
  generate_report: {
    type: 'function',
    function: {
      name: 'generate_report',
      description: 'Tổng hợp báo cáo KPI/tình hình gửi CEO.',
      parameters: {
        type: 'object',
        properties: { title: { type: 'string' } },
      },
    },
  },
  request_approval: {
    type: 'function',
    function: {
      name: 'request_approval',
      description: 'Gửi yêu cầu phê duyệt tới CEO (chi tiền, báo giá ngoài bảng giá, hợp đồng, đăng bài).',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['budget', 'quote', 'contract', 'public_post', 'outreach'] },
          title: { type: 'string' },
          description: { type: 'string' },
          amountVnd: { type: 'number' },
        },
        required: ['type', 'title', 'description'],
      },
    },
  },
  request_permission: {
    type: 'function',
    function: {
      name: 'request_permission',
      description: 'Xin CEO cấp thêm quyền RBAC khi agent bị từ chối quyền.',
      parameters: {
        type: 'object',
        properties: {
          permission: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['permission', 'reason'],
      },
    },
  },
  ask_ceo: {
    type: 'function',
    function: {
      name: 'ask_ceo',
      description: 'Hỏi CEO qua web & Zalo OA khi gặp CAPTCHA, 2FA hoặc cần quyết định chiến lược.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          urgency: { type: 'string', enum: ['normal', 'urgent'] },
          context: { type: 'string' },
        },
        required: ['question'],
      },
    },
  },
  find_leads: {
    type: 'function',
    function: {
      name: 'find_leads',
      description: 'Tìm kiếm khách hàng tiềm năng từ nguồn công khai tại Việt Nam.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          province: { type: 'string' },
          count: { type: 'number' },
        },
      },
    },
  },
  save_lead: {
    type: 'function',
    function: {
      name: 'save_lead',
      description: 'Lưu một lead mới vào CRM (tự động chống trùng tên/SĐT/email).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string' },
          province: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          recommendedProductId: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  update_lead: {
    type: 'function',
    function: {
      name: 'update_lead',
      description: 'Cập nhật trạng thái pipeline hoặc ghi chú tương tác của lead.',
      parameters: {
        type: 'object',
        properties: {
          leadId: { type: 'string' },
          stage: { type: 'string' },
        },
        required: ['leadId', 'stage'],
      },
    },
  },
  score_lead: {
    type: 'function',
    function: {
      name: 'score_lead',
      description: 'Chấm điểm lead 0–100 kèm lý do.',
      parameters: {
        type: 'object',
        properties: {
          leadId: { type: 'string' },
          score: { type: 'number' },
          reason: { type: 'string' },
        },
        required: ['leadId', 'score'],
      },
    },
  },
  send_outreach: {
    type: 'function',
    function: {
      name: 'send_outreach',
      description: 'Gửi tin nhắn cá nhân hóa cho lead qua Email/Zalo OA/Facebook (có kiểm tra hạn mức & giờ).',
      parameters: {
        type: 'object',
        properties: {
          leadId: { type: 'string' },
          channel: { type: 'string', enum: ['Email', 'Zalo OA', 'Facebook'] },
          message: { type: 'string' },
        },
        required: ['leadId', 'channel', 'message'],
      },
    },
  },
  schedule_followup: {
    type: 'function',
    function: {
      name: 'schedule_followup',
      description: 'Lên lịch follow-up cho lead (tối đa 3 lần, cách nhau >= 3 ngày).',
      parameters: {
        type: 'object',
        properties: {
          leadId: { type: 'string' },
          daysLater: { type: 'number' },
        },
        required: ['leadId'],
      },
    },
  },
  create_account: {
    type: 'function',
    function: {
      name: 'create_account',
      description: 'Tạo hoặc kiểm tra tài khoản bán hàng qua playbook trong /worker.',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string' },
          simulateCaptcha: { type: 'boolean' },
        },
        required: ['platform'],
      },
    },
  },
  browser_action: {
    type: 'function',
    function: {
      name: 'browser_action',
      description: 'Thực thi bước Playwright trên /worker (DRY_RUN mô phỏng trên trình duyệt).',
      parameters: {
        type: 'object',
        properties: {
          playbook: { type: 'string' },
          action: { type: 'string' },
        },
      },
    },
  },
  create_quote: {
    type: 'function',
    function: {
      name: 'create_quote',
      description: 'Tạo báo giá & hợp đồng nháp lưu Kho tài liệu.',
      parameters: {
        type: 'object',
        properties: {
          leadId: { type: 'string' },
          productId: { type: 'string' },
          tierIndex: { type: 'number' },
          discountPercent: { type: 'number' },
        },
        required: ['leadId', 'productId'],
      },
    },
  },
  get_kpis: {
    type: 'function',
    function: {
      name: 'get_kpis',
      description: 'Lấy số liệu KPI thời gian thực từ cơ sở dữ liệu.',
      parameters: { type: 'object', properties: {} },
    },
  },
  generate_brand_kit: {
    type: 'function',
    function: {
      name: 'generate_brand_kit',
      description: 'Tạo Brand Launch Kit hoàn chỉnh (tên, handle, bio 7 nền tảng, prompt logo/banner, 3 trụ cột, hashtag, kịch bản video) lưu Kho tài liệu.',
      parameters: {
        type: 'object',
        properties: {
          brandName: { type: 'string' },
        },
      },
    },
  },
  provision_channel: {
    type: 'function',
    function: {
      name: 'provision_channel',
      description: 'Dựng hoặc chạy tiếp bước thiết lập tài khoản kênh MXH qua Playbook (/worker). Tự dừng và hỏi CEO khi gặp OTP/CAPTCHA/2FA.',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', enum: ['tiktok', 'facebook', 'zalo_oa', 'youtube', 'google_business', 'linkedin', 'email'] },
          requiresHumanOtp: { type: 'boolean' },
        },
        required: ['platform'],
      },
    },
  },
  schedule_social_post: {
    type: 'function',
    function: {
      name: 'schedule_social_post',
      description: 'Lên lịch bài đăng mới vào Lịch nội dung 30 ngày (tự áp dụng quy tắc duyệt bài đầu tiên / bài có giá).',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string' },
          dayNumber: { type: 'number' },
          title: { type: 'string' },
          content: { type: 'string' },
          pillar: { type: 'string' },
          hasPricingOrClaim: { type: 'boolean' },
        },
        required: ['platform', 'title', 'content'],
      },
    },
  },
  publish_social_post: {
    type: 'function',
    function: {
      name: 'publish_social_post',
      description: 'Xuất bản bài đăng từ Lịch nội dung lên nền tảng (tuân thủ giới hạn ngày, chống trùng & phê duyệt CEO).',
      parameters: {
        type: 'object',
        properties: {
          postId: { type: 'string' },
        },
        required: ['postId'],
      },
    },
  },
  reply_social_comment: {
    type: 'function',
    function: {
      name: 'reply_social_comment',
      description: 'Phản hồi bình luận/inbox rõ ràng với danh nghĩa công ty, chuyển lead vào CRM hoặc hỏi CEO nếu liên quan giá/khiếu nại.',
      parameters: {
        type: 'object',
        properties: {
          commentId: { type: 'string' },
          replyText: { type: 'string' },
        },
        required: ['commentId'],
      },
    },
  },
  create_ad_campaign: {
    type: 'function',
    function: {
      name: 'create_ad_campaign',
      description: 'Đề xuất chiến dịch Ads (đối tượng, ngân sách ngày/tổng, A/B variants) đưa vào hàng đợi CEO duyệt trước khi chạy.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          platform: { type: 'string', enum: ['facebook', 'tiktok', 'zalo_oa', 'google_business'] },
          audience: { type: 'string' },
          dailyBudgetVnd: { type: 'number' },
          totalBudgetVnd: { type: 'number' },
        },
        required: ['name', 'platform', 'dailyBudgetVnd'],
      },
    },
  },
};

export function getToolsForAgent(allowedTools: ToolName[]): LlmToolDefinition[] {
  return allowedTools.map((t) => TOOL_DEFINITIONS[t]).filter(Boolean);
}

const SIMULATED_VN_LEADS_POOL: Array<{
  name: string;
  category: LeadItem['category'];
  address: string;
  province: string;
  website: string;
  email: string;
  phone: string;
  productId: string;
  score: number;
  reason: string;
  valueVnd: number;
}> = [
  {
    name: 'Trung tâm Anh ngữ BrightFuture Tân Bình',
    category: 'Trung tâm ngoại ngữ',
    address: '215 Cộng Hòa, Phường 13, Tân Bình',
    province: 'TP.HCM',
    website: 'https://brightfuture.edu.vn',
    email: 'tuyensinh@brightfuture.edu.vn',
    phone: '0903 812 456',
    productId: 'edu-center',
    score: 94,
    reason: 'Có 2 cơ sở, >500 học viên IELTS/Kids, đang quản lý điểm danh & học phí bằng Excel.',
    valueVnd: 29880000,
  },
  {
    name: 'Anh ngữ Học Thuật VietSky Hà Đông',
    category: 'Trung tâm ngoại ngữ',
    address: '108 Trần Phú, Hà Đông',
    province: 'Hà Nội',
    website: 'https://vietskyenglish.vn',
    email: 'contact@vietskyenglish.vn',
    phone: '0988 541 209',
    productId: 'edu-center',
    score: 88,
    reason: 'Đang tuyển sinh 12 lớp mới/tháng, cần nhắc học phí tự động qua Zalo OA.',
    valueVnd: 29880000,
  },
  {
    name: 'Trung tâm Tiếng Hàn & Anh SeoulEdu',
    category: 'Trung tâm ngoại ngữ',
    address: '45 Nguyễn Văn Cừ, Ninh Kiều',
    province: 'Cần Thơ',
    website: 'https://seouleducation.vn',
    email: 'info@seouleducation.vn',
    phone: '0919 672 331',
    productId: 'edu-center',
    score: 85,
    reason: 'Đào tạo song song tiếng Hàn xuất khẩu & tiếng Anh giao tiếp, cần chấm công giáo viên.',
    valueVnd: 11880000,
  },
  {
    name: 'Anh ngữ Giao Tiếp GlobalTalk Thủ Đức',
    category: 'Trung tâm ngoại ngữ',
    address: '302 Võ Văn Ngân, TP. Thủ Đức',
    province: 'TP.HCM',
    website: 'https://globaltalk.vn',
    email: 'hello@globaltalk.vn',
    phone: '0932 908 774',
    productId: 'edu-center',
    score: 91,
    reason: 'Chạy quảng cáo mạnh nhưng tỷ lệ bỏ sót lead inbox cao, phù hợp CRM EduCenter Pro.',
    valueVnd: 29880000,
  },
  {
    name: 'Trường Mầm non Montessori Cầu Vồng Xanh',
    category: 'Trường mầm non',
    address: '19 Nguyễn Lương Bằng, Quận 7',
    province: 'TP.HCM',
    website: 'https://cauvongxanh.edu.vn',
    email: 'bgh@cauvongxanh.edu.vn',
    phone: '0907 115 882',
    productId: 'preschool-care',
    score: 87,
    reason: '160 bé, phụ huynh mong muốn nhận ảnh & thực đơn hàng ngày qua Zalo.',
    valueVnd: 19080000,
  },
  {
    name: 'Công ty Phân phối Thiết bị Y tế An Khang',
    category: 'Doanh nghiệp kho/bán lẻ',
    address: '54 Giải Phóng, Hai Bà Trưng',
    province: 'Hà Nội',
    website: 'https://ankhangmed.vn',
    email: 'kho@ankhangmed.vn',
    phone: '0974 203 661',
    productId: 'warehouse-pro',
    score: 89,
    reason: 'Quản lý vật tư theo số lô & hạn sử dụng (FEFO), cần quét QR trên điện thoại.',
    valueVnd: 22680000,
  },
  {
    name: 'Chuỗi Thực phẩm Sạch GreenFarm Đà Nẵng',
    category: 'Doanh nghiệp kho/bán lẻ',
    address: '122 Hoàng Diệu, Hải Châu',
    province: 'Đà Nẵng',
    website: 'https://greenfarmdn.vn',
    email: 'vanhanh@greenfarmdn.vn',
    phone: '0905 781 440',
    productId: 'warehouse-pro',
    score: 83,
    reason: '3 kho lạnh, cần kiểm soát hao hụt và điều chuyển hàng nội bộ.',
    valueVnd: 22680000,
  },
  {
    name: 'Trung tâm Nha khoa Thẩm mỹ SmileCare',
    category: 'Doanh nghiệp SME',
    address: '89 Hai Bà Trưng, Quận 1',
    province: 'TP.HCM',
    website: 'https://smilecare-clinic.vn',
    email: 'marketing@smilecare-clinic.vn',
    phone: '0901 449 552',
    productId: 'web-design',
    score: 82,
    reason: 'Cần website đặt lịch hẹn chuẩn SEO + phễu thu Lead Zalo OA.',
    valueVnd: 14500000,
  },
];

export async function executeAgentTool(
  agentId: string,
  toolName: ToolName,
  args: Record<string, unknown>
): Promise<{ ok: boolean; output: Record<string, unknown> }> {
  const store = useCompanyStore.getState();
  const agent = getAgentById(agentId);
  if (!agent) return { ok: false, output: { error: 'Agent không tồn tại' } };

  if (store.settings.killSwitchActive) {
    return { ok: false, output: { error: 'KILL SWITCH đang kích hoạt' } };
  }

  // 1. Whitelist check
  if (!agent.allowedTools.includes(toolName)) {
    await store.addAuditLog({
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      agentId,
      agentName: agent.name,
      action: toolName,
      result: 'denied',
      reason: `Công cụ '${toolName}' không nằm trong whitelist của ${agent.title}.`,
      timestamp: Date.now(),
    });
    return {
      ok: false,
      output: { error: `Từ chối: Công cụ '${toolName}' không thuộc phạm vi của bạn.` },
    };
  }

  // 2. RBAC Permission check
  const requiredPerm = TOOL_PERMISSION_MAP[toolName];
  if (requiredPerm) {
    const account = store.accounts.find((a) => a.agentId === agentId);
    const authRes = authorize(account, requiredPerm, toolName, agent.name, (entry) => {
      store.addAuditLog(entry);
    });
    if (!authRes.allowed) {
      return {
        ok: false,
        output: {
          error: authRes.reason,
          missingPermission: requiredPerm,
          hint: 'Bạn có thể dùng tool request_permission để xin CEO cấp quyền.',
        },
      };
    }
  }

  // 3. Execute Tool
  const now = Date.now();
  const dryRun = store.settings.dryRun;

  switch (toolName) {
    case 'get_kpis': {
      const leads = store.leads;
      const outreach = store.outreachLogs;
      const todayKey = new Date().toISOString().slice(0, 10);
      const todayTokens = store.tokenUsage
        .filter((t) => t.dateKey === todayKey)
        .reduce((s, x) => s + x.totalTokens, 0);
      const todayCostUsd = store.tokenUsage
        .filter((t) => t.dateKey === todayKey)
        .reduce((s, x) => s + x.costUsd, 0);
      const repliedCount = leads.filter((l) => ['replied', 'demo', 'proposal', 'won'].includes(l.stage)).length;
      const demoCount = leads.filter((l) => l.stage === 'demo').length;
      const wonLeads = leads.filter((l) => l.stage === 'won');
      const revenueVnd = wonLeads.reduce((s, l) => s + l.estimatedValueVnd, 0);
      return {
        ok: true,
        output: {
          totalLeads: leads.length,
          newLeads: leads.filter((l) => l.stage === 'new').length,
          outreachSent: outreach.filter((o) => o.result === 'sent_dry_run' || o.result === 'sent_live').length,
          replyRatePercent: leads.length ? Math.round((repliedCount / leads.length) * 100) : 0,
          demoCount,
          wonDeals: wonLeads.length,
          revenueVnd,
          todayTokens,
          todayCostUsd: Number(todayCostUsd.toFixed(4)),
        },
      };
    }

    case 'create_task':
    case 'assign_task': {
      const assignedTo = String(args.assignedTo || agentId);
      const targetAgent = getAgentById(assignedTo) || agent;
      const task = {
        id: `task_${now}_${Math.random().toString(36).slice(2, 6)}`,
        title: String(args.title || 'Nhiệm vụ mới'),
        description: String(args.description || ''),
        department: targetAgent.department,
        assignedTo: targetAgent.id,
        createdBy: agentId,
        status: 'todo' as const,
        priority: (['low', 'medium', 'high', 'urgent'].includes(String(args.priority))
          ? args.priority
          : 'medium') as TaskPriority,
        productId: args.productId ? String(args.productId) : undefined,
        createdAt: now,
        updatedAt: now,
        dueLabel: 'Chu kỳ hiện tại',
      };
      await store.putTask(task);
      return { ok: true, output: { taskId: task.id, assignedTo: targetAgent.name } };
    }

    case 'send_message': {
      const channelId = String(args.channelId || agent.department);
      const content = String(args.content || '');
      await store.addMessage({
        channelId,
        senderId: agentId,
        senderName: agent.name,
        senderTitle: agent.title,
        department: agent.department,
        content,
        busType: 'chat',
      });
      return { ok: true, output: { delivered: true, channelId } };
    }

    case 'write_document': {
      const category = (String(args.category || 'report') as DocumentCategory);
      const doc = {
        id: `doc_${now}_${Math.random().toString(36).slice(2, 6)}`,
        title: String(args.title || 'Tài liệu mới'),
        category,
        authorId: agentId,
        department: agent.department,
        productId: args.productId ? String(args.productId) : undefined,
        content: String(args.content || ''),
        createdAt: now,
        updatedAt: now,
      };
      await store.putDocument(doc);
      await store.addMessage({
        channelId: agent.department,
        senderId: agentId,
        senderName: agent.name,
        senderTitle: agent.title,
        department: agent.department,
        content: `Đã lưu tài liệu mới vào Kho: **${doc.title}**`,
        busType: 'report',
        cardType: 'document',
        cardData: { documentId: doc.id, title: doc.title, category: doc.category },
      });
      return { ok: true, output: { documentId: doc.id, title: doc.title } };
    }

    case 'search_web': {
      const query = String(args.query || '');
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, limit: 5 }),
        });
        if (res.ok) {
          const data = (await res.json()) as { provider: string; results: Array<Record<string, unknown>> };
          if (data.results && data.results.length > 0) {
            return { ok: true, output: { provider: data.provider, results: data.results } };
          }
        }
      } catch {
        // Fallback to simulated Vietnam public sources
      }
      return {
        ok: true,
        output: {
          provider: 'simulation_vn',
          dryRun: true,
          results: SIMULATED_VN_LEADS_POOL.slice(0, 3).map((x) => ({
            title: x.name,
            url: x.website,
            snippet: `${x.address}, ${x.province} · SĐT: ${x.phone} · Email: ${x.email}`,
          })),
        },
      };
    }

    case 'fetch_page': {
      const url = String(args.url || '');
      try {
        const res = await fetch('/api/fetch-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (res.ok) {
          const data = (await res.json()) as Record<string, unknown>;
          return { ok: true, output: data };
        }
      } catch {
        // Fallback
      }
      return {
        ok: true,
        output: { url, dryRun: true, extractedContacts: { emails: ['info@doanhnghiep.vn'], phones: ['0901234567'] } },
      };
    }

    case 'find_leads': {
      const productId = String(args.productId || store.settings.priorityProductId || 'edu-center');
      const count = Math.min(Number(args.count || 3), 5);
      const existingNames = new Set(store.leads.map((l) => l.name.toLowerCase()));
      const candidates = SIMULATED_VN_LEADS_POOL.filter(
        (c) => (productId ? c.productId === productId || c.productId === 'edu-center' : true) && !existingNames.has(c.name.toLowerCase())
      ).slice(0, count);

      const saved: LeadItem[] = [];
      for (const c of candidates) {
        const lead: LeadItem = {
          id: `lead_${now}_${Math.random().toString(36).slice(2, 6)}`,
          name: c.name,
          category: c.category,
          address: c.address,
          province: c.province,
          website: c.website,
          email: c.email,
          phone: c.phone,
          zalo: c.phone.replace(/\s+/g, ''),
          source: dryRun ? 'Nguồn công khai (Mô phỏng)' : 'Public Search',
          score: c.score,
          scoreReason: c.reason,
          recommendedProductId: c.productId,
          stage: 'new',
          assignedAgentId: c.productId === 'edu-center' || c.productId === 'preschool-care' ? 'sdr_1' : 'sdr_2',
          followUpCount: 0,
          blacklisted: false,
          estimatedValueVnd: c.valueVnd,
          interactions: [],
          createdAt: Date.now(),
        };
        await store.putLead(lead);
        saved.push(lead);
      }
      return {
        ok: true,
        output: {
          foundCount: saved.length,
          leads: saved.map((l) => ({ id: l.id, name: l.name, score: l.score, province: l.province })),
        },
      };
    }

    case 'save_lead': {
      const name = String(args.name || '').trim();
      const duplicate = store.leads.find(
        (l) =>
          l.name.toLowerCase() === name.toLowerCase() ||
          (args.email && l.email === args.email) ||
          (args.phone && l.phone === args.phone)
      );
      if (duplicate) {
        return { ok: false, output: { error: `Lead trùng lặp với '${duplicate.name}' (${duplicate.id}).` } };
      }
      const lead: LeadItem = {
        id: `lead_${now}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        category: (String(args.category || 'Trung tâm ngoại ngữ') as LeadItem['category']),
        address: String(args.address || 'Chưa rõ địa chỉ'),
        province: String(args.province || 'TP.HCM'),
        email: args.email ? String(args.email) : undefined,
        phone: args.phone ? String(args.phone) : undefined,
        source: 'Tìm kiếm công khai',
        score: 75,
        scoreReason: 'Phù hợp chân dung khách hàng mục tiêu.',
        recommendedProductId: String(args.recommendedProductId || 'edu-center'),
        stage: 'new',
        assignedAgentId: 'sdr_1',
        followUpCount: 0,
        blacklisted: false,
        estimatedValueVnd: 19000000,
        interactions: [],
        createdAt: now,
      };
      await store.putLead(lead);
      return { ok: true, output: { leadId: lead.id, name: lead.name } };
    }

    case 'update_lead': {
      const lead = store.leads.find((l) => l.id === String(args.leadId));
      if (!lead) return { ok: false, output: { error: 'Không tìm thấy Lead' } };
      await store.moveLeadStage(lead.id, String(args.stage) as LeadStage);
      return { ok: true, output: { leadId: lead.id, stage: args.stage } };
    }

    case 'score_lead': {
      const lead = store.leads.find((l) => l.id === String(args.leadId));
      if (!lead) return { ok: false, output: { error: 'Không tìm thấy Lead' } };
      await store.putLead({
        ...lead,
        score: Math.max(0, Math.min(100, Number(args.score || lead.score))),
        scoreReason: String(args.reason || lead.scoreReason),
      });
      return { ok: true, output: { leadId: lead.id, score: args.score } };
    }

    case 'send_outreach': {
      const lead = store.leads.find((l) => l.id === String(args.leadId));
      if (!lead) return { ok: false, output: { error: 'Không tìm thấy Lead' } };

      const channel = (['Email', 'Zalo OA', 'Facebook'].includes(String(args.channel))
        ? args.channel
        : 'Email') as 'Email' | 'Zalo OA' | 'Facebook';
      const settings = store.settings;

      // 1. Check Blacklist
      if (lead.blacklisted) {
        await store.addOutreachLog({
          id: `out_${now}`,
          agentId,
          agentName: agent.name,
          leadId: lead.id,
          leadName: lead.name,
          channel,
          subjectOrPreview: 'Bị chặn do nằm trong Blacklist',
          result: 'blocked_blacklist',
          dryRun,
          timestamp: now,
        });
        return { ok: false, output: { error: 'Lead nằm trong Blacklist (đã nhắn DỪNG), tuyệt đối không gửi.' } };
      }

      // 2. Autonomy level 1 requires approval for all outbound
      if (settings.autonomyLevel === 1) {
        await store.putApproval({
          id: `apr_${now}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'outreach',
          title: `Duyệt gửi ${channel} tới ${lead.name}`,
          description: String(args.message || ''),
          requestedBy: agentId,
          department: agent.department,
          payload: { leadId: lead.id, channel },
          status: 'pending',
          createdAt: now,
        });
        return { ok: false, output: { status: 'waiting_approval', reason: 'Mức tự chủ 1 (Đề xuất): chờ CEO duyệt tin gửi.' } };
      }

      // 3. Check active hours 8h-20h (only enforce strictly when not dryRun, or warn)
      const currentHour = new Date().getHours();
      if (!dryRun && (currentHour < settings.sdrAllowedStartHour || currentHour >= settings.sdrAllowedEndHour)) {
        await store.addOutreachLog({
          id: `out_${now}`,
          agentId,
          agentName: agent.name,
          leadId: lead.id,
          leadName: lead.name,
          channel,
          subjectOrPreview: `Ngoài khung giờ ${settings.sdrAllowedStartHour}h–${settings.sdrAllowedEndHour}h`,
          result: 'blocked_hours',
          dryRun,
          timestamp: now,
        });
        return { ok: false, output: { error: `Ngoài khung giờ cho phép (${settings.sdrAllowedStartHour}h–${settings.sdrAllowedEndHour}h).` } };
      }

      // 4. Check daily quota
      const todayStr = new Date().toDateString();
      const todayCount = store.outreachLogs.filter(
        (o) =>
          o.channel === channel &&
          new Date(o.timestamp).toDateString() === todayStr &&
          (o.result === 'sent_dry_run' || o.result === 'sent_live')
      ).length;
      const limit = channel === 'Email' ? settings.sdrDailyLimitEmail : settings.sdrDailyLimitOther;
      if (todayCount >= limit) {
        await store.addOutreachLog({
          id: `out_${now}`,
          agentId,
          agentName: agent.name,
          leadId: lead.id,
          leadName: lead.name,
          channel,
          subjectOrPreview: `Vượt hạn mức ${limit} tin/ngày`,
          result: 'blocked_quota',
          dryRun,
          timestamp: now,
        });
        return { ok: false, output: { error: `Đã đạt hạn mức ${limit} tin/ngày cho kênh ${channel}.` } };
      }

      // 5. Check max follow-ups
      if (lead.followUpCount >= settings.sdrMaxFollowups) {
        return { ok: false, output: { error: `Lead đã đạt tối đa ${settings.sdrMaxFollowups} lần follow-up.` } };
      }

      // 6. Mandatory compliance opt-out footer (Nghị định 91/2020)
      let messageText = String(args.message || '').trim();
      if (!messageText.includes('DỪNG')) {
        messageText += `\n\n---\nNhắn 'DỪNG' để không nhận thêm thông tin từ ${settings.companyName}.`;
      }

      const nextStage: LeadStage = lead.stage === 'new' ? 'contacted' : lead.stage;
      await store.putLead({
        ...lead,
        stage: nextStage,
        followUpCount: lead.followUpCount + 1,
        lastContactedAt: now,
        interactions: [
          ...lead.interactions,
          {
            id: `int_${now}`,
            channel,
            direction: 'outbound',
            content: messageText,
            agentId,
            timestamp: now,
            dryRun,
          },
        ],
      });

      await store.addOutreachLog({
        id: `out_${now}`,
        agentId,
        agentName: agent.name,
        leadId: lead.id,
        leadName: lead.name,
        channel,
        subjectOrPreview: messageText.slice(0, 140),
        result: dryRun ? 'sent_dry_run' : 'sent_live',
        dryRun,
        timestamp: now,
      });

      return { ok: true, output: { sent: true, dryRun, channel, leadName: lead.name } };
    }

    case 'schedule_followup': {
      const lead = store.leads.find((l) => l.id === String(args.leadId));
      if (!lead) return { ok: false, output: { error: 'Không tìm thấy Lead' } };
      const days = Math.max(store.settings.sdrMinDaysBetweenFollowups, Number(args.daysLater || 3));
      const nextFollowUpAt = now + days * 86400000;
      await store.putLead({ ...lead, nextFollowUpAt });
      return { ok: true, output: { leadId: lead.id, scheduledDaysLater: days } };
    }

    case 'create_account':
    case 'browser_action': {
      const platform = String(args.platform || args.playbook || 'Zalo OA');
      const simulateCaptcha = Boolean(args.simulateCaptcha);
      if (simulateCaptcha) {
        // Strict rule: NEVER bypass CAPTCHA/OTP/2FA -> stop in blocked & call ask_ceo!
        store.setAgentStatus(agentId, 'blocked', 'Gặp CAPTCHA/OTP - Hỏi CEO!');
        return executeAgentTool(agentId, 'ask_ceo', {
          question: `Playbook tạo/xác minh tài khoản "${platform}" đang dừng tại bước CAPTCHA/OTP 2FA. Chủ tịch vui lòng hỗ trợ xác thực hoặc chọn hướng xử lý?`,
          options: [
            '1. Tôi sẽ tự xác thực OTP ngay trên máy local (/worker)',
            '2. Tạm hoãn kênh này, dùng kênh khác đã sẵn sàng',
            '3. Chuyển sang chế độ Mô phỏng (DRY_RUN)',
          ],
          urgency: 'urgent',
          context: `Agent ${agent.name} tuân thủ chính sách không tự vượt CAPTCHA/2FA.`,
        });
      }
      return {
        ok: true,
        output: {
          platform,
          dryRun,
          status: dryRun ? 'dry_run_ready' : 'executed',
          note: dryRun
            ? 'Chạy mô phỏng Playbook thành công (DRY_RUN). Chạy thật Playwright tại gói /worker.'
            : 'Đã gửi lệnh Playwright tới /worker.',
        },
      };
    }

    case 'create_quote': {
      const lead = store.leads.find((l) => l.id === String(args.leadId));
      const product = getProductById(String(args.productId || lead?.recommendedProductId || 'edu-center'));
      const tierIdx = Math.min(2, Math.max(0, Number(args.tierIndex ?? 1)));
      const tier = product.tiers[tierIdx];
      const discount = Number(args.discountPercent || 0);
      const finalPrice = Math.round(tier.priceVnd * (1 - discount / 100));

      const quoteDoc = {
        id: `doc_quote_${now}`,
        title: `Báo giá ${product.shortName} – ${lead?.name || 'Khách hàng'}`,
        category: 'quote' as const,
        authorId: agentId,
        department: agent.department,
        productId: product.id,
        content: `# BÁO GIÁ DỊCH VỤ PHẦN MỀM\n**Khách hàng:** ${lead?.name || 'Khách hàng'}\n**Sản phẩm:** ${product.name}\n**Gói đề xuất:** ${tier.name}\n**Đơn giá niêm yết:** ${tier.priceLabel}\n**Chiết khấu:** ${discount}%\n**Giá sau ưu đãi:** ${finalPrice.toLocaleString('vi-VN')}đ / tháng\n\n## Quyền lợi bao gồm\n${tier.features.map((f) => `- ${f}`).join('\n')}`,
        createdAt: now,
        updatedAt: now,
      };
      await store.putDocument(quoteDoc);

      // Discount outside price list OR Autonomy <= 2 requires CEO approval!
      if (discount > 0 || store.settings.autonomyLevel <= 2) {
        await store.putApproval({
          id: `apr_quote_${now}`,
          type: 'quote',
          title: `Duyệt báo giá ${product.shortName} cho ${lead?.name || 'Khách hàng'} (${discount > 0 ? `Giảm ${discount}%` : 'Theo bảng giá'})`,
          description: `${agent.name} đã lưu báo giá vào Kho tài liệu và trình CEO duyệt trước khi gửi khách.`,
          requestedBy: agentId,
          department: agent.department,
          amountVnd: finalPrice * 12,
          payload: { documentId: quoteDoc.id, leadId: lead?.id, discount },
          status: 'pending',
          createdAt: now,
        });
      }
      return { ok: true, output: { documentId: quoteDoc.id, finalPrice, requiresApproval: true } };
    }

    case 'request_approval': {
      const apr = {
        id: `apr_${now}_${Math.random().toString(36).slice(2, 6)}`,
        type: (String(args.type || 'budget') as ApprovalType),
        title: String(args.title || 'Yêu cầu phê duyệt'),
        description: String(args.description || ''),
        requestedBy: agentId,
        department: agent.department,
        amountVnd: args.amountVnd ? Number(args.amountVnd) : undefined,
        payload: args,
        status: 'pending' as const,
        createdAt: now,
      };
      await store.putApproval(apr);
      await store.addMessage({
        channelId: 'all',
        senderId: agentId,
        senderName: agent.name,
        senderTitle: agent.title,
        department: agent.department,
        content: `Trình Chủ tịch phê duyệt: **${apr.title}**`,
        busType: 'approval_needed',
        cardType: 'approval',
        cardData: { approvalId: apr.id },
      });
      return { ok: true, output: { approvalId: apr.id, status: 'pending' } };
    }

    case 'request_permission': {
      const perm = String(args.permission || 'lead:write') as Permission;
      const reason = String(args.reason || 'Cần quyền để hoàn thành nhiệm vụ.');
      const apr = {
        id: `apr_perm_${now}`,
        type: 'permission' as const,
        title: `Xin cấp quyền '${perm}' cho ${agent.name} (${agent.title})`,
        description: reason,
        requestedBy: agentId,
        department: agent.department,
        payload: { permission: perm },
        status: 'pending' as const,
        createdAt: now,
      };
      await store.putApproval(apr);
      await store.addMessage({
        channelId: 'all',
        senderId: agentId,
        senderName: agent.name,
        senderTitle: agent.title,
        department: agent.department,
        content: `Em xin Chủ tịch cấp thêm quyền \`${perm}\`: ${reason}`,
        busType: 'approval_needed',
        cardType: 'approval',
        cardData: { approvalId: apr.id },
      });
      return { ok: true, output: { approvalId: apr.id, requestedPermission: perm } };
    }

    case 'ask_ceo': {
      const shortId = `CEO-${Math.floor(100 + Math.random() * 899)}`;
      const urgency = args.urgency === 'urgent' ? 'urgent' : 'normal';
      const options = Array.isArray(args.options) && args.options.length > 0
        ? args.options.map(String)
        : ['1. Đồng ý tiến hành', '2. Tạm dừng & trao đổi thêm'];

      const q: AskCeoQuestion = {
        id: shortId,
        agentId,
        department: agent.department,
        question: String(args.question || 'Cần quyết định của Chủ tịch'),
        options,
        urgency,
        context: String(args.context || ''),
        stepType: (args.stepType as AskCeoQuestion['stepType']) || 'general',
        resumeAction: args.resumeAction as AskCeoQuestion['resumeAction'],
        status: 'pending',
        createdAt: now,
      };

      await store.putAskCeoQuestion(q);
      store.setAgentStatus(agentId, 'blocked', `Hỏi CEO #${shortId}`);

      await store.addMessage({
        channelId: 'ask_ceo',
        senderId: agentId,
        senderName: agent.name,
        senderTitle: agent.title,
        department: agent.department,
        content: `**[HỎI CEO #${shortId}]** ${q.question}`,
        busType: 'question',
        cardType: 'ask_ceo',
        cardData: { questionId: shortId },
      });

      // Zalo OA rate-limit / DND check for simulated dispatch
      const hour = new Date().getHours();
      const s = store.settings;
      const inDnd =
        s.zaloDndStartHour > s.zaloDndEndHour
          ? hour >= s.zaloDndStartHour || hour < s.zaloDndEndHour
          : hour >= s.zaloDndStartHour && hour < s.zaloDndEndHour;

      const recentZaloCount = store.zaloSimulatorLog.filter(
        (z) => z.direction === 'in' && now - z.timestamp < 3600000
      ).length;

      if (urgency === 'urgent' || (!inDnd && recentZaloCount < s.zaloMaxMessagesPerHour)) {
        const zaloText = `[#${shortId}] ${agent.name} (${agent.title}):\n${q.question}\n${options.join('\n')}\n(Trả lời #${shortId} + nội dung để agent chạy tiếp)`;
        store.pushZaloSimMessage('in', zaloText);
      } else {
        store.pushZaloSimMessage(
          'in',
          `[Gộp Digest - Đang DND hoặc đạt giới hạn ${s.zaloMaxMessagesPerHour} tin/giờ] Câu hỏi #${shortId} từ ${agent.name} đã đưa vào hàng đợi digest.`
        );
      }

      return { ok: true, output: { questionId: shortId, status: 'blocked_waiting_ceo' } };
    }

    case 'generate_brand_kit': {
      const brandName = String(args.brandName || store.settings.companyName || 'AI COMPANY VIỆT NAM');
      const kit = buildDefaultBrandLaunchKit(brandName);
      await store.putBrandKit(kit);

      const md = [
        `# BRAND LAUNCH KIT – ${kit.brandName}`,
        `**Handle thống nhất:** \`${kit.handle}\``,
        `**Tagline:** ${kit.tagline}`,
        `**Tông giọng thương hiệu:** ${kit.voiceTone}`,
        ``,
        `## 1. 3 Trụ cột Nội dung`,
        ...kit.contentPillars.map((p) => `- **${p.title} (${p.ratioPercent}%):** ${p.description}`),
        ``,
        `## 2. Bio Chuẩn Từng Nền tảng`,
        ...(Object.entries(kit.biosByPlatform) as Array<[SocialPlatformId, string]>).map(
          ([plat, bio]) => `- **${PLATFORM_META[plat].label}:** ${bio}`
        ),
        ``,
        `## 3. Prompt Tạo Ảnh Logo / Avatar / Banner & Kích thước`,
        ...kit.imagePrompts.map(
          (img) => `- **${img.slot} (${img.platform} · \`${img.dimensions}\`):** ${img.prompt}`
        ),
        ``,
        `## 4. Bộ Hashtag Chuẩn`,
        kit.hashtags.join(' '),
        ``,
        `## 5. Kịch bản Video Ngắn (TikTok / Shorts)`,
        ...kit.videoScripts.map(
          (v) => `### ${v.title} (${v.durationSec}s)\n- ${v.hook}\n- ${v.body}\n- ${v.cta}`
        ),
      ].join('\n');

      await store.putDocument({
        id: `doc_brand_kit_${now}`,
        title: `Brand Launch Kit – ${kit.brandName} (${kit.handle})`,
        category: 'strategy',
        authorId: agentId,
        department: 'marketing',
        content: md,
        createdAt: now,
        updatedAt: now,
      });

      return { ok: true, output: { brandName: kit.brandName, handle: kit.handle, savedToDocs: true } };
    }

    case 'provision_channel': {
      const platformId = String(args.platform || 'tiktok') as SocialPlatformId;
      const ch = store.marketingChannels.find((c) => c.id === platformId);
      if (!ch) return { ok: false, output: { error: `Không tìm thấy kênh ${platformId}` } };

      const needsOtp = Boolean(args.requiresHumanOtp);
      if (needsOtp) {
        const otpLabel =
          platformId === 'tiktok'
            ? `Mã OTP TikTok Business vừa gửi về SĐT của anh, vui lòng gõ lại 6 số để em điền tiếp và tải Avatar/Bio (${ch.handle}):`
            : platformId === 'facebook'
            ? `Meta Business Suite yêu cầu xác thực 2FA / CAPTCHA cho trang ${ch.handle}. Anh nhập mã xác thực 6 số hoặc bấm xác nhận đã duyệt trên điện thoại giúp em:`
            : `Nền tảng ${ch.label} yêu cầu xác minh người thật (OTP/KYC). Anh nhập mã xác thực hoặc xác nhận để em chạy tiếp đúng bước ${ch.progressStep + 1}/${ch.totalSteps}:`;

        const askRes = await executeAgentTool(agentId, 'ask_ceo', {
          question: otpLabel,
          options: ['839201', 'Đã xác nhận trên điện thoại, chạy tiếp'],
          urgency: 'urgent',
          context: `Cần 1 bước người thật cho kênh ${ch.label} — cam kết KHÔNG dùng tool vượt captcha hay SIM ảo.`,
          stepType: platformId === 'facebook' ? '2fa' : 'otp',
          resumeAction: {
            type: 'channel_setup',
            channelId: ch.id,
            nextStep: ch.totalSteps,
          },
        });

        await store.putMarketingChannel({
          ...ch,
          status: 'waiting_ceo_otp',
          progressStep: Math.max(1, ch.progressStep || 1),
          pausedReason: otpLabel,
          pendingAskId: String(askRes.output.questionId || ''),
          updatedAt: now,
        });

        return { ok: true, output: { status: 'waiting_ceo_otp', channelId: ch.id, askId: askRes.output.questionId } };
      }

      await store.putMarketingChannel({
        ...ch,
        status: 'ready',
        progressStep: ch.totalSteps,
        pausedReason: undefined,
        pendingAskId: undefined,
        tokenStatus: 'simulated',
        updatedAt: now,
      });
      return { ok: true, output: { status: 'ready', channelId: ch.id } };
    }

    case 'schedule_social_post': {
      const platform = (String(args.platform || 'facebook') as SocialPlatformId);
      const title = String(args.title || '').trim();
      const content = String(args.content || '').trim();
      if (!title || !content) return { ok: false, output: { error: 'Thiếu tiêu đề hoặc nội dung bài đăng.' } };

      const duplicate = store.scheduledPosts.find(
        (p) => p.title.toLowerCase() === title.toLowerCase() && p.platform === platform
      );
      if (duplicate) {
        return { ok: false, output: { error: 'Phát hiện bài trùng nội dung trên cùng nền tảng — hủy xếp lịch.' } };
      }

      const publishedOnPlatform = store.scheduledPosts.filter((p) => p.platform === platform && p.status === 'published').length;
      const isFirstPostOnPlatform = publishedOnPlatform === 0;
      const lowerText = `${title} ${content}`.toLowerCase();
      const hasPricingOrClaim =
        Boolean(args.hasPricingOrClaim) ||
        lowerText.includes('giá') ||
        lowerText.includes('cam kết') ||
        lowerText.includes('so với đối thủ') ||
        lowerText.includes('giảm');

      const needsApproval =
        store.settings.autonomyLevel === 1 ||
        (store.settings.autonomyLevel === 2 && (isFirstPostOnPlatform || hasPricingOrClaim));

      const meta = PLATFORM_META[platform] || PLATFORM_META.facebook;
      const postId = `post_${now}_${Math.random().toString(36).slice(2, 6)}`;
      let approvalId: string | undefined;
      let reason: string | undefined;

      if (needsApproval) {
        reason = isFirstPostOnPlatform
          ? `Bài đầu tiên trên ${meta.label} — cần CEO duyệt.`
          : 'Nội dung có nhắc giá / cam kết — cần CEO duyệt (Mức tự chủ 2).';
        approvalId = `apr_post_${now}_${Math.random().toString(36).slice(2, 5)}`;
        await store.putApproval({
          id: approvalId,
          type: 'public_post',
          title: `Duyệt đăng bài ${meta.shortTag}: ${title.slice(0, 60)}`,
          description: `${reason}\n\n${content.slice(0, 220)}...`,
          requestedBy: agentId,
          department: 'marketing',
          payload: { postId, platform },
          status: 'pending',
          createdAt: now,
        });
      }

      const newPost: ScheduledSocialPost = {
        id: postId,
        platform,
        dayNumber: Math.max(1, Math.min(30, Number(args.dayNumber || 3))),
        scheduledTime: meta.goldenHour,
        title,
        content,
        hashtags: store.brandKit.hashtags.slice(0, 4),
        pillar: String(args.pillar || store.brandKit.contentPillars[0]?.title || 'Chia sẻ kinh nghiệm'),
        mediaType: platform === 'tiktok' || platform === 'youtube' ? 'video' : 'image',
        mediaDimensions: meta.mediaDimensions,
        imagePrompt: `Branded ${meta.shortTag} visual for: ${title}`,
        status: needsApproval ? 'waiting_approval' : 'approved',
        hasPricingOrClaim,
        isFirstPostOnPlatform,
        requiresApprovalReason: reason,
        approvalId,
        authorId: agentId,
        simulated: dryRun,
        metrics: { views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, leads: 0 },
        createdAt: now,
      };
      await store.putScheduledPost(newPost);
      return { ok: true, output: { postId, status: newPost.status, needsApproval } };
    }

    case 'publish_social_post': {
      const post = store.scheduledPosts.find((p) => p.id === String(args.postId));
      if (!post) return { ok: false, output: { error: 'Không tìm thấy bài đăng.' } };

      const ch = store.marketingChannels.find((c) => c.id === post.platform);
      if (ch && ch.status !== 'ready') {
        return { ok: false, output: { error: `Kênh ${ch.label} chưa ở trạng thái Sẵn sàng (${ch.status}).` } };
      }

      // Check Autonomy Level 2 approval gate strictly
      if (
        post.status === 'waiting_approval' ||
        (store.settings.autonomyLevel <= 2 && (post.isFirstPostOnPlatform || post.hasPricingOrClaim) && post.status !== 'approved')
      ) {
        await store.addSocialLog({
          id: `slog_${now}`,
          postId: post.id,
          platform: post.platform,
          agentId,
          agentName: agent.name,
          actionType: 'publish_post',
          preview: post.title,
          result: 'blocked_approval',
          simulated: dryRun,
          timestamp: now,
        });
        return { ok: false, output: { error: post.requiresApprovalReason || 'Bài đăng cần CEO phê duyệt trước.' } };
      }

      // Daily post cap check
      const todayStr = new Date().toDateString();
      const todayPublished = store.socialLogs.filter(
        (l) => l.actionType === 'publish_post' && (l.result === 'published_sim' || l.result === 'published_live') && new Date(l.timestamp).toDateString() === todayStr
      ).length;
      if (todayPublished >= (store.settings.marketingDailyPostCap || 2)) {
        await store.addSocialLog({
          id: `slog_${now}`,
          postId: post.id,
          platform: post.platform,
          agentId,
          agentName: agent.name,
          actionType: 'publish_post',
          preview: post.title,
          result: 'blocked_quota',
          simulated: dryRun,
          timestamp: now,
        });
        return { ok: false, output: { error: `Đã chạm giới hạn ${store.settings.marketingDailyPostCap} bài/ngày để đảm bảo an toàn nền tảng.` } };
      }

      // Light up 3D posting effect briefly
      store.setAgentPostingSocial(agentId, true, `Đang đăng ${PLATFORM_META[post.platform].shortTag}...`);
      setTimeout(() => {
        useCompanyStore.getState().setAgentPostingSocial(agentId, false);
      }, 3600);

      const simMetrics = {
        views: 420 + Math.floor(Math.random() * 980),
        likes: 35 + Math.floor(Math.random() * 90),
        comments: 4 + Math.floor(Math.random() * 14),
        shares: 3 + Math.floor(Math.random() * 18),
        clicks: 18 + Math.floor(Math.random() * 45),
        leads: Math.random() > 0.35 ? 1 + Math.floor(Math.random() * 2) : 0,
      };

      await store.putScheduledPost({
        ...post,
        status: 'published',
        simulated: dryRun,
        metrics: simMetrics,
        publishedAt: now,
      });

      if (ch) {
        await store.putMarketingChannel({
          ...ch,
          metrics: {
            followers: ch.metrics.followers + Math.floor(simMetrics.likes * 0.15),
            views: ch.metrics.views + simMetrics.views,
            engagement: ch.metrics.engagement + simMetrics.likes + simMetrics.comments + simMetrics.shares,
            clicks: ch.metrics.clicks + simMetrics.clicks,
            leads: ch.metrics.leads + simMetrics.leads,
          },
          updatedAt: now,
        });
      }

      await store.addSocialLog({
        id: `slog_${now}`,
        postId: post.id,
        platform: post.platform,
        agentId,
        agentName: agent.name,
        actionType: 'publish_post',
        preview: post.title,
        result: dryRun ? 'published_sim' : 'published_live',
        simulated: dryRun,
        timestamp: now,
      });

      return { ok: true, output: { postId: post.id, simulated: dryRun, metrics: simMetrics } };
    }

    case 'reply_social_comment': {
      const cmt = store.socialComments.find((c) => c.id === String(args.commentId));
      if (!cmt) return { ok: false, output: { error: 'Không tìm thấy bình luận/tin nhắn.' } };

      // Escalate pricing, complaints, or sensitive topics via ask_ceo
      if (cmt.intent === 'pricing' || cmt.intent === 'complaint' || cmt.intent === 'sensitive') {
        const askRes = await executeAgentTool(agentId, 'ask_ceo', {
          question: `[${PLATFORM_META[cmt.platform].shortTag}] ${cmt.authorName} nhắn (${cmt.intent}): "${cmt.message}". Anh muốn em trả lời theo hướng nào?`,
          options: [
            '1. Chốt gửi ưu đãi chuẩn 10% hợp đồng 2 năm & hẹn gọi tư vấn',
            '2. Mời khách dùng thử miễn phí 14 ngày trước rồi trao đổi giá sau',
          ],
          urgency: 'normal',
          context: 'Chính sách công ty: câu hỏi chiết khấu/khiếu nại/nhạy cảm phải xin ý kiến CEO trước khi phản hồi công khai.',
          stepType: 'general',
          resumeAction: {
            type: 'social_escalation',
            commentId: cmt.id,
          },
        });

        await store.putSocialComment({
          ...cmt,
          status: 'escalated_ceo',
          askCeoId: String(askRes.output.questionId || ''),
        });
        return { ok: true, output: { status: 'escalated_ceo', askId: askRes.output.questionId } };
      }

      // Brand voice reply explicitly identifying as company account
      const signature = `[Phản hồi chính thức từ ${store.settings.companyName}]`;
      const baseReply =
        String(args.replyText || '').trim() ||
        `Chào ${cmt.authorName}, đội ngũ ${store.settings.companyName} đã ghi nhận thông tin và rất sẵn lòng hỗ trợ tài khoản demo 14 ngày miễn phí cho đơn vị mình ạ!`;
      const fullReply = `${baseReply}\n\n— ${signature}`;

      let linkedLeadId = cmt.linkedLeadId;
      if (cmt.intent === 'inquiry_lead' && !linkedLeadId) {
        const leadId = `lead_soc_${now}`;
        await store.putLead({
          id: leadId,
          name: cmt.authorName,
          category: cmt.message.toLowerCase().includes('mầm non') ? 'Trường mầm non' : 'Trung tâm ngoại ngữ',
          address: 'Khách liên hệ qua Kênh MXH',
          province: 'TP.HCM',
          source: `${PLATFORM_META[cmt.platform].shortTag} ${cmt.type === 'comment' ? 'Comment' : 'Inbox'}`,
          score: 88,
          scoreReason: `Tự động chuyển đổi từ ${cmt.type} quan tâm dùng thử: "${cmt.message.slice(0, 80)}"`,
          recommendedProductId: cmt.message.toLowerCase().includes('mầm non') ? 'preschool-care' : 'edu-center',
          stage: 'replied',
          assignedAgentId: 'sdr_1',
          followUpCount: 0,
          blacklisted: false,
          estimatedValueVnd: 22000000,
          interactions: [
            {
              id: `int_soc_${now}`,
              channel: cmt.platform === 'zalo_oa' ? 'Zalo OA' : 'Facebook',
              direction: 'inbound',
              content: cmt.message,
              agentId,
              timestamp: now,
              dryRun,
            },
          ],
          createdAt: now,
        });
        linkedLeadId = leadId;
      }

      await store.putSocialComment({
        ...cmt,
        status: linkedLeadId ? 'converted_lead' : 'replied',
        agentReply: fullReply,
        linkedLeadId,
      });

      await store.addSocialLog({
        id: `slog_rep_${now}`,
        platform: cmt.platform,
        agentId,
        agentName: agent.name,
        actionType: 'reply_comment',
        preview: `${cmt.authorName}: ${baseReply.slice(0, 90)}`,
        result: 'replied_sim',
        simulated: dryRun,
        timestamp: now,
      });

      return { ok: true, output: { status: linkedLeadId ? 'converted_lead' : 'replied', linkedLeadId } };
    }

    case 'create_ad_campaign': {
      const dailyBudget = Number(args.dailyBudgetVnd || 300000);
      const maxDaily = store.settings.marketingDailyAdBudgetVnd || 500000;
      if (dailyBudget > maxDaily) {
        return {
          ok: false,
          output: {
            error: `Ngân sách ngày (${dailyBudget.toLocaleString('vi-VN')}đ) vượt giới hạn tối đa ${maxDaily.toLocaleString('vi-VN')}đ/ngày.`,
          },
        };
      }
      const platform = (String(args.platform || 'facebook') as AdCampaignItem['platform']);
      const adId = `ad_${now}_${Math.random().toString(36).slice(2, 5)}`;
      const aprId = `apr_ad_${now}`;

      const ad: AdCampaignItem = {
        id: adId,
        name: String(args.name || 'Chiến dịch Lead Ads mới'),
        platform,
        objective: 'Leads',
        audience: String(args.audience || 'Chủ Trung tâm Ngoại ngữ & Doanh nghiệp SME Việt Nam (25–48 tuổi)'),
        dailyBudgetVnd: dailyBudget,
        totalBudgetVnd: Number(args.totalBudgetVnd || dailyBudget * 14),
        variants: [
          {
            label: 'Biến thể A (Tiết kiệm thời gian)',
            headline: 'Tự động hóa vận hành, giảm 12h Excel mỗi tuần',
            primaryText: 'Trải nghiệm ngay bản dùng thử 14 ngày miễn phí kèm hỗ trợ nhập dữ liệu ban đầu.',
          },
          {
            label: 'Biến thể B (Nhắc Zalo tự động)',
            headline: 'Kết nối Zalo OA & CRM đồng bộ 100%',
            primaryText: 'Không bỏ sót bất kỳ khách hàng tiềm năng nào từ Fanpage hay Website.',
          },
        ],
        status: 'pending_approval',
        approvalId: aprId,
        impressions: 0,
        clicks: 0,
        leads: 0,
        spentVnd: 0,
        createdAt: now,
      };
      await store.putAdCampaign(ad);

      await store.putApproval({
        id: aprId,
        type: 'budget',
        title: `Duyệt Ads ${platform.toUpperCase()}: ${ad.name} (${dailyBudget.toLocaleString('vi-VN')}đ/ngày)`,
        description: `Đối tượng: ${ad.audience}\nTổng ngân sách dự kiến: ${ad.totalBudgetVnd.toLocaleString('vi-VN')}đ · Gồm 2 biến thể A/B. Không tự chi tiền khi chưa duyệt.`,
        requestedBy: agentId,
        department: 'marketing',
        amountVnd: ad.totalBudgetVnd,
        payload: { adCampaignId: adId },
        status: 'pending',
        createdAt: now,
      });

      return { ok: true, output: { adCampaignId: adId, approvalId: aprId, status: 'pending_approval' } };
    }

    case 'read_memory': {
      const mem = store.agentMemories[agentId];
      return { ok: true, output: { shortTerm: mem?.shortTerm || [], longTermSummary: mem?.longTermSummary || '' } };
    }

    case 'write_memory': {
      await store.appendAgentMemory(agentId, String(args.note || ''));
      return { ok: true, output: { saved: true } };
    }

    case 'generate_report': {
      const kpi = await executeAgentTool(agentId, 'get_kpis', {});
      return { ok: true, output: { title: String(args.title || 'Báo cáo tổng hợp'), kpis: kpi.output } };
    }

    case 'call_meeting': {
      const topic = String(args.topic || 'Họp điều phối liên phòng ban');
      return { ok: true, output: { meetingStarted: true, topic } };
    }

    default:
      return { ok: false, output: { error: `Tool '${toolName}' chưa hỗ trợ` } };
  }
}

export { PRODUCTS };
