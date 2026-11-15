import {
  AgentProfile,
  AgentVoiceProfile,
  VoiceProviderId,
  VoiceSettings,
  VoiceTimbreStyle,
} from '../types';
import {
  buildSpokenSummary,
  normalizeVietnameseForSpeech,
  splitSpeechChunks,
} from './vietnameseSpeechNormalizer';

export interface SpeakOptions {
  text: string;
  explicitSpeech?: string;
  voiceProfile?: AgentVoiceProfile;
  voiceSettings?: Partial<VoiceSettings>;
  agentId?: string;
  onStart?: () => void;
  onChunk?: (chunk: string, index: number, total: number) => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
}

export interface SpeakAttemptResult {
  ok: boolean;
  providerUsed: VoiceProviderId;
  latencyMs: number;
  spokenText: string;
  fallbackReason?: string;
}

export interface BrowserVoiceInfo {
  name: string;
  lang: string;
  localService: boolean;
  isVietnamese: boolean;
}

export interface BrowserVoiceDiagnostic {
  allVoices: BrowserVoiceInfo[];
  viVoices: BrowserVoiceInfo[];
  hasVietnameseVoice: boolean;
  warningMessage?: string;
  windowsGuideSteps: string[];
}

export interface IVoiceProvider {
  id: VoiceProviderId;
  label: string;
  isSupported(): boolean;
  speakChunk(chunk: string, opts: SpeakOptions, abortToken: number): Promise<void>;
  stop(): void;
}

export const VOICE_PROVIDER_LABELS: Record<VoiceProviderId, string> = {
  azure_tts: 'Azure Neural Speech (HoaiMy / NamMinh)',
  edge_tts: 'Edge Neural TTS (qua /worker)',
  google_tts: 'Google Cloud TTS (vi-VN)',
  gemini_tts: 'Gemini 3.8 Flash TTS',
  fpt_tts: 'FPT.AI TTS (Tiếng Việt bản địa)',
  worker_piper: 'Piper Local TTS (Offline /worker)',
  web_speech: 'Trình duyệt Web Speech API (Chỉ dùng khi có giọng vi-VN)',
  text_only: 'Chỉ phụ đề văn bản (Tắt âm thanh)',
};

export const VOICE_CALIBRATION_SAMPLE =
  'Báo cáo CEO: Doanh thu ngày 15/11/2026 đạt 17.172.000đ, tăng 30% KPI quý. Chị Nguyễn Minh Anh tại ChuyenWeb đã đồng bộ CRM và HubCW qua API. Đây là đoạn kiểm tra câu dài trên năm trăm ký tự để bảo đảm hàng đợi đọc tuần tự từng câu ngắn dưới hai trăm ký tự mà không bao giờ bị cắt chữ giữa chừng trên trình duyệt Chrome hay Edge. Mọi số liệu chi tiết, bảng biểu và đường dẫn https://hub.chuyenweb.com đều đã được đưa lên màn hình.';

let activeAudioElement: HTMLAudioElement | null = null;
let currentSpeakingAgentId: string | null = null;
let currentSpeechSessionToken = 0;
let chromeKeepAliveTimer: number | null = null;
const speakingListeners = new Set<(agentId: string | null) => void>();

// LRU Audio Cache for repeated spoken phrases (max 40 clips)
const audioClipCache = new Map<string, string>();
const MAX_AUDIO_CACHE = 40;

function getCachedAudio(cacheKey: string): string | undefined {
  const hit = audioClipCache.get(cacheKey);
  if (hit) {
    audioClipCache.delete(cacheKey);
    audioClipCache.set(cacheKey, hit);
  }
  return hit;
}

function setCachedAudio(cacheKey: string, dataUrl: string) {
  if (audioClipCache.has(cacheKey)) {
    audioClipCache.delete(cacheKey);
  } else if (audioClipCache.size >= MAX_AUDIO_CACHE) {
    const oldestKey = audioClipCache.keys().next().value;
    if (oldestKey) audioClipCache.delete(oldestKey);
  }
  audioClipCache.set(cacheKey, dataUrl);
}

export function clearVoiceAudioCache() {
  audioClipCache.clear();
}

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
  currentSpeechSessionToken += 1;
  if (chromeKeepAliveTimer !== null && typeof window !== 'undefined') {
    window.clearInterval(chromeKeepAliveTimer);
    chromeKeepAliveTimer = null;
  }
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

/**
 * Waits for browser `speechSynthesis.onvoiceschanged` + retries up to timeoutMs
 * so voices are never inspected prematurely before the browser populates them.
 */
export async function waitForBrowserVoices(timeoutMs = 2200): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  const initial = window.speechSynthesis.getVoices();
  if (initial.length > 0) return initial;

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener?.('voiceschanged', onChanged);
      window.clearInterval(pollTimer);
      window.clearTimeout(timeoutTimer);
      resolve(window.speechSynthesis.getVoices());
    };
    const onChanged = () => {
      if (window.speechSynthesis.getVoices().length > 0) finish();
    };
    window.speechSynthesis.addEventListener?.('voiceschanged', onChanged);
    const pollTimer = window.setInterval(() => {
      if (window.speechSynthesis.getVoices().length > 0) finish();
    }, 150);
    const timeoutTimer = window.setTimeout(finish, timeoutMs);
  });
}

export function diagnoseVoiceList(rawVoices: Array<{ name: string; lang: string; localService: boolean }>): BrowserVoiceDiagnostic {
  const allVoices: BrowserVoiceInfo[] = rawVoices.map((v) => ({
    name: v.name,
    lang: v.lang,
    localService: Boolean(v.localService),
    isVietnamese: v.lang.toLowerCase().startsWith('vi'),
  }));
  const viVoices = allVoices.filter((v) => v.isVietnamese);
  const hasVietnameseVoice = viVoices.length > 0;

  return {
    allVoices,
    viVoices,
    hasVietnameseVoice,
    warningMessage: hasVietnameseVoice
      ? undefined
      : 'Trình duyệt hiện KHÔNG có giọng tiếng Việt (vi-VN). Hệ thống sẽ KHÔNG dùng giọng tiếng Anh đọc tiếng Việt và tự động chuyển sang nhà cung cấp Neural/Đám mây hoặc Chỉ phụ đề.',
    windowsGuideSteps: [
      'Cách nhanh nhất trên Windows: mở trang web này bằng Microsoft Edge (có sẵn giọng vi-VN-HoaiMyNeural & NamMinhNeural rõ nét).',
      'Hoặc cài giọng Windows: Settings → Time & language → Speech → Add voices → chọn Vietnamese (Tiếng Việt) rồi khởi động lại trình duyệt.',
      'Hoặc nhập API Key Azure Speech / Google Cloud TTS / FPT.AI / Gemini ở bảng bên dưới để dùng giọng Neural trực tiếp.',
    ],
  };
}

export async function inspectBrowserVoices(): Promise<BrowserVoiceDiagnostic> {
  const voices = await waitForBrowserVoices();
  return diagnoseVoiceList(
    voices.map((v) => ({ name: v.name, lang: v.lang, localService: v.localService }))
  );
}

async function playAudioDataUrl(dataUrl: string, volume: number, abortToken: number): Promise<void> {
  if (abortToken !== currentSpeechSessionToken) return;
  await new Promise<void>((resolve, reject) => {
    const audio = new Audio(dataUrl);
    audio.volume = Math.min(1, Math.max(0.1, volume));
    activeAudioElement = audio;
    audio.onended = () => {
      if (activeAudioElement === audio) activeAudioElement = null;
      resolve();
    };
    audio.onerror = () => {
      if (activeAudioElement === audio) activeAudioElement = null;
      reject(new Error('Không phát được luồng âm thanh'));
    };
    audio.play().catch((err) => {
      if (activeAudioElement === audio) activeAudioElement = null;
      reject(err instanceof Error ? err : new Error('Trình duyệt chặn tự phát âm thanh'));
    });
  });
}

async function fetchServerTtsAudio(
  endpoint: string,
  cacheKey: string,
  body: Record<string, unknown>,
  volume: number,
  abortToken: number
): Promise<void> {
  const cached = getCachedAudio(cacheKey);
  if (cached) {
    await playAudioDataUrl(cached, volume, abortToken);
    return;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} từ ${endpoint}`);
  }
  const data = (await res.json()) as {
    ok?: boolean;
    audioBase64?: string;
    audioUrl?: string;
    mimeType?: string;
    error?: string;
  };
  if (!data.ok) {
    throw new Error(data.error || `Provider tại ${endpoint} chưa sẵn sàng`);
  }
  const src = data.audioBase64
    ? `data:${data.mimeType || 'audio/mpeg'};base64,${data.audioBase64}`
    : data.audioUrl;
  if (!src) {
    throw new Error('Server TTS không trả về dữ liệu âm thanh');
  }
  setCachedAudio(cacheKey, src);
  await playAudioDataUrl(src, volume, abortToken);
}

export class WebSpeechVoiceProvider implements IVoiceProvider {
  id: VoiceProviderId = 'web_speech';
  label = VOICE_PROVIDER_LABELS.web_speech;

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  async speakChunk(chunk: string, opts: SpeakOptions, abortToken: number): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Trình duyệt không hỗ trợ SpeechSynthesis.');
    }
    if (abortToken !== currentSpeechSessionToken) return;

    const voices = await waitForBrowserVoices(1500);
    const viVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('vi'));
    // STRICT RULE: Never use an English voice to read Vietnamese
    if (viVoices.length === 0) {
      throw new Error('NO_VIETNAMESE_VOICE');
    }

    const matched =
      viVoices.find((v) => v.name === opts.voiceProfile?.voiceName) ||
      viVoices.find((v) =>
        opts.voiceProfile?.gender === 'male'
          ? /namminh|nam|male/i.test(v.name)
          : /hoaimy|linh|lan|female|nu/i.test(v.name)
      ) ||
      viVoices[0];

    await new Promise<void>((resolve, reject) => {
      if (abortToken !== currentSpeechSessionToken) {
        resolve();
        return;
      }
      const utter = new SpeechSynthesisUtterance(chunk);
      utter.voice = matched;
      utter.lang = 'vi-VN';
      utter.pitch = opts.voiceProfile?.pitch ?? opts.voiceSettings?.pitch ?? 1.0;
      utter.rate = opts.voiceProfile?.rate ?? opts.voiceSettings?.rate ?? 1.02;
      utter.volume = opts.voiceProfile?.volume ?? opts.voiceSettings?.volume ?? 1.0;

      // Chrome pauses long speechSynthesis after ~15s without resume ping
      if (chromeKeepAliveTimer !== null) window.clearInterval(chromeKeepAliveTimer);
      chromeKeepAliveTimer = window.setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 9000);

      const cleanup = () => {
        if (chromeKeepAliveTimer !== null) {
          window.clearInterval(chromeKeepAliveTimer);
          chromeKeepAliveTimer = null;
        }
      };

      utter.onend = () => {
        cleanup();
        resolve();
      };
      utter.onerror = (ev) => {
        cleanup();
        const errCode = (ev as { error?: string })?.error;
        if (errCode === 'interrupted' || errCode === 'canceled') {
          resolve();
        } else {
          reject(new Error(`Web Speech lỗi: ${errCode || 'unknown'}`));
        }
      };

      try {
        window.speechSynthesis.speak(utter);
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error('Lỗi SpeechSynthesis'));
      }
    });
  }

  stop() {
    stopAllVoicePlayback();
  }
}

export class AzureNeuralVoiceProvider implements IVoiceProvider {
  id: VoiceProviderId = 'azure_tts';
  label = VOICE_PROVIDER_LABELS.azure_tts;
  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof fetch === 'function';
  }
  async speakChunk(chunk: string, opts: SpeakOptions, abortToken: number): Promise<void> {
    const voice =
      opts.voiceProfile?.azureVoiceName ||
      (opts.voiceProfile?.gender === 'male' ? 'vi-VN-NamMinhNeural' : 'vi-VN-HoaiMyNeural');
    const rate = opts.voiceProfile?.rate ?? opts.voiceSettings?.rate ?? 1.0;
    const pitch = opts.voiceProfile?.pitch ?? opts.voiceSettings?.pitch ?? 1.0;
    const vol = opts.voiceProfile?.volume ?? opts.voiceSettings?.volume ?? 1.0;
    const cacheKey = `azure:${voice}:${rate.toFixed(2)}:${pitch.toFixed(2)}:${chunk}`;
    await fetchServerTtsAudio(
      '/api/voice/azure-tts',
      cacheKey,
      { text: chunk, voiceName: voice, rate, pitch, region: opts.voiceSettings?.azureRegion },
      vol,
      abortToken
    );
  }
  stop() {
    stopAllVoicePlayback();
  }
}

export class EdgeTtsVoiceProvider implements IVoiceProvider {
  id: VoiceProviderId = 'edge_tts';
  label = VOICE_PROVIDER_LABELS.edge_tts;
  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof fetch === 'function';
  }
  async speakChunk(chunk: string, opts: SpeakOptions, abortToken: number): Promise<void> {
    const voice =
      opts.voiceProfile?.azureVoiceName ||
      (opts.voiceProfile?.gender === 'male' ? 'vi-VN-NamMinhNeural' : 'vi-VN-HoaiMyNeural');
    const rate = opts.voiceProfile?.rate ?? opts.voiceSettings?.rate ?? 1.0;
    const pitch = opts.voiceProfile?.pitch ?? opts.voiceSettings?.pitch ?? 1.0;
    const vol = opts.voiceProfile?.volume ?? opts.voiceSettings?.volume ?? 1.0;
    const cacheKey = `edge:${voice}:${rate.toFixed(2)}:${chunk}`;
    await fetchServerTtsAudio('/api/voice/edge-tts', cacheKey, { text: chunk, voiceName: voice, rate, pitch }, vol, abortToken);
  }
  stop() {
    stopAllVoicePlayback();
  }
}

export class GoogleCloudVoiceProvider implements IVoiceProvider {
  id: VoiceProviderId = 'google_tts';
  label = VOICE_PROVIDER_LABELS.google_tts;
  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof fetch === 'function';
  }
  async speakChunk(chunk: string, opts: SpeakOptions, abortToken: number): Promise<void> {
    const voice = opts.voiceProfile?.gender === 'male' ? 'vi-VN-Standard-B' : 'vi-VN-Standard-A';
    const rate = opts.voiceProfile?.rate ?? opts.voiceSettings?.rate ?? 1.0;
    const pitch = opts.voiceProfile?.pitch ?? opts.voiceSettings?.pitch ?? 1.0;
    const vol = opts.voiceProfile?.volume ?? opts.voiceSettings?.volume ?? 1.0;
    const cacheKey = `gcloud:${voice}:${rate.toFixed(2)}:${chunk}`;
    await fetchServerTtsAudio('/api/voice/google-tts', cacheKey, { text: chunk, voiceName: voice, rate, pitch }, vol, abortToken);
  }
  stop() {
    stopAllVoicePlayback();
  }
}

export class GeminiTtsVoiceProvider implements IVoiceProvider {
  id: VoiceProviderId = 'gemini_tts';
  label = VOICE_PROVIDER_LABELS.gemini_tts;
  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof fetch === 'function';
  }
  async speakChunk(chunk: string, opts: SpeakOptions, abortToken: number): Promise<void> {
    const voiceName =
      opts.voiceProfile?.geminiVoiceName || (opts.voiceProfile?.gender === 'male' ? 'Puck' : 'Kore');
    const vol = opts.voiceProfile?.volume ?? opts.voiceSettings?.volume ?? 1.0;
    const cacheKey = `gemini:${voiceName}:${chunk}`;
    await fetchServerTtsAudio(
      '/api/voice/gemini-tts',
      cacheKey,
      { text: chunk, voiceName, style: opts.voiceProfile?.timbre || 'warm' },
      vol,
      abortToken
    );
  }
  stop() {
    stopAllVoicePlayback();
  }
}

export class FptAiVoiceProvider implements IVoiceProvider {
  id: VoiceProviderId = 'fpt_tts';
  label = VOICE_PROVIDER_LABELS.fpt_tts;
  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof fetch === 'function';
  }
  async speakChunk(chunk: string, opts: SpeakOptions, abortToken: number): Promise<void> {
    const voice = opts.voiceProfile?.gender === 'male' ? 'leminh' : 'banmai';
    const speed = ((opts.voiceProfile?.rate ?? opts.voiceSettings?.rate ?? 1.0) - 1.0) * 2;
    const vol = opts.voiceProfile?.volume ?? opts.voiceSettings?.volume ?? 1.0;
    const cacheKey = `fpt:${voice}:${speed.toFixed(1)}:${chunk}`;
    await fetchServerTtsAudio('/api/voice/fpt-tts', cacheKey, { text: chunk, voice, speed }, vol, abortToken);
  }
  stop() {
    stopAllVoicePlayback();
  }
}

export class WorkerPiperVoiceProvider implements IVoiceProvider {
  id: VoiceProviderId = 'worker_piper';
  label = VOICE_PROVIDER_LABELS.worker_piper;
  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof fetch === 'function';
  }
  async speakChunk(chunk: string, opts: SpeakOptions, abortToken: number): Promise<void> {
    const vol = opts.voiceProfile?.volume ?? opts.voiceSettings?.volume ?? 1.0;
    const cacheKey = `piper:${chunk}`;
    await fetchServerTtsAudio('/api/voice/piper-tts', cacheKey, { text: chunk }, vol, abortToken);
  }
  stop() {
    stopAllVoicePlayback();
  }
}

export class TextOnlyVoiceProvider implements IVoiceProvider {
  id: VoiceProviderId = 'text_only';
  label = VOICE_PROVIDER_LABELS.text_only;
  isSupported(): boolean {
    return true;
  }
  async speakChunk(chunk: string, _opts: SpeakOptions, abortToken: number): Promise<void> {
    if (abortToken !== currentSpeechSessionToken) return;
    await new Promise((r) => setTimeout(r, Math.min(2200, Math.max(450, chunk.length * 16))));
  }
  stop() {
    // managed by session token
  }
}

export function createVoiceProvider(id: VoiceProviderId): IVoiceProvider {
  switch (id) {
    case 'azure_tts':
      return new AzureNeuralVoiceProvider();
    case 'edge_tts':
      return new EdgeTtsVoiceProvider();
    case 'google_tts':
      return new GoogleCloudVoiceProvider();
    case 'gemini_tts':
      return new GeminiTtsVoiceProvider();
    case 'fpt_tts':
      return new FptAiVoiceProvider();
    case 'worker_piper':
      return new WorkerPiperVoiceProvider();
    case 'web_speech':
      return new WebSpeechVoiceProvider();
    case 'text_only':
    default:
      return new TextOnlyVoiceProvider();
  }
}

/**
 * Plays speech through normalized <=200-char Vietnamese sentence queue,
 * automatically failing over across configured providers if one fails or lacks vi-VN voices.
 */
export async function speakWithPriorityFailover(opts: SpeakOptions): Promise<SpeakAttemptResult> {
  stopAllVoicePlayback();
  const myToken = currentSpeechSessionToken;

  const summary = buildSpokenSummary(opts.text, opts.explicitSpeech, {
    acronymDict: opts.voiceSettings?.acronymDict,
    ceoAcronymMode: opts.voiceSettings?.ceoAcronymMode,
  });
  const normalized = normalizeVietnameseForSpeech(summary, {
    acronymDict: opts.voiceSettings?.acronymDict,
    ceoAcronymMode: opts.voiceSettings?.ceoAcronymMode,
  });
  const chunks = splitSpeechChunks(normalized, 200);
  if (chunks.length === 0) {
    opts.onEnd?.();
    return { ok: true, providerUsed: 'text_only', latencyMs: 0, spokenText: '' };
  }

  const primary = opts.voiceSettings?.provider || 'azure_tts';
  const defaultOrder: VoiceProviderId[] = [
    'azure_tts',
    'edge_tts',
    'google_tts',
    'gemini_tts',
    'fpt_tts',
    'worker_piper',
    'web_speech',
    'text_only',
  ];
  const rawOrder = opts.voiceSettings?.priorityOrder?.length ? opts.voiceSettings.priorityOrder : defaultOrder;
  const order: VoiceProviderId[] =
    primary === 'text_only'
      ? ['text_only']
      : Array.from(new Set<VoiceProviderId>([primary, ...rawOrder, 'text_only']));

  if (opts.agentId) setCurrentSpeakingAgentId(opts.agentId);
  opts.onStart?.();

  let fallbackReason: string | undefined;
  let usedProvider: VoiceProviderId = 'text_only';
  const startedAt = performance.now();

  for (let pIdx = 0; pIdx < order.length; pIdx++) {
    if (myToken !== currentSpeechSessionToken) break;
    const pid = order[pIdx];
    const provider = createVoiceProvider(pid);
    if (!provider.isSupported()) continue;

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (myToken !== currentSpeechSessionToken) break;
        opts.onChunk?.(chunks[i], i, chunks.length);
        await provider.speakChunk(chunks[i], opts, myToken);
      }
      usedProvider = pid;
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!fallbackReason) fallbackReason = `${pid}: ${msg}`;
      if (pid === 'text_only') break;
    }
  }

  if (myToken === currentSpeechSessionToken) {
    setCurrentSpeakingAgentId(null);
    opts.onEnd?.();
  }

  return {
    ok: true,
    providerUsed: usedProvider,
    latencyMs: Math.round(performance.now() - startedAt),
    spokenText: normalized,
    fallbackReason,
  };
}

/**
 * Probes a single TTS provider directly with timing latency measurement (used in Settings > Giọng nói).
 */
export async function testSingleVoiceProvider(
  providerId: VoiceProviderId,
  sampleText: string,
  voiceSettings?: Partial<VoiceSettings>,
  voiceProfile?: AgentVoiceProfile
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  stopAllVoicePlayback();
  const myToken = currentSpeechSessionToken;
  const normalized = normalizeVietnameseForSpeech(sampleText, {
    acronymDict: voiceSettings?.acronymDict,
    ceoAcronymMode: voiceSettings?.ceoAcronymMode,
  });
  const chunks = splitSpeechChunks(normalized, 200);
  const provider = createVoiceProvider(providerId);
  const t0 = performance.now();
  try {
    for (const c of chunks) {
      if (myToken !== currentSpeechSessionToken) break;
      await provider.speakChunk(c, { text: c, voiceSettings, voiceProfile }, myToken);
    }
    return { ok: true, latencyMs: Math.round(performance.now() - t0) };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - t0),
      error: err instanceof Error ? err.message : 'Lỗi phát âm thanh',
    };
  }
}

export function formatAgentVoiceLabel(profile?: AgentVoiceProfile): string {
  if (!profile) return 'Giọng: HoaiMy (mặc định)';
  const base = profile.azureVoiceName?.replace('vi-VN-', '').replace('Neural', '') || profile.voiceName || 'vi-VN';
  const ratePct = Math.round(((profile.rate || 1) - 1) * 100);
  const pitchPct = Math.round(((profile.pitch || 1) - 1) * 100);
  const rateStr = `${ratePct >= 0 ? '+' : ''}${ratePct}% tốc độ`;
  const pitchStr = `${pitchPct >= 0 ? '+' : ''}${pitchPct}% cao độ`;
  return `Giọng: ${base} (${rateStr}, ${pitchStr})`;
}

const TIMBRE_CYCLE: VoiceTimbreStyle[] = ['warm', 'crisp', 'energetic', 'calm', 'authoritative'];
const GEMINI_FEMALE: Array<'Kore' | 'Zephyr'> = ['Kore', 'Zephyr'];
const GEMINI_MALE: Array<'Puck' | 'Charon' | 'Fenrir'> = ['Puck', 'Charon', 'Fenrir'];

export function proposeUniqueVoiceForAgent(
  agent: Pick<AgentProfile, 'id' | 'name' | 'gender' | 'role'>,
  existingAgents: AgentProfile[],
  browserVoices: SpeechSynthesisVoice[] = []
): AgentVoiceProfile {
  const gender: 'female' | 'male' = agent.gender === 'male' ? 'male' : 'female';
  const viVoices = browserVoices.filter((v) => v.lang.toLowerCase().startsWith('vi'));

  const usedSignatures = new Set(
    existingAgents
      .filter((a) => a.id !== agent.id && a.voiceProfile)
      .map((a) => `${a.voiceProfile!.voiceName}|${a.voiceProfile!.pitch}|${a.voiceProfile!.rate}`)
  );

  let idx = existingAgents.length;
  for (let i = 0; i < agent.id.length; i++) idx += agent.id.charCodeAt(i);

  const pitchCandidates = gender === 'female' ? [1.04, 1.1, 0.98, 1.15, 1.01] : [0.9, 0.95, 0.85, 1.0, 0.92];
  const rateCandidates = [1.0, 1.06, 0.95, 1.11, 0.92];
  const azureVoiceName = gender === 'female' ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';

  for (let attempt = 0; attempt < 25; attempt++) {
    const v = viVoices.length > 0 ? viVoices[(idx + attempt) % viVoices.length] : undefined;
    const pitch = pitchCandidates[(idx + attempt) % pitchCandidates.length];
    const rate = rateCandidates[Math.floor((idx + attempt) / 2) % rateCandidates.length];
    const voiceName = v?.name || azureVoiceName;
    const sig = `${voiceName}|${pitch}|${rate}`;
    if (!usedSignatures.has(sig) || attempt === 24) {
      return {
        voiceId: v?.voiceURI || `vi_${gender}_${(idx + attempt) % 10}`,
        voiceName,
        lang: 'vi-VN',
        gender,
        pitch,
        rate,
        volume: 1.0,
        timbre:
          agent.role === 'Exec' || agent.role === 'CEO'
            ? 'authoritative'
            : TIMBRE_CYCLE[(idx + attempt) % TIMBRE_CYCLE.length],
        geminiVoiceName:
          gender === 'female'
            ? GEMINI_FEMALE[(idx + attempt) % GEMINI_FEMALE.length]
            : GEMINI_MALE[(idx + attempt) % GEMINI_MALE.length],
        azureVoiceName,
      };
    }
  }

  return {
    voiceId: 'vi_default',
    voiceName: azureVoiceName,
    lang: 'vi-VN',
    gender,
    pitch: gender === 'female' ? 1.04 : 0.92,
    rate: 1.0,
    volume: 1.0,
    timbre: 'warm',
    geminiVoiceName: gender === 'female' ? 'Kore' : 'Puck',
    azureVoiceName,
  };
}

/**
 * Transcribes recorded Blob audio using Gemini 3.5 Transcribe or Local Whisper (/worker),
 * injecting company vocabulary (agent names, products, internal terms) for higher Vietnamese accuracy.
 */
export async function transcribeAudioBlob(
  blob: Blob,
  provider: 'gemini_stt' | 'worker_whisper',
  vocabularyHints: string[] = []
): Promise<{ ok: boolean; transcript?: string; error?: string }> {
  const arrayBuf = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const audioBase64 = btoa(binary);

  const endpoint = provider === 'worker_whisper' ? '/api/voice/whisper-stt' : '/api/voice/gemini-stt';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || 'audio/webm',
      vocabularyHints: vocabularyHints.slice(0, 40),
    }),
  });
  const data = (await res.json()) as { ok?: boolean; transcript?: string; error?: string };
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Không nhận dạng được giọng nói' };
  }
  return { ok: true, transcript: data.transcript || '' };
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
