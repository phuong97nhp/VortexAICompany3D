import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatVnd } from '../../engine/expenseEngine';
import { useCompanyStore } from '../../store/useCompanyStore';
import { ProviderId } from '../../types';

const PROVIDER_META: Record<ProviderId, { label: string; color: string }> = {
  gemini: { label: 'Gemini', color: '#38BDF8' },
  deepseek: { label: 'DeepSeek', color: '#8B5CF6' },
  local: { label: 'Local (0đ)', color: '#10B981' },
  mock: { label: 'Mô phỏng (0đ)', color: '#F59E0B' },
};

export function TokenKpiPanel() {
  const departments = useCompanyStore((s) => s.departments);
  const expenses = useCompanyStore((s) => s.expenses);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);
  const tokenUsage = useCompanyStore((s) => s.tokenUsage);
  const settings = useCompanyStore((s) => s.settings);
  const leads = useCompanyStore((s) => s.leads);
  const outreachLogs = useCompanyStore((s) => s.outreachLogs);
  const hubcwReconciliations = useCompanyStore((s) => s.hubcwReconciliations);
  const hubcwApiLogs = useCompanyStore((s) => s.hubcwApiLogs);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayRecords = tokenUsage.filter((t) => t.dateKey === todayKey);
  const todayTokens = todayRecords.reduce((s, t) => s + t.totalTokens, 0);
  const todayCostUsd = todayRecords.reduce((s, t) => s + t.costUsd, 0);
  const cachedCount = tokenUsage.filter((t) => t.cached).length;

  // Per-provider accounting (today + total)
  const providerStats: Record<ProviderId, { todayTokens: number; totalTokens: number; costUsd: number }> = {
    gemini: { todayTokens: 0, totalTokens: 0, costUsd: 0 },
    deepseek: { todayTokens: 0, totalTokens: 0, costUsd: 0 },
    local: { todayTokens: 0, totalTokens: 0, costUsd: 0 },
    mock: { todayTokens: 0, totalTokens: 0, costUsd: 0 },
  };
  for (const t of tokenUsage) {
    const prov: ProviderId = t.provider || (t.model?.includes('gemini') ? 'gemini' : t.model?.includes('deepseek') ? 'deepseek' : 'mock');
    providerStats[prov].totalTokens += t.totalTokens;
    providerStats[prov].costUsd += prov === 'local' || prov === 'mock' ? 0 : t.costUsd;
    if (t.dateKey === todayKey) {
      providerStats[prov].todayTokens += t.totalTokens;
    }
  }

  const providerChartData = (Object.keys(PROVIDER_META) as ProviderId[]).map((p) => ({
    id: p,
    name: PROVIDER_META[p].label,
    value: providerStats[p].totalTokens,
    color: PROVIDER_META[p].color,
  }));

  // Group token usage by live department
  const deptMap: Record<string, { name: string; tokens: number; color: string }> = {};
  for (const t of tokenUsage) {
    const dept = departments.find((d) => d.id === t.department);
    if (!deptMap[t.department]) {
      deptMap[t.department] = { name: dept?.shortName || t.department, tokens: 0, color: dept?.color || '#38BDF8' };
    }
    deptMap[t.department].tokens += t.totalTokens;
  }
  const deptChartData = Object.values(deptMap);
  const tokenExpenseVnd = expenses
    .filter((e) => e.category === 'Token AI')
    .reduce((sum, e) => sum + e.amountVnd, 0);

  // Real Business KPIs
  const replied = leads.filter((l) => ['replied', 'demo', 'proposal', 'won'].includes(l.stage)).length;
  const replyRate = leads.length ? Math.round((replied / leads.length) * 100) : 0;
  const demos = leads.filter((l) => l.stage === 'demo').length;
  const won = leads.filter((l) => l.stage === 'won');
  const revenueVnd = won.reduce((s, l) => s + l.estimatedValueVnd, 0);
  const sentCount = outreachLogs.filter((o) => o.result === 'sent_dry_run' || o.result === 'sent_live').length;

  const latestRecon = hubcwReconciliations[0];
  const blockedWrites = hubcwApiLogs.filter((l) => l.result.startsWith('blocked')).length;
  const simulatedLeads = leads.filter(
    (l) => l.origin === 'simulated' || l.source.toLowerCase().includes('mô phỏng')
  ).length;
  const dataSourceLabel =
    settings.envMode === 'live'
      ? `Hub.ChuyenWeb LIVE (${settings.hubcw.baseUrl})`
      : settings.envMode === 'read_only'
        ? `Hub.ChuyenWeb READ-ONLY (${settings.hubcw.baseUrl})`
        : 'Dexie Sandbox (Mô phỏng nội bộ)';

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
      {/* BỔ SUNG H: Data Provenance & Trust Header */}
      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div>
          <span className="text-slate-400">Nguồn KPI: </span>
          <strong className="text-sky-500">{dataSourceLabel}</strong>
          <span className="text-slate-400"> · Cập nhật: {new Date().toLocaleTimeString('vi-VN')}</span>
        </div>
        <div className="flex items-center gap-2 font-mono-num">
          <span className="text-emerald-500 font-semibold">
            Tin cậy: {latestRecon ? `${latestRecon.validProvenancePercent}%` : '—'}
          </span>
          <span className="text-amber-500">Mô phỏng: {simulatedLeads} lead</span>
          <span className="text-rose-500">Bị chặn: {blockedWrites}</span>
        </div>
      </div>

      {/* KPI Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] text-slate-400">Tổng Lead CRM</div>
          <div className="text-lg font-bold font-mono-num text-sky-500">
            {leads.length > 0 ? leads.length : '—'}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] text-slate-400">Tin đã gửi / Tỉ lệ PH</div>
          <div className="text-lg font-bold font-mono-num text-emerald-500">
            {sentCount > 0 ? sentCount : '—'}{' '}
            <span className="text-xs text-slate-400">({leads.length > 0 ? `${replyRate}%` : '—'})</span>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] text-slate-400">Demo / Chốt Deal</div>
          <div className="text-lg font-bold font-mono-num text-amber-500">
            {leads.length > 0 ? `${demos} / ${won.length}` : '—'}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] text-slate-400">Doanh thu ghi nhận</div>
          <div className="text-base font-bold font-mono-num text-emerald-500">
            {revenueVnd > 0 ? `${(revenueVnd / 1_000_000).toFixed(1)} triệu đ` : '—'}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] text-slate-400">Token hôm nay</div>
          <div className="text-base font-bold font-mono-num text-sky-400">
            {todayTokens > 0 ? todayTokens.toLocaleString('vi-VN') : '—'}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] text-slate-400">Chi phí ước tính</div>
          <div className="text-base font-bold font-mono-num text-violet-400">
            {todayCostUsd > 0 ? `$${todayCostUsd.toFixed(4)}` : '—'}{' '}
            <span className="text-[10px] text-slate-400">({cachedCount} cache)</span>
          </div>
        </div>
      </div>

      {/* Per-Provider Daily Budgets + Finance Expense Bridge */}
      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">Ngân sách & Chi phí theo từng Provider AI (Hôm nay)</span>
          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className="text-[11px] font-semibold text-sky-500 hover:underline cursor-pointer font-mono-num"
          >
            Sổ chi Token AI: {formatVnd(tokenExpenseVnd)} →
          </button>
        </div>
        {(['gemini', 'deepseek', 'local', 'mock'] as ProviderId[]).map((prov) => {
          const used = providerStats[prov].todayTokens;
          const budget = settings.providerBudgets?.[prov] ?? 500000;
          const pct = prov === 'mock' ? 0 : Math.min(100, Math.round((used / budget) * 100));
          return (
            <div key={prov} className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PROVIDER_META[prov].color }} />
                  <span>{PROVIDER_META[prov].label}</span>
                </span>
                <span className="font-mono-num text-slate-400">
                  {used.toLocaleString('vi-VN')}
                  {prov !== 'mock' ? ` / ${budget.toLocaleString('vi-VN')} (${pct}%)` : ' tokens'} ·{' '}
                  <strong className="text-slate-200">
                    {prov === 'local' || prov === 'mock' ? '0đ' : `$${providerStats[prov].costUsd.toFixed(4)}`}
                  </strong>
                </span>
              </div>
              {prov !== 'mock' && (
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: PROVIDER_META[prov].color }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold mb-2">Token tiêu thụ theo Phòng ban</div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
                  {deptChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold mb-2">Phân bổ theo Nhà cung cấp AI</div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={providerChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={58} label>
                  {providerChartData.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
