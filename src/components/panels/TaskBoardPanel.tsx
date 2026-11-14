import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, FileText, Plus, RotateCcw } from 'lucide-react';
import { runSingleAgentTurn } from '../../engine/orchestrator';
import { RightPanelTab, useCompanyStore } from '../../store/useCompanyStore';
import { TaskDeliverableLink, TaskPriority, TaskStatus } from '../../types';

const COLUMNS: Array<{ id: TaskStatus; label: string; color: string }> = [
  { id: 'todo', label: 'Cần làm', color: '#64748B' },
  { id: 'in_progress', label: 'Đang làm', color: '#0EA5E9' },
  { id: 'review', label: 'Nghiệm thu', color: '#8B5CF6' },
  { id: 'waiting_approval', label: 'Chờ duyệt', color: '#F59E0B' },
  { id: 'blocked', label: 'Bị chặn / Lỗi', color: '#EF4444' },
  { id: 'done', label: 'Hoàn thành', color: '#10B981' },
];

function deliverableTab(type: TaskDeliverableLink['type']): RightPanelTab {
  if (type === 'doc' || type === 'quote' || type === 'report') return 'docs';
  if (type === 'lead') return 'crm';
  if (type === 'expense') return 'finance';
  if (type === 'post') return 'marketing';
  if (type === 'agent') return 'rbac';
  return 'tasks';
}

export function TaskBoardPanel() {
  const agents = useCompanyStore((s) => s.agents);
  const departments = useCompanyStore((s) => s.departments);
  const tasks = useCompanyStore((s) => s.tasks);
  const putTask = useCompanyStore((s) => s.putTask);
  const moveTaskStatus = useCompanyStore((s) => s.moveTaskStatus);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);

  const activeAgents = useMemo(
    () => agents.filter((a) => a.employmentStatus !== 'archived'),
    [agents]
  );

  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDod, setNewDod] = useState('');
  const [newEta, setNewEta] = useState('5');
  const [newAssignee, setNewAssignee] = useState(activeAgents[0]?.id || 'sales_director');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  const now = Date.now();
  const visibleTasks = tasks.filter((t) => deptFilter === 'all' || t.department === deptFilter);
  const delayedTasks = visibleTasks.filter(
    (t) =>
      t.status !== 'done' &&
      t.status !== 'failed' &&
      ((t.etaAt && now > t.etaAt) || Boolean(t.delayNotified))
  );

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const ag = activeAgents.find((a) => a.id === newAssignee) || activeAgents[0];
    if (!ag) return;
    const tNow = Date.now();
    const etaMins = Math.max(1, Number(newEta) || 5);
    const id = `task_${tNow}`;
    const taskCode = `#T-${101 + tasks.length}`;
    await putTask({
      id,
      taskCode,
      title: newTitle.trim(),
      description: newDesc.trim() || newTitle.trim(),
      definitionOfDone: newDod.trim() || 'Hoàn thành và lưu kết quả thực tế vào hệ thống.',
      expectedDeliverable: 'Tài liệu hoặc dữ liệu thực tế',
      department: ag.department,
      assignedTo: ag.id,
      createdBy: 'ceo',
      status: 'todo',
      priority: newPriority,
      etaMinutes: etaMins,
      etaAt: tNow + etaMins * 60_000,
      progressPercent: 0,
      lastProgressAt: tNow,
      deliverables: [],
      createdAt: tNow,
      updatedAt: tNow,
      dueLabel: `ETA ${etaMins} phút`,
    });
    setNewTitle('');
    setNewDesc('');
    setNewDod('');
    setCreating(false);
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-hidden">
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5"
          >
            <option value="all">Tất cả phòng ban ({tasks.length})</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.shortName}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Giao việc mới</span>
        </button>
      </div>

      {/* BỔ SUNG F: Live Watchdog "Việc đang trễ" Alert Banner */}
      {delayedTasks.length > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs space-y-1.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Việc đang trễ ETA ({delayedTasks.length}) — Watchdog đang giám sát</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {delayedTasks.slice(0, 4).map((dt) => {
              const ag = agents.find((a) => a.id === dt.assignedTo);
              const lateMin = Math.max(1, Math.round((now - dt.etaAt) / 60_000));
              return (
                <div
                  key={dt.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-amber-500/30 text-[11px]"
                >
                  <span className="font-mono-num font-bold text-amber-500">{dt.taskCode}</span>
                  <span className="truncate max-w-[140px]">{ag?.name || dt.assignedTo}</span>
                  <span className="font-mono-num text-rose-500">-{lateMin}p</span>
                  <button
                    type="button"
                    onClick={() =>
                      runSingleAgentTurn(
                        dt.assignedTo,
                        `Kiểm tra gấp & hoàn tất ${dt.taskCode}: ${dt.description || dt.title}`,
                        dt.channelId || dt.department,
                        { resumeTaskId: dt.id }
                      )
                    }
                    className="px-1.5 py-0.5 rounded bg-sky-600 text-white text-[10px] font-semibold cursor-pointer"
                  >
                    Đốc thúc
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {creating && (
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 shrink-0">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Tiêu đề nhiệm vụ..."
            className="w-full text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Mô tả chi tiết..."
            className="w-full text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={newDod}
              onChange={(e) => setNewDod(e.target.value)}
              placeholder="Tiêu chí đạt chuẩn (DoD)..."
              className="col-span-2 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5"
            />
            <input
              type="number"
              value={newEta}
              onChange={(e) => setNewEta(e.target.value)}
              placeholder="ETA (phút)"
              className="text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 font-mono-num"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              className="flex-1 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5"
            >
              {activeAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.title})
                </option>
              ))}
            </select>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              className="text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5"
            >
              <option value="low">Thấp</option>
              <option value="medium">Trung bình</option>
              <option value="high">Cao</option>
              <option value="urgent">Khẩn</option>
            </select>
            <button
              type="button"
              onClick={handleCreate}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
            >
              Lưu
            </button>
          </div>
        </div>
      )}

      {/* Kanban Columns (drag & drop) */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-1">
        <div className="flex gap-2.5 h-full min-w-[960px]">
          {COLUMNS.map((col) => {
            const colTasks = visibleTasks.filter((t) =>
              col.id === 'blocked'
                ? t.status === 'blocked' || t.status === 'failed' || t.status === 'waiting_resume'
                : t.status === col.id
            );
            return (
              <div
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragTaskId) {
                    moveTaskStatus(dragTaskId, col.id);
                    setDragTaskId(null);
                  }
                }}
                className="flex-1 min-w-[165px] flex flex-col rounded-xl bg-slate-100/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-2"
              >
                <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold" style={{ color: col.color }}>
                    {col.label}
                  </span>
                  <span className="text-[11px] font-mono-num text-slate-400">{colTasks.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto pt-2 space-y-2">
                  {colTasks.length === 0 && (
                    <div className="text-[11px] text-slate-400 text-center py-6">Kéo thả task vào đây</div>
                  )}
                  {colTasks.map((t) => {
                    const assignee = agents.find((a) => a.id === t.assignedTo);
                    const isOverdue =
                      t.status !== 'done' &&
                      t.status !== 'failed' &&
                      ((t.etaAt && now > t.etaAt) || Boolean(t.delayNotified));
                    const minsDiff = t.etaAt ? Math.round((t.etaAt - now) / 60_000) : t.etaMinutes;

                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => setDragTaskId(t.id)}
                        className={`p-2.5 rounded-xl bg-white dark:bg-slate-950 border shadow-sm cursor-grab active:cursor-grabbing space-y-1.5 ${
                          isOverdue
                            ? 'border-amber-500/60'
                            : t.status === 'failed'
                            ? 'border-rose-500/50'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <span className="font-mono-num font-bold text-sky-500">{t.taskCode}</span>
                          {t.status !== 'done' && (
                            <span
                              className={`flex items-center gap-0.5 font-mono-num ${
                                isOverdue ? 'text-rose-500 font-bold' : 'text-slate-400'
                              }`}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              {minsDiff < 0 ? `Trễ ${Math.abs(minsDiff)}p` : `~${Math.max(1, minsDiff)}p`}
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-semibold leading-snug">{t.title}</div>

                        {t.definitionOfDone && (
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {t.definitionOfDone}
                          </div>
                        )}

                        {t.failureReason && (
                          <div className="text-[10.5px] text-rose-500 line-clamp-2">
                            Lỗi: {t.failureReason}
                          </div>
                        )}

                        {/* Progress bar */}
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[9.5px] font-mono-num text-slate-400">
                            <span>{t.status}</span>
                            <span>{t.progressPercent}%</span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full transition-all"
                              style={{
                                width: `${Math.min(100, t.progressPercent || 0)}%`,
                                backgroundColor:
                                  t.status === 'done'
                                    ? '#10B981'
                                    : t.status === 'failed'
                                    ? '#EF4444'
                                    : '#0EA5E9',
                              }}
                            />
                          </div>
                        </div>

                        {/* Deliverables */}
                        {t.deliverables && t.deliverables.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {t.deliverables.map((d, idx) => (
                              <button
                                key={`${d.id}_${idx}`}
                                type="button"
                                onClick={() => setActiveTab(deliverableTab(d.type))}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 text-[10px] font-medium cursor-pointer"
                              >
                                <FileText className="w-2.5 h-2.5" />
                                <span className="truncate max-w-[110px]">{d.title}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Quick Actions */}
                        {t.status === 'review' && (
                          <button
                            type="button"
                            onClick={() => moveTaskStatus(t.id, 'done')}
                            className="w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] font-semibold cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Chấp nhận</span>
                          </button>
                        )}
                        {(t.status === 'failed' || t.status === 'waiting_resume' || t.status === 'blocked') && (
                          <button
                            type="button"
                            onClick={() =>
                              runSingleAgentTurn(
                                t.assignedTo,
                                t.description || t.title,
                                t.channelId || t.department,
                                { resumeTaskId: t.id }
                              )
                            }
                            className="w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10.5px] font-semibold cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Chạy lại</span>
                          </button>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
                          <span className="truncate font-medium text-slate-600 dark:text-slate-300">
                            {assignee?.name || t.assignedTo}
                          </span>
                          <span className="uppercase font-mono-num">{t.priority}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

