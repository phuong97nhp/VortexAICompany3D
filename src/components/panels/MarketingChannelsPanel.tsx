import { useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Heart,
  Image as ImageIcon,
  Layers,
  Megaphone,
  MessageSquare,
  Play,
  Rocket,
  Send,
  Share2,
  Sparkles,
  ThumbsUp,
  UserPlus,
  Video,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { runBrandAndChannelLaunch, runMarketingAutopilotCycle } from '../../engine/marketingEngine';
import { PLATFORM_META } from '../../engine/marketingSeeds';
import { executeAgentTool } from '../../engine/tools';
import { useCompanyStore } from '../../store/useCompanyStore';
import { ChannelSetupStatus, ScheduledSocialPost, SocialPlatformId } from '../../types';

type MarketingSubView = 'channels' | 'calendar' | 'ads_inbox' | 'analytics';

const STATUS_DISPLAY: Record<ChannelSetupStatus, { label: string; colorClass: string }> = {
  not_created: {
    label: 'Chưa tạo',
    colorClass: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  },
  provisioning: {
    label: 'Đang tạo',
    colorClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  },
  waiting_ceo_otp: {
    label: 'Chờ OTP của CEO',
    colorClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  ready: {
    label: 'Sẵn sàng',
    colorClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
};

export function MarketingChannelsPanel() {
  const settings = useCompanyStore((s) => s.settings);
  const updateSettings = useCompanyStore((s) => s.updateSettings);
  const brandKit = useCompanyStore((s) => s.brandKit);
  const marketingChannels = useCompanyStore((s) => s.marketingChannels);
  const scheduledPosts = useCompanyStore((s) => s.scheduledPosts);
  const movePostToDay = useCompanyStore((s) => s.movePostToDay);
  const adCampaigns = useCompanyStore((s) => s.adCampaigns);
  const socialComments = useCompanyStore((s) => s.socialComments);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);
  const setActiveChannel = useCompanyStore((s) => s.setActiveChannel);

  const [subView, setSubView] = useState<MarketingSubView>('channels');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(scheduledPosts[0]?.id || null);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [runningAutopilot, setRunningAutopilot] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [showKitDetails, setShowKitDetails] = useState(false);

  const selectedPost = useMemo(
    () => scheduledPosts.find((p) => p.id === selectedPostId) || scheduledPosts[0] || null,
    [scheduledPosts, selectedPostId]
  );

  const readyCount = marketingChannels.filter((c) => c.status === 'ready').length;
  const waitingOtpCount = marketingChannels.filter((c) => c.status === 'waiting_ceo_otp').length;
  const totalViews = marketingChannels.reduce((s, c) => s + c.metrics.views, 0);
  const totalLeads = marketingChannels.reduce((s, c) => s + c.metrics.leads, 0);

  const chartData = useMemo(
    () =>
      marketingChannels.map((c) => ({
        name: PLATFORM_META[c.platform]?.shortTag || c.label,
        views: c.metrics.views,
        engagement: c.metrics.engagement,
        clicks: c.metrics.clicks,
        leads: c.metrics.leads,
      })),
    [marketingChannels]
  );

  const handleLaunchChannels = async () => {
    setLaunching(true);
    setActionMsg(null);
    try {
      await runBrandAndChannelLaunch();
      setActionMsg('Đã dựng Brand Launch Kit & khởi tạo 7 kênh (TikTok đang chờ OTP CEO).');
    } finally {
      setLaunching(false);
    }
  };

  const handleRunMarketingCycle = async () => {
    setRunningAutopilot(true);
    setActionMsg(null);
    try {
      await runMarketingAutopilotCycle();
      setActionMsg('Đã hoàn tất 1 vòng Marketing Autopilot & cập nhật chỉ số kênh.');
    } finally {
      setRunningAutopilot(false);
    }
  };

  const handlePublishNow = async (post: ScheduledSocialPost) => {
    const res = await executeAgentTool('social_media', 'publish_social_post', { postId: post.id });
    if (res.ok) {
      setActionMsg(`Đã xuất bản bài "${post.title.slice(0, 42)}..." lên ${PLATFORM_META[post.platform].shortTag}.`);
    } else {
      setActionMsg(String(res.output.error || 'Không thể đăng bài ngay.'));
    }
  };

  const handleCreateSampleAd = async () => {
    const res = await executeAgentTool('ads_specialist', 'create_ad_campaign', {
      name: `Zalo & FB Lead Ads – ${brandKit.brandName}`,
      platform: 'facebook',
      dailyBudgetVnd: Math.min(350000, settings.marketingDailyAdBudgetVnd || 500000),
      totalBudgetVnd: 4900000,
    });
    if (res.ok) {
      setActionMsg('Đã tạo chiến dịch Ads (A/B) và đưa vào hàng đợi CEO Phê duyệt.');
    } else {
      setActionMsg(String(res.output.error || 'Lỗi tạo chiến dịch Ads.'));
    }
  };

  const handleProcessComment = async (commentId: string) => {
    const res = await executeAgentTool('social_media', 'reply_social_comment', { commentId });
    if (res.ok) {
      const st = String(res.output.status || '');
      setActionMsg(
        st === 'converted_lead'
          ? 'Đã trả lời khách hàng & tự động tạo Lead trong CRM.'
          : st === 'escalated_ceo'
          ? 'Đã chuyển câu hỏi giá/khiếu nại sang Hỏi CEO (#ask_ceo).'
          : 'Đã gửi phản hồi chính thức dưới danh nghĩa công ty.'
      );
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Top Action Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/70 dark:bg-slate-900/60">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">Kênh & Marketing Tự chủ</h2>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/25">
                {settings.dryRun ? 'Mô phỏng AI Studio' : 'API Chính thức / Live'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-num mt-0.5">
              {readyCount}/{marketingChannels.length} kênh sẵn sàng · {totalViews.toLocaleString('vi-VN')} views ·{' '}
              {totalLeads} lead
              {waitingOtpCount > 0 ? ` · ${waitingOtpCount} kênh chờ OTP CEO` : ''}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={launching}
              onClick={handleLaunchChannels}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>{launching ? 'Đang dựng...' : 'Dựng kênh cho thương hiệu'}</span>
            </button>
            <button
              type="button"
              disabled={runningAutopilot}
              onClick={handleRunMarketingCycle}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold whitespace-nowrap cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-emerald-500" />
              <span>{runningAutopilot ? 'Đang chạy...' : 'Chạy 1 vòng'}</span>
            </button>
          </div>
        </div>

        {/* Sub-view Switcher & Autopilot Toggle */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5">
            {([
              ['channels', 'Checklist Kênh & Kit', Layers],
              ['calendar', 'Lịch 30 ngày & Preview', Calendar],
              ['ads_inbox', 'Ads & Bình luận', Megaphone],
              ['analytics', 'Hiệu quả Kênh', BarChart2],
            ] as Array<[MarketingSubView, string, typeof Layers]>).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSubView(id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                  subView === id
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={settings.marketingAutopilotEnabled}
              onChange={(e) => updateSettings({ marketingAutopilotEnabled: e.target.checked })}
              className="accent-emerald-600"
            />
            <span>Marketing Autopilot ({settings.marketingPostsPerWeek} bài/tuần)</span>
          </label>
        </div>

        {actionMsg && (
          <div className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-[11px] text-sky-600 dark:text-sky-300 flex items-center justify-between gap-2">
            <span>{actionMsg}</span>
            <button type="button" onClick={() => setActionMsg(null)} className="text-[10px] underline cursor-pointer">
              Đóng
            </button>
          </div>
        )}
      </div>

      {/* Main Content Viewport */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* SUB-VIEW 1: 7 PLATFORM CHECKLIST + BRAND LAUNCH KIT */}
        {subView === 'channels' && (
          <>
            {/* Platform Setup Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  1. Checklist Thiết lập 7 Nền tảng (Playbook /worker)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Dừng hỏi CEO chỉ khi cần OTP / CAPTCHA / 2FA
                </span>
              </div>

              <div className="space-y-2">
                {marketingChannels.map((ch) => {
                  const st = STATUS_DISPLAY[ch.status];
                  const pct = Math.round((ch.progressStep / ch.totalSteps) * 100);
                  return (
                    <div
                      key={ch.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: PLATFORM_META[ch.platform]?.color || '#0EA5E9' }}
                            />
                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {ch.label}
                            </span>
                            <span className="text-[11px] font-mono-num text-slate-500 dark:text-slate-400 truncate">
                              {ch.handle}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {ch.bio}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold ${st.colorClass}`}>
                            {st.label}
                          </span>
                          {ch.status === 'waiting_ceo_otp' && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('chat');
                                setActiveChannel('ask_ceo');
                              }}
                              className="px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-[10.5px] font-semibold cursor-pointer"
                            >
                              Nhập OTP ngay
                            </button>
                          )}
                          {ch.status === 'not_created' && (
                            <button
                              type="button"
                              onClick={() =>
                                executeAgentTool('account_provisioning', 'provision_channel', {
                                  platform: ch.id,
                                  requiresHumanOtp: ch.id === 'tiktok' || ch.id === 'facebook',
                                })
                              }
                              className="px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10.5px] font-semibold cursor-pointer"
                            >
                              Chạy Playbook
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Step Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400">
                          <span>
                            Bước {ch.progressStep}/{ch.totalSteps}:{' '}
                            {ch.stepLabels[Math.min(ch.totalSteps - 1, ch.progressStep)] || 'Hoàn tất'}
                          </span>
                          <span className="font-mono-num">
                            {pct}% · Token: {ch.tokenStatus === 'simulated' ? 'Mô phỏng Vault' : ch.tokenStatus}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              ch.status === 'ready'
                                ? 'bg-emerald-500'
                                : ch.status === 'waiting_ceo_otp'
                                ? 'bg-amber-500'
                                : 'bg-sky-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {ch.pausedReason && (
                          <div className="flex items-center gap-1 text-[10.5px] text-amber-600 dark:text-amber-400 pt-0.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{ch.pausedReason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Brand Launch Kit Summary Card */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                    <span>Brand Launch Kit · {brandKit.brandName}</span>
                    <span className="font-mono-num text-[11px] text-sky-500">{brandKit.handle}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{brandKit.tagline}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKitDetails((v) => !v)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold cursor-pointer shrink-0"
                >
                  {showKitDetails ? 'Thu gọn Kit' : 'Xem toàn bộ Kit'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {brandKit.contentPillars.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="font-semibold text-[11px] text-slate-800 dark:text-slate-200 line-clamp-1">
                      {p.title}
                    </div>
                    <div className="font-mono-num text-[11px] text-sky-500 font-bold">{p.ratioPercent}%</div>
                  </div>
                ))}
              </div>

              {showKitDetails && (
                <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Tông giọng thương hiệu: </span>
                    <span className="text-slate-600 dark:text-slate-400">{brandKit.voiceTone}</span>
                  </div>

                  <div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Prompt Logo / Avatar / Banner & Kích thước chuẩn:
                    </div>
                    <div className="space-y-1">
                      {brandKit.imagePrompts.map((img) => (
                        <div
                          key={img.id}
                          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                        >
                          <div className="font-semibold text-sky-500">
                            {img.slot} · {img.platform} ({img.dimensions})
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">{img.prompt}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Bộ Hashtag:</div>
                    <div className="font-mono-num text-sky-500">{brandKit.hashtags.join('  ')}</div>
                  </div>

                  <div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Kịch bản Video Ngắn:</div>
                    {brandKit.videoScripts.map((v) => (
                      <div
                        key={v.id}
                        className="p-2 mb-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-0.5"
                      >
                        <div className="font-semibold">
                          {v.title} ({v.durationSec}s)
                        </div>
                        <div className="text-slate-500">{v.hook}</div>
                        <div className="text-slate-500">{v.body}</div>
                        <div className="text-emerald-500">{v.cta}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* SUB-VIEW 2: DRAG-AND-DROP 30-DAY CALENDAR + PLATFORM POST PREVIEWS */}
        {subView === 'calendar' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 dark:text-white">
                Lịch nội dung 30 ngày (Kéo thả bài giữa các ngày)
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-num">
                {scheduledPosts.length} bài đã xếp lịch · An toàn {settings.marketingPostsPerWeek} bài/tuần
              </span>
            </div>

            {/* 30-Day Drag & Drop Grid (5 columns x 6 rows) */}
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 30 }, (_, idx) => idx + 1).map((dayNum) => {
                const dayPosts = scheduledPosts.filter((p) => p.dayNumber === dayNum);
                return (
                  <div
                    key={dayNum}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedPostId) {
                        movePostToDay(draggedPostId, dayNum);
                        setDraggedPostId(null);
                        setActionMsg(`Đã dời bài đăng sang Ngày ${dayNum}.`);
                      }
                    }}
                    className={`min-h-[68px] p-1.5 rounded-lg border transition-colors ${
                      dayPosts.length > 0
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        : 'bg-slate-50/60 dark:bg-slate-950/60 border-dashed border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-400 mb-1">
                      <span>Ngày {dayNum}</span>
                    </div>
                    <div className="space-y-1">
                      {dayPosts.map((post) => {
                        const isSel = selectedPost?.id === post.id;
                        const statusColor =
                          post.status === 'published'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : post.status === 'waiting_approval'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                            : post.status === 'approved'
                            ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700';

                        return (
                          <div
                            key={post.id}
                            draggable
                            onDragStart={() => setDraggedPostId(post.id)}
                            onClick={() => setSelectedPostId(post.id)}
                            className={`p-1 rounded border text-[10px] cursor-grab active:cursor-grabbing ${statusColor} ${
                              isSel ? 'ring-1 ring-sky-500' : ''
                            }`}
                          >
                            <div className="font-bold truncate">{PLATFORM_META[post.platform]?.shortTag}</div>
                            <div className="truncate opacity-85">{post.title}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Realistic Platform Post Preview Card */}
            {selectedPost && (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Xem trước giao diện {PLATFORM_META[selectedPost.platform]?.label} (Ngày {selectedPost.dayNumber} ·{' '}
                    {selectedPost.scheduledTime})
                  </div>
                  <div className="flex items-center gap-1.5">
                    {selectedPost.status === 'waiting_approval' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('approvals')}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Mở Duyệt CEO
                      </button>
                    )}
                    {selectedPost.status !== 'published' && (
                      <button
                        type="button"
                        onClick={() => handlePublishNow(selectedPost)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Xuất bản ({settings.dryRun ? 'Mô phỏng' : 'Live'})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Realistic Social Post Mock Frame */}
                <PlatformPostMockCard post={selectedPost} brandName={brandKit.brandName} handle={brandKit.handle} />
              </div>
            )}
          </div>
        )}

        {/* SUB-VIEW 3: PAID ADS SPECIALIST & COMMENT/INBOX CONVERSION */}
        {subView === 'ads_inbox' && (
          <div className="space-y-3">
            {/* Paid Ads Section */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Chiến dịch Quảng cáo Trả phí (Ads Agent)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Giới hạn ngân sách ngày:{' '}
                    <span className="font-mono-num font-semibold text-sky-500">
                      {settings.marketingDailyAdBudgetVnd.toLocaleString('vi-VN')}đ/ngày
                    </span>{' '}
                    · Bắt buộc CEO duyệt trước khi chi
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCreateSampleAd}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold cursor-pointer shrink-0"
                >
                  + Đề xuất Ads A/B
                </button>
              </div>

              <div className="space-y-2">
                {adCampaigns.map((ad) => (
                  <div
                    key={ad.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{ad.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10.5px] font-semibold ${
                          ad.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : ad.status === 'rejected'
                            ? 'bg-rose-500/15 text-rose-500'
                            : 'bg-amber-500/15 text-amber-500'
                        }`}
                      >
                        {ad.status === 'pending_approval'
                          ? 'Chờ CEO duyệt'
                          : ad.status === 'active'
                          ? 'Đang chạy (Mô phỏng)'
                          : ad.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Target: {ad.audience} · Ngân sách:{' '}
                      <span className="font-mono-num">{ad.dailyBudgetVnd.toLocaleString('vi-VN')}đ/ngày</span> (Tổng{' '}
                      <span className="font-mono-num">{ad.totalBudgetVnd.toLocaleString('vi-VN')}đ</span>)
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ad.variants.map((v, i) => (
                        <div
                          key={i}
                          className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10.5px]"
                        >
                          <div className="font-semibold text-sky-500">{v.label}</div>
                          <div className="font-medium text-slate-800 dark:text-slate-200">{v.headline}</div>
                          <div className="text-slate-500 line-clamp-2">{v.primaryText}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments & Inbox Engagement */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 dark:text-white">
                  Hộp thư & Bình luận Kênh (Tự chuyển Lead CRM / Hỏi CEO nếu hỏi giá)
                </div>
              </div>

              <div className="space-y-2">
                {socialComments.map((cmt) => (
                  <div
                    key={cmt.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{cmt.authorName}</span>
                        <span className="text-[10.5px] text-slate-500">
                          · {PLATFORM_META[cmt.platform]?.shortTag} ({cmt.type})
                        </span>
                      </div>
                      {cmt.status === 'new' ? (
                        <button
                          type="button"
                          onClick={() => handleProcessComment(cmt.id)}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10.5px] font-semibold cursor-pointer"
                        >
                          Agent xử lý ngay
                        </button>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[10.5px] font-semibold ${
                            cmt.status === 'converted_lead'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : cmt.status === 'escalated_ceo'
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-sky-500/15 text-sky-500'
                          }`}
                        >
                          {cmt.status === 'converted_lead'
                            ? 'Đã lưu Lead CRM'
                            : cmt.status === 'escalated_ceo'
                            ? 'Đã hỏi CEO'
                            : 'Đã trả lời'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-700 dark:text-slate-300">“{cmt.message}”</div>
                    {cmt.agentReply && (
                      <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10.5px] text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap">
                        {cmt.agentReply}
                      </div>
                    )}
                    {cmt.linkedLeadId && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('crm')}
                        className="inline-flex items-center gap-1 text-[10.5px] text-sky-500 hover:underline cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>Mở Lead trong CRM</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUB-VIEW 4: PERFORMANCE ANALYTICS CHARTS */}
        {subView === 'analytics' && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Tổng lượt xem', val: totalViews.toLocaleString('vi-VN'), color: 'text-sky-500' },
                {
                  label: 'Tổng tương tác',
                  val: marketingChannels.reduce((s, c) => s + c.metrics.engagement, 0).toLocaleString('vi-VN'),
                  color: 'text-emerald-500',
                },
                {
                  label: 'Lượt Click Web',
                  val: marketingChannels.reduce((s, c) => s + c.metrics.clicks, 0).toLocaleString('vi-VN'),
                  color: 'text-amber-500',
                },
                { label: 'Lead từ MXH', val: String(totalLeads), color: 'text-rose-500' },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                >
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400">{stat.label}</div>
                  <div className={`text-base font-bold font-mono-num ${stat.color}`}>{stat.val}</div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white mb-2">
                Hiệu quả Từng Kênh (Lượt xem & Tương tác · {settings.dryRun ? 'Số liệu Mô phỏng' : 'API Thực'})
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#F8FAFC',
                      }}
                    />
                    <Bar dataKey="views" name="Lượt xem" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="engagement" name="Tương tác" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white mb-2">Click Website & Lead Chuyển đổi</div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#F8FAFC',
                      }}
                    />
                    <Bar dataKey="clicks" name="Click Link" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="leads" name="Lead CRM" fill="#EC4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlatformPostMockCard({
  post,
  brandName,
  handle,
}: {
  post: ScheduledSocialPost;
  brandName: string;
  handle: string;
}) {
  const meta = PLATFORM_META[post.platform] || PLATFORM_META.facebook;
  const isVerticalVideo = post.platform === 'tiktok' || post.platform === 'youtube';

  if (isVerticalVideo) {
    return (
      <div className="mx-auto max-w-[300px] rounded-2xl overflow-hidden bg-slate-950 text-white border border-slate-700 shadow-lg">
        <div className="h-44 bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 p-3 flex flex-col justify-between relative">
          <div className="flex items-center justify-between text-[10px]">
            <span className="px-2 py-0.5 rounded bg-black/50 font-semibold">{meta.label}</span>
            <span className="font-mono-num text-sky-300">{post.mediaDimensions}</span>
          </div>
          <div className="flex flex-col items-center text-center gap-1.5">
            <Video className="w-7 h-7 text-rose-400" />
            <div className="text-xs font-bold line-clamp-2">{post.title}</div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-300">
            <span>{handle}</span>
            <span className="flex items-center gap-2 font-mono-num">
              <Heart className="w-3 h-3 text-rose-400" /> {post.metrics.likes}
              <MessageSquare className="w-3 h-3 text-sky-400" /> {post.metrics.comments}
            </span>
          </div>
        </div>
        <div className="p-2.5 text-[11px] space-y-1 bg-slate-900">
          <div className="text-slate-200 whitespace-pre-wrap line-clamp-4">{post.content}</div>
          <div className="text-sky-400 font-mono-num text-[10px]">{post.hashtags.join(' ')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Platform Card Header */}
      <div className="p-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: meta.color }}
          >
            AI
          </div>
          <div>
            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1">
              <span>{brandName}</span>
              <CheckCircle2 className="w-3 h-3 text-sky-500" />
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <span>{meta.label}</span>
              <span>·</span>
              <Clock className="w-2.5 h-2.5" />
              <span>
                Ngày {post.dayNumber} ({post.scheduledTime})
              </span>
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono-num text-slate-400">{post.mediaDimensions}</span>
      </div>

      {/* Post Body */}
      <div className="p-3 space-y-2 text-[11.5px]">
        <div className="font-bold text-slate-900 dark:text-white">{post.title}</div>
        <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{post.content}</div>
        <div className="text-sky-500 font-mono-num text-[10.5px]">{post.hashtags.join(' ')}</div>

        {/* Visual Mock Asset */}
        <div className="rounded-lg bg-slate-200/70 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800 p-3 flex items-center gap-2.5 text-[10.5px] text-slate-600 dark:text-slate-400">
          <ImageIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-slate-700 dark:text-slate-300">
              Visual Asset ({post.mediaType.toUpperCase()} · {post.mediaDimensions})
            </div>
            <div className="truncate">{post.imagePrompt}</div>
          </div>
        </div>
      </div>

      {/* Simulated Social Footer Bar */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 font-mono-num">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> {post.metrics.views}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" /> {post.metrics.likes}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> {post.metrics.comments}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="w-3 h-3" /> {post.metrics.shares}
          </span>
        </div>
        <span className="flex items-center gap-1 text-sky-500">
          <ExternalLink className="w-3 h-3" /> {post.status === 'published' ? 'Đã đăng (Mô phỏng)' : post.status}
        </span>
      </div>
    </div>
  );
}
