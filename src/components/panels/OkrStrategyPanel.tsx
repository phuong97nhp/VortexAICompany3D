import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Compass,
  Eye,
  GitFork,
  Lightbulb,
  Plus,
  RefreshCw,
  Rocket,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { generateCompetitorPeriodReport } from '../../engine/collaborationEngine';
import { formatVnd } from '../../engine/expenseEngine';
import { buildRevenueBreakdownDashboard } from '../../engine/okrEngine';
import { useCompanyStore } from '../../store/useCompanyStore';
import { MoneyIdeaStage, OkrObjective } from '../../types';

type SubTab = 'okr' | 'ideas' | 'upgrades';

export function OkrStrategyPanel() {
  const okrObjectives = useCompanyStore((s) => s.okrObjectives);
  const upsertOkrObjective = useCompanyStore((s) => s.upsertOkrObjective);
  const computeOkrPlan = useCompanyStore((s) => s.computeOkrPlan);
  const runOkrGovernanceCadence = useCompanyStore((s) => s.runOkrGovernanceCadence);
  const approveOkrRecoveryPlan = useCompanyStore((s) => s.approveOkrRecoveryPlan);

  const productMasters = useCompanyStore((s) => s.productMasters);
  const leads = useCompanyStore((s) => s.leads);
  const affiliateCommissions = useCompanyStore((s) => s.affiliateCommissions);
  const agents = useCompanyStore((s) => s.agents);
  const tasks = useCompanyStore((s) => s.tasks);

  const moneyIdeas = useCompanyStore((s) => s.moneyIdeas);
  const runIdleMoneyBrainstorm = useCompanyStore((s) => s.runIdleMoneyBrainstorm);
  const updateMoneyIdeaStage = useCompanyStore((s) => s.updateMoneyIdeaStage);
  const competitorWatches = useCompanyStore((s) => s.competitorWatches);
  const addCompetitorWatch = useCompanyStore((s) => s.addCompetitorWatch);
  const runCompetitorWatchCycle = useCompanyStore((s) => s.runCompetitorWatchCycle);

  const upgradeProposals = useCompanyStore((s) => s.upgradeProposals);
  const upgradeChangelog = useCompanyStore((s) => s.upgradeChangelog);
  const proposeSystemUpgrade = useCompanyStore((s) => s.proposeSystemUpgrade);
  const runBottleneckUpgradeAnalysis = useCompanyStore((s) => s.runBottleneckUpgradeAnalysis);
  const advanceUpgradeStage = useCompanyStore((s) => s.advanceUpgradeStage);

  const [subTab, setSubTab] = useState<SubTab>('okr');
  const [selectedOkrId, setSelectedOkrId] = useState<string>(okrObjectives[0]?.id || '');
  const [cadenceNotice, setCadenceNotice] = useState<string | null>(null);
  const [ideaViewMode, setIdeaViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [ideaNotice, setIdeaNotice] = useState<string | null>(null);
  const [testResultDraft, setTestResultDraft] = useState('');

  // Add Competitor Watch form
  const [showAddComp, setShowAddComp] = useState(false);
  const [compName, setCompName] = useState('');
  const [compUrl, setCompUrl] = useState('');
  const [compNiche, setCompNiche] = useState('');
  const [compPrice, setCompPrice] = useState('');
  const [compFeatures, setCompFeatures] = useState('');
  const [compStrengths, setCompStrengths] = useState('');
  const [compWeaknesses, setCompWeaknesses] = useState('');

  // New OKR form
  const [showNewOkr, setShowNewOkr] = useState(false);
  const [okrTitle, setOkrTitle] = useState('');
  const [okrPeriodType, setOkrPeriodType] = useState<OkrObjective['periodType']>('month');
  const [okrPeriodLabel, setOkrPeriodLabel] = useState('Tháng 11/2026');
  const [okrTargetVnd, setOkrTargetVnd] = useState(100_000_000);
  const [okrProductId, setOkrProductId] = useState<string>(productMasters[0]?.id || 'edu-center');
  const [okrParentId, setOkrParentId] = useState<string>(okrObjectives[0]?.id || '');
  const [okrChannel, setOkrChannel] = useState('Zalo OA + Email + Demo 1-1');

  // New Upgrade Proposal form
  const [showNewUpgrade, setShowNewUpgrade] = useState(false);
  const [upgTitle, setUpgTitle] = useState('');
  const [upgEvidence, setUpgEvidence] = useState('');
  const [upgSolution, setUpgSolution] = useState('');
  const [upgRoi, setUpgRoi] = useState('');
  const [upgTestPlan, setUpgTestPlan] = useState('');
  const [upgNotice, setUpgNotice] = useState<string | null>(null);

  const activeOkr = useMemo(
    () => okrObjectives.find((o) => o.id === selectedOkrId) || okrObjectives[0],
    [okrObjectives, selectedOkrId]
  );

  const parentOkr = useMemo(
    () => (activeOkr?.parentObjectiveId ? okrObjectives.find((o) => o.id === activeOkr.parentObjectiveId) : undefined),
    [okrObjectives, activeOkr]
  );

  const childOkrs = useMemo(
    () => (activeOkr ? okrObjectives.filter((o) => o.parentObjectiveId === activeOkr.id) : []),
    [okrObjectives, activeOkr]
  );

  const funnelPlan = useMemo(
    () => (activeOkr ? computeOkrPlan(activeOkr.id) : null),
    [activeOkr, computeOkrPlan, leads, affiliateCommissions, productMasters]
  );

  const breakdown = useMemo(
    () =>
      buildRevenueBreakdownDashboard({
        leads,
        commissions: affiliateCommissions,
        products: productMasters,
        agents,
        tasks,
      }),
    [leads, affiliateCommissions, productMasters, agents, tasks]
  );

  const competitorReport = useMemo(() => generateCompetitorPeriodReport(competitorWatches), [competitorWatches]);
  const selectedIdea = useMemo(
    () => moneyIdeas.find((m) => m.id === selectedIdeaId) || null,
    [moneyIdeas, selectedIdeaId]
  );

  const handleCreateOkr = async () => {
    if (!okrTitle.trim()) return;
    const now = Date.now();
    const targetVnd = Math.max(1_000_000, Number(okrTargetVnd) || 100_000_000);
    const days = okrPeriodType === 'week' ? 7 : okrPeriodType === 'month' ? 30 : okrPeriodType === 'quarter' ? 90 : 365;
    const next: OkrObjective = {
      id: `okr_${now.toString(36)}`,
      parentObjectiveId: okrParentId || undefined,
      periodType: okrPeriodType,
      periodLabel: okrPeriodLabel.trim() || 'Kỳ mới',
      title: okrTitle.trim(),
      targetRevenueVnd: targetVnd,
      productId: okrProductId || undefined,
      channel: okrChannel.trim(),
      ownerAgentId: 'sales_director',
      deadline: new Date(now + days * 86_400_000).toISOString().slice(0, 10),
      assumptions: [
        `Tính ngược từ dữ liệu CRM & Affiliate cho ${okrProductId || 'toàn công ty'}; tỷ lệ thiếu gắn nhãn giả định, cần kiểm chứng.`,
      ],
      keyResults: [
        {
          id: `kr_${now}`,
          title: 'Doanh thu mục tiêu (VND)',
          metricUnit: 'VND',
          baselineValue: 0,
          targetValue: targetVnd,
          currentValue: 0,
          dataSource: 'crm',
          verified: false,
        },
      ],
      status: 'on_track',
      createdAt: now,
      updatedAt: now,
    };
    await upsertOkrObjective(next);
    setSelectedOkrId(next.id);
    setOkrTitle('');
    setShowNewOkr(false);
  };

  const handleCreateUpgrade = async () => {
    if (!upgTitle.trim() || !upgSolution.trim()) return;
    const res = await proposeSystemUpgrade({
      title: upgTitle.trim(),
      proposedBy: 'tech_lead',
      bottleneckEvidence: upgEvidence.trim() || 'Ghi nhận điểm nghẽn từ vận hành hàng tuần.',
      solutionSummary: upgSolution.trim(),
      expectedRoi: upgRoi.trim() || 'Tiết kiệm thời gian xử lý ~20%',
      beforeMetric: 'Baseline hiện tại (đang đo)',
      testPlan: upgTestPlan.trim() || 'Thử Sandbox trước khi trình CEO duyệt Pilot.',
    });
    if (!res) {
      setUpgNotice('Đề xuất bị chặn bởi rào chắn an toàn (cấm tự nâng quyền hoặc sửa code live).');
      return;
    }
    setUpgNotice(`Đã tạo đề xuất ${res.code} (Chờ thử Sandbox & CEO duyệt).`);
    setUpgTitle('');
    setUpgEvidence('');
    setUpgSolution('');
    setUpgRoi('');
    setUpgTestPlan('');
    setShowNewUpgrade(false);
  };

  const handleAddCompetitor = async () => {
    if (!compName.trim()) return;
    await addCompetitorWatch({
      name: compName,
      publicUrl: compUrl,
      niche: compNiche,
      lastPriceNote: compPrice,
      lastFeaturesNote: compFeatures,
      strengths: compStrengths,
      weaknesses: compWeaknesses,
    });
    setCompName('');
    setCompUrl('');
    setCompNiche('');
    setCompPrice('');
    setCompFeatures('');
    setCompStrengths('');
    setCompWeaknesses('');
    setShowAddComp(false);
  };

  return (
    <div className="flex flex-col h-full p-3 gap-2.5 overflow-hidden text-xs">
      {/* Sub-navigation */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {(
            [
              { id: 'okr', label: 'OKR & Phễu Doanh thu' },
              { id: 'ideas', label: `Ý tưởng & Đối thủ (${moneyIdeas.length})` },
              { id: 'upgrades', label: `Nâng cấp (${upgradeProposals.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === t.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUBTAB 1: OKR & REVERSE FUNNEL */}
      {subTab === 'okr' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="flex items-center justify-between gap-2">
            <select
              value={activeOkr?.id || ''}
              onChange={(e) => setSelectedOkrId(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium"
            >
              {okrObjectives.map((o) => (
                <option key={o.id} value={o.id}>
                  [{o.periodLabel}] {o.title} — {formatVnd(o.targetRevenueVnd)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewOkr((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm OKR</span>
            </button>
          </div>

          {showNewOkr && (
            <div className="p-3 rounded-lg border border-sky-500/40 bg-slate-50 dark:bg-slate-900 space-y-2">
              <div className="font-semibold">Tạo mục tiêu OKR mới (Gắn sản phẩm & Cây mục tiêu)</div>
              <input
                value={okrTitle}
                onChange={(e) => setOkrTitle(e.target.value)}
                placeholder="Tên mục tiêu (vd: Đạt 100 triệu EduCenter Pro trong tháng)..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={okrPeriodType}
                  onChange={(e) => setOkrPeriodType(e.target.value as OkrObjective['periodType'])}
                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <option value="year">Năm</option>
                  <option value="quarter">Quý</option>
                  <option value="month">Tháng</option>
                  <option value="week">Tuần</option>
                </select>
                <input
                  value={okrPeriodLabel}
                  onChange={(e) => setOkrPeriodLabel(e.target.value)}
                  placeholder="Nhãn kỳ (T11/2026)"
                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
                <input
                  type="number"
                  value={okrTargetVnd}
                  onChange={(e) => setOkrTargetVnd(Number(e.target.value))}
                  placeholder="Doanh thu (VND)"
                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={okrProductId}
                  onChange={(e) => setOkrProductId(e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <option value="">Toàn bộ sản phẩm</option>
                  {productMasters.map((p) => (
                    <option key={p.id} value={p.id}>
                      SP: {p.shortName} ({p.code})
                    </option>
                  ))}
                </select>
                <select
                  value={okrParentId}
                  onChange={(e) => setOkrParentId(e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <option value="">Không có mục tiêu cha (Cấp cao nhất)</option>
                  {okrObjectives.map((o) => (
                    <option key={o.id} value={o.id}>
                      Cha: [{o.periodLabel}] {o.title}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={okrChannel}
                onChange={(e) => setOkrChannel(e.target.value)}
                placeholder="Kênh triển khai chính..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewOkr(false)}
                  className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreateOkr}
                  className="px-3 py-1 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
                >
                  Lưu OKR
                </button>
              </div>
            </div>
          )}

          {activeOkr && funnelPlan && (
            <>
              {/* Goal Tree Navigation (Năm -> Quý -> Tháng -> Tuần -> KR -> Task) */}
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                    <GitFork className="w-3.5 h-3.5 text-sky-500" />
                    <span>Cây Mục tiêu (Năm → Quý → Tháng → Tuần → KR → Task)</span>
                  </div>
                  <span className="text-[10.5px] font-mono-num text-slate-500">
                    Hạn: {activeOkr.deadline} · Kênh: {activeOkr.channel || 'Đa kênh'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {parentOkr && (
                    <button
                      type="button"
                      onClick={() => setSelectedOkrId(parentOkr.id)}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:text-sky-500 cursor-pointer"
                    >
                      ↑ Cha: [{parentOkr.periodLabel}] {parentOkr.title}
                    </button>
                  )}
                  <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold">
                    [{activeOkr.periodLabel}] {activeOkr.title}
                  </span>
                  {childOkrs.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setSelectedOkrId(ch.id)}
                      className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:border-sky-500 cursor-pointer"
                    >
                      ↳ [{ch.periodLabel}] {ch.title} ({formatVnd(ch.targetRevenueVnd)})
                    </button>
                  ))}
                </div>
              </div>

              {/* Behind Schedule Alert + CEO Approve Recovery */}
              {funnelPlan.behindAlertTriggered && (
                <div className="p-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">
                        Cảnh báo chậm tiến độ ({funnelPlan.scheduleGapPercent}%) · Thiếu hụt dự kiến:{' '}
                        {formatVnd(Math.max(0, funnelPlan.targetRevenueVnd - funnelPlan.projectedPeriodEndVnd))}
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {funnelPlan.recoverySuggestions[0] || 'Cần điều chỉnh tăng tốc độ tiếp cận & demo.'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await approveOkrRecoveryPlan(activeOkr.id);
                      setCadenceNotice('CEO đã duyệt phương án khắc phục và giao việc #KR tăng tốc phễu.');
                    }}
                    className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Duyệt phương án khắc phục
                  </button>
                </div>
              )}

              {/* Thực tế vs Dự báo vs Mục tiêu + Governance Cadence */}
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-semibold">Thực tế vs Dự báo vs Mục tiêu</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={async () => {
                        await runOkrGovernanceCadence('weekly_plan', activeOkr.id);
                        setCadenceNotice('COO đã gửi biên bản Họp lập kế hoạch tuần vào kênh Ban Giám Đốc.');
                      }}
                      className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 hover:border-sky-500 text-[10.5px] cursor-pointer flex items-center gap-1"
                    >
                      <CalendarClock className="w-3 h-3 text-sky-500" />
                      <span>Họp tuần</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await runOkrGovernanceCadence('midweek_review', activeOkr.id);
                        setCadenceNotice('COO đã rà soát giữa tuần và báo cáo khoảng cách KPI.');
                      }}
                      className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 hover:border-amber-500 text-[10.5px] cursor-pointer"
                    >
                      Rà soát giữa tuần
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await runOkrGovernanceCadence('period_report', activeOkr.id);
                        setCadenceNotice('Đã xuất Báo cáo cuối kỳ & Đối soát sang kênh điều hành.');
                      }}
                      className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-[10.5px] cursor-pointer"
                    >
                      Báo cáo kỳ
                    </button>
                  </div>
                </div>
                {cadenceNotice && (
                  <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{cadenceNotice}</span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 font-mono-num">
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">Thực tế (Ghi nhận)</div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {formatVnd(funnelPlan.recognizedRevenueVnd)}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">Dự báo cuối kỳ (Run-rate)</div>
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {formatVnd(funnelPlan.projectedPeriodEndVnd)}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">Mục tiêu đặt ra</div>
                    <div className="text-xs font-bold text-sky-600 dark:text-sky-400">
                      {formatVnd(funnelPlan.targetRevenueVnd)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recognized vs Collected vs AR */}
              <div className="grid grid-cols-3 gap-2 font-mono-num">
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="text-[10.5px] text-slate-500">Doanh thu ghi nhận</div>
                  <div className="text-sm font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
                    {formatVnd(funnelPlan.recognizedRevenueVnd)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="text-[10.5px] text-slate-500">Thực thu về ví</div>
                  <div className="text-sm font-bold mt-0.5 text-sky-600 dark:text-sky-400">
                    {formatVnd(funnelPlan.collectedCashVnd)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="text-[10.5px] text-slate-500">Công nợ phải thu (AR)</div>
                  <div className="text-sm font-bold mt-0.5 text-amber-600 dark:text-amber-400">
                    {formatVnd(funnelPlan.accountsReceivableVnd)}
                  </div>
                </div>
              </div>

              {/* Reverse Funnel Table */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-sky-500" />
                    <span>Phễu Ngược từ Mục tiêu ({formatVnd(funnelPlan.targetRevenueVnd)})</span>
                  </span>
                  <span className="text-[11px] font-mono-num text-slate-500">
                    AOV: {formatVnd(funnelPlan.avgOrderValueVnd)} ·{' '}
                    {funnelPlan.aovIsReal ? 'Thực tế' : 'giả định, cần kiểm chứng'}
                  </span>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {funnelPlan.steps.map((st, idx) => (
                    <div key={idx} className="px-3 py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{st.stageLabel}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                          <span>Tỷ lệ: {st.conversionRatePercent ?? '—'}%</span>
                          <span>·</span>
                          <span
                            className={
                              st.isRealMetric
                                ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                : 'text-amber-600 dark:text-amber-400 font-medium'
                            }
                          >
                            {st.statusTag}
                          </span>
                          {st.sourceLabel && (
                            <>
                              <span>·</span>
                              <span className="text-slate-400">
                                Nguồn: {st.sourceLabel} (Tin cậy: {st.confidence || 'low'})
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right font-mono-num shrink-0">
                        <div className="font-bold text-sm">{st.value.toLocaleString('vi-VN')}</div>
                        <div className="text-[10.5px] text-slate-500">
                          Thấp {st.lowScenario} / TB {st.midScenario} / Cao {st.highScenario}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Results */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
                <div className="font-semibold">Kết quả then chốt (Key Results)</div>
                {activeOkr.keyResults.map((kr) => {
                  const pct = kr.targetValue > 0 ? Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100)) : 0;
                  return (
                    <div key={kr.id} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium">
                          {kr.title}{' '}
                          <span className="text-slate-500">
                            ({kr.dataSource} · {kr.verified ? 'Đã kiểm chứng' : 'Chưa đối soát đủ'})
                          </span>
                        </span>
                        <span className="font-mono-num">
                          {kr.currentValue.toLocaleString('vi-VN')} / {kr.targetValue.toLocaleString('vi-VN')} {kr.metricUnit} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Revenue Breakdown by Product & Channel + Agent KPI */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2.5">
                <div className="font-semibold">Phân rã theo Sản phẩm / Kênh & Điểm KPI Nhân sự</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="font-semibold text-slate-600 dark:text-slate-300">Theo Sản phẩm</div>
                    {breakdown.byProduct.map((p) => (
                      <div key={p.productId} className="flex justify-between font-mono-num">
                        <span className="truncate">{p.name}</span>
                        <span>
                          {formatVnd(p.actualVnd)} ({p.wonCount} chốt)
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="font-semibold text-slate-600 dark:text-slate-300">Theo Kênh & Affiliate</div>
                    {breakdown.byChannel.map((c) => (
                      <div key={c.channel} className="flex justify-between font-mono-num">
                        <span className="truncate">{c.channel}</span>
                        <span>
                          {formatVnd(c.actualVnd)} ({c.dealsOrOrders})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Liên kết KPI Mục tiêu ↔ Nhân sự
                  </div>
                  {breakdown.agentKpiRows.slice(0, 5).map((r) => (
                    <div key={r.agentId} className="flex items-center justify-between text-[11px] font-mono-num">
                      <span className="truncate">
                        {r.name} <span className="text-slate-400">({r.department})</span>
                      </span>
                      <span>
                        {r.doneTasks} việc · {formatVnd(r.revenueVnd)} · Điểm {r.performanceScore}/100
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {funnelPlan.recoverySuggestions.length > 0 && (
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Ghi chú trung thực & Gợi ý điều chỉnh:</div>
                  {funnelPlan.recoverySuggestions.map((g, i) => (
                    <div key={i}>• {g}</div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SUBTAB 2: IDLE MONEY BRAINSTORM & COMPETITOR WATCH */}
      {subTab === 'ideas' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Ý tưởng Kiếm tiền khi Rảnh (Không tự chi tiền khi chưa duyệt)</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIdeaViewMode((m) => (m === 'kanban' ? 'list' : 'kanban'))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-medium cursor-pointer"
              >
                {ideaViewMode === 'kanban' ? 'Xem Danh sách' : 'Xem Kanban 6 cột'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const created = await runIdleMoneyBrainstorm();
                  setSelectedIdeaId(created.id);
                  setIdeaNotice(`Đã lập hồ sơ đề xuất "${created.title}" — chờ Pháp chế & CEO duyệt.`);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Brainstorm ngay</span>
              </button>
            </div>
          </div>

          {ideaNotice && (
            <div className="p-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] flex items-center justify-between gap-2">
              <span>{ideaNotice}</span>
              <button type="button" onClick={() => setIdeaNotice(null)} className="underline cursor-pointer">
                Đóng
              </button>
            </div>
          )}

          {/* Selected Dossier Inspector */}
          {selectedIdea && (
            <div className="p-3 rounded-lg border border-sky-500/50 bg-slate-50 dark:bg-slate-900 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-xs">{selectedIdea.title}</div>
                  <div className="text-[11px] text-slate-500">
                    Đề xuất: {selectedIdea.proposedBy} ({selectedIdea.department}) · Điểm Hội đồng: {selectedIdea.councilScore}/100 ·
                    Pháp chế: <strong>{selectedIdea.legalSignoff}</strong> · CEO: <strong>{selectedIdea.ceoApproved ? 'Đã duyệt' : 'Chưa duyệt'}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIdeaId(null)}
                  className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-[11px] cursor-pointer"
                >
                  Đóng hồ sơ
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div><strong>Bằng chứng & Nguồn:</strong> {selectedIdea.problemAndEvidence}</div>
                  <div className="text-slate-500">Nguồn: {selectedIdea.sources.join(' · ')}</div>
                  <div><strong>Quy mô thị trường (Giả định):</strong> {selectedIdea.tamSamAssumptions}</div>
                  <div><strong>Khách hàng mục tiêu (ICP):</strong> {selectedIdea.icpAndChannels}</div>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div><strong>Khác biệt đối thủ:</strong> {selectedIdea.competitorDiff}</div>
                  <div><strong>Mô hình doanh thu:</strong> {selectedIdea.revenueModel}</div>
                  <div><strong>Thử nghiệm vi mô:</strong> {selectedIdea.microExperimentPlan}</div>
                  <div className="text-amber-600 dark:text-amber-400"><strong>Stop-loss:</strong> {selectedIdea.stopLossRule}</div>
                </div>
              </div>
              {selectedIdea.rolloutSteps && (
                <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] space-y-0.5">
                  <div className="font-semibold">Kế hoạch triển khai & KPI:</div>
                  {selectedIdea.rolloutSteps.map((st, idx) => (
                    <div key={idx}>• {st}</div>
                  ))}
                  {selectedIdea.kpis && <div className="text-sky-600 dark:text-sky-400 pt-0.5">KPI: {selectedIdea.kpis.join(' · ')}</div>}
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 font-mono-num text-[11px]">
                <div className="p-1.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500">Ngân sách xin</div>
                  <div className="font-bold">{formatVnd(selectedIdea.estimatedCostVnd)}</div>
                </div>
                <div className="p-1.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500">Dự báo Thấp (Giả định)</div>
                  <div className="font-bold">{formatVnd(selectedIdea.scenarios.lowVndMonth)}/th</div>
                </div>
                <div className="p-1.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500">Dự báo TB (Giả định)</div>
                  <div className="font-bold text-amber-500">{formatVnd(selectedIdea.scenarios.midVndMonth)}/th</div>
                </div>
                <div className="p-1.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500">Dự báo Cao (Giả định)</div>
                  <div className="font-bold text-emerald-500">{formatVnd(selectedIdea.scenarios.highVndMonth)}/th</div>
                </div>
              </div>
              {selectedIdea.realTestResult && (
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-700 dark:text-emerald-300">
                  <strong>Kết quả test thực tế:</strong> {selectedIdea.realTestResult}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {selectedIdea.legalSignoff !== 'approved' && (
                  <button
                    type="button"
                    onClick={async () => {
                      await updateMoneyIdeaStage(selectedIdea.id, selectedIdea.stage, selectedIdea.ceoApproved, 'approved');
                      setIdeaNotice('Pháp chế đã xác nhận hồ sơ đạt chuẩn tuân thủ.');
                    }}
                    className="px-2.5 py-1 rounded bg-indigo-600 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Pháp chế duyệt
                  </button>
                )}
                {!selectedIdea.ceoApproved && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await updateMoneyIdeaStage(
                        selectedIdea.id,
                        'experimenting',
                        true,
                        selectedIdea.legalSignoff === 'approved' ? 'approved' : 'pending'
                      );
                      if (!res.ok) setIdeaNotice(res.error || 'Chưa đủ điều kiện duyệt.');
                      else setIdeaNotice('CEO đã duyệt đưa vào Thử nghiệm vi mô.');
                    }}
                    className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    CEO Duyệt Thử nghiệm
                  </button>
                )}
                <input
                  value={testResultDraft}
                  onChange={(e) => setTestResultDraft(e.target.value)}
                  placeholder="Ghi kết quả test thực tế (số lead / đơn / doanh thu)..."
                  className="flex-1 min-w-[180px] px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!testResultDraft.trim()) return;
                    await updateMoneyIdeaStage(selectedIdea.id, selectedIdea.stage, undefined, undefined, testResultDraft.trim());
                    setTestResultDraft('');
                    setIdeaNotice('Đã lưu kết quả thử nghiệm thực tế.');
                  }}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px] cursor-pointer"
                >
                  Lưu KQ Test
                </button>
              </div>
            </div>
          )}

          {/* 6-Column Kanban or List */}
          {moneyIdeas.length === 0 ? (
            <div className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
              Chưa có ý tưởng nào. Bấm "Brainstorm ngay" để các phòng ban rảnh đề xuất phương án doanh thu mới.
            </div>
          ) : ideaViewMode === 'kanban' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {(
                [
                  { id: 'new', label: 'Mới' },
                  { id: 'researching', label: 'Đang nghiên cứu' },
                  { id: 'waiting_ceo', label: 'Chờ CEO duyệt' },
                  { id: 'experimenting', label: 'Thử nghiệm' },
                  { id: 'scaling', label: 'Mở rộng' },
                  { id: 'stopped', label: 'Dừng' },
                ] as const
              ).map((col) => {
                const items = moneyIdeas.filter((m) => m.stage === col.id);
                return (
                  <div
                    key={col.id}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1.5 min-h-[120px]"
                  >
                    <div className="font-semibold text-[11px] flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                      <span>{col.label}</span>
                      <span className="font-mono-num text-slate-500">{items.length}</span>
                    </div>
                    {items.map((idea) => (
                      <div
                        key={idea.id}
                        className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1"
                      >
                        <div className="font-semibold text-[11px] line-clamp-2">{idea.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono-num">
                          TB {formatVnd(idea.scenarios.midVndMonth)} · {idea.legalSignoff === 'approved' ? 'PL✓' : 'PL?'} ·{' '}
                          {idea.ceoApproved ? 'CEO✓' : 'CEO?'}
                        </div>
                        {idea.realTestResult && (
                          <div className="text-[10px] text-emerald-500 truncate">KQ: {idea.realTestResult}</div>
                        )}
                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          <button
                            type="button"
                            onClick={() => setSelectedIdeaId(idea.id)}
                            className="flex items-center gap-0.5 text-[10px] text-sky-500 hover:underline cursor-pointer"
                          >
                            <Eye className="w-2.5 h-2.5" />
                            <span>Hồ sơ</span>
                          </button>
                          <select
                            value={idea.stage}
                            onChange={async (e) => {
                              const nextStage = e.target.value as MoneyIdeaStage;
                              const res = await updateMoneyIdeaStage(
                                idea.id,
                                nextStage,
                                nextStage === 'experimenting' || nextStage === 'scaling' ? true : undefined,
                                nextStage === 'experimenting' || nextStage === 'scaling' ? idea.legalSignoff : undefined
                              );
                              if (!res.ok) setIdeaNotice(res.error || 'Chưa đủ điều kiện chuyển cột.');
                            }}
                            className="text-[10px] rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-1 py-0.5"
                          >
                            <option value="new">Mới</option>
                            <option value="researching">Nghiên cứu</option>
                            <option value="waiting_ceo">Chờ CEO</option>
                            <option value="experimenting">Thử nghiệm</option>
                            <option value="scaling">Mở rộng</option>
                            <option value="stopped">Dừng</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {moneyIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-xs">{idea.title}</div>
                      <div className="text-[11px] text-slate-500">
                        Đề xuất: {idea.proposedBy} ({idea.department}) · Giai đoạn: <strong>{idea.stage}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedIdeaId(idea.id)}
                      className="px-2 py-1 rounded border border-sky-500/40 text-sky-500 text-[11px] cursor-pointer"
                    >
                      Xem hồ sơ đầy đủ
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">{idea.problemAndEvidence}</div>
                  <div className="grid grid-cols-3 gap-2 font-mono-num text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>Thấp (Dự báo): {formatVnd(idea.scenarios.lowVndMonth)}/th</div>
                    <div>TB (Dự báo): {formatVnd(idea.scenarios.midVndMonth)}/th</div>
                    <div>Cao (Dự báo): {formatVnd(idea.scenarios.highVndMonth)}/th</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Competitor Watch & Matrix */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-semibold">Theo dõi Đối thủ & Ma trận So sánh (Chỉ nguồn công khai hợp pháp)</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddComp((v) => !v)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-sky-500/40 text-sky-500 text-[11px] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Thêm đối thủ</span>
                </button>
                <button
                  type="button"
                  onClick={() => runCompetitorWatchCycle()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Quét đối thủ</span>
                </button>
              </div>
            </div>

            {showAddComp && (
              <div className="p-2.5 rounded-lg border border-sky-500/40 bg-slate-50 dark:bg-slate-900 space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <input value={compName} onChange={(e) => setCompName(e.target.value)} placeholder="Tên đối thủ..." className="px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800" />
                  <input value={compUrl} onChange={(e) => setCompUrl(e.target.value)} placeholder="URL công khai..." className="px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800" />
                  <input value={compNiche} onChange={(e) => setCompNiche(e.target.value)} placeholder="Ngách..." className="px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800" />
                  <input value={compPrice} onChange={(e) => setCompPrice(e.target.value)} placeholder="Giá công khai..." className="px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800" />
                  <input value={compStrengths} onChange={(e) => setCompStrengths(e.target.value)} placeholder="Điểm mạnh..." className="px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800" />
                  <input value={compWeaknesses} onChange={(e) => setCompWeaknesses(e.target.value)} placeholder="Điểm yếu..." className="px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800" />
                </div>
                <div className="flex gap-2">
                  <input value={compFeatures} onChange={(e) => setCompFeatures(e.target.value)} placeholder="Tính năng chính..." className="flex-1 px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800" />
                  <button type="button" onClick={handleAddCompetitor} className="px-3 py-1 rounded bg-sky-600 text-white font-semibold cursor-pointer">
                    Lưu đối thủ
                  </button>
                </div>
              </div>
            )}

            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] space-y-1">
              <div className="font-semibold">Báo cáo tổng hợp định kỳ: {competitorReport.executiveSummary}</div>
              {competitorReport.majorAlerts.map((a, idx) => (
                <div key={idx} className="text-rose-500 font-medium">
                  • [CẢNH BÁO SỰ KIỆN LỚN - {a.date}] {a.competitorName}: {a.summary}
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-2.5 py-1.5">Đối thủ</th>
                    <th className="px-2.5 py-1.5">Giá công khai</th>
                    <th className="px-2.5 py-1.5">Điểm mạnh</th>
                    <th className="px-2.5 py-1.5">Điểm yếu (Cơ hội)</th>
                    <th className="px-2.5 py-1.5">Biến động mới</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {competitorReport.matrixRows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-2.5 py-1.5 font-semibold">{r.name}</td>
                      <td className="px-2.5 py-1.5">{r.price}</td>
                      <td className="px-2.5 py-1.5 text-slate-600 dark:text-slate-300">{r.strengths}</td>
                      <td className="px-2.5 py-1.5 text-emerald-600 dark:text-emerald-400">{r.weaknesses}</td>
                      <td className={`px-2.5 py-1.5 ${r.severity === 'major' ? 'text-rose-500 font-semibold' : 'text-slate-500'}`}>
                        {r.lastAlert}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: SYSTEM UPGRADE PROPOSALS (U) */}
      {subTab === 'upgrades' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-start gap-2 text-[11px]">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Rào chắn an toàn:</strong> AI chỉ được đề xuất nâng cấp quy trình/prompt/playbook (hoặc xuất bản ghi PR tách biệt). Tuyệt đối không tự sửa mã nguồn đang chạy hay tự nâng quyền; mọi đề xuất đều phải qua Sandbox → CEO duyệt Pilot → Áp dụng hoặc Rollback 1 nút.
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold">Đề xuất Nâng cấp & Đổi mới (#NC)</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={async () => {
                  const created = await runBottleneckUpgradeAnalysis();
                  setUpgNotice(
                    created.length > 0
                      ? `Đã phân tích nút thắt thật và tạo ${created.length} đề xuất nâng cấp mới.`
                      : 'Chưa phát hiện nút thắt mới nào chưa có đề xuất.'
                  );
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-sky-500/40 text-sky-500 font-semibold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Phân tích nút thắt tự động</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNewUpgrade((v) => !v)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo đề xuất #NC</span>
              </button>
            </div>
          </div>

          {upgNotice && (
            <div className="p-2 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300 text-[11px] flex items-center justify-between">
              <span>{upgNotice}</span>
              <button type="button" onClick={() => setUpgNotice(null)} className="underline cursor-pointer">
                Đóng
              </button>
            </div>
          )}

          {showNewUpgrade && (
            <div className="p-3 rounded-lg border border-sky-500/40 bg-slate-50 dark:bg-slate-900 space-y-2">
              <input
                value={upgTitle}
                onChange={(e) => setUpgTitle(e.target.value)}
                placeholder="Tiêu đề đề xuất nâng cấp..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <input
                value={upgEvidence}
                onChange={(e) => setUpgEvidence(e.target.value)}
                placeholder="Bằng chứng điểm nghẽn hiện tại..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <input
                value={upgSolution}
                onChange={(e) => setUpgSolution(e.target.value)}
                placeholder="Giải pháp đề xuất..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <input
                value={upgTestPlan}
                onChange={(e) => setUpgTestPlan(e.target.value)}
                placeholder="Cách thử nghiệm (Sandbox / A-B)..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <div className="flex gap-2">
                <input
                  value={upgRoi}
                  onChange={(e) => setUpgRoi(e.target.value)}
                  placeholder="Lợi ích đo được / ROI kỳ vọng..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
                <button
                  type="button"
                  onClick={handleCreateUpgrade}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
                >
                  Gửi đề xuất
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {upgradeProposals.map((u) => (
              <div
                key={u.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">
                      {u.code} · {u.title}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Đề xuất bởi: {u.proposedBy} · Giai đoạn: <strong>{u.rolloutStage}</strong> · Chi phí: {formatVnd(u.estimatedCostVnd)}
                    </div>
                  </div>
                  <span className={`font-mono-num text-[11px] font-semibold ${u.ceoApproved ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {u.ceoApproved ? `CEO Đã duyệt` : 'Chờ CEO duyệt'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500"><strong>Điểm nghẽn:</strong> {u.bottleneckEvidence}</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300"><strong>Giải pháp:</strong> {u.solutionSummary}</div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400"><strong>Lợi ích dự kiến:</strong> {u.expectedRoi}</div>
                <div className="text-[11px] text-slate-500">
                  <strong>Thử nghiệm:</strong> {u.testPlan || 'Sandbox'} · <strong>Rủi ro & Rollback:</strong> {u.risksAndRollback}
                </div>
                {u.patchOrPrNote && (
                  <div className="text-[10.5px] text-indigo-500"><strong>Phạm vi thay đổi:</strong> {u.patchOrPrNote}</div>
                )}
                <div className="text-[11px] text-slate-500 font-mono-num">
                  Trước: {u.beforeMetric} {u.afterMetric ? `→ Sau: ${u.afterMetric}` : ''}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => advanceUpgradeStage(u.id, 'sandbox_test')}
                    className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px] cursor-pointer"
                  >
                    Thử Sandbox
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const r = await advanceUpgradeStage(u.id, 'pilot', { ceoApprovedByAction: true });
                      if (!r.ok) setUpgNotice(r.error || 'Không thể duyệt Pilot.');
                    }}
                    className="px-2 py-1 rounded bg-sky-600 text-white text-[11px] font-medium cursor-pointer"
                  >
                    CEO Duyệt Pilot
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const r = await advanceUpgradeStage(u.id, 'deployed_all', { ceoApprovedByAction: true });
                      if (!r.ok) setUpgNotice(r.error || 'Không thể áp dụng.');
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-medium cursor-pointer"
                  >
                    <Rocket className="w-3 h-3" />
                    <span>CEO Áp dụng toàn công ty</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => advanceUpgradeStage(u.id, 'rolled_back')}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-rose-500/40 text-rose-500 text-[11px] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Rollback 1 nút</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {upgradeChangelog.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                <span>Nhật ký thay đổi (Changelog — Người đề xuất / Người duyệt / So sánh Trước-Sau)</span>
              </div>
              {upgradeChangelog.map((c) => (
                <div key={c.id} className="p-2 rounded border border-slate-200 dark:border-slate-800 text-[11px] space-y-0.5">
                  <div className="font-semibold">
                    {c.version} · {c.title}
                  </div>
                  <div className="text-slate-500">
                    Đề xuất: {c.proposedBy || 'tech_lead'} · Duyệt: {c.approvedBy || 'CEO'}
                  </div>
                  <div className="font-mono-num text-emerald-600 dark:text-emerald-400">
                    {c.beforeMetric} → {c.afterMetric}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
