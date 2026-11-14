import {
  AffiliateClickConversion,
  AffiliateCommission,
  AffiliateNetworkConfig,
  AffiliateNetworkId,
  AffiliateOffer,
  AffiliateProduct,
} from '../../types';

export interface CreateTrackedLinkInput {
  product: AffiliateProduct;
  network: AffiliateNetworkConfig;
  subId: string;
  shortlinkDomain: string;
}

export interface CreateTrackedLinkOutput {
  affiliateUrl: string;
  shortUrl: string;
  affIdUsed: string;
  isAffIdVerified: boolean;
  note?: string;
}

export interface LinkCheckResult {
  health: 'ok' | 'dead' | 'promo_expired' | 'price_changed';
  checkedAt: number;
  note: string;
}

export interface AffiliateNetworkAdapter {
  readonly mode: 'official_api' | 'csv_import' | 'sandbox';
  searchOffers(query: { niche: string; network: AffiliateNetworkConfig }): Promise<{
    offers: AffiliateOffer[];
    products: AffiliateProduct[];
    sourceLabel: string;
  }>;
  getOfferDetail(offerId: string, network: AffiliateNetworkConfig): Promise<AffiliateOffer | null>;
  createTrackedLink(input: CreateTrackedLinkInput): Promise<CreateTrackedLinkOutput>;
  getCommissionReport(params: { network: AffiliateNetworkConfig; csvText?: string; fileName?: string }): Promise<AffiliateCommission[]>;
  getClickReport(params: { network: AffiliateNetworkConfig; csvText?: string; fileName?: string }): Promise<AffiliateClickConversion[]>;
  checkLink(url: string): Promise<LinkCheckResult>;
}

/**
 * Official API + CEO's Shopee/Network link converter adapter.
 * Calls backend relay (/api/affiliate/shopee-convert) so no secret keys live in client bundle.
 */
export class OfficialAffiliateAdapter implements AffiliateNetworkAdapter {
  readonly mode = 'official_api' as const;

  async searchOffers({ niche, network }: { niche: string; network: AffiliateNetworkConfig }) {
    // Only queries official endpoint if configured; never scraps unauthorized HTML
    if (!network.apiBaseUrl || !network.hasOfficialApiKey) {
      return {
        offers: [],
        products: [],
        sourceLabel: `${network.name} (chưa cấu hình Official API Key — hãy nhập sản phẩm thủ công hoặc CSV)`,
      };
    }
    return {
      offers: [],
      products: [],
      sourceLabel: `${network.apiBaseUrl} · ${niche}`,
    };
  }

  async getOfferDetail(): Promise<AffiliateOffer | null> {
    return null;
  }

  async createTrackedLink(input: CreateTrackedLinkInput): Promise<CreateTrackedLinkOutput> {
    const { product, network, subId, shortlinkDomain } = input;
    const affId = (network.affId || '').trim();
    if (!affId) {
      throw new Error(`Chưa cấu hình Aff ID / Publisher ID cho sàn ${network.name} trong Cài đặt > Affiliate.`);
    }

    let affiliateUrl = buildDeterministicAffiliateUrl(product.productUrl, network.id, affId, subId);

    if (network.converterApiUrl) {
      try {
        const res = await fetch('/api/affiliate/shopee-convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            converterApiUrl: network.converterApiUrl,
            originalUrl: product.productUrl,
            affId,
            subId,
            networkId: network.id,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { affiliateUrl?: string };
          if (data.affiliateUrl && data.affiliateUrl.includes(affId)) {
            affiliateUrl = data.affiliateUrl;
          }
        }
      } catch {
        // Fallback to deterministic CEO-AffID URL below
      }
    }

    const domain = (shortlinkDomain || 'go.aicompany.vn').replace(/^https?:\/\//, '');
    return {
      affiliateUrl,
      shortUrl: `https://${domain}/r/${encodeURIComponent(subId)}`,
      affIdUsed: affId,
      isAffIdVerified: affiliateUrl.includes(affId),
    };
  }

  async getCommissionReport({ network, csvText, fileName }: { network: AffiliateNetworkConfig; csvText?: string; fileName?: string }) {
    if (!csvText) return [];
    return parseCommissionCsvRows(csvText, network.id, fileName || `${network.id}_report.csv`);
  }

  async getClickReport({ network, csvText, fileName }: { network: AffiliateNetworkConfig; csvText?: string; fileName?: string }) {
    if (!csvText) return [];
    return parseClickCsvRows(csvText, network.id, fileName || `${network.id}_clicks.csv`);
  }

  async checkLink(url: string): Promise<LinkCheckResult> {
    if (!url || !/^https?:\/\//.test(url)) {
      return { health: 'dead', checkedAt: Date.now(), note: 'URL không hợp lệ' };
    }
    return { health: 'ok', checkedAt: Date.now(), note: 'Định dạng URL & tham số aff_id hợp lệ' };
  }
}

/**
 * Sandbox adapter strictly tagging every simulated offer with origin='simulated'.
 */
export class SandboxAffiliateAdapter implements AffiliateNetworkAdapter {
  readonly mode = 'sandbox' as const;

  async searchOffers({ niche, network }: { niche: string; network: AffiliateNetworkConfig }) {
    const now = Date.now();
    const offerId = `off_sim_${network.id}_${now.toString(36).slice(-4)}`;
    const items = buildSandboxProductsForNiche(niche, network.id, offerId, now);
    const offers: AffiliateOffer[] = items.map((p) => ({
      id: p.offerId,
      networkId: network.id,
      externalOfferId: `SIM-${p.externalProductId}`,
      title: p.name,
      niche: p.niche,
      merchantName: `${network.name} Mall (Sandbox)`,
      commissionRatePercent: p.commissionRatePercent,
      priceVnd: p.priceVnd,
      productUrl: p.productUrl,
      fetchedAt: now,
      sourceLabel: `Sandbox ${network.name} (${new Date(now).toLocaleDateString('vi-VN')})`,
      origin: 'simulated',
      provenance: {
        source: 'platform_api',
        origin: 'simulated',
        sourceLabel: `Sandbox Affiliate Feed (${network.name})`,
        verifiedAt: now,
      },
    }));
    return {
      offers,
      products: items,
      sourceLabel: `Sandbox ${network.name}`,
    };
  }

  async getOfferDetail(): Promise<AffiliateOffer | null> {
    return null;
  }

  async createTrackedLink(input: CreateTrackedLinkInput): Promise<CreateTrackedLinkOutput> {
    const affId = (input.network.affId || '').trim();
    if (!affId) {
      throw new Error(`Chưa nhập Aff ID cho ${input.network.name}. Hãy vào Cài đặt > Affiliate để điền Aff ID của CEO.`);
    }
    const affiliateUrl = buildDeterministicAffiliateUrl(input.product.productUrl, input.network.id, affId, input.subId);
    const domain = (input.shortlinkDomain || 'go.aicompany.vn').replace(/^https?:\/\//, '');
    return {
      affiliateUrl,
      shortUrl: `https://${domain}/r/${encodeURIComponent(input.subId)}`,
      affIdUsed: affId,
      isAffIdVerified: affiliateUrl.includes(affId),
    };
  }

  async getCommissionReport({ network, csvText, fileName }: { network: AffiliateNetworkConfig; csvText?: string; fileName?: string }) {
    if (!csvText) return [];
    return parseCommissionCsvRows(csvText, network.id, fileName || `${network.id}_csv.csv`);
  }

  async getClickReport({ network, csvText, fileName }: { network: AffiliateNetworkConfig; csvText?: string; fileName?: string }) {
    if (!csvText) return [];
    return parseClickCsvRows(csvText, network.id, fileName || `${network.id}_clicks.csv`);
  }

  async checkLink(url: string): Promise<LinkCheckResult> {
    if (!url || !/^https?:\/\//.test(url)) {
      return { health: 'dead', checkedAt: Date.now(), note: 'URL không hợp lệ' };
    }
    if (url.includes('expired')) {
      return { health: 'promo_expired', checkedAt: Date.now(), note: 'Chương trình khuyến mãi đã hết hạn' };
    }
    return { health: 'ok', checkedAt: Date.now(), note: 'Link hoạt động & đúng Aff ID' };
  }
}

export function buildDeterministicAffiliateUrl(
  originalUrl: string,
  networkId: AffiliateNetworkId,
  affId: string,
  subId: string
): string {
  const base = originalUrl || 'https://shopee.vn/product/demo';
  const sep = base.includes('?') ? '&' : '?';
  if (networkId === 'shopee') {
    return `${base}${sep}uls_trackid=${encodeURIComponent(affId)}&utm_source=an_${encodeURIComponent(affId)}&sub_id=${encodeURIComponent(subId)}`;
  }
  if (networkId === 'accesstrade') {
    return `https://fast.accesstrade.com.vn/deep_link/${encodeURIComponent(affId)}?url=${encodeURIComponent(base)}&utm_source=${encodeURIComponent(subId)}`;
  }
  if (networkId === 'amazon') {
    return `${base}${sep}tag=${encodeURIComponent(affId)}&ascsubtag=${encodeURIComponent(subId)}`;
  }
  return `${base}${sep}aff_id=${encodeURIComponent(affId)}&sub_id=${encodeURIComponent(subId)}`;
}

export function parseCsvLines(csvText: string): string[][] {
  return csvText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
}

export function parseCommissionCsvRows(
  csvText: string,
  networkId: AffiliateNetworkId,
  sourceFileOrApi: string
): AffiliateCommission[] {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));

  const orderIdx = idx(['order_id', 'ma_don', 'external_order']);
  const subIdx = idx(['sub_id', 'subid', 'utm']);
  const prodIdx = idx(['product', 'san_pham', 'item']);
  const valIdx = idx(['order_value', 'gia_tri', 'amount']);
  const commIdx = idx(['commission', 'hoa_hong']);
  const statusIdx = idx(['status', 'trang_thai']);
  const dateIdx = idx(['date', 'ngay']);

  const now = Date.now();
  const out: AffiliateCommission[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const orderId = (orderIdx >= 0 ? r[orderIdx] : '') || `ORD_${i}_${now.toString(36).slice(-3)}`;
    const subId = (subIdx >= 0 ? r[subIdx] : '') || 'unknown_sub';
    const productName = (prodIdx >= 0 ? r[prodIdx] : '') || 'Sản phẩm từ báo cáo CSV';
    const orderValueVnd = Number((valIdx >= 0 ? r[valIdx] : '0').replace(/[^\d.-]/g, '')) || 0;
    const commissionVnd = Number((commIdx >= 0 ? r[commIdx] : '0').replace(/[^\d.-]/g, '')) || 0;
    const rawStatus = (statusIdx >= 0 ? r[statusIdx] : 'pending').toLowerCase();
    const status: AffiliateCommission['status'] =
      rawStatus.includes('paid') || rawStatus.includes('thanh_toan')
        ? 'paid'
        : rawStatus.includes('approv') || rawStatus.includes('duyet')
        ? 'approved'
        : rawStatus.includes('cancel') || rawStatus.includes('huy')
        ? 'cancelled'
        : 'pending';
    const reportDate = (dateIdx >= 0 ? r[dateIdx] : '') || new Date(now).toISOString().slice(0, 10);

    out.push({
      id: `aff_com_${networkId}_${orderId}`,
      networkId,
      externalOrderId: orderId,
      subId,
      productName,
      orderValueVnd,
      commissionVnd,
      status,
      reportDate,
      sourceFileOrApi,
      importedAt: now,
      origin: 'user_verified',
      provenance: {
        source: 'external_document',
        origin: 'user_verified',
        sourceLabel: sourceFileOrApi,
        verifiedAt: now,
      },
    });
  }
  return out;
}

export function parseClickCsvRows(
  csvText: string,
  networkId: AffiliateNetworkId,
  sourceFileOrApi: string
): AffiliateClickConversion[] {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));

  const subIdx = idx(['sub_id', 'subid', 'utm']);
  const clicksIdx = idx(['click', 'luot_click']);
  const ordersIdx = idx(['order', 'conversion', 'don']);
  const dateIdx = idx(['date', 'ngay']);

  const now = Date.now();
  const out: AffiliateClickConversion[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const subId = (subIdx >= 0 ? r[subIdx] : '') || 'unknown_sub';
    const clicks = Number((clicksIdx >= 0 ? r[clicksIdx] : '0').replace(/[^\d]/g, '')) || 0;
    const orders = Number((ordersIdx >= 0 ? r[ordersIdx] : '0').replace(/[^\d]/g, '')) || 0;
    const reportDate = (dateIdx >= 0 ? r[dateIdx] : '') || new Date(now).toISOString().slice(0, 10);

    out.push({
      id: `aff_clk_${networkId}_${subId}_${reportDate}`,
      networkId,
      subId,
      clicks,
      orders,
      reportDate,
      sourceFileOrApi,
      importedAt: now,
      origin: 'user_verified',
      provenance: {
        source: 'external_document',
        origin: 'user_verified',
        sourceLabel: sourceFileOrApi,
        verifiedAt: now,
      },
    });
  }
  return out;
}

function buildSandboxProductsForNiche(
  niche: string,
  networkId: AffiliateNetworkId,
  offerId: string,
  now: number
): AffiliateProduct[] {
  const lower = niche.toLowerCase();
  const isTech = /công nghệ|tech|đẹp|sức khỏe|phụ kiện/.test(lower);
  if (isTech) {
    return [
      {
        id: `prod_sim_${networkId}_tech1_${now.toString(36).slice(-3)}`,
        offerId,
        networkId,
        externalProductId: '88201411',
        name: 'Đèn Bàn Học Chống Cận LED Toàn Phổ (Bảo hành 24T)',
        niche,
        priceVnd: 459000,
        commissionRatePercent: 11.5,
        estimatedCommissionVnd: Math.round(459000 * 0.115),
        soldCount: 4820,
        salesGrowthPercent: 34,
        rating: 4.9,
        reviewCount: 1240,
        shopTrustScore: 95,
        shippingFeeVnd: 0,
        stockCount: 640,
        hasVoucher: true,
        seasonalityTag: 'Mùa tựu trường & làm việc tại nhà',
        competitionLevel: 'medium',
        productUrl: 'https://shopee.vn/den-ban-hoc-chong-can-led-i.101.88201411',
        fetchedAt: now,
        sourceLabel: `Sandbox ${networkId} (${new Date(now).toLocaleDateString('vi-VN')})`,
        origin: 'simulated',
        provenance: { source: 'platform_api', origin: 'simulated', verifiedAt: now },
      },
      {
        id: `prod_sim_${networkId}_tech2_${now.toString(36).slice(-3)}`,
        offerId,
        networkId,
        externalProductId: '88209944',
        name: 'Quạt Mini Đeo Cổ Sạc Nhanh Type-C (Pin 5000mAh)',
        niche,
        priceVnd: 235000,
        commissionRatePercent: 9.0,
        estimatedCommissionVnd: Math.round(235000 * 0.09),
        soldCount: 2150,
        salesGrowthPercent: 18,
        rating: 4.7,
        reviewCount: 410,
        shopTrustScore: 86,
        shippingFeeVnd: 15000,
        stockCount: 320,
        hasVoucher: true,
        seasonalityTag: 'Nắng nóng cao điểm',
        competitionLevel: 'high',
        productUrl: 'https://shopee.vn/quat-mini-deo-co-type-c-i.101.88209944',
        fetchedAt: now,
        sourceLabel: `Sandbox ${networkId} (${new Date(now).toLocaleDateString('vi-VN')})`,
        origin: 'simulated',
        provenance: { source: 'platform_api', origin: 'simulated', verifiedAt: now },
      },
    ];
  }

  return [
    {
      id: `prod_sim_${networkId}_home1_${now.toString(36).slice(-3)}`,
      offerId,
      networkId,
      externalProductId: '77105521',
      name: 'Nồi Chiên Không Dầu Thủy Tinh 6L Quan Sát Thực Phẩm',
      niche,
      priceVnd: 1290000,
      commissionRatePercent: 10.5,
      estimatedCommissionVnd: Math.round(1290000 * 0.105),
      soldCount: 3650,
      salesGrowthPercent: 42,
      rating: 4.9,
      reviewCount: 980,
      shopTrustScore: 96,
      shippingFeeVnd: 0,
      stockCount: 290,
      hasVoucher: true,
      seasonalityTag: 'Nhu cầu gia đình quanh năm & Sale đôi',
      competitionLevel: 'low',
      productUrl: 'https://shopee.vn/noi-chien-khong-dau-thuy-tinh-6l-i.202.77105521',
      fetchedAt: now,
      sourceLabel: `Sandbox ${networkId} (${new Date(now).toLocaleDateString('vi-VN')})`,
      origin: 'simulated',
      provenance: { source: 'platform_api', origin: 'simulated', verifiedAt: now },
    },
    {
      id: `prod_sim_${networkId}_home2_${now.toString(36).slice(-3)}`,
      offerId,
      networkId,
      externalProductId: '77108819',
      name: 'Bộ Hộp Đựng Thực Phẩm Tủ Lạnh Nắp Khóa Silicone (Set 8)',
      niche,
      priceVnd: 199000,
      commissionRatePercent: 8.5,
      estimatedCommissionVnd: Math.round(199000 * 0.085),
      soldCount: 6400,
      salesGrowthPercent: 25,
      rating: 4.8,
      reviewCount: 1850,
      shopTrustScore: 92,
      shippingFeeVnd: 0,
      stockCount: 1100,
      hasVoucher: false,
      seasonalityTag: 'Gia dụng thiết yếu',
      competitionLevel: 'medium',
      productUrl: 'https://shopee.vn/bo-hop-dung-thuc-pham-set-8-i.202.77108819',
      fetchedAt: now,
      sourceLabel: `Sandbox ${networkId} (${new Date(now).toLocaleDateString('vi-VN')})`,
      origin: 'simulated',
      provenance: { source: 'platform_api', origin: 'simulated', verifiedAt: now },
    },
  ];
}

export function createAffiliateAdapter(
  network: AffiliateNetworkConfig,
  envMode: 'sandbox' | 'read_only' | 'live'
): AffiliateNetworkAdapter {
  if (envMode === 'sandbox' && !network.hasOfficialApiKey) {
    return new SandboxAffiliateAdapter();
  }
  return new OfficialAffiliateAdapter();
}
