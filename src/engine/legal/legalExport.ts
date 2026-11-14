import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { jsPDF } from 'jspdf';
import { ContractRecord, LegalReportRecord } from '../../types';
import { LEGAL_MANDATORY_DISCLAIMER } from './legalEngine';

export async function generateContractDocxBuffer(contract: ContractRecord): Promise<Uint8Array> {
  const latestVersion = contract.versions[contract.versions.length - 1];
  const bodyLines = (latestVersion?.content || '').split('\n');

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: contract.title,
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Mã hợp đồng: ${contract.contractCode} · Phiên bản v${contract.currentVersion} · Biến thể: ${contract.variant}`,
                italics: true,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: LEGAL_MANDATORY_DISCLAIMER,
                bold: true,
                color: 'B45309',
                size: 20,
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          ...bodyLines.map(
            (line) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    bold: line.startsWith('ĐIỀU ') || line.includes('BÊN A') || line.includes('BÊN B'),
                    color: line.includes('[CẦN BỔ SUNG]') ? 'DC2626' : undefined,
                    size: 22,
                  }),
                ],
              })
          ),
        ],
      },
    ],
  });

  const buf = await Packer.toArrayBuffer(doc);
  return new Uint8Array(buf);
}

export async function generateLegalReportDocxBuffer(report: LegalReportRecord): Promise<Uint8Array> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: `BÁO CÁO PHÁP LÝ: ${report.title}`, bold: true, size: 28 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: LEGAL_MANDATORY_DISCLAIMER, bold: true, color: 'B45309', size: 20 })],
          }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, text: '1. Tóm tắt điều hành' }),
          ...report.summaryFiveLines.map((l) => new Paragraph({ text: l })),
          new Paragraph({ heading: HeadingLevel.HEADING_2, text: '2. Bảng đối chiếu dữ liệu & Nguồn' }),
          ...report.partiesAndProvenance.map(
            (p) => new Paragraph({ text: `- ${p.field}: ${p.value} [Nguồn: ${p.source}]` })
          ),
          new Paragraph({ heading: HeadingLevel.HEADING_2, text: '3. Căn cứ pháp luật & Trạng thái xác minh' }),
          ...report.citations.map(
            (c) =>
              new Paragraph({
                text: `- ${c.docTitle} (${c.docNumber}) · ${c.articleClause} [${c.verificationTag || 'VERIFIED'}] (${c.sourceUrl})`,
              })
          ),
          new Paragraph({ heading: HeadingLevel.HEADING_2, text: '4. Rủi ro & Khuyến nghị sửa câu chữ' }),
          ...(report.risks.length === 0
            ? [new Paragraph({ text: 'Không phát hiện rủi ro cao từ quy tắc kiểm tra tự động.' })]
            : report.risks.map(
                (r) =>
                  new Paragraph({
                    text: `[${r.severity.toUpperCase()}] ${r.clauseRef}: ${r.issue} -> Đề xuất: ${r.recommendation}`,
                  })
              )),
          new Paragraph({ heading: HeadingLevel.HEADING_2, text: '5. Điểm cần con người / Luật sư quyết định' }),
          ...report.humanDecisionPoints.map((h) => new Paragraph({ text: `- ${h}` })),
        ],
      },
    ],
  });

  const buf = await Packer.toArrayBuffer(doc);
  return new Uint8Array(buf);
}

/**
 * Generates a real PDF with full Vietnamese UTF-8 diacritics preserved.
 * In Browser: renders wrapped Vietnamese lines onto crisp 1240x1754 HTML5 Canvas pages and embeds PNG pages into jsPDF.
 * In Node headless tests (no DOM canvas): falls back to clean jsPDF text generation returning valid %PDF- bytes.
 */
export function generateVietnamesePdfBytes(title: string, lines: string[]): Uint8Array {
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  if (typeof document !== 'undefined') {
    try {
      const canvasW = 1240;
      const canvasH = 1754;
      const marginX = 90;
      const maxWidth = canvasW - marginX * 2;
      const lineH = 34;

      const allWrapped: Array<{ text: string; bold?: boolean; color?: string }> = [
        { text: title, bold: true, color: '#0f172a' },
        { text: LEGAL_MANDATORY_DISCLAIMER, bold: true, color: '#b45309' },
        { text: '' },
      ];

      const probeCanvas = document.createElement('canvas');
      const probeCtx = probeCanvas.getContext('2d');
      if (probeCtx) {
        probeCtx.font = '24px "Segoe UI", Arial, sans-serif';
        for (const raw of lines) {
          if (!raw.trim()) {
            allWrapped.push({ text: '' });
            continue;
          }
          const words = raw.split(' ');
          let curr = '';
          for (const w of words) {
            const candidate = curr ? `${curr} ${w}` : w;
            if (probeCtx.measureText(candidate).width > maxWidth && curr) {
              allWrapped.push({
                text: curr,
                bold: curr.startsWith('ĐIỀU ') || curr.startsWith('1.') || curr.startsWith('2.'),
                color: curr.includes('[CẦN BỔ SUNG]') || curr.includes('CHƯA XÁC MINH') ? '#dc2626' : '#1e293b',
              });
              curr = w;
            } else {
              curr = candidate;
            }
          }
          if (curr) {
            allWrapped.push({
              text: curr,
              bold: curr.startsWith('ĐIỀU '),
              color: curr.includes('[CẦN BỔ SUNG]') || curr.includes('CHƯA XÁC MINH') ? '#dc2626' : '#1e293b',
            });
          }
        }

        const linesPerPage = Math.floor((canvasH - 180) / lineH);
        const totalPages = Math.max(1, Math.ceil(allWrapped.length / linesPerPage));

        for (let p = 0; p < totalPages; p++) {
          if (p > 0) doc.addPage();
          const c = document.createElement('canvas');
          c.width = canvasW;
          c.height = canvasH;
          const ctx = c.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvasW, canvasH);

          let y = 100;
          const slice = allWrapped.slice(p * linesPerPage, (p + 1) * linesPerPage);
          for (const item of slice) {
            ctx.fillStyle = item.color || '#1e293b';
            ctx.font = `${item.bold ? 'bold ' : ''}23px "Segoe UI", Arial, sans-serif`;
            ctx.fillText(item.text, marginX, y);
            y += lineH;
          }
          ctx.fillStyle = '#64748b';
          ctx.font = '18px "Segoe UI", Arial, sans-serif';
          ctx.fillText(`Trang ${p + 1}/${totalPages} — AI Company Pháp chế`, marginX, canvasH - 45);

          const dataUrl = c.toDataURL('image/png');
          doc.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
        }
        return new Uint8Array(doc.output('arraybuffer'));
      }
    } catch {
      // Fallback to text PDF below
    }
  }

  // Headless / Node fallback
  doc.setFontSize(12);
  let y = 44;
  for (const line of [title, LEGAL_MANDATORY_DISCLAIMER, ...lines]) {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 44;
    }
    doc.text(line.slice(0, 95), 36, y);
    y += 16;
  }
  return new Uint8Array(doc.output('arraybuffer'));
}

export function triggerBrowserDownload(bytes: Uint8Array, filename: string, mimeType: string): void {
  if (typeof window === 'undefined') return;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
