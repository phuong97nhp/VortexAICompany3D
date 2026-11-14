import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AGENTS, getAgentById } from '../../agents';
import { DEPARTMENTS } from '../../config/departments';
import { useCompanyStore } from '../../store/useCompanyStore';
import { TaskPriority, TaskStatus } from '../../types';

const COLUMNS: Array<{ id: TaskStatus; label: string; color: string }> = [
  { id: 'todo', label: 'Cần làm', color: '#64748B' },
  { id: 'in_progress', label: 'Đang làm', color: '#0EA5E9' },
  { id: 'waiting_approval', label: 'Chờ duyệt', color: '#F59E0B' },
  { id: 'blocked', label: 'Bị chặn', color: '#EF4444' },
  { id: 'done', label: 'Hoàn thành', color: '#10B981' },
];

export function TaskBoardPanel() {
  const tasks = useCompanyStore((s) => s.tasks);
  const putTask = useCompanyStore((s) => s.putTask);
  const moveTaskStatus = useCompanyStore((s) => s.moveTaskStatus);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAssignee, setNewAssignee] = useState('sales_director');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  const visibleTasks = tasks.filter((t) => deptFilter === 'all' || t.department === deptFilter);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const ag = getAgentById(newAssignee) || AGENTS[0];
    const now = Date.now();
    await putTask({
      id: `task_${now}`,
      title: newTitle.trim(),
      description: newDesc.trim(),
      department: ag.department,
      assignedTo: ag.id,
      createdBy: 'ceo',
      status: 'todo',
      priority: newPriority,
      createdAt: now,
      updatedAt: now,
      dueLabel: 'CEO giao',
    });
    setNewTitle('');
    setNewDesc('');
    setCreating(false);
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5"
          >
            <option value="all">Tất cả phòng ban ({tasks.length})</option>
            {Object.values(DEPARTMENTS).map((d) => (
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

      {creating && (
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
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
          <div className="flex items-center gap-2">
            <select
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              className="flex-1 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5"
            >
              {AGENTS.map((a) => (
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
        <div className="flex gap-2.5 h-full min-w-[780px]">
          {COLUMNS.map((col) => {
            const colTasks = visibleTasks.filter((t) => t.status === col.id);
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
                    const assignee = getAgentById(t.assignedTo);
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => setDragTaskId(t.id)}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm cursor-grab active:cursor-grabbing space-y-1.5"
                      >
                        <div className="text-xs font-semibold leading-snug">{t.title}</div>
                        {t.description && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {t.description}
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
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
