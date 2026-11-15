import { AgentProfile, AgentVoiceProfile, VoiceProviderId, VoiceTimbreStyle } from '../types';

export interface SpeakOptions {
  text: string;
  voiceProfile?: AgentVoiceProfile;
  agentId?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
}

export interface IVoiceProvider {
  id: VoiceProviderId;
  label: string;
  isSupported(): boolean;
  speak(opts: SpeakOptions): Promise<void>;
  stop(): void;
}

let activeAudioElement: HTMLAudioElement | null = null;
let currentSpeakingAgentId: string | null = null;
const speakingListeners = new Set<(agentId: string | null) => void>();

export function subscribeSpeakingAgent(fn: (agentId: string | null) => void): () => void {
  speakingListeners.add(fn);
  return () => {
    speakingListeners.delete(fn);
  };
}

export function getCurrentSpeakingAgentId(): string | null {
  return currentSpeakingAgentId;
}

export function setCurrentSpeakingAgentId(agentId: string | null) {
  currentSpeakingAgentId = agentId;
  for (const fn of speakingListeners) {
    try {
      fn(agentId);
    } catch {
      // ignore
    }
  }
}

export function stopAllVoicePlayback() {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.src = '';
    } catch {
      // ignore
    }
    activeAudioElement = null;
  }
  setCurrentSpeakingAgentId(null);
}

export class WebSpeechVoiceProvider implements IVoiceProvider {
  id: VoiceProviderId = 'web_speech';
  label = 'Trình duyệt (Web Speech API - Miễn phí)';

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  async speak(opts: SpeakOptions): Promise<void> {
    if (!this.isSupported()) {
      opts.onError?.('Trình duyệt không hỗ trợ SpeechSynthesis.');
      return;
    }
    stopAllVoicePlayback();
    const cleanText = opts.text.replace(/[*#_`]/g, '').slice(0, 600);
    return new Promise((resolve) => {
      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.lang = opts.voiceProfile?.lang || 'vi-VN';
      utter.pitch = opts.voiceProfile?.pitch ?? 1.0;
      utter.rate = opts.voiceProfile?.rate ?? 1.02;

      const voices = window.speechSynthesis.getVoices();
      const matched =
        voices.find((v) => v.name === opts.voiceProfile?.voiceName) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('vi')) ||
        voices[0];
      if (matched) utter.voice = matched;

      utter.onstart = () => {
        if (opts.agentId) setCurrentSpeakingAgentId(opts.agentId);
        opts.onStart?.();
      };
      utter.onend = () => {
        setCurrentSpeakingAgentId(null);
        opts.onEnd?.();
        resolve();
      };
      utter.onerror = () => {
        setCurrentSpeakingAgentId(null);
        opts.onEnd?.();
        resolve();
      };

      try {
        window.speechSynthesis.speak(utter);
      } catch (err) {
        setCurrentSpeakingAgentId(null);
        opts.onError?.(err instanceof Error ? err.message : 'Lỗi phát giọng nói');
        resolve();
      }
    });
  }

  stop() {
    stopAllVoicePlayback();
  }
}

export class GeminiTtsVoiceProvider implements IVoiceProvider {
  id: VoiceProviderId = 'gemini_tts';
  label = 'Gemini TTS (Chất lượng cao, qua server /api/voice/gemini-tts)';

  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof fetch === 'function';
  }

  async speak(opts: SpeakOptions): Promise<void> {
    stopAllVoicePlayback();
    const cleanText = opts.text.replace(/[*#_`]/g, '').slice(0, 500);
    try {
      const res = await fetch('/api/voice/gemini-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voiceName: opts.voiceProfile?.geminiVoiceName || (opts.voiceProfile?.gender === 'male' ? 'Puck' : 'Kore'),
          style: opts.voiceProfile?.timbre || 'warm',
        }),
      });
      if (!res.ok) {
        // Graceful fallback to browser Web Speech if Gemini TTS fails
        await new WebSpeechVoiceProvider().speak(opts);
        return;
      }
      const data = (await res.json()) as { ok?: boolean; audioBase64?: string; mimeType?: string };
      if (!data.ok || !data.audioBase64) {
        await new WebSpeechVoiceProvider().speak(opts);
        return;
      }
      await new Promise<void>((resolve) => {
        const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
        activeAudioElement = audio;
        audio.onplay = () => {
          if (opts.agentId) setCurrentSpeakingAgentId(opts.agentId);
          opts.onStart?.();
        };
        audio.onended = () => {
          activeAudioElement = null;
          setCurrentSpeakingAgentId(null);
          opts.onEnd?.();
          resolve();
        };
        audio.onerror = () => {
          activeAudioElement = null;
          setCurrentSpeakingAgentId(null);
          opts.onEnd?.();
          resolve();
        };
        audio.play().catch(() => {
          new WebSpeechVoiceProvider().speak(opts).then(resolve);
        });
      });
    } catch {
      await new WebSpeechVoiceProvider().speak(opts);
    }
  }

  stop() {
    stopAllVoicePlayback();
  }
}

export class TextOnlyVoiceProvider implements IVoiceProvider {
  id: VoiceProviderId = 'text_only';
  label = 'Chỉ văn bản + phụ đề (Tắt phát âm)';

  isSupported(): boolean {
    return true;
  }

  async speak(opts: SpeakOptions): Promise<void> {
    if (opts.agentId) setCurrentSpeakingAgentId(opts.agentId);
    opts.onStart?.();
    await new Promise((r) => setTimeout(r, Math.min(2200, Math.max(600, opts.text.length * 18))));
    setCurrentSpeakingAgentId(null);
    opts.onEnd?.();
  }

  stop() {
    setCurrentSpeakingAgentId(null);
  }
}

export function createVoiceProvider(id: VoiceProviderId): IVoiceProvider {
  if (id === 'gemini_tts') return new GeminiTtsVoiceProvider();
  if (id === 'text_only') return new TextOnlyVoiceProvider();
  return new WebSpeechVoiceProvider();
}

const TIMBRE_CYCLE: VoiceTimbreStyle[] = ['warm', 'crisp', 'energetic', 'calm', 'authoritative'];
const GEMINI_FEMALE: Array<'Kore' | 'Zephyr'> = ['Kore', 'Zephyr'];
const GEMINI_MALE: Array<'Puck' | 'Charon' | 'Fenrir'> = ['Puck', 'Charon', 'Fenrir'];

/**
 * Auto-proposes a distinct voice profile for any newly hired or existing agent,
 * avoiding exact (voiceName + pitch + rate) collisions with existing roster.
 */
export function proposeUniqueVoiceForAgent(
  agent: Pick<AgentProfile, 'id' | 'name' | 'gender' | 'role'>,
  existingAgents: AgentProfile[],
  browserVoices: SpeechSynthesisVoice[] = []
): AgentVoiceProfile {
  const gender: 'female' | 'male' = agent.gender === 'male' ? 'male' : 'female';
  const viVoices = browserVoices.filter((v) => v.lang.toLowerCase().startsWith('vi'));
  const pool = viVoices.length > 0 ? viVoices : browserVoices;

  const usedSignatures = new Set(
    existingAgents
      .filter((a) => a.id !== agent.id && a.voiceProfile)
      .map((a) => `${a.voiceProfile!.voiceName}|${a.voiceProfile!.pitch}|${a.voiceProfile!.rate}`)
  );

  let idx = existingAgents.length;
  for (let i = 0; i < agent.id.length; i++) idx += agent.id.charCodeAt(i);

  const pitchCandidates = gender === 'female' ? [1.06, 1.14, 0.98, 1.2, 1.02] : [0.88, 0.94, 0.82, 1.0, 0.91];
  const rateCandidates = [1.0, 1.06, 0.95, 1.12, 0.92];

  for (let attempt = 0; attempt < 25; attempt++) {
    const v = pool.length > 0 ? pool[(idx + attempt) % pool.length] : undefined;
    const pitch = pitchCandidates[(idx + attempt) % pitchCandidates.length];
    const rate = rateCandidates[(Math.floor((idx + attempt) / 2)) % rateCandidates.length];
    const voiceName = v?.name || (gender === 'female' ? 'Google Tiếng Việt (Nữ)' : 'Google Tiếng Việt (Nam)');
    const sig = `${voiceName}|${pitch}|${rate}`;
    if (!usedSignatures.has(sig) || attempt === 24) {
      return {
        voiceId: v?.voiceURI || `vi_${gender}_${(idx + attempt) % 10}`,
        voiceName,
        lang: v?.lang || 'vi-VN',
        gender,
        pitch,
        rate,
        timbre: agent.role === 'Exec' || agent.role === 'CEO' ? 'authoritative' : TIMBRE_CYCLE[(idx + attempt) % TIMBRE_CYCLE.length],
        geminiVoiceName:
          gender === 'female'
            ? GEMINI_FEMALE[(idx + attempt) % GEMINI_FEMALE.length]
            : GEMINI_MALE[(idx + attempt) % GEMINI_MALE.length],
      };
    }
  }

  return {
    voiceId: 'vi_default',
    voiceName: 'vi-VN Default',
    lang: 'vi-VN',
    gender,
    pitch: gender === 'female' ? 1.08 : 0.9,
    rate: 1.0,
    timbre: 'warm',
    geminiVoiceName: gender === 'female' ? 'Kore' : 'Puck',
  };
}

export type CeoVoiceIntent =
  | { type: 'call_secretary' }
  | { type: 'call_meeting'; departmentQuery: string }
  | { type: 'daily_report' }
  | { type: 'spot_check_random' }
  | { type: 'kill_switch' }
  | { type: 'chat_instruction'; text: string };

export function parseCeoVoiceCommand(transcript: string): CeoVoiceIntent {
  const lower = transcript.toLowerCase().trim();
  if (/dừng khẩn cấp|kill switch|ngưng toàn bộ/.test(lower)) {
    return { type: 'kill_switch' };
  }
  if (/kiểm tra bất chợt|soi màn hình|xem màn hình ngẫu nhiên/.test(lower)) {
    return { type: 'spot_check_random' };
  }
  if (/gọi thư ký|thư ký vào phòng|gặp thư ký/.test(lower)) {
    return { type: 'call_secretary' };
  }
  const meetMatch = lower.match(/họp với (?:phòng )?(.+)/);
  if (meetMatch) {
    return { type: 'call_meeting', departmentQuery: meetMatch[1].trim() };
  }
  if (/báo cáo hôm nay|tổng kết hôm nay|tình hình công ty/.test(lower)) {
    return { type: 'daily_report' };
  }
  return { type: 'chat_instruction', text: transcript.trim() };
}
