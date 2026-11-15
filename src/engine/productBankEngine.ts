import { PRODUCTS } from '../config/products';
import {
  ClaimCheckResult,
  PaymentBankAccount,
  ProductMasterRecord,
} from '../types';
import { foldVietnamese } from './roleTemplates';

export function buildSeedProductMasters(): ProductMasterRecord[] {
  const now = Date.now();
  return PRODUCTS.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    shortName: p.shortName,
    version: 1,
    lifecycle: 'active',
    tagline: p.tagline,
    targetCustomers: p.targetAudience,
    features: [
      ...p.strengths.map((s, idx) => ({
        id: `${p.id}_f_${idx}`,
        label: s,
        status: 'available' as const,
      })),
      {
        id: `${p.id}_dev_ai`,
        label: 'Trợ lý phân tích dự báo bằng AI nâng cao',
        status: 'in_dev' as const,
        eta: 'Quý 3 năm nay',
        limitNote: 'Chỉ giới thiệu là đang phát triển, không cam kết có sẵn ngay.',
      },
      {
        id: `${p.id}_na_blockchain`,
        label: 'Lưu trữ dữ liệu trên Blockchain / Crypto',
        status: 'not_available' as const,
      },
    ],
    tiers: p.tiers.map((t) => ({
      name: t.name,
      priceVnd: t.priceVnd,
      priceLabel: t.priceLabel,
      limits: t.targetCustomer,
      maxDiscountPercent: 10,
    })),
    policies: {
      trialDays: p.id === 'web-design' ? 0 : 14,
      refundPolicy: 'Hoàn tiền theo tỷ lệ ngày chưa sử dụng nếu lỗi hệ thống không khắc phục sau 7 ngày (theo HĐ chuẩn).',
      warrantyPolicy: 'Bảo hành kỹ thuật và cập nhật vá lỗi miễn phí suốt thời gian thuê bao.',
      slaPercent: 99.5,
    },
    allowedClaims: p.strengths,
    forbiddenClaims: [
      'miễn phí vĩnh viễn',
      'cam kết doanh thu 100%',
      'hoàn tiền không điều kiện mọi lúc',
      'giảm giá 50%',
      'bảo hành trọn đời miễn phí mã nguồn',
    ],
    competitorComparisons: [
      {
        competitor: 'Quản lý bằng Excel / Sổ sách thủ công',
        comparison: 'Giảm sai sót lịch dạy/tồn kho và tự động nhắc Zalo OA.',
        sourceUrl: 'https://chuyenweb.com',
      },
    ],
    faqs: p.faqs,
    pmSignedOff: true,
    legalSignedOff: true,
    updatedAt: now,
  }));
}

export function buildSeedBankAccounts(companyLegalName: string): PaymentBankAccount[] {
  const now = Date.now();
  return [
    {
      id: 'bank_default_1',
      bankCode: 'VCB',
      bankName: 'Vietcombank (TMCP Ngoại thương VN)',
      accountNumberMasked: '****8868',
      accountNumberLast4: '8868',
      accountNumberEncrypted: 'AES256_PROTECTED_DEMO_8868',
      accountHolderName: companyLegalName || 'CÔNG TY CỔ PHẦN CÔNG NGHỆ AI VIỆT NAM',
      branchName: 'CN TP.HCM',
      purpose: 'Tài khoản nhận thanh toán Hợp đồng SaaS & Website',
      isDefault: true,
      verifiedWithCompanyLegalName: true,
      twoFactorConfirmedAt: now,
      createdBy: 'ceo',
      updatedAt: now,
    },
  ];
}

/**
 * Checks outgoing customer communications, quotes, contracts, and posts against:
 * 1) Product Master forbidden claims / unmarked in_dev / unapproved discounts >10%
 * 2) Raw manual bank account numbers or external "đổi số tài khoản" social engineering attacks
 */
export function checkOutgoingClaimsAndBankSafety(params: {
  text: string;
  product?: ProductMasterRecord;
  bankAccounts: PaymentBankAccount[];
}): ClaimCheckResult {
  const { text, product, bankAccounts } = params;
  const f = foldVietnamese(text);
  const violations: ClaimCheckResult['violations'] = [];
  let bankSafetyBlocked = false;

  // 1. Check forbidden claims from Product Master
  const forbidden = product?.forbiddenClaims || [
    'mien phi vinh vien',
    'giam gia 50%',
    'cam ket doanh thu 100%',
    'hoan tien khong dieu kien',
  ];
  for (const fc of forbidden) {
    const ff = foldVietnamese(fc);
    if (ff && f.includes(ff)) {
      violations.push({
        severity: 'block',
        rule: 'Tuyên bố bị cấm theo Product Master',
        matchedText: fc,
        suggestion: 'Loại bỏ cam kết sai hoặc chuyển CEO + Pháp chế duyệt ngoại lệ.',
      });
    }
  }

  // 2. Check discount > maxDiscountPercent
  const discountMatch = text.match(/(?:giảm|chiết khấu|ưu đãi)\s*(\d{2,3})\s*%/i);
  if (discountMatch) {
    const pct = Number(discountMatch[1]);
    const maxPct = Math.max(...(product?.tiers.map((t) => t.maxDiscountPercent) || [10]));
    if (pct > maxPct) {
      violations.push({
        severity: 'block',
        rule: `Vượt mức chiết khấu tối đa (${maxPct}%)`,
        matchedText: discountMatch[0],
        suggestion: `Mức tối đa tự chủ là ${maxPct}%. Gửi CEO duyệt trước khi báo khách.`,
      });
    }
  }

  // 3. Check in_dev features mentioned without ETA/status note
  if (product) {
    for (const feat of product.features) {
      if (feat.status === 'in_dev') {
        const keyPhrase = foldVietnamese(feat.label).split(' ').slice(0, 4).join(' ');
        if (keyPhrase && f.includes(keyPhrase) && !f.includes('dang phat trien') && !f.includes('eta')) {
          violations.push({
            severity: 'warn',
            rule: 'Nhắc tính năng ĐANG PHÁT TRIỂN nhưng thiếu ETA / ghi chú chưa ra mắt',
            matchedText: feat.label,
            suggestion: `Ghi rõ "(Đang phát triển — dự kiến ${feat.eta || 'chưa chốt ETA'})".`,
          });
        }
      }
      if (feat.status === 'not_available') {
        const keyPhrase = foldVietnamese(feat.label).split(' ').slice(0, 3).join(' ');
        if (keyPhrase && f.includes(keyPhrase) && !f.includes('khong co') && !f.includes('chua ho tro')) {
          violations.push({
            severity: 'block',
            rule: 'Nói sai tính năng KHÔNG CÓ của sản phẩm',
            matchedText: feat.label,
            suggestion: 'Trả lời trung thực "Sản phẩm hiện chưa hỗ trợ tính năng này".',
          });
        }
      }
    }
  }

  // 4. Bank safety: block social-engineering account-change instructions OR raw unverified 9-16 digit bank numbers
  if (/(?:đổi|thay)\s*(?:số\s*)?(?:tài khoản|stk)/i.test(text)) {
    bankSafetyBlocked = true;
    violations.push({
      severity: 'block',
      rule: 'Chống lừa đảo đổi số tài khoản thanh toán',
      matchedText: 'Yêu cầu thay đổi STK',
      suggestion: 'Không chấp nhận đổi STK qua chat/email — bắt buộc CEO xác thực 2 lớp trong Hệ thống.',
    });
  }

  const digitRuns = text.match(/\b\d{9,16}\b/g) || [];
  const allowedLast4 = new Set(bankAccounts.map((b) => b.accountNumberLast4));
  for (const num of digitRuns) {
    // Ignore VN phone numbers starting with 03/05/07/08/09
    if (/^0[35789]\d{8}$/.test(num)) continue;
    const last4 = num.slice(-4);
    if (!allowedLast4.has(last4)) {
      bankSafetyBlocked = true;
      violations.push({
        severity: 'block',
        rule: 'Phát hiện số tài khoản ngân hàng không thuộc danh mục công ty đã xác thực',
        matchedText: `****${last4}`,
        suggestion: 'Agent không được tự gõ số tài khoản ngân hàng. Chỉ chèn từ Kho STK công ty kèm mã đối soát.',
      });
    }
  }

  const hasUnknownQuestion = /em se xac nhan lai va phan hoi/i.test(f);

  return {
    passed: violations.filter((v) => v.severity === 'block').length === 0,
    violations,
    hasUnknownQuestion,
    bankSafetyBlocked,
  };
}

export function formatVerifiedBankPaymentSnippet(params: {
  bankAccounts: PaymentBankAccount[];
  refCode: string;
}): string {
  const bank = params.bankAccounts.find((b) => b.isDefault) || params.bankAccounts[0];
  if (!bank) {
    return `[Chưa có Tài khoản Ngân hàng công ty do CEO xác thực 2FA — không tự nhập STK. Mã đối soát: ${params.refCode}]`;
  }
  return `Tài khoản thanh toán chính thức (chèn tự động từ Kho STK đã xác thực CEO): ${bank.bankName} (${bank.bankCode}) · STK ${bank.accountNumberMasked} · Chủ TK: ${bank.accountHolderName} · Chi nhánh: ${bank.branchName} · Mã đối soát: ${params.refCode}`;
}

export function buildProductMasterContext(products: ProductMasterRecord[]): string {
  if (!products.length) return '';
  return products
    .filter((p) => p.lifecycle !== 'archived')
    .slice(0, 6)
    .map((p) => {
      const avail = p.features.filter((f) => f.status === 'available').map((f) => f.label).slice(0, 4).join('; ');
      const inDev = p.features.filter((f) => f.status === 'in_dev').map((f) => `${f.label} (ETA: ${f.eta || 'chưa chốt'})`).join('; ');
      const na = p.features.filter((f) => f.status === 'not_available').map((f) => f.label).join('; ');
      const priceStr = p.tiers.map((t) => `${t.name}: ${t.priceLabel} (giảm tối đa ${t.maxDiscountPercent}%)`).join(' | ');
      return [
        `* ${p.name} [${p.code} v${p.version}]:`,
        `  - ĐÃ CÓ: ${avail || '—'}`,
        inDev ? `  - ĐANG PHÁT TRIỂN (không hứa có sẵn): ${inDev}` : '',
        na ? `  - KHÔNG CÓ (cấm bịa): ${na}` : '',
        `  - Giá & trần chiết khấu: ${priceStr}`,
        `  - CẤM HỨA: ${p.forbiddenClaims.join(', ')}`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');
}

