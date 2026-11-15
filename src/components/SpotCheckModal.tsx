import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  FileText,
  Globe,
  MessageSquare,
  Monitor,
  PauseCircle,
  RefreshCw,
  Shuffle,
  Star,
  Terminal,
  X,
} from 'lucide-react';
import { filterRecentTenMinTimeline } from '../engine/spotCheckEngine';
import { useCompanyStore } from '../store/useCompanyStore';
import { AgentScreenSnapshot, SpotCheckVerdict } from '../types';

function verdictTextColor(v: SpotCheckVerdict): string {
  if (v === 'đúng việc') return 'text-emerald-600 dark:text-emerald-400';
  if (v === 'nhàn rỗi') return 'text-slate-500 dark:text-slate-400';
  if (v === 'lặp' || v === 'lệch việc') return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

export function SpotCheckModal() {
  const activeAgentId = useCompanyStore((s) => s.activeSpotCheckAgentId);
  const openSpotCheck = useCompanyStore((s) => s.openSpotCheck);
  const captureAgentScreen = useCompanyStore((s) => s.captureAgentScreen);
  const recordManualSpotCheck = useCompanyStore((s) => s.recordManualSpotCheck);
  const runRandomSpotCheck = useCompanyStore((s) => s.runRandomSpotCheck);
  const submitSpotCheckReview = useCompanyStore((s) => s.submitSpotCheckReview);
  const setMonitorWallOpen = useCompanyStore((s) => s.setMonitorWallOpen);
  const agents = useCompanyStore((s) => s.agents);
  const spotChecks = useCompanyStore((s) => s.spotChecks);
  const timelineEvents = useCompanyStore((s) => s.timelineEvents);

  const [snapshot, setSnapshot] = useState<AgentScreenSnapshot | null>(null);
  const [sliderIdx, setSliderIdx] = useState<number>(0);
  const [ceoScore, setCeoScore] = useState<number>(5);
  const [ceoNote, setCeoNote] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const activeAgents = useMemo(
    () => agents.filter((a) => a.employmentStatus !== 'archived'),
    [agents]
  );

  const recentTenMin = useMemo(
    () => (activeAgentId ? filterRecentTenMinTimeline(timelineEvents, activeAgentId) : []),
    [timelineEvents, activeAgentId]
  );

  const latestRecord = useMemo(
    () => (activeAgentId ? spotChecks.find((r) => r.agentId === activeAgentId) : undefined),
    [spotChecks, activeAgentId]
  );

  useEffect(() => {
    if (!activeAgentId) {
      setSnapshot(null);
      return;
    }
    const snap = captureAgentScreen(activeAgentId);
    setSnapshot(snap);
    setSliderIdx(Math.max(0, recentTenMin.length - 1));
    setCeoScore(latestRecord?.ceoScore ?? 5);
    setCeoNote(latestRecord?.ceoNote ?? '');
    setFeedbackMsg(null);
  }, [activeAgentId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activeAgentId || !snapshot) return null;

  const selectedTimelineEvt = recentTenMin[sliderIdx] || null;

  const handleRefresh = () => {
    const fresh = captureAgentScreen(activeAgentId);
    if (fresh) setSnapshot(fresh);
    setFeedbackMsg('Đã chụp lại trạng thái mới nhất từ engine.');
  };

  const handleAction = async (action: 'remind' | 'explain' | 'pause' | 'note') => {
    let targetRecordId = latestRecord?.id;
    if (!targetRecordId) {
      const created = await recordManualSpotCheck(activeAgentId, 'ceo');
      targetRecordId = created?.id;
    }
    if (!targetRecordId) return;
    await submitSpotCheckReview({
      recordId: targetRecordId,
      ceoScore,
      ceoNote: ceoNote.trim() || undefined,
      action,
    });
    setFeedbackMsg(
      action === 'pause'
        ? `Đã tạm dừng ${snapshot.agentName} theo kiểm tra bất chợt.`
        : action === 'remind'
        ? `Đã gửi nhắc nhở trực tiếp tới ${snapshot.agentName}.`
        : action === 'explain'
        ? `Đã yêu cầu ${snapshot.agentName} giải trình tiến độ.`
        : 'Đã lưu chấm điểm & nhận xét của CEO.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-5">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Monitor className="w-4 h-4 text-sky-500 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate">
                Kiểm tra Màn hình Làm việc · {snapshot.agentName}
              </h2>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                <span>Phòng {snapshot.department}</span>
                <span>·</span>
                <span className={`font-semibold uppercase ${verdictTextColor(snapshot.verdict)}`}>
                  {snapshot.verdict} ({snapshot.score}/100)
                </span>
                <span>·</span>
                <span className="font-mono-num">
                  Chụp lúc {new Date(snapshot.capturedAt).toLocaleTimeString('vi-VN')}
                </span>
                {snapshot.simulated && (
                  <>
                    <span>·</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      Mô phỏng Sandbox
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={activeAgentId}
              onChange={(e) => openSpotCheck(e.target.value)}
              className="px-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-w-[170px]"
            >
              {activeAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.department})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleRefresh}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Chụp mới</span>
            </button>
            <button
              type="button"
              onClick={() => runRandomSpotCheck('ceo')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Soi ngẫu nhiên</span>
            </button>
            <button
              type="button"
              onClick={() => {
                openSpotCheck(null);
                setMonitorWallOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              Tường GS
            </button>
            <button
              type="button"
              onClick={() => openSpotCheck(null)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Verdict Banner */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {snapshot.verdict === 'đúng việc' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span className="truncate">{snapshot.verdictReason}</span>
          </div>
          <span className="text-[11px] text-slate-500 shrink-0 font-mono-num">
            Tự động che OTP / Mật khẩu / API Key / STK
          </span>
        </div>

        {/* Body: 7 Honest Frames */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs">
          {/* Left 7 cols */}
          <div className="lg:col-span-7 space-y-3">
            {/* Frame (a): Task & ETA */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  a. Tác vụ đang giao & ETA
                </span>
                <span className="font-mono-num text-[11px] text-slate-500">
                  {snapshot.taskInfo.taskCode || 'CHƯA GIAO'} · {snapshot.taskInfo.etaLabel}
                </span>
              </div>
              <div className="font-medium text-sm">{snapshot.taskInfo.title}</div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sky-600 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, snapshot.taskInfo.progressPercent))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-mono-num">
                <span>Trạng thái: {snapshot.taskInfo.status}</span>
                <span>{snapshot.taskInfo.progressPercent}%</span>
              </div>
            </div>

            {/* Frame (b): Playwright Browser Session */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-500" />
                  <span>b. Phiên trình duyệt (/worker Playwright)</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  {snapshot.browserSession.active ? 'Đang mở luồng thật' : 'Không hoạt động'}
                </span>
              </div>
              {snapshot.browserSession.screenshotDataUrl ? (
                <div className="space-y-1">
                  {snapshot.browserSession.url && (
                    <div className="text-[11px] font-mono-num text-slate-500 truncate">
                      URL: {snapshot.browserSession.url}
                    </div>
                  )}
                  <img
                    src={snapshot.browserSession.screenshotDataUrl}
                    alt="Luồng ảnh trình duyệt agent"
                    className="w-full max-h-56 object-contain rounded border border-slate-200 dark:border-slate-800 bg-slate-950"
                  />
                </div>
              ) : (
                <div className="p-3 rounded bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 text-[11px] text-slate-500">
                  {snapshot.browserSession.note}
                </div>
              )}
            </div>

            {/* Frame (c): Active Draft */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  <span>c. Tài liệu / Bài viết / Hợp đồng đang soạn</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  {snapshot.activeDraft?.category || 'Trống'}
                </span>
              </div>
              {snapshot.activeDraft ? (
                <div className="space-y-1">
                  <div className="font-medium">{snapshot.activeDraft.title}</div>
                  <pre className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] whitespace-pre-wrap font-sans text-slate-600 dark:text-slate-300 max-h-28 overflow-y-auto">
                    {snapshot.activeDraft.excerptMasked}
                  </pre>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">Chưa có bản nháp nào gần đây.</div>
              )}
            </div>

            {/* Frame (f): Step-by-step Plan */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold">f. Kế hoạch từng bước & Bước hiện tại</div>
              <div className="space-y-1">
                {snapshot.planSummary.map((st, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 text-[11px]"
                  >
                    <span className="truncate">{st.step}</span>
                    <span
                      className={`font-mono-num shrink-0 ${
                        st.status === 'done'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : st.status === 'running'
                          ? 'text-sky-600 dark:text-sky-400 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      {st.status === 'done' ? 'Xong' : st.status === 'running' ? 'Đang chạy' : 'Chờ'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 cols */}
          <div className="lg:col-span-5 space-y-3">
            {/* Frame (g): Tokens & Cost Today */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="font-semibold">g. Token & Chi phí hôm nay</div>
                  <div className="text-[11px] text-slate-500">Ghi nhận thực tế từ LLM Router</div>
                </div>
              </div>
              <div className="text-right font-mono-num">
                <div className="font-bold text-sm">
                  {snapshot.tokenStatsToday.totalTokens.toLocaleString('vi-VN')} tok
                </div>
                <div className="text-[11px] text-slate-500">
                  ${snapshot.tokenStatsToday.costUsd.toFixed(4)}
                </div>
              </div>
            </div>

            {/* Frame (d): Tool & API Logs */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-sky-500" />
                <span>d. Nhật ký Tool & API (HubCW / RBAC / Device)</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {snapshot.recentToolLogs.length === 0 ? (
                  <div className="text-[11px] text-slate-500">Chưa có lệnh gọi API nào.</div>
                ) : (
                  snapshot.recentToolLogs.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 text-[11px]"
                    >
                      <span className="truncate font-mono-num">
                        [{l.source}] {l.summaryMasked}
                      </span>
                      <span className="shrink-0 text-slate-500 font-mono-num">
                        {new Date(l.timestamp).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Frame (e): Live Dialogue */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                <span>e. Hội thoại đang diễn ra (đã che PII)</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {snapshot.liveDialogue.length === 0 ? (
                  <div className="text-[11px] text-slate-500">Chưa có tin nhắn gần đây.</div>
                ) : (
                  snapshot.liveDialogue.map((d) => (
                    <div key={d.id} className="p-2 rounded bg-slate-50 dark:bg-slate-950 text-[11px]">
                      <div className="flex justify-between text-slate-500 mb-0.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{d.senderName}</span>
                        <span className="font-mono-num">{new Date(d.timestamp).toLocaleTimeString('vi-VN')}</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300 break-words">{d.excerptMasked}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 10-Minute Timeline Rewind Slider */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Tua lại 10 phút gần nhất</span>
                <span className="font-mono-num text-[11px] text-slate-500">
                  {recentTenMin.length} sự kiện
                </span>
              </div>
              {recentTenMin.length > 0 ? (
                <>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, recentTenMin.length - 1)}
                    value={Math.min(sliderIdx, recentTenMin.length - 1)}
                    onChange={(e) => setSliderIdx(Number(e.target.value))}
                    className="w-full accent-sky-600"
                  />
                  {selectedTimelineEvt && (
                    <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 text-[11px] space-y-0.5">
                      <div className="flex justify-between font-semibold">
                        <span className="truncate">{selectedTimelineEvt.stepLabel}</span>
                        <span className="font-mono-num text-slate-500 shrink-0">
                          {new Date(selectedTimelineEvt.timestamp).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                      <div className="text-slate-500">{selectedTimelineEvt.detailMasked}</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[11px] text-slate-500">Chưa có sự kiện nào trong 10 phút qua.</div>
              )}
            </div>

            {/* CEO Score & Action */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Đánh giá & Xử lý của CEO</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCeoScore(n)}
                      className="p-0.5 cursor-pointer"
                      title={`Chấm ${n} sao`}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          n <= ceoScore ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={ceoNote}
                onChange={(e) => setCeoNote(e.target.value)}
                placeholder="Ghi chú nhắc nhở / yêu cầu giải trình cho nhân sự..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAction('remind')}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Nhắc nhở
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('explain')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Yêu cầu giải trình
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('pause')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Tạm dừng</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('note')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Lưu điểm
                </button>
              </div>
              {feedbackMsg && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {feedbackMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
