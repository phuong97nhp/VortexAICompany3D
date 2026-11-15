import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  FileCheck2,
  GitCompare,
  Scale,
  Send,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { computeRedlineDiff, LEGAL_MANDATORY_DISCLAIMER } from '../../engine/legal/legalEngine';
import {
  generateContractDocxBuffer,
  generateLegalReportDocxBuffer,
  generateVietnamesePdfBytes,
  triggerBrowserDownload,
} from '../../engine/legal/legalExport';
import { authorize } from '../../engine/rbac';
import { useCompanyStore } from '../../store/useCompanyStore';
import { ContractVariant, LegalDocument } from '../../types';

type LegalSubTab = 'draft' | 'manage' | 'laws' | 'reports' | 'risk_pdpa' | 'settings';

function HighlightMissingTokens({ text }: { text: string }) {
  const parts = text.split(/(\[CẦN BỔ SUNG\])/g);
  return (
    <pre className="whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed text-slate-800 dark:text-slate-200">
      {parts.map((part, i) =>
        part === '[CẦN BỔ SUNG]' ? (
          <span
            key={i}
            className="inline-block px-1.5 py-0.2 mx-0.5 rounded bg-rose-600 text-white font-bold text-[10.5px]"
          >
            [CẦN BỔ SUNG]
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </pre>
  );
}

export function LegalPanel() {
  const settings = useCompanyStore((s) => s.settings);
  const accounts = useCompanyStore((s) => s.accounts);
  const leads = useCompanyStore((s) => s.leads);
  const legalDocuments = useCompanyStore((s) => s.legalDocuments);
  const contractTemplates = useCompanyStore((s) => s.contractTemplates);
  const contracts = useCompanyStore((s) => s.contracts);
  const legalReports = useCompanyStore((s) => s.legalReports);
  const legalRisks = useCompanyStore((s) => s.legalRisks);
  const dataProcessings = useCompanyStore((s) => s.dataProcessings);
  const dsarRequests = useCompanyStore((s) => s.dsarRequests);

  const updateLegalSettings = useCompanyStore((s) => s.updateLegalSettings);
  const draftNewContract = useCompanyStore((s) => s.draftNewContract);
  const saveContractRevision = useCompanyStore((s) => s.saveContractRevision);
  const submitContractForCeoApproval = useCompanyStore((s) => s.submitContractForCeoApproval);
  const ceoApproveAndUnlockContractSend = useCompanyStore((s) => s.ceoApproveAndUnlockContractSend);
  const sendContractToClient = useCompanyStore((s) => s.sendContractToClient);
  const runLegalReportForContract = useCompanyStore((s) => s.runLegalReportForContract);
  const checkLegalUpdatesOnline = useCompanyStore((s) => s.checkLegalUpdatesOnline);
  const simulateLawStatusChange = useCompanyStore((s) => s.simulateLawStatusChange);
  const putLegalRisk = useCompanyStore((s) => s.putLegalRisk);
  const putDsarRequest = useCompanyStore((s) => s.putDsarRequest);

  const [subTab, setSubTab] = useState<LegalSubTab>('draft');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Draft composer state
  const [templateId, setTemplateId] = useState(contractTemplates[0]?.id || 'tpl_saas_edu');
  const [variant, setVariant] = useState<ContractVariant>('balanced');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [partyBName, setPartyBName] = useState('');
  const [partyBTax, setPartyBTax] = useState('');
  const [partyBAddr, setPartyBAddr] = useState('');
  const [partyBRep, setPartyBRep] = useState('');
  const [contractValueVnd, setContractValueVnd] = useState(36_000_000);
  const [durationMonths, setDurationMonths] = useState(12);
  const [involvesChildren, setInvolvesChildren] = useState(false);
  const [hasForeign, setHasForeign] = useState(false);
  const [involvesSourceSale, setInvolvesSourceSale] = useState(false);

  // Manage & Diff viewer state
  const [selectedContractId, setSelectedContractId] = useState(contracts[0]?.id || '');
  const [editContent, setEditContent] = useState('');
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [diffBaseVer, setDiffBaseVer] = useState<number>(1);

  // Legal settings form
  const legalSettings = settings.legal;
  const [compName, setCompName] = useState(legalSettings?.companyLegalName || '');
  const [compTax, setCompTax] = useState(legalSettings?.taxCode || '');
  const [compAddr, setCompAddr] = useState(legalSettings?.legalAddress || '');
  const [compRep, setCompRep] = useState(legalSettings?.representativeName || '');
  const [compBank, setCompBank] = useState(legalSettings?.bankAccountInfo || '');
  const [thresholdVnd, setThresholdVnd] = useState(legalSettings?.lawyerEscalationThresholdVnd || 100_000_000);

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === selectedContractId) || contracts[0],
    [contracts, selectedContractId]
  );

  const drafterAcc = accounts.find((a) => a.agentId === 'contract_drafter');
  const contractDrafterHasSendPerm = authorize(
    drafterAcc,
    'contract:send',
    'contract:send',
    'Soạn thảo HĐ'
  ).allowed;

  const handleSelectLeadPrefill = (leadId: string) => {
    setSelectedLeadId(leadId);
    const ld = leads.find((l) => l.id === leadId);
    if (ld) {
      setPartyBName(ld.name);
      setPartyBAddr(ld.address || '');
      setPartyBRep(ld.name);
      setContractValueVnd(ld.estimatedValueVnd || 24_000_000);
      setInvolvesChildren(ld.category === 'Trường mầm non' || ld.recommendedProductId.includes('preschool'));
    }
  };

  const handleDraft = async () => {
    const rec = await draftNewContract({
      templateId,
      variant,
      partyBInput: {
        name: partyBName || undefined,
        taxCode: partyBTax || undefined,
        address: partyBAddr || undefined,
        representative: partyBRep || undefined,
        sourceLabel: selectedLeadId ? `CRM Lead #${selectedLeadId}` : 'CEO nhập trực tiếp',
      },
      contractValueVnd,
      durationMonths,
      involvesChildrenData: involvesChildren || templateId === 'tpl_saas_preschool',
      hasForeignElement: hasForeign,
      involvesSourceCodeSale: involvesSourceSale,
      linkedLeadId: selectedLeadId || undefined,
      createdBy: 'contract_drafter',
    });
    setSelectedContractId(rec.id);
    setSubTab('manage');
    setFeedback(
      `Đã tạo ${rec.contractCode} (${rec.missingFields.length} trường [CẦN BỔ SUNG], ${rec.risks.length} lưu ý rủi ro).`
    );
  };

  const handleDownloadContractDocx = async () => {
    if (!selectedContract) return;
    const bytes = await generateContractDocxBuffer(selectedContract);
    triggerBrowserDownload(
      bytes,
      `${selectedContract.contractCode.replace('#', '')}.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  };

  const handleDownloadContractPdf = () => {
    if (!selectedContract) return;
    const latest = selectedContract.versions[selectedContract.versions.length - 1];
    const bytes = generateVietnamesePdfBytes(selectedContract.title, (latest?.content || '').split('\n'));
    triggerBrowserDownload(bytes, `${selectedContract.contractCode.replace('#', '')}.pdf`, 'application/pdf');
  };

  const handleDownloadReportDocx = async (repId: string) => {
    const rep = legalReports.find((r) => r.id === repId);
    if (!rep) return;
    const bytes = await generateLegalReportDocxBuffer(rep);
    triggerBrowserDownload(
      bytes,
      `bao-cao-phap-ly-${rep.id}.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  };

  const handleDownloadReportPdf = (repId: string) => {
    const rep = legalReports.find((r) => r.id === repId);
    if (!rep) return;
    const lines = [
      ...rep.summaryFiveLines,
      '',
      'RỦI RO:',
      ...rep.risks.map((r) => `[${r.severity}] ${r.clauseRef}: ${r.issue} -> ${r.recommendation}`),
      '',
      'ĐIỂM CẦN QUYẾT ĐỊNH:',
      ...rep.humanDecisionPoints,
    ];
    const bytes = generateVietnamesePdfBytes(`BÁO CÁO PHÁP LÝ: ${rep.title}`, lines);
    triggerBrowserDownload(bytes, `bao-cao-phap-ly-${rep.id}.pdf`, 'application/pdf');
  };

  const redlineDiff = useMemo(() => {
    if (!selectedContract || selectedContract.versions.length < 2) return [];
    const base = selectedContract.versions.find((v) => v.version === diffBaseVer) || selectedContract.versions[0];
    const latest = selectedContract.versions[selectedContract.versions.length - 1];
    return computeRedlineDiff(base.content, latest.content);
  }, [selectedContract, diffBaseVer]);

  return (
    <div className="h-full flex flex-col overflow-hidden text-xs">
      {/* Header + Mandatory Disclaimer */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-violet-500" />
            <span>Tầng 2 · Phòng Pháp chế & Hợp đồng VN</span>
          </h3>
          <span className="px-2 py-0.5 rounded bg-violet-500/15 text-violet-500 font-semibold text-[10.5px]">
            Chặn gửi nếu thiếu quyền CEO
          </span>
        </div>
        <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-700 dark:text-amber-300 text-[10.5px] font-medium">
          {LEGAL_MANDATORY_DISCLAIMER}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-1">
        {(
          [
            ['draft', 'Soạn hợp đồng'],
            ['manage', `Quản lý & Duyệt (${contracts.length})`],
            ['laws', `Kho Luật VN (${legalDocuments.length})`],
            ['reports', `Báo cáo Pháp lý (${legalReports.length})`],
            ['risk_pdpa', `Rủi ro & PDPA (${legalRisks.length})`],
            ['settings', 'Pháp nhân Bên A'],
          ] as Array<[LegalSubTab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer ${
              subTab === id
                ? 'bg-violet-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {feedback && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-700 dark:text-sky-300 text-[11px] font-medium">
          {feedback}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* 1. SOẠN HỢP ĐỒNG */}
        {subTab === 'draft' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10.5px] font-semibold text-slate-500 block mb-1">Mẫu hợp đồng (11 mẫu chuẩn)</label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  {contractTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} · {t.name} {t.needsLawUpdateReview ? '(Cần rà luật mới)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10.5px] font-semibold text-slate-500 block mb-1">Biến thể điều khoản</label>
                <select
                  value={variant}
                  onChange={(e) => setVariant(e.target.value as ContractVariant)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  <option value="balanced">Cân bằng hai bên (Khuyên dùng)</option>
                  <option value="seller_friendly">Có lợi cho Nhà cung cấp (Bên A)</option>
                  <option value="buyer_protective">Bảo vệ Khách hàng (Bên B)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-slate-500 block mb-1">
                Lấy thông tin thật từ Lead CRM (trống giữ [CẦN BỔ SUNG])
              </label>
              <select
                value={selectedLeadId}
                onChange={(e) => handleSelectLeadPrefill(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              >
                <option value="">-- Nhập tay Bên B --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.category}) · {l.estimatedValueVnd.toLocaleString('vi-VN')}đ
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={partyBName}
                onChange={(e) => setPartyBName(e.target.value)}
                placeholder="Tên pháp nhân Bên B (để trống -> [CẦN BỔ SUNG])"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <input
                type="text"
                value={partyBTax}
                onChange={(e) => setPartyBTax(e.target.value)}
                placeholder="Mã số thuế / CCCD Bên B"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <input
                type="text"
                value={partyBAddr}
                onChange={(e) => setPartyBAddr(e.target.value)}
                placeholder="Địa chỉ trụ sở Bên B"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <input
                type="text"
                value={partyBRep}
                onChange={(e) => setPartyBRep(e.target.value)}
                placeholder="Người đại diện ký Bên B"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10.5px] text-slate-500 block mb-1">Giá trị hợp đồng (VNĐ)</label>
                <input
                  type="number"
                  value={contractValueVnd}
                  onChange={(e) => setContractValueVnd(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                />
              </div>
              <div>
                <label className="text-[10.5px] text-slate-500 block mb-1">Thời hạn (tháng)</label>
                <input
                  type="number"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={involvesChildren} onChange={(e) => setInvolvesChildren(e.target.checked)} />
                <span>Dữ liệu trẻ em (Mầm non)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={hasForeign} onChange={(e) => setHasForeign(e.target.checked)} />
                <span>Có yếu tố nước ngoài</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={involvesSourceSale} onChange={(e) => setInvolvesSourceSale(e.target.checked)} />
                <span>Chuyển giao mã nguồn</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleDraft}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Soạn hợp đồng & Rà soát rủi ro</span>
            </button>
          </div>
        )}

        {/* 2. QUẢN LÝ & PHÊ DUYỆT */}
        {subTab === 'manage' && (
          <>
            {contracts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-slate-500">
                Chưa có hợp đồng nào. Chuyển sang tab "Soạn hợp đồng" để tạo bản nháp đầu tiên.
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={selectedContract?.id || ''}
                  onChange={(e) => {
                    setSelectedContractId(e.target.value);
                    setEditingContractId(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
                >
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contractCode} · {c.title} [{c.status}]
                    </option>
                  ))}
                </select>

                {selectedContract && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {selectedContract.contractCode} · v{selectedContract.currentVersion}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Trạng thái: <strong>{selectedContract.status}</strong> · Giá trị:{' '}
                          {selectedContract.contractValueVnd.toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleDownloadContractDocx}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>.DOCX</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadContractPdf}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>.PDF</span>
                        </button>
                      </div>
                    </div>

                    {selectedContract.requiresRealLawyer && (
                      <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-300 text-[11px] flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold">CẦN LUẬT SƯ THẬT RÀ SOÁT TRƯỚC KHI KÝ:</div>
                          <div>{selectedContract.lawyerReasons.join(' · ')}</div>
                        </div>
                      </div>
                    )}

                    {selectedContract.needsLawUpdateReview && (
                      <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-300 text-[11px]">
                        Cảnh báo hiệu lực luật thay đổi: cần rà soát lại căn cứ pháp luật của hợp đồng này!
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await submitContractForCeoApproval(selectedContract.id);
                          setFeedback(`Đã trình ${selectedContract.contractCode} lên CEO (Zalo / Phê duyệt).`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Trình CEO duyệt
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await ceoApproveAndUnlockContractSend(selectedContract.id, 'web');
                          setFeedback(`CEO đã duyệt & mở khóa nút Gửi cho ${selectedContract.contractCode}.`);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>CEO Duyệt & Mở khóa gửi</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await sendContractToClient(selectedContract.id, 'ceo');
                          setFeedback(res.ok ? `Đã xuất & gửi ${selectedContract.contractCode} cho đối tác.` : res.error || 'Bị chặn');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi đối tác (CEO only)</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const rep = await runLegalReportForContract(selectedContract.id, 'legal');
                          if (rep) {
                            setSubTab('reports');
                            setFeedback(`Đã xuất Báo cáo Pháp lý 8 phần cho ${selectedContract.contractCode}.`);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Tạo Báo cáo Pháp lý</span>
                      </button>
                    </div>

                    <div className="text-[10.5px] text-slate-400">
                      RBAC guard: Tài khoản AI (contract_drafter) có quyền <code>contract:send</code>?{' '}
                      <strong>{contractDrafterHasSendPerm ? 'CÓ' : 'KHÔNG (Bị chặn cứng)'}</strong>
                    </div>

                    {/* Contract Body / Editor */}
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-950/70 max-h-72 overflow-y-auto">
                      {editingContractId === selectedContract.id ? (
                        <div className="space-y-2">
                          <textarea
                            rows={10}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                await saveContractRevision(selectedContract.id, editContent, 'Chỉnh sửa câu chữ điều khoản', 'ceo');
                                setEditingContractId(null);
                                setFeedback('Đã lưu phiên bản mới & cập nhật Redline Diff.');
                              }}
                              className="px-3 py-1 rounded bg-emerald-600 text-white font-semibold cursor-pointer"
                            >
                              Lưu phiên bản v{selectedContract.currentVersion + 1}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingContractId(null)}
                              className="px-3 py-1 rounded bg-slate-700 text-white cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-end mb-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const latest = selectedContract.versions[selectedContract.versions.length - 1];
                                setEditContent(latest?.content || '');
                                setEditingContractId(selectedContract.id);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10.5px] font-semibold cursor-pointer"
                            >
                              Chỉnh sửa & Tạo version mới
                            </button>
                          </div>
                          <HighlightMissingTokens
                            text={selectedContract.versions[selectedContract.versions.length - 1]?.content || ''}
                          />
                        </>
                      )}
                    </div>

                    {/* Redline Diff */}
                    {selectedContract.versions.length >= 2 && (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1 text-sky-500">
                            <GitCompare className="w-3.5 h-3.5" />
                            <span>So sánh Redline (v{diffBaseVer} → v{selectedContract.currentVersion})</span>
                          </span>
                          <select
                            value={diffBaseVer}
                            onChange={(e) => setDiffBaseVer(Number(e.target.value))}
                            className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-transparent text-[11px]"
                          >
                            {selectedContract.versions.slice(0, -1).map((v) => (
                              <option key={v.version} value={v.version}>
                                So với v{v.version}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="max-h-36 overflow-y-auto font-mono text-[10.5px] space-y-0.5">
                          {redlineDiff
                            .filter((d) => d.type !== 'same')
                            .map((d, i) => (
                              <div
                                key={i}
                                className={
                                  d.type === 'added'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 px-1.5'
                                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-300 line-through px-1.5'
                                }
                              >
                                {d.type === 'added' ? '+ ' : '- '}
                                {d.text}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 3. KHO PHÁP LUẬT VN */}
        {subTab === 'laws' && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500">
                Chỉ kết luận dựa trên văn bản đủ 6 trường & xác minh hiệu lực từ vbpl.vn / congbao.chinhphu.vn.
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await checkLegalUpdatesOnline();
                  setFeedback(res.message);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Kiểm tra cập nhật pháp luật</span>
              </button>
            </div>
            {legalDocuments.map((doc: LegalDocument) => (
              <div
                key={doc.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {doc.docType} {doc.docNumber} · {doc.title}
                    </div>
                    <div className="text-[10.5px] text-slate-400">
                      {doc.issuingBody} · Hiệu lực: {doc.effectiveDate} · Kiểm tra: {doc.lastCheckedAt}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      doc.effectiveStatus === 'effective'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : doc.effectiveStatus === 'unverified'
                        ? 'bg-amber-500/15 text-amber-500'
                        : 'bg-rose-500/15 text-rose-500'
                    }`}
                  >
                    {doc.effectiveStatus === 'unverified' ? 'CHƯA XÁC MINH' : doc.effectiveStatus}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">{doc.keyArticlesSummary.join(' · ')}</div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10.5px] font-mono text-sky-500 truncate">{doc.sourceUrl}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await simulateLawStatusChange(doc.id, 'amended', 'Cập nhật giả lập thay đổi luật để rà soát');
                      setFeedback(
                        `Đã gắn cờ thay đổi hiệu lực cho ${doc.docNumber}: ảnh hưởng ${res.affectedTemplates} mẫu & ${res.affectedContracts} hợp đồng.`
                      );
                    }}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 text-[10.5px] font-semibold cursor-pointer"
                  >
                    Đánh dấu sửa đổi / Rà mẫu HĐ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4. BÁO CÁO PHÁP LÝ 8 PHẦN */}
        {subTab === 'reports' && (
          <div className="space-y-3">
            {legalReports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-slate-500">
                Chưa có Báo cáo Pháp lý nào. Chọn một hợp đồng trong "Quản lý & Duyệt" rồi bấm "Tạo Báo cáo Pháp lý".
              </div>
            ) : (
              legalReports.map((rep) => (
                <div
                  key={rep.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-slate-900 dark:text-white">{rep.title}</div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadReportDocx(rep.id)}
                        className="px-2 py-1 rounded bg-sky-600 text-white text-[10.5px] font-semibold cursor-pointer"
                      >
                        .DOCX
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadReportPdf(rep.id)}
                        className="px-2 py-1 rounded bg-rose-600 text-white text-[10.5px] font-semibold cursor-pointer"
                      >
                        .PDF
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px] bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg">
                    <div className="font-semibold text-violet-500">Tóm tắt 5 dòng:</div>
                    {rep.summaryFiveLines.map((l, idx) => (
                      <div key={idx}>{l}</div>
                    ))}
                  </div>
                  {rep.unverifiedExcludedCount > 0 && (
                    <div className="text-[11px] text-amber-500 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>
                        Đã loại {rep.unverifiedExcludedCount} trích dẫn CHƯA XÁC MINH khỏi kết luận pháp lý.
                      </span>
                    </div>
                  )}
                  <div className="text-[11px]">
                    <div className="font-semibold mb-1">Điểm cần con người / Luật sư quyết định:</div>
                    {rep.humanDecisionPoints.map((pt, i) => (
                      <div key={i} className="text-slate-600 dark:text-slate-300">• {pt}</div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 5. CÀI ĐẶT PHÁP NHÂN BÊN A */}
        {subTab === 'settings' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2.5">
            <div className="font-bold text-slate-900 dark:text-white">Thông tin pháp nhân công ty thật (Bên A)</div>
            <p className="text-[11px] text-slate-500">
              Hệ thống chỉ điền các thông tin này vào hợp đồng; trường còn thiếu giữ nguyên <strong>[CẦN BỔ SUNG]</strong>.
            </p>
            <input
              type="text"
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              placeholder="Tên công ty đầy đủ theo ĐKKD"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={compTax}
                onChange={(e) => setCompTax(e.target.value)}
                placeholder="Mã số thuế"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <input
                type="text"
                value={compRep}
                onChange={(e) => setCompRep(e.target.value)}
                placeholder="Người đại diện theo pháp luật"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
            </div>
            <input
              type="text"
              value={compAddr}
              onChange={(e) => setCompAddr(e.target.value)}
              placeholder="Địa chỉ trụ sở chính"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
            <input
              type="text"
              value={compBank}
              onChange={(e) => setCompBank(e.target.value)}
              placeholder="Tài khoản ngân hàng công ty"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
            <div>
              <label className="text-[10.5px] text-slate-500 block mb-1">
                Ngưỡng giá trị bắt buộc chuyển Luật sư thật (VNĐ)
              </label>
              <input
                type="number"
                value={thresholdVnd}
                onChange={(e) => setThresholdVnd(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                await updateLegalSettings({
                  companyLegalName: compName,
                  taxCode: compTax,
                  legalAddress: compAddr,
                  representativeName: compRep,
                  bankAccountInfo: compBank,
                  lawyerEscalationThresholdVnd: thresholdVnd,
                });
                setFeedback('Đã lưu thông tin pháp nhân Bên A.');
              }}
              className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold cursor-pointer"
            >
              Lưu hồ sơ Pháp nhân
            </button>
          </div>
        )}

        {subTab === 'risk_pdpa' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white">
                Sổ đăng ký Rủi ro Tuân thủ (Risk Register · {legalRisks.length})
              </div>
              {legalRisks.map((rk) => (
                <div key={rk.id} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">
                      <span className="font-mono-num text-rose-500 mr-1.5">{rk.code}</span>
                      {rk.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => putLegalRisk({ ...rk, status: rk.status === 'closed' ? 'mitigating' : 'closed' })}
                      className="px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-500 text-[10.5px] cursor-pointer shrink-0"
                    >
                      {rk.status === 'closed' ? 'Đã đóng' : 'Đánh dấu Đóng'}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Lĩnh vực: {rk.domain} · Khả năng: {rk.likelihood} · Tác động: {rk.impact} · Giảm thiểu: {rk.mitigationPlan}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white">
                Nhật ký Xử lý Dữ liệu Cá nhân (NĐ 13/2023 · {dataProcessings.length})
              </div>
              {dataProcessings.map((dp) => (
                <div key={dp.id} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] space-y-0.5">
                  <div className="font-bold text-xs">{dp.processName}</div>
                  <div>Dữ liệu: {dp.dataCategories}</div>
                  <div>Căn cứ pháp lý: {dp.legalBasis} · Lưu trữ: {dp.retentionPeriod}</div>
                  <div className="text-emerald-500">Bảo mật: {dp.securityMeasures}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white">
                Yêu cầu Quyền Chủ thể Dữ liệu (DSAR · {dsarRequests.length})
              </div>
              {dsarRequests.map((d) => (
                <div key={d.id} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold">
                      <span className="font-mono-num text-violet-500 mr-1.5">{d.code}</span>
                      {d.requesterMasked} ({d.requestType.toUpperCase()})
                    </div>
                    <div className="text-[11px] text-slate-400">Hạn: {d.dueDate} · Trạng thái: {d.status}</div>
                  </div>
                  {d.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => putDsarRequest({ ...d, status: 'completed' })}
                      className="px-2.5 py-1 rounded bg-violet-600 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      Hoàn tất DSAR
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
