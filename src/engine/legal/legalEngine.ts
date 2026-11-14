import {
  ContractRecord,
  ContractTemplate,
  ContractVariant,
  LegalCitation,
  LegalDocument,
  LegalReportRecord,
  LegalRiskItem,
  LegalSettings,
} from '../../types';

export const LEGAL_MANDATORY_DISCLAIMER =
  'Tài liệu do AI soạn thảo để tham khảo, không phải tư vấn pháp lý chính thức. Cần người có thẩm quyền / luật sư kiểm tra trước khi ký hoặc thực hiện.';

const MISSING_TOKEN = '[CẦN BỔ SUNG]';

function isFieldVerifiedValue(val: string | undefined): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (trimmed.includes('CẦN BỔ SUNG')) return false;
  return true;
}

/**
 * Enforces the 6 mandatory fields on every LegalCitation.
 * Any citation missing one or more fields, or referring to an unverified law doc without sourceUrl,
 * is tagged "CHƯA XÁC MINH - CẦN LUẬT SƯ XÁC NHẬN" and marked verified=false so it MUST be excluded from conclusions.
 */
export function verifyCitationsStrict(
  rawCitations: Array<Partial<LegalCitation>>,
  legalDocs: LegalDocument[]
): {
  citations: LegalCitation[];
  verifiedCitations: LegalCitation[];
  unverifiedCount: number;
} {
  const citations: LegalCitation[] = rawCitations.map((c) => {
    const matchedDoc = legalDocs.find(
      (d) => d.docNumber === c.docNumber || d.title.toLowerCase() === (c.docTitle || '').toLowerCase()
    );
    const docTitle = (c.docTitle || matchedDoc?.title || '').trim();
    const docNumber = (c.docNumber || matchedDoc?.docNumber || '').trim();
    const articleClause = (c.articleClause || '').trim();
    const effectiveStatus = c.effectiveStatus || matchedDoc?.effectiveStatus || 'unverified';
    const sourceUrl = (c.sourceUrl || matchedDoc?.sourceUrl || '').trim();
    const checkedAt = (c.checkedAt || matchedDoc?.lastCheckedAt || '').trim();

    const hasAllSix =
      Boolean(docTitle) &&
      Boolean(docNumber) &&
      Boolean(articleClause) &&
      Boolean(effectiveStatus) &&
      /^https?:\/\//.test(sourceUrl) &&
      Boolean(checkedAt);

    const isStatusVerified = effectiveStatus !== 'unverified' && effectiveStatus !== 'expired';
    const verified = hasAllSix && isStatusVerified;

    return {
      docTitle: docTitle || 'Chưa rõ tên văn bản',
      docNumber: docNumber || 'Chưa rõ số hiệu',
      articleClause: articleClause || 'Chưa rõ điều/khoản',
      effectiveStatus,
      sourceUrl: sourceUrl || 'Chưa có nguồn vbpl.vn',
      checkedAt: checkedAt || 'Chưa kiểm tra',
      claimText: c.claimText || '',
      verified,
      verificationTag: verified ? 'VERIFIED' : 'CHƯA XÁC MINH - CẦN LUẬT SƯ XÁC NHẬN',
    };
  });

  const verifiedCitations = citations.filter((c) => c.verified);
  return {
    citations,
    verifiedCitations,
    unverifiedCount: citations.length - verifiedCitations.length,
  };
}

export function buildCitationsFromTemplate(
  template: ContractTemplate,
  legalDocs: LegalDocument[]
): LegalCitation[] {
  const docs = template.relatedLegalDocIds
    .map((id) => legalDocs.find((d) => d.id === id))
    .filter((d): d is LegalDocument => Boolean(d));

  const raw: Array<Partial<LegalCitation>> = docs.map((d) => ({
    docTitle: d.title,
    docNumber: d.docNumber,
    articleClause: d.keyArticlesSummary[0] || 'Quy định chung liên quan giao dịch',
    effectiveStatus: d.effectiveStatus,
    sourceUrl: d.sourceUrl,
    checkedAt: d.lastCheckedAt,
    claimText: d.keyArticlesSummary.join(' '),
  }));

  return verifyCitationsStrict(raw, legalDocs).citations;
}

export function evaluateLawyerEscalation(params: {
  contractValueVnd: number;
  thresholdVnd: number;
  involvesChildrenData: boolean;
  hasForeignElement: boolean;
  involvesSourceCodeSale: boolean;
  isLongTermExclusive: boolean;
  hasDispute: boolean;
}): { requiresRealLawyer: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (params.contractValueVnd > params.thresholdVnd) {
    reasons.push(
      `Giá trị hợp đồng (${params.contractValueVnd.toLocaleString('vi-VN')}đ) vượt ngưỡng ${params.thresholdVnd.toLocaleString('vi-VN')}đ.`
    );
  }
  if (params.involvesChildrenData) {
    reasons.push('Liên quan dữ liệu cá nhân trẻ em (trường mầm non / học sinh) — cần rà soát đồng ý phụ huynh & DPO.');
  }
  if (params.hasForeignElement) {
    reasons.push('Có yếu tố nước ngoài (đối tác ngoại / chuyển dữ liệu xuyên biên giới / ngoại tệ).');
  }
  if (params.involvesSourceCodeSale) {
    reasons.push('Liên quan chuyển nhượng/mua bán mã nguồn hoặc sở hữu trí tuệ cốt lõi.');
  }
  if (params.isLongTermExclusive) {
    reasons.push('Có điều khoản độc quyền hoặc cam kết dài hạn trên 24 tháng.');
  }
  if (params.hasDispute) {
    reasons.push('Phát sinh tranh chấp hoặc chấm dứt hợp đồng trước hạn.');
  }
  return { requiresRealLawyer: reasons.length > 0, reasons };
}

export function reviewContractClauses(params: {
  body: string;
  templateCategory: ContractTemplate['category'];
  contractValueVnd: number;
  involvesChildrenData: boolean;
  missingFields: string[];
  legalDocs: LegalDocument[];
}): LegalRiskItem[] {
  const risks: LegalRiskItem[] = [];
  const lower = params.body.toLowerCase();

  if (params.missingFields.length > 0) {
    risks.push({
      id: `risk_missing_${Date.now()}`,
      clauseRef: 'Thông tin Chủ thể & Giao dịch',
      severity: 'high',
      issue: `Còn ${params.missingFields.length} trường thông tin chưa được xác minh (${params.missingFields.join(', ')}).`,
      recommendation: 'Bổ sung đầy đủ từ HubCW hoặc giấy phép ĐKKD/CCCD do khách hàng cung cấp trước khi gửi ký.',
    });
  }

  // Check commercial penalty cap 8% (Điều 301 LTM 2005)
  const penaltyMatch = lower.match(/phạt[^\n]{0,40}(\d+)\s*%/);
  if (penaltyMatch && Number(penaltyMatch[1]) > 8) {
    risks.push({
      id: `risk_penalty_${Date.now()}`,
      clauseRef: 'Điều khoản Phạt vi phạm',
      severity: 'high',
      issue: `Mức phạt ${penaltyMatch[1]}% vượt trần 8% giá trị phần nghĩa vụ vi phạm đối với hợp đồng thương mại.`,
      recommendation: 'Điều chỉnh mức phạt vi phạm về tối đa 8% theo Điều 301 Luật Thương mại 2005.',
    });
  }

  if (
    (params.templateCategory === 'saas_preschool' || params.involvesChildrenData) &&
    !/cha,?\s*mẹ|người giám hộ|phụ huynh/.test(lower)
  ) {
    risks.push({
      id: `risk_child_consent_${Date.now()}`,
      clauseRef: 'Bảo vệ Dữ liệu Trẻ em',
      severity: 'high',
      issue: 'Thiếu điều khoản bắt buộc thu thập sự đồng ý của cha, mẹ hoặc người giám hộ trước khi xử lý dữ liệu trẻ em.',
      recommendation: 'Bổ sung cam kết của Bên B thu thập văn bản/opt-in xác thực của phụ huynh trước khi nhập hồ sơ trẻ.',
    });
  }

  if (!/hóa đơn điện tử|123\/2020/.test(lower) && params.contractValueVnd > 0) {
    risks.push({
      id: `risk_invoice_${Date.now()}`,
      clauseRef: 'Thanh toán & Hóa đơn',
      severity: 'medium',
      issue: 'Chưa nêu rõ nghĩa vụ và thời điểm xuất hóa đơn điện tử.',
      recommendation: 'Bổ sung điều khoản xuất hóa đơn điện tử theo Nghị định 123/2020/NĐ-CP.',
    });
  }

  if (!/bất khả kháng|force majeure/i.test(lower)) {
    risks.push({
      id: `risk_fm_${Date.now()}`,
      clauseRef: 'Điều khoản Chung',
      severity: 'low',
      issue: 'Chưa có điều khoản Sự kiện bất khả kháng & thông báo khắc phục.',
      recommendation: 'Cân nhắc bổ sung điều khoản Bất khả kháng theo Điều 156 Bộ luật Dân sự 2015.',
    });
  }

  return risks;
}

export function draftContractFromVerifiedData(params: {
  contractCode: string;
  template: ContractTemplate;
  variant: ContractVariant;
  legalSettings: LegalSettings;
  legalDocs: LegalDocument[];
  partyBInput: {
    name?: string;
    taxCode?: string;
    address?: string;
    representative?: string;
    sourceLabel?: string;
  };
  contractValueVnd: number;
  durationMonths: number;
  involvesChildrenData: boolean;
  hasForeignElement: boolean;
  involvesSourceCodeSale: boolean;
  isLongTermExclusive: boolean;
  hasDispute?: boolean;
  linkedLeadId?: string;
  linkedHubCwCustomerId?: string;
  createdBy: string;
}): ContractRecord {
  const now = Date.now();
  const s = params.legalSettings;
  const missingFields: string[] = [];
  const dataProvenanceMap: Record<string, string> = {};

  const checkPartyField = (val: string | undefined, label: string, source: string): string => {
    if (isFieldVerifiedValue(val)) {
      dataProvenanceMap[label] = source;
      return val!.trim();
    }
    missingFields.push(label);
    dataProvenanceMap[label] = 'THIẾU DỮ LIỆU THẬT';
    return MISSING_TOKEN;
  };

  const partyA = {
    name: checkPartyField(s.companyLegalName, 'Bên A · Tên pháp nhân', 'Cài đặt Pháp chế'),
    taxCode: checkPartyField(s.taxCode, 'Bên A · Mã số thuế', 'Cài đặt Pháp chế'),
    address: checkPartyField(s.legalAddress, 'Bên A · Địa chỉ trụ sở', 'Cài đặt Pháp chế'),
    representative: checkPartyField(s.representativeName, 'Bên A · Người đại diện', 'Cài đặt Pháp chế'),
    title: s.representativeTitle || 'Giám đốc',
    bankAccount: isFieldVerifiedValue(s.bankAccountInfo) ? s.bankAccountInfo : MISSING_TOKEN,
  };

  const bSource = params.partyBInput.sourceLabel || 'Dữ liệu khách hàng nhập tay';
  const partyB = {
    name: checkPartyField(params.partyBInput.name, 'Bên B · Tên đơn vị/cá nhân', bSource),
    taxCode: checkPartyField(params.partyBInput.taxCode, 'Bên B · MST/CCCD', bSource),
    address: checkPartyField(params.partyBInput.address, 'Bên B · Địa chỉ', bSource),
    representative: checkPartyField(params.partyBInput.representative, 'Bên B · Người đại diện', bSource),
  };

  const valText =
    params.contractValueVnd > 0 ? params.contractValueVnd.toLocaleString('vi-VN') : MISSING_TOKEN;
  if (valText === MISSING_TOKEN) {
    missingFields.push('Giá trị hợp đồng');
  }

  let body = params.template.defaultBody
    .replaceAll('{{CONTRACT_CODE}}', params.contractCode)
    .replaceAll('{{PARTY_A_NAME}}', partyA.name)
    .replaceAll('{{PARTY_A_TAX}}', partyA.taxCode)
    .replaceAll('{{PARTY_A_ADDRESS}}', partyA.address)
    .replaceAll('{{PARTY_A_REP}}', partyA.representative)
    .replaceAll('{{PARTY_A_TITLE}}', partyA.title)
    .replaceAll('{{PARTY_A_BANK}}', partyA.bankAccount)
    .replaceAll('{{PARTY_B_NAME}}', partyB.name)
    .replaceAll('{{PARTY_B_TAX}}', partyB.taxCode)
    .replaceAll('{{PARTY_B_ADDRESS}}', partyB.address)
    .replaceAll('{{PARTY_B_REP}}', partyB.representative)
    .replaceAll('{{CONTRACT_VALUE_VND}}', valText)
    .replaceAll('{{DURATION_MONTHS}}', String(params.durationMonths || 12))
    .replaceAll('{{STAMP_NOTE}}', s.defaultStampSignatureNote);

  // Add variant clause adjustment
  const variantHeader =
    params.variant === 'seller_friendly'
      ? '\n[BIẾN THỂ: CÓ LỢI CHO BÊN A (NHÀ CUNG CẤP) — Giới hạn trách nhiệm <= 100% phí đã thu, quyền tạm ngưng dịch vụ nếu quá hạn thanh toán 10 ngày.]\n'
      : params.variant === 'buyer_protective'
      ? '\n[BIẾN THỂ: BẢO VỆ MẠNH CHO BÊN B (KHÁCH HÀNG) — Bổ sung phạt chậm bàn giao, quyền xuất toàn bộ dữ liệu miễn phí trong 30 ngày khi chấm dứt.]\n'
      : '\n[BIẾN THỂ: CÂN BẰNG 2 BÊN — Phạt vi phạm tương xứng 8% theo LTM 2005, nghĩa vụ hỗ trợ chuyển giao dữ liệu chuẩn.]\n';

  body = `${LEGAL_MANDATORY_DISCLAIMER}\n${variantHeader}\n${body}`;

  const citations = buildCitationsFromTemplate(params.template, params.legalDocs);
  const risks = reviewContractClauses({
    body,
    templateCategory: params.template.category,
    contractValueVnd: params.contractValueVnd,
    involvesChildrenData: params.involvesChildrenData,
    missingFields,
    legalDocs: params.legalDocs,
  });

  const escalation = evaluateLawyerEscalation({
    contractValueVnd: params.contractValueVnd,
    thresholdVnd: s.lawyerEscalationThresholdVnd,
    involvesChildrenData: params.involvesChildrenData,
    hasForeignElement: params.hasForeignElement,
    involvesSourceCodeSale: params.involvesSourceCodeSale,
    isLongTermExclusive: params.isLongTermExclusive,
    hasDispute: Boolean(params.hasDispute),
  });

  const expiresDate = new Date(now + (params.durationMonths || 12) * 30 * 86400_000).toISOString().slice(0, 10);

  return {
    id: `ctr_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    contractCode: params.contractCode,
    templateId: params.template.id,
    title: `${params.template.name} — ${partyB.name}`,
    variant: params.variant,
    status: 'draft',
    partyA,
    partyB,
    dataProvenanceMap,
    missingFields,
    contractValueVnd: params.contractValueVnd,
    involvesChildrenData: params.involvesChildrenData,
    hasForeignElement: params.hasForeignElement,
    involvesSourceCodeSale: params.involvesSourceCodeSale,
    isLongTermExclusive: params.isLongTermExclusive,
    hasDispute: Boolean(params.hasDispute),
    requiresRealLawyer: escalation.requiresRealLawyer,
    lawyerReasons: escalation.reasons,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        content: body,
        variant: params.variant,
        editedBy: params.createdBy,
        note: `Khởi tạo bản nháp từ mẫu ${params.template.code}`,
        createdAt: now,
      },
    ],
    risks,
    citations,
    expiresAt: expiresDate,
    linkedLeadId: params.linkedLeadId,
    linkedHubCwCustomerId: params.linkedHubCwCustomerId,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Builds the 8-section structured Vietnamese Legal Report.
 * Unverified citations are tagged "CHƯA XÁC MINH - CẦN LUẬT SƯ XÁC NHẬN" and EXCLUDED from final conclusions.
 */
export function buildLegalReport(params: {
  contract?: ContractRecord;
  reportType: LegalReportRecord['reportType'];
  title: string;
  legalDocs: LegalDocument[];
  extraCitations?: Array<Partial<LegalCitation>>;
  createdBy: string;
}): LegalReportRecord {
  const rawCits: Array<Partial<LegalCitation>> = [
    ...(params.contract?.citations || []),
    ...(params.extraCitations || []),
  ];
  const { citations, verifiedCitations, unverifiedCount } = verifyCitationsStrict(rawCits, params.legalDocs);
  const c = params.contract;

  const partiesAndProvenance = c
    ? Object.entries(c.dataProvenanceMap).map(([field, source]) => ({
        field,
        value:
          field.startsWith('Bên A')
            ? c.partyA.name
            : field.startsWith('Bên B')
            ? c.partyB.name
            : String(c.contractValueVnd),
        source,
      }))
    : [{ field: 'Phạm vi báo cáo', value: params.title, source: 'Hệ thống Pháp chế nội bộ' }];

  const risks = c?.risks || [];
  const highRisks = risks.filter((r) => r.severity === 'high').length;

  const summaryFiveLines = [
    `1. Lưu ý: ${LEGAL_MANDATORY_DISCLAIMER}`,
    `2. Đối tượng rà soát: ${params.title}${c ? ` (${c.contractCode} · Giá trị ${c.contractValueVnd.toLocaleString('vi-VN')}đ)` : ''}.`,
    `3. Căn cứ pháp lý đã xác minh: ${verifiedCitations.length}/${citations.length} trích dẫn (đã loại ${unverifiedCount} mục chưa xác minh khỏi kết luận).`,
    `4. Phát hiện rủi ro: ${highRisks} rủi ro Mức Cao, ${risks.filter((r) => r.severity === 'medium').length} Mức Trung bình.`,
    c?.requiresRealLawyer
      ? `5. Khuyến nghị: BẮT BUỘC CHUYỂN LUẬT SƯ THẬT (${c.lawyerReasons[0] || 'Hợp đồng trọng yếu'}) trước khi CEO phê duyệt gửi.`
      : c && c.missingFields.length > 0
      ? `5. Khuyến nghị: Cần bổ sung ${c.missingFields.join(', ')} trước khi trình CEO duyệt gửi.`
      : '5. Khuyến nghị: Bản nháp đạt ngưỡng kiểm tra sơ bộ để trình CEO xem xét duyệt gửi.',
  ];

  const complianceChecklist: LegalReportRecord['complianceChecklist'] = [
    {
      item: 'Đủ thông tin pháp nhân 2 bên (không tự bịa MST/địa chỉ)',
      status: c && c.missingFields.length > 0 ? 'Cần sửa' : 'Đạt',
      note: c && c.missingFields.length > 0 ? `Còn thiếu: ${c.missingFields.join(', ')}` : 'Đã đối chiếu từ nguồn xác thực',
    },
    {
      item: 'Giới hạn phạt vi phạm <= 8% theo Điều 301 Luật Thương mại 2005',
      status: risks.some((r) => r.clauseRef.includes('Phạt')) ? 'Cần sửa' : 'Đạt',
      note: 'Kiểm tra tỷ lệ % phạt vi phạm trong dự thảo',
    },
    {
      item: 'Bảo vệ dữ liệu trẻ em & đồng ý của cha mẹ/người giám hộ (nếu là Mầm non)',
      status: c?.involvesChildrenData
        ? risks.some((r) => r.clauseRef.includes('Trẻ em'))
          ? 'Cần sửa'
          : 'Đạt'
        : 'Đạt',
      note: c?.involvesChildrenData ? 'Đã yêu cầu điều khoản đồng ý phụ huynh' : 'Không áp dụng',
    },
    {
      item: 'Trích dẫn văn bản quy phạm pháp luật có đủ 6 trường + URL nguồn vbpl.vn',
      status: unverifiedCount > 0 ? 'Chưa xác minh' : 'Đạt',
      note: `${unverifiedCount} trích dẫn chưa xác minh đã bị gắn cờ và loại khỏi kết luận.`,
    },
  ];

  const humanDecisionPoints: string[] = [];
  if (c?.requiresRealLawyer) {
    humanDecisionPoints.push(`Chuyển Luật sư thật rà soát: ${c.lawyerReasons.join(' | ')}`);
  }
  if (c && c.missingFields.length > 0) {
    humanDecisionPoints.push(`Bổ sung dữ liệu thật cho các trường [CẦN BỔ SUNG]: ${c.missingFields.join(', ')}`);
  }
  if (unverifiedCount > 0) {
    humanDecisionPoints.push(`Kiểm tra lại ${unverifiedCount} văn bản pháp luật đang ở trạng thái CHƯA XÁC MINH trên vbpl.vn.`);
  }
  if (humanDecisionPoints.length === 0) {
    humanDecisionPoints.push('CEO xác nhận cuối cùng để mở khóa nút Gửi/Xuất bản hợp đồng.');
  }

  return {
    id: `lrep_${Date.now().toString(36)}`,
    reportType: params.reportType,
    title: params.title,
    contractId: c?.id,
    summaryFiveLines,
    partiesAndProvenance,
    citations,
    complianceChecklist,
    risks,
    humanDecisionPoints,
    executionGuide: [
      'Bước 1: Đọc kỹ các điểm [CẦN BỔ SUNG] và rủi ro Mức Cao.',
      'Bước 2: Nếu thuộc diện bắt buộc chuyển luật sư, gửi file .docx cho luật sư đối tác rà soát.',
      'Bước 3: Sau khi hoàn thiện, chỉ CEO thực hiện lệnh "Duyệt & Mở khóa gửi" (permission contract:send).',
    ],
    unverifiedExcludedCount: unverifiedCount,
    createdBy: params.createdBy,
    createdAt: Date.now(),
  };
}

export interface RedlineDiffLine {
  type: 'same' | 'added' | 'removed';
  text: string;
}

export function computeRedlineDiff(oldText: string, newText: string): RedlineDiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  const diff: RedlineDiffLine[] = [];

  for (const line of oldLines) {
    if (!newSet.has(line)) {
      diff.push({ type: 'removed', text: line });
    }
  }
  for (const line of newLines) {
    if (oldSet.has(line)) {
      diff.push({ type: 'same', text: line });
    } else {
      diff.push({ type: 'added', text: line });
    }
  }
  return diff;
}

export function checkLawChangeImpact(params: {
  changedDocId: string;
  newStatus: LegalDocument['effectiveStatus'];
  templates: ContractTemplate[];
  contracts: ContractRecord[];
}): {
  affectedTemplateIds: string[];
  affectedContractIds: string[];
} {
  if (params.newStatus === 'effective') {
    return { affectedTemplateIds: [], affectedContractIds: [] };
  }
  const affectedTemplateIds = params.templates
    .filter((t) => t.relatedLegalDocIds.includes(params.changedDocId))
    .map((t) => t.id);

  const affectedContractIds = params.contracts
    .filter(
      (c) =>
        affectedTemplateIds.includes(c.templateId) &&
        c.status !== 'liquidated' &&
        c.status !== 'terminated'
    )
    .map((c) => c.id);

  return { affectedTemplateIds, affectedContractIds };
}
