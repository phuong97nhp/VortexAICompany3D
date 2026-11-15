import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Landmark,
  Lock,
  PackageCheck,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { checkOutgoingClaimsAndBankSafety } from '../../engine/productBankEngine';
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

  // New Product form
  const [showNewProd, setShowNewProd] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdTagline, setNewProdTagline] = useState('');

  // Bank 2FA Form
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

  const activeProduct = useMemo(
    () => productMasters.find((p) => p.id === selectedProdId) || productMasters[0],
    [productMasters, selectedProdId]
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
    const record: ProductMasterRecord = {
      id: `prod_${now.toString(36)}`,
      code,
      name: newProdName.trim(),
      shortName: newProdName.trim().slice(0, 24),
      version: 1,
      lifecycle: 'active',
      tagline: newProdTagline.trim() || 'Sản phẩm mới được CEO phê duyệt chuẩn Product Master.',
      targetCustomers: ['Doanh nghiệp SME Việt Nam'],
      features: [{ id: `f_${now}`, label: 'Tính năng lõi đã kiểm thử', status: 'available' }],
      tiers: [{ name: 'Gói Chuẩn', priceVnd: 2_900_000, priceLabel: '2.900.000đ/năm', limits: 'Tối đa 50 tài khoản', maxDiscountPercent: 10 }],
      policies: {
        trialDays: 14,
        refundPolicy: 'Hoàn tiền theo tỷ lệ chưa sử dụng nếu lỗi hệ thống không khắc phục sau 7 ngày.',
        warrantyPolicy: 'Bảo hành kỹ thuật suốt thời gian thuê bao.',
        slaPercent: 99.5,
      },
      allowedClaims: ['Hỗ trợ triển khai chuẩn hóa quy trình'],
      forbiddenClaims: ['miễn phí vĩnh viễn', 'cam kết doanh thu 100%', 'giảm giá 50%'],
      competitorComparisons: [],
      faqs: [],
      pmSignedOff: true,
      legalSignedOff: false,
      updatedAt: now,
    };
    await upsertProductMaster(record);
    setSelectedProdId(record.id);
    setNewProdName('');
    setNewProdCode('');
    setNewProdTagline('');
    setShowNewProd(false);
  };

  const handleSaveBankAccount = async () => {
    const cleanStk = rawStk.replace(/\s+/g, '');
    if (cleanStk.length < 6) {
      setBankMsg({ ok: false, text: 'Số tài khoản ngân hàng phải có ít nhất 6 chữ số.' });
      return;
    }
    const last4 = cleanStk.slice(-4);
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
        verifiedWithCompanyLegalName: accountHolder.toUpperCase().includes('CÔNG TY'),
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
              onClick={() => setShowNewProd((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm SP</span>
            </button>
          </div>

          {showNewProd && (
            <div className="p-3 rounded-lg border border-emerald-500/40 bg-slate-50 dark:bg-slate-900 space-y-2">
              <div className="font-semibold">Thêm Sản phẩm vào Product Master</div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={newProdCode}
                  onChange={(e) => setNewProdCode(e.target.value)}
                  placeholder="Mã SP (vd: SP-04)"
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
                <input
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Tên sản phẩm..."
                  className="col-span-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="flex gap-2">
                <input
                  value={newProdTagline}
                  onChange={(e) => setNewProdTagline(e.target.value)}
                  placeholder="Mô tả giá trị cốt lõi..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
                <button
                  type="button"
                  onClick={handleCreateProduct}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                >
                  Lưu SP
                </button>
              </div>
            </div>
          )}

          {activeProduct && (
            <>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-sky-500" />
                      <span>{activeProduct.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      v{activeProduct.version} · Dùng thử {activeProduct.policies.trialDays} ngày · SLA {activeProduct.policies.slaPercent}% · PM & Pháp chế kiểm duyệt
                    </div>
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
              <strong>Bảo vệ Tài khoản Nhận tiền Công ty:</strong> Chỉ CEO xác thực Mật khẩu + 2FA mới được thêm/sửa/xóa STK. Toàn bộ AI Agent bị cấm tuyệt đối thay đổi hoặc tự gõ STK ngoài danh sách đã xác thực.
            </span>
          </div>

          <div className="space-y-2">
            {bankAccounts.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-sky-500" />
                    <span>
                      {b.bankCode} · {b.accountNumberMasked}
                    </span>
                    {b.isDefault && <span className="text-[10.5px] text-emerald-500 font-semibold">· Mặc định</span>}
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
