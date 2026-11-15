/**
 * Pure Vietnamese Text-to-Speech Normalizer & Spoken Summary Builder.
 * Converts markdown, numbers, VND currency, DD/MM/YYYY dates, percentages,
 * URLs, issue IDs, and acronyms into natural spoken Vietnamese sentences
 * chunked to <= 200 chars so Chrome/WebSpeech/Cloud TTS never truncates.
 */

export type CeoAcronymMode = 'xi_i_au' | 'chu_tich';

export interface NormalizeSpeechOptions {
  acronymDict?: Record<string, string>;
  ceoAcronymMode?: CeoAcronymMode;
}

export const DEFAULT_VI_ACRONYM_DICT: Record<string, string> = {
  KPI: 'ca pi ai',
  CRM: 'xi a em',
  SEO: 'ét i ô',
  SDR: 'ét đi a',
  API: 'ây pi ai',
  HubCW: 'hắp chuyên web',
  'Zalo OA': 'za lô ô ây',
  Zalo: 'za lô',
  AI: 'ây ai',
  OKR: 'ô ca a',
  SLA: 'ét eo ây',
  VAT: 'vê a tê',
  ROI: 'a ô ai',
  UI: 'iu ai',
  UX: 'iu ích',
  ADB: 'ây đi bi',
  USB: 'iu ét bi',
  PDPA: 'pi đi pi ây',
  BCP: 'bi xi pi',
  DRP: 'đi a pi',
  MRR: 'em a a',
  ARR: 'ây a a',
  CSAT: 'xi sát',
  NPS: 'en pi ét',
  SOP: 'ét ô pi',
  COO: 'xi ô ô',
  CFO: 'xi ép ô',
  CMO: 'xi em ô',
  CTO: 'xi ti ô',
};

const DIGITS_VI = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readTwoDigitsVi(n: number, fullTens: boolean): string {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (tens === 0) {
    if (ones === 0) return '';
    return fullTens ? `lẻ ${DIGITS_VI[ones]}` : DIGITS_VI[ones];
  }
  if (tens === 1) {
    if (ones === 0) return 'mười';
    if (ones === 5) return 'mười lăm';
    return `mười ${DIGITS_VI[ones]}`;
  }
  const tensText = `${DIGITS_VI[tens]} mươi`;
  if (ones === 0) return tensText;
  if (ones === 1) return `${tensText} mốt`;
  if (ones === 4) return `${tensText} tư`;
  if (ones === 5) return `${tensText} lăm`;
  return `${tensText} ${DIGITS_VI[ones]}`;
}

function readThreeDigitsVi(n: number, readZeroHundreds: boolean): string {
  const hundreds = Math.floor(n / 100);
  const rem = n % 100;
  if (hundreds === 0 && !readZeroHundreds) {
    return readTwoDigitsVi(rem, false);
  }
  const hPart = `${DIGITS_VI[hundreds]} trăm`;
  if (rem === 0) return hPart;
  return `${hPart} ${readTwoDigitsVi(rem, true)}`;
}

/**
 * Converts an integer or decimal number into natural Vietnamese words.
 */
export function numberToVietnameseWords(raw: number | string): string {
  const cleaned = String(raw).trim().replace(/\s+/g, '');
  if (!cleaned) return '';
  const isNeg = cleaned.startsWith('-');
  const unsigned = isNeg ? cleaned.slice(1) : cleaned;

  if (unsigned.includes(',')) {
    const [intStr, decStr] = unsigned.split(',');
    const intWords = numberToVietnameseWords(intStr || '0');
    const decWords = decStr
      .split('')
      .map((d) => DIGITS_VI[Number(d)] ?? d)
      .join(' ');
    return `${isNeg ? 'âm ' : ''}${intWords} phẩy ${decWords}`.trim();
  }
  if (unsigned.includes('.')) {
    const parts = unsigned.split('.');
    // Only treat single dot with !=3 trailing digits (or 1..2 decimal digits) as decimal
    if (parts.length === 2 && parts[1].length !== 3) {
      const intWords = numberToVietnameseWords(parts[0] || '0');
      const decWords = parts[1]
        .split('')
        .map((d) => DIGITS_VI[Number(d)] ?? d)
        .join(' ');
      return `${isNeg ? 'âm ' : ''}${intWords} phẩy ${decWords}`.trim();
    }
  }

  const digitsOnly = unsigned.replace(/[.,]/g, '');
  if (!/^\d+$/.test(digitsOnly)) return String(raw);
  const num = Number(digitsOnly);
  if (!Number.isFinite(num)) return String(raw);
  if (num === 0) return 'không';

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const groups: number[] = [];
  let rem = Math.floor(num);
  while (rem > 0) {
    groups.push(rem % 1000);
    rem = Math.floor(rem / 1000);
  }

  const out: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    const hasHigher = i < groups.length - 1;
    const groupWords = readThreeDigitsVi(g, hasHigher);
    const unit = units[i] || '';
    out.push(unit ? `${groupWords} ${unit}` : groupWords);
  }

  return `${isNeg ? 'âm ' : ''}${out.join(' ')}`.replace(/\s+/g, ' ').trim();
}

function speakDigitsOneByOne(code: string): string {
  return code
    .split('')
    .map((ch) => {
      if (/\d/.test(ch)) return DIGITS_VI[Number(ch)];
      return ch;
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strips markdown/emoji/URLs, formats numbers/currency/dates/units/acronyms into
 * clear Vietnamese spoken text ready for TTS synthesis.
 */
export function normalizeVietnameseForSpeech(
  input: string,
  options: NormalizeSpeechOptions = {}
): string {
  if (!input) return '';
  let text = String(input);

  // 1. Remove code fences and inline code blocks
  text = text.replace(/```[\s\S]*?```/g, ' đoạn mã chi tiết trên màn hình ');
  text = text.replace(/`([^`]+)`/g, '$1');

  // 2. Replace markdown links [label](url) -> label
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1');

  // 3. Replace bare URLs -> "đường dẫn trong chat"
  text = text.replace(/https?:\/\/[^\s)]+/gi, ' đường dẫn trong chat ');

  // 4. Strip markdown table pipes/separators
  text = text.replace(/^\s*\|?[\s:-]+\|[\s|:-]*$/gm, ' ');
  text = text.replace(/\|/g, ', ');

  // 5. Strip markdown headings/bold/italic/bullets & emojis
  text = text.replace(/^#{1,6}\s*/gm, '');
  text = text.replace(/^\s*[-*•+]\s+/gm, '');
  text = text.replace(/^\s*>\s*/gm, '');
  text = text.replace(/[*_~]+/g, '');
  text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');

  // 6. Common ticket / document codes (#CP-102, #TK-45, #123)
  text = text.replace(/#CP-(\d+)/gi, (_, n) => `mã chi phí ${speakDigitsOneByOne(n)}`);
  text = text.replace(/#TK-(\d+)/gi, (_, n) => `mã hỗ trợ ${speakDigitsOneByOne(n)}`);
  text = text.replace(/#DH-(\d+)/gi, (_, n) => `mã đơn hàng ${speakDigitsOneByOne(n)}`);
  text = text.replace(/#(\d{1,6})\b/g, (_, n) => `mã việc ${speakDigitsOneByOne(n)}`);

  // 7. Dates DD/MM/YYYY or DD-MM-YYYY
  text = text.replace(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/g, (_, d, m, y) => {
    const dayW = numberToVietnameseWords(Number(d));
    const monW = numberToVietnameseWords(Number(m));
    const yearNum = Number(y);
    let yearW = numberToVietnameseWords(yearNum);
    if (yearNum >= 2000 && yearNum < 2010) {
      yearW = `hai nghìn không trăm lẻ ${DIGITS_VI[yearNum % 10]}`;
    } else if (yearNum >= 2010 && yearNum < 2100) {
      yearW = `hai nghìn không trăm ${readTwoDigitsVi(yearNum % 100, false)}`;
    }
    return `ngày ${dayW} tháng ${monW} năm ${yearW}`;
  });

  // 8. Times HH:MM or HHhMM
  text = text.replace(/\b(\d{1,2})[:h](\d{2})\b(?:\s*(?:phút|giờ))?/gi, (_, hh, mm) => {
    const h = Number(hh);
    const m = Number(mm);
    if (h > 24 || m > 59) return `${hh}:${mm}`;
    return m === 0
      ? `${numberToVietnameseWords(h)} giờ`
      : `${numberToVietnameseWords(h)} giờ ${numberToVietnameseWords(m)} phút`;
  });

  // 9. Currency: VND / VNĐ / đ (e.g. 17.172.000đ, 500.000 VNĐ, 250k)
  text = text.replace(
    /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(?:VNĐ|VND|vnđ|vnd|đ)\b/g,
    (_, numPart) => `${numberToVietnameseWords(numPart)} đồng`
  );
  text = text.replace(/(\d+(?:[.,]\d+)?)\s*k\b/gi, (_, n) => {
    const val = Math.round(Number(String(n).replace(',', '.')) * 1000);
    return `${numberToVietnameseWords(val)} đồng`;
  });
  text = text.replace(/(\d+(?:[.,]\d+)?)\s*tr\b/gi, (_, n) => {
    return `${numberToVietnameseWords(String(n).replace('.', ','))} triệu đồng`;
  });

  // 10. Percentages (e.g. 30%, 12.5%)
  text = text.replace(/(-?\d+(?:[.,]\d+)?)\s*%/g, (_, n) => {
    return `${numberToVietnameseWords(String(n).replace('.', ','))} phần trăm`;
  });

  // 11. Common physical / tech units
  text = text.replace(/(-?\d+(?:[.,]\d+)?)\s*°C\b/g, (_, n) => `${numberToVietnameseWords(String(n).replace('.', ','))} độ xê`);
  text = text.replace(/\b(\d+(?:[.,]\d+)?)\s*ms\b/gi, (_, n) => `${numberToVietnameseWords(String(n).replace('.', ','))} mi li giây`);
  text = text.replace(/\b(\d+(?:[.,]\d+)?)\s*GB\b/gi, (_, n) => `${numberToVietnameseWords(String(n).replace('.', ','))} ghi ga bai`);
  text = text.replace(/\b(\d+(?:[.,]\d+)?)\s*MB\b/gi, (_, n) => `${numberToVietnameseWords(String(n).replace('.', ','))} mê ga bai`);
  text = text.replace(/\b(\d+(?:[.,]\d+)?)\s*km\b/gi, (_, n) => `${numberToVietnameseWords(String(n).replace('.', ','))} ki lô mét`);
  text = text.replace(/\b(\d+(?:[.,]\d+)?)\s*kg\b/gi, (_, n) => `${numberToVietnameseWords(String(n).replace('.', ','))} ki lô gam`);

  // 12. Acronym & English dictionary (including CEO mode)
  const dict: Record<string, string> = {
    ...DEFAULT_VI_ACRONYM_DICT,
    ...(options.acronymDict || {}),
  };
  const ceoSpoken = options.ceoAcronymMode === 'chu_tich' ? 'chủ tịch' : 'xi i âu';
  dict.CEO = dict.CEO || ceoSpoken;
  if (options.ceoAcronymMode === 'chu_tich' && !options.acronymDict?.CEO) {
    dict.CEO = 'chủ tịch';
  }

  // Sort longest keys first (so "Zalo OA" matches before "Zalo")
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (!k.trim()) continue;
    const re = new RegExp(`\\b${escapeRegExp(k)}\\b`, 'g');
    text = text.replace(re, dict[k]);
  }

  // 13. Standalone numbers (dot-grouped thousands like 15.000 or integers/decimals)
  text = text.replace(/\b(\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)\b/g, (m) => numberToVietnameseWords(m));

  // 14. Clean spacing & punctuation pauses
  text = text
    .replace(/\r?\n+/g, '. ')
    .replace(/\s*·\s*/g, ', ')
    .replace(/\s*\/\s*/g, ' trên ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/([,.;!?])([^\s])/g, '$1 $2')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Splits normalized Vietnamese speech into <= maxChars sentence chunks
 * so browser/cloud TTS never times out or truncates long replies.
 */
export function splitSpeechChunks(text: string, maxChars = 200): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const rawSentences = clean
    .split(/(?<=[.!?;])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buf = '';

  const pushPiece = (piece: string) => {
    if (piece.length <= maxChars) {
      if (!buf) {
        buf = piece;
      } else if (buf.length + 1 + piece.length <= maxChars) {
        buf = `${buf} ${piece}`;
      } else {
        chunks.push(buf);
        buf = piece;
      }
      return;
    }

    // Split overly long sentence by commas/words
    if (buf) {
      chunks.push(buf);
      buf = '';
    }
    const clauses = piece.split(/(?<=,)\s+/).filter(Boolean);
    for (const c of clauses) {
      if (c.length <= maxChars) {
        if (!buf) buf = c;
        else if (buf.length + 1 + c.length <= maxChars) buf = `${buf} ${c}`;
        else {
          chunks.push(buf);
          buf = c;
        }
      } else {
        if (buf) {
          chunks.push(buf);
          buf = '';
        }
        const words = c.split(/\s+/);
        let line = '';
        for (const w of words) {
          if (!line) line = w;
          else if (line.length + 1 + w.length <= maxChars) line = `${line} ${w}`;
          else {
            chunks.push(line);
            line = w;
          }
        }
        if (line) chunks.push(line);
      }
    }
  };

  for (const s of rawSentences) {
    pushPiece(s);
  }
  if (buf) chunks.push(buf);
  return chunks;
}

/**
 * Builds a concise 1-3 sentence spoken Vietnamese summary ("bản nói") distinct
 * from long markdown/tables/code ("bản chữ").
 */
export function buildSpokenSummary(
  rawDisplayText: string,
  explicitSpeech?: string,
  options: NormalizeSpeechOptions = {}
): string {
  if (explicitSpeech && explicitSpeech.trim()) {
    return normalizeVietnameseForSpeech(explicitSpeech.trim(), options);
  }

  const raw = String(rawDisplayText || '').trim();
  if (!raw) return '';

  const hasStructuredHeavyContent =
    /```|\|.+\||https?:\/\/|^#{1,4}\s/m.test(raw) || raw.length > 260;

  if (!hasStructuredHeavyContent) {
    return normalizeVietnameseForSpeech(raw, options);
  }

  // Extract first 1-2 meaningful non-table/non-code lines as natural summary
  const cleanLines = raw
    .replace(/```[\s\S]*?```/g, '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^#{1,6}\s*|^\s*[-*•>\d.]+\s*/g, '').replace(/[*_`]/g, '').trim())
    .filter((l) => l.length > 8 && !l.startsWith('|') && !/^https?:\/\//i.test(l));

  const summaryBase = cleanLines.slice(0, 2).join('. ').slice(0, 240);
  const tail = 'Chi tiết em đã đưa lên màn hình và khung chat ạ.';
  const combined = summaryBase ? `${summaryBase}. ${tail}` : tail;
  return normalizeVietnameseForSpeech(combined, options);
}
