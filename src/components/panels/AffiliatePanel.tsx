import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  Link2,
  Play,
  RefreshCw,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { formatMetricOrMissing } from '../../integrations/affiliate/affiliateEngine';
import { useCompanyStore } from '../../store/useCompanyStore';
import { AffiliateChannelPost, AffiliateContentPiece } from '../../types';

type AffSubTab = 'scout' | 'campaigns' | 'links' | 'content' | 'roi';

export function AffiliatePanel() {
  const settings = useCompanyStore((s) => s.settings);
  const affiliateProducts = useCompanyStore((s) => s.affiliateProducts);
  const affiliateScores = useCompanyStore((s) => s.affiliateScores);
  const affiliateCampaigns = useCompanyStore((s) => s.affiliateCampaigns);
  const trackedLinks = useCompanyStore((s) => s.trackedLinks);
  const affiliateContent = useCompanyStore((s) => s.affiliateContent);
  const affiliatePosts = useCompanyStore((s) => s.affiliatePosts);
  const affiliateConversions = useCompanyStore((s) => s.affiliateConversions);
  const affiliateCommissions = useCompanyStore((s) => s.affiliateCommissions);

  const setActiveTab = useCompanyStore((s) => s.setActiveTab);
  const runAffiliateScoutCycle = useCompanyStore((s) => s.runAffiliateScoutCycle);
  const runAffiliateSelectProductMeeting = useCompanyStore((s) => s.runAffiliateSelectProductMeeting);
  const createAffiliateCampaign = useCompanyStore((s) => s.createAffiliateCampaign);
  const createAffiliateTrackedLink = useCompanyStore((s) => s.createAffiliateTrackedLink);
  const createAffiliateContentPiece = useCompanyStore((s) => s.createAffiliateContentPiece);
  const reviewAffiliateContentCompliance = useCompanyStore((s) => s.reviewAffiliateContentCompliance);
  const scheduleAffiliatePost = useCompanyStore((s) => s.scheduleAffiliatePost);
  const importAffiliateCsvReport = useCompanyStore((s) => s.importAffiliateCsvReport);
  const checkAllAffiliateLinksHealth = useCompanyStore((s) => s.checkAllAffiliateLinksHealth);
  const evaluateAffiliateRoiCutoffs = useCompanyStore((s) => s.evaluateAffiliateRoiCutoffs);

  const [subTab, setSubTab] = useState<AffSubTab>('scout');
  const [nicheQuery, setNicheQuery] = useState(settings.affiliate?.priorityNiches?.[0] || 'Gia dụng');
  const [selectedNet, setSelectedNet] = useState('shopee');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Content composer state
  const [contentCampaignId, setContentCampaignId] = useState('');
  const [contentType, setContentType] = useState<AffiliateContentPiece['type']>('review');
  const [contentTitle, setContentTitle] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [hasDisclosure, setHasDisclosure] = useState(true);
  const [claimsTested, setClaimsTested] = useState(false);

  // CSV Import state
  const [csvNetwork, setCsvNetwork] = useState('shopee');

  const scoreByProductId = useMemo(
    () => Object.fromEntries(affiliateScores.map((sc) => [sc.productId, sc])),
    [affiliateScores]
  );

  const hasAnyRealMetrics = affiliateConversions.length > 0 || affiliateCommissions.length > 0;
  const totalClicks = affiliateConversions.reduce((s, c) => s + c.clicks, 0);
  const totalOrders = affiliateConversions.reduce((s, c) => s + c.orders, 0);
  const pendingComm = affiliateCommissions.filter((c) => c.status === 'pending').reduce((s, c) => s + c.commissionVnd, 0);
  const approvedComm = affiliateCommissions.filter((c) => c.status === 'approved').reduce((s, c) => s + c.commissionVnd, 0);
  const paidComm = affiliateCommissions.filter((c) => c.status === 'paid').reduce((s, c) => s + c.commissionVnd, 0);
  const cancelledComm = affiliateCommissions.filter((c) => c.status === 'cancelled').reduce((s, c) => s + c.commissionVnd, 0);
  const epcVnd = totalClicks > 0 ? Math.round((approvedComm + paidComm + pendingComm) / totalClicks) : null;
  const crPct = totalClicks > 0 ? ((totalOrders / totalClicks) * 100).toFixed(2) : null;

  const shopeeCfg = settings.affiliate?.networks?.find((n) => n.id === 'shopee');
  const hasShopeeAffId = Boolean(shopeeCfg?.affId?.trim());

  const handleScout = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await runAffiliateScoutCycle(nicheQuery, selectedNet);
      setFeedback(`Đã săn & chấm điểm ${res.products.length} sản phẩm ngách "${nicheQuery}".`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Lỗi săn sản phẩm');
    } finally {
      setBusy(false);
    }
  };

  const handleMorningMeeting = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await runAffiliateSelectProductMeeting();
      setFeedback('Đã họp sáng "Chọn hàng" cùng Affiliate Manager, Marketing & CFO.');
    } finally {
      setBusy(false);
    }
  };

  const handleQuickCreateCampaign = async (productId: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      const camp = await createAffiliateCampaign({
        productId,
        channels: ['tiktok', 'facebook', 'youtube'],
        contentAngle: 'Review so sánh thực tế + checklist chọn mua chuẩn',
        budgetVnd: 500_000,
      });
      await createAffiliateTrackedLink({
        productId,
        subId: `cmp_${camp.id.slice(-4)}_tt`,
        campaignId: camp.id,
        createdBy: 'aff_link_ops',
      });
      setFeedback(`Đã tạo chiến dịch "${camp.productName}" & link sub_id đã xác minh Aff ID CEO.`);
      setSubTab('campaigns');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Không thể tạo chiến dịch');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateContent = async () => {
    const camp = affiliateCampaigns.find((c) => c.id === contentCampaignId) || affiliateCampaigns[0];
    if (!camp) {
      setFeedback('Cần tạo ít nhất 1 chiến dịch Affiliate trước khi viết nội dung.');
      return;
    }
    const link = trackedLinks.find((l) => l.campaignId === camp.id) || trackedLinks.find((l) => l.productId === camp.productId);
    if (!link) {
      setFeedback('Chưa có link sub_id xác minh Aff ID cho sản phẩm này.');
      return;
    }
    const piece = await createAffiliateContentPiece({
      campaignId: camp.id,
      productId: camp.productId,
      trackedLinkId: link.id,
      type: contentType,
      title: contentTitle.trim() || `[Review] ${camp.productName} — Có đáng mua?`,
      body:
        contentBody.trim() ||
        `Tổng hợp ưu nhược điểm ${camp.productName} từ thông số nhà bán.\nXem ưu đãi chính hãng tại: ${link.shortUrl}\n(${settings.affiliate.disclosureTemplate})`,
      hasAffiliateDisclosure: hasDisclosure,
      claimsTestedPersonally: claimsTested,
      authorId: 'aff_review_writer',
    });
    const comp = await reviewAffiliateContentCompliance(piece.id, 'aff_compliance');
    setContentTitle('');
    setContentBody('');
    setFeedback(
      comp.passed
        ? `Nội dung "${piece.title}" ĐẠT kiểm duyệt Tuân thủ!`
        : `Nội dung bị CHẶN bởi Compliance Agent: ${comp.reasons.join(' | ')}`
    );
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = await importAffiliateCsvReport({
      networkId: csvNetwork,
      csvText: text,
      fileName: file.name,
    });
    setFeedback(`Đã nhập file "${file.name}": ${res.clicksCount} dòng click, ${res.commissionsCount} dòng hoa hồng thật.`);
    e.target.value = '';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden text-xs">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            <span>Tầng 3 · Khối Affiliate (Tiếp thị liên kết)</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Săn sản phẩm Win → Chọn hàng → Link Aff ID CEO → Tuân thủ → Hoa hồng thật
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
            hasShopeeAffId
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300'
          }`}
        >
          {hasShopeeAffId ? `Shopee Aff ID: ${shopeeCfg?.affId}` : 'Chưa nhập Aff ID CEO (Mở Cài đặt)'}
        </button>
      </div>

      {/* Sub-navigation */}
      <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-1">
        {(
          [
            ['scout', 'Săn hàng Win'],
            ['campaigns', `Chiến dịch (${affiliateCampaigns.length})`],
            ['links', `Link & Sub_ID (${trackedLinks.length})`],
            ['content', `Nội dung & Tuân thủ (${affiliateContent.length})`],
            ['roi', 'Hoa hồng thật & ROI'],
          ] as Array<[AffSubTab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer ${
              subTab === id
                ? 'bg-teal-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {feedback && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-700 dark:text-sky-300 text-[11px] font-medium">
          {feedback}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* SUB-TAB 1: SĂN HÀNG WIN */}
        {subTab === 'scout' && (
          <>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/60 dark:bg-slate-900/50 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={nicheQuery}
                    onChange={(e) => setNicheQuery(e.target.value)}
                    placeholder="Ngách săn hàng (Gia dụng, Làm đẹp...)"
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
                <select
                  value={selectedNet}
                  onChange={(e) => setSelectedNet(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  {(settings.affiliate?.networks || []).map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleScout}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold cursor-pointer disabled:opacity-60"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Săn hàng Win</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleMorningMeeting}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer disabled:opacity-60"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Họp Chọn hàng</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quy tắc trung thực: mọi chỉ số thiếu từ API/CSV hiển thị rõ <strong>"chưa có"</strong>, không tự đoán.
              </p>
            </div>

            {affiliateProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-slate-500">
                Chưa có sản phẩm nào được săn. Bấm <strong>Săn hàng Win</strong> để Product Scout Tầng 3 chạy chu kỳ đầu tiên.
              </div>
            ) : (
              <div className="space-y-2.5">
                {affiliateProducts.map((p) => {
                  const sc = scoreByProductId[p.id];
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{p.name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                              {p.networkId}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Ngách: {p.niche} · Nguồn: {p.sourceLabel} ({p.origin})
                          </div>
                        </div>
                        {sc && (
                          <div
                            className={`px-2 py-1 rounded-lg text-center shrink-0 border ${
                              sc.label === 'win'
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                                : sc.label === 'potential'
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                                : 'bg-slate-500/15 border-slate-500/40 text-slate-400'
                            }`}
                          >
                            <div className="text-sm font-bold font-mono-num">{sc.totalScore}/100</div>
                            <div className="text-[9.5px] font-bold uppercase">{sc.label}</div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-[11px] bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg">
                        <div>
                          <div className="text-slate-400">Giá bán</div>
                          <div className="font-semibold">{formatMetricOrMissing(p.priceVnd, 'đ')}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Hoa hồng</div>
                          <div className="font-semibold text-teal-500">
                            {formatMetricOrMissing(p.commissionRatePercent, '%')}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Đã bán</div>
                          <div className="font-semibold">{formatMetricOrMissing(p.soldCount)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Đánh giá</div>
                          <div className="font-semibold">{formatMetricOrMissing(p.rating, '★')}</div>
                        </div>
                      </div>

                      {sc && sc.risks.length > 0 && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{sc.risks.join(' · ')}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10.5px] text-slate-400 truncate max-w-[260px]">{p.productUrl}</span>
                        <button
                          type="button"
                          onClick={() => handleQuickCreateCampaign(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Chọn chạy chiến dịch
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* SUB-TAB 2: CHIẾN DỊCH & COLLAB */}
        {subTab === 'campaigns' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                Các chiến dịch Affiliate phối hợp liên phòng ban (Marketing Tầng 2 + Studio Tầng 3)
              </div>
              <button
                type="button"
                onClick={async () => {
                  const cutCount = await evaluateAffiliateRoiCutoffs();
                  setFeedback(`Đã kiểm tra ROI âm liên tiếp: tạm dừng ${cutCount} chiến dịch không hiệu quả.`);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-500 text-[11px] font-semibold cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Kiểm tra cắt ROI âm</span>
              </button>
            </div>
            {affiliateCampaigns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-slate-500">
                Chưa có chiến dịch Affiliate nào. Hãy chọn sản phẩm Win ở tab "Săn hàng Win".
              </div>
            ) : (
              affiliateCampaigns.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-slate-900 dark:text-white">{c.productName}</div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : c.status === 'cut_negative_roi'
                          ? 'bg-rose-500/15 text-rose-500'
                          : 'bg-sky-500/15 text-sky-500'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Sàn: {c.networkId} · Kênh: {c.channels.join(', ')} · Ngân sách: {c.budgetVnd.toLocaleString('vi-VN')}đ
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">Góc nội dung: {c.contentAngle}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SUB-TAB 3: LINK & SUB_ID */}
        {subTab === 'links' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Mọi link đều được kiểm tra bắt buộc chứa đúng Aff ID của CEO trước khi phát hành.
              </span>
              <button
                type="button"
                onClick={async () => {
                  const res = await checkAllAffiliateLinksHealth();
                  setFeedback(`Đã kiểm tra ${res.checked} link: ${res.dead} link chết, ${res.expired} hết hạn.`);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Kiểm tra link chết</span>
              </button>
            </div>
            {trackedLinks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-slate-500">
                Chưa có link sub_id nào được tạo.
              </div>
            ) : (
              trackedLinks.map((lnk) => (
                <div
                  key={lnk.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-semibold text-sky-500">
                      <Link2 className="w-3.5 h-3.5" />
                      <span>{lnk.shortUrl}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        lnk.isAffIdVerified
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-rose-500/15 text-rose-500'
                      }`}
                    >
                      {lnk.isAffIdVerified ? `Aff ID OK (${lnk.affIdUsed})` : 'CẢNH BÁO AFF ID'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">{lnk.affiliateUrl}</div>
                  <div className="flex items-center justify-between text-[10.5px] text-slate-400">
                    <span>sub_id: {lnk.subId} · Sức khỏe: {lnk.linkHealth}</span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <ExternalLink className="w-3 h-3" /> {lnk.networkId}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SUB-TAB 4: NỘI DUNG & TUÂN THỦ */}
        {subTab === 'content' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Soạn & Kiểm duyệt Tuân thủ Affiliate</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={contentCampaignId}
                  onChange={(e) => setContentCampaignId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  <option value="">-- Chọn chiến dịch --</option>
                  {affiliateCampaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.productName}
                    </option>
                  ))}
                </select>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as AffiliateContentPiece['type'])}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  <option value="review">Bài Review khách quan</option>
                  <option value="top_list">Top List so sánh</option>
                  <option value="comparison">So sánh thông số</option>
                  <option value="video_script">Kịch bản Video ngắn</option>
                  <option value="landing_seo">Landing SEO</option>
                </select>
              </div>
              <input
                type="text"
                value={contentTitle}
                onChange={(e) => setContentTitle(e.target.value)}
                placeholder="Tiêu đề bài viết / video..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <textarea
                rows={3}
                value={contentBody}
                onChange={(e) => setContentBody(e.target.value)}
                placeholder="Nội dung (tránh tuyên bố chữa bệnh, tránh bịa 'tôi đã dùng thử' nếu chưa test thật)..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasDisclosure}
                      onChange={(e) => setHasDisclosure(e.target.checked)}
                    />
                    <span>Có nhãn minh bạch Affiliate</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={claimsTested}
                      onChange={(e) => setClaimsTested(e.target.checked)}
                    />
                    <span>CEO đã test sản phẩm thật</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleCreateContent}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                >
                  Tạo & Kiểm duyệt Compliance
                </button>
              </div>
            </div>

            {affiliateContent.map((piece) => (
              <div
                key={piece.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-slate-900 dark:text-white">{piece.title}</div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      piece.complianceStatus === 'passed'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : piece.complianceStatus === 'blocked'
                        ? 'bg-rose-500/15 text-rose-500'
                        : 'bg-amber-500/15 text-amber-500'
                    }`}
                  >
                    {piece.complianceStatus === 'passed'
                      ? 'ĐẠT TUÂN THỦ'
                      : piece.complianceStatus === 'blocked'
                      ? 'BỊ CHẶN'
                      : 'CHỜ DUYỆT'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-line">{piece.body}</p>
                {piece.complianceReasons.length > 0 && (
                  <div className="text-[11px] text-rose-500 font-medium">
                    Lý do: {piece.complianceReasons.join(' | ')}
                  </div>
                )}
                {piece.complianceStatus === 'passed' && (
                  <div className="flex items-center gap-1.5 pt-1">
                    {(['tiktok', 'facebook', 'youtube'] as AffiliateChannelPost['platform'][]).map((plat) => (
                      <button
                        key={plat}
                        type="button"
                        onClick={async () => {
                          const res = await scheduleAffiliatePost({
                            contentPieceId: piece.id,
                            platform: plat,
                            isPaidAd: false,
                          });
                          setFeedback(
                            res.ok
                              ? `Đã lên lịch đăng lên ${plat} (trạng thái: ${res.post?.status}).`
                              : res.reason || 'Không thể lên lịch đăng.'
                          );
                        }}
                        className="px-2 py-1 rounded bg-sky-600/15 hover:bg-sky-600/25 text-sky-500 text-[10.5px] font-semibold cursor-pointer"
                      >
                        Lên lịch {plat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {affiliatePosts.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-1.5">
                <div className="font-semibold text-slate-700 dark:text-slate-200">Lịch đăng kênh Affiliate</div>
                {affiliatePosts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between text-[11px] py-1 border-t border-slate-100 dark:border-slate-800">
                    <span>
                      [{post.platform}] sub_id: {post.subId}
                    </span>
                    <span className="font-semibold text-sky-500">{post.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 5: HOA HỒNG THẬT & ROI */}
        {subTab === 'roi' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900">
                <div className="text-[10.5px] text-slate-400">Tổng Click</div>
                <div className="text-base font-bold font-mono-num">
                  {hasAnyRealMetrics ? totalClicks.toLocaleString('vi-VN') : '—'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900">
                <div className="text-[10.5px] text-slate-400">EPC / CR</div>
                <div className="text-base font-bold font-mono-num text-sky-500">
                  {epcVnd !== null ? `${epcVnd.toLocaleString('vi-VN')}đ` : '—'} · {crPct !== null ? `${crPct}%` : '—'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900">
                <div className="text-[10.5px] text-slate-400">Đã duyệt / Đã trả</div>
                <div className="text-base font-bold font-mono-num text-emerald-500">
                  {hasAnyRealMetrics ? `${(approvedComm + paidComm).toLocaleString('vi-VN')}đ` : '—'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-[11px]">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2">
                <div className="text-slate-400">Tạm giữ (Pending)</div>
                <div className="font-bold">{hasAnyRealMetrics ? `${pendingComm.toLocaleString('vi-VN')}đ` : '—'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2">
                <div className="text-slate-400">Đã duyệt (Approved)</div>
                <div className="font-bold text-emerald-500">{hasAnyRealMetrics ? `${approvedComm.toLocaleString('vi-VN')}đ` : '—'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2">
                <div className="text-slate-400">Đã thanh toán</div>
                <div className="font-bold text-sky-500">{hasAnyRealMetrics ? `${paidComm.toLocaleString('vi-VN')}đ` : '—'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2">
                <div className="text-slate-400">Hủy / Hoàn đơn</div>
                <div className="font-bold text-rose-500">{hasAnyRealMetrics ? `${cancelledComm.toLocaleString('vi-VN')}đ` : '—'}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>Nhập báo cáo CSV thật từ Shopee / TikTok / Accesstrade</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Bảng trống mặc định hiển thị "—" và không bao giờ tự bịa số liệu hoa hồng. Tải lên CSV xuất từ sàn để cập nhật đối soát.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={csvNetwork}
                  onChange={(e) => setCsvNetwork(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  {(settings.affiliate?.networks || []).map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
                <label className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer">
                  <span>Chọn file CSV báo cáo thật</span>
                  <input type="file" accept=".csv,.txt" onChange={handleCsvUpload} className="hidden" />
                </label>
              </div>
            </div>

            {affiliateCommissions.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
                {affiliateCommissions.slice(0, 20).map((cm) => (
                  <div key={cm.id} className="p-2.5 flex items-center justify-between gap-2 text-[11px]">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{cm.productName}</div>
                      <div className="text-slate-400">
                        {cm.networkId} · sub_id: {cm.subId} · {cm.reportDate} · {cm.sourceFileOrApi}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-emerald-500">+{cm.commissionVnd.toLocaleString('vi-VN')}đ</div>
                      <div className="text-[10px] uppercase text-slate-400">{cm.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
