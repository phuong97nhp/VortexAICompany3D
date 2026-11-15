import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Compass,
  Lightbulb,
  Plus,
  RefreshCw,
  Rocket,
  RotateCcw,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { formatVnd } from '../../engine/expenseEngine';
import { useCompanyStore } from '../../store/useCompanyStore';
import { MoneyIdeaStage, OkrObjective } from '../../types';

type SubTab = 'okr' | 'ideas' | 'upgrades';

export function OkrStrategyPanel() {
  const okrObjectives = useCompanyStore((s) => s.okrObjectives);
  const upsertOkrObjective = useCompanyStore((s) => s.upsertOkrObjective);
  const computeOkrPlan = useCompanyStore((s) => s.computeOkrPlan);

  const moneyIdeas = useCompanyStore((s) => s.moneyIdeas);
  const runIdleMoneyBrainstorm = useCompanyStore((s) => s.runIdleMoneyBrainstorm);
  const updateMoneyIdeaStage = useCompanyStore((s) => s.updateMoneyIdeaStage);
  const competitorWatches = useCompanyStore((s) => s.competitorWatches);
  const runCompetitorWatchCycle = useCompanyStore((s) => s.runCompetitorWatchCycle);

  const upgradeProposals = useCompanyStore((s) => s.upgradeProposals);
  const upgradeChangelog = useCompanyStore((s) => s.upgradeChangelog);
  const proposeSystemUpgrade = useCompanyStore((s) => s.proposeSystemUpgrade);
  const advanceUpgradeStage = useCompanyStore((s) => s.advanceUpgradeStage);

  const [subTab, setSubTab] = useState<SubTab>('okr');
  const [selectedOkrId, setSelectedOkrId] = useState<string>(okrObjectives[0]?.id || '');

  // New OKR form
  const [showNewOkr, setShowNewOkr] = useState(false);
  const [okrTitle, setOkrTitle] = useState('');
  const [okrPeriodType, setOkrPeriodType] = useState<OkrObjective['periodType']>('quarter');
  const [okrPeriodLabel, setOkrPeriodLabel] = useState('Quý 4/2026');
  const [okrTargetVnd, setOkrTargetVnd] = useState(180_000_000);
  const [okrChannel, setOkrChannel] = useState('Zalo OA + Email + Demo 1-1');

  // New Upgrade Proposal form
  const [showNewUpgrade, setShowNewUpgrade] = useState(false);
  const [upgTitle, setUpgTitle] = useState('');
  const [upgEvidence, setUpgEvidence] = useState('');
  const [upgSolution, setUpgSolution] = useState('');
  const [upgRoi, setUpgRoi] = useState('');

  const activeOkr = useMemo(
    () => okrObjectives.find((o) => o.id === selectedOkrId) || okrObjectives[0],
    [okrObjectives, selectedOkrId]
  );

  const funnelPlan = useMemo(
    () => (activeOkr ? computeOkrPlan(activeOkr.id) : null),
    [activeOkr, computeOkrPlan]
  );

  const handleCreateOkr = async () => {
    if (!okrTitle.trim()) return;
    const now = Date.now();
    const next: OkrObjective = {
      id: `okr_${now.toString(36)}`,
      periodType: okrPeriodType,
      periodLabel: okrPeriodLabel.trim() || 'Kỳ mới',
      title: okrTitle.trim(),
      targetRevenueVnd: Math.max(1_000_000, Number(okrTargetVnd) || 100_000_000),
      channel: okrChannel.trim(),
      ownerAgentId: 'sales_director',
      deadline: new Date(now + 90 * 86_400_000).toISOString().slice(0, 10),
      assumptions: ['Tính dựa trên dữ liệu CRM & Affiliate thực tế; tỷ lệ thiếu gắn nhãn giả định.'],
      keyResults: [
        {
          id: `kr_${now}`,
          title: 'Doanh thu mục tiêu (VND)',
          metricUnit: 'VND',
          baselineValue: 0,
          targetValue: Math.max(1_000_000, Number(okrTargetVnd) || 100_000_000),
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
    await proposeSystemUpgrade({
      title: upgTitle.trim(),
      proposedBy: 'tech_lead',
      bottleneckEvidence: upgEvidence.trim() || 'Ghi nhận điểm nghẽn từ vận hành hàng tuần.',
      solutionSummary: upgSolution.trim(),
      expectedRoi: upgRoi.trim() || 'Tiết kiệm thời gian xử lý ~20%',
      beforeMetric: 'Baseline hiện tại (đang đo)',
    });
    setUpgTitle('');
    setUpgEvidence('');
    setUpgSolution('');
    setUpgRoi('');
    setShowNewUpgrade(false);
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
              <div className="font-semibold">Tạo mục tiêu OKR mới</div>
              <input
                value={okrTitle}
                onChange={(e) => setOkrTitle(e.target.value)}
                placeholder="Tên mục tiêu (vd: Đạt 300 triệu doanh thu SaaS Quý 4)..."
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
                  placeholder="Nhãn kỳ (Q4/2026)"
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
              {/* Behind Schedule Alert */}
              {funnelPlan.behindAlertTriggered && (
                <div className="p-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">
                      Cảnh báo chậm tiến độ ({funnelPlan.scheduleGapPercent}%)
                    </div>
                    <div className="text-[11px] mt-0.5">
                      {funnelPlan.recoverySuggestions[0] || 'Cần điều chỉnh tăng tốc độ tiếp cận & demo.'}
                    </div>
                  </div>
                </div>
              )}

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
                <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
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
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span>Tỷ lệ chuyển đổi: {st.conversionRatePercent ?? '—'}%</span>
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
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Ý tưởng Kiếm tiền khi Rảnh</span>
            </span>
            <button
              type="button"
              onClick={() => runIdleMoneyBrainstorm()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Brainstorm ngay</span>
            </button>
          </div>

          <div className="space-y-2">
            {moneyIdeas.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
                Chưa có ý tưởng nào. Bấm "Brainstorm ngay" để các phòng ban rảnh đề xuất phương án doanh thu mới.
              </div>
            ) : (
              moneyIdeas.map((idea) => (
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
                    <select
                      value={idea.stage}
                      onChange={(e) =>
                        updateMoneyIdeaStage(
                          idea.id,
                          e.target.value as MoneyIdeaStage,
                          e.target.value === 'experimenting' || e.target.value === 'scaling'
                        )
                      }
                      className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]"
                    >
                      <option value="new">Mới</option>
                      <option value="researching">Đang nghiên cứu</option>
                      <option value="waiting_ceo">Chờ CEO duyệt</option>
                      <option value="experimenting">Thử nghiệm vi mô</option>
                      <option value="scaling">Mở rộng</option>
                      <option value="stopped">Đã dừng</option>
                    </select>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">{idea.problemAndEvidence}</div>
                  <div className="grid grid-cols-3 gap-2 font-mono-num text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>Thấp: {formatVnd(idea.scenarios.lowVndMonth)}/th</div>
                    <div>TB: {formatVnd(idea.scenarios.midVndMonth)}/th</div>
                    <div>Cao: {formatVnd(idea.scenarios.highVndMonth)}/th</div>
                  </div>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400">
                    Stop-loss: {idea.stopLossRule}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Theo dõi Đối thủ (Chỉ nguồn công khai hợp pháp)</span>
              <button
                type="button"
                onClick={() => runCompetitorWatchCycle()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Quét đối thủ</span>
              </button>
            </div>
            {competitorWatches.map((w) => (
              <div
                key={w.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{w.name}</span>
                  <span className="text-[11px] text-slate-500">{w.niche}</span>
                </div>
                <div className="text-[11px] text-slate-500">Giá công khai: {w.lastPriceNote}</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  Cập nhật gần nhất: {w.recentChanges[0]?.summary}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: SYSTEM UPGRADE PROPOSALS (U) */}
      {subTab === 'upgrades' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-start gap-2 text-[11px]">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Rào chắn an toàn:</strong> AI chỉ được đề xuất nâng cấp quy trình/prompt/playbook. Tuyệt đối không tự sửa mã nguồn ứng dụng thật; mọi đề xuất đều phải qua Sandbox → Pilot → Triển khai hoặc Rollback 1 nút.
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold">Đề xuất Nâng cấp Công ty</span>
            <button
              type="button"
              onClick={() => setShowNewUpgrade((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo đề xuất #NC</span>
            </button>
          </div>

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
              <div className="flex gap-2">
                <input
                  value={upgRoi}
                  onChange={(e) => setUpgRoi(e.target.value)}
                  placeholder="ROI kỳ vọng..."
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
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">
                      {u.code} · {u.title}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Giai đoạn: <strong>{u.rolloutStage}</strong> · ROI: {u.expectedRoi}
                    </div>
                  </div>
                  <span className="font-mono-num text-[11px] text-slate-500">
                    {u.ceoApproved ? 'CEO Đã duyệt' : 'Chờ duyệt'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">{u.solutionSummary}</div>
                <div className="text-[11px] text-slate-500">
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
                    onClick={() => advanceUpgradeStage(u.id, 'pilot')}
                    className="px-2 py-1 rounded bg-sky-600 text-white text-[11px] font-medium cursor-pointer"
                  >
                    Duyệt Pilot
                  </button>
                  <button
                    type="button"
                    onClick={() => advanceUpgradeStage(u.id, 'deployed_all')}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-medium cursor-pointer"
                  >
                    <Rocket className="w-3 h-3" />
                    <span>Áp dụng toàn công ty</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => advanceUpgradeStage(u.id, 'rolled_back')}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-rose-500/40 text-rose-500 text-[11px] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Rollback</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {upgradeChangelog.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                <span>Nhật ký thay đổi (Changelog)</span>
              </div>
              {upgradeChangelog.map((c) => (
                <div key={c.id} className="p-2 rounded border border-slate-200 dark:border-slate-800 text-[11px]">
                  <div className="font-semibold">
                    {c.version} · {c.title}
                  </div>
                  <div className="text-slate-500">
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
