import { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  Download,
  Edit3,
  History,
  KeyRound,
  Lock,
  PauseCircle,
  PlayCircle,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  ACCESSORIES,
  getDefaultAppearance,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_STYLES,
  SKIN_TONES,
} from '../../engine/characterAppearance';
import { formatVnd } from '../../engine/expenseEngine';
import {
  allocateDeskForDepartment,
  collectAgentHandoverItems,
  estimateMonthlyTokenCost,
} from '../../engine/hrEngine';
import { ALL_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS, ROLE_LABELS } from '../../engine/rbac';
import {
  buildVietnameseSystemPrompt,
  foldVietnamese,
  generateVietnameseName,
  ROLE_TEMPLATES,
  suggestToolsForDescription,
} from '../../engine/roleTemplates';
import { executeAgentTool } from '../../engine/tools';
import { useCompanyStore } from '../../store/useCompanyStore';
import {
  AccessoryId,
  AgentAppearance,
  AgentProfile,
  EmploymentStatus,
  HairStyleId,
  OutfitStyleId,
  Permission,
  ProviderId,
  RoleType,
  ToolName,
} from '../../types';
import { ChibiModel } from '../office3d/ChibiModel';

type HrSubTab = 'roster' | 'depts' | 'rbac' | 'audit';

const ALL_TOOLS: Array<{ name: ToolName; label: string }> = [
  { name: 'write_document', label: 'Viết tài liệu' },
  { name: 'find_leads', label: 'Tìm kiếm Lead' },
  { name: 'save_lead', label: 'Lưu Lead CRM' },
  { name: 'update_lead', label: 'Cập nhật CRM' },
  { name: 'score_lead', label: 'Chấm điểm Lead' },
  { name: 'send_outreach', label: 'Gửi tin tiếp cận' },
  { name: 'schedule_followup', label: 'Đặt lịch Follow-up' },
  { name: 'create_quote', label: 'Tạo báo giá' },
  { name: 'generate_brand_kit', label: 'Tạo Brand Kit' },
  { name: 'schedule_social_post', label: 'Lên lịch bài MXH' },
  { name: 'publish_social_post', label: 'Đăng bài MXH' },
  { name: 'reply_social_comment', label: 'Trả lời bình luận' },
  { name: 'create_ad_campaign', label: 'Tạo chiến dịch Ads' },
  { name: 'get_kpis', label: 'Đọc số liệu KPI' },
  { name: 'generate_report', label: 'Xuất báo cáo' },
  { name: 'assign_task', label: 'Giao việc nội bộ' },
  { name: 'call_meeting', label: 'Triệu tập họp' },
  { name: 'request_expense', label: 'Đề xuất chi phí' },
  { name: 'review_expense', label: 'Kế toán thẩm định chi' },
  { name: 'pay_expense', label: 'Thanh toán & đối soát' },
  { name: 'hire_agent', label: 'Tuyển nhân sự' },
  { name: 'ask_ceo', label: 'Hỏi CEO (Zalo)' },
  { name: 'read_memory', label: 'Đọc bộ nhớ' },
  { name: 'write_memory', label: 'Ghi bộ nhớ' },
];

const DEPT_COLORS = ['#10B981', '#EC4899', '#3B82F6', '#06B6D4', '#6366F1', '#8B5CF6', '#F97316', '#EAB308'];

function ChibiPreviewCanvas({ appearance }: { appearance: AgentAppearance }) {
  return (
    <div className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-900 overflow-hidden relative">
      <Canvas camera={{ position: [0, 1.15, 2.35], fov: 36 }}>
        <color attach="background" args={['#0F172A']} />
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 4, 4]} intensity={1.3} />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#BAE6FD" />
        <Suspense fallback={null}>
          <group position={[0, -0.72, 0]}>
            <ChibiModel appearance={appearance} status="idle" simplifiedLod={false} showOutline />
          </group>
          <OrbitControls enablePan={false} enableZoom={false} target={[0, 0.25, 0]} autoRotate autoRotateSpeed={2.2} />
        </Suspense>
      </Canvas>
      <div className="absolute bottom-2 left-2 right-2 text-center text-[10px] text-slate-400 pointer-events-none">
        Kéo chuột để xoay 360° xem trước nhân vật 3D
      </div>
    </div>
  );
}

export function HrManagementPanel() {
  const agents = useCompanyStore((s) => s.agents);
  const departments = useCompanyStore((s) => s.departments);
  const accounts = useCompanyStore((s) => s.accounts);
  const auditLogs = useCompanyStore((s) => s.auditLogs);
  const hrAudits = useCompanyStore((s) => s.hrAudits);
  const tasks = useCompanyStore((s) => s.tasks);
  const leads = useCompanyStore((s) => s.leads);
  const vaultStatuses = useCompanyStore((s) => s.vaultStatuses);
  const approvals = useCompanyStore((s) => s.approvals);
  const settings = useCompanyStore((s) => s.settings);
  const agentAppearances = useCompanyStore((s) => s.agentAppearances);

  const selectAgent = useCompanyStore((s) => s.selectAgent);
  const hireAgent = useCompanyStore((s) => s.hireAgent);
  const hireBatchTeam = useCompanyStore((s) => s.hireBatchTeam);
  const updateAgentProfile = useCompanyStore((s) => s.updateAgentProfile);
  const cloneAgent = useCompanyStore((s) => s.cloneAgent);
  const suspendAgent = useCompanyStore((s) => s.suspendAgent);
  const offboardAgent = useCompanyStore((s) => s.offboardAgent);
  const rehireAgent = useCompanyStore((s) => s.rehireAgent);
  const deleteAgentPermanently = useCompanyStore((s) => s.deleteAgentPermanently);
  const createDepartment = useCompanyStore((s) => s.createDepartment);
  const updateDepartment = useCompanyStore((s) => s.updateDepartment);
  const deleteDepartment = useCompanyStore((s) => s.deleteDepartment);
  const importRosterJson = useCompanyStore((s) => s.importRosterJson);
  const saveAgentAppearance = useCompanyStore((s) => s.saveAgentAppearance);
  const updateAccountRole = useCompanyStore((s) => s.updateAccountRole);
  const toggleAccountPermission = useCompanyStore((s) => s.toggleAccountPermission);
  const toggleAccountSuspended = useCompanyStore((s) => s.toggleAccountSuspended);
  const resetAgentToken = useCompanyStore((s) => s.resetAgentToken);

  const [subTab, setSubTab] = useState<HrSubTab>('roster');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EmploymentStatus>('active');
  const [notice, setNotice] = useState<string | null>(null);

  // Hire Wizard state
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireStep, setHireStep] = useState<1 | 2 | 3>(1);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [wName, setWName] = useState('');
  const [wNickname, setWNickname] = useState('');
  const [wGender, setWGender] = useState<'female' | 'male'>('female');
  const [wTemplateId, setWTemplateId] = useState<string>(ROLE_TEMPLATES[0]?.id || '');
  const [wTitle, setWTitle] = useState('');
  const [wDepartment, setWDepartment] = useState<string>('sales');
  const [wRole, setWRole] = useState<RoleType>('Specialist');
  const [wReportsTo, setWReportsTo] = useState<string>('secretary');
  const [wPersonality, setWPersonality] = useState('');
  const [wTone, setWTone] = useState('Chuyên nghiệp, súc tích, bám sát kết quả thực');
  const [wPrompt, setWPrompt] = useState('');
  const [wTools, setWTools] = useState<ToolName[]>(['write_document', 'read_memory', 'write_memory', 'request_expense']);
  const [wPermissions, setWPermissions] = useState<Permission[]>(ROLE_DEFAULT_PERMISSIONS.Specialist);
  const [wProvider, setWProvider] = useState<ProviderId | 'company_default'>('company_default');
  const [wModel, setWModel] = useState('');
  const [wSleepIdle, setWSleepIdle] = useState(false);
  const [wHairStyle, setWHairStyle] = useState<HairStyleId>('bob');
  const [wHairColor, setWHairColor] = useState<string>(HAIR_COLORS[0]);
  const [wSkinTone, setWSkinTone] = useState<string>(SKIN_TONES[0]);
  const [wOutfitStyle, setWOutfitStyle] = useState<OutfitStyleId>('shirt');
  const [wOutfitColor, setWOutfitColor] = useState<string>('#10B981');
  const [wAccessory, setWAccessory] = useState<AccessoryId>('badge');
  const [wCustomDeskX, setWCustomDeskX] = useState<string>('');
  const [wCustomDeskZ, setWCustomDeskZ] = useState<string>('');

  // Inline new dept inside wizard
  const [showInlineDept, setShowInlineDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptShort, setNewDeptShort] = useState('');
  const [newDeptFloor, setNewDeptFloor] = useState<1 | 2>(1);
  const [newDeptColor, setNewDeptColor] = useState(DEPT_COLORS[0]);
  const [newDeptDesc, setNewDeptDesc] = useState('');

  // Batch Hire Modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchTplId, setBatchTplId] = useState(ROLE_TEMPLATES.find((t) => t.id === 'tpl_sdr_1')?.id || ROLE_TEMPLATES[0].id);
  const [batchCount, setBatchCount] = useState(3);
  const [batchRegion, setBatchRegion] = useState('Hà Nội');
  const [batchDept, setBatchDept] = useState<string>('sales');

  // Quick Rename / Move Dept modal
  const [renameTarget, setRenameTarget] = useState<AgentProfile | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [renameTitleVal, setRenameTitleVal] = useState('');
  const [moveTarget, setMoveTarget] = useState<AgentProfile | null>(null);
  const [moveDeptVal, setMoveDeptVal] = useState('');

  // Offboard Handover Modal
  const [offboardTarget, setOffboardTarget] = useState<AgentProfile | null>(null);
  const [handoverToId, setHandoverToId] = useState<string>('secretary');
  const [offboardReason, setOffboardReason] = useState('Tái cơ cấu nhiệm vụ phòng ban');

  // Permanent Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<AgentProfile | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // RBAC sub-tab state
  const [selectedRbacId, setSelectedRbacId] = useState<string>(agents[0]?.id || 'secretary');
  const [tokenNotice, setTokenNotice] = useState<string | null>(null);
  const [testNotice, setTestNotice] = useState<string | null>(null);

  const activeAgents = useMemo(
    () => agents.filter((a) => a.employmentStatus !== 'archived'),
    [agents]
  );

  const filteredAgents = useMemo(() => {
    const q = foldVietnamese(search);
    return agents.filter((a) => {
      const st: EmploymentStatus = a.employmentStatus || 'active';
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (deptFilter !== 'all' && a.department !== deptFilter) return false;
      if (q) {
        const hay = foldVietnamese(`${a.name} ${a.nickname || ''} ${a.title} ${a.id}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [agents, search, deptFilter, statusFilter]);

  const totalMonthlyEstimate = useMemo(() => {
    return activeAgents.reduce(
      (acc, a) => {
        const est = estimateMonthlyTokenCost(a, settings);
        return { tokens: acc.tokens + est.monthlyTokens, vnd: acc.vnd + est.monthlyVnd };
      },
      { tokens: 0, vnd: 0 }
    );
  }, [activeAgents, settings]);

  const previewAppearance: AgentAppearance = useMemo(
    () => ({
      agentId: editingAgentId || 'preview_new_agent',
      hairStyle: wHairStyle,
      hairColor: wHairColor,
      skinTone: wSkinTone,
      outfitStyle: wOutfitStyle,
      outfitColor: wOutfitColor,
      outfitAccent: '#F8FAFC',
      pantsColor: '#1E293B',
      accessory: wAccessory,
    }),
    [editingAgentId, wHairStyle, wHairColor, wSkinTone, wOutfitStyle, wOutfitColor, wAccessory]
  );

  const predictedSeat = useMemo(
    () => allocateDeskForDepartment(wDepartment, agents, departments, editingAgentId || undefined),
    [wDepartment, agents, departments, editingAgentId]
  );

  const estimatedNewCost = useMemo(
    () =>
      estimateMonthlyTokenCost(
        { role: wRole, providerOverride: wProvider, modelOverride: wModel, sleepWhenIdle: wSleepIdle },
        settings
      ),
    [wRole, wProvider, wModel, wSleepIdle, settings]
  );

  const openHireWizard = (presetAgent?: AgentProfile) => {
    if (presetAgent) {
      const app = agentAppearances[presetAgent.id] || getDefaultAppearance(presetAgent);
      setEditingAgentId(presetAgent.id);
      setWName(presetAgent.name);
      setWNickname(presetAgent.nickname || '');
      setWGender(presetAgent.gender === 'male' ? 'male' : 'female');
      setWTemplateId(presetAgent.templateId || '');
      setWTitle(presetAgent.title);
      setWDepartment(presetAgent.department);
      setWRole(presetAgent.role);
      setWReportsTo(presetAgent.reportsTo || 'secretary');
      setWPersonality(presetAgent.personalityNote || presetAgent.bio);
      setWTone(presetAgent.toneStyle || 'Chuyên nghiệp, bám sát kết quả');
      setWPrompt(presetAgent.systemPrompt);
      setWTools(presetAgent.allowedTools);
      setWPermissions(presetAgent.defaultPermissions);
      setWProvider(presetAgent.providerOverride || 'company_default');
      setWModel(presetAgent.modelOverride || '');
      setWSleepIdle(Boolean(presetAgent.sleepWhenIdle));
      setWHairStyle(app.hairStyle);
      setWHairColor(app.hairColor);
      setWSkinTone(app.skinTone);
      setWOutfitStyle(app.outfitStyle);
      setWOutfitColor(app.outfitColor);
      setWAccessory(app.accessory);
      setWCustomDeskX(String(presetAgent.deskPosition[0]));
      setWCustomDeskZ(String(presetAgent.deskPosition[2]));
    } else {
      const tpl = ROLE_TEMPLATES.find((t) => t.id === 'tpl_sdr_1') || ROLE_TEMPLATES[0];
      const dept = departments.find((d) => d.id === tpl.department) || departments[0];
      setEditingAgentId(null);
      setWGender(tpl.gender);
      setWName(generateVietnameseName(tpl.gender));
      setWNickname('');
      setWTemplateId(tpl.id);
      setWTitle(tpl.title);
      setWDepartment(tpl.department);
      setWRole(tpl.role);
      setWReportsTo('secretary');
      setWPersonality(tpl.bioTemplate);
      setWTone(tpl.defaultTone);
      setWPrompt(tpl.promptTemplate);
      setWTools(tpl.defaultTools);
      setWPermissions(tpl.defaultPermissions);
      setWProvider('company_default');
      setWModel('');
      setWSleepIdle(false);
      setWHairStyle(tpl.hairStyle);
      setWHairColor(HAIR_COLORS[0]);
      setWSkinTone(SKIN_TONES[0]);
      setWOutfitStyle(tpl.outfitStyle);
      setWOutfitColor(dept?.color || '#10B981');
      setWAccessory(tpl.accessory);
      setWCustomDeskX('');
      setWCustomDeskZ('');
    }
    setHireStep(1);
    setShowHireModal(true);
  };

  const applyTemplateToWizard = (tplId: string) => {
    setWTemplateId(tplId);
    const tpl = ROLE_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    const dept = departments.find((d) => d.id === tpl.department);
    setWTitle(tpl.title);
    setWDepartment(tpl.department);
    setWRole(tpl.role);
    setWTone(tpl.defaultTone);
    setWPersonality(tpl.bioTemplate);
    setWPrompt(tpl.promptTemplate);
    setWTools(tpl.defaultTools);
    setWPermissions(tpl.defaultPermissions);
    setWHairStyle(tpl.hairStyle);
    setWOutfitStyle(tpl.outfitStyle);
    setWAccessory(tpl.accessory);
    if (dept) setWOutfitColor(dept.color);
  };

  const handleAutoBuildPrompt = () => {
    const deptObj = departments.find((d) => d.id === wDepartment);
    const nextTools = suggestToolsForDescription(`${wTitle} ${wPersonality}`, wTools);
    setWTools(nextTools);
    setWPrompt(
      buildVietnameseSystemPrompt({
        name: wName || 'Nhân sự mới',
        title: wTitle || 'Chuyên viên',
        departmentName: deptObj?.name || wDepartment,
        personalityNote: wPersonality,
        toneStyle: wTone,
        tools: nextTools,
        companyName: settings.companyName,
      })
    );
  };

  const handleSaveWizard = async () => {
    if (!wName.trim() || !wTitle.trim()) {
      setNotice('Vui lòng nhập đầy đủ Họ tên và Chức danh.');
      return;
    }

    const customX = Number(wCustomDeskX);
    const customZ = Number(wCustomDeskZ);
    const hasCustomSeat = Number.isFinite(customX) && Number.isFinite(customZ) && wCustomDeskX.trim() !== '' && wCustomDeskZ.trim() !== '';
    const seatY = predictedSeat.floor === 2 ? 3.8 : 0;

    if (editingAgentId) {
      await updateAgentProfile(editingAgentId, {
        name: wName.trim(),
        nickname: wNickname.trim() || undefined,
        gender: wGender,
        title: wTitle.trim(),
        department: wDepartment,
        role: wRole,
        reportsTo: wReportsTo,
        personalityNote: wPersonality,
        toneStyle: wTone,
        systemPrompt: wPrompt,
        allowedTools: wTools,
        defaultPermissions: wPermissions,
        providerOverride: wProvider,
        modelOverride: wModel.trim() || undefined,
        sleepWhenIdle: wSleepIdle,
        ...(hasCustomSeat ? { deskPosition: [customX, seatY, customZ] } : {}),
      });
      await saveAgentAppearance({ ...previewAppearance, agentId: editingAgentId });
      setNotice(`Đã cập nhật hồ sơ & ngoại hình 3D cho ${wName.trim()}.`);
    } else {
      if (activeAgents.length >= 60) {
        setNotice('Đã đạt giới hạn 60 nhân sự đang hoạt động. Vui lòng tạm nghỉ hoặc lưu trữ bớt nhân sự.');
        return;
      }
      const created = await hireAgent({
        name: wName.trim(),
        nickname: wNickname.trim() || undefined,
        gender: wGender,
        title: wTitle.trim(),
        department: wDepartment,
        role: wRole,
        reportsTo: wReportsTo,
        personalityNote: wPersonality,
        toneStyle: wTone,
        templateId: wTemplateId || undefined,
        providerOverride: wProvider,
        modelOverride: wModel.trim() || undefined,
        sleepWhenIdle: wSleepIdle,
        existingAgents: agents,
        departments,
        customTools: wTools,
        customPermissions: wPermissions,
        customSystemPrompt: wPrompt,
        companyName: settings.companyName,
        appearance: previewAppearance,
        customDeskPosition: hasCustomSeat ? [customX, seatY, customZ] : undefined,
      });
      setNotice(`Đã tuyển ${created.name} (${created.title}) và đưa vào vị trí làm việc trên bản đồ 3D.`);
      selectAgent(created.id, true);
    }
    setShowHireModal(false);
  };

  const handleBatchHire = async () => {
    const tpl = ROLE_TEMPLATES.find((t) => t.id === batchTplId) || ROLE_TEMPLATES[0];
    const allowedRoom = Math.max(0, 60 - activeAgents.length);
    const count = Math.min(batchCount, allowedRoom);
    if (count <= 0) {
      setNotice('Công ty đã đạt ngưỡng tối đa 60 nhân sự hoạt động.');
      return;
    }
    const specs = Array.from({ length: count }).map(() => ({
      name: generateVietnameseName(tpl.gender),
      gender: tpl.gender,
      title: batchRegion.trim() ? `${tpl.title} (${batchRegion.trim()})` : tpl.title,
      department: batchDept || tpl.department,
      role: tpl.role,
      templateId: tpl.id,
      personalityNote: batchRegion.trim()
        ? `${tpl.bioTemplate} Phụ trách khu vực ${batchRegion.trim()}.`
        : tpl.bioTemplate,
      toneStyle: tpl.defaultTone,
      existingAgents: agents,
      departments,
      companyName: settings.companyName,
    }));
    const hired = await hireBatchTeam(specs, 'CEO');
    setShowBatchModal(false);
    setNotice(`Đã tuyển hàng loạt ${hired.length} nhân sự mới vào phòng ${batchDept}.`);
  };

  const handleExportJson = () => {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), departments, agents }, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-company-roster-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.agents)) {
        setNotice('File JSON không hợp lệ (thiếu danh sách agents).');
        return;
      }
      const imported = await importRosterJson({ agents: parsed.agents, departments: parsed.departments });
      setNotice(`Đã nhập thành công ${imported} nhân sự từ file JSON.`);
    } catch {
      setNotice('Không đọc được file JSON nhân sự.');
    } finally {
      e.target.value = '';
    }
  };

  const handoverSummary = useMemo(() => {
    if (!offboardTarget) return null;
    return collectAgentHandoverItems(offboardTarget, agents, tasks, leads, vaultStatuses, approvals);
  }, [offboardTarget, agents, tasks, leads, vaultStatuses, approvals]);

  const selectedRbacAcc = accounts.find((a) => a.agentId === selectedRbacId) || accounts[0];
  const selectedRbacAgent = selectedRbacAcc ? agents.find((a) => a.id === selectedRbacAcc.agentId) : undefined;
  const rbacAudits = auditLogs.filter((l) => l.agentId === selectedRbacAcc?.agentId).slice(0, 8);

  return (
    <div className="flex flex-col h-full p-3 gap-2.5 overflow-hidden">
      {/* Top Sub-navigation + Headcount Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {(
            [
              { id: 'roster', label: `Nhân sự (${activeAgents.length}/60)` },
              { id: 'depts', label: `Phòng ban (${departments.length})` },
              { id: 'rbac', label: 'Phân quyền & Token' },
              { id: 'audit', label: `Lịch sử HR (${hrAudits.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                subTab === t.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono-num text-slate-500 dark:text-slate-400">
          <span>Dự tính: {(totalMonthlyEstimate.tokens / 1000).toFixed(0)}k tok/th</span>
          <span>·</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{formatVnd(totalMonthlyEstimate.vnd)}/tháng</span>
        </div>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-sky-500/40 bg-sky-500/10 text-xs text-sky-700 dark:text-sky-300">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SUBTAB 1: ROSTER */}
      {subTab === 'roster' && (
        <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên, chức danh, mã agent..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-sky-500"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <option value="all">Tất cả phòng ban</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.shortName}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | EmploymentStatus)}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <option value="active">Đang làm việc</option>
              <option value="suspended">Đang tạm nghỉ</option>
              <option value="archived">Đã nghỉ việc</option>
              <option value="all">Tất cả trạng thái</option>
            </select>

            <button
              type="button"
              onClick={() => openHireWizard()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tuyển nhân sự</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-500 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>Thêm đội</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              title="Xuất JSON danh sách nhân sự"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <label
              title="Nhập JSON danh sách nhân sự"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".json,application/json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>

          {/* Agent Roster List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredAgents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center space-y-2">
                <p className="text-xs text-slate-500">Không tìm thấy nhân sự phù hợp bộ lọc hiện tại.</p>
                <button
                  type="button"
                  onClick={() => openHireWizard()}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Tuyển nhân sự mới
                </button>
              </div>
            ) : (
              filteredAgents.map((a) => {
                const dept = departments.find((d) => d.id === a.department);
                const empStatus = a.employmentStatus || 'active';
                const est = estimateMonthlyTokenCost(a, settings);
                return (
                  <div
                    key={a.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => empStatus !== 'archived' && selectAgent(a.id, true)}
                        className="text-left min-w-0 flex-1 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: dept?.color || a.avatarColor }}
                          />
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-sky-500 truncate">
                            {a.name}
                          </span>
                          {a.nickname && (
                            <span className="text-[11px] text-slate-400 truncate">({a.nickname})</span>
                          )}
                          <span
                            className={`text-[10px] font-medium ${
                              empStatus === 'active'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : empStatus === 'suspended'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-500'
                            }`}
                          >
                            {empStatus === 'active' ? 'Hoạt động' : empStatus === 'suspended' ? 'Tạm nghỉ' : 'Đã nghỉ'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {a.title} · {dept?.shortName || a.department} · {ROLE_LABELS[a.role]} ·{' '}
                          <span className="font-mono-num">{est.providerLabel}</span>
                        </div>
                      </button>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-1 shrink-0">
                        {empStatus !== 'archived' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openHireWizard(a)}
                              title="Sửa hồ sơ & Prompt"
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Sửa</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRenameTarget(a);
                                setRenameVal(a.name);
                                setRenameTitleVal(a.title);
                              }}
                              title="Đổi tên / chức danh"
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-[11px] cursor-pointer"
                            >
                              Đổi tên
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMoveTarget(a);
                                setMoveDeptVal(a.department);
                              }}
                              title="Chuyển phòng ban"
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-[11px] cursor-pointer"
                            >
                              Chuyển phòng
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const cloned = await cloneAgent(a.id, `${a.name} (Bản sao)`);
                                if (cloned) setNotice(`Đã nhân bản thành ${cloned.name}.`);
                              }}
                              title="Nhân bản nhân sự"
                              className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:border-sky-500 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => suspendAgent(a.id, 'CEO')}
                              title={empStatus === 'suspended' ? 'Đi làm lại' : 'Tạm nghỉ'}
                              className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:border-amber-500 cursor-pointer"
                            >
                              {empStatus === 'suspended' ? (
                                <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOffboardTarget(a);
                                const fallback = activeAgents.find((x) => x.id !== a.id);
                                setHandoverToId(fallback?.id || 'secretary');
                                setOffboardReason('Hoàn thành giai đoạn dự án / tối ưu nhân sự');
                              }}
                              title="Cho thôi việc & bàn giao"
                              className="p-1 rounded border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                await rehireAgent(a.id, 'CEO');
                                setNotice(`Đã tuyển lại ${a.name} vào văn phòng 3D.`);
                              }}
                              className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Tuyển lại</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTarget(a);
                                setDeleteConfirmText('');
                              }}
                              className="px-2 py-1 rounded border border-rose-500/40 text-rose-500 text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Xóa vĩnh viễn</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-1.5">
                      <span className="truncate max-w-[65%]">{a.bio}</span>
                      <span className="font-mono-num shrink-0">
                        Tầng {a.floor} · {a.allowedTools.length} tools · ~{formatVnd(est.monthlyVnd)}/th
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: DEPARTMENTS */}
      {subTab === 'depts' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2.5">
            <div className="text-xs font-semibold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-500" />
              <span>Tạo phòng ban mới (tự động mở rộng phòng trên bản đồ 3D)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="Tên phòng ban (vd: Tuyển sinh Miền Bắc)"
                className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <input
                value={newDeptShort}
                onChange={(e) => setNewDeptShort(e.target.value)}
                placeholder="Tên viết tắt (vd: Tuyển sinh)"
                className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <select
                value={newDeptFloor}
                onChange={(e) => setNewDeptFloor(Number(e.target.value) as 1 | 2)}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                <option value={1}>Tầng 1 (Khu kinh doanh & tiếp đón)</option>
                <option value={2}>Tầng 2 (Khu điều hành & chuyên môn)</option>
              </select>
              <div className="flex items-center gap-1.5">
                {DEPT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewDeptColor(c)}
                    className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                      newDeptColor === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
                placeholder="Chức năng chính của phòng ban..."
                className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!newDeptName.trim()) return;
                  const created = await createDepartment({
                    name: newDeptName.trim(),
                    shortName: newDeptShort.trim() || newDeptName.trim().slice(0, 14),
                    floor: newDeptFloor,
                    color: newDeptColor,
                    description: newDeptDesc.trim() || 'Phòng ban chuyên trách do CEO thành lập.',
                  });
                  setNewDeptName('');
                  setNewDeptShort('');
                  setNewDeptDesc('');
                  setNotice(`Đã mở phòng ${created.name} ở Tầng ${created.floor} trên mô hình 3D.`);
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                + Mở phòng ban
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {departments.map((d) => {
              const memberCount = activeAgents.filter((a) => a.department === d.id).length;
              return (
                <div
                  key={d.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs font-semibold truncate">{d.name}</span>
                      <span className="text-[11px] text-slate-400">
                        Tầng {d.floor} · {memberCount} NV {d.isCustom ? '· Tùy biến' : ''}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {d.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const nextName = window.prompt('Tên mới cho phòng ban:', d.name);
                        if (nextName && nextName.trim()) {
                          updateDepartment(d.id, { name: nextName.trim(), shortName: nextName.trim().slice(0, 14) });
                        }
                      }}
                      className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] cursor-pointer"
                    >
                      Đổi tên
                    </button>
                    {d.isCustom && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await deleteDepartment(d.id);
                          if (!res.ok) setNotice(res.error || 'Không xóa được phòng ban.');
                          else setNotice(`Đã xóa phòng ${d.name}.`);
                        }}
                        className="px-2 py-1 rounded border border-rose-500/40 text-rose-500 text-[11px] cursor-pointer"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: RBAC PERMISSIONS MATRIX */}
      {subTab === 'rbac' && (
        <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Mỗi nhân sự AI có tài khoản & token băm SHA-256 riêng (tự động cấp khi tuyển mới, thu hồi khi nghỉ việc).
            </div>
            <button
              type="button"
              onClick={async () => {
                const target = activeAgents.find((a) => !a.defaultPermissions.includes('outreach:send')) || activeAgents[0];
                if (!target) return;
                const res = await executeAgentTool(target.id, 'send_outreach', {
                  leadId: 'lead_1',
                  channel: 'Email',
                  message: 'Kiểm thử RBAC',
                });
                setTestNotice(
                  res.ok
                    ? `${target.name} đã được cấp quyền outreach:send.`
                    : `Đã chặn đúng RBAC (${target.name}): ${String(res.output.error || 'Thiếu quyền')}`
                );
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
            >
              Kiểm thử RBAC
            </button>
          </div>

          {testNotice && (
            <div className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-500/40 text-xs">
              {testNotice}
            </div>
          )}

          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 overflow-hidden">
            <div className="md:col-span-5 overflow-y-auto space-y-1.5 pr-1">
              {accounts.map((acc) => {
                const ag = agents.find((a) => a.id === acc.agentId);
                const isSel = selectedRbacAcc?.agentId === acc.agentId;
                return (
                  <button
                    key={acc.agentId}
                    type="button"
                    onClick={() => {
                      setSelectedRbacId(acc.agentId);
                      setTokenNotice(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      isSel
                        ? 'bg-sky-600/15 border-sky-500/50'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate">{ag?.name || acc.username}</span>
                      <span
                        className={`text-[10px] font-semibold ${
                          acc.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                        }`}
                      >
                        {acc.status === 'active' ? 'Hoạt động' : 'Tạm khóa'}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                      {ag?.title || acc.department} · {acc.role} · {acc.permissions.length} quyền
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedRbacAcc && (
              <div className="md:col-span-7 overflow-y-auto rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold">{selectedRbacAgent?.name || selectedRbacAcc.username}</h4>
                    <div className="text-[11px] text-slate-400 font-mono-num">
                      {selectedRbacAcc.internalEmail} · Hash: {selectedRbacAcc.tokenHash.slice(0, 14)}…
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        const preview = await resetAgentToken(selectedRbacAcc.agentId);
                        setTokenNotice(`Token nội bộ mới (lưu dạng SHA-256): ${preview}`);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Reset Token</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAccountSuspended(selectedRbacAcc.agentId)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                        selectedRbacAcc.status === 'active'
                          ? 'bg-rose-600/15 text-rose-500 border border-rose-500/30'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {selectedRbacAcc.status === 'active' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      <span>{selectedRbacAcc.status === 'active' ? 'Tạm khóa' : 'Mở khóa'}</span>
                    </button>
                  </div>
                </div>

                {tokenNotice && (
                  <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono-num text-emerald-500">
                    {tokenNotice}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold">Vai trò (Role):</label>
                  <select
                    value={selectedRbacAcc.role}
                    onChange={(e) => updateAccountRole(selectedRbacAcc.agentId, e.target.value as RoleType)}
                    className="text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1"
                  >
                    {(Object.keys(ROLE_LABELS) as RoleType[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                    <span>Phân quyền chi tiết (resource:action)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {ALL_PERMISSIONS.map((perm) => {
                      const enabled = selectedRbacAcc.permissions.includes(perm.key);
                      return (
                        <label
                          key={perm.key}
                          className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-[11px] cursor-pointer ${
                            enabled
                              ? 'bg-sky-600/10 border-sky-500/40'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-75'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-mono-num font-semibold truncate">{perm.key}</div>
                            <div className="text-[10px] text-slate-400 truncate">{perm.label}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => toggleAccountPermission(selectedRbacAcc.agentId, perm.key)}
                            className="accent-sky-600 cursor-pointer"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold mb-1">Nhật ký kiểm tra quyền gần nhất</div>
                  <div className="space-y-1">
                    {rbacAudits.length === 0 ? (
                      <div className="text-[11px] text-slate-400">Chưa phát sinh audit log cho tài khoản này.</div>
                    ) : (
                      rbacAudits.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between text-[11px] p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                        >
                          <span className="truncate">
                            {l.action} ({l.permission || '—'})
                          </span>
                          <span className={l.result === 'allowed' ? 'text-emerald-500' : 'text-rose-500 font-semibold'}>
                            {l.result === 'allowed' ? 'Hợp lệ' : 'Từ chối'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: HR AUDIT LOG */}
      {subTab === 'audit' && (
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {hrAudits.length === 0 ? (
            <div className="text-xs text-slate-400 p-4 text-center">Chưa có biến động nhân sự nào.</div>
          ) : (
            hrAudits.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 flex items-start justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-semibold flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-sky-500" />
                    <span>{entry.targetName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">· {entry.action}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{entry.summary}</div>
                </div>
                <div className="text-right text-[10px] font-mono-num text-slate-400 shrink-0">
                  <div>{entry.actor}</div>
                  <div>{new Date(entry.timestamp).toLocaleString('vi-VN')}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MULTI-STEP HIRE / EDIT WIZARD MODAL */}
      {showHireModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold">
                  {editingAgentId ? 'Chỉnh sửa hồ sơ Nhân sự AI' : 'Tuyển Nhân sự AI mới'}
                </h3>
                <div className="text-[11px] text-slate-400">
                  Bước {hireStep}/3 ·{' '}
                  {hireStep === 1 ? 'Danh tính & Ngoại hình 3D' : hireStep === 2 ? 'Chức danh, Phòng ban & Bàn ngồi' : 'Tính cách, Prompt, Tool & AI'}
                </div>
              </div>
              <button type="button" onClick={() => setShowHireModal(false)} className="p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Column: Live 360° 3D Preview */}
              <div className="md:col-span-5 space-y-2.5">
                <ChibiPreviewCanvas appearance={previewAppearance} />
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vị trí bàn dự kiến:</span>
                    <span className="font-mono-num font-semibold">
                      Tầng {predictedSeat.floor} ({predictedSeat.deskPosition[0]}, {predictedSeat.deskPosition[2]})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dự toán chi phí AI:</span>
                    <span className="font-mono-num font-semibold text-emerald-500">
                      ~{formatVnd(estimatedNewCost.monthlyVnd)}/tháng
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Step Form */}
              <div className="md:col-span-7 space-y-3 text-xs">
                {hireStep === 1 && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Họ và tên</label>
                        <div className="flex gap-1">
                          <input
                            value={wName}
                            onChange={(e) => setWName(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => setWName(generateVietnameseName(wGender))}
                            title="Gợi ý tên Việt"
                            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-sky-500 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Biệt danh (tùy chọn)</label>
                        <input
                          value={wNickname}
                          onChange={(e) => setWNickname(e.target.value)}
                          placeholder="vd: Bé Mây, Hùng Dev..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Giới tính</label>
                        <select
                          value={wGender}
                          onChange={(e) => setWGender(e.target.value as 'female' | 'male')}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                        >
                          <option value="female">Nữ</option>
                          <option value="male">Nam</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Kiểu tóc 3D</label>
                        <select
                          value={wHairStyle}
                          onChange={(e) => setWHairStyle(e.target.value as HairStyleId)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                        >
                          {HAIR_STYLES.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Trang phục</label>
                        <select
                          value={wOutfitStyle}
                          onChange={(e) => setWOutfitStyle(e.target.value as OutfitStyleId)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                        >
                          {OUTFIT_STYLES.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Phụ kiện</label>
                        <select
                          value={wAccessory}
                          onChange={(e) => setWAccessory(e.target.value as AccessoryId)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                        >
                          {ACCESSORIES.map((ac) => (
                            <option key={ac.id} value={ac.id}>
                              {ac.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Màu tóc & Màu áo</label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {HAIR_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setWHairColor(c)}
                              className={`w-5 h-5 rounded-full border-2 cursor-pointer ${wHairColor === c ? 'border-sky-500 scale-110' : 'border-transparent'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <span className="mx-1 text-slate-400">|</span>
                          {DEPT_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setWOutfitColor(c)}
                              className={`w-5 h-5 rounded-full border-2 cursor-pointer ${wOutfitColor === c ? 'border-sky-500 scale-110' : 'border-transparent'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {hireStep === 2 && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1">Chọn mẫu vai trò nhanh (RoleTemplate)</label>
                      <select
                        value={wTemplateId}
                        onChange={(e) => applyTemplateToWizard(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                      >
                        <option value="">-- Tự thiết kế vai trò mới --</option>
                        {ROLE_TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title} ({t.department})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Chức danh</label>
                        <input
                          value={wTitle}
                          onChange={(e) => setWTitle(e.target.value)}
                          placeholder="vd: Telesales Khu vực Đà Nẵng"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Cấp bậc quyền (Role)</label>
                        <select
                          value={wRole}
                          onChange={(e) => {
                            const nextRole = e.target.value as RoleType;
                            setWRole(nextRole);
                            setWPermissions(ROLE_DEFAULT_PERMISSIONS[nextRole]);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                        >
                          {(Object.keys(ROLE_LABELS) as RoleType[]).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold">Phòng ban</label>
                          <button
                            type="button"
                            onClick={() => setShowInlineDept((v) => !v)}
                            className="text-[10.5px] text-sky-500 hover:underline cursor-pointer"
                          >
                            {showInlineDept ? 'Đóng' : '+ Tạo phòng mới'}
                          </button>
                        </div>
                        <select
                          value={wDepartment}
                          onChange={(e) => {
                            setWDepartment(e.target.value);
                            const d = departments.find((x) => x.id === e.target.value);
                            if (d) setWOutfitColor(d.color);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                        >
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} (Tầng {d.floor})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Báo cáo trực tiếp cho</label>
                        <select
                          value={wReportsTo}
                          onChange={(e) => setWReportsTo(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                        >
                          <option value="ceo">Chủ tịch / CEO</option>
                          {activeAgents.map((ag) => (
                            <option key={ag.id} value={ag.id}>
                              {ag.name} ({ag.title})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {showInlineDept && (
                      <div className="p-2.5 rounded-lg border border-sky-500/40 bg-sky-500/5 space-y-2">
                        <div className="text-[11px] font-semibold">Tạo nhanh phòng ban mới</div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <input
                            value={newDeptName}
                            onChange={(e) => setNewDeptName(e.target.value)}
                            placeholder="Tên phòng..."
                            className="col-span-2 px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                          />
                          <select
                            value={newDeptFloor}
                            onChange={(e) => setNewDeptFloor(Number(e.target.value) as 1 | 2)}
                            className="px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                          >
                            <option value={1}>Tầng 1</option>
                            <option value={2}>Tầng 2</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!newDeptName.trim()) return;
                            const d = await createDepartment({
                              name: newDeptName.trim(),
                              shortName: newDeptName.trim().slice(0, 14),
                              floor: newDeptFloor,
                              color: newDeptColor,
                              description: 'Phòng ban do CEO tạo khi tuyển nhân sự.',
                            });
                            setWDepartment(d.id);
                            setWOutfitColor(d.color);
                            setShowInlineDept(false);
                            setNewDeptName('');
                          }}
                          className="px-2.5 py-1 rounded bg-sky-600 text-white text-[11px] font-medium cursor-pointer"
                        >
                          Lưu & chọn phòng này
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Tọa độ X bàn 3D (tự động nếu trống)</label>
                        <input
                          value={wCustomDeskX}
                          onChange={(e) => setWCustomDeskX(e.target.value)}
                          placeholder={String(predictedSeat.deskPosition[0])}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Tọa độ Z bàn 3D (tự động nếu trống)</label>
                        <input
                          value={wCustomDeskZ}
                          onChange={(e) => setWCustomDeskZ(e.target.value)}
                          placeholder={String(predictedSeat.deskPosition[2])}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                        />
                      </div>
                    </div>
                  </>
                )}

                {hireStep === 3 && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold">Tính cách & nhiệm vụ (mô tả tự nhiên)</label>
                        <button
                          type="button"
                          onClick={handleAutoBuildPrompt}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-sky-600/15 text-sky-600 dark:text-sky-400 text-[10.5px] font-semibold cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Tự sinh Prompt & Gợi ý Tool</span>
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={wPersonality}
                        onChange={(e) => setWPersonality(e.target.value)}
                        placeholder="Ví dụ: Chuyên viên chăm sóc phụ huynh mầm non, nói nhẹ nhàng, ưu tiên trả lời trong 5 phút..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1">System Prompt Tiếng Việt</label>
                      <textarea
                        rows={4}
                        value={wPrompt}
                        onChange={(e) => setWPrompt(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Provider AI riêng</label>
                        <select
                          value={wProvider}
                          onChange={(e) => setWProvider(e.target.value as ProviderId | 'company_default')}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                        >
                          <option value="company_default">Theo cấu hình chung</option>
                          <option value="gemini">Google Gemini</option>
                          <option value="deepseek">DeepSeek</option>
                          <option value="local">Local LLM (Ollama/LM Studio)</option>
                          <option value="mock">Mô phỏng (0đ)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Model riêng (tùy chọn)</label>
                        <input
                          value={wModel}
                          onChange={(e) => setWModel(e.target.value)}
                          placeholder="vd: gemini-2.5-flash"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wSleepIdle}
                        onChange={(e) => setWSleepIdle(e.target.checked)}
                        className="accent-sky-600"
                      />
                      <span>Tự chuyển trạng thái nghỉ (Ngủ tiết kiệm) khi không có việc trong 10 phút</span>
                    </label>

                    <div>
                      <div className="text-[11px] font-semibold mb-1">Công cụ được phép ({wTools.length})</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-28 overflow-y-auto p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        {ALL_TOOLS.map((t) => {
                          const checked = wTools.includes(t.name);
                          return (
                            <label key={t.name} className="flex items-center gap-1.5 text-[10.5px] cursor-pointer truncate">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setWTools((prev) =>
                                    checked ? prev.filter((x) => x !== t.name) : [...prev, t.name]
                                  )
                                }
                                className="accent-sky-600"
                              />
                              <span className="truncate">{t.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setHireStep(step as 1 | 2 | 3)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                      hireStep === step
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Bước {step}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {hireStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setHireStep((s) => (s - 1) as 1 | 2)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
                  >
                    Quay lại
                  </button>
                )}
                {hireStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setHireStep((s) => (s + 1) as 2 | 3)}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    Tiếp theo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveWizard}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingAgentId ? 'Lưu cập nhật' : 'Hoàn tất tuyển dụng'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BATCH HIRE MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Tuyển hàng loạt theo đội</h3>
              <button type="button" onClick={() => setShowBatchModal(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold mb-1">Vai trò mẫu</label>
                <select
                  value={batchTplId}
                  onChange={(e) => {
                    setBatchTplId(e.target.value);
                    const t = ROLE_TEMPLATES.find((x) => x.id === e.target.value);
                    if (t) setBatchDept(t.department);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  {ROLE_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.department})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Số lượng (1–10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Khu vực / Ghi chú</label>
                  <input
                    value={batchRegion}
                    onChange={(e) => setBatchRegion(e.target.value)}
                    placeholder="Hà Nội / TP.HCM"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Phòng ban tiếp nhận</label>
                <select
                  value={batchDept}
                  onChange={(e) => setBatchDept(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleBatchHire}
                className="px-4 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold cursor-pointer"
              >
                Tuyển {batchCount} nhân sự ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xl text-xs">
            <h3 className="text-sm font-bold">Đổi tên & chức danh</h3>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Họ tên hiển thị</label>
              <input
                value={renameVal}
                onChange={(e) => setRenameVal(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Chức danh</label>
              <input
                value={renameTitleVal}
                onChange={(e) => setRenameTitleVal(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!renameVal.trim()) return;
                  await updateAgentProfile(renameTarget.id, {
                    name: renameVal.trim(),
                    title: renameTitleVal.trim() || renameTarget.title,
                  });
                  setNotice(`Đã đổi tên thành ${renameVal.trim()} (không cần reload).`);
                  setRenameTarget(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOVE DEPARTMENT MODAL */}
      {moveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xl text-xs">
            <h3 className="text-sm font-bold">Chuyển phòng ban: {moveTarget.name}</h3>
            <select
              value={moveDeptVal}
              onChange={(e) => setMoveDeptVal(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} (Tầng {d.floor})
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMoveTarget(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  await updateAgentProfile(moveTarget.id, { department: moveDeptVal });
                  setNotice(`${moveTarget.name} đang đi bộ sang phòng ban mới trên bản đồ 3D.`);
                  setMoveTarget(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
              >
                Chuyển phòng ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY HANDOVER OFFBOARD MODAL */}
      {offboardTarget && handoverSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xl text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-rose-500">Bàn giao & Cho thôi việc: {offboardTarget.name}</h3>
                <p className="text-[11px] text-slate-400">
                  Mọi task, lead CRM và tài khoản đang phụ trách sẽ được chuyển giao an toàn trước khi thu hồi token & lưu trữ hồ sơ.
                </p>
              </div>
              <button type="button" onClick={() => setOffboardTarget(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {handoverSummary.keyRoleWarning && (
              <div className="p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{handoverSummary.keyRoleWarning}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 font-mono-num">
              <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400">Task đang mở</div>
                <div className="text-sm font-bold">{handoverSummary.activeTasks.length}</div>
              </div>
              <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400">Lead CRM</div>
                <div className="text-sm font-bold">{handoverSummary.assignedLeads.length}</div>
              </div>
              <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400">Tài khoản Vault</div>
                <div className="text-sm font-bold">{handoverSummary.vaultAccounts.length}</div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold mb-1">Chuyển giao toàn bộ cho nhân sự:</label>
              <select
                value={handoverToId}
                onChange={(e) => setHandoverToId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                {activeAgents
                  .filter((a) => a.id !== offboardTarget.id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.title})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold mb-1">Lý do nghỉ việc / ghi chú biên bản</label>
              <input
                value={offboardReason}
                onChange={(e) => setOffboardReason(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOffboardTarget(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await offboardAgent({
                    agentId: offboardTarget.id,
                    handoverToId,
                    reason: offboardReason,
                    actor: 'CEO',
                  });
                  if (!res.ok) {
                    setNotice(res.error || 'Không thể cho thôi việc nhân sự này.');
                  } else {
                    setNotice(
                      `Đã lập biên bản bàn giao, thu hồi token và cho ${offboardTarget.name} rời văn phòng 3D.`
                    );
                    setOffboardTarget(null);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
              >
                Xác nhận bàn giao & thôi việc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-rose-500/40 p-4 space-y-3 shadow-2xl text-xs">
            <h3 className="text-sm font-bold text-rose-500">Xóa vĩnh viễn nhân sự</h3>
            <p className="text-slate-500 dark:text-slate-300">
              Hành động này không thể hoàn tác. Gõ chính xác tên <strong className="text-slate-900 dark:text-white">{deleteTarget.name}</strong> để xác nhận xóa:
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={deleteTarget.name}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleteConfirmText.trim() !== deleteTarget.name.trim()}
                onClick={async () => {
                  const res = await deleteAgentPermanently(deleteTarget.id, 'CEO');
                  if (!res.ok) setNotice(res.error || 'Không xóa được.');
                  else setNotice(`Đã xóa vĩnh viễn ${deleteTarget.name}.`);
                  setDeleteTarget(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 disabled:opacity-40 text-white font-semibold cursor-pointer"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
