import { z } from 'zod';
import {
  AgentProfile,
  CompanySettings,
  DepartmentConfig,
  OnboardingState,
} from '../types';
import { createDefaultAffiliateSettings } from '../integrations/affiliate/affiliate.config';
import { createDefaultLegalSettings } from '../engine/legal/legalSeeds';
import { createDefaultSpendingPolicy } from '../engine/expenseEngine';
import { DEFAULT_HUBCW_BASE_URL } from '../integrations/hubcw/hubcw.config';
import { DEFAULT_BRAND_PALETTE } from '../brand/logoBrand';
import { buildRoutingPreset } from '../engine/llm/presets';
import { buildSeedAgents, buildSeedDepartments } from '../engine/liveRegistry';
import { CURRENT_SCHEMA_VERSION } from '../engine/runtime247';
import { DEFAULT_VI_ACRONYM_DICT } from '../engine/vietnameseSpeechNormalizer';

export function createDefaultOnboardingState(): OnboardingState {
  return {
    completed: false,
    dismissed: false,
    currentStep: 1,
    hasDemoData: true,
    readOnlyCycleTested: false,
    testAlertSent: false,
    firstBackupCreated: false,
  };
}

const DepartmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  floor: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  color: z.string().min(1),
  bgTint: z.string(),
  badgeText: z.string(),
  description: z.string(),
  roomId: z.string().min(1),
  roomCenter: z.tuple([z.number(), z.number(), z.number()]),
  roomSize: z.tuple([z.number(), z.number()]),
  cameraOffset: z.tuple([z.number(), z.number(), z.number()]),
  isCustom: z.boolean().optional(),
  collapsed: z.boolean().optional(),
});

const AgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  title: z.string().min(1),
  department: z.string().min(1),
  floor: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  roomId: z.string().min(1),
  deskPosition: z.tuple([z.number(), z.number(), z.number()]),
  avatarColor: z.string(),
  accentColor: z.string(),
  role: z.enum(['CEO', 'Exec', 'Dept Head', 'Specialist', 'Read-only']),
  allowedTools: z.array(z.string()),
  defaultPermissions: z.array(z.string()),
  systemPrompt: z.string(),
  bio: z.string(),
});

const BackupBundleSchema = z.object({
  schemaVersion: z.number().int().min(1),
  exportedAt: z.number(),
  label: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

export function safeBackupCorruptedData(tag: string, rawPayload: unknown): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const key = `aicompany_corrupted_backup_${tag}_${Date.now()}`;
    const serialized = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
    localStorage.setItem(key, serialized.slice(0, 200_000));
    return key;
  } catch {
    return null;
  }
}

export function safeParseJsonWithRecovery<T = unknown>(
  rawJson: string,
  tag: string
): { ok: true; data: T } | { ok: false; backupKey: string | null; error: string } {
  try {
    const parsed = JSON.parse(rawJson) as T;
    if (!parsed || typeof parsed !== 'object') {
      const backupKey = safeBackupCorruptedData(tag, rawJson);
      return { ok: false, backupKey, error: 'Dữ liệu JSON không phải object hợp lệ.' };
    }
    return { ok: true, data: parsed };
  } catch (err) {
    const backupKey = safeBackupCorruptedData(tag, rawJson);
    return {
      ok: false,
      backupKey,
      error: err instanceof Error ? err.message : 'Lỗi phân tích cú pháp JSON',
    };
  }
}

export function validateBackupBundleJson(rawJson: string): {
  ok: boolean;
  bundle?: z.infer<typeof BackupBundleSchema>;
  error?: string;
  backupKey?: string | null;
} {
  const parsed = safeParseJsonWithRecovery(rawJson, 'import_bundle');
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, backupKey: parsed.backupKey };
  }
  const checked = BackupBundleSchema.safeParse(parsed.data);
  if (!checked.success) {
    const backupKey = safeBackupCorruptedData('invalid_bundle', rawJson);
    return {
      ok: false,
      error: `Schema sao lưu không hợp lệ: ${checked.error.issues[0]?.message || 'invalid'}`,
      backupKey,
    };
  }
  return { ok: true, bundle: checked.data };
}

export function buildFallbackBaseSettings(partial?: Partial<CompanySettings>): CompanySettings {
  const defaultAff = createDefaultAffiliateSettings();
  const defaultLegal = createDefaultLegalSettings();
  const defaultOnboarding = createDefaultOnboardingState();
  return {
    id: 'default',
    companyName: 'AI COMPANY VIỆT NAM',
    primaryProvider: 'gemini',
    fallbackProvider: 'deepseek',
    geminiApiKey: '',
    deepseekApiKey: '',
    deepseekMode: 'proxy',
    localBaseUrl: 'http://localhost:11434/v1',
    localModel: 'qwen2.5:7b',
    localApiKey: '',
    localUseWorkerProxy: false,
    routingPreset: 'balanced',
    roleRoutes: buildRoutingPreset('balanced', 'qwen2.5:7b'),
    providerBudgets: { gemini: 500000, deepseek: 400000, local: 2000000, mock: 9999999 },
    dailyTokenBudget: 500000,
    dryRun: true,
    autonomyLevel: 2,
    autopilotEnabled: false,
    autopilotIntervalMinutes: 30,
    autopilotDailyLeadTarget: 30,
    priorityProductId: 'edu-center',
    simulationSpeed: 1,
    paused: false,
    killSwitchActive: false,
    theme: 'dark',
    dayNightMode: 'day',
    graphicsQuality: 'medium',
    sdrDailyLimitEmail: 30,
    sdrDailyLimitOther: 20,
    sdrAllowedStartHour: 8,
    sdrAllowedEndHour: 20,
    sdrMaxFollowups: 3,
    sdrMinDaysBetweenFollowups: 3,
    zaloMaxMessagesPerHour: 6,
    zaloDndStartHour: 22,
    zaloDndEndHour: 7,
    zaloOverdueHours: 2,
    ceoPasswordHash: '',
    ceoPasswordSalt: '',
    mustChangeDefaultPassword: true,
    marketingAutopilotEnabled: false,
    marketingPostsPerWeek: 3,
    marketingDailyPostCap: 2,
    marketingDailyAdBudgetVnd: 500000,
    hrAutoDecide: false,
    sleepIdleAgents: false,
    maxConcurrentAgents: 8,
    spendingPolicy: createDefaultSpendingPolicy(),
    dailyDigestEnabled: true,
    envMode: 'sandbox',
    hubcw: {
      baseUrl: DEFAULT_HUBCW_BASE_URL,
      connectionMode: 'sandbox',
      hourlyWriteLimit: 30,
      requireApprovalForCritical: true,
      unclearWriteUnlocked: { golden_pig: false, automation: false, resources: false },
      moduleHealth: {},
    },
    brand: { ...DEFAULT_BRAND_PALETTE },
    schemaVersion: CURRENT_SCHEMA_VERSION,
    affiliate: defaultAff,
    legal: defaultLegal,
    onboarding: defaultOnboarding,
    workingHourStart: 8,
    workingHourEnd: 22,
    timezone: 'Asia/Ho_Chi_Minh',
    spotCheck: {
      autoEnabled: true,
      runsPerDay: 4,
      startHour: 8,
      endHour: 20,
      retentionDays: 14,
      streamFps: 1,
      alertOnAbnormal: true,
    },
    voice: {
      provider: 'azure_tts',
      priorityOrder: [
        'azure_tts',
        'edge_tts',
        'google_tts',
        'gemini_tts',
        'fpt_tts',
        'worker_piper',
        'web_speech',
        'text_only',
      ],
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      azureRegion: 'southeastasia',
      sttProvider: 'web_speech',
      sttAutoSendHighConfidence: false,
      ceoAcronymMode: 'xi_i_au',
      acronymDict: { ...DEFAULT_VI_ACRONYM_DICT },
      autoReadResponses: false,
      handsFreeListening: false,
      quickMeetingDefaultMinutes: 5,
      maxTurnsPerAgentInMeeting: 4,
      defaultRecordTranscript: false,
    },
    zaloPersonal: {
      enabled: false,
      riskConfirmedByCeo: false,
      dedicatedCompanyAccountConfirmed: false,
      priorityMode: 'zalo_oa_primary',
      dailyColdOutboundCap: 20,
      minDelaySecondsBetweenMsgs: 15,
      allowColdMarketingApprovedByLegal: false,
      dncList: [],
      autoPauseOnAnomaly: true,
    },
    hrAutonomy: {
      maxActiveAgents: 45,
      dailyTokenCap: 500000,
      autoScaleMode: 'l1_propose',
      requireExamPassForLive: true,
    },
    locale: 'vi',
    currencyUnit: 'VND',
    workingDays: [1, 2, 3, 4, 5, 6],
    holidays: [
      { date: '2026-04-30', name: 'Ngày Giải phóng miền Nam 30/4' },
      { date: '2026-05-01', name: 'Quốc tế Lao động 1/5' },
      { date: '2026-09-02', name: 'Quốc khánh 2/9' },
    ],
    fontSizeScale: 'md',
    ambientAudioEnabled: false,
    activeOfficeLayoutId: 'preset_standard_3f',
    pwaPushEnabled: false,
    ...(partial || {}),
  };
}

/**
 * Migrates any legacy or partial settings object safely up to schemaVersion = 6.
 */
export function migrateSettingsRecord(raw: unknown): {
  settings: CompanySettings;
  migrated: boolean;
  recoveredFromCorruption: boolean;
} {
  const defaults = buildFallbackBaseSettings();
  if (!raw || typeof raw !== 'object') {
    if (raw !== undefined && raw !== null) {
      safeBackupCorruptedData('settings', raw);
    }
    return { settings: defaults, migrated: true, recoveredFromCorruption: raw !== undefined && raw !== null };
  }

  const stored = raw as Partial<CompanySettings> & { graphicsQuality?: string };
  const rawGraphics = String(stored.graphicsQuality || 'medium');
  const normalizedQuality: CompanySettings['graphicsQuality'] =
    rawGraphics === 'eco' || rawGraphics === 'low'
      ? 'low'
      : rawGraphics === 'high'
      ? 'high'
      : 'medium';

  const rawSpeed = Number(stored.simulationSpeed);
  const normalizedSpeed: 1 | 2 | 4 = rawSpeed === 2 ? 2 : rawSpeed === 4 ? 4 : 1;

  const mergedAff = stored.affiliate
    ? {
        ...defaults.affiliate,
        ...stored.affiliate,
        networks:
          Array.isArray(stored.affiliate.networks) && stored.affiliate.networks.length > 0
            ? stored.affiliate.networks
            : defaults.affiliate.networks,
      }
    : defaults.affiliate;

  const merged: CompanySettings = {
    ...defaults,
    ...stored,
    id: 'default',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    simulationSpeed: normalizedSpeed,
    graphicsQuality: normalizedQuality,
    providerBudgets: { ...defaults.providerBudgets, ...(stored.providerBudgets || {}) },
    spendingPolicy: { ...defaults.spendingPolicy, ...(stored.spendingPolicy || {}) },
    hubcw: {
      ...defaults.hubcw,
      ...(stored.hubcw || {}),
      unclearWriteUnlocked: {
        ...defaults.hubcw.unclearWriteUnlocked,
        ...(stored.hubcw?.unclearWriteUnlocked || {}),
      },
      moduleHealth: {
        ...defaults.hubcw.moduleHealth,
        ...(stored.hubcw?.moduleHealth || {}),
      },
    },
    brand: { ...defaults.brand, ...(stored.brand || {}) },
    affiliate: mergedAff,
    legal: { ...defaults.legal, ...(stored.legal || {}) },
    onboarding: { ...defaults.onboarding, ...(stored.onboarding || {}) },
    spotCheck: { ...defaults.spotCheck!, ...(stored.spotCheck || {}) },
    voice: {
      ...defaults.voice!,
      ...(stored.voice || {}),
      acronymDict: {
        ...(defaults.voice!.acronymDict || {}),
        ...(stored.voice?.acronymDict || {}),
      },
      priorityOrder:
        Array.isArray(stored.voice?.priorityOrder) && stored.voice!.priorityOrder.length > 0
          ? stored.voice!.priorityOrder
          : defaults.voice!.priorityOrder,
    },
    zaloPersonal: {
      ...defaults.zaloPersonal!,
      ...(stored.zaloPersonal || {}),
      dailyColdOutboundCap: Math.min(20, Math.max(1, Number(stored.zaloPersonal?.dailyColdOutboundCap ?? 20))),
    },
    hrAutonomy: { ...defaults.hrAutonomy!, ...(stored.hrAutonomy || {}) },
    locale: stored.locale === 'en' ? 'en' : 'vi',
    currencyUnit: stored.currencyUnit === 'USD' ? 'USD' : 'VND',
    workingDays: Array.isArray(stored.workingDays) && stored.workingDays.length > 0 ? stored.workingDays : defaults.workingDays,
    holidays: Array.isArray(stored.holidays) ? stored.holidays : defaults.holidays,
    fontSizeScale: stored.fontSizeScale === 'sm' || stored.fontSizeScale === 'lg' ? stored.fontSizeScale : 'md',
    ambientAudioEnabled: Boolean(stored.ambientAudioEnabled),
    activeOfficeLayoutId: stored.activeOfficeLayoutId || defaults.activeOfficeLayoutId,
    pwaPushEnabled: Boolean(stored.pwaPushEnabled),
    roleRoutes:
      Array.isArray(stored.roleRoutes) && stored.roleRoutes.length > 0
        ? stored.roleRoutes
        : defaults.roleRoutes,
  };

  const prevVer = Number(stored.schemaVersion || 1);
  return {
    settings: merged,
    migrated: prevVer < CURRENT_SCHEMA_VERSION,
    recoveredFromCorruption: false,
  };
}

/**
 * Ensures all 14 builtin departments (including Floor 2 Legal & Floor 3 Affiliate rooms)
 * exist even when upgrading from older databases. Preserves user's custom departments.
 */
export function migrateDepartmentsList(rawDepts: unknown): DepartmentConfig[] {
  const seeds = buildSeedDepartments();
  if (!Array.isArray(rawDepts) || rawDepts.length === 0) {
    if (rawDepts !== undefined && !Array.isArray(rawDepts)) {
      safeBackupCorruptedData('departments', rawDepts);
    }
    return seeds;
  }

  const validList: DepartmentConfig[] = [];
  for (const item of rawDepts) {
    const parsed = DepartmentSchema.safeParse(item);
    if (parsed.success) {
      validList.push(parsed.data as DepartmentConfig);
    }
  }

  if (validList.length === 0) {
    safeBackupCorruptedData('departments_invalid', rawDepts);
    return seeds;
  }

  const byId = new Map(validList.map((d) => [d.id, d]));
  for (const s of seeds) {
    const existing = byId.get(s.id);
    if (!existing) {
      byId.set(s.id, s);
    } else if (!existing.isCustom) {
      // Refresh builtin room coordinates (e.g. Floor 2 Backoffice/Data split for Legal) while keeping collapsed flag
      byId.set(s.id, { ...s, collapsed: existing.collapsed });
    }
  }

  return Array.from(byId.values());
}

/**
 * Ensures all new Legal & Floor 3 Affiliate agents exist when upgrading from older DBs,
 * and upgrades legacy 'legal' agent into room-legal without touching user-hired custom agents.
 */
export function migrateAgentsList(rawAgents: unknown): AgentProfile[] {
  const seeds = buildSeedAgents();
  if (!Array.isArray(rawAgents) || rawAgents.length === 0) {
    if (rawAgents !== undefined && !Array.isArray(rawAgents)) {
      safeBackupCorruptedData('agents', rawAgents);
    }
    return seeds;
  }

  const validList: AgentProfile[] = [];
  for (const item of rawAgents) {
    const parsed = AgentSchema.safeParse(item);
    if (parsed.success) {
      validList.push(item as AgentProfile);
    }
  }

  if (validList.length === 0) {
    safeBackupCorruptedData('agents_invalid', rawAgents);
    return seeds;
  }

  const seedById = new Map(seeds.map((a) => [a.id, a]));
  const result = new Map<string, AgentProfile>();

  for (const existing of validList) {
    if (existing.id === 'legal' && existing.department === 'backoffice') {
      // Upgrade legacy single legal advisor into the dedicated Floor 2 Legal Counsel room
      const upgraded = seedById.get('legal')!;
      result.set(existing.id, {
        ...upgraded,
        name: existing.name || upgraded.name,
        employmentStatus: existing.employmentStatus || 'active',
      });
    } else {
      result.set(existing.id, {
        ...existing,
        floor: existing.floor === 3 ? 3 : existing.floor === 2 ? 2 : 1,
      });
    }
  }

  // Add newly introduced Floor 2 Legal & Floor 3 Affiliate agents if missing
  for (const seed of seeds) {
    if (!result.has(seed.id)) {
      result.set(seed.id, seed);
    }
  }

  return Array.from(result.values());
}
