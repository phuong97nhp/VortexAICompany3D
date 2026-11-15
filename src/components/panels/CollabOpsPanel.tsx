import { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  GitBranch,
  Play,
  Scale,
  Search,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { evaluateHandoverSlaMetrics } from '../../engine/collaborationEngine';
import { useCompanyStore } from '../../store/useCompanyStore';
import { DepartmentId } from '../../types';

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

  const repoEvaluations = useCompanyStore((s) => s.repoEvaluations);
  const scoutGitRepo = useCompanyStore((s) => s.scoutGitRepo);
  const runSandboxTestOnRepo = useCompanyStore((s) => s.runSandboxTestOnRepo);

  const playbooks = useCompanyStore((s) => s.playbooks);
  const togglePlaybookFastTrack = useCompanyStore((s) => s.togglePlaybookFastTrack);
  const experienceMemories = useCompanyStore((s) => s.experienceMemories);

  const departments = useCompanyStore((s) => s.departments);
  const agents = useCompanyStore((s) => s.agents);

  const [subTab, setSubTab] = useState<SubTab>('quality');

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

  const slaStats = useMemo(() => evaluateHandoverSlaMetrics(handoverTickets), [handoverTickets]);

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
          <div className="grid grid-cols-3 gap-2 font-mono-num">
            <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-[10.5px] text-slate-500">Tổng phiếu #BG</div>
              <div className="text-sm font-bold">{slaStats.total}</div>
            </div>
            <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-[10.5px] text-slate-500">Đúng SLA</div>
              <div className="text-sm font-bold text-emerald-500">{slaStats.onTimeRate}%</div>
            </div>
            <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-[10.5px] text-slate-500">Tỷ lệ trả lại</div>
              <div className="text-sm font-bold text-amber-500">{slaStats.bounceRate}%</div>
            </div>
          </div>

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
              <span>Phòng Kỹ thuật Tìm & Thử nghiệm Repo Git (Chỉ chạy khi CEO yêu cầu)</span>
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
          </div>

          {repoEvaluations.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
              Chưa tìm repo nào. Gõ từ khóa hoặc nhắn chat "tìm repo..." để Tech Lead quét License & bảo mật.
            </div>
          ) : (
            repoEvaluations.map((rep) => (
              <div
                key={rep.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{rep.repoFullName}</div>
                    <div className="text-[11px] text-slate-500 font-mono-num">
                      ★ {rep.stars} · License: {rep.license} · Cập nhật: {rep.lastUpdated}
                    </div>
                  </div>
                  <span
                    className={`font-mono-num text-[11px] font-bold shrink-0 ${
                      rep.verificationLabel === 'ĐÃ CHẠY SANDBOX' ? 'text-emerald-500' : 'text-amber-500'
                    }`}
                  >
                    {rep.verificationLabel}
                  </span>
                </div>
                {rep.securityFlags.length > 0 && (
                  <div className="text-[11px] text-rose-500">
                    Cảnh báo: {rep.securityFlags.join(' | ')}
                  </div>
                )}
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 text-[11px] font-mono-num text-slate-600 dark:text-slate-300">
                  {rep.stdoutExcerpt}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 truncate">{rep.recommendation}</span>
                  <button
                    type="button"
                    onClick={() => runSandboxTestOnRepo(rep.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>Thử Docker Sandbox</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUBTAB 4: PLAYBOOK LIBRARY & EXPERIENCE MEMORY (W) */}
      {subTab === 'playbooks' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="space-y-2">
            {playbooks.map((pb) => (
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
                      Phòng {pb.department} · Điểm TB {pb.avgQualityScore}/100 · Thành công {pb.successCount} / Lỗi{' '}
                      {pb.failureCount}
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
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-600 dark:text-amber-300">
                    {pb.dirtyReason || `Đã tự động rollback từ v${pb.rolledBackFromVersion} do tụt chất lượng.`}
                  </div>
                )}

                <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                  {pb.steps.map((st, idx) => (
                    <div key={idx}>{st}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bộ nhớ Kinh nghiệm ({experienceMemories.length} bài học)</span>
            </div>
            {experienceMemories.map((m) => (
              <div
                key={m.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px]"
              >
                <div className="text-slate-500 mb-0.5">
                  Phòng {m.department} · {m.tags.join(', ')}
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
