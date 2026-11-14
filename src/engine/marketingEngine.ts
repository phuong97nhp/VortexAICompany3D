import { getProductById } from '../config/products';
import { useCompanyStore } from '../store/useCompanyStore';
import { AskCeoQuestion, SocialPlatformId } from '../types';
import { PLATFORM_META } from './marketingSeeds';
import { executeAgentTool } from './tools';

function sleepScaled(ms: number): Promise<void> {
  const speed = useCompanyStore.getState().settings.simulationSpeed || 1;
  return new Promise((resolve) => setTimeout(resolve, Math.max(80, Math.round(ms / speed))));
}

let marketingHookRegistered = false;

export function ensureMarketingAskCeoHook(): void {
  if (marketingHookRegistered) return;
  marketingHookRegistered = true;

  useCompanyStore.getState().registerAskCeoResolvedHook(async (q: AskCeoQuestion, answer: string) => {
    if (!q.resumeAction) return;
    if (q.resumeAction.type === 'channel_setup' && q.resumeAction.channelId) {
      await resumeChannelProvisioning(q.resumeAction.channelId as SocialPlatformId, answer);
    } else if (q.resumeAction.type === 'social_escalation' && q.resumeAction.commentId) {
      await finishEscalatedCommentReply(q.resumeAction.commentId, answer);
    }
  });
}

/**
 * Full Acceptance Workflow: "Dựng kênh cho thương hiệu"
 * 1) Designer + Content + CMO generate Brand Launch Kit & save to Kho tài liệu
 * 2) Account Provisioning sets up all 7 channels; pauses at OTP/CAPTCHA/2FA gate and asks CEO
 * 3) Auto-resumes once CEO answers via Web or Zalo Simulator
 */
export async function runBrandAndChannelLaunch(): Promise<void> {
  ensureMarketingAskCeoHook();
  const store = useCompanyStore.getState();
  if (store.settings.killSwitchActive || store.settings.paused) {
    store.setBannerAlert('Hãy tắt KILL SWITCH / Tạm dừng trước khi Dựng kênh.');
    return;
  }

  store.setAgentStatus('cmo', 'thinking', 'Lập Brand Launch Kit...', 'Dựng kênh thương hiệu', 25);
  store.setAgentStatus('designer', 'typing', 'Thiết kế prompt logo/banner...', 'Brand Visuals', 35);
  store.setAgentStatus('content_writer', 'typing', 'Soạn bio & lịch 30 ngày...', 'Content Pillars', 40);

  await store.addMessage({
    channelId: 'marketing',
    senderId: 'cmo',
    senderName: 'Lê Thảo Vy',
    senderTitle: 'CMO',
    department: 'marketing',
    content: `🚀 **Bắt đầu quy trình "Dựng kênh cho thương hiệu" (${store.settings.companyName})**\n1. Designer + Content tạo **Brand Launch Kit** hoàn chỉnh.\n2. Account Provisioning tự động dựng **7 nền tảng MXH**.\n3. Khi gặp bước **OTP/CAPTCHA/2FA**, hệ thống sẽ dừng và gửi thẻ **"Cần anh làm 1 bước"** lên Web & Zalo.`,
    busType: 'report',
  });

  await sleepScaled(700);
  if (useCompanyStore.getState().settings.killSwitchActive) return;

  await executeAgentTool('designer', 'generate_brand_kit', {
    brandName: store.settings.companyName,
  });

  store.setAgentStatus('designer', 'done', 'Xong Brand Visuals');
  store.setAgentStatus('content_writer', 'done', 'Xong Bio & Kịch bản');
  store.setAgentStatus('cmo', 'done', 'Xong Brand Launch Kit');

  await sleepScaled(600);
  if (useCompanyStore.getState().settings.killSwitchActive) return;

  // Step 2: Account Provisioning loops through all 7 channels
  store.setAgentStatus('account_provisioning', 'typing', 'Đang điền form 7 kênh...', 'Playbook Dựng kênh', 50);

  const channels = useCompanyStore.getState().marketingChannels;
  for (const ch of channels) {
    if (useCompanyStore.getState().settings.killSwitchActive) return;

    // Simulate step-by-step provisioning
    await store.putMarketingChannel({
      ...ch,
      status: 'provisioning',
      progressStep: 1,
      updatedAt: Date.now(),
    });
    await sleepScaled(320);

    // Real-human verification gate on TikTok (OTP SMS) or Facebook (2FA) if not yet ready
    if (ch.id === 'tiktok' && ch.status !== 'ready') {
      await executeAgentTool('account_provisioning', 'provision_channel', {
        platform: 'tiktok',
        requiresHumanOtp: true,
      });
    } else if (ch.id === 'facebook' && ch.status !== 'ready') {
      // Leave Facebook paused or prompt if TikTok wasn't the one blocking
      await store.putMarketingChannel({
        ...ch,
        status: 'ready',
        progressStep: ch.totalSteps,
        pausedReason: undefined,
        tokenStatus: 'simulated',
        updatedAt: Date.now(),
      });
    } else {
      await executeAgentTool('account_provisioning', 'provision_channel', {
        platform: ch.id,
        requiresHumanOtp: false,
      });
    }

    // Sync Vault status nicely
    const matchedVault = useCompanyStore.getState().vaultStatuses.find((v) =>
      v.platform.toLowerCase().includes(ch.id === 'zalo_oa' ? 'zalo' : ch.id === 'google_business' ? 'google' : ch.id)
    );
    if (matchedVault && ch.id !== 'tiktok') {
      await store.putVaultStatus({
        ...matchedVault,
        status: 'dry_run_ready',
        lastCheckedAt: Date.now(),
        note: `Đồng bộ tự động từ Playbook Dựng kênh (${store.settings.dryRun ? 'Mô phỏng' : 'Live'}).`,
      });
    }
  }

  await store.addMessage({
    channelId: 'all',
    senderId: 'account_provisioning',
    senderName: 'Lương Thế Vinh',
    senderTitle: 'Account Provisioning',
    department: 'sales',
    content: `⏸️ **Đã dựng xong 6/7 kênh!** Kênh **TikTok Business** đang tạm dừng ở bước **OTP SMS / CAPTCHA** để chờ Chủ tịch gõ mã 6 số (xem thẻ **Cần anh làm 1 bước** ở kênh Hỏi CEO hoặc Zalo Giả lập). Ngay khi anh nhập mã, em sẽ chạy tiếp đúng bước dở và lên lịch bài đầu tiên.`,
    busType: 'question',
  });
}

/**
 * Resumes channel provisioning right at the paused step after CEO supplies OTP/2FA/CAPTCHA answer
 */
export async function resumeChannelProvisioning(channelId: SocialPlatformId, ceoAnswer: string): Promise<void> {
  const store = useCompanyStore.getState();
  const ch = store.marketingChannels.find((c) => c.id === channelId);
  if (!ch) return;

  store.setAgentStatus('account_provisioning', 'typing', `Đang điền mã & hoàn tất ${ch.label}...`, 'Tiếp nối Playbook', 85);

  await store.putMarketingChannel({
    ...ch,
    status: 'provisioning',
    progressStep: Math.min(ch.totalSteps - 1, ch.progressStep + 1),
    pausedReason: `Đang xác thực phản hồi CEO (${ceoAnswer.slice(0, 12)})...`,
    updatedAt: Date.now(),
  });

  await sleepScaled(750);

  await store.putMarketingChannel({
    ...ch,
    status: 'ready',
    progressStep: ch.totalSteps,
    pausedReason: undefined,
    pendingAskId: undefined,
    tokenStatus: 'simulated',
    updatedAt: Date.now(),
  });

  await store.addMessage({
    channelId: 'marketing',
    senderId: 'account_provisioning',
    senderName: 'Lương Thế Vinh',
    senderTitle: 'Account Provisioning',
    department: 'sales',
    content: `✅ **Đã hoàn tất thiết lập ${ch.label} (${ch.handle})** đúng bước đang dở! Avatar, Banner, Bio & Website đã cập nhật. Token API đang ở chế độ **Mô phỏng AI Studio** trong Vault.`,
    busType: 'report',
  });

  // Auto-schedule & attempt initial safe post on the newly ready channel
  await scheduleStarterPostsForReadyChannels();
  store.setAgentStatus('account_provisioning', 'done', `${ch.label} Sẵn sàng`);
}

async function finishEscalatedCommentReply(commentId: string, ceoDirection: string): Promise<void> {
  const store = useCompanyStore.getState();
  const cmt = store.socialComments.find((c) => c.id === commentId);
  if (!cmt) return;

  const reply = `Chào ${cmt.authorName}, theo chỉ đạo từ Ban Giám đốc ${store.settings.companyName}: ${ceoDirection}\n\n— [Phản hồi chính thức từ ${store.settings.companyName}]`;
  await store.putSocialComment({
    ...cmt,
    status: 'replied',
    agentReply: reply,
  });

  await store.addSocialLog({
    id: `slog_esc_${Date.now()}`,
    platform: cmt.platform,
    agentId: 'social_media',
    agentName: 'Bùi Khánh Linh',
    actionType: 'reply_comment',
    preview: `Đã trả lời theo chỉ đạo CEO cho ${cmt.authorName}: ${ceoDirection}`,
    result: 'replied_sim',
    simulated: store.settings.dryRun,
    timestamp: Date.now(),
  });
}

export async function scheduleStarterPostsForReadyChannels(): Promise<void> {
  const store = useCompanyStore.getState();
  if (store.settings.killSwitchActive) return;

  const product = getProductById(store.settings.priorityProductId);
  const readyChannels = store.marketingChannels.filter((c) => c.status === 'ready');

  for (const ch of readyChannels) {
    const hasPostOnChannel = store.scheduledPosts.some((p) => p.platform === ch.id);
    if (!hasPostOnChannel) {
      await executeAgentTool('social_media', 'schedule_social_post', {
        platform: ch.id,
        dayNumber: 5,
        title: `Ra mắt kênh ${ch.label}: Giải pháp ${product.shortName}`,
        content: `Chào mừng các đơn vị đến với kênh chính thức ${ch.handle}! Theo dõi kênh để nhận mẹo quản lý & dùng thử 14 ngày ${product.shortName}.`,
        pillar: 'Chia sẻ kinh nghiệm vận hành',
        hasPricingOrClaim: false,
      });
    }
  }
}

/**
 * Daily Marketing Autopilot Loop:
 * CMO sets goal -> Content/Designer draft -> Social Media publishes approved posts ->
 * Handle comments/inbox (converting inquiries to CRM leads) -> Data Analyst reports
 */
export async function runMarketingAutopilotCycle(): Promise<void> {
  ensureMarketingAskCeoHook();
  const store = useCompanyStore.getState();
  if (store.settings.killSwitchActive || store.settings.paused) return;

  const product = getProductById(store.settings.priorityProductId);
  store.setAgentStatus('cmo', 'thinking', 'Đọc hiệu quả bài cũ & đặt mục tiêu tuần...', 'Marketing Autopilot', 30);

  // 1. CMO analyzes top performing published post
  const published = [...store.scheduledPosts].filter((p) => p.status === 'published');
  published.sort((a, b) => {
    const scoreA = a.metrics.leads * 50 + a.metrics.likes + a.metrics.comments + a.metrics.shares;
    const scoreB = b.metrics.leads * 50 + b.metrics.likes + b.metrics.comments + b.metrics.shares;
    return scoreB - scoreA;
  });
  const topPost = published[0];

  await store.addMessage({
    channelId: 'marketing',
    senderId: 'cmo',
    senderName: 'Lê Thảo Vy',
    senderTitle: 'CMO',
    department: 'marketing',
    content: `📣 **Vòng lặp Marketing Autopilot (${store.settings.dryRun ? 'Mô phỏng AI Studio' : 'LIVE'})**\n- Nhịp đăng an toàn: **${store.settings.marketingPostsPerWeek} bài/tuần** (Giới hạn ngày: ${store.settings.marketingDailyPostCap} bài/ngày)\n- Bài hiệu quả nhất hiện tại: *${topPost?.title || 'Checklist Zalo OA'}* (${topPost?.metrics.views || 0} lượt xem, ${topPost?.metrics.leads || 0} lead) → ưu tiên đẩy mạnh trụ cột này.`,
    busType: 'report',
  });

  await sleepScaled(650);
  if (useCompanyStore.getState().settings.killSwitchActive) return;

  // 2. Content & Designer draft 1 fresh calendar post if under 18 scheduled items
  if (useCompanyStore.getState().scheduledPosts.length < 18) {
    store.setAgentStatus('content_writer', 'typing', 'Soạn bài & kịch bản video...', 'Content Lịch 30 ngày', 55);
    const nextDay = Math.min(30, Math.max(1, useCompanyStore.getState().scheduledPosts.length + 2));
    const readyPlat: SocialPlatformId =
      useCompanyStore.getState().marketingChannels.find((c) => c.status === 'ready')?.id || 'zalo_oa';
    await executeAgentTool('content_writer', 'schedule_social_post', {
      platform: readyPlat,
      dayNumber: nextDay,
      title: `Kinh nghiệm thực chiến #${nextDay}: Tăng tỷ lệ giữ chân học viên với ${product.shortName}`,
      content: `Nhiều đơn vị bỏ lỡ 30% doanh thu tái tục vì quên nhắc lịch hết khóa. Xem cách tự động hóa hoàn toàn với ${product.shortName} trong 15 phút.`,
      pillar: topPost?.pillar || 'Chia sẻ kinh nghiệm vận hành',
      hasPricingOrClaim: false,
    });
    store.setAgentStatus('content_writer', 'done');
  }

  // 3. Social Media publishes eligible approved/level-3 post at golden hour
  const stateNow = useCompanyStore.getState();
  const readyChannelIds = new Set(stateNow.marketingChannels.filter((c) => c.status === 'ready').map((c) => c.id));
  const candidatePost = stateNow.scheduledPosts.find(
    (p) =>
      readyChannelIds.has(p.platform) &&
      (p.status === 'approved' ||
        (stateNow.settings.autonomyLevel === 3 && p.status === 'draft' && !p.isFirstPostOnPlatform && !p.hasPricingOrClaim))
  );

  if (candidatePost) {
    store.setAgentStatus('social_media', 'talking', `Đăng bài lên ${PLATFORM_META[candidatePost.platform].shortTag}`, 'Đăng bài MXH', 80);
    await executeAgentTool('social_media', 'publish_social_post', { postId: candidatePost.id });
    store.setAgentStatus('social_media', 'done');
  }

  await sleepScaled(650);
  if (useCompanyStore.getState().settings.killSwitchActive) return;

  // 4. Handle 1 pending Social comment/inbox (convert inquiry -> CRM Lead or escalate pricing)
  const pendingComment = useCompanyStore.getState().socialComments.find((c) => c.status === 'new');
  if (pendingComment) {
    store.setAgentStatus('social_media', 'typing', `Trả lời ${pendingComment.type} của ${pendingComment.authorName.slice(0, 16)}...`, 'Xử lý Inbox MXH', 90);
    await executeAgentTool('social_media', 'reply_social_comment', { commentId: pendingComment.id });
  }

  // 5. Data Analyst report
  store.setAgentStatus('data_analyst', 'typing', 'Tổng hợp phễu MXH -> Lead...', 'KPI Marketing', 95);
  const allChannels = useCompanyStore.getState().marketingChannels;
  const sumViews = allChannels.reduce((s, c) => s + c.metrics.views, 0);
  const sumLeads = allChannels.reduce((s, c) => s + c.metrics.leads, 0);
  store.setAgentStatus('data_analyst', 'done');
  store.setAgentStatus('cmo', 'done');

  await store.addMessage({
    channelId: 'marketing',
    senderId: 'data_analyst',
    senderName: 'Lý Hoàng Nam',
    senderTitle: 'Data Analyst',
    department: 'data',
    content: `📊 **Tổng hợp Hiệu quả Kênh sau vòng Autopilot:** Tổng **${sumViews.toLocaleString('vi-VN')}** lượt xem · **${sumLeads} Lead** chuyển về CRM. (Chế độ: ${store.settings.dryRun ? 'Mô phỏng' : 'LIVE'})`,
    busType: 'report',
  });

  setTimeout(() => {
    ['cmo', 'content_writer', 'designer', 'social_media', 'data_analyst'].forEach((id) => {
      const st = useCompanyStore.getState().runtimes[id]?.status;
      if (st === 'done') useCompanyStore.getState().setAgentStatus(id, 'idle', undefined, undefined, 0);
    });
  }, 2400);
}
