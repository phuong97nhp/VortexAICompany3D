import { useState } from 'react';
import { getAgentById } from '../../agents';
import { executeAgentTool } from '../../engine/tools';
import { useCompanyStore } from '../../store/useCompanyStore';

export function ApprovalsPanel() {
  const approvals = useCompanyStore((s) => s.approvals);
  const resolveApproval = useCompanyStore((s) => s.resolveApproval);
  const askCeoQuestions = useCompanyStore((s) => s.askCeoQuestions);
  const answerAskCeo = useCompanyStore((s) => s.answerAskCeo);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [askInputs, setAskInputs] = useState<Record<string, string>>({});

  return (
    <div className="flex flex-col h-full p-3 gap-4 overflow-y-auto">
      {/* Hỏi CEO qua Zalo Section */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold">Kênh Hỏi CEO (Web & Zalo OA)</h3>
          <button
            type="button"
            onClick={() =>
              executeAgentTool('account_provisioning', 'create_account', {
                platform: 'Zalo OA Business',
                simulateCaptcha: true,
              })
            }
            className="px-2.5 py-1 rounded-lg bg-rose-600/15 text-rose-500 border border-rose-500/30 text-[11px] font-semibold cursor-pointer"
          >
            Thử giả lập Agent gặp CAPTCHA
          </button>
        </div>

        {askCeoQuestions.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            Chưa có câu hỏi nào từ Agent. Khi agent gặp CAPTCHA/OTP hoặc cần quyết định, câu hỏi sẽ hiện tại đây và gửi sang Zalo.
          </div>
        ) : (
          askCeoQuestions.map((q) => {
            const ag = getAgentById(q.agentId);
            return (
              <div
                key={q.id}
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-rose-500/30 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">
                    #{q.id} · {ag?.name || q.agentId} ({ag?.title})
                  </span>
                  <span
                    className={`font-semibold text-[11px] ${
                      q.status === 'answered' ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {q.status === 'answered' ? `Đã trả lời (${q.answeredVia})` : 'Đang chờ CEO'}
                  </span>
                </div>
                <div className="text-xs font-medium">{q.question}</div>
                {q.context && <div className="text-[11px] text-slate-400">{q.context}</div>}
                {q.status === 'answered' ? (
                  <div className="text-xs text-emerald-500 font-semibold">Câu trả lời: {q.answer}</div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => answerAskCeo(q.id, opt, 'web')}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 hover:bg-sky-600 hover:text-white text-[11px] cursor-pointer"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={askInputs[q.id] || ''}
                        onChange={(e) => setAskInputs((p) => ({ ...p, [q.id]: e.target.value }))}
                        placeholder="Nhập câu trả lời trực tiếp..."
                        className="flex-1 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const v = askInputs[q.id]?.trim();
                          if (v) answerAskCeo(q.id, v, 'web');
                        }}
                        className="px-3 py-1 rounded-lg bg-sky-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Gửi
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Approvals Queue */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold">Danh sách Phê duyệt ({approvals.length})</h3>
        {approvals.map((apr) => {
          const ag = getAgentById(apr.requestedBy);
          return (
            <div
              key={apr.id}
              className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold">{apr.title}</div>
                  <div className="text-[11px] text-slate-400">
                    Đề xuất bởi: {ag?.name || apr.requestedBy} · Loại: {apr.type}
                    {apr.amountVnd ? ` · Giá trị: ${apr.amountVnd.toLocaleString('vi-VN')}đ` : ''}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold ${
                    apr.status === 'pending'
                      ? 'text-amber-500'
                      : apr.status === 'rejected'
                      ? 'text-rose-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {apr.status === 'pending'
                    ? 'Chờ duyệt'
                    : apr.status === 'approved'
                    ? 'Đã duyệt'
                    : apr.status === 'edited'
                    ? 'Sửa & Duyệt'
                    : 'Từ chối'}
                </span>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300">{apr.description}</div>

              {apr.status === 'pending' ? (
                <div className="space-y-2 pt-1">
                  <input
                    type="text"
                    value={noteInputs[apr.id] || ''}
                    onChange={(e) => setNoteInputs((p) => ({ ...p, [apr.id]: e.target.value }))}
                    placeholder="Ghi chú của CEO (tuỳ chọn khi sửa/từ chối)..."
                    className="w-full text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => resolveApproval(apr.id, 'approved', noteInputs[apr.id])}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        resolveApproval(apr.id, 'edited', noteInputs[apr.id] || 'Điều chỉnh theo định mức chuẩn')
                      }
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Sửa rồi duyệt
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveApproval(apr.id, 'rejected', noteInputs[apr.id] || 'Chưa duyệt')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ) : (
                apr.ceoNote && <div className="text-[11px] text-slate-400">Ghi chú CEO: {apr.ceoNote}</div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
