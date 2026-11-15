import { useRef, useState } from 'react';
import { CalendarClock, Hand, Mic, MicOff, PhoneCall, Send, Square, Users } from 'lucide-react';
import { useCompanyStore } from '../store/useCompanyStore';

interface SpeechRecLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function VoiceMeetingBar() {
  const voiceSpeakingAgentId = useCompanyStore((s) => s.voiceSpeakingAgentId);
  const currentSubtitle = useCompanyStore((s) => s.currentSubtitle);
  const stopSpeakingNow = useCompanyStore((s) => s.stopSpeakingNow);
  const handleCeoVoiceTranscript = useCompanyStore((s) => s.handleCeoVoiceTranscript);
  const startVoiceMeeting = useCompanyStore((s) => s.startVoiceMeeting);
  const meetingRequests = useCompanyStore((s) => s.meetingRequests);
  const respondMeetingRequest = useCompanyStore((s) => s.respondMeetingRequest);

  const [listening, setListening] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const recRef = useRef<SpeechRecLike | null>(null);

  const pendingReq = meetingRequests.find((r) => r.status === 'pending');

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecLike;
      webkitSpeechRecognition?: new () => SpeechRecLike;
    };
    const Ctor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Ctor) {
      setStatusNote('Trình duyệt chưa hỗ trợ Web Speech API — vui lòng gõ lệnh thoại bên cạnh.');
      return;
    }
    const rec = new Ctor();
    rec.lang = 'vi-VN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = async (ev) => {
      const transcript = ev.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        setVoiceInput(transcript);
        const reply = await handleCeoVoiceTranscript(transcript);
        setStatusNote(reply);
      }
    };
    rec.onerror = () => {
      setListening(false);
      setStatusNote('Không thu được micro — kiểm tra quyền micro hoặc nhập lệnh chữ.');
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    setStatusNote('Đang nghe lệnh thoại Tiếng Việt...');
    rec.start();
  };

  const submitCommand = async () => {
    const clean = voiceInput.trim();
    if (!clean) return;
    setVoiceInput('');
    const reply = await handleCeoVoiceTranscript(clean);
    setStatusNote(reply);
  };

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex flex-col items-center gap-2">
      {/* Live Speaking Subtitle + Barge-in */}
      {(voiceSpeakingAgentId || currentSubtitle) && (
        <div className="pointer-events-auto max-w-2xl w-full rounded-xl bg-slate-950/90 border border-sky-500/40 px-3.5 py-2 text-xs text-slate-100 shadow-xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="font-semibold text-sky-400 mr-1.5">
              {currentSubtitle?.speakerName || voiceSpeakingAgentId}:
            </span>
            <span className="text-slate-200">{currentSubtitle?.text}</span>
          </div>
          <button
            type="button"
            onClick={stopSpeakingNow}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Square className="w-3 h-3" />
            <span>Dừng đọc ngay</span>
          </button>
        </div>
      )}

      {/* Agent Meeting Request Banner */}
      {pendingReq && (
        <div className="pointer-events-auto max-w-xl w-full rounded-xl bg-white/95 dark:bg-slate-900/95 border border-amber-500/40 px-3 py-2 text-xs shadow-xl flex flex-wrap items-center justify-between gap-2 text-slate-900 dark:text-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <Hand className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="truncate">
              <strong>{pendingReq.agentName}</strong> xin gặp mặt: "{pendingReq.topic}"
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => respondMeetingRequest(pendingReq.id, 'accepted')}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold whitespace-nowrap cursor-pointer"
            >
              Mở phòng họp
            </button>
            <button
              type="button"
              onClick={() => respondMeetingRequest(pendingReq.id, 'snoozed')}
              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] whitespace-nowrap cursor-pointer"
            >
              Hoãn
            </button>
            <button
              type="button"
              onClick={() => respondMeetingRequest(pendingReq.id, 'declined')}
              className="px-2 py-1 rounded-lg border border-rose-500/40 text-rose-500 text-[11px] whitespace-nowrap cursor-pointer"
            >
              Từ chối
            </button>
          </div>
        </div>
      )}

      {/* Compact Voice Command & Quick Meeting Strip */}
      <div className="pointer-events-auto rounded-xl bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 shadow-lg flex flex-wrap items-center gap-1.5 text-xs text-slate-900 dark:text-slate-100 max-w-3xl">
        <button
          type="button"
          onClick={toggleMic}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
            listening ? 'bg-rose-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
          }`}
          title="Nói lệnh Tiếng Việt (vd: Gọi Thư ký, Báo cáo hôm nay, Họp với phòng Marketing)"
        >
          {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          <span>{listening ? 'Đang nghe' : 'Nói CEO'}</span>
        </button>

        <input
          value={voiceInput}
          onChange={(e) => setVoiceInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitCommand()}
          placeholder='Lệnh thoại: "Gọi Thư ký", "Họp với phòng Sales", "Báo cáo hôm nay"...'
          className="w-56 sm:w-72 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs outline-none"
        />

        <button
          type="button"
          onClick={submitCommand}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          title="Thực thi lệnh thoại"
        >
          <Send className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => handleCeoVoiceTranscript('Gọi Thư ký')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer"
        >
          <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
          <span>Gọi Thư ký</span>
        </button>

        <button
          type="button"
          onClick={() =>
            startVoiceMeeting({
              title: 'Họp nhanh Điều hành 5 phút',
              participantIds: ['coo', 'cmo', 'sales_director', 'aff_manager'],
              isQuickFiveMin: true,
            })
          }
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer"
        >
          <CalendarClock className="w-3.5 h-3.5 text-sky-500" />
          <span>Họp nhanh 5p</span>
        </button>

        <button
          type="button"
          onClick={() =>
            startVoiceMeeting({
              title: 'Hội đồng Chiến lược Liên phòng ban',
              participantIds: ['coo', 'cmo', 'sales_director', 'legal', 'cfo'],
              isQuickFiveMin: false,
            })
          }
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-indigo-500" />
          <span>Phòng họp</span>
        </button>

        {statusNote && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs px-1">
            {statusNote}
          </span>
        )}
      </div>
    </div>
  );
}
