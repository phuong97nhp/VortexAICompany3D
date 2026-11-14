import {
  AgentProfile,
  ApprovalRequest,
  CompanySettings,
  DepartmentConfig,
  DepartmentId,
  LeadItem,
  TaskItem,
  VaultAccountStatus,
} from '../types';
import {
  buildVietnameseSystemPrompt,
  foldVietnamese,
  generateVietnameseName,
  ROLE_TEMPLATES,
  slugifyVietnameseId,
  suggestDeptFromText,
  suggestToolsForDescription,
} from './roleTemplates';

export type HrEventType = 'agent.created' | 'agent.updated' | 'agent.removed' | 'dept.updated';

export interface HrEventPayload {
  type: HrEventType;
  agentId?: string;
  departmentId?: string;
  timestamp: number;
}

type HrListener = (event: HrEventPayload) => void;
const listeners = new Set<HrListener>();

export function subscribeHrEvents(fn: HrListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitHrEvent(type: HrEventType, ids: { agentId?: string; departmentId?: string }) {
  const payload: HrEventPayload = {
    type,
    agentId: ids.agentId,
    departmentId: ids.departmentId,
    timestamp: Date.now(),
  };
  for (const fn of listeners) {
    try {
      fn(payload);
    } catch {
      // ignore listener errors
    }
  }
}

export const OFFICE_EXIT_DOOR_POS: [number, number, number] = [-11.8, 0, 5.1];

export function allocateDeskForDepartment(
  deptId: DepartmentId,
  existingAgents: AgentProfile[],
  departments: DepartmentConfig[],
  excludeAgentId?: string
): { floor: 1 | 2; roomId: string; deskPosition: [number, number, number]; deskRotationY: number; isOverflow: boolean } {
  const dept = departments.find((d) => d.id === deptId) || departments[0];
  const floor: 1 | 2 = dept?.floor || 1;
  const y = floor === 2 ? 3.8 : 0;
  const roomId = dept?.roomId || `room-${deptId}`;
  const cx = dept?.roomCenter?.[0] ?? 0;
  const cz = dept?.roomCenter?.[2] ?? 0;
  const [rw, rd] = dept?.roomSize ?? [8.5, 8.2];

  const occupied = existingAgents.filter(
    (a) => a.id !== excludeAgentId && a.employmentStatus !== 'archived'
  );

  const isFree = (x: number, z: number) =>
    !occupied.some((a) => {
      if (a.floor !== floor) return false;
      const dx = a.deskPosition[0] - x;
      const dz = a.deskPosition[2] - z;
      return Math.sqrt(dx * dx + dz * dz) < 1.35;
    });

  // Generate neat candidate grid slots inside room bounds (leaving wall & walkway clearance)
  const marginX = Math.max(1.2, Math.min(1.6, rw * 0.18));
  const marginZ = Math.max(1.2, Math.min(1.6, rd * 0.18));
  const minX = cx - rw / 2 + marginX;
  const maxX = cx + rw / 2 - marginX;
  const minZ = cz - rd / 2 + marginZ;
  const maxZ = cz + rd / 2 - marginZ;

  const stepX = 2.05;
  const stepZ = 2.1;

  for (let z = minZ; z <= maxZ + 0.05; z += stepZ) {
    for (let x = minX; x <= maxX + 0.05; x += stepX) {
      const rx = Number(x.toFixed(2));
      const rz = Number(z.toFixed(2));
      if (isFree(rx, rz)) {
        const rot = rz < cz ? 0 : Math.PI;
        return { floor, roomId, deskPosition: [rx, y, rz], deskRotationY: rot, isOverflow: false };
      }
    }
  }

  // Tighter spacing fallback inside room before spilling to overflow bay
  for (let z = minZ - 0.3; z <= maxZ + 0.3; z += 1.55) {
    for (let x = minX - 0.3; x <= maxX + 0.3; x += 1.55) {
      const rx = Number(x.toFixed(2));
      const rz = Number(z.toFixed(2));
      if (isFree(rx, rz)) {
        return { floor, roomId, deskPosition: [rx, y, rz], deskRotationY: rz < cz ? 0 : Math.PI, isOverflow: true };
      }
    }
  }

  // Clean overflow East Annex seats on the matching floor (up to 60+ agents without overlap)
  const annexStartX = 14.8;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 5; col++) {
      const rx = Number((annexStartX + col * 2.1).toFixed(2));
      const rz = Number((-7.2 + row * 2.6).toFixed(2));
      if (isFree(rx, rz)) {
        return { floor, roomId, deskPosition: [rx, y, rz], deskRotationY: 0, isOverflow: true };
      }
    }
  }

  return {
    floor,
    roomId,
    deskPosition: [Number((cx + (Math.random() - 0.5) * 2).toFixed(2)), y, Number((cz + (Math.random() - 0.5) * 2).toFixed(2))],
    deskRotationY: 0,
    isOverflow: true,
  };
}

export function allocateCustomDepartmentLayout(
  floor: 1 | 2,
  existingDepts: DepartmentConfig[]
): { roomCenter: [number, number, number]; roomSize: [number, number]; cameraOffset: [number, number, number] } {
  const y = floor === 2 ? 3.8 : 0;
  // Modular East/South expansion bays aligned tightly with main building walls (main x in [-13.2, 13.2], z in [-9.2, 9.2])
  const candidateSlots: Array<{ cx: number; cz: number; w: number; d: number }> = [
    { cx: 17.5, cz: -5.1, w: 8.6, d: 8.2 },
    { cx: 17.5, cz: 5.1, w: 8.6, d: 8.2 },
    { cx: -17.5, cz: -5.1, w: 8.6, d: 8.2 },
    { cx: -17.5, cz: 5.1, w: 8.6, d: 8.2 },
    { cx: 26.1, cz: -5.1, w: 8.6, d: 8.2 },
    { cx: 26.1, cz: 5.1, w: 8.6, d: 8.2 },
  ];

  const occupiedOnFloor = existingDepts.filter((d) => d.floor === floor);
  for (const slot of candidateSlots) {
    const clash = occupiedOnFloor.some(
      (d) => Math.abs(d.roomCenter[0] - slot.cx) < 4.5 && Math.abs(d.roomCenter[2] - slot.cz) < 4.5
    );
    if (!clash) {
      return {
        roomCenter: [slot.cx, y, slot.cz],
        roomSize: [slot.w, slot.d],
        cameraOffset: [slot.cx + 5, y + 7.5, slot.cz + 8.5],
      };
    }
  }

  const idx = occupiedOnFloor.length;
  const cx = 17.5 + (idx % 3) * 8.6;
  const cz = idx % 2 === 0 ? -5.1 : 5.1;
  return {
    roomCenter: [cx, y, cz],
    roomSize: [8.6, 8.2],
    cameraOffset: [cx + 5, y + 7.5, cz + 8.5],
  };
}

export function estimateMonthlyTokenCost(
  agent: Pick<AgentProfile, 'role' | 'providerOverride' | 'modelOverride' | 'sleepWhenIdle'>,
  settings: CompanySettings
): { monthlyTokens: number; monthlyUsd: number; monthlyVnd: number; providerLabel: string } {
  const baseDailyTokens =
    agent.role === 'Exec' || agent.role === 'CEO'
      ? 14000
      : agent.role === 'Dept Head'
      ? 11000
      : agent.role === 'Specialist'
      ? 8500
      : 2500;
  const sleepFactor = agent.sleepWhenIdle || settings.sleepIdleAgents ? 0.65 : 1;
  const monthlyTokens = Math.round(baseDailyTokens * 26 * sleepFactor);

  const prov =
    agent.providerOverride && agent.providerOverride !== 'company_default'
      ? agent.providerOverride
      : settings.primaryProvider;
  const model = agent.modelOverride || '';

  let usdPer1MTokens = 0;
  if (prov === 'gemini') {
    usdPer1MTokens = model.includes('pro') ? 3.5 : 0.35;
  } else if (prov === 'deepseek') {
    usdPer1MTokens = model.includes('reasoner') ? 1.1 : 0.45;
  } else if (prov === 'local' || prov === 'mock') {
    usdPer1MTokens = 0;
  }

  const monthlyUsd = Number(((monthlyTokens / 1_000_000) * usdPer1MTokens).toFixed(2));
  const monthlyVnd = Math.round(monthlyUsd * 25400);
  return {
    monthlyTokens,
    monthlyUsd,
    monthlyVnd,
    providerLabel: prov === 'local' ? 'Local (0đ)' : prov === 'mock' ? 'Mô phỏng (0đ)' : `${prov}${model ? ` · ${model}` : ''}`,
  };
}

export interface AgentHandoverSummary {
  activeTasks: TaskItem[];
  assignedLeads: LeadItem[];
  followUpLeads: LeadItem[];
  vaultAccounts: VaultAccountStatus[];
  pendingApprovals: ApprovalRequest[];
  isLastInDept: boolean;
  isKeyRole: boolean;
  keyRoleWarning?: string;
}

export function collectAgentHandoverItems(
  agent: AgentProfile,
  allAgents: AgentProfile[],
  tasks: TaskItem[],
  leads: LeadItem[],
  vaultStatuses: VaultAccountStatus[],
  approvals: ApprovalRequest[]
): AgentHandoverSummary {
  const activeAgents = allAgents.filter((a) => a.employmentStatus !== 'archived' && a.id !== agent.id);
  const activeInDept = activeAgents.filter((a) => a.department === agent.department);

  const activeTasks = tasks.filter(
    (t) => t.assignedTo === agent.id && t.status !== 'done' && t.status !== 'failed'
  );
  const assignedLeads = leads.filter((l) => l.assignedAgentId === agent.id);
  const followUpLeads = assignedLeads.filter(
    (l) => l.nextFollowUpAt && l.nextFollowUpAt > Date.now() && l.stage !== 'won' && l.stage !== 'lost'
  );
  const vaultAccounts = vaultStatuses.filter((v) => v.managedBy === agent.id);
  const pendingApprovals = approvals.filter((a) => a.requestedBy === agent.id && a.status === 'pending');

  const isKeyRole =
    agent.id === 'secretary' ||
    agent.id === 'cfo' ||
    agent.role === 'Dept Head' ||
    agent.role === 'Exec';

  let keyRoleWarning: string | undefined;
  if (agent.id === 'secretary') {
    keyRoleWarning = 'Đây là Thư ký CEO (người điều phối mặc định khi CEO không @mention). Cần chỉ định người thay thế hoặc chuyển giao task.';
  } else if (agent.id === 'cfo' || agent.defaultPermissions.includes('expense:review')) {
    keyRoleWarning = 'Nhân sự này giữ quyền Kế toán thẩm định chi phí tầng 1. Hãy đảm bảo có nhân sự khác giữ quyền expense:review trước khi cho nghỉ.';
  } else if (activeInDept.length === 0) {
    keyRoleWarning = `Đây là nhân sự duy nhất còn lại của phòng ${agent.department}.`;
  }

  return {
    activeTasks,
    assignedLeads,
    followUpLeads,
    vaultAccounts,
    pendingApprovals,
    isLastInDept: activeInDept.length === 0,
    isKeyRole,
    keyRoleWarning,
  };
}

export interface ParsedHireSpec {
  name: string;
  title: string;
  department: DepartmentId;
  templateId?: string;
  personalityNote: string;
  regionHint?: string;
}

export function parseQuickHireIntent(
  text: string,
  departments: DepartmentConfig[]
): { isHireRequest: boolean; specs: ParsedHireSpec[]; summary: string } {
  const lower = foldVietnamese(text);
  const isHire =
    /\b(tuyen|them nhan su|them doi|thue them|nhan vien moi|tuyen dung|them ban|mo them)\b/.test(lower);

  if (!isHire) {
    return { isHireRequest: false, specs: [], summary: '' };
  }

  // Extract region hint (Đà Nẵng, Hà Nội, TP.HCM, etc.)
  const regionMatch = text.match(/(?:phụ trách|khu vực|tại|ở)\s+([A-ZÀ-Ỹ][a-zà-ỹA-ZÀ-Ỹ\s]{2,25})/i);
  const regionHint = regionMatch?.[1]?.trim();

  // Extract explicit name ("tên Lan", "tên là Minh Tú")
  const nameMatch = text.match(/tên\s+(?:là\s+)?([A-ZÀ-Ỹa-zà-ỹ][a-zà-ỹA-ZÀ-Ỹ\s]{1,25}?)(?=$|,|\.|\s+(?:cho|ở|tại|phụ|làm|chuyên))/i);
  const explicitName = nameMatch?.[1]?.trim();

  // Check batch counts like "3 SDR + 1 Lead Hunter" or "2 content"
  const batchMatches = [...lower.matchAll(/(\d+)\s*(?:ban\s+)?(sdr|lead hunter|content|seo|telesale|cskh|dev|ke toan|design|video|sales)/g)];
  const specs: ParsedHireSpec[] = [];

  if (batchMatches.length > 0) {
    for (const m of batchMatches) {
      const count = Math.min(10, Math.max(1, Number(m[1])));
      const keyword = m[2];
      const matchedTpl =
        ROLE_TEMPLATES.find((t) => foldVietnamese(t.title).includes(keyword) || t.id.includes(keyword.replace(/\s+/g, '_'))) ||
        ROLE_TEMPLATES.find((t) => t.id === 'tpl_sdr_1')!;

      for (let i = 0; i < count; i++) {
        const name = explicitName && specs.length === 0 ? explicitName : generateVietnameseName(matchedTpl.gender);
        const dept = matchedTpl.department;
        specs.push({
          name,
          title: regionHint ? `${matchedTpl.title} (${regionHint})` : matchedTpl.title,
          department: dept,
          templateId: matchedTpl.id,
          personalityNote: regionHint
            ? `Phụ trách khu vực ${regionHint}. ${text}`
            : text,
          regionHint,
        });
      }
    }
  } else {
    // Single hire inference
    const guessedDept = suggestDeptFromText(text);
    const matchedTpl =
      ROLE_TEMPLATES.find((t) => lower.includes(foldVietnamese(t.title))) ||
      (lower.includes('content') || lower.includes('viet bai')
        ? ROLE_TEMPLATES.find((t) => t.id === 'tpl_content_writer')
        : lower.includes('mam non') && (lower.includes('cskh') || lower.includes('cham soc'))
        ? ROLE_TEMPLATES.find((t) => t.id === 'tpl_preschool_care')
        : lower.includes('ke toan')
        ? ROLE_TEMPLATES.find((t) => t.id === 'tpl_general_accountant')
        : lower.includes('telesale')
        ? ROLE_TEMPLATES.find((t) => t.id === 'tpl_telesales')
        : lower.includes('video') || lower.includes('tiktok')
        ? ROLE_TEMPLATES.find((t) => t.id === 'tpl_video_editor')
        : lower.includes('lead')
        ? ROLE_TEMPLATES.find((t) => t.id === 'tpl_lead_hunter_edu')
        : ROLE_TEMPLATES.find((t) => t.department === guessedDept)) ||
      ROLE_TEMPLATES[0];

    const deptObj = departments.find((d) => lower.includes(foldVietnamese(d.shortName)) || d.id === guessedDept);
    const finalDept = deptObj?.id || matchedTpl.department;
    const finalName = explicitName || generateVietnameseName(matchedTpl.gender);

    specs.push({
      name: finalName,
      title: matchedTpl.title,
      department: finalDept,
      templateId: matchedTpl.id,
      personalityNote: text,
      regionHint,
    });
  }

  return {
    isHireRequest: true,
    specs,
    summary: specs.map((s) => `${s.name} (${s.title})`).join(', '),
  };
}

export function buildNewAgentFromSpec(params: {
  name: string;
  nickname?: string;
  gender?: 'male' | 'female' | 'other';
  title: string;
  department: DepartmentId;
  role: AgentProfile['role'];
  reportsTo?: string;
  personalityNote: string;
  toneStyle?: string;
  templateId?: string;
  providerOverride?: AgentProfile['providerOverride'];
  modelOverride?: string;
  sleepWhenIdle?: boolean;
  existingAgents: AgentProfile[];
  departments: DepartmentConfig[];
  customTools?: AgentProfile['allowedTools'];
  customPermissions?: AgentProfile['defaultPermissions'];
  customSystemPrompt?: string;
  companyName?: string;
}): AgentProfile {
  const tpl = ROLE_TEMPLATES.find((t) => t.id === params.templateId);
  const dept = params.departments.find((d) => d.id === params.department) || params.departments[0];

  const baseId = slugifyVietnameseId(params.name) || 'agent';
  let id = baseId;
  let suffix = 2;
  const usedIds = new Set(params.existingAgents.map((a) => a.id));
  while (usedIds.has(id)) {
    id = `${baseId}_${suffix++}`;
  }

  const tools = params.customTools?.length
    ? params.customTools
    : suggestToolsForDescription(params.personalityNote + ' ' + params.title, tpl?.defaultTools || ['write_document', 'read_memory', 'write_memory', 'request_expense']);

  const permissions = params.customPermissions?.length
    ? params.customPermissions
    : tpl?.defaultPermissions || ['lead:read', 'doc:write', 'kpi:read', 'expense:request', 'memory:read', 'memory:write'];

  const seat = allocateDeskForDepartment(params.department, params.existingAgents, params.departments);
  const now = Date.now();

  const systemPrompt =
    params.customSystemPrompt?.trim() ||
    buildVietnameseSystemPrompt({
      name: params.name,
      title: params.title,
      departmentName: dept?.name || String(params.department),
      personalityNote: params.personalityNote,
      toneStyle: params.toneStyle || tpl?.defaultTone,
      tools,
      companyName: params.companyName,
    });

  return {
    id,
    name: params.name.trim(),
    nickname: params.nickname?.trim() || undefined,
    gender: params.gender || tpl?.gender || 'female',
    title: params.title.trim(),
    department: params.department,
    floor: seat.floor,
    roomId: seat.roomId,
    deskPosition: seat.deskPosition,
    deskRotationY: seat.deskRotationY,
    avatarColor: dept?.color || '#3B82F6',
    accentColor: '#F8FAFC',
    role: params.role || tpl?.role || 'Specialist',
    reportsTo: params.reportsTo || 'secretary',
    usesReasoner: tpl?.usesReasoner,
    allowedTools: tools,
    defaultPermissions: permissions,
    systemPrompt,
    bio: params.personalityNote.trim() || tpl?.bioTemplate || `${params.title} thuộc ${dept?.name || params.department}.`,
    personalityNote: params.personalityNote,
    toneStyle: params.toneStyle || tpl?.defaultTone,
    templateId: params.templateId,
    providerOverride: params.providerOverride || 'company_default',
    modelOverride: params.modelOverride,
    sleepWhenIdle: params.sleepWhenIdle ?? false,
    employmentStatus: 'active',
    createdAt: now,
    updatedAt: now,
  };
}
