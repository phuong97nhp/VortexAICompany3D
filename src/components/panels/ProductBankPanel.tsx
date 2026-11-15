import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Landmark,
  Lock,
  PackageCheck,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  checkOutgoingClaimsAndBankSafety,
  formatVerifiedBankPaymentSnippet,
} from '../../engine/productBankEngine';
import { useCompanyStore } from '../../store/useCompanyStore';
import { ClaimCheckResult, ProductFeatureStatus, ProductMasterRecord } from '../../types';

type SubTab = 'products' | 'bank';

export function ProductBankPanel() {
  const productMasters = useCompanyStore((s) => s.productMasters);
  const upsertProductMaster = useCompanyStore((s) => s.upsertProductMaster);
  const bankAccounts = useCompanyStore((s) => s.bankAccounts);
  const addOrUpdateBankAccountWith2Fa = useCompanyStore((s) => s.addOrUpdateBankAccountWith2Fa);
  const deleteBankAccountWith2Fa = useCompanyStore((s) => s.deleteBankAccountWith2Fa);
  const settings = useCompanyStore((s) => s.settings);

  const [subTab, setSubTab] = useState<SubTab>('products');
  const [selectedProdId, setSelectedProdId] = useState<string>(productMasters[0]?.id || '');

  // Add Feature inline
  const [featLabel, setFeatLabel] = useState('');
  const [featStatus, setFeatStatus] = useState<ProductFeatureStatus>('available');
  const [featEta, setFeatEta] = useState('');

  // Claims Checker
  const [claimText, setClaimText] = useState('');
  const [claimResult, setClaimResult] = useState<ClaimCheckResult | null>(null);

  // 3-Step Product Wizard
  const [showNewProd, setShowNewProd] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdName, setNewProdName] = useState('');
  const [newProdVersion, setNewProdVersion] = useState(1);
  const [newProdTarget, setNewProdTarget] = useState('Doanh nghiệp SME Việt Nam, Trung tâm đào tạo');
  const [newProdTagline, setNewProdTagline] = useState('');
  const [wizFeaturesText, setWizFeaturesText] = useState('Điểm danh QR [ĐÃ CÓ]\nXuất hóa đơn tự động [ĐANG PHÁT TRIỂN|Q3/2026]\nTích hợp ERP SAP [KHÔNG CÓ]');
  const [wizForbiddenText, setWizForbiddenText] = useState('miễn phí vĩnh viễn, cam kết doanh thu 100%, giảm giá 50%');
  const [wizTierName, setWizTierName] = useState('Gói Chuẩn');
  const [wizTierPriceVnd, setWizTierPriceVnd] = useState(2_900_000);
  const [wizMaxDiscount, setWizMaxDiscount] = useState(10);
  const [wizTrialDays, setWizTrialDays] = useState(14);
  const [wizSlaPercent, setWizSlaPercent] = useState(99.5);
  const [wizRefundPolicy, setWizRefundPolicy] = useState(
    'Hoàn tiền theo tỷ lệ chưa sử dụng nếu lỗi hệ thống không khắc phục sau 7 ngày.'
  );
  const [wizFaqQuestion, setWizFaqQuestion] = useState('Có hỗ trợ xuất dữ liệu Excel/CSV không?');
  const [wizFaqAnswer, setWizFaqAnswer] = useState('Có, hỗ trợ xuất Excel/CSV một chạm trực tiếp trong bảng quản trị.');

  // Bank 2FA Form & Snippet Preview
  const [bankCode, setBankCode] = useState('VCB');
  const [bankName, setBankName] = useState('Vietcombank (TMCP Ngoại thương VN)');
  const [rawStk, setRawStk] = useState('');
  const [accountHolder, setAccountHolder] = useState(
    settings.legal?.companyLegalName || 'CÔNG TY CỔ PHẦN CÔNG NGHỆ AI VIỆT NAM'
  );
  const [branchName, setBranchName] = useState('CN TP.HCM');
  const [purpose, setPurpose] = useState('Nhận thanh toán Hợp đồng SaaS');
  const [ceoPassword, setCeoPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [bankMsg, setBankMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [snippetRefCode, setSnippetRefCode] = useState('#BG-2026-01');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const activeProduct = useMemo(
    () => productMasters.find((p) => p.id === selectedProdId) || productMasters[0],
    [productMasters, selectedProdId]
  );

  const bankSnippetPreview = useMemo(
    () => formatVerifiedBankPaymentSnippet({ bankAccounts, refCode: snippetRefCode || '#BG-001' }),
    [bankAccounts, snippetRefCode]
  );

  const handleAddFeature = async () => {
    if (!activeProduct || !featLabel.trim()) return;
    const next: ProductMasterRecord = {
      ...activeProduct,
      version: activeProduct.version + 1,
      features: [
        ...activeProduct.features,
        {
          id: `feat_${Date.now().toString(36)}`,
          label: featLabel.trim(),
          status: featStatus,
          eta: featStatus === 'in_dev' ? featEta.trim() || 'Chưa chốt ETA' : undefined,
        },
      ],
    };
    await upsertProductMaster(next);
    setFeatLabel('');
    setFeatEta('');
  };

  const handleCreateProduct = async () => {
    if (!newProdName.trim()) return;
    const now = Date.now();
    const code = newProdCode.trim() || `SP-${productMasters.length + 1}`;
    const parsedFeatures = wizFeaturesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, i) => {
        if (line.includes('[ĐANG PHÁT TRIỂN')) {
          const etaMatch = line.match(/\[ĐANG PHÁT TRIỂN\|([^\]]+)\]/);
          return {
            id: `f_${now}_${i}`,
            label: line.replace(/\[[^\]]+\]/g, '').trim(),
            status: 'in_dev' as const,
            eta: etaMatch?.[1]?.trim() || 'Chưa chốt ETA',
          };
        }
        if (line.includes('[KHÔNG CÓ')) {
          return {
            id: `f_${now}_${i}`,
            label: line.replace(/\[[^\]]+\]/g, '').trim(),
            status: 'not_available' as const,
          };
        }
        return {
          id: `f_${now}_${i}`,
          label: line.replace(/\[[^\]]+\]/g, '').trim(),
          status: 'available' as const,
        };
      });

    const record: ProductMasterRecord = {
      id: `prod_${now.toString(36)}`,
      code,
      name: newProdName.trim(),
      shortName: newProdName.trim().slice(0, 24),
      version: Math.max(1, Number(newProdVersion) || 1),
      lifecycle: 'active',
      tagline: newProdTagline.trim() || 'Sản phẩm mới được CEO phê duyệt chuẩn Product Master.',
      targetCustomers: newProdTarget
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      features: parsedFeatures.length > 0 ? parsedFeatures : [{ id: `f_${now}`, label: 'Tính năng lõi đã kiểm thử', status: 'available' }],
      tiers: [
        {
          name: wizTierName.trim() || 'Gói Chuẩn',
          priceVnd: Math.max(100_000, Number(wizTierPriceVnd) || 2_900_000),
          priceLabel: `${(Number(wizTierPriceVnd) || 2_900_000).toLocaleString('vi-VN')}đ/năm`,
          limits: 'Theo điều khoản hợp đồng chuẩn',
          maxDiscountPercent: Math.min(30, Math.max(0, Number(wizMaxDiscount) || 10)),
        },
      ],
      policies: {
        trialDays: Math.max(0, Number(wizTrialDays) || 14),
        refundPolicy: wizRefundPolicy.trim(),
        warrantyPolicy: 'Bảo hành kỹ thuật suốt thời gian thuê bao.',
        slaPercent: Number(wizSlaPercent) || 99.5,
      },
      allowedClaims: ['Hỗ trợ triển khai chuẩn hóa quy trình'],
      forbiddenClaims: wizForbiddenText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      competitorComparisons: [],
      faqs: wizFaqQuestion.trim() ? [{ question: wizFaqQuestion.trim(), answer: wizFaqAnswer.trim() }] : [],
      pmSignedOff: true,
      legalSignedOff: false,
      updatedAt: now,
    };
    await upsertProductMaster(record);
    setSelectedProdId(record.id);
    setNewProdName('');
    setNewProdCode('');
    setNewProdTagline('');
    setWizardStep(1);
    setShowNewProd(false);
  };

  const handleSaveBankAccount = async () => {
    const cleanStk = rawStk.replace(/\s+/g, '');
    if (cleanStk.length < 6) {
      setBankMsg({ ok: false, text: 'Số tài khoản ngân hàng phải có ít nhất 6 chữ số.' });
      return;
    }
    const last4 = cleanStk.slice(-4);
    const legalUpper = (settings.legal?.companyLegalName || 'CÔNG TY').toUpperCase();
    const matchesLegal = accountHolder.toUpperCase().includes('CÔNG TY') || accountHolder.toUpperCase() === legalUpper;
    const res = await addOrUpdateBankAccountWith2Fa({
      ceoPassword,
      otpCode,
      account: {
        bankCode: bankCode.trim().toUpperCase(),
        bankName: bankName.trim(),
        accountNumberMasked: `****${last4}`,
        accountNumberLast4: last4,
        accountNumberEncrypted: `ENC_${btoa(cleanStk).slice(0, 20)}_${last4}`,
        accountHolderName: accountHolder.trim(),
        branchName: branchName.trim(),
        purpose: purpose.trim(),
        isDefault: bankAccounts.length === 0,
        verifiedWithCompanyLegalName: matchesLegal,
      },
    });
    if (res.ok) {
      setRawStk('');
      setCeoPassword('');
      setOtpCode('');
      setBankMsg({ ok: true, text: `Đã lưu an toàn TK ${bankCode} ****${last4} sau khi xác thực CEO 2FA.` });
    } else {
      setBankMsg({ ok: false, text: res.error || 'Xác thực 2FA thất bại.' });
    }
  };

  return (
    <div className="flex flex-col h-full p-3 gap-2.5 overflow-hidden text-xs">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setSubTab('products')}
            className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap cursor-pointer ${
              subTab === 'products'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Product Master ({productMasters.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('bank')}
            className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap cursor-pointer ${
              subTab === 'bank'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Ngân hàng Công ty 2FA ({bankAccounts.length})
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PRODUCT MASTER & CLAIMS CHECKER */}
      {subTab === 'products' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto">
              {productMasters.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProdId(p.id)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                    activeProduct?.id === p.id
                      ? 'bg-sky-600 text-white border-sky-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {p.code} · {p.shortName}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowNewProd((v) => !v);
                setWizardStep(1);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Wizard SP</span>
            </button>
          </div>

          {/* 3-Step Product Wizard */}
          {showNewProd && (
            <div className="p-3 rounded-lg border border-emerald-500/40 bg-slate-50 dark:bg-slate-900 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  Wizard Tạo Sản phẩm Chuẩn Product Master — Bước {wizardStep}/3
                </div>
                <div className="flex gap-1 text-[10.5px]">
                  {[1, 2, 3].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setWizardStep(st as 1 | 2 | 3)}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        wizardStep === st ? 'bg-emerald-600 text-white font-semibold' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    >
                      B{st}
                    </button>
                  ))}
                </div>
              </div>

              {wizardStep === 1 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      value={newProdCode}
                      onChange={(e) => setNewProdCode(e.target.value)}
                      placeholder="Mã SP (SP-04)"
                      className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    />
                    <input
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      placeholder="Tên sản phẩm..."
                      className="col-span-2 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    />
                    <input
                      type="number"
                      min={1}
                      value={newProdVersion}
                      onChange={(e) => setNewProdVersion(Number(e.target.value))}
                      placeholder="Ver"
                      className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                    />
                  </div>
                  <input
                    value={newProdTarget}
                    onChange={(e) => setNewProdTarget(e.target.value)}
                    placeholder="Đối tượng khách hàng mục tiêu (cách nhau dấu phẩy)..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                  <input
                    value={newProdTagline}
                    onChange={(e) => setNewProdTagline(e.target.value)}
                    placeholder="Mô tả giá trị cốt lõi (Tagline)..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-3 py-1 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
                    >
                      Tiếp tục: Tính năng 3 trạng thái →
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-500">
                    Mỗi dòng 1 tính năng kèm nhãn: <code>[ĐÃ CÓ]</code>, <code>[ĐANG PHÁT TRIỂN|ETA]</code>, hoặc{' '}
                    <code>[KHÔNG CÓ]</code>
                  </div>
                  <textarea
                    rows={3}
                    value={wizFeaturesText}
                    onChange={(e) => setWizFeaturesText(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                  <input
                    value={wizForbiddenText}
                    onChange={(e) => setWizForbiddenText(e.target.value)}
                    placeholder="Lời hứa CẤM nói (cách nhau dấu phẩy)..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                    >
                      ← Quay lại
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="px-3 py-1 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
                    >
                      Tiếp tục: Bảng giá & SLA →
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={wizTierName}
                      onChange={(e) => setWizTierName(e.target.value)}
                      placeholder="Tên gói"
                      className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    />
                    <input
                      type="number"
                      value={wizTierPriceVnd}
                      onChange={(e) => setWizTierPriceVnd(Number(e.target.value))}
                      placeholder="Giá VND"
                      className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                    />
                    <input
                      type="number"
                      value={wizMaxDiscount}
                      onChange={(e) => setWizMaxDiscount(Number(e.target.value))}
                      placeholder="Trần giảm %"
                      className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={wizTrialDays}
                      onChange={(e) => setWizTrialDays(Number(e.target.value))}
                      placeholder="Số ngày dùng thử"
                      className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={wizSlaPercent}
                      onChange={(e) => setWizSlaPercent(Number(e.target.value))}
                      placeholder="SLA %"
                      className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                    />
                  </div>
                  <input
                    value={wizRefundPolicy}
                    onChange={(e) => setWizRefundPolicy(e.target.value)}
                    placeholder="Chính sách hoàn tiền..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={wizFaqQuestion}
                      onChange={(e) => setWizFaqQuestion(e.target.value)}
                      placeholder="Câu hỏi FAQ mẫu..."
                      className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    />
                    <input
                      value={wizFaqAnswer}
                      onChange={(e) => setWizFaqAnswer(e.target.value)}
                      placeholder="Trả lời FAQ..."
                      className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                    >
                      ← Quay lại
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateProduct}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                    >
                      Hoàn tất & Lưu Product Master
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeProduct && (
            <>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-sky-500" />
                      <span>{activeProduct.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      v{activeProduct.version} · Dùng thử {activeProduct.policies.trialDays} ngày · SLA {activeProduct.policies.slaPercent}%
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10.5px]">
                    <button
                      type="button"
                      onClick={() => upsertProductMaster({ ...activeProduct, pmSignedOff: !activeProduct.pmSignedOff })}
                      className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                        activeProduct.pmSignedOff
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {activeProduct.pmSignedOff ? '✓ PM đã duyệt' : 'Chờ PM duyệt'}
                    </button>
                    <button
                      type="button"
                      onClick={() => upsertProductMaster({ ...activeProduct, legalSignedOff: !activeProduct.legalSignedOff })}
                      className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                        activeProduct.legalSignedOff
                          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {activeProduct.legalSignedOff ? '✓ Pháp chế đã duyệt' : 'Chờ Pháp chế'}
                    </button>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300">{activeProduct.tagline}</p>

                {/* Features strictly grouped into 3 states */}
                {(['available', 'in_dev', 'not_available'] as const).map((status) => {
                  const list = activeProduct.features.filter((f) => f.status === status);
                  const heading =
                    status === 'available'
                      ? 'ĐÃ CÓ (Được phép giới thiệu & bán)'
                      : status === 'in_dev'
                      ? 'ĐANG PHÁT TRIỂN (Phải nêu kèm ETA, không hứa có sẵn)'
                      : 'KHÔNG CÓ (Cấm bịa hoặc hứa hẹn với khách)';
                  const tone =
                    status === 'available'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : status === 'in_dev'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400';
                  return (
                    <div key={status} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                      <div className={`text-[11px] font-bold ${tone}`}>{heading}</div>
                      {list.length === 0 ? (
                        <div className="text-[11px] text-slate-400">Không có mục nào.</div>
                      ) : (
                        list.map((f) => (
                          <div key={f.id} className="text-[11px] flex justify-between gap-2">
                            <span>• {f.label}</span>
                            {f.eta && <span className="font-mono-num text-amber-500 shrink-0">ETA: {f.eta}</span>}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}

                {/* Add Feature row */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5">
                  <input
                    value={featLabel}
                    onChange={(e) => setFeatLabel(e.target.value)}
                    placeholder="Thêm tính năng vào Product Master..."
                    className="flex-1 min-w-[160px] px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                  <select
                    value={featStatus}
                    onChange={(e) => setFeatStatus(e.target.value as ProductFeatureStatus)}
                    className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  >
                    <option value="available">ĐÃ CÓ</option>
                    <option value="in_dev">ĐANG PHÁT TRIỂN</option>
                    <option value="not_available">KHÔNG CÓ</option>
                  </select>
                  {featStatus === 'in_dev' && (
                    <input
                      value={featEta}
                      onChange={(e) => setFeatEta(e.target.value)}
                      placeholder="ETA (vd: Q3/2026)"
                      className="w-28 px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-2.5 py-1 rounded bg-sky-600 text-white font-semibold cursor-pointer"
                  >
                    Thêm mục
                  </button>
                </div>
              </div>

              {/* Claims Checker Sandbox */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Kiểm định Cam kết & Chống bịa trước khi gửi khách (Claims Checker)</span>
                </div>
                <textarea
                  rows={2}
                  value={claimText}
                  onChange={(e) => setClaimText(e.target.value)}
                  placeholder='Thử dán nội dung báo giá/chat (vd: "Giảm giá 50% miễn phí vĩnh viễn và đổi sang STK 1234567890")...'
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
                <button
                  type="button"
                  onClick={() =>
                    setClaimResult(
                      checkOutgoingClaimsAndBankSafety({
                        text: claimText,
                        product: activeProduct,
                        bankAccounts,
                      })
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
                >
                  Kiểm tra ngay
                </button>
                {claimResult && (
                  <div
                    className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                      claimResult.passed
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      {claimResult.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      <span>
                        {claimResult.passed
                          ? 'ĐẠT CHUẨN — Không phát hiện cam kết sai hay số tài khoản lạ.'
                          : `BỊ CHẶN (${claimResult.violations.length} vi phạm)`}
                      </span>
                    </div>
                    {claimResult.violations.map((v, i) => (
                      <div key={i}>
                        • <strong>{v.rule}:</strong> "{v.matchedText}" → {v.suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBTAB 2: COMPANY BANK ACCOUNTS (CEO + 2FA ONLY) */}
      {subTab === 'bank' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="p-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300 flex items-start gap-2 text-[11px]">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Bảo vệ Tài khoản Nhận tiền & Lịch thu Công ty:</strong> Chỉ CEO xác thực Mật khẩu + 2FA mới được thêm/sửa/xóa STK. Toàn bộ AI Agent bị cấm tuyệt đối thay đổi STK, thay đổi lịch thu hoặc tự gõ STK ngoài danh sách đã xác thực.
            </span>
          </div>

          <div className="space-y-2">
            {bankAccounts.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5 flex-wrap">
                    <Landmark className="w-3.5 h-3.5 text-sky-500" />
                    <span>
                      {b.bankCode} · {b.accountNumberMasked}
                    </span>
                    {b.isDefault && <span className="text-[10.5px] text-emerald-500 font-semibold">· Mặc định</span>}
                    <span
                      className={`text-[10.5px] font-medium ${
                        b.verifiedWithCompanyLegalName ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
                      }`}
                    >
                      {b.verifiedWithCompanyLegalName ? '· Khớp pháp nhân' : '· Cảnh báo lệch tên pháp nhân'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                    Chủ TK: {b.accountHolderName} ({b.branchName})
                  </div>
                  <div className="text-[11px] text-slate-500">{b.purpose}</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!ceoPassword.trim()) {
                      setBankMsg({ ok: false, text: 'Nhập mật khẩu CEO ở form bên dưới trước khi xóa STK.' });
                      return;
                    }
                    const r = await deleteBankAccountWith2Fa(b.id, ceoPassword);
                    setBankMsg(r.ok ? { ok: true, text: 'Đã xóa STK.' } : { ok: false, text: r.error || 'Sai mật khẩu.' });
                  }}
                  className="p-1.5 rounded border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                  title="Xóa STK (yêu cầu mật khẩu CEO)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Live Payment Snippet Variable Insertion Preview */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">Chèn Biến STK Chính thức + Mã đối soát vào Báo giá/Hợp đồng</span>
              <input
                value={snippetRefCode}
                onChange={(e) => setSnippetRefCode(e.target.value)}
                placeholder="Mã đối soát (#BG-...)"
                className="w-32 px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num text-[11px]"
              />
            </div>
            <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
              {bankSnippetPreview}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(bankSnippetPreview).catch(() => {});
                setCopiedSnippet(true);
                setTimeout(() => setCopiedSnippet(false), 1800);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px] cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedSnippet ? 'Đã sao chép biến STK' : 'Sao chép đoạn chèn mẫu'}</span>
            </button>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="font-semibold">Thêm Tài khoản Ngân hàng Mới (Yêu cầu CEO + 2FA)</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                placeholder="Mã NH (VCB, TCB, MBB...)"
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Tên ngân hàng..."
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <input
                value={rawStk}
                onChange={(e) => setRawStk(e.target.value)}
                placeholder="Số tài khoản nhận tiền..."
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
              />
              <input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Chi nhánh"
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>
            <input
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Tên chủ tài khoản (khớp tên pháp nhân công ty)"
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
            />
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Mục đích sử dụng STK..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
            />
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
              <input
                type="password"
                value={ceoPassword}
                onChange={(e) => setCeoPassword(e.target.value)}
                placeholder="Mật khẩu CEO..."
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Mã OTP 2FA (>= 4 ký tự)..."
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveBankAccount}
              className="w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
            >
              Xác thực 2FA & Lưu Tài khoản Ngân hàng
            </button>
            {bankMsg && (
              <div className={`text-[11px] font-medium ${bankMsg.ok ? 'text-emerald-500' : 'text-rose-500'}`}>
                {bankMsg.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
