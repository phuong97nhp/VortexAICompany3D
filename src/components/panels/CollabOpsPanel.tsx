import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  FlaskConical,
  GitBranch,
  Network,
  Play,
  Plus,
  Rocket,
  Scale,
  Search,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import {
  buildDeptBlockerMatrix,
  evaluateHandoverSlaMetrics,
  runPlaybookRegressionSuite,
} from '../../engine/collaborationEngine';
import { useCompanyStore } from '../../store/useCompanyStore';
import { DepartmentId, ExperienceMemoryItem } from '../../types';

type SubTab = 'quality' | 'raci' | 'repos' | 'playbooks';

export function CollabOpsPanel() {
  const qualityCycles = useCompanyStore((s) => s.qualityCycles);
  const runQualityCycle = useCompanyStore((s) => s.runQualityCycle);
  const councilSessions = useCompanyStore((s) => s.councilSessions);
  const conveneCouncil = useCompanyStore((s) => s.conveneCouncil);

  const interactionRules = useCompanyStore((s) => s.interactionRules);
  const handoverTickets = useCompanyStore((s) => s.handoverTickets);
  const createHandoverTicket = useCompanyStore((s) => s.createHandoverTicket);
  const respondHandoverTicket = useCompanyStore((s) => s.respondHandoverTicket);
  const runDailyDeptStandup = useCompanyStore((s) => s.runDailyDeptStandup);

  const repoEvaluations = useCompanyStore((s) => s.repoEvaluations);
  const scoutGitRepo = useCompanyStore((s) => s.scoutGitRepo);
  const runSandboxTestOnRepo = useCompanyStore((s) => s.runSandboxTestOnRepo);
  const markRepoLegalReviewed = useCompanyStore((s) => s.markRepoLegalReviewed);
  const promoteRepoToUpgradeProposal = useCompanyStore((s) => s.promoteRepoToUpgradeProposal);

  const playbooks = useCompanyStore((s) => s.playbooks);
  const togglePlaybookFastTrack = useCompanyStore((s) => s.togglePlaybookFastTrack);
  const markPlaybookReviewed = useCompanyStore((s) => s.markPlaybookReviewed);
  const experienceMemories = useCompanyStore((s) => s.experienceMemories);
  const addExperienceMemory = useCompanyStore((s) => s.addExperienceMemory);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);

  const departments = useCompanyStore((s) => s.departments);
  const agents = useCompanyStore((s) => s.agents);

  const [subTab, setSubTab] = useState<SubTab>('quality');
  const [standupSent, setStandupSent] = useState(false);

  // Quality & Council inputs
  const [qcTitle, setQcTitle] = useState('Đề xuất chiến dịch Demo EduCenter Q4');
  const [qcDept, setQcDept] = useState<DepartmentId>('marketing');
  const [qcDraft, setQcDraft] = useState(
    'Triển khai chuỗi 3 bài chia sẻ kinh nghiệm quản lý trung tâm ngoại ngữ kèm link đăng ký dùng thử 14 ngày trên HubCW, ngân sách 0đ.'
  );
  const [councilTopic, setCouncilTopic] = useState('Chọn kênh tăng trưởng ưu tiên cho EduCenter Pro');

  // Handover ticket form
  const [bgTitle, setBgTitle] = useState('');
  const [bgFromDept, setBgFromDept] = useState<DepartmentId>('sales');
  const [bgToDept, setBgToDept] = useState<DepartmentId>('legal');
  const [bgSummary, setBgSummary] = useState('');

  // Git Repo Scout
  const [repoQuery, setRepoQuery] = useState('vietnamese ocr invoice');
  const [repoBusy, setRepoBusy] = useState(false);
  const [repoNotice, setRepoNotice] = useState<string | null>(null);

  // Playbook Regression & Experience Memory
  const [regressionResult, setRegressionResult] = useState<ReturnType<typeof runPlaybookRegressionSuite> | null>(null);
  const [expDept, setExpDept] = useState<DepartmentId>('marketing');
  const [expSource, setExpSource] = useState<ExperienceMemoryItem['source']>('ceo_feedback');
  const [expTags, setExpTags] = useState('ceo_feedback, giọng văn');
  const [expLesson, setExpLesson] = useState('');

  const slaStats = useMemo(() => evaluateHandoverSlaMetrics(handoverTickets), [handoverTickets]);
  const blockers = useMemo(() => buildDeptBlockerMatrix(handoverTickets), [handoverTickets]);

  const handleRunQuality = async () => {
    if (!qcTitle.trim() || !qcDraft.trim()) return;
    await runQualityCycle({
      title: qcTitle.trim(),
      department: qcDept,
      definitionOfDone: 'Đủ dẫn chứng, không sai Product Master, sẵn sàng bàn giao.',
      draftText: qcDraft.trim(),
    });
  };

  const handleConveneCouncil = async () => {
    if (!councilTopic.trim()) return;
    await conveneCouncil({ topic: councilTopic.trim() });
  };

  const handleCreateHandover = async () => {
    if (!bgTitle.trim()) return;
    const fromAg = agents.find((a) => a.department === bgFromDept && a.employmentStatus === 'active') || agents[0];
    const toAg = agents.find((a) => a.department === bgToDept && a.employmentStatus === 'active') || agents[0];
    await createHandoverTicket({
      fromDepartment: bgFromDept,
      toDepartment: bgToDept,
      fromAgentId: fromAg?.id || 'sales_director',
      toAgentId: toAg?.id || 'legal',
      title: bgTitle.trim(),
      payloadSummary: bgSummary.trim() || 'Đã đính kèm dữ liệu khách hàng & yêu cầu xử lý theo SLA.',
      slaMinutes: 30,
    });
    setBgTitle('');
    setBgSummary('');
  };

  const handleScoutRepo = async () => {
    if (!repoQuery.trim()) return;
    setRepoBusy(true);
    try {
      await scoutGitRepo(repoQuery.trim());
    } finally {
      setRepoBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-3 gap-2.5 overflow-hidden text-xs">
      <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {(
          [
            { id: 'quality', label: 'Chất lượng & Hội đồng' },
            { id: 'raci', label: `Bàn giao #BG (${handoverTickets.length})` },
            { id: 'repos', label: `Repo Git (${repoEvaluations.length})` },
            { id: 'playbooks', label: `Playbook (${playbooks.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === t.id
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SUBTAB 1: QUALITY LOOP & COUNCIL */}
      {subTab === 'quality' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Vòng Kiểm định Chất lượng (Maker → Critic ≥2 lỗi → Verifier → Trưởng phòng)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                value={qcTitle}
                onChange={(e) => setQcTitle(e.target.value)}
                className="col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <select
                value={qcDept}
                onChange={(e) => setQcDept(e.target.value as DepartmentId)}
                className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.shortName}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              rows={2}
              value={qcDraft}
              onChange={(e) => setQcDraft(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
            />
            <button
              type="button"
              onClick={handleRunQuality}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
            >
              Chạy vòng phản biện nội bộ
            </button>

            {qualityCycles.slice(0, 4).map((q) => (
              <div
                key={q.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{q.title}</span>
                  <span
                    className={`font-mono-num text-[11px] font-semibold ${
                      q.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'
                    }`}
                  >
                    {q.status === 'approved' ? `Đạt sau ${q.currentRound} vòng` : 'Leo thang CEO'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">{q.finalSummary}</div>
                {q.rounds[0] && (
                  <div className="text-[10.5px] text-slate-500">
                    Critic ({q.rounds[0].criticName}) chỉ ra {q.rounds[0].criticWeaknesses.length} điểm yếu:{' '}
                    {q.rounds[0].criticWeaknesses[0]}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>Hội đồng Liên phòng ban (3–5 Agent · Bỏ phiếu trọng số)</span>
            </div>
            <div className="flex gap-2">
              <input
                value={councilTopic}
                onChange={(e) => setCouncilTopic(e.target.value)}
                placeholder="Chủ đề cần Hội đồng thảo luận..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <button
                type="button"
                onClick={handleConveneCouncil}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold whitespace-nowrap cursor-pointer"
              >
                Triệu tập Hội đồng
              </button>
            </div>

            {councilSessions.slice(0, 3).map((cs) => (
              <div
                key={cs.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{cs.topic}</span>
                  <span className="text-[11px] text-sky-500 font-medium">
                    {cs.status === 'consensus' ? 'Đã chốt phương án' : 'Hòa phiếu → CEO quyết'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-700 dark:text-slate-200">{cs.ceoExecutiveSummary}</div>
                <div className="text-[10.5px] text-slate-500 space-y-0.5">
                  {cs.optionsConsidered
                    .filter((o) => o.rejectedReason)
                    .map((o) => (
                      <div key={o.id}>
                        • Loại "{o.title}": {o.rejectedReason}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: RACI & HANDOVER TICKETS */}
      {subTab === 'raci' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="grid grid-cols-4 gap-1.5 font-mono-num">
            <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-[10px] text-slate-500">Tổng #BG</div>
              <div className="text-sm font-bold">{slaStats.total}</div>
            </div>
            <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-[10px] text-slate-500">Đúng SLA</div>
              <div className="text-sm font-bold text-emerald-500">{slaStats.onTimeRate}%</div>
            </div>
            <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-[10px] text-slate-500">Chờ TB</div>
              <div className="text-sm font-bold text-sky-500">{slaStats.avgWaitMinutes}p</div>
            </div>
            <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-[10px] text-slate-500">Trả lại / Quá hạn</div>
              <div className="text-sm font-bold text-amber-500">
                {slaStats.bounceRate}% / {slaStats.overdueCount}
              </div>
            </div>
          </div>

          {slaStats.bottleneckDept && (
            <div className="p-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center gap-2 text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>COO Cảnh báo điểm nghẽn:</strong> Phòng <strong>{slaStats.bottleneckDept}</strong> đang tồn{' '}
                {slaStats.bottleneckPendingCount} phiếu chờ tiếp nhận/xử lý.
              </span>
            </div>
          )}

          {/* Interactive SVG Interaction Map + COO Daily Stand-up */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-semibold flex items-center gap-1.5">
                <Network className="w-4 h-4 text-sky-500" />
                <span>Bản đồ Phối hợp Liên phòng ban (Bấm luồng để tạo #BG)</span>
              </span>
              <button
                type="button"
                onClick={async () => {
                  await runDailyDeptStandup();
                  setStandupSent(true);
                  setTimeout(() => setStandupSent(false), 2500);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold cursor-pointer"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>{standupSent ? 'Đã gửi Stand-up!' : 'Họp Stand-up COO'}</span>
              </button>
            </div>
            <svg viewBox="0 0 360 118" className="w-full h-28 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              {[
                { id: 'marketing', label: 'Marketing', x: 52, y: 26, color: '#8B5CF6' },
                { id: 'sales', label: 'Sales', x: 145, y: 26, color: '#10B981' },
                { id: 'legal', label: 'Pháp chế', x: 255, y: 26, color: '#EC4899' },
                { id: 'cs', label: 'CSKH', x: 52, y: 88, color: '#06B6D4' },
                { id: 'product', label: 'Kỹ thuật/PM', x: 165, y: 88, color: '#F59E0B' },
                { id: 'backoffice', label: 'Kế toán/CFO', x: 285, y: 88, color: '#6366F1' },
              ].map((n) => (
                <g key={n.id}>
                  <rect x={n.x - 38} y={n.y - 13} width={76} height={24} rx={6} fill={n.color} fillOpacity={0.18} stroke={n.color} strokeWidth={1.2} />
                  <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize="9.5" fill="currentColor" className="fill-slate-800 dark:fill-slate-100 font-semibold">
                    {n.label}
                  </text>
                </g>
              ))}
              <line x1="90" y1="26" x2="107" y2="26" stroke="#38BDF8" strokeWidth="1.6" />
              <line x1="183" y1="26" x2="217" y2="26" stroke="#38BDF8" strokeWidth="1.6" />
              <line x1="90" y1="88" x2="127" y2="88" stroke="#F59E0B" strokeWidth="1.6" />
              <line x1="65" y1="39" x2="265" y2="75" stroke="#6366F1" strokeWidth="1.2" strokeDasharray="3 2" />
            </svg>
            <div className="flex flex-wrap gap-1.5">
              {interactionRules.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setBgFromDept(r.fromDepartment);
                    setBgToDept(r.toDepartment);
                    setBgTitle(r.flowName);
                    setBgSummary(`Đầu vào chuẩn: ${r.requiredInput}`);
                  }}
                  className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-[10.5px] cursor-pointer"
                >
                  {r.fromDepartment} → {r.toDepartment} ({r.slaMinutes}p)
                </button>
              ))}
            </div>
          </div>

          {/* Cross-dept Blocker Matrix */}
          {blockers.length > 0 && (
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
              <div className="font-semibold text-[11px]">Bảng "Chặn lẫn nhau" Liên phòng ban</div>
              {blockers.map((b) => (
                <div
                  key={b.ticketId}
                  className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-slate-50 dark:bg-slate-950"
                >
                  <span className="truncate">
                    <strong>{b.waitingDept}</strong> đang chờ <strong>{b.blockingDept}</strong> ({b.code} · {b.title})
                  </span>
                  <span className={`font-mono-num shrink-0 ${b.isOverdue ? 'text-rose-500 font-bold' : 'text-amber-500'}`}>
                    Chờ {b.waitMinutes}p / {b.slaMinutes}p {b.isOverdue ? '· QUÁ SLA' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="font-semibold flex items-center gap-1.5">
              <ArrowLeftRight className="w-4 h-4 text-sky-500" />
              <span>Tạo Phiếu Bàn giao Liên phòng ban (#BG-xxx)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={bgFromDept}
                onChange={(e) => setBgFromDept(e.target.value as DepartmentId)}
                className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    Từ: {d.shortName}
                  </option>
                ))}
              </select>
              <select
                value={bgToDept}
                onChange={(e) => setBgToDept(e.target.value as DepartmentId)}
                className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    Đến: {d.shortName}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={bgTitle}
              onChange={(e) => setBgTitle(e.target.value)}
              placeholder="Nội dung bàn giao (vd: Chuyển hồ sơ Bên B soạn hợp đồng EduCenter)..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
            />
            <div className="flex gap-2">
              <input
                value={bgSummary}
                onChange={(e) => setBgSummary(e.target.value)}
                placeholder="Đầu vào kèm theo..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <button
                type="button"
                onClick={handleCreateHandover}
                className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
              >
                Gửi #BG
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {handoverTickets.map((t) => (
              <div
                key={t.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">
                    {t.code} · {t.title}
                  </span>
                  <span className="font-mono-num text-[11px] text-sky-500">
                    {t.fromDepartment} → {t.toDepartment} · {t.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">{t.payloadSummary}</div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => respondHandoverTicket(t.id, 'accepted')}
                    className="px-2 py-0.5 rounded bg-sky-600 text-white text-[11px] cursor-pointer"
                  >
                    Tiếp nhận
                  </button>
                  <button
                    type="button"
                    onClick={() => respondHandoverTicket(t.id, 'completed')}
                    className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] cursor-pointer"
                  >
                    Hoàn thành
                  </button>
                  <button
                    type="button"
                    onClick={() => respondHandoverTicket(t.id, 'rejected', 'Thiếu MST hoặc đầu vào chuẩn')}
                    className="px-2 py-0.5 rounded border border-rose-500/40 text-rose-500 text-[11px] cursor-pointer"
                  >
                    Trả lại
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
            <div className="font-semibold flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ma trận RACI Liên phòng ban</span>
            </div>
            {interactionRules.map((r) => (
              <div key={r.id} className="p-2 rounded bg-slate-50 dark:bg-slate-950 text-[11px] space-y-0.5">
                <div className="font-semibold">{r.flowName}</div>
                <div className="text-slate-500">
                  SLA: {r.slaMinutes}p · R: {r.raci.responsible} · A: {r.raci.accountable} · C: {r.raci.consulted}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: GIT REPO SCOUT (V) */}
      {subTab === 'repos' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="font-semibold flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-sky-500" />
              <span>Phòng Kỹ thuật Tìm & Thử nghiệm Repo Git (CHỈ chạy khi CEO yêu cầu)</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Không tự tìm khi chưa có lệnh CEO. Mỗi repo chỉ được phép thử trong Docker Sandbox cô lập (<code className="font-mono-num">--network=none</code>, không chứa bí mật/DB thật).
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={repoQuery}
                  onChange={(e) => setRepoQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScoutRepo()}
                  placeholder="Tìm repo công khai trên GitHub..."
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>
              <button
                type="button"
                disabled={repoBusy}
                onClick={handleScoutRepo}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
              >
                {repoBusy ? 'Đang tìm...' : 'Tìm Repo'}
              </button>
            </div>
            {repoNotice && (
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-[11px] flex items-center justify-between gap-2">
                <span>{repoNotice}</span>
                <button type="button" onClick={() => setActiveTab('strategy')} className="underline font-semibold cursor-pointer">
                  Mở Mục tiêu & Nâng cấp →
                </button>
              </div>
            )}
          </div>

          {repoEvaluations.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
              Chưa tìm repo nào. Gõ từ khóa hoặc nhắn chat "tìm repo..." để Tech Lead quét License & bảo mật.
            </div>
          ) : (
            repoEvaluations.map((rep) => {
              const actionBadge =
                rep.recommendedAction === 'use'
                  ? 'Khuyên dùng'
                  : rep.recommendedAction === 'do_not_use'
                    ? 'Không dùng'
                    : 'Theo dõi';
              return (
                <div
                  key={rep.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold truncate">
                        {rep.repoFullName}{' '}
                        <span className="text-[10.5px] font-normal text-slate-500 font-mono-num">
                          ({rep.commitSha || 'HEAD'})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono-num truncate">
                        {rep.repoUrl}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono-num">
                        ★ {rep.stars} · License: <strong>{rep.license}</strong> · Pháp chế:{' '}
                        <strong>{rep.legalReviewed ? 'Đã rà soát Đạt' : 'Chờ rà soát'}</strong> · Cập nhật: {rep.lastUpdated}
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <div
                        className={`font-mono-num text-[11px] font-bold ${
                          rep.verificationLabel === 'ĐÃ CHẠY SANDBOX' ? 'text-emerald-500' : 'text-amber-500'
                        }`}
                      >
                        {rep.verificationLabel}
                      </div>
                      <div className="text-[10.5px] font-semibold text-sky-500">Đề xuất: {actionBadge}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    <strong>Mục đích:</strong> {rep.purpose || rep.requestedQuery} ·{' '}
                    <strong>Công sức tích hợp:</strong> {rep.integrationEffort || 'Đang ước lượng'}
                  </div>
                  {rep.performanceNote && (
                    <div className="text-[11px] text-slate-500">
                      <strong>Hiệu năng & Tài nguyên:</strong> {rep.performanceNote}
                    </div>
                  )}
                  {rep.securityFlags.length > 0 && (
                    <div className="text-[11px] text-rose-500">
                      Cảnh báo bảo mật/License: {rep.securityFlags.join(' | ')}
                    </div>
                  )}
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 text-[11px] font-mono-num text-slate-600 dark:text-slate-300">
                    {rep.stdoutExcerpt}
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                    <span className="text-[11px] text-slate-500 truncate max-w-[260px]">{rep.recommendation}</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!rep.legalReviewed && (
                        <button
                          type="button"
                          onClick={() => markRepoLegalReviewed(rep.id, true)}
                          className="px-2 py-1 rounded border border-indigo-500/40 text-indigo-500 text-[11px] cursor-pointer"
                        >
                          Pháp chế rà soát Đạt
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => runSandboxTestOnRepo(rep.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Thử Docker Sandbox</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const prop = await promoteRepoToUpgradeProposal(rep.id);
                          if (prop) {
                            setRepoNotice(`Đã chuyển "${rep.repoFullName}" thành Đề xuất Nâng cấp ${prop.code} (chờ CEO duyệt).`);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        <Rocket className="w-3 h-3" />
                        <span>Đề xuất tích hợp (#NC)</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUBTAB 4: PLAYBOOK LIBRARY, PROGRESS DASHBOARD & EXPERIENCE MEMORY (W) */}
      {subTab === 'playbooks' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Progress Dashboard + Regression Test */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-semibold flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-emerald-500" />
                <span>Bảng Tiến bộ & Kiểm thử Hồi quy Playbook (Không bao giờ bỏ qua Verifier/WriteGate)</span>
              </span>
              <button
                type="button"
                onClick={() => setRegressionResult(runPlaybookRegressionSuite(playbooks))}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold cursor-pointer"
              >
                <Play className="w-3 h-3" />
                <span>Chạy Regression Test</span>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 font-mono-num text-[11px]">
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-500">Playbook đang bật Fast-Track</div>
                <div className="text-sm font-bold text-emerald-500">
                  {playbooks.filter((p) => p.allowFastTrack).length}/{playbooks.length}
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-500">Điểm chất lượng TB</div>
                <div className="text-sm font-bold">
                  {playbooks.length
                    ? Math.round(playbooks.reduce((s, p) => s + p.avgQualityScore, 0) / playbooks.length)
                    : 0}
                  /100
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-500">Thời gian TB / lượt</div>
                <div className="text-sm font-bold text-sky-500">
                  {playbooks.length
                    ? (
                        playbooks.reduce((s, p) => s + (p.avgDurationMs || 2800), 0) /
                        playbooks.length /
                        1000
                      ).toFixed(1)
                    : '0'}
                  s
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-500">Token TB / việc</div>
                <div className="text-sm font-bold">
                  {playbooks.length
                    ? Math.round(playbooks.reduce((s, p) => s + (p.avgTokens || 1500), 0) / playbooks.length).toLocaleString(
                        'vi-VN'
                      )
                    : 0}
                </div>
              </div>
            </div>

            {regressionResult && (
              <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1 text-[11px]">
                <div className={`font-bold ${regressionResult.allPassed ? 'text-emerald-500' : 'text-rose-500'}`}>
                  Kết quả Regression Test: {regressionResult.passedCount}/{regressionResult.totalCount} ca đạt
                </div>
                {regressionResult.results.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-2">
                    <span>
                      {r.passed ? '✓' : '✗'} <strong>{r.title}:</strong> {r.detail}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            {playbooks.map((pb) => {
              const totalRuns = Math.max(1, pb.successCount + pb.failureCount);
              const reworkRate = Math.round(((pb.reworkCount || 0) / totalRuns) * 100);
              return (
                <div
                  key={pb.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                        <span>
                          {pb.name} (v{pb.version})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono-num">
                        Phòng {pb.department} · Điểm TB {pb.avgQualityScore}/100 · Thành công {pb.successCount} · Sửa lại{' '}
                        {reworkRate}% · TB {((pb.avgDurationMs || 2600) / 1000).toFixed(1)}s ·{' '}
                        {(pb.avgTokens || 1500).toLocaleString('vi-VN')} tok
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePlaybookFastTrack(pb.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold shrink-0 cursor-pointer ${
                        pb.allowFastTrack
                          ? 'bg-emerald-600 text-white'
                          : 'border border-slate-300 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>{pb.allowFastTrack ? 'Tăng tốc: BẬT' : 'Tăng tốc: TẮT'}</span>
                    </button>
                  </div>

                  {(pb.dirtyNeedsReview || pb.rolledBackFromVersion) && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-600 dark:text-amber-300 flex items-center justify-between gap-2">
                      <span>
                        {pb.dirtyReason || `Đã tự động rollback từ v${pb.rolledBackFromVersion} do tụt chất lượng.`}
                      </span>
                      {pb.dirtyNeedsReview && (
                        <button
                          type="button"
                          onClick={() => markPlaybookReviewed(pb.id)}
                          className="px-2 py-0.5 rounded bg-amber-600 text-white font-semibold shrink-0 cursor-pointer"
                        >
                          Xác nhận đã rà soát
                        </button>
                      )}
                    </div>
                  )}

                  <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                    {pb.steps.map((st, idx) => (
                      <div key={idx}>{st}</div>
                    ))}
                  </div>
                  {pb.checklist && pb.checklist.length > 0 && (
                    <div className="text-[10.5px] text-slate-500">
                      <strong>Checklist:</strong> {pb.checklist.join(' · ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bộ nhớ Kinh nghiệm & Ý muốn CEO ({experienceMemories.length} bài học)</span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                <select
                  value={expDept}
                  onChange={(e) => setExpDept(e.target.value as DepartmentId)}
                  className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.shortName}
                    </option>
                  ))}
                </select>
                <select
                  value={expSource}
                  onChange={(e) => setExpSource(e.target.value as ExperienceMemoryItem['source'])}
                  className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <option value="ceo_feedback">Ý muốn / Tiêu chuẩn CEO</option>
                  <option value="accepted_deliverable">Đầu ra được duyệt</option>
                  <option value="critic_feedback">Bài học phản biện</option>
                </select>
                <input
                  value={expTags}
                  onChange={(e) => setExpTags(e.target.value)}
                  placeholder="Nhãn (cách nhau dấu phẩy)..."
                  className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="flex gap-1.5">
                <input
                  value={expLesson}
                  onChange={(e) => setExpLesson(e.target.value)}
                  placeholder="Ghi bài học kinh nghiệm hoặc quy tắc CEO muốn / không muốn..."
                  className="flex-1 px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!expLesson.trim()) return;
                    await addExperienceMemory({
                      department: expDept,
                      source: expSource,
                      tags: expTags
                        .split(',')
                        .map((x) => x.trim())
                        .filter(Boolean),
                      lesson: expLesson.trim(),
                    });
                    setExpLesson('');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Lưu bài học</span>
                </button>
              </div>
            </div>
            {experienceMemories.map((m) => (
              <div
                key={m.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px]"
              >
                <div className="text-slate-500 mb-0.5">
                  Phòng {m.department} · <strong>{m.source === 'ceo_feedback' ? 'Ý MUỐN CEO' : m.source}</strong> ·{' '}
                  {m.tags.join(', ')}
                </div>
                <div>{m.lesson}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
