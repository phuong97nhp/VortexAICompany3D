import { useEffect, useState } from 'react';
import { Clock, Hand, MessageSquare, Send, Users, Volume2, X } from 'lucide-react';
import { useCompanyStore } from '../store/useCompanyStore';

export function DigitalMeetingModal() {
  const activeMeetingId = useCompanyStore((s) => s.activeMeetingId);
  const voiceMeetings = useCompanyStore((s) => s.voiceMeetings);
  const agents = useCompanyStore((s) => s.agents);
  const tasks = useCompanyStore((s) => s.tasks);
  const leads = useCompanyStore((s) => s.leads);
  const appendMeetingTurn = useCompanyStore((s) => s.appendMeetingTurn);
  const toggleRaiseHandInMeeting = useCompanyStore((s) => s.toggleRaiseHandInMeeting);
  const endVoiceMeeting = useCompanyStore((s) => s.endVoiceMeeting);
  const speakAsAgent = useCompanyStore((s) => s.speakAsAgent);

  const [ceoMessage, setCeoMessage] = useState('');
  const [saveTranscript, setSaveTranscript] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);

  const session = voiceMeetings.find((m) => m.id === activeMeetingId);

  useEffect(() => {
    if (!session || session.status !== 'active') return;
    setSaveTranscript(session.recordTranscriptOptIn);
    const updateClock = () => {
      if (!session.endsAt) {
        setSecondsLeft(Math.max(0, Math.round((Date.now() - session.startedAt) / 1000)));
      } else {
        setSecondsLeft(Math.max(0, Math.round((session.endsAt - Date.now()) / 1000)));
      }
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [session?.id, session?.endsAt, session?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) return null;

  const participants = session.participantIds
    .map((id) => agents.find((a) => a.id === id))
    .filter(Boolean);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const handleCeoSpeak = async () => {
    const clean = ceoMessage.trim();
    if (!clean) return;
    setCeoMessage('');
    await appendMeetingTurn({
      meetingId: session.id,
      speakerId: 'ceo',
      speakerName: 'Chủ tịch / CEO',
      speakerTitle: 'Người chủ trì',
      text: clean,
      speakAudio: false,
    });
  };

  const handleInviteAgentTurn = async (agentId: string) => {
    const ag = agents.find((a) => a.id === agentId);
    if (!ag) return;
    const deptTasks = tasks.filter((t) => t.assignedTo === ag.id && t.status !== 'done').length;
    const hotLeads = leads.filter((l) => l.stage === 'demo' || l.stage === 'proposal').length;
    const lastCeoTurn = [...session.turns].reverse().find((t) => t.speakerId === 'ceo')?.text;

    const text = lastCeoTurn
      ? `Dạ thưa Chủ tịch về vấn đề "${lastCeoTurn.slice(0, 60)}", phòng ${ag.department} hiện có ${deptTasks} việc đang xử lý và ${hotLeads} cơ hội đang theo sát. Em đề xuất bám sát KPI và xin ý kiến duyệt bước tiếp theo ạ.`
      : `Báo cáo Chủ tịch: ${ag.name} (${ag.title}) hiện đang phụ trách ${deptTasks} đầu việc mở tại phòng ${ag.department}, sẵn sàng điều phối theo chỉ đạo của Chủ tịch ạ.`;

    await appendMeetingTurn({
      meetingId: session.id,
      speakerId: ag.id,
      speakerName: ag.name,
      speakerTitle: ag.title,
      text,
      speakAudio: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-6">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 text-sky-500 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate">{session.title}</h2>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>Điều phối: Thư ký CEO</span>
                <span>·</span>
                <span>{participants.length} thành viên tại Phòng họp 3D</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono-num">
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              <span>
                {session.isQuickFiveMin ? `Còn ${mm}:${ss}` : `Thời lượng ${mm}:${ss}`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => endVoiceMeeting(session.id, saveTranscript)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
            >
              Kết thúc họp
            </button>
            <button
              type="button"
              onClick={() => endVoiceMeeting(session.id, saveTranscript)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Đóng phòng họp"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Participants Roster */}
          <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-3 overflow-y-auto space-y-2">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Thành viên tham dự (Giới hạn {session.maxTurnsPerAgent} lượt/người)
            </div>
            {participants.map((ag) => {
              if (!ag) return null;
              const raised = session.handRaisedAgentIds.includes(ag.id);
              const speaking = session.currentSpeakerId === ag.id;
              return (
                <div
                  key={ag.id}
                  className={`p-2 rounded-lg border text-xs space-y-1.5 ${
                    speaking
                      ? 'border-sky-500 bg-sky-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{ag.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{ag.title}</div>
                    </div>
                    {raised && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold shrink-0 flex items-center gap-0.5">
                        <Hand className="w-3 h-3" />
                        Giơ tay
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleInviteAgentTurn(ag.id)}
                      className="flex-1 py-1 px-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-medium cursor-pointer"
                    >
                      Mời phát biểu
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRaiseHandInMeeting(session.id, ag.id)}
                      className="py-1 px-2 rounded border border-slate-300 dark:border-slate-700 text-[11px] cursor-pointer"
                      title="Bật/tắt giơ tay"
                    >
                      <Hand className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Transcript */}
          <div className="md:col-span-8 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {session.turns.map((turn) => (
                <div
                  key={turn.id}
                  className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                    turn.speakerId === 'ceo'
                      ? 'bg-sky-600/10 border-sky-500/30 ml-6'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 mr-6'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {turn.speakerName}{' '}
                      <span className="font-normal text-slate-500">· {turn.speakerTitle}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10.5px] text-slate-500 font-mono-num">
                        {new Date(turn.timestamp).toLocaleTimeString('vi-VN')}
                      </span>
                      {turn.speakerId !== 'ceo' && (
                        <button
                          type="button"
                          onClick={() => speakAsAgent(turn.speakerId, turn.text)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                          title="Đọc lại phát biểu"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-sky-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{turn.text}</p>
                </div>
              ))}
            </div>

            {/* Footer Controls */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex gap-2">
                <input
                  value={ceoMessage}
                  onChange={(e) => setCeoMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCeoSpeak()}
                  placeholder="Chủ tịch nhập chỉ đạo hoặc đặt câu hỏi cho cuộc họp..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleCeoSpeak}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Phát biểu</span>
                </button>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveTranscript}
                  onChange={(e) => setSaveTranscript(e.target.checked)}
                  className="accent-sky-600"
                />
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>Lưu biên bản cuộc họp vào Kho tài liệu sau khi kết thúc (Opt-in)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
