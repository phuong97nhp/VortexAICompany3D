import { PRODUCTS, getProductById } from '../config/products';
import { createHubCwConnector } from '../integrations/hubcw/BusinessSystemConnector';
import { HUBCW_MODULE_MAP, maskCustomerPiiForPrompt } from '../integrations/hubcw/hubcw.config';
import { executeHubCwWrite } from '../integrations/hubcw/writeGate';
import { useCompanyStore } from '../store/useCompanyStore';
import {
  AdCampaignItem,
  ApprovalType,
  AskCeoQuestion,
  DataProvenance,
  DepartmentId,
  DocumentCategory,
  HubCwModuleId,
  LeadItem,
  LeadStage,
  OriginTag,
  Permission,
  ScheduledSocialPost,
  SocialPlatformId,
  TaskDeliverableLink,
  TaskPriority,
  ToolName,
} from '../types';
import { formatVnd } from './expenseEngine';
import { buildNewAgentFromSpec } from './hrEngine';
import { getLiveAgentById } from './liveRegistry';
import { LlmToolDefinition } from './llm';
import { buildDefaultBrandLaunchKit, PLATFORM_META } from './marketingSeeds';
import { authorize, TOOL_PERMISSION_MAP } from './rbac';
import { ROLE_TEMPLATES } from './roleTemplates';
import { sanitizeExternalUntrustedContent } from './resilience';
import { runAffiliateComplianceCheck } from '../integrations/affiliate/affiliateEngine';
import { buildLegalReport } from './legal/legalEngine';
import { checkOutgoingClaimsAndBankSafety, formatVerifiedBankPaymentSnippet } from './productBankEngine';
import { checkOutputAgainstSop } from './hrSopEngine';

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
      description: 'Tạo chiến dịch Ads trả phí. BẮT BUỘC truyền expenseId của phiếu chi #CP-... đã được Kế toán + CEO duyệt.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          platform: { type: 'string', enum: ['facebook', 'tiktok', 'zalo_oa', 'google_business'] },
          audience: { type: 'string' },
          dailyBudgetVnd: { type: 'number' },
          totalBudgetVnd: { type: 'number' },
          expenseId: { type: 'string' },
        },
        required: ['name', 'platform', 'dailyBudgetVnd', 'expenseId'],
      },
    },
  },
  request_expense: {
    type: 'function',
    function: {
      name: 'request_expense',
      description: 'Tạo phiếu đề xuất chi phí (#CP-xxx) gửi Kế toán thẩm định tầng 1 trước khi chi tiền.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          category: { type: 'string' },
          amountVnd: { type: 'number' },
          vendor: { type: 'string' },
          justification: { type: 'string' },
          expectedRoi: { type: 'string' },
          projectOrCampaign: { type: 'string' },
          frequency: { type: 'string', enum: ['once', 'recurring'] },
        },
        required: ['title', 'category', 'amountVnd', 'vendor', 'justification'],
      },
    },
  },
  review_expense: {
    type: 'function',
    function: {
      name: 'review_expense',
      description: 'Kế toán thẩm định phiếu chi tầng 1 (chuyển CEO duyệt, hỏi lại hoặc từ chối). Không được tự duyệt phiếu của mình.',
      parameters: {
        type: 'object',
        properties: {
          expenseId: { type: 'string' },
          decision: { type: 'string', enum: ['to_ceo', 'needs_info', 'rejected'] },
          note: { type: 'string' },
        },
        required: ['expenseId', 'decision'],
      },
    },
  },
  pay_expense: {
    type: 'function',
    function: {
      name: 'pay_expense',
      description: 'Đánh dấu phiếu chi đã duyệt là Đã thanh toán và ghi nhận chứng từ.',
      parameters: {
        type: 'object',
        properties: {
          expenseId: { type: 'string' },
          note: { type: 'string' },
          attachmentName: { type: 'string' },
        },
        required: ['expenseId'],
      },
    },
  },
  buy_domain: {
    type: 'function',
    function: {
      name: 'buy_domain',
      description: 'Mua tên miền / hosting (BẮT BUỘC có expenseId phiếu chi đã duyệt).',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string' },
          amountVnd: { type: 'number' },
          expenseId: { type: 'string' },
        },
        required: ['domain', 'amountVnd', 'expenseId'],
      },
    },
  },
  subscribe_tool: {
    type: 'function',
    function: {
      name: 'subscribe_tool',
      description: 'Đăng ký hoặc gia hạn công cụ SaaS (BẮT BUỘC có expenseId phiếu chi đã duyệt).',
      parameters: {
        type: 'object',
        properties: {
          toolName: { type: 'string' },
          amountVnd: { type: 'number' },
          expenseId: { type: 'string' },
        },
        required: ['toolName', 'amountVnd', 'expenseId'],
      },
    },
  },
  spend: {
    type: 'function',
    function: {
      name: 'spend',
      description: 'Thực hiện chi khoản đã được duyệt theo phiếu chi (BẮT BUỘC có expenseId).',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          amountVnd: { type: 'number' },
          expenseId: { type: 'string' },
        },
        required: ['description', 'amountVnd', 'expenseId'],
      },
    },
  },
  hire_agent: {
    type: 'function',
    function: {
      name: 'hire_agent',
      description: 'Tuyển nhân sự AI mới (hoặc trình CEO duyệt tuyển nếu hrAutoDecide đang tắt).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          title: { type: 'string' },
          department: { type: 'string' },
          personalityNote: { type: 'string' },
          templateId: { type: 'string' },
        },
        required: ['name', 'title', 'department'],
      },
    },
  },
  hubcw_read: {
    type: 'function',
    function: {
      name: 'hubcw_read',
      description: 'Đọc dữ liệu từ một trong 19 module của phần mềm quản trị Hub.ChuyenWeb bằng tài khoản riêng của chính Agent.',
      parameters: {
        type: 'object',
        properties: {
          module: { type: 'string' },
          limit: { type: 'number' },
        },
        required: ['module'],
      },
    },
  },
  hubcw_write: {
    type: 'function',
    function: {
      name: 'hubcw_write',
      description: 'Ghi dữ liệu vào Hub.ChuyenWeb qua Cổng kiểm soát dữ liệu thật (chỉ chạy ở chế độ LIVE, bắt buộc có provenance hợp lệ & phiếu chi #CP-xxx nếu là tài chính).',
      parameters: {
        type: 'object',
        properties: {
          module: { type: 'string' },
          operation: { type: 'string', enum: ['create', 'update'] },
          recordId: { type: 'string' },
          payload: { type: 'object' },
          provenanceSource: {
            type: 'string',
            enum: ['hubcw_record', 'user_input', 'external_document', 'verified_web', 'platform_api', 'calculation'],
          },
          provenanceRefId: { type: 'string' },
          expenseCode: { type: 'string' },
        },
        required: ['module', 'operation', 'payload', 'provenanceSource'],
      },
    },
  },
  hubcw_sync: {
    type: 'function',
    function: {
      name: 'hubcw_sync',
      description: 'Đưa một bản ghi cần đồng bộ vào hàng đợi đồng bộ 2 chiều với Hub.ChuyenWeb.',
      parameters: {
        type: 'object',
        properties: {
          module: { type: 'string' },
          entityType: { type: 'string', enum: ['lead', 'task', 'order', 'support', 'cashflow', 'report', 'notification'] },
          payload: { type: 'object' },
          provenanceSource: { type: 'string' },
        },
        required: ['module', 'entityType', 'payload'],
      },
    },
  },
  affiliate_search_offers: {
    type: 'function',
    function: {
      name: 'affiliate_search_offers',
      description: 'Săn & chấm điểm 0–100 sản phẩm Win từ mạng Affiliate (Shopee ưu tiên) theo ngách.',
      parameters: {
        type: 'object',
        properties: {
          niche: { type: 'string' },
          networkId: { type: 'string' },
        },
        required: ['niche'],
      },
    },
  },
  affiliate_create_link: {
    type: 'function',
    function: {
      name: 'affiliate_create_link',
      description: 'Tạo link tracked chứa Aff ID của CEO và sub_id duy nhất (không cho phép sửa Aff ID).',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          subId: { type: 'string' },
          campaignId: { type: 'string' },
        },
        required: ['productId', 'subId'],
      },
    },
  },
  affiliate_check_links: {
    type: 'function',
    function: {
      name: 'affiliate_check_links',
      description: 'Kiểm tra định kỳ toàn bộ link Affiliate xem còn sống, đúng Aff ID hay đã hết khuyến mãi.',
      parameters: { type: 'object', properties: {} },
    },
  },
  affiliate_compliance_check: {
    type: 'function',
    function: {
      name: 'affiliate_compliance_check',
      description: 'Kiểm duyệt nội dung Affiliate: bắt buộc nhãn minh bạch, cấm bịa dùng thử & cấm thổi phồng y tế.',
      parameters: {
        type: 'object',
        properties: {
          contentPieceId: { type: 'string' },
        },
        required: ['contentPieceId'],
      },
    },
  },
  request_collab: {
    type: 'function',
    function: {
      name: 'request_collab',
      description: 'Tạo yêu cầu phối hợp liên phòng ban (vd: Khối Affiliate đặt hàng Phòng Marketing Tầng 2 hỗ trợ SEO/Banner).',
      parameters: {
        type: 'object',
        properties: {
          targetDepartment: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['targetDepartment', 'title'],
      },
    },
  },
  legal_research: {
    type: 'function',
    function: {
      name: 'legal_research',
      description: 'Tra cứu văn bản pháp luật Việt Nam trong Kho Pháp chế và kiểm tra trích dẫn hợp lệ 6 trường.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    },
  },
  draft_contract: {
    type: 'function',
    function: {
      name: 'draft_contract',
      description: 'Soạn thảo hợp đồng từ mẫu chuẩn (SaaS Mầm non, EduCenter, Kho, Website, NDA, CTV...) chỉ điền dữ liệu thật hoặc [CẦN BỔ SUNG].',
      parameters: {
        type: 'object',
        properties: {
          templateId: { type: 'string' },
          partyBName: { type: 'string' },
          partyBTaxCode: { type: 'string' },
          contractValueVnd: { type: 'number' },
          variant: { type: 'string', enum: ['seller_friendly', 'balanced', 'buyer_protective'] },
        },
        required: ['templateId'],
      },
    },
  },
  review_contract: {
    type: 'function',
    function: {
      name: 'review_contract',
      description: 'Rà soát rủi ro điều khoản hợp đồng và xuất Báo cáo Pháp lý 8 phần chuẩn.',
      parameters: {
        type: 'object',
        properties: {
          contractId: { type: 'string' },
        },
        required: ['contractId'],
      },
    },
  },
  quality_review: {
    type: 'function',
    function: {
      name: 'quality_review',
      description: 'Chạy vòng Kiểm định Chất lượng (Maker -> Critic -> Verifier -> Duyệt) trước khi bàn giao.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          definitionOfDone: { type: 'string' },
          draftText: { type: 'string' },
        },
        required: ['title', 'draftText'],
      },
    },
  },
  council_vote: {
    type: 'function',
    function: {
      name: 'council_vote',
      description: 'Triệu tập Hội đồng 3–5 trưởng phòng thảo luận có trọng số cho quyết định lớn.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
        },
        required: ['topic'],
      },
    },
  },
  create_handover: {
    type: 'function',
    function: {
      name: 'create_handover',
      description: 'Tạo Phiếu bàn giao chính thức (#BG-xxx) liên phòng ban kèm SLA.',
      parameters: {
        type: 'object',
        properties: {
          toDepartment: { type: 'string' },
          title: { type: 'string' },
          payloadSummary: { type: 'string' },
          slaMinutes: { type: 'number' },
        },
        required: ['toDepartment', 'title', 'payloadSummary'],
      },
    },
  },
  propose_money_plan: {
    type: 'function',
    function: {
      name: 'propose_money_plan',
      description: 'Đề xuất kế hoạch kiếm tiền hợp pháp kèm nguồn dẫn & kịch bản Thấp/TB/Cao trình CEO duyệt.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
        },
      },
    },
  },
  watch_competitor: {
    type: 'function',
    function: {
      name: 'watch_competitor',
      description: 'Quét theo dõi đối thủ từ nguồn công khai hợp pháp.',
      parameters: { type: 'object', properties: {} },
    },
  },
  propose_upgrade: {
    type: 'function',
    function: {
      name: 'propose_upgrade',
      description: 'Đề xuất nâng cấp quy trình/kiến trúc kèm bằng chứng điểm nghẽn (không tự sửa code nguồn).',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          bottleneckEvidence: { type: 'string' },
          solutionSummary: { type: 'string' },
          expectedRoi: { type: 'string' },
          beforeMetric: { type: 'string' },
        },
        required: ['title', 'bottleneckEvidence', 'solutionSummary'],
      },
    },
  },
  scout_git_repo: {
    type: 'function',
    function: {
      name: 'scout_git_repo',
      description: 'Tìm kiếm & đánh giá repo Git công khai theo yêu cầu trực tiếp của CEO.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    },
  },
  run_device_action: {
    type: 'function',
    function: {
      name: 'run_device_action',
      description: 'Thao tác hoặc đọc màn hình điện thoại Android đã kết nối theo chế độ & danh sách app cho phép.',
      parameters: {
        type: 'object',
        properties: {
          deviceId: { type: 'string' },
          action: { type: 'string', enum: ['screenshot', 'ocr_read', 'tap', 'swipe', 'input_text', 'open_app', 'back', 'home'] },
          text: { type: 'string' },
          packageName: { type: 'string' },
        },
        required: ['deviceId', 'action'],
      },
    },
  },
  send_zalo_personal: {
    type: 'function',
    function: {
      name: 'send_zalo_personal',
      description: 'Gửi tin nhắn qua Zalo Cá nhân (bị giới hạn <=20 tin chủ động/ngày, chặn DNC & marketing lạnh chưa duyệt).',
      parameters: {
        type: 'object',
        properties: {
          peerId: { type: 'string' },
          peerName: { type: 'string' },
          text: { type: 'string' },
          isReplyToInbound: { type: 'boolean' },
        },
        required: ['peerId', 'text'],
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

export interface ToolExecutionContext {
  onDeliverable?: (d: TaskDeliverableLink) => void;
}

export async function executeAgentTool(
  agentId: string,
  toolName: ToolName,
  args: Record<string, unknown>,
  ctx?: ToolExecutionContext
): Promise<{ ok: boolean; output: Record<string, unknown> }> {
  const store = useCompanyStore.getState();
  const agent = getLiveAgentById(agentId);
  if (!agent) return { ok: false, output: { error: 'Nhân sự không tồn tại trong hệ thống' } };
  if (agent.employmentStatus === 'archived' || agent.employmentStatus === 'suspended') {
    return { ok: false, output: { error: `${agent.name} hiện đang tạm nghỉ hoặc đã thôi việc.` } };
  }

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
      const targetAgent = getLiveAgentById(assignedTo) || agent;
      const taskCode = `#T-${101 + store.tasks.length}`;
      const etaMinutes = Math.max(5, Number(args.etaMinutes || 15));
      const task = {
        id: `task_${now}_${Math.random().toString(36).slice(2, 6)}`,
        taskCode,
        title: String(args.title || 'Nhiệm vụ mới'),
        description: String(args.description || ''),
        definitionOfDone: String(args.definitionOfDone || args.description || 'Hoàn thành và lưu kết quả thực tế vào hệ thống.'),
        expectedDeliverable: String(args.expectedDeliverable || 'Tài liệu / Dữ liệu CRM / Báo cáo'),
        department: targetAgent.department,
        assignedTo: targetAgent.id,
        createdBy: agentId,
        status: 'todo' as const,
        priority: (['low', 'medium', 'high', 'urgent'].includes(String(args.priority))
          ? args.priority
          : 'medium') as TaskPriority,
        productId: args.productId ? String(args.productId) : undefined,
        etaMinutes,
        etaAt: now + etaMinutes * 60_000,
        progressPercent: 0,
        lastProgressAt: now,
        deliverables: [],
        createdAt: now,
        updatedAt: now,
        dueLabel: `${etaMinutes} phút`,
      };
      await store.putTask(task);
      return { ok: true, output: { taskId: task.id, taskCode, assignedTo: targetAgent.name } };
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
      ctx?.onDeliverable?.({ type: 'doc', id: doc.id, title: doc.title });
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
          const data = (await res.json()) as { excerpt?: string; [k: string]: unknown };
          const san = sanitizeExternalUntrustedContent(String(data.excerpt || ''), url);
          return {
            ok: true,
            output: {
              ...data,
              excerpt: san.sanitizedText,
              hadInjectionAttempt: san.hadInjectionAttempt,
            },
          };
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
      const requestedCount = Math.min(30, Math.max(1, Number(args.count || 5)));
      const targetProvince = args.province ? String(args.province) : '';
      const existingNames = new Set(store.leads.map((l) => l.name.toLowerCase()));

      const poolCandidates = SIMULATED_VN_LEADS_POOL.filter(
        (c) => (productId ? c.productId === productId || c.productId === 'edu-center' : true) && !existingNames.has(c.name.toLowerCase())
      );

      const syntheticLeads: typeof SIMULATED_VN_LEADS_POOL = [...poolCandidates];
      if (syntheticLeads.length < requestedCount) {
        const prefixes =
          productId === 'preschool-care'
            ? ['Trường Mầm non Song ngữ', 'Mầm non Quốc tế', 'Nhà trẻ Montessori', 'Mầm non Họa Mi']
            : productId === 'warehouse-pro'
            ? ['Công ty Kho vận', 'Nhà phân phối Hàng tiêu dùng', 'Công ty TM & Logistics', 'Siêu thị Vật tư']
            : productId === 'web-design'
            ? ['Phòng khám Nha khoa', 'Công ty Nội thất', 'Thẩm mỹ viện', 'Showroom Kiến trúc']
            : ['Trung tâm Anh ngữ', 'Học viện Ngoại ngữ', 'Anh ngữ Quốc tế', 'Trung tâm Tiếng Nhật & Hàn'];
        const brands = ['Ánh Dương', 'Khởi Nguyên', 'Thăng Long', 'Vươn Xa', 'Tâm Việt', 'Phương Nam', 'Hưng Thịnh', 'Sài Gòn Mới', 'Bình Minh', 'Tiên Phong', 'Việt Úc', 'Minh Trí', 'Sao Mai', 'Phát Đạt', 'Hoa Sen', 'Đại Việt', 'Á Châu', 'Toàn Cầu', 'Tri Thức', 'An Bình'];
        const provinces = targetProvince ? [targetProvince] : ['TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Bình Dương', 'Cần Thơ', 'Hải Phòng'];
        const streets = ['Nguyễn Trãi', 'Lê Lợi', 'Hai Bà Trưng', 'Trần Hưng Đạo', 'Nguyễn Văn Linh', 'Cầu Giấy', 'Phan Văn Trị', 'Lê Văn Sỹ'];

        let idx = 0;
        while (syntheticLeads.length < requestedCount && idx < 80) {
          const pfx = prefixes[idx % prefixes.length];
          const br = brands[(idx * 3 + Math.floor(now / 1000)) % brands.length];
          const prov = provinces[idx % provinces.length];
          const st = streets[(idx * 5) % streets.length];
          const num = 20 + ((idx * 17) % 340);
          const candidateName = `${pfx} ${br} (${prov})`;
          idx++;
          if (existingNames.has(candidateName.toLowerCase()) || syntheticLeads.some((x) => x.name === candidateName)) {
            continue;
          }
          const domainSlug = candidateName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/gi, 'd')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 14);
          syntheticLeads.push({
            name: candidateName,
            category:
              productId === 'preschool-care'
                ? 'Trường mầm non'
                : productId === 'warehouse-pro'
                ? 'Doanh nghiệp kho/bán lẻ'
                : productId === 'web-design'
                ? 'Doanh nghiệp SME'
                : 'Trung tâm ngoại ngữ',
            address: `${num} ${st}`,
            province: prov,
            website: `https://${domainSlug}.vn`,
            email: `lienhe@${domainSlug}.vn`,
            phone: `090${(idx % 9) + 1} ${100 + idx} ${210 + idx}`,
            productId,
            score: 76 + (idx % 20),
            reason: 'Phù hợp chân dung khách hàng mục tiêu, đang mở rộng quy mô vận hành (Dữ liệu mô phỏng).',
            valueVnd: productId === 'edu-center' ? 29880000 : productId === 'warehouse-pro' ? 22680000 : 19080000,
          });
        }
      }

      const selected = syntheticLeads.slice(0, requestedCount);
      const saved: LeadItem[] = [];
      for (const c of selected) {
        const lead: LeadItem = {
          id: `lead_${now}_${saved.length}_${Math.random().toString(36).slice(2, 5)}`,
          name: c.name,
          category: c.category,
          address: c.address,
          province: c.province,
          website: c.website,
          email: c.email,
          phone: c.phone,
          zalo: c.phone.replace(/\s+/g, ''),
          source: 'Nguồn công khai (Dữ liệu mô phỏng)',
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
          origin: 'simulated',
          verificationStatus: 'simulated',
          provenance: {
            source: 'unknown',
            origin: 'simulated',
            sourceLabel: 'Sandbox Lead Pool (Mô phỏng)',
            verifiedAt: now,
          },
        };
        await store.putLead(lead);
        saved.push(lead);
      }

      if (saved.length > 0) {
        ctx?.onDeliverable?.({
          type: 'lead',
          id: saved[0].id,
          title: `${saved.length} Lead mới trong CRM (${saved[0].name}...)`,
        });
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
      const msgText = String(args.message || '');

      // -1. Probation LIVE gate (BỔ SUNG Q)
      if (
        store.settings.hrAutonomy?.requireExamPassForLive &&
        agent.probationStatus &&
        agent.probationStatus !== 'passed' &&
        !dryRun
      ) {
        return {
          ok: false,
          output: {
            blocked: true,
            error: `Nhân sự ${agent.name} đang ở trạng thái thử việc (${agent.probationStatus}) — cần đỗ Onboarding Exam trước khi gửi tin LIVE ra ngoài.`,
          },
        };
      }

      // 0. Product Master Claim & Bank Account Safety Check + SOP compliance (BỔ SUNG R & Q)
      const matchedProduct = store.productMasters.find((p) => p.id === lead.recommendedProductId) || store.productMasters[0];
      const claimRes = checkOutgoingClaimsAndBankSafety({
        text: msgText,
        product: matchedProduct,
        bankAccounts: store.bankAccounts,
      });
      if (!claimRes.passed) {
        return {
          ok: false,
          output: {
            blocked: true,
            error: `Chặn gửi do vi phạm Product Master / An toàn STK: ${claimRes.violations.map((v) => v.rule).join('; ')}`,
          },
        };
      }
      if (claimRes.hasUnknownQuestion) {
        const qId = `PMQ-${now.toString(36).toUpperCase().slice(-4)}`;
        await store.putAskCeoQuestion({
          id: qId,
          agentId,
          department: 'product',
          question: `[Product Master] Khách hàng (${lead.name}) hỏi điểm chưa có trong tài liệu ${matchedProduct?.shortName || 'sản phẩm'}: cần PM/CEO xác nhận để bổ sung.`,
          options: ['1. Đã chuyển PM cập nhật Product Master', '2. Tạm hoãn câu hỏi này'],
          urgency: 'normal',
          context: msgText.slice(0, 240),
          stepType: 'general',
          status: 'pending',
          createdAt: now,
        });
      }
      const roleSop = store.roleSops.find((s) => s.department === agent.department);
      const sopRes = checkOutputAgainstSop(msgText, roleSop);
      if (!sopRes.compliant) {
        return {
          ok: false,
          output: { blocked: true, error: `Vi phạm SOP phòng ${agent.department}: ${sopRes.violations.join('; ')}` },
        };
      }

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
      const requestedProdId = String(args.productId || lead?.recommendedProductId || 'edu-center');
      const dynamicProd =
        store.productMasters.find((p) => p.id === requestedProdId || p.code === requestedProdId) ||
        store.productMasters[0];
      const staticProd = getProductById(requestedProdId);
      const prodName = dynamicProd?.name || staticProd.name;
      const prodShort = dynamicProd?.shortName || staticProd.shortName;
      const prodId = dynamicProd?.id || staticProd.id;
      const tiers = dynamicProd?.tiers?.length
        ? dynamicProd.tiers.map((t) => ({
            name: t.name,
            priceVnd: t.priceVnd,
            priceLabel: t.priceLabel,
            features: [t.limits, `Chiết khấu tối đa tự chủ: ${t.maxDiscountPercent}%`],
            maxDiscountPercent: t.maxDiscountPercent,
          }))
        : staticProd.tiers.map((t) => ({ ...t, maxDiscountPercent: 10 }));
      const tierIdx = Math.min(Math.max(0, tiers.length - 1), Math.max(0, Number(args.tierIndex ?? 0)));
      const tier = tiers[tierIdx];
      const discount = Math.max(0, Number(args.discountPercent || 0));
      const finalPrice = Math.round(tier.priceVnd * (1 - discount / 100));
      const refCode = `#QT-${now.toString(36).toUpperCase().slice(-5)}`;
      const bankPaymentSnippet = formatVerifiedBankPaymentSnippet({
        bankAccounts: store.bankAccounts,
        refCode,
      });

      const quoteContent = `# BÁO GIÁ DỊCH VỤ PHẦN MỀM\n**Mã tham chiếu:** ${refCode}\n**Khách hàng:** ${lead?.name || 'Khách hàng'}\n**Sản phẩm:** ${prodName}\n**Gói đề xuất:** ${tier.name}\n**Đơn giá niêm yết:** ${tier.priceLabel}\n**Chiết khấu:** ${discount}%\n**Giá sau ưu đãi:** ${finalPrice.toLocaleString('vi-VN')}đ / kỳ\n\n## Quyền lợi & Giới hạn gói (Product Master)\n${tier.features.map((f) => `- ${f}`).join('\n')}\n\n## Thông tin Thanh toán Chính thức\n${bankPaymentSnippet}`;

      const claimCheck = checkOutgoingClaimsAndBankSafety({
        text: quoteContent,
        product: dynamicProd,
        bankAccounts: store.bankAccounts,
      });
      if (!claimCheck.passed) {
        return {
          ok: false,
          output: {
            blocked: true,
            error: `Báo giá vi phạm Product Master / Chính sách giá: ${claimCheck.violations.map((v) => v.rule).join('; ')}`,
          },
        };
      }

      const quoteDoc = {
        id: `doc_quote_${now}`,
        title: `Báo giá ${prodShort} (${refCode}) – ${lead?.name || 'Khách hàng'}`,
        category: 'quote' as const,
        authorId: agentId,
        department: agent.department,
        productId: prodId,
        content: quoteContent,
        createdAt: now,
        updatedAt: now,
      };
      await store.putDocument(quoteDoc);
      ctx?.onDeliverable?.({ type: 'quote', id: quoteDoc.id, title: quoteDoc.title });

      // Discount outside price list OR Autonomy <= 2 requires CEO approval!
      if (discount > 0 || store.settings.autonomyLevel <= 2) {
        await store.putApproval({
          id: `apr_quote_${now}`,
          type: 'quote',
          title: `Duyệt báo giá ${prodShort} cho ${lead?.name || 'Khách hàng'} (${discount > 0 ? `Giảm ${discount}%` : 'Theo bảng giá'})`,
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

      const bkDoc = {
        id: `doc_brand_kit_${now}`,
        title: `Brand Launch Kit – ${kit.brandName} (${kit.handle})`,
        category: 'strategy' as const,
        authorId: agentId,
        department: 'marketing' as DepartmentId,
        content: md,
        createdAt: now,
        updatedAt: now,
      };
      await store.putDocument(bkDoc);
      ctx?.onDeliverable?.({ type: 'doc', id: bkDoc.id, title: bkDoc.title });

      return { ok: true, output: { brandName: kit.brandName, handle: kit.handle, documentId: bkDoc.id, savedToDocs: true } };
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

      const claimCheck = checkOutgoingClaimsAndBankSafety({
        text: `${title}\n${content}`,
        product: store.productMasters[0],
        bankAccounts: store.bankAccounts,
      });
      if (!claimCheck.passed) {
        return {
          ok: false,
          output: {
            blocked: true,
            error: `Bài đăng vi phạm quy chuẩn Product Master / An toàn STK: ${claimCheck.violations.map((v) => v.rule).join('; ')}`,
          },
        };
      }
      const postSop = store.roleSops.find((s) => s.department === agent.department);
      const postSopCheck = checkOutputAgainstSop(`${title}\n${content}`, postSop);
      if (!postSopCheck.compliant) {
        return {
          ok: false,
          output: {
            blocked: true,
            error: `Bài đăng vi phạm SOP phòng ${agent.department}: ${postSopCheck.violations.join('; ')}`,
          },
        };
      }

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
      ctx?.onDeliverable?.({ type: 'post', id: postId, title: `Bài MXH (${meta.shortTag}): ${title}` });
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
      const totalBudget = Number(args.totalBudgetVnd || dailyBudget * 14);
      const expenseId = String(args.expenseId || '').trim();

      // BỔ SUNG E STRICT GATE: Never run/create paid ads without approved ExpenseItem
      const approvedExp = store.expenses.find(
        (e) =>
          (e.id === expenseId || e.expenseCode.toUpperCase() === expenseId.toUpperCase()) &&
          (e.status === 'approved' || e.status === 'paid' || e.status === 'reconciled')
      );
      if (!approvedExp) {
        await store.addAuditLog({
          id: `aud_gate_${now}`,
          agentId,
          agentName: agent.name,
          action: 'create_ad_campaign',
          permission: 'ads:manage',
          resource: 'expense_gate',
          result: 'denied',
          reason: 'Thiếu phiếu chi #CP-... đã được Kế toán + CEO phê duyệt.',
          timestamp: now,
        });
        return {
          ok: false,
          output: {
            error: `Bị chặn chi tiền: Bắt buộc phải có phiếu chi #CP-... đã được Kế toán + CEO duyệt (expenseId) trước khi tạo chiến dịch Ads (${formatVnd(totalBudget)}). Hãy gọi request_expense trước.`,
          },
        };
      }
      if (approvedExp.amountVnd < totalBudget) {
        return {
          ok: false,
          output: {
            error: `Phiếu chi ${approvedExp.expenseCode} chỉ duyệt ${formatVnd(approvedExp.amountVnd)}, không đủ cho chiến dịch ${formatVnd(totalBudget)}.`,
          },
        };
      }

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

      const ad: AdCampaignItem = {
        id: adId,
        name: String(args.name || 'Chiến dịch Lead Ads mới'),
        platform,
        objective: 'Leads',
        audience: String(args.audience || 'Chủ Trung tâm Ngoại ngữ & Doanh nghiệp SME Việt Nam (25–48 tuổi)'),
        dailyBudgetVnd: dailyBudget,
        totalBudgetVnd: totalBudget,
        expenseId: approvedExp.id,
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
        status: 'active',
        impressions: 0,
        clicks: 0,
        leads: 0,
        spentVnd: 0,
        createdAt: now,
      };
      await store.putAdCampaign(ad);
      ctx?.onDeliverable?.({ type: 'expense', id: approvedExp.id, title: `Ads ${ad.name} (${approvedExp.expenseCode})` });

      return { ok: true, output: { adCampaignId: adId, expenseCode: approvedExp.expenseCode, status: 'active' } };
    }

    case 'request_expense': {
      const amountVnd = Math.max(1000, Math.round(Number(args.amountVnd || 0)));
      const exp = await store.createExpense({
        requesterId: agentId,
        department: agent.department,
        projectOrCampaign: String(args.projectOrCampaign || 'Chiến dịch vận hành'),
        category: String(args.category || 'Công cụ / SaaS'),
        title: String(args.title || 'Đề xuất chi phí'),
        amountVnd,
        frequency: args.frequency === 'recurring' ? 'recurring' : 'once',
        justification: String(args.justification || 'Phục vụ vận hành theo chỉ đạo CEO.'),
        expectedRoi: String(args.expectedRoi || 'Tăng hiệu suất & Lead đầu vào.'),
        vendor: String(args.vendor || 'Nhà cung cấp Việt Nam'),
      });
      ctx?.onDeliverable?.({ type: 'expense', id: exp.id, title: `${exp.expenseCode}: ${exp.title}` });
      return {
        ok: true,
        output: {
          expenseId: exp.id,
          expenseCode: exp.expenseCode,
          status: exp.status,
          flags: exp.flags,
          autoApproved: exp.status === 'approved',
        },
      };
    }

    case 'review_expense': {
      const expId = String(args.expenseId || '');
      const targetExp = store.expenses.find(
        (e) => e.id === expId || e.expenseCode.toUpperCase() === expId.toUpperCase()
      );
      if (!targetExp) return { ok: false, output: { error: `Không tìm thấy phiếu chi "${expId}".` } };
      const res = await store.accountantReviewExpense({
        expenseId: targetExp.id,
        reviewerId: agentId,
        decision: (['to_ceo', 'needs_info', 'rejected'].includes(String(args.decision))
          ? args.decision
          : 'to_ceo') as 'to_ceo' | 'needs_info' | 'rejected',
        note: args.note ? String(args.note) : undefined,
      });
      if (!res.ok) return { ok: false, output: { error: res.error } };
      const fresh = useCompanyStore.getState().expenses.find((e) => e.id === targetExp.id);
      return { ok: true, output: { expenseCode: targetExp.expenseCode, status: fresh?.status || 'pending_ceo' } };
    }

    case 'pay_expense': {
      const expId = String(args.expenseId || '');
      const targetExp = store.expenses.find(
        (e) => e.id === expId || e.expenseCode.toUpperCase() === expId.toUpperCase()
      );
      if (!targetExp) return { ok: false, output: { error: `Không tìm thấy phiếu chi "${expId}".` } };
      if (targetExp.status !== 'approved') {
        return { ok: false, output: { error: `Phiếu ${targetExp.expenseCode} chưa được CEO/Quy tắc duyệt (status: ${targetExp.status}).` } };
      }
      await store.markExpensePaid({
        expenseId: targetExp.id,
        actorId: agentId,
        note: args.note ? String(args.note) : undefined,
        attachmentName: args.attachmentName ? String(args.attachmentName) : undefined,
      });
      return { ok: true, output: { expenseCode: targetExp.expenseCode, status: 'paid' } };
    }

    case 'buy_domain':
    case 'subscribe_tool':
    case 'spend': {
      const expenseId = String(args.expenseId || '').trim();
      const amountVnd = Number(args.amountVnd || 0);
      const approvedExp = store.expenses.find(
        (e) =>
          (e.id === expenseId || e.expenseCode.toUpperCase() === expenseId.toUpperCase()) &&
          (e.status === 'approved' || e.status === 'paid' || e.status === 'reconciled')
      );
      if (!approvedExp) {
        await store.addAuditLog({
          id: `aud_gate_${now}`,
          agentId,
          agentName: agent.name,
          action: toolName,
          permission: 'budget:spend',
          resource: 'expense_gate',
          result: 'denied',
          reason: `Công cụ ${toolName} bị chặn do thiếu phiếu chi #CP-... đã duyệt.`,
          timestamp: now,
        });
        return {
          ok: false,
          output: {
            error: `Bị chặn chi tiền (${toolName}): Bắt buộc phải có phiếu chi #CP-... đã duyệt (truyền expenseId). Hãy gọi request_expense trước.`,
          },
        };
      }
      if (amountVnd > approvedExp.amountVnd) {
        return {
          ok: false,
          output: { error: `Số tiền vượt hạn mức đã duyệt trên ${approvedExp.expenseCode} (${formatVnd(approvedExp.amountVnd)}).` },
        };
      }
      if (approvedExp.status === 'approved') {
        await store.markExpensePaid({
          expenseId: approvedExp.id,
          actorId: agentId,
          note: `Thực chi qua tool ${toolName}`,
        });
      }
      return {
        ok: true,
        output: {
          executed: true,
          dryRun,
          expenseCode: approvedExp.expenseCode,
          amountVnd,
          target: args.domain || args.toolName || args.description,
        },
      };
    }

    case 'hire_agent': {
      const name = String(args.name || '').trim();
      const title = String(args.title || 'Chuyên viên AI').trim();
      const dept = (String(args.department || 'sales') as DepartmentId);
      const tpl = ROLE_TEMPLATES.find((t) => t.id === args.templateId || t.department === dept);
      const spec = buildNewAgentFromSpec({
        name: name || 'Nhân sự AI mới',
        title,
        department: dept,
        role: tpl?.role || 'Specialist',
        personalityNote: String(args.personalityNote || `Đảm nhiệm vị trí ${title} tại phòng ${dept}.`),
        templateId: tpl?.id,
        existingAgents: store.agents,
        departments: store.departments,
      });

      if (!store.settings.hrAutoDecide) {
        const aprId = `apr_hr_${now}`;
        await store.putApproval({
          id: aprId,
          type: 'hr_hire',
          title: `Đề xuất tuyển mới: ${spec.name} – ${spec.title}`,
          description: `Phòng ${dept} | Quyền: ${spec.defaultPermissions.length} quyền | Chi phí token dự kiến ~120.000–250.000đ/tháng.`,
          requestedBy: agentId,
          department: dept,
          payload: {
            specs: [
              {
                name: spec.name,
                title: spec.title,
                department: spec.department,
                role: spec.role,
                personalityNote: spec.personalityNote || spec.bio,
                templateId: spec.templateId,
              },
            ],
          },
          status: 'pending',
          createdAt: now,
        });
        return { ok: true, output: { requiresApproval: true, approvalId: aprId, candidateName: spec.name } };
      }

      const hired = await store.hireAgent({
        name: spec.name,
        title: spec.title,
        department: spec.department,
        role: spec.role,
        personalityNote: spec.personalityNote || spec.bio,
        templateId: spec.templateId,
        existingAgents: store.agents,
        departments: store.departments,
        actor: agent.name,
      });
      ctx?.onDeliverable?.({ type: 'agent', id: hired.id, title: `Nhân sự mới: ${hired.name} (${hired.title})` });
      return { ok: true, output: { agentId: hired.id, name: hired.name, title: hired.title, requiresApproval: false } };
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
      const kpi = await executeAgentTool(agentId, 'get_kpis', {}, ctx);
      return { ok: true, output: { title: String(args.title || 'Báo cáo tổng hợp'), kpis: kpi.output } };
    }

    case 'call_meeting': {
      const topic = String(args.topic || 'Họp điều phối liên phòng ban');
      return { ok: true, output: { meetingStarted: true, topic } };
    }

    case 'hubcw_read': {
      const mod = String(args.module || 'customers') as HubCwModuleId;
      if (!HUBCW_MODULE_MAP[mod]) {
        return { ok: false, output: { error: `Module Hub.ChuyenWeb không hợp lệ: '${mod}'.` } };
      }
      const extAcc = store.externalAccounts.find((e) => e.agentId === agentId);
      const envMode = store.settings.envMode;
      if (envMode !== 'sandbox' && (!extAcc || extAcc.status !== 'active')) {
        return {
          ok: false,
          output: {
            error: `Chưa có tài khoản Hub.ChuyenWeb hoạt động (trạng thái: ${extAcc?.status || 'unlinked'}). Vui lòng nhờ CEO liên kết tài khoản trước.`,
          },
        };
      }
      const modPerm = extAcc?.externalPermissions?.[mod];
      if (extAcc && (!modPerm || !modPerm.read)) {
        return {
          ok: false,
          output: { error: `Bạn không có quyền ĐỌC trên module '${HUBCW_MODULE_MAP[mod].label}'.` },
        };
      }

      const secret = await store.getDecryptedAgentSecret(agentId);
      const connector = createHubCwConnector(store.settings.hubcw.connectionMode, store.settings.hubcw.baseUrl);
      const res = await connector.readModule(
        {
          agentId,
          agentName: agent.name,
          externalUserId: extAcc?.externalUserId,
          credentialSecret: secret,
          requestId: `read_${now}_${Math.random().toString(36).slice(2, 6)}`,
        },
        mod,
        args.limit ? { limit: Number(args.limit) } : undefined
      );

      await store.addHubCwApiLog({
        id: `hcwlog_r_${now}_${Math.random().toString(36).slice(2, 6)}`,
        agentId,
        agentName: agent.name,
        externalUserId: extAcc?.externalUserId,
        module: mod,
        operation: 'read',
        method: 'GET',
        endpoint: HUBCW_MODULE_MAP[mod].readPath,
        envMode,
        connectionMode: store.settings.hubcw.connectionMode,
        result: res.ok ? 'ok' : 'error',
        statusCode: res.statusCode,
        reason: res.error,
        durationMs: 25,
        timestamp: now,
      });

      if (!res.ok) {
        return { ok: false, output: { error: res.error || 'Không đọc được dữ liệu từ HubCW.' } };
      }

      // Mask customer PII before feeding into LLM context
      const maskedItems = res.items.slice(0, Number(args.limit || 20)).map((item) => {
        const serialized = maskCustomerPiiForPrompt(JSON.stringify(item));
        try {
          return JSON.parse(serialized) as Record<string, unknown>;
        } catch {
          return item;
        }
      });

      return {
        ok: true,
        output: {
          module: mod,
          origin: res.origin,
          sourceLabel: res.sourceLabel,
          total: res.total ?? maskedItems.length,
          items: maskedItems,
        },
      };
    }

    case 'hubcw_write': {
      const mod = String(args.module || '') as HubCwModuleId;
      if (!HUBCW_MODULE_MAP[mod]) {
        return { ok: false, output: { error: `Module Hub.ChuyenWeb không hợp lệ: '${mod}'.` } };
      }
      const op = args.operation === 'update' ? 'update' : args.operation === 'delete' ? 'delete' : 'create';
      const payload = (args.payload && typeof args.payload === 'object' ? args.payload : {}) as Record<string, unknown>;
      const provenance: DataProvenance = {
        source: (args.provenanceSource as DataProvenance['source']) || 'unknown',
        refId: args.provenanceRefId ? String(args.provenanceRefId) : undefined,
        origin: payload.origin === 'simulated' ? 'simulated' : undefined,
        verifiedAt: now,
      };
      const rbacAcc = store.accounts.find((a) => a.agentId === agentId);
      const extAcc = store.externalAccounts.find((e) => e.agentId === agentId);
      const secret = await store.getDecryptedAgentSecret(agentId);
      const connector = createHubCwConnector(store.settings.hubcw.connectionMode, store.settings.hubcw.baseUrl);

      const outcome = await executeHubCwWrite(
        {
          agentId,
          agentName: agent.name,
          module: mod,
          operation: op,
          recordId: args.recordId ? String(args.recordId) : undefined,
          payload,
          origin: (payload.origin as OriginTag | undefined),
          provenance,
          expenseCode: args.expenseCode ? String(args.expenseCode) : undefined,
        },
        {
          settings: store.settings,
          rbacAccount: rbacAcc,
          externalAccount: extAcc,
          decryptedSecret: secret,
          expenses: store.expenses,
          recentApiLogs: store.hubcwApiLogs,
          connector,
          onWriteLog: (log) => store.addHubCwApiLog(log),
          onWriteAudit: (aud) => store.addAuditLog(aud),
          onSaveUndoSnapshot: (snap) => store.addHubCwUndoSnapshot(snap),
          onNotifyBlocked: async (req, reason) => {
            await store.addMessage({
              channelId: 'ask_ceo',
              senderId: agentId,
              senderName: agent.name,
              senderTitle: agent.title,
              department: agent.department,
              content: `**Cổng kiểm soát Hub.ChuyenWeb đã chặn lệnh ghi** vào \`${req.module}\`: ${reason}`,
              busType: 'escalation',
            });
          },
        }
      );

      if (!outcome.ok) {
        return {
          ok: false,
          output: {
            blocked: true,
            blockedCode: outcome.gateResult.blockedCode,
            error: outcome.gateResult.reason || outcome.writeResult?.error || 'Lệnh ghi bị Cổng kiểm soát từ chối.',
          },
        };
      }

      return {
        ok: true,
        output: {
          externalRecordId: outcome.writeResult?.externalRecordId,
          version: outcome.writeResult?.version,
          undoSnapshotId: outcome.undoSnapshotId,
          idempotencyKey: outcome.idempotencyKey,
        },
      };
    }

    case 'hubcw_sync': {
      const mod = String(args.module || 'tasks') as HubCwModuleId;
      const entityType = (String(args.entityType || 'task') as 'lead' | 'task' | 'order' | 'support' | 'cashflow' | 'report' | 'notification');
      const payload = (args.payload && typeof args.payload === 'object' ? args.payload : {}) as Record<string, unknown>;
      const queued = await store.enqueueHubCwSync({
        direction: 'push_to_hubcw',
        module: mod,
        agentId,
        entityType,
        payload,
        provenance: {
          source: (args.provenanceSource as DataProvenance['source']) || 'unknown',
          origin: store.settings.envMode === 'sandbox' ? 'simulated' : undefined,
          verifiedAt: now,
        },
      });
      return { ok: true, output: { syncId: queued.id, status: queued.status } };
    }

    case 'affiliate_search_offers': {
      const niche = String(args.niche || store.settings.affiliate.priorityNiches[0] || 'Gia dụng thông minh');
      const networkId = String(args.networkId || 'shopee');
      const res = await store.runAffiliateScoutCycle(niche, networkId);
      return {
        ok: true,
        output: {
          niche,
          networkId,
          foundCount: res.products.length,
          winCount: res.scores.filter((s) => s.label === 'win').length,
          topProduct: res.products[0]
            ? { id: res.products[0].id, name: res.products[0].name, score: res.scores[0]?.totalScore }
            : null,
        },
      };
    }

    case 'affiliate_create_link': {
      const productId = String(args.productId || '');
      const subId = String(args.subId || `sub_${now.toString(36).slice(-4)}`);
      try {
        const link = await store.createAffiliateTrackedLink({
          productId,
          subId,
          campaignId: args.campaignId ? String(args.campaignId) : undefined,
          createdBy: agentId,
        });
        return {
          ok: true,
          output: {
            linkId: link.id,
            subId: link.subId,
            affIdUsed: link.affIdUsed,
            isAffIdVerified: link.isAffIdVerified,
            shortUrl: link.shortUrl,
            affiliateUrl: link.affiliateUrl,
          },
        };
      } catch (err) {
        return { ok: false, output: { error: err instanceof Error ? err.message : 'Không thể tạo link Affiliate' } };
      }
    }

    case 'affiliate_check_links': {
      const summary = await store.checkAllAffiliateLinksHealth();
      return { ok: true, output: summary };
    }

    case 'affiliate_compliance_check': {
      const pieceId = String(args.contentPieceId || '');
      const piece = store.affiliateContent.find((c) => c.id === pieceId);
      if (!piece) return { ok: false, output: { error: 'Không tìm thấy nội dung Affiliate để kiểm duyệt.' } };
      const link = store.trackedLinks.find((l) => l.id === piece.trackedLinkId);
      const chk = runAffiliateComplianceCheck({
        piece,
        trackedLink: link,
        settings: store.settings.affiliate,
      });
      await store.putAffiliateContent({
        ...piece,
        complianceStatus: chk.passed ? 'passed' : 'blocked',
        complianceReasons: chk.reasons,
        reviewedBy: agentId,
      });
      return { ok: chk.passed, output: { passed: chk.passed, reasons: chk.reasons } };
    }

    case 'request_collab': {
      const targetDept = String(args.targetDepartment || 'marketing') as DepartmentId;
      const targetHead =
        store.agents.find((a) => a.department === targetDept && a.role === 'Dept Head' && a.employmentStatus !== 'archived') ||
        store.agents.find((a) => a.department === targetDept && a.employmentStatus !== 'archived') ||
        agent;
      const taskCode = `#T-${101 + store.tasks.length}`;
      const collabTask = {
        id: `task_col_${now}`,
        taskCode,
        title: `[Phối hợp ${agent.department} → ${targetDept}] ${String(args.title || 'Yêu cầu hỗ trợ')}`,
        description: String(args.description || ''),
        definitionOfDone: 'Hoàn tất đầu việc phối hợp liên khối và phản hồi trên kênh chung.',
        expectedDeliverable: 'Tài liệu / Thiết kế / SEO hỗ trợ',
        department: targetDept,
        assignedTo: targetHead.id,
        createdBy: agentId,
        status: 'todo' as const,
        priority: 'high' as const,
        etaMinutes: 20,
        etaAt: now + 20 * 60_000,
        progressPercent: 0,
        lastProgressAt: now,
        deliverables: [],
        createdAt: now,
        updatedAt: now,
      };
      await store.putTask(collabTask);
      await store.addMessage({
        channelId: targetDept,
        senderId: agentId,
        senderName: agent.name,
        senderTitle: agent.title,
        department: agent.department,
        content: `**Yêu cầu phối hợp liên khối (${taskCode}):** ${collabTask.title}\n${collabTask.description}`,
        busType: 'request',
      });
      return { ok: true, output: { taskId: collabTask.id, taskCode, assignedTo: targetHead.name } };
    }

    case 'legal_research': {
      const query = String(args.query || '').toLowerCase();
      const matched = store.legalDocuments.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.docNumber.toLowerCase().includes(query) ||
          d.keyArticlesSummary.some((k) => k.toLowerCase().includes(query))
      );
      const list = (matched.length > 0 ? matched : store.legalDocuments.slice(0, 4)).map((d) => ({
        docNumber: d.docNumber,
        title: d.title,
        effectiveStatus: d.effectiveStatus,
        sourceUrl: d.sourceUrl,
        lastCheckedAt: d.lastCheckedAt,
        summary: d.keyArticlesSummary,
      }));
      return { ok: true, output: { count: list.length, documents: list } };
    }

    case 'draft_contract': {
      const tplId = String(args.templateId || 'tpl_saas_preschool');
      const ctr = await store.draftNewContract({
        templateId: tplId,
        variant: (args.variant as 'seller_friendly' | 'balanced' | 'buyer_protective') || 'balanced',
        partyBInput: {
          name: args.partyBName ? String(args.partyBName) : undefined,
          taxCode: args.partyBTaxCode ? String(args.partyBTaxCode) : undefined,
        },
        contractValueVnd: Number(args.contractValueVnd || 0),
        involvesChildrenData: tplId.includes('preschool') || tplId.includes('dpa'),
        createdBy: agentId,
      });
      return {
        ok: true,
        output: {
          contractId: ctr.id,
          contractCode: ctr.contractCode,
          missingFields: ctr.missingFields,
          requiresRealLawyer: ctr.requiresRealLawyer,
        },
      };
    }

    case 'review_contract': {
      const contractId = String(args.contractId || '');
      const ctr = store.contracts.find((c) => c.id === contractId || c.contractCode === contractId);
      if (!ctr) return { ok: false, output: { error: 'Không tìm thấy hợp đồng cần rà soát.' } };
      const report = buildLegalReport({
        contract: ctr,
        reportType: 'contract_review',
        title: `Báo cáo rà soát ${ctr.contractCode}: ${ctr.title}`,
        legalDocs: store.legalDocuments,
        createdBy: agentId,
      });
      await store.putLegalReport(report);
      return {
        ok: true,
        output: {
          reportId: report.id,
          unverifiedExcludedCount: report.unverifiedExcludedCount,
          risksCount: report.risks.length,
          summaryFiveLines: report.summaryFiveLines,
        },
      };
    }

    case 'quality_review': {
      const cycle = await store.runQualityCycle({
        title: String(args.title || 'Kiểm định đầu ra'),
        department: agent.department,
        definitionOfDone: 'Đầy đủ số liệu thực tế, không còn [CẦN BỔ SUNG], đạt chuẩn bàn giao.',
        draftText: String(args.draftText || ''),
        makerId: agentId,
      });
      return {
        ok: cycle.status === 'approved',
        output: {
          cycleId: cycle.id,
          status: cycle.status,
          rounds: cycle.currentRound,
          finalSummary: cycle.finalSummary,
        },
      };
    }

    case 'council_vote': {
      const session = await store.conveneCouncil({
        topic: String(args.topic || 'Đánh giá phương án chiến lược'),
      });
      return {
        ok: true,
        output: {
          sessionId: session.id,
          status: session.status,
          winningOption: session.winningOption,
          summary: session.ceoExecutiveSummary,
        },
      };
    }

    case 'create_handover': {
      const toDept = String(args.toDepartment || 'legal') as DepartmentId;
      const targetHead =
        store.agents.find((a) => a.department === toDept && a.role === 'Dept Head' && a.employmentStatus === 'active') ||
        store.agents.find((a) => a.department === toDept && a.employmentStatus === 'active') ||
        agent;
      const ticket = await store.createHandoverTicket({
        fromDepartment: agent.department,
        toDepartment: toDept,
        fromAgentId: agentId,
        toAgentId: targetHead.id,
        title: String(args.title || 'Bàn giao đầu việc'),
        payloadSummary: String(args.payloadSummary || ''),
        slaMinutes: Number(args.slaMinutes || 30),
      });
      return {
        ok: true,
        output: {
          ticketId: ticket.id,
          code: ticket.code,
          toAgentName: targetHead.name,
          dueAt: ticket.dueAt,
        },
      };
    }

    case 'propose_money_plan': {
      const idea = await store.runIdleMoneyBrainstorm();
      return { ok: true, output: { ideaId: idea.id, title: idea.title, stage: idea.stage } };
    }

    case 'watch_competitor': {
      await store.runCompetitorWatchCycle();
      return { ok: true, output: { watchedCount: store.competitorWatches.length } };
    }

    case 'propose_upgrade': {
      const prop = await store.proposeSystemUpgrade({
        title: String(args.title || 'Đề xuất tối ưu quy trình'),
        proposedBy: agentId,
        bottleneckEvidence: String(args.bottleneckEvidence || 'Phát hiện nút thắt token/thời gian phản hồi.'),
        solutionSummary: String(args.solutionSummary || 'Áp dụng Playbook & bộ lọc chuẩn trước khi gọi tool.'),
        expectedRoi: String(args.expectedRoi || 'Giảm 20% token và thời gian xử lý'),
        beforeMetric: String(args.beforeMetric || 'Chưa đo'),
      });
      if (!prop) {
        return { ok: false, output: { error: 'Đề xuất bị chặn bởi rào chắn an toàn (cấm tự sửa mã nguồn/tự nâng quyền).' } };
      }
      return { ok: true, output: { proposalId: prop.id, code: prop.code, stage: prop.rolloutStage } };
    }

    case 'scout_git_repo': {
      const query = String(args.query || '').trim();
      if (!query) return { ok: false, output: { error: 'Thiếu từ khóa tìm repo.' } };
      const reports = await store.scoutGitRepo(query);
      return {
        ok: true,
        output: {
          count: reports.length,
          reports: reports.map((r) => ({
            id: r.id,
            repo: r.repoFullName,
            stars: r.stars,
            license: r.license,
            verificationLabel: r.verificationLabel,
          })),
        },
      };
    }

    case 'run_device_action': {
      const deviceId = String(args.deviceId || store.managedDevices[0]?.id || '');
      const res = await store.executeDeviceCommand({
        deviceId,
        agentId,
        action: (args.action as never) || 'screenshot',
        text: args.text ? String(args.text) : undefined,
        packageName: args.packageName ? String(args.packageName) : undefined,
      });
      return {
        ok: res.ok,
        output: { error: res.error, ocrText: res.ocrText, hasScreenshot: Boolean(res.screenshotDataUrl) },
      };
    }

    case 'send_zalo_personal': {
      const zaloMsgText = String(args.text || '');
      if (
        store.settings.hrAutonomy?.requireExamPassForLive &&
        agent.probationStatus &&
        agent.probationStatus !== 'passed' &&
        store.settings.envMode === 'live'
      ) {
        return {
          ok: false,
          output: {
            sent: false,
            error: `${agent.name} chưa vượt qua Onboarding Exam — bị chặn gửi Zalo LIVE.`,
          },
        };
      }
      const zaloClaimRes = checkOutgoingClaimsAndBankSafety({
        text: zaloMsgText,
        product: store.productMasters[0],
        bankAccounts: store.bankAccounts,
      });
      if (!zaloClaimRes.passed) {
        return {
          ok: false,
          output: {
            sent: false,
            error: `Chặn gửi Zalo do vi phạm Product Master / An toàn STK: ${zaloClaimRes.violations.map((v) => v.rule).join('; ')}`,
          },
        };
      }
      const zaloSop = store.roleSops.find((s) => s.department === agent.department);
      const zaloSopRes = checkOutputAgainstSop(zaloMsgText, zaloSop);
      if (!zaloSopRes.compliant) {
        return {
          ok: false,
          output: {
            sent: false,
            error: `Chặn gửi Zalo do vi phạm SOP: ${zaloSopRes.violations.join('; ')}`,
          },
        };
      }
      const res = await store.sendZaloPersonalMessage({
        peerId: String(args.peerId || ''),
        peerName: String(args.peerName || 'Khách hàng'),
        text: zaloMsgText,
        agentId,
        isReplyToInbound: Boolean(args.isReplyToInbound),
        isColdMarketing: !args.isReplyToInbound,
      });
      return { ok: res.ok, output: { sent: res.ok, error: res.error } };
    }

    default:
      return { ok: false, output: { error: `Tool '${toolName}' chưa hỗ trợ` } };
  }
}

export { PRODUCTS };
