/**
 * Subtle procedural Web Audio synthesizer for Virtual Office ambient background
 * (filtered warm room hum) and gentle notification chimes — zero external audio files.
 */

let audioCtx: AudioContext | null = null;
let noiseSource: AudioBufferSourceNode | null = null;
let masterGain: GainNode | null = null;
let isRunning = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  return audioCtx;
}

export function setAmbientAudioEnabled(enabled: boolean): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (!enabled) {
    if (noiseSource) {
      try {
        noiseSource.stop();
        noiseSource.disconnect();
      } catch {
        // ignore
      }
      noiseSource = null;
    }
    isRunning = false;
    return;
  }

  if (isRunning) return;
  try {
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Soft brown noise for warm low office air-conditioning hum
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 0.8;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 340;

    const gain = ctx.createGain();
    gain.gain.value = 0.035;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();

    noiseSource = src;
    masterGain = gain;
    isRunning = true;
  } catch {
    isRunning = false;
  }
}

export function playNotificationChime(kind: 'info' | 'alert' = 'info'): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    if (kind === 'alert') {
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
    } else {
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
    }
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  } catch {
    // ignore autoplay blocks
  }
}

export function isAmbientAudioPlaying(): boolean {
  return isRunning && Boolean(masterGain);
}

export function syncAmbientAudioSetting(enabled: boolean): void {
  setAmbientAudioEnabled(enabled);
}

