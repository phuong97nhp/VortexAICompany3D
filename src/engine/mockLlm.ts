import { PRODUCTS } from '../config/products';
import { getLiveAgentById } from './liveRegistry';
import { LlmChatMessage } from './llm/types';
import { foldVietnamese } from './roleTemplates';

export interface MockLlmInput {
  agentId: string;
  userPrompt: string;
  messages?: LlmChatMessage[];
  model: 'deepseek-chat' | 'deepseek-reasoner';
  hasTools?: boolean;
  allowedToolNames?: string[];
}

export interface MockToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface MockLlmOutput {
  content: string;
  reasoningContent?: string;
  toolCalls?: MockToolCall[];
}

function detectProductFromText(lower: string) {
  if (lower.includes('mam non') || lower.includes('nha tre') || lower.includes('phu huynh')) {
    return PRODUCTS.find((p) => p.id === 'preschool-care') || PRODUCTS[0];
  }
  if (lower.includes('kho') || lower.includes('sku') || lower.includes('ton kho') || lower.includes('ban le')) {
    return PRODUCTS.find((p) => p.id === 'warehouse-pro') || PRODUCTS[0];
  }
  if (lower.includes('web') || lower.includes('landing') || lower.includes('thiet ke web')) {
    return PRODUCTS.find((p) => p.id === 'web-design') || PRODUCTS[0];
  }
  return PRODUCTS.find((p) => lower.includes(foldVietnamese(p.shortName)) || lower.includes(p.id)) || PRODUCTS[0];
}

function summarizeToolOutputs(messages: LlmChatMessage[], agentName: string): string {
  const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
  const sliceFrom = lastUserIdx >= 0 ? messages.length - 1 - lastUserIdx : 0;
  const toolMsgs = messages.slice(sliceFrom).filter((m) => m.role === 'tool');

  if (toolMsgs.length === 0) return '';

  const lines: string[] = [];
  let hasErrors = false;
  let allFailed = true;

  for (const tm of toolMsgs) {
    try {
      const parsed = JSON.parse(tm.content) as { ok?: boolean; output?: Record<string, unknown> };
      const ok = parsed.ok !== false;
      const out = parsed.output || {};
      if (ok) allFailed = false;
      else hasErrors = true;

      if (!ok) {
        lines.push(`- **${tm.name || 'Công cụ'} chưa chạy được:** ${String(out.error || 'Lỗi không xác định')}`);
        continue;
      }

      switch (tm.name) {
        case 'find_leads': {
          const count = Number(out.foundCount || 0);
          const list = Array.isArray(out.leads) ? (out.leads as Array<{ name: string; province: string; score: number }>) : [];
          lines.push(`- Đã tìm và lưu **${count} Lead** vào CRM (${list.slice(0, 3).map((l) => `${l.name} - ${l.province} (${l.score}đ)`).join('; ')}${list.length > 3 ? ` và ${list.length - 3} đơn vị khác` : ''}).`);
          break;
        }
        case 'write_document': {
          lines.push(`- Đã lưu tài liệu **"${String(out.title || 'Tài liệu mới')}"** (ID: \`${String(out.documentId || '')}\`) vào Kho tài liệu.`);
          break;
        }
        case 'create_task':
        case 'assign_task': {
          lines.push(`- Đã tạo task **${String(out.taskCode || out.taskId || '')}** giao cho **${String(out.assignedTo || 'nhân sự')}**.`);
          break;
        }
        case 'request_expense': {
          lines.push(`- Đã lập phiếu chi **${String(out.expenseCode || '')}** (trạng thái: \`${String(out.status || 'pending_accountant')}\`).${Array.isArray(out.flags) && out.flags.length ? ` Cảnh báo: ${(out.flags as string[]).join('; ')}` : ''}`);
          break;
        }
        case 'review_expense': {
          lines.push(`- Đã thẩm định phiếu chi **${String(out.expenseCode || '')}** → trạng thái mới: \`${String(out.status || '')}\`.`);
          break;
        }
        case 'get_kpis': {
          lines.push(`- Số liệu thực từ DB: **${String(out.totalLeads ?? 0)} Lead**, **${String(out.wonDeals ?? 0)} Hợp đồng**, doanh thu ước tính **${Number(out.revenueVnd || 0).toLocaleString('vi-VN')}đ**, token hôm nay: **${Number(out.todayTokens || 0).toLocaleString('vi-VN')}**.`);
          break;
        }
        case 'create_quote': {
          lines.push(`- Đã xuất báo giá nháp vào Kho tài liệu (ID: \`${String(out.documentId || '')}\`) — giá sau ưu đãi **${Number(out.finalPrice || 0).toLocaleString('vi-VN')}đ/tháng** (đã gửi hàng chờ duyệt).`);
          break;
        }
        case 'generate_brand_kit': {
          lines.push(`- Đã xuất **Brand Launch Kit** cho **${String(out.brandName || '')}** (${String(out.handle || '')}) vào Kho tài liệu.`);
          break;
        }
        case 'schedule_social_post': {
          lines.push(`- Đã lên lịch bài đăng MXH (ID: \`${String(out.postId || '')}\`, trạng thái: \`${String(out.status || '')}\`).`);
          break;
        }
        case 'hire_agent': {
          lines.push(
            out.requiresApproval
              ? `- Đã trình **Đề xuất tuyển dụng** lên CEO duyệt trước khi khởi tạo nhân sự.`
              : `- Đã tuyển mới **${String(out.name || '')}** (${String(out.title || '')}) và bố trí bàn làm việc 3D.`
          );
          break;
        }
        default: {
          lines.push(`- **${tm.name || 'Kết quả'}:** ${JSON.stringify(out).slice(0, 140)}`);
        }
      }
    } catch {
      lines.push(`- **${tm.name || 'Kết quả'}:** ${tm.content.slice(0, 140)}`);
    }
  }

  if (allFailed) {
    return `${agentName} báo cáo trung thực: **Chưa thể hoàn tất yêu cầu** do gặp chặn/lỗi sau:\n${lines.join('\n')}\n\nĐề xuất bước tiếp theo: Kiểm tra quyền RBAC, phiếu chi được duyệt hoặc tham số đầu vào trước khi chạy lại.`;
  }

  return `${agentName} báo cáo kết quả thực thi${hasErrors ? ' (một phần chưa hoàn thành)' : ''}:\n${lines.join('\n')}`;
}

export function runMockVietnameseLlm(input: MockLlmInput): MockLlmOutput {
  const agent = getLiveAgentById(input.agentId);
  const agentName = agent?.name || input.agentId;
  const lower = foldVietnamese(input.userPrompt);
  const product = detectProductFromText(lower);

  if (input.model === 'deepseek-reasoner') {
    return {
      content: `Kế hoạch hành động cho ${agentName}:
1. Xác định rõ đầu ra thực tế cần tạo trong hệ thống cho ${product.name}.
2. Gọi công cụ đúng quyền RBAC (nếu chi tiền phải lập phiếu chi qua Kế toán & CEO).
3. Kiểm tra đầu ra thực trong DB trước khi báo cáo CEO.`,
      reasoningContent: `Phân tích yêu cầu: "${input.userPrompt.slice(0, 120)}". Không tự nhận xong khi chưa có deliverable thực.`,
    };
  }

  // Step 2+: If tool outputs already exist for the latest user turn, summarize ONLY real tool outputs
  if (input.messages && input.messages.length > 0) {
    const lastUserIdx = [...input.messages].reverse().findIndex((m) => m.role === 'user');
    const sliceFrom = lastUserIdx >= 0 ? input.messages.length - 1 - lastUserIdx : 0;
    const recentTools = input.messages.slice(sliceFrom).filter((m) => m.role === 'tool');
    if (recentTools.length > 0) {
      return {
        content: summarizeToolOutputs(input.messages, agentName),
      };
    }
  }

  const canUse = (tool: string) =>
    Boolean(input.hasTools) && (!input.allowedToolNames || input.allowedToolNames.includes(tool));

  // Step 1: Dispatch concrete real tool calls instead of canned fake text
  const countMatch = lower.match(/(\d+)\s*(?:lead|khach|trung tam|truong|cong ty|doanh nghiep|don vi)/);
  const requestedCount = countMatch ? Math.min(30, Math.max(1, Number(countMatch[1]))) : 5;

  if ((lower.includes('tim') || lower.includes('san') || lower.includes('quét') || lower.includes('quet')) &&
      (lower.includes('lead') || lower.includes('khach') || lower.includes('trung tam') || lower.includes('mam non') || lower.includes('kho') || lower.includes('doanh nghiep')) &&
      canUse('find_leads')) {
    const province = lower.includes('ha noi')
      ? 'Hà Nội'
      : lower.includes('da nang')
      ? 'Đà Nẵng'
      : lower.includes('can tho')
      ? 'Cần Thơ'
      : 'TP.HCM';
    return {
      content: '',
      toolCalls: [
        {
          id: `tc_find_${Date.now()}`,
          name: 'find_leads',
          arguments: { productId: product.id, province, count: requestedCount },
        },
      ],
    };
  }

  if ((lower.includes('xin chi') || lower.includes('phieu chi') || lower.includes('mua tool') || lower.includes('mua domain') || lower.includes('chay ads') || lower.includes('quang cao')) &&
      canUse('request_expense')) {
    const amtMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(tr|trieu|m|k|nghin)?/);
    let amountVnd = 500_000;
    if (amtMatch) {
      const num = Number(amtMatch[1].replace(',', '.'));
      const unit = amtMatch[2] || '';
      amountVnd = unit.startsWith('tr') || unit === 'm' ? num * 1_000_000 : unit === 'k' || unit.startsWith('ngh') ? num * 1_000 : num > 1000 ? num : num * 1_000;
    }
    const category = lower.includes('domain') || lower.includes('hosting')
      ? 'Tên miền / Hosting'
      : lower.includes('ads') || lower.includes('quang cao')
      ? 'Quảng cáo'
      : 'Công cụ / SaaS';
    return {
      content: '',
      toolCalls: [
        {
          id: `tc_exp_${Date.now()}`,
          name: 'request_expense',
          arguments: {
            title: input.userPrompt.slice(0, 80),
            category,
            amountVnd: Math.max(50_000, Math.round(amountVnd)),
            vendor: lower.includes('facebook') || lower.includes('meta') ? 'Meta Ads Vietnam' : lower.includes('canva') ? 'Canva Pty Ltd' : 'Nhà cung cấp dịch vụ VN',
            justification: `Đề xuất theo yêu cầu CEO: ${input.userPrompt.slice(0, 120)}`,
            expectedRoi: `Tạo tăng trưởng Lead / năng suất cho ${product.shortName}`,
          },
        },
      ],
    };
  }

  if (lower.includes('bao gia') && canUse('create_quote')) {
    return {
      content: '',
      toolCalls: [
        {
          id: `tc_quote_${Date.now()}`,
          name: 'create_quote',
          arguments: { productId: product.id, tierIndex: 1, discountPercent: 0 },
        },
      ],
    };
  }

  if ((lower.includes('brand') || lower.includes('thuong hieu') || lower.includes('bo nhan dien')) && canUse('generate_brand_kit')) {
    return {
      content: '',
      toolCalls: [{ id: `tc_brand_${Date.now()}`, name: 'generate_brand_kit', arguments: {} }],
    };
  }

  if ((lower.includes('lich dang') || lower.includes('len lich') || lower.includes('dang bai')) && canUse('schedule_social_post')) {
    return {
      content: '',
      toolCalls: [
        {
          id: `tc_post_${Date.now()}`,
          name: 'schedule_social_post',
          arguments: {
            platform: lower.includes('tiktok') ? 'tiktok' : lower.includes('zalo') ? 'zalo_oa' : 'facebook',
            dayNumber: 6,
            title: `Giải pháp ${product.shortName}: Tối ưu vận hành ngay hôm nay`,
            content: `${product.tagline}\n\n${product.strengths.slice(0, 2).map((s) => `• ${s}`).join('\n')}\n\nĐăng ký dùng thử 14 ngày miễn phí.`,
            hasPricingOrClaim: false,
          },
        },
      ],
    };
  }

  if ((lower.includes('viet') || lower.includes('soan') || lower.includes('ke hoach') || lower.includes('chien luoc') || lower.includes('nghien cuu') || lower.includes('kich ban') || lower.includes('faq') || lower.includes('seo')) &&
      canUse('write_document')) {
    const category = lower.includes('seo')
      ? 'seo'
      : lower.includes('nghien cuu')
      ? 'research'
      : lower.includes('faq')
      ? 'faq'
      : lower.includes('ke hoach') || lower.includes('chien luoc')
      ? 'strategy'
      : 'content';
    const docContent = [
      `# ${input.userPrompt.slice(0, 90)}`,
      `**Phụ trách:** ${agentName} (${agent?.title || 'AI Agent'})`,
      `**Sản phẩm trọng tâm:** ${product.name}`,
      ``,
      `## 1. Phân tích & Định hướng thực thi`,
      `- Phân khúc mục tiêu: ${product.targetAudience.join(', ')}`,
      `- Điểm mạnh nổi bật: ${product.strengths.slice(0, 3).join(' | ')}`,
      ``,
      `## 2. Nội dung triển khai chi tiết`,
      `1. **Bước 1 – Chuẩn bị dữ liệu & thông điệp:** Bám sát bài toán thực tế tại Việt Nam (${product.tagline}).`,
      `2. **Bước 2 – Triển khai đa kênh:** Kết hợp Zalo OA, Facebook Fanpage và gọi demo 1-1.`,
      `3. **Bước 3 – Đo lường KPI:** Theo dõi tỷ lệ phản hồi, lịch demo và doanh số chuyển đổi trong CRM.`,
      ``,
      `## 3. Gói giá tham khảo`,
      ...product.tiers.map((t) => `- **${t.name}**: ${t.priceLabel} (${t.targetCustomer})`),
    ].join('\n');

    return {
      content: '',
      toolCalls: [
        {
          id: `tc_doc_${Date.now()}`,
          name: 'write_document',
          arguments: {
            title: `${input.userPrompt.slice(0, 68)} – ${product.shortName}`,
            category,
            productId: product.id,
            content: docContent,
          },
        },
      ],
    };
  }

  if ((lower.includes('kpi') || lower.includes('bao cao') || lower.includes('tinh hinh') || lower.includes('doanh thu')) && canUse('get_kpis')) {
    return {
      content: '',
      toolCalls: [{ id: `tc_kpi_${Date.now()}`, name: 'get_kpis', arguments: {} }],
    };
  }

  if (agent?.id === 'secretary' && canUse('assign_task')) {
    const target = lower.includes('marketing') || lower.includes('bai') || lower.includes('seo')
      ? 'cmo'
      : lower.includes('chi') || lower.includes('ke toan') || lower.includes('ngan sach')
      ? 'cfo'
      : 'sales_director';
    return {
      content: '',
      toolCalls: [
        {
          id: `tc_assign_${Date.now()}`,
          name: 'assign_task',
          arguments: {
            title: input.userPrompt.slice(0, 90),
            description: `Chỉ đạo từ CEO qua Thư ký: ${input.userPrompt}`,
            assignedTo: target,
            priority: 'high',
          },
        },
      ],
    };
  }

  // Purely informational Q&A response when no tool is needed
  return {
    content: `**${agentName} (${agent?.title || 'Nhân sự'})**: Em đã đọc kỹ nội dung *"${input.userPrompt.slice(0, 120)}"*. Hiện đây là trao đổi/hỏi đáp trực tiếp chưa tạo file hay dữ liệu mới; nếu Chủ tịch muốn em tạo tài liệu, tìm lead hoặc lập phiếu chi cụ thể, hãy giao rõ yêu cầu để em chạy tool ngay ạ.`,
  };
}
