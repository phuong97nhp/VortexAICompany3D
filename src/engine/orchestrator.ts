import { AGENTS, getAgentById } from '../agents';
import { DEPARTMENTS } from '../config/departments';
import { getProductById, PRODUCTS } from '../config/products';
import { useCompanyStore } from '../store/useCompanyStore';
import { ChatChannelId, WorkflowTrace } from '../types';
import { getTaskGroupForAgent, llmClient, LlmChatMessage } from './llm';
import { executeAgentTool, getToolsForAgent } from './tools';
import { ensureMarketingAskCeoHook, runBrandAndChannelLaunch, runMarketingAutopilotCycle } from './marketingEngine';

let autopilotTimer: number | null = null;
let overdueTimer: number | null = null;

function sleepScaled(ms: number): Promise<void> {
  const speed = useCompanyStore.getState().settings.simulationSpeed || 1;
  return new Promise((resolve) => setTimeout(resolve, Math.max(80, Math.round(ms / speed))));
}

/**
 * Single Agent Cognitive Loop via Unified Multi-Provider LLMRouter:
 * - Resolves role-based provider + model from settings.roleRoutes
 * - If resolved provider is DeepSeek and agent.usesReasoner, runs deepseek-reasoner (no tools) -> deepseek-chat (with tools)
 * - If Gemini / Local / Mock, runs directly with standardized tool calling (native or JSON-tool mode)
 */
export async function runSingleAgentTurn(
  agentId: string,
  userInstruction: string,
  channelId: ChatChannelId = 'all',
  opts?: { isInternalPeek?: boolean }
): Promise<string> {
  const store = useCompanyStore.getState();
  if (store.settings.killSwitchActive || store.settings.paused) {
    return 'Hệ thống đang tạm dừng hoặc KILL SWITCH đang bật.';
  }

  const agent = getAgentById(agentId);
  if (!agent) return 'Không tìm thấy nhân sự AI.';

  const account = store.accounts.find((a) => a.agentId === agentId);
  if (account?.status === 'suspended') {
    return `Tài khoản ${agent.name} đang bị tạm khóa bởi CEO.`;
  }

  store.setAgentStatus(agentId, 'thinking', 'Đang phân tích...', userInstruction.slice(0, 48), 25);

  const mem = store.agentMemories[agentId];
  const companyCtx = store.companyMemories.map((m) => `- ${m.key}: ${m.content}`).join('\n');
  const productCtx = PRODUCTS.map(
    (p) => `[${p.code}] ${p.shortName}: ${p.tagline} (Giá từ ${p.tiers[0].priceLabel})`
  ).join('\n');

  const taskGroup = getTaskGroupForAgent(agentId);
  const route = store.settings.roleRoutes?.find((r) => r.group === taskGroup);
  const resolvedProvider = store.settings.primaryProvider === 'mock' ? 'mock' : route?.provider || store.settings.primaryProvider;

  let planText = '';
  // DeepSeek reasoner planning pass for leadership agents when route uses DeepSeek
  if (agent.usesReasoner && resolvedProvider === 'deepseek') {
    try {
      const planRes = await llmClient.chat({
        agentId,
        department: agent.department,
        model: 'deepseek-reasoner',
        messages: [
          {
            role: 'system',
            content: `${agent.systemPrompt}\nHãy lập kế hoạch hành động ngắn gọn (3-5 bước) bằng tiếng Việt.`,
          },
          { role: 'user', content: userInstruction },
        ],
      });
      planText = planRes.content;
    } catch {
      planText = '';
    }
  }

  store.setAgentStatus(agentId, 'typing', 'Đang soạn phản hồi...', undefined, 60);

  const tools = getToolsForAgent(agent.allowedTools);
  const messages: LlmChatMessage[] = [
    {
      role: 'system',
      content: `${agent.systemPrompt}\n\nBối cảnh công ty:\n${companyCtx}\n\nDanh mục 4 sản phẩm:\n${productCtx}\n\nBộ nhớ của bạn:\n${mem?.longTermSummary || ''}\n${(mem?.shortTerm || []).slice(-3).join('; ')}`,
    },
    {
      role: 'user',
      content: planText
        ? `Yêu cầu: ${userInstruction}\n\nKế hoạch sơ bộ từ bước suy luận:\n${planText}\n\nHãy thực thi (dùng tool nếu cần) và báo cáo ngắn gọn bằng tiếng Việt có dấu.`
        : userInstruction,
    },
  ];

  let finalReply = '';
  try {
    for (let step = 0; step < 4; step++) {
      if (useCompanyStore.getState().settings.killSwitchActive) break;

      const res = await llmClient.chat({
        agentId,
        department: agent.department,
        model: resolvedProvider === 'deepseek' && agent.usesReasoner ? 'deepseek-chat' : undefined,
        messages,
        tools,
      });

      if (res.content) {
        finalReply = res.content;
      }

      if (!res.toolCalls || res.toolCalls.length === 0) {
        break;
      }

      for (const tc of res.toolCalls.slice(0, 3)) {
        const toolResult = await executeAgentTool(agentId, tc.name as never, tc.arguments);
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.name,
          content: JSON.stringify(toolResult),
        });
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Lỗi xử lý Agent';
    store.setAgentStatus(agentId, 'error', 'Gặp sự cố xử lý', undefined, 0);
    setTimeout(() => {
      const cur = useCompanyStore.getState().runtimes[agentId];
      if (cur && cur.status === 'error') useCompanyStore.getState().setAgentStatus(agentId, 'idle');
    }, 3200);
    return errMsg;
  }

  store.setAgentStatus(agentId, 'talking', finalReply.slice(0, 42) + '...', undefined, 88);
  await store.addMessage({
    channelId,
    senderId: agentId,
    senderName: agent.name,
    senderTitle: agent.title,
    department: agent.department,
    content: finalReply || 'Em đã tiếp nhận và hoàn tất xử lý yêu cầu ạ.',
    busType: 'chat',
    isInternalPeek: opts?.isInternalPeek,
  });
  await store.appendAgentMemory(agentId, `Xử lý: ${userInstruction.slice(0, 60)}`);

  setTimeout(() => {
    const cur = useCompanyStore.getState().runtimes[agentId];
    if (cur && cur.status !== 'blocked') {
      useCompanyStore.getState().setAgentStatus(agentId, 'done', undefined, undefined, 100);
      setTimeout(() => {
        const after = useCompanyStore.getState().runtimes[agentId];
        if (after && after.status === 'done') {
          useCompanyStore.getState().setAgentStatus(agentId, 'idle', undefined, undefined, 0);
        }
      }, 2600);
    }
  }, 1500);

  return finalReply;
}

/**
 * Inter-department Meeting Simulation in Room Meeting (Floor 1)
 */
export async function runDepartmentMeeting(
  topic: string,
  participantIds: string[] = ['secretary', 'cmo', 'sales_director', 'pm', 'support_lead', 'cfo', 'data_analyst']
): Promise<void> {
  const store = useCompanyStore.getState();
  if (store.settings.killSwitchActive) return;

  store.selectRoom('room-meeting');
  await store.addMessage({
    channelId: 'meeting',
    senderId: 'secretary',
    senderName: 'Nguyễn Minh Anh',
    senderTitle: 'Thư ký CEO',
    department: 'exec',
    content: `🔔 **Triệu tập cuộc họp liên phòng ban tại Phòng Họp Lớn (Tầng 1)**\nChủ đề: *${topic}*\nThành phần: ${participantIds
      .map((id) => getAgentById(id)?.name)
      .filter(Boolean)
      .join(', ')}`,
    busType: 'request',
  });

  participantIds.forEach((id, idx) => {
    store.walkAgentToMeetingSeat(id, idx);
  });

  await sleepScaled(2600);
  if (useCompanyStore.getState().settings.killSwitchActive) return;

  const minutesLines: string[] = [
    `# BIÊN BẢN HỌP LIÊN PHÒNG BAN`,
    `**Chủ đề:** ${topic}`,
    `**Thời gian:** ${new Date().toLocaleString('vi-VN')}`,
    ``,
    `## Ý kiến các phòng ban`,
  ];

  const turnStatements: Record<string, string> = {
    secretary: `Thống nhất mục tiêu theo chỉ đạo Chủ tịch: tập trung chuyển đổi nhanh cho ${topic}, báo cáo tiến độ hằng ngày.`,
    cmo: `Marketing sẽ triển khai bộ landing page, từ khóa SEO và nội dung Social (trình CEO duyệt trước khi đăng công khai).`,
    sales_director: `Phòng Sales cam kết 30 lead mới/ngày, ưu tiên Trung tâm Ngoại ngữ & trường học, SDR chạy đúng khung 8h–20h.`,
    pm: `Product đã chuẩn bị sẵn tài khoản demo sandbox dữ liệu mẫu để AE trình diễn 1-1 cho khách ngay.`,
    support_lead: `CSKH đã hoàn tất bộ FAQ 15 câu hỏi thường gặp và quy trình nhập Excel trong 24h cho khách mới.`,
    cfo: `Tài chính kiểm soát ngân sách token và rà soát chiết khấu; mọi giảm giá ngoài bảng giá sẽ trình Chủ tịch phê duyệt.`,
    data_analyst: `Hệ thống Data đã gắn tracking phễu chuyển đổi từ Lead mới → Demo → Chốt deal hiển thị trực tiếp trên màn hình KPI.`,
  };

  for (const id of participantIds) {
    if (useCompanyStore.getState().settings.killSwitchActive) break;
    const agent = getAgentById(id);
    if (!agent) continue;
    const line = turnStatements[id] || `${agent.name} xác nhận phối hợp theo phân công.`;
    store.setAgentStatus(id, 'in_meeting', line.slice(0, 38) + '...', `Họp: ${topic.slice(0, 26)}`, 60);
    await store.addMessage({
      channelId: 'meeting',
      senderId: id,
      senderName: agent.name,
      senderTitle: agent.title,
      department: agent.department,
      content: line,
      busType: 'chat',
    });
    minutesLines.push(`- **${agent.name} (${agent.title}):** ${line}`);
    await sleepScaled(900);
  }

  const actionItems = [
    { assignedTo: 'market_research', title: `Nghiên cứu đối thủ & insight cho: ${topic}` },
    { assignedTo: 'lead_hunter_edu', title: `Tìm 15 lead trung tâm ngoại ngữ cho: ${topic}` },
    { assignedTo: 'support_lead', title: `Cập nhật bộ FAQ hỗ trợ triển khai cho: ${topic}` },
  ];

  minutesLines.push('', '## Action Items (Đã tự động tạo Task)');
  for (const item of actionItems) {
    await executeAgentTool('secretary', 'create_task', {
      title: item.title,
      assignedTo: item.assignedTo,
      priority: 'high',
    });
    const ag = getAgentById(item.assignedTo);
    minutesLines.push(`- [ ] **${ag?.name}**: ${item.title}`);
  }

  const minutesDocId = `doc_meeting_${Date.now()}`;
  await store.putDocument({
    id: minutesDocId,
    title: `Biên bản họp: ${topic}`,
    category: 'meeting_minutes',
    authorId: 'secretary',
    department: 'exec',
    content: minutesLines.join('\n'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  await store.addMessage({
    channelId: 'meeting',
    senderId: 'secretary',
    senderName: 'Nguyễn Minh Anh',
    senderTitle: 'Thư ký CEO',
    department: 'exec',
    content: `Đã tổng hợp **Biên bản họp** và tạo tự động ${actionItems.length} nhiệm vụ lên Task Board.`,
    busType: 'report',
    cardType: 'meeting_minutes',
    cardData: { documentId: minutesDocId, topic, actionItems },
  });

  await sleepScaled(1200);
  participantIds.forEach((id) => store.returnAgentToDesk(id));
}

/**
 * Full 30-day Campaign Demo Scenario ("Chạy demo")
 */
export async function runCampaignDemoScenario(productId: string): Promise<void> {
  const store = useCompanyStore.getState();
  if (store.settings.killSwitchActive) {
    store.setBannerAlert('Hãy tắt KILL SWITCH trước khi chạy kịch bản Demo.');
    return;
  }
  const product = getProductById(productId);
  const wfId = `wf_demo_${Date.now()}`;

  const steps: WorkflowTrace['steps'] = [
    { agentId: 'secretary', agentName: 'Nguyễn Minh Anh', label: 'Tiếp nhận & Kickoff', status: 'running', timestamp: Date.now() },
    { agentId: 'market_research', agentName: 'Phạm Hải Đăng', label: 'Nghiên cứu thị trường', status: 'pending', timestamp: Date.now() },
    { agentId: 'cmo', agentName: 'Lê Thảo Vy', label: 'Chiến lược Marketing', status: 'pending', timestamp: Date.now() },
    { agentId: 'content_writer', agentName: 'Vũ Ngọc Hà', label: 'Content / SEO / Social / Ads', status: 'pending', timestamp: Date.now() },
    { agentId: 'sales_director', agentName: 'Nguyễn Hoàng Long', label: 'Lead & Kịch bản chốt Sales', status: 'pending', timestamp: Date.now() },
    { agentId: 'pm', agentName: 'Đặng Hữu Phước', label: 'Chuẩn hóa bản Demo Product', status: 'pending', timestamp: Date.now() },
    { agentId: 'cfo', agentName: 'Đoàn Thu Trang', label: 'Dự toán & Xin duyệt CEO', status: 'pending', timestamp: Date.now() },
    { agentId: 'support_lead', agentName: 'Cao Nhật Minh', label: 'Bộ FAQ CSKH', status: 'pending', timestamp: Date.now() },
    { agentId: 'data_analyst', agentName: 'Lý Hoàng Nam', label: 'Tổng hợp KPI & Báo cáo CEO', status: 'pending', timestamp: Date.now() },
  ];

  const updateWf = async (idx: number, status: 'running' | 'done') => {
    steps[idx].status = status;
    steps[idx].timestamp = Date.now();
    if (status === 'done' && idx + 1 < steps.length) {
      steps[idx + 1].status = 'running';
    }
    await store.putWorkflow({ id: wfId, title: `Chiến dịch 30 ngày: ${product.shortName}`, steps: [...steps], createdAt: Date.now() });
  };

  await store.putWorkflow({ id: wfId, title: `Chiến dịch 30 ngày: ${product.shortName}`, steps: [...steps], createdAt: Date.now() });

  await store.addMessage({
    channelId: 'all',
    senderId: 'ceo',
    senderName: 'Chủ tịch (CEO)',
    senderTitle: 'CEO',
    department: 'ceo',
    content: `Ra mắt chiến dịch bán **${product.name}** trong 30 ngày. Toàn công ty phối hợp triển khai và báo cáo lại cho tôi.`,
    busType: 'request',
  });

  await store.addMessage({
    channelId: 'all',
    senderId: 'secretary',
    senderName: 'Nguyễn Minh Anh',
    senderTitle: 'Thư ký CEO',
    department: 'exec',
    content: `Đang khởi chạy chuỗi điều phối đa phòng ban cho chiến dịch **${product.shortName}** (30 ngày).`,
    busType: 'report',
    cardType: 'timeline',
    cardData: { workflowId: wfId },
  });

  store.setAgentStatus('secretary', 'thinking', 'Lập kế hoạch kickoff...', product.shortName, 40);
  await sleepScaled(900);
  await updateWf(0, 'done');
  await runDepartmentMeeting(`Kickoff chiến dịch 30 ngày: ${product.shortName}`);
  if (useCompanyStore.getState().settings.killSwitchActive) return;

  store.setAgentStatus('market_research', 'typing', 'Phân tích thị trường...', 'Nghiên cứu đối thủ', 65);
  await executeAgentTool('market_research', 'write_document', {
    title: `Báo cáo Nghiên cứu Thị trường – ${product.shortName}`,
    category: 'research',
    productId: product.id,
    content: `# Nghiên cứu Thị trường: ${product.name}\n\n## Khách hàng mục tiêu\n${product.targetAudience.map((a) => `- ${a}`).join('\n')}\n\n## Nỗi đau chính (Pain Points)\n1. Quản lý thủ công bằng Excel dễ sai sót, mất 10–15 giờ/tuần.\n2. Khó theo dõi chuyển đổi khách hàng và nhắc lịch tự động.\n\n## Điểm mạnh khác biệt\n${product.strengths.map((s) => `- ${s}`).join('\n')}`,
  });
  await sleepScaled(900);
  store.setAgentStatus('market_research', 'done');
  await updateWf(1, 'done');

  await runSingleAgentTurn(
    'cmo',
    `Lập chiến lược Marketing 30 ngày cho sản phẩm ${product.name} hướng đến ${product.targetAudience[0]}.`,
    'marketing'
  );
  await updateWf(2, 'done');
  if (useCompanyStore.getState().settings.killSwitchActive) return;

  store.setAgentStatus('content_writer', 'typing', 'Viết Landing Copy...', 'Landing Page', 70);
  store.setAgentStatus('seo_specialist', 'typing', 'Lập bộ từ khóa SEO...', 'SEO Q4', 70);
  store.setAgentStatus('social_media', 'typing', 'Lên lịch Social...', 'Chuỗi bài FB/Zalo', 70);
  store.setAgentStatus('ads_specialist', 'typing', 'Tính ngân sách Ads...', 'Phân bổ Ads', 70);

  await executeAgentTool('content_writer', 'write_document', {
    title: `Bộ Content & Landing Copy 30 ngày – ${product.shortName}`,
    category: 'content',
    productId: product.id,
    content: `# Bộ Nội dung Chuyển đổi – ${product.shortName}\n\n**Headline:** ${product.tagline}\n\n## 3 Gói Giá Chuẩn\n${product.tiers.map((t) => `- **${t.name}**: ${t.priceLabel} (${t.targetCustomer})`).join('\n')}\n\n## Kêu gọi hành động (CTA)\nĐăng ký dùng thử 14 ngày & Demo 1-1 miễn phí ngay hôm nay.`,
  });

  await executeAgentTool('social_media', 'request_approval', {
    type: 'public_post',
    title: `Duyệt chuỗi 12 bài Fanpage & Zalo OA ra mắt ${product.shortName}`,
    description: `Bùi Khánh Linh đề xuất lịch đăng 3 bài/tuần về ${product.shortName} kèm case study thực tế.`,
  });

  await sleepScaled(1000);
  ['content_writer', 'seo_specialist', 'social_media', 'ads_specialist'].forEach((id) =>
    store.setAgentStatus(id, 'done')
  );
  await updateWf(3, 'done');

  store.setAgentStatus('sales_director', 'talking', 'Điều phối đội Sales...', 'Pipeline 30 ngày', 80);
  store.setAgentStatus('lead_hunter_edu', 'typing', 'Săn Lead mới...', 'Tìm khách mục tiêu', 75);
  const leadRes = await executeAgentTool('lead_hunter_edu', 'find_leads', { productId: product.id, count: 3 });
  await executeAgentTool('account_executive', 'write_document', {
    title: `Kịch bản Demo & Chốt Sale – ${product.shortName}`,
    category: 'strategy',
    productId: product.id,
    content: `# Kịch bản Tư vấn & Chốt Deal: ${product.shortName}\n\n1. **Mở đầu (3 phút):** Xác định quy mô cơ sở và điểm nghẽn hiện tại.\n2. **Demo trực tiếp (12 phút):** Trình diễn 3 điểm mạnh nhất của ${product.shortName}.\n3. **Xử lý từ chối & Báo giá:** Đưa gói ${product.tiers[1].name} (${product.tiers[1].priceLabel}) làm lựa chọn tối ưu.`,
  });
  await sleepScaled(1000);
  store.setAgentStatus('sales_director', 'done');
  store.setAgentStatus('lead_hunter_edu', 'done');
  await updateWf(4, 'done');

  store.setAgentStatus('pm', 'typing', 'Chuẩn bị sandbox Demo...', 'Sandbox', 75);
  store.setAgentStatus('qa_engineer', 'typing', 'Kiểm thử bản Demo...', 'QA Test', 75);
  await sleepScaled(800);
  store.setAgentStatus('pm', 'done');
  store.setAgentStatus('qa_engineer', 'done');
  await updateWf(5, 'done');

  store.setAgentStatus('cfo', 'typing', 'Lập tờ trình ngân sách...', 'Dự toán 30 ngày', 80);
  await executeAgentTool('cfo', 'request_approval', {
    type: 'budget',
    title: `Duyệt ngân sách chiến dịch 30 ngày (${product.shortName}) – 18.000.000đ`,
    description: `Phân bổ: Facebook/Google Lead Ads 12.000.000đ, Zalo OA ZNS 3.500.000đ, Quà tặng dùng thử 2.500.000đ.`,
    amountVnd: 18000000,
  });
  await sleepScaled(800);
  store.setAgentStatus('cfo', 'done');
  await updateWf(6, 'done');

  store.setAgentStatus('support_lead', 'typing', 'Soạn bộ FAQ CSKH...', 'FAQ Triển khai', 80);
  await executeAgentTool('support_lead', 'write_document', {
    title: `Bộ FAQ Chăm sóc Khách hàng – ${product.shortName}`,
    category: 'faq',
    productId: product.id,
    content: `# Câu hỏi Thường gặp (FAQ) – ${product.shortName}\n\n${product.faqs
      .map((f, i) => `### ${i + 1}. ${f.question}\n${f.answer}`)
      .join('\n\n')}`,
  });
  await sleepScaled(800);
  store.setAgentStatus('support_lead', 'done');
  await updateWf(7, 'done');

  store.setAgentStatus('data_analyst', 'typing', 'Cập nhật KPI...', 'Dashboard KPI', 90);
  const kpi = await executeAgentTool('data_analyst', 'get_kpis', {});
  await updateWf(8, 'done');
  store.setAgentStatus('data_analyst', 'done');

  await store.addMessage({
    channelId: 'all',
    senderId: 'secretary',
    senderName: 'Nguyễn Minh Anh',
    senderTitle: 'Thư ký CEO',
    department: 'exec',
    content: `✅ **Hoàn tất khởi động Chiến dịch 30 ngày: ${product.shortName}**\n- Đã họp Kickoff & tạo Action Items.\n- Đã lưu 4 tài liệu chuyên môn vào **Kho tài liệu** (Nghiên cứu, Content, Kịch bản Sale, FAQ).\n- Lead Hunter tìm thêm **${(leadRes.output.foundCount as number) || 0} Lead** mới vào CRM.\n- CMO & CFO đã gửi đề xuất vào tab **Phê duyệt** chờ Chủ tịch ký.`,
    busType: 'report',
    cardType: 'kpi',
    cardData: kpi.output,
  });

  setTimeout(() => {
    AGENTS.forEach((a) => {
      const st = useCompanyStore.getState().runtimes[a.id]?.status;
      if (st === 'done') useCompanyStore.getState().setAgentStatus(a.id, 'idle', undefined, undefined, 0);
    });
  }, 2600);
}

/**
 * Autonomous Sales Autopilot Cycle
 */
export async function runAutopilotCycle(): Promise<void> {
  const store = useCompanyStore.getState();
  if (store.settings.killSwitchActive || store.settings.paused) return;

  const product = getProductById(store.settings.priorityProductId);
  store.setAgentStatus('sales_director', 'thinking', 'Rà soát phễu Autopilot...', 'Autopilot Sales', 35);

  await store.addMessage({
    channelId: 'sales',
    senderId: 'sales_director',
    senderName: 'Nguyễn Hoàng Long',
    senderTitle: 'Giám đốc Kinh doanh',
    department: 'sales',
    content: `🚀 **Chu kỳ Sales Autopilot bắt đầu** (Mục tiêu: ${store.settings.autopilotDailyLeadTarget} lead/ngày · Ưu tiên #1: **${product.shortName}** · Chế độ: ${store.settings.dryRun ? 'Mô phỏng DRY_RUN' : 'LIVE'}).`,
    busType: 'report',
  });

  await store.addMessage({
    channelId: 'sales',
    senderId: 'sales_director',
    senderName: 'Nguyễn Hoàng Long',
    senderTitle: 'Giám đốc Kinh doanh',
    department: 'sales',
    content: `@Trịnh Gia Huy @Kiều Xuân Bách: Tìm thêm các trung tâm ngoại ngữ ở TP.HCM & Hà Nội chưa có app điểm danh/Zalo OA.`,
    busType: 'request',
    isInternalPeek: true,
  });

  await sleepScaled(900);
  if (useCompanyStore.getState().settings.killSwitchActive) return;

  store.setAgentStatus('lead_hunter_edu', 'typing', 'Tìm trung tâm ngoại ngữ...', 'Săn Lead mới', 60);
  const foundRes = await executeAgentTool('lead_hunter_edu', 'find_leads', {
    productId: product.id,
    count: 3,
  });
  const foundLeads = (foundRes.output.leads as Array<{ id: string; name: string; score: number; province: string }>) || [];

  if (foundLeads.length > 0) {
    await store.addMessage({
      channelId: 'sales',
      senderId: 'lead_hunter_edu',
      senderName: 'Trịnh Gia Huy',
      senderTitle: 'Lead Hunter Giáo dục',
      department: 'sales',
      content: `Đã bổ sung **${foundLeads.length} Lead mới** từ nguồn công khai vào CRM (đã chống trùng & chấm điểm):`,
      busType: 'report',
      cardType: 'lead',
      cardData: { leadId: foundLeads[0].id },
    });
  }
  store.setAgentStatus('lead_hunter_edu', 'done');
  await sleepScaled(800);

  const pendingAsk = store.askCeoQuestions.filter((q) => q.status === 'pending').length;
  store.setAgentStatus('account_provisioning', 'typing', 'Kiểm tra kênh gửi...', 'Kiểm tra Playbook', 65);
  const triggerCaptchaDemo = pendingAsk === 0 && store.outreachLogs.length <= 2;
  await executeAgentTool('account_provisioning', 'create_account', {
    platform: 'Facebook Page Business',
    simulateCaptcha: triggerCaptchaDemo,
  });
  if (!triggerCaptchaDemo) {
    store.setAgentStatus('account_provisioning', 'done');
  }
  await sleepScaled(800);

  const freshLead = useCompanyStore.getState().leads.find((l) => l.stage === 'new' && !l.blacklisted);
  if (freshLead) {
    const sdrId = freshLead.recommendedProductId === 'edu-center' || freshLead.recommendedProductId === 'preschool-care' ? 'sdr_1' : 'sdr_2';
    const sdrAgent = getAgentById(sdrId)!;
    store.setAgentStatus(sdrId, 'typing', `Soạn tin cho ${freshLead.name.slice(0, 18)}...`, 'Gửi Outreach', 75);
    const personalizedMsg = `Chào anh/chị quản lý ${freshLead.name},\n\nEm là ${sdrAgent.name} từ ${store.settings.companyName}. Qua tìm hiểu, trung tâm mình tại ${freshLead.province} đang phát triển rất tốt. Bên em có giải pháp ${getProductById(freshLead.recommendedProductId).shortName} giúp tự động xếp lịch, điểm danh & nhắc học phí qua Zalo OA, tiết kiệm 12 giờ quản lý/tuần.\n\nAnh/chị có muốn xem bản demo 15 phút trong tuần này không ạ?`;

    const outRes = await executeAgentTool(sdrId, 'send_outreach', {
      leadId: freshLead.id,
      channel: freshLead.zalo ? 'Zalo OA' : 'Email',
      message: personalizedMsg,
    });
    if (outRes.ok) {
      await store.addMessage({
        channelId: 'sales',
        senderId: sdrId,
        senderName: sdrAgent.name,
        senderTitle: sdrAgent.title,
        department: 'sales',
        content: `Đã gửi tin cá nhân hóa (${store.settings.dryRun ? 'Mô phỏng' : 'LIVE'}) cho **${freshLead.name}** qua **${outRes.output.channel}**.`,
        busType: 'report',
      });
    }
    store.setAgentStatus(sdrId, 'done');
  }

  const repliedLead = useCompanyStore.getState().leads.find((l) => l.stage === 'replied');
  if (repliedLead) {
    store.setAgentStatus('pricing_proposal', 'typing', 'Tạo báo giá nháp...', 'Lập báo giá', 80);
    await executeAgentTool('pricing_proposal', 'create_quote', {
      leadId: repliedLead.id,
      productId: repliedLead.recommendedProductId,
      tierIndex: 1,
      discountPercent: 0,
    });
    store.setAgentStatus('pricing_proposal', 'done');
  }

  // Also engage currently idle cross-department agents so they actively pick up Autopilot tasks
  const crossDeptWork = [
    { agentId: 'content_writer', title: `Viết case study triển khai ${product.shortName}`, bubble: 'Soạn case study...' },
    { agentId: 'seo_specialist', title: `Tối ưu từ khóa SEO ${product.shortName}`, bubble: 'Kiểm tra SEO...' },
    { agentId: 'support_agent', title: 'Rà soát ticket & chuẩn bị onboarding khách mới', bubble: 'Kiểm tra CSKH...' },
    { agentId: 'data_analyst', title: 'Cập nhật số liệu chuyển đổi phễu lên màn hình KPI', bubble: 'Cập nhật KPI...' },
    { agentId: 'qa_engineer', title: `Kiểm thử luồng Demo ${product.shortName}`, bubble: 'Test bản Demo...' },
    { agentId: 'cfo', title: 'Kiểm soát chi phí token & hạn mức chiến dịch', bubble: 'Đối soát chi phí...' },
  ];
  const activatedCrossIds: string[] = [];
  for (const job of crossDeptWork) {
    const rt = useCompanyStore.getState().runtimes[job.agentId];
    if (rt && rt.status === 'idle') {
      activatedCrossIds.push(job.agentId);
      store.setAgentStatus(job.agentId, 'typing', job.bubble, job.title, 65);
      const hasExisting = useCompanyStore
        .getState()
        .tasks.some((t) => t.assignedTo === job.agentId && t.status === 'in_progress');
      if (!hasExisting) {
        await executeAgentTool('secretary', 'create_task', {
          title: job.title,
          assignedTo: job.agentId,
          priority: 'medium',
        });
      }
    }
  }

  store.setAgentStatus('sales_director', 'done');
  setTimeout(() => {
    ['sales_director', 'lead_hunter_edu', 'sdr_1', 'sdr_2', 'pricing_proposal', ...activatedCrossIds].forEach((id) => {
      const st = useCompanyStore.getState().runtimes[id]?.status;
      if (st === 'done' || activatedCrossIds.includes(id)) {
        useCompanyStore.getState().setAgentStatus(id, st === 'typing' ? 'done' : 'idle', undefined, undefined, st === 'typing' ? 100 : 0);
      }
    });
    setTimeout(() => {
      activatedCrossIds.forEach((id) => {
        const st = useCompanyStore.getState().runtimes[id]?.status;
        if (st === 'done') useCompanyStore.getState().setAgentStatus(id, 'idle', undefined, undefined, 0);
      });
    }, 2000);
  }, 2400);
}

/**
 * Handle CEO Chat Input: Slash Commands, @Mentions, or Default Routing to Secretary
 */
export async function handleCeoChatCommand(rawText: string, activeChannel: ChatChannelId): Promise<void> {
  const text = rawText.trim();
  if (!text) return;
  const store = useCompanyStore.getState();

  await store.addMessage({
    channelId: activeChannel,
    senderId: 'ceo',
    senderName: 'Chủ tịch (CEO)',
    senderTitle: 'CEO',
    department: 'ceo',
    content: text,
    busType: 'chat',
  });

  if (store.settings.killSwitchActive) {
    await store.addMessage({
      channelId: activeChannel,
      senderId: 'system',
      senderName: 'Hệ thống',
      senderTitle: 'Cảnh báo',
      department: 'exec',
      content: 'KILL SWITCH đang bật. Hãy bấm **Khôi phục hệ thống** trên thanh trên cùng để agent hoạt động lại.',
    });
    return;
  }

  if (text.startsWith('/autopilot')) {
    const turnOn = !text.includes('off') && !text.includes('tắt');
    await store.updateSettings({ autopilotEnabled: turnOn });
    if (turnOn) {
      await runAutopilotCycle();
    }
    return;
  }

  if (text.startsWith('/dung-kenh')) {
    await runBrandAndChannelLaunch();
    return;
  }

  if (text.startsWith('/hop')) {
    const topic = text.replace(/^\/hop\s*/i, '').trim() || 'Giao ban điều hành tiến độ bán hàng & sản phẩm';
    await runDepartmentMeeting(topic);
    return;
  }

  if (text.startsWith('/tim-khach')) {
    const query = text.replace(/^\/tim-khach\s*/i, '').trim() || 'trung tâm ngoại ngữ';
    store.setAgentStatus('lead_hunter_edu', 'typing', `Tìm: ${query.slice(0, 20)}`);
    const res = await executeAgentTool('lead_hunter_edu', 'find_leads', {
      productId: query.includes('kho') ? 'warehouse-pro' : query.includes('mầm non') ? 'preschool-care' : 'edu-center',
      count: 3,
    });
    store.setAgentStatus('lead_hunter_edu', 'done');
    await store.addMessage({
      channelId: activeChannel,
      senderId: 'lead_hunter_edu',
      senderName: 'Trịnh Gia Huy',
      senderTitle: 'Lead Hunter Giáo dục',
      department: 'sales',
      content: `Đã tìm thấy **${(res.output.foundCount as number) || 0} Lead mới** cho từ khóa *"${query}"* và đưa vào CRM.`,
      busType: 'report',
    });
    return;
  }

  if (text.startsWith('/bao-cao')) {
    const kpi = await executeAgentTool('data_analyst', 'get_kpis', {});
    await store.addMessage({
      channelId: activeChannel,
      senderId: 'data_analyst',
      senderName: 'Lý Hoàng Nam',
      senderTitle: 'Data Analyst',
      department: 'data',
      content: `📊 **Báo cáo KPI Thời gian thực từ Cơ sở dữ liệu:**`,
      busType: 'report',
      cardType: 'kpi',
      cardData: kpi.output,
    });
    return;
  }

  if (text.startsWith('/giao-viec')) {
    const taskTitle = text.replace(/^\/giao-viec\s*/i, '').trim() || 'Triển khai nhiệm vụ mới từ CEO';
    await executeAgentTool('secretary', 'assign_task', {
      title: taskTitle,
      assignedTo: 'sales_director',
      priority: 'high',
    });
    await runSingleAgentTurn('secretary', `CEO vừa dùng lệnh /giao-viec: "${taskTitle}". Hãy xác nhận đã đưa lên Task Board và phân công.`, activeChannel);
    return;
  }

  if (activeChannel.startsWith('dm:')) {
    const targetId = activeChannel.replace('dm:', '');
    await runSingleAgentTurn(targetId, text, activeChannel);
    return;
  }

  const mentionedAgent = AGENTS.find(
    (a) =>
      text.toLowerCase().includes(`@${a.id.toLowerCase()}`) ||
      text.toLowerCase().includes(`@${a.name.toLowerCase()}`)
  );
  if (mentionedAgent) {
    await runSingleAgentTurn(mentionedAgent.id, text, activeChannel);
    return;
  }

  const deptLeadMap: Record<string, string> = {
    all: 'secretary',
    exec: 'secretary',
    marketing: 'cmo',
    sales: 'sales_director',
    cs: 'support_lead',
    product: 'pm',
    data: 'data_analyst',
    backoffice: 'cfo',
    ask_ceo: 'secretary',
    meeting: 'secretary',
  };
  const handlerId = deptLeadMap[activeChannel] || 'secretary';
  await runSingleAgentTurn(handlerId, text, activeChannel);

  if (handlerId === 'secretary' && !text.toLowerCase().includes('chào')) {
    const lower = text.toLowerCase();
    if (lower.includes('bán') || lower.includes('khách') || lower.includes('lead') || lower.includes('sale')) {
      await sleepScaled(700);
      await runSingleAgentTurn('sales_director', `Thư ký chuyển tiếp chỉ đạo CEO: ${text}`, 'sales', { isInternalPeek: true });
    } else if (lower.includes('marketing') || lower.includes('bài') || lower.includes('seo') || lower.includes('quảng cáo')) {
      await sleepScaled(700);
      await runSingleAgentTurn('cmo', `Thư ký chuyển tiếp chỉ đạo CEO: ${text}`, 'marketing', { isInternalPeek: true });
    }
  }
}

export function startBackgroundSchedulers() {
  ensureMarketingAskCeoHook();
  if (autopilotTimer) window.clearInterval(autopilotTimer);
  if (overdueTimer) window.clearInterval(overdueTimer);

  let lastAutopilotRun = 0;
  let lastMarketingRun = 0;
  autopilotTimer = window.setInterval(() => {
    const s = useCompanyStore.getState().settings;
    if (s.paused || s.killSwitchActive) return;
    const intervalMs = (Math.max(1, s.autopilotIntervalMinutes) * 60_000) / s.simulationSpeed;
    if (s.autopilotEnabled && Date.now() - lastAutopilotRun >= intervalMs) {
      lastAutopilotRun = Date.now();
      runAutopilotCycle();
    }
    if (s.marketingAutopilotEnabled && Date.now() - lastMarketingRun >= intervalMs) {
      lastMarketingRun = Date.now();
      runMarketingAutopilotCycle();
    }
  }, 15000);

  overdueTimer = window.setInterval(() => {
    const store = useCompanyStore.getState();
    const now = Date.now();
    const overdueMs = (store.settings.zaloOverdueHours || 2) * 3600_000;
    for (const q of store.askCeoQuestions) {
      if (q.status === 'pending' && now - q.createdAt > overdueMs) {
        store.putAskCeoQuestion({ ...q, status: 'reminded', remindedAt: now });
        store.pushZaloSimMessage('in', `[NHẮC LẦN 1 - Quá hạn ${store.settings.zaloOverdueHours}h] Câu hỏi #${q.id} đang chờ Chủ tịch trả lời.`);
        store.setAgentStatus(q.agentId, 'idle', 'Chuyển việc khác khi chờ CEO');
      }
    }
  }, 60000);
}

export const getDepartmentName = (id: string) => DEPARTMENTS[id as keyof typeof DEPARTMENTS]?.name || id;
