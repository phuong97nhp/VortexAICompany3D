import {
  AffiliateCampaign,
  AffiliateClickConversion,
  AffiliateCommission,
  AffiliateContentPiece,
  AffiliateNetworkConfig,
  AffiliateProduct,
  AffiliateProductScore,
  AffiliateSettings,
  TrackedLink,
} from '../../types';
import {
  buildDeterministicAffiliateUrl,
  parseClickCsvRows,
  parseCommissionCsvRows,
} from './AffiliateNetworkAdapter';

/**
 * Transparent 0-100 scoring formula for "Săn sản phẩm Win".
 * Never guesses null metrics: missing fields stay null / "chưa có" and contribute 0 score + explicit risk warning.
 */
export function scoreAffiliateProduct(
  product: AffiliateProduct,
  scoredBy = 'trend_analyst'
): AffiliateProductScore {
  const reasons: string[] = [];
  const risks: string[] = [];

  // 1) Commission rate & estimated commission (max 25)
  let commissionScore = 0;
  if (product.commissionRatePercent === null || product.commissionRatePercent === undefined) {
    risks.push('Hoa hồng: chưa có số liệu từ sàn/file CSV.');
  } else {
    if (product.commissionRatePercent >= 12) commissionScore = 25;
    else if (product.commissionRatePercent >= 9) commissionScore = 21;
    else if (product.commissionRatePercent >= 6) commissionScore = 15;
    else if (product.commissionRatePercent >= 3) commissionScore = 9;
    else commissionScore = 4;

    if (product.commissionRatePercent >= 8) {
      reasons.push(`Tỷ lệ hoa hồng ${product.commissionRatePercent}% đạt ngưỡng sinh lời tốt.`);
    } else {
      risks.push(`Hoa hồng ${product.commissionRatePercent}% khá mỏng, cần lưu lượng lớn.`);
    }
  }

  // 2) Price fit for VN impulse / considered purchase (120k - 1.8M) (max 15)
  let priceFitScore = 0;
  if (product.priceVnd === null || product.priceVnd === undefined) {
    risks.push('Giá bán: chưa có.');
  } else if (product.priceVnd >= 150_000 && product.priceVnd <= 1_800_000) {
    priceFitScore = 15;
    reasons.push(`Tầm giá ${product.priceVnd.toLocaleString('vi-VN')}đ dễ chốt đơn qua review ngắn.`);
  } else if (product.priceVnd >= 80_000 && product.priceVnd <= 3_500_000) {
    priceFitScore = 10;
  } else {
    priceFitScore = 5;
    risks.push('Mức giá nằm ngoài vùng chuyển đổi nhanh (150k–1.8tr).');
  }

  // 3) Demand & growth velocity (max 25)
  let demandVelocityScore = 0;
  if (product.soldCount === null || product.soldCount === undefined) {
    risks.push('Lượt bán: chưa có.');
  } else {
    const baseSold =
      product.soldCount >= 3000 ? 15 : product.soldCount >= 1000 ? 12 : product.soldCount >= 300 ? 8 : 4;
    const growth =
      product.salesGrowthPercent === null || product.salesGrowthPercent === undefined
        ? 0
        : product.salesGrowthPercent >= 30
        ? 10
        : product.salesGrowthPercent >= 15
        ? 7
        : product.salesGrowthPercent > 0
        ? 4
        : 0;
    demandVelocityScore = Math.min(25, baseSold + growth);
    if (product.soldCount >= 1000) {
      reasons.push(
        `Nhu cầu cao (${product.soldCount.toLocaleString('vi-VN')} đã bán${
          product.salesGrowthPercent !== null ? `, tăng ${product.salesGrowthPercent}%` : ''
        }).`
      );
    }
  }

  // 4) Rating, review count & shop trust (max 20)
  let ratingTrustScore = 0;
  if (product.rating === null || product.rating === undefined) {
    risks.push('Đánh giá sao: chưa có.');
  } else {
    const starPts = product.rating >= 4.8 ? 10 : product.rating >= 4.5 ? 7 : product.rating >= 4.2 ? 4 : 1;
    const trustPts =
      product.shopTrustScore !== null && product.shopTrustScore >= 90
        ? 10
        : product.shopTrustScore !== null && product.shopTrustScore >= 75
        ? 6
        : 3;
    ratingTrustScore = starPts + trustPts;
    if (product.rating < 4.5) {
      risks.push(`Điểm đánh giá ${product.rating}★ thấp hơn chuẩn 4.5★ (nguy cơ hoàn hàng cao).`);
    } else {
      reasons.push(`Shop uy tín & đánh giá ${product.rating}★ giúp giảm tỷ lệ hủy/hoàn đơn.`);
    }
  }

  // 5) Stock, free ship / voucher support (max 15)
  let stockVoucherScore = 0;
  if (product.stockCount !== null && product.stockCount >= 100) stockVoucherScore += 7;
  else if (product.stockCount === null) risks.push('Tồn kho: chưa có.');
  else risks.push(`Tồn kho thấp (${product.stockCount}), dễ đứt hàng khi viral.`);

  if (product.hasVoucher) stockVoucherScore += 5;
  if (product.shippingFeeVnd === 0) stockVoucherScore += 3;

  // 6) Competition penalty (0 to -12)
  const competitionPenalty =
    product.competitionLevel === 'high' ? 10 : product.competitionLevel === 'medium' ? 4 : 0;
  if (product.competitionLevel === 'high') {
    risks.push('Cạnh tranh cao trên kênh, cần góc review khác biệt.');
  }

  const rawTotal =
    commissionScore +
    priceFitScore +
    demandVelocityScore +
    ratingTrustScore +
    stockVoucherScore -
    competitionPenalty;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal)));
  const label: AffiliateProductScore['label'] =
    totalScore >= 75 ? 'win' : totalScore >= 55 ? 'potential' : 'skip';

  return {
    id: `score_${product.id}`,
    productId: product.id,
    totalScore,
    label,
    components: {
      commissionScore,
      priceFitScore,
      demandVelocityScore,
      ratingTrustScore,
      stockVoucherScore,
      competitionPenalty,
    },
    reasons,
    risks,
    scoredBy,
    scoredAt: Date.now(),
  };
}

export function formatMetricOrMissing(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'chưa có';
  }
  return `${value.toLocaleString('vi-VN')}${suffix}`;
}

export function createAndVerifyTrackedLink(params: {
  product: AffiliateProduct;
  network: AffiliateNetworkConfig;
  campaignId?: string;
  subId: string;
  shortlinkDomain: string;
  createdBy: string;
}): TrackedLink {
  const affId = (params.network.affId || '').trim();
  if (!affId) {
    throw new Error(`Chưa có Aff ID của CEO cho sàn ${params.network.name}. Không thể tạo link affiliate.`);
  }
  const cleanSub = params.subId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const affiliateUrl = buildDeterministicAffiliateUrl(
    params.product.productUrl,
    params.network.id,
    affId,
    cleanSub
  );
  const isAffIdVerified = affiliateUrl.includes(affId) || affiliateUrl.includes(encodeURIComponent(affId));
  if (!isAffIdVerified) {
    throw new Error('Link tạo ra không chứa Aff ID của CEO. Đã chặn xuất link để bảo vệ doanh thu.');
  }
  const domain = (params.shortlinkDomain || 'go.aicompany.vn').replace(/^https?:\/\//, '');
  return {
    id: `lnk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    campaignId: params.campaignId,
    productId: params.product.id,
    networkId: params.network.id,
    affIdUsed: affId,
    subId: cleanSub,
    originalUrl: params.product.productUrl,
    affiliateUrl,
    shortUrl: `https://${domain}/r/${cleanSub}`,
    isAffIdVerified: true,
    linkHealth: 'ok',
    lastCheckedAt: Date.now(),
    createdBy: params.createdBy,
    createdAt: Date.now(),
  };
}

export interface AffiliateComplianceCheckOutput {
  passed: boolean;
  reasons: string[];
  requiresCeoApproval: boolean;
  ceoApprovalReason?: string;
}

const BANNED_MEDICAL_EXAGGERATION_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /(chữa khỏi|trị dứt điểm|đặc trị|thần dược|khỏi hẳn 100%|cam kết khỏi)/i,
    reason: 'Vi phạm Luật Quảng cáo: chứa tuyên bố chữa khỏi bệnh / thần dược không được phép.',
  },
  {
    pattern: /(giảm \d+\s*kg trong \d+\s*ngày|trắng bật \d+ tông sau 1 lần|cam kết hiệu quả 100%)/i,
    reason: 'Tuyên bố thổi phồng công dụng mỹ phẩm/thực phẩm chức năng không có cơ sở kiểm chứng.',
  },
  {
    pattern: /(chính thức phân phối độc quyền|bác sĩ khuyên dùng số 1)/i,
    reason: 'Nhận định gây hiểu nhầm về chứng nhận y khoa / phân phối độc quyền.',
  },
];

const FAKE_PERSONAL_EXPERIENCE_PATTERNS: RegExp[] = [
  /tôi đã dùng thử/i,
  /mình đã trải nghiệm thực tế/i,
  /sau \d+ (tuần|tháng) sử dụng/i,
  /hình ảnh mình tự chụp tại nhà/i,
];

export function runAffiliateComplianceCheck(params: {
  piece: Pick<AffiliateContentPiece, 'title' | 'body' | 'hasAffiliateDisclosure' | 'claimsTestedPersonally'>;
  trackedLink?: TrackedLink;
  settings: AffiliateSettings;
  isFirstPostOnChannel?: boolean;
  isPaidAd?: boolean;
}): AffiliateComplianceCheckOutput {
  const { piece, trackedLink, settings, isFirstPostOnChannel, isPaidAd } = params;
  const reasons: string[] = [];
  const fullText = `${piece.title}\n${piece.body}`;

  // 1) Check Aff ID verification
  if (!trackedLink || !trackedLink.isAffIdVerified || !trackedLink.affIdUsed) {
    reasons.push('Thiếu liên kết đã xác minh Aff ID của CEO.');
  } else {
    const netCfg = settings.networks.find((n) => n.id === trackedLink.networkId);
    if (!netCfg || !netCfg.affId || trackedLink.affIdUsed !== netCfg.affId.trim()) {
      reasons.push('Aff ID trong link không khớp với Aff ID CEO cấu hình trong Cài đặt > Affiliate.');
    }
  }

  // 2) Mandatory disclosure label
  if (settings.requireDisclosureLabel) {
    const hasDisclosureText = /liên kết tiếp thị|affiliate|hoa hồng|quảng cáo/i.test(fullText);
    if (!piece.hasAffiliateDisclosure && !hasDisclosureText) {
      reasons.push('Thiếu nhãn công khai liên kết tiếp thị / hoa hồng affiliate (bắt buộc).');
    }
  }

  // 3) No fake personal-use review
  if (!piece.claimsTestedPersonally) {
    for (const pat of FAKE_PERSONAL_EXPERIENCE_PATTERNS) {
      if (pat.test(fullText)) {
        reasons.push('Cấm bịa đặt trải nghiệm cá nhân ("tôi đã dùng thử") khi sản phẩm chưa được test thật.');
        break;
      }
    }
  }

  // 4) No medical / exaggerated advertising claims
  for (const rule of BANNED_MEDICAL_EXAGGERATION_PATTERNS) {
    if (rule.pattern.test(fullText)) {
      reasons.push(rule.reason);
    }
  }

  const requiresCeoApproval = Boolean(isFirstPostOnChannel || isPaidAd);
  const ceoApprovalReason = isPaidAd
    ? 'Chiến dịch chạy quảng cáo trả phí cần CEO duyệt trước khi chi tiền.'
    : isFirstPostOnChannel
    ? 'Bài đăng đầu tiên trên kênh mới cần CEO duyệt trước khi xuất bản.'
    : undefined;

  return {
    passed: reasons.length === 0,
    reasons,
    requiresCeoApproval,
    ceoApprovalReason,
  };
}

export function parseAffiliateCsvReport(
  csvText: string,
  networkId: string,
  fileName: string
): {
  clicks: AffiliateClickConversion[];
  commissions: AffiliateCommission[];
} {
  const lowerHeader = (csvText.split('\n')[0] || '').toLowerCase();
  const hasCommissionCols = lowerHeader.includes('commission') || lowerHeader.includes('hoa_hong') || lowerHeader.includes('order_id');
  const hasClickCols = lowerHeader.includes('click') || lowerHeader.includes('luot_click');

  const commissions = hasCommissionCols ? parseCommissionCsvRows(csvText, networkId, fileName) : [];
  const clicks = hasClickCols ? parseClickCsvRows(csvText, networkId, fileName) : [];
  return { clicks, commissions };
}

export interface AffiliateDashboardMetrics {
  totalClicks: number | null;
  totalOrders: number | null;
  pendingVnd: number | null;
  approvedVnd: number | null;
  paidVnd: number | null;
  cancelledVnd: number | null;
  epcVnd: number | null;
  crPercent: number | null;
  roiPercent: number | null;
  hasRealData: boolean;
}

/**
 * Computes REAL-ONLY commission & conversion KPIs.
 * Returns null (displayed as "—") whenever real reports are empty. Never fabricates numbers.
 */
export function computeRealAffiliateMetrics(
  clicks: AffiliateClickConversion[],
  commissions: AffiliateCommission[],
  totalSpendVnd = 0
): AffiliateDashboardMetrics {
  if (clicks.length === 0 && commissions.length === 0) {
    return {
      totalClicks: null,
      totalOrders: null,
      pendingVnd: null,
      approvedVnd: null,
      paidVnd: null,
      cancelledVnd: null,
      epcVnd: null,
      crPercent: null,
      roiPercent: null,
      hasRealData: false,
    };
  }

  const totalClicks = clicks.reduce((s, c) => s + c.clicks, 0);
  const ordersFromClicks = clicks.reduce((s, c) => s + c.orders, 0);
  const nonCancelledComm = commissions.filter((c) => c.status !== 'cancelled');
  const totalOrders = Math.max(ordersFromClicks, nonCancelledComm.length);

  const pendingVnd = commissions.filter((c) => c.status === 'pending').reduce((s, c) => s + c.commissionVnd, 0);
  const approvedVnd = commissions.filter((c) => c.status === 'approved').reduce((s, c) => s + c.commissionVnd, 0);
  const paidVnd = commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + c.commissionVnd, 0);
  const cancelledVnd = commissions.filter((c) => c.status === 'cancelled').reduce((s, c) => s + c.commissionVnd, 0);

  const realizedCommission = approvedVnd + paidVnd;
  const epcVnd = totalClicks > 0 ? Math.round((realizedCommission + pendingVnd) / totalClicks) : null;
  const crPercent = totalClicks > 0 ? Number(((totalOrders / totalClicks) * 100).toFixed(2)) : null;
  const roiPercent =
    totalSpendVnd > 0 ? Number((((realizedCommission - totalSpendVnd) / totalSpendVnd) * 100).toFixed(1)) : null;

  return {
    totalClicks,
    totalOrders,
    pendingVnd,
    approvedVnd,
    paidVnd,
    cancelledVnd,
    epcVnd,
    crPercent,
    roiPercent,
    hasRealData: true,
  };
}

export function shouldAutoCutNegativeRoi(
  campaign: AffiliateCampaign,
  commissionsForCampaign: AffiliateCommission[],
  autoCutDays: number
): { shouldCut: boolean; reason?: string } {
  if (campaign.status !== 'active') return { shouldCut: false };
  const validRev = commissionsForCampaign
    .filter((c) => c.status === 'approved' || c.status === 'paid')
    .reduce((s, c) => s + c.commissionVnd, 0);
  if (campaign.budgetVnd > 0 && validRev < campaign.budgetVnd && campaign.negativeRoiDays >= autoCutDays) {
    return {
      shouldCut: true,
      reason: `Chiến dịch "${campaign.productName}" có ROI âm liên tục ${campaign.negativeRoiDays} ngày (Chi ${campaign.budgetVnd.toLocaleString('vi-VN')}đ > Thu ${validRev.toLocaleString('vi-VN')}đ).`,
    };
  }
  return { shouldCut: false };
}
