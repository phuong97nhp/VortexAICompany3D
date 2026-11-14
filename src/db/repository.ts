import Dexie, { Table } from 'dexie';
import {
  AdCampaignItem,
  AgentAccount,
  AgentAppearance,
  AgentMemory,
  AgentProfile,
  ApprovalRequest,
  AskCeoQuestion,
  AuditLogEntry,
  BrandLaunchKit,
  ChatMessage,
  CompanySettings,
  DepartmentConfig,
  DocumentItem,
  ExpenseBudget,
  ExpenseCategoryConfig,
  ExpenseItem,
  ExpenseRule,
  HrAuditEntry,
  LeadItem,
  MarketingChannelRecord,
  OutreachLogEntry,
  ScheduledSocialPost,
  SocialCommentInboxItem,
  SocialPostLogEntry,
  TaskItem,
  TokenUsageRecord,
  VaultAccountStatus,
  WorkflowTrace,
} from '../types';
import { generateHashedAgentToken, generateSalt, hashPasswordPBKDF2 } from '../engine/auth';
import { getDefaultAppearance } from '../engine/characterAppearance';
import { buildRoutingPreset } from '../engine/llm/presets';
import { buildSeedAgents, buildSeedDepartments } from '../engine/liveRegistry';
import {
  buildSeedExpenseBudgets,
  buildSeedExpenseRules,
  buildSeedExpenses,
  createDefaultSpendingPolicy,
  DEFAULT_EXPENSE_CATEGORIES,
} from '../engine/expenseEngine';
import {
  buildDefaultBrandLaunchKit,
  buildInitialAdCampaigns,
  buildInitialMarketingChannels,
  buildInitialScheduledPosts,
  buildInitialSocialComments,
  buildInitialSocialLogs,
} from '../engine/marketingSeeds';

export interface CompanyMemoryRecord {
  id: string;
  key: string;
  content: string;
  updatedAt: number;
}

export interface IDataRepository {
  getSettings(): Promise<CompanySettings>;
  saveSettings(settings: CompanySettings): Promise<void>;
  getAgents(): Promise<AgentProfile[]>;
  putAgent(agent: AgentProfile): Promise<void>;
  deleteAgent(agentId: string): Promise<void>;
  getDepartments(): Promise<DepartmentConfig[]>;
  putDepartment(dept: DepartmentConfig): Promise<void>;
  deleteDepartment(deptId: string): Promise<void>;
  getHrAudits(): Promise<HrAuditEntry[]>;
  addHrAudit(entry: HrAuditEntry): Promise<void>;
  getTasks(): Promise<TaskItem[]>;
  putTask(task: TaskItem): Promise<void>;
  getLeads(): Promise<LeadItem[]>;
  putLead(lead: LeadItem): Promise<void>;
  getMessages(): Promise<ChatMessage[]>;
  addMessage(msg: ChatMessage): Promise<void>;
  getDocuments(): Promise<DocumentItem[]>;
  putDocument(doc: DocumentItem): Promise<void>;
  getApprovals(): Promise<ApprovalRequest[]>;
  putApproval(req: ApprovalRequest): Promise<void>;
  getAskCeoQuestions(): Promise<AskCeoQuestion[]>;
  putAskCeoQuestion(q: AskCeoQuestion): Promise<void>;
  getAuditLogs(): Promise<AuditLogEntry[]>;
  addAuditLog(entry: AuditLogEntry): Promise<void>;
  getOutreachLogs(): Promise<OutreachLogEntry[]>;
  addOutreachLog(entry: OutreachLogEntry): Promise<void>;
  getAccounts(): Promise<AgentAccount[]>;
  putAccount(acc: AgentAccount): Promise<void>;
  deleteAccount(agentId: string): Promise<void>;
  getVaultStatuses(): Promise<VaultAccountStatus[]>;
  putVaultStatus(status: VaultAccountStatus): Promise<void>;
  getTokenUsage(): Promise<TokenUsageRecord[]>;
  addTokenUsage(rec: TokenUsageRecord): Promise<void>;
  getAgentMemories(): Promise<AgentMemory[]>;
  putAgentMemory(mem: AgentMemory): Promise<void>;
  getCompanyMemories(): Promise<CompanyMemoryRecord[]>;
  putCompanyMemory(mem: CompanyMemoryRecord): Promise<void>;
  getWorkflows(): Promise<WorkflowTrace[]>;
  putWorkflow(wf: WorkflowTrace): Promise<void>;
  getAgentAppearances(): Promise<AgentAppearance[]>;
  putAgentAppearance(app: AgentAppearance): Promise<void>;
  getBrandKit(): Promise<BrandLaunchKit | undefined>;
  putBrandKit(kit: BrandLaunchKit): Promise<void>;
  getMarketingChannels(): Promise<MarketingChannelRecord[]>;
  putMarketingChannel(ch: MarketingChannelRecord): Promise<void>;
  getScheduledPosts(): Promise<ScheduledSocialPost[]>;
  putScheduledPost(post: ScheduledSocialPost): Promise<void>;
  getAdCampaigns(): Promise<AdCampaignItem[]>;
  putAdCampaign(ad: AdCampaignItem): Promise<void>;
  getSocialComments(): Promise<SocialCommentInboxItem[]>;
  putSocialComment(cmt: SocialCommentInboxItem): Promise<void>;
  getSocialLogs(): Promise<SocialPostLogEntry[]>;
  addSocialLog(entry: SocialPostLogEntry): Promise<void>;
  getExpenses(): Promise<ExpenseItem[]>;
  putExpense(exp: ExpenseItem): Promise<void>;
  getExpenseRules(): Promise<ExpenseRule[]>;
  putExpenseRule(rule: ExpenseRule): Promise<void>;
  deleteExpenseRule(ruleId: string): Promise<void>;
  getExpenseBudgets(): Promise<ExpenseBudget[]>;
  putExpenseBudget(budget: ExpenseBudget): Promise<void>;
  getExpenseCategories(): Promise<ExpenseCategoryConfig[]>;
  putExpenseCategory(cat: ExpenseCategoryConfig): Promise<void>;
  resetAll(): Promise<void>;
}

class AICompanyDexieDB extends Dexie {
  settings!: Table<CompanySettings, string>;
  agents!: Table<AgentProfile, string>;
  departments!: Table<DepartmentConfig, string>;
  hrAudits!: Table<HrAuditEntry, string>;
  tasks!: Table<TaskItem, string>;
  leads!: Table<LeadItem, string>;
  messages!: Table<ChatMessage, string>;
  documents!: Table<DocumentItem, string>;
  approvals!: Table<ApprovalRequest, string>;
  askCeoQuestions!: Table<AskCeoQuestion, string>;
  auditLogs!: Table<AuditLogEntry, string>;
  outreachLogs!: Table<OutreachLogEntry, string>;
  accounts!: Table<AgentAccount, string>;
  vaultStatuses!: Table<VaultAccountStatus, string>;
  tokenUsage!: Table<TokenUsageRecord, string>;
  agentMemories!: Table<AgentMemory, string>;
  companyMemories!: Table<CompanyMemoryRecord, string>;
  workflows!: Table<WorkflowTrace, string>;
  agentAppearances!: Table<AgentAppearance, string>;
  brandKits!: Table<BrandLaunchKit, string>;
  marketingChannels!: Table<MarketingChannelRecord, string>;
  scheduledPosts!: Table<ScheduledSocialPost, string>;
  adCampaigns!: Table<AdCampaignItem, string>;
  socialComments!: Table<SocialCommentInboxItem, string>;
  socialLogs!: Table<SocialPostLogEntry, string>;
  expenses!: Table<ExpenseItem, string>;
  expenseRules!: Table<ExpenseRule, string>;
  expenseBudgets!: Table<ExpenseBudget, string>;
  expenseCategories!: Table<ExpenseCategoryConfig, string>;

  constructor() {
    super('AICompany3D_DB_v1');
    this.version(1).stores({
      settings: 'id',
      tasks: 'id, department, assignedTo, status, createdAt',
      leads: 'id, stage, recommendedProductId, score, province, createdAt',
      messages: 'id, channelId, senderId, timestamp',
      documents: 'id, category, authorId, department, createdAt',
      approvals: 'id, status, type, requestedBy, createdAt',
      askCeoQuestions: 'id, status, agentId, urgency, createdAt',
      auditLogs: 'id, agentId, result, timestamp',
      outreachLogs: 'id, agentId, leadId, channel, timestamp',
      accounts: 'agentId, role, department, status',
      vaultStatuses: 'id, platform, status',
      tokenUsage: 'id, dateKey, agentId, model, timestamp',
      agentMemories: 'agentId, updatedAt',
      companyMemories: 'id, key',
      workflows: 'id, createdAt',
    });

    this.version(2).stores({
      settings: 'id',
      tasks: 'id, department, assignedTo, status, createdAt',
      leads: 'id, stage, recommendedProductId, score, province, createdAt',
      messages: 'id, channelId, senderId, timestamp',
      documents: 'id, category, authorId, department, createdAt',
      approvals: 'id, status, type, requestedBy, createdAt',
      askCeoQuestions: 'id, status, agentId, urgency, createdAt',
      auditLogs: 'id, agentId, result, timestamp',
      outreachLogs: 'id, agentId, leadId, channel, timestamp',
      accounts: 'agentId, role, department, status',
      vaultStatuses: 'id, platform, status',
      tokenUsage: 'id, dateKey, agentId, provider, model, timestamp',
      agentMemories: 'agentId, updatedAt',
      companyMemories: 'id, key',
      workflows: 'id, createdAt',
      agentAppearances: 'agentId',
    });

    this.version(3).stores({
      settings: 'id',
      tasks: 'id, department, assignedTo, status, createdAt',
      leads: 'id, stage, recommendedProductId, score, province, createdAt',
      messages: 'id, channelId, senderId, timestamp',
      documents: 'id, category, authorId, department, createdAt',
      approvals: 'id, status, type, requestedBy, createdAt',
      askCeoQuestions: 'id, status, agentId, urgency, createdAt',
      auditLogs: 'id, agentId, result, timestamp',
      outreachLogs: 'id, agentId, leadId, channel, timestamp',
      accounts: 'agentId, role, department, status',
      vaultStatuses: 'id, platform, status',
      tokenUsage: 'id, dateKey, agentId, provider, model, timestamp',
      agentMemories: 'agentId, updatedAt',
      companyMemories: 'id, key',
      workflows: 'id, createdAt',
      agentAppearances: 'agentId',
      brandKits: 'id, createdAt',
      marketingChannels: 'id, status, updatedAt',
      scheduledPosts: 'id, platform, dayNumber, status, createdAt',
      adCampaigns: 'id, platform, status, createdAt',
      socialComments: 'id, platform, status, createdAt',
      socialLogs: 'id, platform, agentId, timestamp',
    });

    this.version(4).stores({
      settings: 'id',
      agents: 'id, department, employmentStatus, createdAt',
      departments: 'id, floor, isCustom',
      hrAudits: 'id, targetId, action, timestamp',
      tasks: 'id, taskCode, department, assignedTo, status, createdAt',
      leads: 'id, stage, recommendedProductId, score, province, createdAt',
      messages: 'id, channelId, senderId, timestamp',
      documents: 'id, category, authorId, department, createdAt',
      approvals: 'id, status, type, requestedBy, createdAt',
      askCeoQuestions: 'id, status, agentId, urgency, createdAt',
      auditLogs: 'id, agentId, result, timestamp',
      outreachLogs: 'id, agentId, leadId, channel, timestamp',
      accounts: 'agentId, role, department, status',
      vaultStatuses: 'id, platform, status',
      tokenUsage: 'id, dateKey, agentId, provider, model, timestamp',
      agentMemories: 'agentId, updatedAt',
      companyMemories: 'id, key',
      workflows: 'id, createdAt',
      agentAppearances: 'agentId',
      brandKits: 'id, createdAt',
      marketingChannels: 'id, status, updatedAt',
      scheduledPosts: 'id, platform, dayNumber, status, createdAt',
      adCampaigns: 'id, platform, status, createdAt',
      socialComments: 'id, platform, status, createdAt',
      socialLogs: 'id, platform, agentId, timestamp',
      expenses: 'id, expenseCode, status, department, category, requesterId, vendor, createdAt',
      expenseRules: 'id, ruleCode, enabled, category, createdAt',
      expenseBudgets: 'id, monthKey, department, category',
      expenseCategories: 'id, name',
    });
  }
}

export const db = new AICompanyDexieDB();

export async function createDefaultSettings(): Promise<CompanySettings> {
  const salt = generateSalt(16);
  const hash = await hashPasswordPBKDF2('admin123', salt);
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
    providerBudgets: {
      gemini: 500000,
      deepseek: 400000,
      local: 2000000,
      mock: 9999999,
    },
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
    ceoPasswordHash: hash,
    ceoPasswordSalt: salt,
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
  };
}

async function ensureMarketingSeeded(companyName: string): Promise<void> {
  const chCount = await db.marketingChannels.count();
  if (chCount === 0) {
    await db.brandKits.put(buildDefaultBrandLaunchKit(companyName));
    await db.marketingChannels.bulkPut(buildInitialMarketingChannels(companyName));
    await db.scheduledPosts.bulkPut(buildInitialScheduledPosts());
    await db.adCampaigns.bulkPut(buildInitialAdCampaigns());
    await db.socialComments.bulkPut(buildInitialSocialComments());
    await db.socialLogs.bulkPut(buildInitialSocialLogs());
  }
}

async function ensureV4Seeded(): Promise<void> {
  const deptCount = await db.departments.count();
  if (deptCount === 0) {
    await db.departments.bulkPut(buildSeedDepartments());
  }
  const agentCount = await db.agents.count();
  if (agentCount === 0) {
    await db.agents.bulkPut(buildSeedAgents());
  }
  const catCount = await db.expenseCategories.count();
  if (catCount === 0) {
    await db.expenseCategories.bulkPut(DEFAULT_EXPENSE_CATEGORIES);
  }
  const budgetCount = await db.expenseBudgets.count();
  if (budgetCount === 0) {
    await db.expenseBudgets.bulkPut(buildSeedExpenseBudgets());
  }
  const ruleCount = await db.expenseRules.count();
  if (ruleCount === 0) {
    await db.expenseRules.bulkPut(buildSeedExpenseRules());
  }
  const expCount = await db.expenses.count();
  if (expCount === 0) {
    await db.expenses.bulkPut(buildSeedExpenses());
  }
  // Ensure CFO & HR have new permissions
  const cfoAcc = await db.accounts.get('cfo');
  if (cfoAcc && !cfoAcc.permissions.includes('expense:review')) {
    await db.accounts.put({
      ...cfoAcc,
      permissions: Array.from(
        new Set([...cfoAcc.permissions, 'expense:request', 'expense:review', 'expense:rule_manage', 'expense:mark_paid'])
      ),
    });
  }
  const hrAcc = await db.accounts.get('hr');
  if (hrAcc && !hrAcc.permissions.includes('hr:manage')) {
    await db.accounts.put({
      ...hrAcc,
      permissions: Array.from(new Set([...hrAcc.permissions, 'hr:manage', 'expense:request'])),
    });
  }
}

export async function seedInitialDatabase(): Promise<void> {
  const existingSettings = await db.settings.get('default');
  if (existingSettings) {
    const seedAgents = buildSeedAgents();
    const appCount = await db.agentAppearances.count();
    if (appCount === 0) {
      await db.agentAppearances.bulkPut(seedAgents.map((a) => getDefaultAppearance(a)));
    }
    await ensureMarketingSeeded(existingSettings.companyName || 'AI COMPANY VIỆT NAM');
    await ensureV4Seeded();
    const smAcc = await db.accounts.get('social_media');
    if (smAcc && !smAcc.permissions.includes('post:publish')) {
      await db.accounts.put({ ...smAcc, permissions: [...smAcc.permissions, 'post:publish', 'lead:write'] });
    }
    const adsAcc = await db.accounts.get('ads_specialist');
    if (adsAcc && !adsAcc.permissions.includes('ads:manage')) {
      await db.accounts.put({ ...adsAcc, permissions: [...adsAcc.permissions, 'ads:manage', 'budget:spend'] });
    }
    return;
  }

  const now = Date.now();
  const todayKey = new Date().toISOString().slice(0, 10);

  const settings = await createDefaultSettings();
  await db.settings.put(settings);

  const seedDepts = buildSeedDepartments();
  const seedAgents = buildSeedAgents();
  await db.departments.bulkPut(seedDepts);
  await db.agents.bulkPut(seedAgents);

  // Seed 30 Chibi 3D agent appearances
  await db.agentAppearances.bulkPut(seedAgents.map((a) => getDefaultAppearance(a)));

  // Seed v3 Marketing Channels, Brand Launch Kit, Calendar, Ads & Comments
  await ensureMarketingSeeded(settings.companyName);

  // Seed v4 Expenses, Rules, Budgets, Categories
  await ensureV4Seeded();

  // Seed 30 agent RBAC accounts with SHA-256 hashed internal tokens
  const accounts: AgentAccount[] = [];
  for (const agent of seedAgents) {
    const token = await generateHashedAgentToken(agent.id);
    accounts.push({
      agentId: agent.id,
      username: agent.id,
      internalEmail: `${agent.id}@aicompany.vn`,
      role: agent.role,
      department: agent.department,
      status: 'active',
      tokenHash: token.hash,
      permissions: [...agent.defaultPermissions],
      lastActiveAt: now - Math.floor(Math.random() * 600000),
    });
  }
  await db.accounts.bulkPut(accounts);

  // Seed initial agent memories
  await db.agentMemories.bulkPut(
    seedAgents.map((a) => ({
      agentId: a.id,
      shortTerm: [`Nhận bàn làm việc tại ${a.roomId}`, `Sản phẩm ưu tiên hiện tại: EduCenter Pro`],
      longTermSummary: `${a.name} (${a.title}) sẵn sàng phối hợp theo quy trình RBAC và DRY_RUN mặc định.`,
      updatedAt: now,
    }))
  );

  // Seed company shared memory
  await db.companyMemories.bulkPut([
    {
      id: 'cm_mission',
      key: 'Chiến lược Q4',
      content: 'Tập trung 60% nguồn lực Sales vào phân khúc Trung tâm Ngoại ngữ tại TP.HCM & Hà Nội, 40% vào Trường Mầm non và Kho hàng SME.',
      updatedAt: now,
    },
    {
      id: 'cm_compliance',
      key: 'Tuân thủ Nghị định 91/2020',
      content: 'Mọi tin nhắn tiếp cận đều phải có dòng "Nhắn DỪNG để không nhận thêm", gửi trong khung 8h–20h, tối đa 3 follow-up.',
      updatedAt: now,
    },
  ]);

  // Seed realistic Vietnamese leads
  const initialLeads: LeadItem[] = [
    {
      id: 'lead_1',
      name: 'Trung tâm Anh ngữ SunLight Academy',
      category: 'Trung tâm ngoại ngữ',
      address: '142 Nguyễn Thị Minh Khai, Quận 3',
      province: 'TP.HCM',
      website: 'https://sunlight-english.vn',
      email: 'tuyensinh@sunlight-english.vn',
      phone: '0908 412 319',
      zalo: '0908412319',
      fanpage: 'fb.com/SunLightAcademyQ3',
      source: 'Google Maps Công khai',
      score: 92,
      scoreReason: '3 cơ sở, đang tuyển sinh IELTS mạnh, chưa có App phụ huynh & nhắc học phí tự động.',
      recommendedProductId: 'edu-center',
      stage: 'demo',
      assignedAgentId: 'account_executive',
      followUpCount: 1,
      lastContactedAt: now - 86400000,
      blacklisted: false,
      estimatedValueVnd: 29880000,
      interactions: [
        {
          id: 'int_1',
          channel: 'Email',
          direction: 'outbound',
          content: 'Gửi giải pháp xếp lịch & nhắc học phí Zalo OA cho 3 cơ sở SunLight.',
          agentId: 'sdr_1',
          timestamp: now - 172800000,
          dryRun: true,
        },
        {
          id: 'int_2',
          channel: 'Zalo OA',
          direction: 'inbound',
          content: 'Cô Lan (Quản lý) phản hồi: Quan tâm tính năng chấm công giáo viên bản ngữ, hẹn demo 14h.',
          agentId: 'account_executive',
          timestamp: now - 86400000,
          dryRun: true,
        },
      ],
      createdAt: now - 259200000,
    },
    {
      id: 'lead_2',
      name: 'Anh ngữ Quốc tế StarEdu Cầu Giấy',
      category: 'Trung tâm ngoại ngữ',
      address: '88 Trần Thái Tông, Cầu Giấy',
      province: 'Hà Nội',
      website: 'https://staredu.edu.vn',
      email: 'info@staredu.edu.vn',
      phone: '0983 221 890',
      zalo: '0983221890',
      source: 'Fanpage Công khai',
      score: 86,
      scoreReason: 'Quy mô ~450 học viên, đang chạy ads tuyển sinh nhưng phản hồi inbox chậm.',
      recommendedProductId: 'edu-center',
      stage: 'replied',
      assignedAgentId: 'sdr_1',
      followUpCount: 1,
      lastContactedAt: now - 43200000,
      blacklisted: false,
      estimatedValueVnd: 29880000,
      interactions: [
        {
          id: 'int_3',
          channel: 'Facebook',
          direction: 'outbound',
          content: 'Giới thiệu EduCenter Pro tích hợp CRM tuyển sinh & lịch học thử.',
          agentId: 'sdr_1',
          timestamp: now - 86400000,
          dryRun: true,
        },
      ],
      createdAt: now - 180000000,
    },
    {
      id: 'lead_3',
      name: 'Trường Mầm non Song ngữ Hoa Hướng Dương',
      category: 'Trường mầm non',
      address: '25 Phan Xích Long, Phú Nhuận',
      province: 'TP.HCM',
      email: 'bgh@hoahuongduong.edu.vn',
      phone: '0912 778 445',
      zalo: '0912778445',
      source: 'Danh bạ Giáo dục',
      score: 84,
      scoreReason: '180 bé, phụ huynh yêu cầu cập nhật thực đơn & ảnh hàng ngày qua Zalo.',
      recommendedProductId: 'preschool-care',
      stage: 'proposal',
      assignedAgentId: 'pricing_proposal',
      followUpCount: 2,
      lastContactedAt: now - 36000000,
      blacklisted: false,
      estimatedValueVnd: 19080000,
      interactions: [],
      createdAt: now - 300000000,
    },
    {
      id: 'lead_4',
      name: 'Công ty TNHH Kho Vận & TM Minh Phát',
      category: 'Doanh nghiệp kho/bán lẻ',
      address: 'KCN Tân Bình, Quận Tân Phú',
      province: 'TP.HCM',
      website: 'https://minhphatlogistics.vn',
      email: 'kho@minhphatlogistics.vn',
      phone: '0938 661 204',
      source: 'Website Công khai',
      score: 79,
      scoreReason: 'Có 2 kho hàng gia dụng > 4.000 SKU, hay lệch tồn kho cuối tháng.',
      recommendedProductId: 'warehouse-pro',
      stage: 'contacted',
      assignedAgentId: 'sdr_2',
      followUpCount: 1,
      lastContactedAt: now - 72000000,
      blacklisted: false,
      estimatedValueVnd: 22680000,
      interactions: [],
      createdAt: now - 150000000,
    },
    {
      id: 'lead_5',
      name: 'Nội thất Gỗ Việt Decor',
      category: 'Doanh nghiệp SME',
      address: '310 Nguyễn Văn Linh, Hải Châu',
      province: 'Đà Nẵng',
      email: 'contact@govietdecor.vn',
      phone: '0905 334 912',
      source: 'Google Search',
      score: 74,
      scoreReason: 'Website cũ chưa tối ưu mobile và chưa có form báo giá tự động.',
      recommendedProductId: 'web-design',
      stage: 'new',
      assignedAgentId: 'lead_hunter_smb',
      followUpCount: 0,
      blacklisted: false,
      estimatedValueVnd: 14500000,
      interactions: [],
      createdAt: now - 50000000,
    },
    {
      id: 'lead_6',
      name: 'Trung tâm Tiếng Nhật Sakura Bình Thạnh',
      category: 'Trung tâm ngoại ngữ',
      address: '76 Điện Biên Phủ, Bình Thạnh',
      province: 'TP.HCM',
      email: 'daotao@sakura-bt.vn',
      phone: '0977 554 112',
      zalo: '0977554112',
      source: 'Google Maps Công khai',
      score: 89,
      scoreReason: 'Nhiều lớp N5–N2 khai giảng liên tục, cần tự động xếp phòng & tính công giáo viên.',
      recommendedProductId: 'edu-center',
      stage: 'won',
      assignedAgentId: 'account_executive',
      followUpCount: 2,
      lastContactedAt: now - 20000000,
      blacklisted: false,
      estimatedValueVnd: 29880000,
      interactions: [],
      createdAt: now - 500000000,
    },
  ];
  await db.leads.bulkPut(initialLeads);

  // Seed initial structured tasks (BỔ SUNG F)
  await db.tasks.bulkPut([
    {
      id: 'task_1',
      taskCode: '#T-101',
      title: 'Chuẩn bị buổi Demo 1-1 cho Anh ngữ SunLight Academy',
      description: 'Dùng dữ liệu sandbox 3 cơ sở + tính năng chấm công giáo viên bản ngữ.',
      definitionOfDone: 'Hoàn tất kịch bản demo + tài liệu checklist gửi CEO duyệt.',
      expectedDeliverable: 'Kịch bản Demo & Sandbox checklist',
      department: 'sales',
      assignedTo: 'account_executive',
      createdBy: 'sales_director',
      status: 'in_progress',
      priority: 'high',
      productId: 'edu-center',
      relatedLeadId: 'lead_1',
      etaMinutes: 20,
      etaAt: now + 15 * 60000,
      startedAt: now - 5 * 60000,
      progressPercent: 45,
      lastProgressAt: now - 60000,
      deliverables: [],
      createdAt: now - 7200000,
      updatedAt: now - 60000,
      dueLabel: 'Hôm nay 14:00',
    },
    {
      id: 'task_2',
      taskCode: '#T-102',
      title: 'Soạn báo giá Gói Trường Chuẩn cho Mầm non Hoa Hướng Dương',
      description: 'Tính ưu đãi thanh toán 12 tháng + miễn phí import danh sách bé.',
      definitionOfDone: 'Có báo giá PDF nháp + phiếu xin duyệt giảm 10%.',
      expectedDeliverable: 'Báo giá & Tờ trình ưu đãi',
      department: 'sales',
      assignedTo: 'pricing_proposal',
      createdBy: 'account_executive',
      status: 'waiting_approval',
      priority: 'medium',
      productId: 'preschool-care',
      relatedLeadId: 'lead_3',
      etaMinutes: 15,
      etaAt: now + 3600000,
      startedAt: now - 1800000,
      progressPercent: 90,
      lastProgressAt: now - 1800000,
      deliverables: [],
      createdAt: now - 10800000,
      updatedAt: now - 1800000,
      dueLabel: 'Chờ CEO duyệt',
    },
    {
      id: 'task_3',
      taskCode: '#T-103',
      title: 'Khảo sát từ khóa SEO "phần mềm quản lý trung tâm tiếng Anh"',
      description: 'Lập bộ 20 từ khóa long-tail có tỷ lệ chuyển đổi cao.',
      definitionOfDone: 'Lưu bảng từ khóa vào Kho tài liệu.',
      expectedDeliverable: 'Bộ từ khóa SEO Trọng tâm Q4',
      department: 'marketing',
      assignedTo: 'seo_specialist',
      createdBy: 'cmo',
      status: 'done',
      priority: 'medium',
      productId: 'edu-center',
      etaMinutes: 10,
      etaAt: now - 18000000,
      startedAt: now - 22000000,
      completedAt: now - 20000000,
      progressPercent: 100,
      lastProgressAt: now - 20000000,
      deliverables: [{ type: 'doc', id: 'doc_seed_1', title: 'Bộ từ khóa SEO Trọng tâm Q4 – EduCenter Pro' }],
      createdAt: now - 86400000,
      updatedAt: now - 20000000,
      dueLabel: 'Đã xong',
    },
    {
      id: 'task_4',
      taskCode: '#T-104',
      title: 'Thiết lập tài khoản Zalo OA & kiểm tra webhook',
      description: 'Chuẩn hóa kênh gửi tin tự động theo Playbook worker/playbooks/zalo_oa.ts.',
      definitionOfDone: 'Kênh Zalo OA ở trạng thái sẵn sàng hoặc đã gửi OTP cho CEO.',
      expectedDeliverable: 'Trạng thái kênh Zalo OA trong Kho kênh',
      department: 'sales',
      assignedTo: 'account_provisioning',
      createdBy: 'sales_director',
      status: 'todo',
      priority: 'high',
      etaMinutes: 15,
      etaAt: now + 900000,
      progressPercent: 0,
      lastProgressAt: now - 3600000,
      deliverables: [],
      createdAt: now - 3600000,
      updatedAt: now - 3600000,
      dueLabel: 'Chu kỳ hiện tại',
    },
  ]);

  // Seed Vault account statuses
  await db.vaultStatuses.bulkPut([
    {
      id: 'v_email',
      platform: 'Email Doanh Nghiệp (SMTP)',
      handle: 'sales@aicompany.vn',
      purpose: 'Gửi email giới thiệu & báo giá cho Lead',
      playbook: 'worker/playbooks/email.ts',
      status: 'dry_run_ready',
      managedBy: 'account_provisioning',
      lastCheckedAt: now - 1200000,
      note: 'Chế độ Mô phỏng (DRY_RUN). Đã xác thực định dạng SPF/DKIM mẫu.',
    },
    {
      id: 'v_zalo',
      platform: 'Zalo Official Account (Zalo OA)',
      handle: 'AI Company Việt Nam OA',
      purpose: 'Gửi tin chăm sóc Lead & Kênh Hỏi CEO',
      playbook: 'worker/playbooks/zalo_oa.ts',
      status: 'dry_run_ready',
      managedBy: 'account_provisioning',
      lastCheckedAt: now - 900000,
      note: 'Có khung Zalo giả lập trong Cài đặt. Kết nối thật qua /worker.',
    },
    {
      id: 'v_fb',
      platform: 'Facebook Page Công ty',
      handle: 'fb.com/AICompanyVietnam',
      purpose: 'Đăng bài truyền thông & inbox fanpage trung tâm',
      playbook: 'worker/playbooks/facebook_page.ts',
      status: 'needs_verification',
      managedBy: 'account_provisioning',
      lastCheckedAt: now - 3600000,
      note: 'Chờ CEO xác nhận 2FA khi chạy Playwright local.',
    },
    {
      id: 'v_gbp',
      platform: 'Google Business Profile',
      handle: 'AI Company Software - TP.HCM',
      purpose: 'Tăng uy tín tìm kiếm địa phương & bản đồ',
      playbook: 'worker/playbooks/google_business.ts',
      status: 'dry_run_ready',
      managedBy: 'account_provisioning',
      lastCheckedAt: now - 5400000,
    },
    {
      id: 'v_cal',
      platform: 'Google Calendar (Lịch Demo)',
      handle: 'demo@aicompany.vn',
      purpose: 'Đặt lịch demo 1-1 tự động cho AE',
      playbook: 'worker/playbooks/email.ts',
      status: 'dry_run_ready',
      managedBy: 'account_provisioning',
      lastCheckedAt: now - 1800000,
    },
    {
      id: 'v_canva',
      platform: 'Canva Teams',
      handle: 'design@aicompany.vn',
      purpose: 'Xuất banner & sales kit cho Marketing',
      playbook: 'worker/playbooks/canva_social.ts',
      status: 'dry_run_ready',
      managedBy: 'account_provisioning',
      lastCheckedAt: now - 7200000,
    },
    {
      id: 'v_tiktok',
      platform: 'TikTok & YouTube Shorts',
      handle: '@aicompany.vn',
      purpose: 'Video demo ngắn phần mềm giáo dục & kho',
      playbook: 'worker/playbooks/canva_social.ts',
      status: 'not_created',
      managedBy: 'account_provisioning',
      lastCheckedAt: now - 86400000,
    },
  ]);

  await db.approvals.put({
    id: 'apr_seed_1',
    type: 'quote',
    title: 'Duyệt giảm 10% cho Mầm non Hoa Hướng Dương (Thanh toán 12 tháng)',
    description:
      'Châu Kim Ngân (Pricing) đề xuất áp dụng mức ưu đãi 10% ngoài bảng giá chuẩn (còn 17.172.000đ/năm) để chốt ký ngay trong tuần.',
    requestedBy: 'pricing_proposal',
    department: 'sales',
    amountVnd: 17172000,
    payload: { leadId: 'lead_3', discountPercent: 10 },
    status: 'pending',
    createdAt: now - 1800000,
  });

  await db.documents.put({
    id: 'doc_seed_1',
    title: 'Bộ từ khóa SEO Trọng tâm Q4 – EduCenter Pro',
    category: 'seo',
    authorId: 'seo_specialist',
    department: 'marketing',
    productId: 'edu-center',
    content: `# Bộ từ khóa SEO Trọng tâm – EduCenter Pro\n\n| Từ khóa | Lượng tìm/tháng | Mức độ ưu tiên |\n|---|---|---|\n| phần mềm quản lý trung tâm ngoại ngữ | 2.400 | Cao |\n| phần mềm quản lý trung tâm tiếng Anh | 3.100 | Rất cao |\n| app điểm danh trung tâm | 880 | Trung bình |\n| phần mềm tính lương giáo viên | 1.300 | Cao |\n\n## Đề xuất cấu trúc bài viết\n1. Trang đích trụ cột (Pillar Page) so sánh chi tiết với file Excel truyền thống.\n2. Case study tiết kiệm 15 giờ/tuần cho trung tâm quy mô 300 học viên.`,
    createdAt: now - 20000000,
    updatedAt: now - 20000000,
  });

  await db.messages.bulkPut([
    {
      id: 'msg_welcome_1',
      channelId: 'all',
      senderId: 'secretary',
      senderName: 'Nguyễn Minh Anh',
      senderTitle: 'Thư ký CEO',
      department: 'exec',
      content:
        'Chào mừng Chủ tịch đã vào **Văn phòng ảo 3D – AI Company**! Toàn bộ nhân sự AI Chibi ở 2 tầng đã sẵn sàng.\n\n- Chủ tịch có thể **giao việc trực tiếp** hoặc dùng `@tên` (vd: `@Trịnh Gia Huy tìm 10 trung tâm ngoại ngữ`) để giao đúng người.\n- Hỗ trợ **Quản lý Nhân sự động (1–60 người)** trong tab Nhân sự & Quyền, và **Quy trình Chi phí – Kế toán 2 tầng** trong tab Chi phí & Kế toán.',
      timestamp: now - 600000,
      busType: 'chat',
    },
    {
      id: 'msg_welcome_2',
      channelId: 'sales',
      senderId: 'sales_director',
      senderName: 'Nguyễn Hoàng Long',
      senderTitle: 'Giám đốc Kinh doanh',
      department: 'sales',
      content:
        'Báo cáo nhanh Phòng Sales (Tầng 1): Hiện đang có **6 Lead** trong phễu (1 Đã chốt, 1 Đang demo, 1 Chờ duyệt báo giá). Bật **Autopilot** bất cứ lúc nào để đội Lead Hunter & SDR tự động tìm 30 khách/ngày.',
      timestamp: now - 300000,
      busType: 'report',
    },
    {
      id: 'msg_welcome_3',
      channelId: 'all',
      senderId: 'pricing_proposal',
      senderName: 'Châu Kim Ngân',
      senderTitle: 'Pricing & Proposal',
      department: 'sales',
      content: 'Em đã lập tờ trình giảm giá 10% cho Trường Mầm non Hoa Hướng Dương, kính nhờ Chủ tịch phê duyệt.',
      timestamp: now - 200000,
      busType: 'approval_needed',
      cardType: 'approval',
      cardData: { approvalId: 'apr_seed_1' },
    },
    {
      id: 'msg_welcome_4',
      channelId: 'backoffice',
      senderId: 'cfo',
      senderName: 'Hồ Thảo Nhi',
      senderTitle: 'CFO / Kế toán Trưởng',
      department: 'backoffice',
      content:
        'Phòng Kế toán đã nhận đề xuất **#CP-101** (1.800.000đ chạy Lead Ads EduCenter Pro) từ Ngô Bảo Nam. Đang chờ Kế toán thẩm định tầng 1 trong tab **Chi phí & Kế toán**.',
      timestamp: now - 150000,
      busType: 'approval_needed',
      cardType: 'expense',
      cardData: { expenseId: 'exp_seed_1' },
    },
  ]);

  await db.tokenUsage.put({
    id: 'tok_seed_1',
    dateKey: todayKey,
    agentId: 'seo_specialist',
    department: 'marketing',
    provider: 'mock',
    model: 'mock-vn',
    promptTokens: 420,
    completionTokens: 680,
    totalTokens: 1100,
    costUsd: 0,
    cached: false,
    timestamp: now - 20000000,
  });

  await db.outreachLogs.put({
    id: 'out_seed_1',
    agentId: 'sdr_1',
    agentName: 'Dương Minh Thư',
    leadId: 'lead_1',
    leadName: 'Trung tâm Anh ngữ SunLight Academy',
    channel: 'Email',
    subjectOrPreview: 'Giải pháp tự động xếp lịch & nhắc học phí Zalo OA cho SunLight Academy (Nhắn DỪNG để hủy)',
    result: 'sent_dry_run',
    dryRun: true,
    timestamp: now - 172800000,
  });

  await db.auditLogs.put({
    id: 'aud_seed_1',
    agentId: 'sdr_1',
    agentName: 'Dương Minh Thư',
    action: 'send_outreach',
    permission: 'outreach:send',
    resource: 'outreach',
    result: 'allowed',
    timestamp: now - 172800000,
  });
}

export class DexieRepository implements IDataRepository {
  async getSettings() {
    await seedInitialDatabase();
    const defaults = await createDefaultSettings();
    const stored = await db.settings.get('default');
    if (!stored) return defaults;
    const rawGraphics = String((stored as { graphicsQuality?: string }).graphicsQuality || 'medium');
    const normalizedQuality =
      rawGraphics === 'eco' ? 'low' : rawGraphics === 'balanced' ? 'medium' : (rawGraphics as CompanySettings['graphicsQuality']);

    const rawSpeed = Number(stored.simulationSpeed);
    const normalizedSpeed: 1 | 2 | 4 = rawSpeed === 2 ? 2 : rawSpeed === 4 ? 4 : 1;

    return {
      ...defaults,
      ...stored,
      simulationSpeed: normalizedSpeed,
      graphicsQuality: normalizedQuality,
      providerBudgets: {
        ...defaults.providerBudgets,
        ...(stored.providerBudgets || {}),
      },
      spendingPolicy: {
        ...defaults.spendingPolicy,
        ...(stored.spendingPolicy || {}),
      },
      roleRoutes: Array.isArray(stored.roleRoutes) && stored.roleRoutes.length > 0 ? stored.roleRoutes : defaults.roleRoutes,
    };
  }
  async saveSettings(settings: CompanySettings) {
    await db.settings.put(settings);
  }
  async getAgents() {
    return db.agents.toArray();
  }
  async putAgent(agent: AgentProfile) {
    await db.agents.put(agent);
  }
  async deleteAgent(agentId: string) {
    await db.agents.delete(agentId);
  }
  async getDepartments() {
    return db.departments.toArray();
  }
  async putDepartment(dept: DepartmentConfig) {
    await db.departments.put(dept);
  }
  async deleteDepartment(deptId: string) {
    await db.departments.delete(deptId);
  }
  async getHrAudits() {
    return db.hrAudits.orderBy('timestamp').reverse().limit(300).toArray();
  }
  async addHrAudit(entry: HrAuditEntry) {
    await db.hrAudits.put(entry);
  }
  async getTasks() {
    return db.tasks.orderBy('createdAt').reverse().toArray();
  }
  async putTask(task: TaskItem) {
    await db.tasks.put(task);
  }
  async getLeads() {
    return db.leads.orderBy('createdAt').reverse().toArray();
  }
  async putLead(lead: LeadItem) {
    await db.leads.put(lead);
  }
  async getMessages() {
    return db.messages.orderBy('timestamp').toArray();
  }
  async addMessage(msg: ChatMessage) {
    await db.messages.put(msg);
  }
  async getDocuments() {
    return db.documents.orderBy('createdAt').reverse().toArray();
  }
  async putDocument(doc: DocumentItem) {
    await db.documents.put(doc);
  }
  async getApprovals() {
    return db.approvals.orderBy('createdAt').reverse().toArray();
  }
  async putApproval(req: ApprovalRequest) {
    await db.approvals.put(req);
  }
  async getAskCeoQuestions() {
    return db.askCeoQuestions.orderBy('createdAt').reverse().toArray();
  }
  async putAskCeoQuestion(q: AskCeoQuestion) {
    await db.askCeoQuestions.put(q);
  }
  async getAuditLogs() {
    return db.auditLogs.orderBy('timestamp').reverse().limit(300).toArray();
  }
  async addAuditLog(entry: AuditLogEntry) {
    await db.auditLogs.put(entry);
  }
  async getOutreachLogs() {
    return db.outreachLogs.orderBy('timestamp').reverse().limit(300).toArray();
  }
  async addOutreachLog(entry: OutreachLogEntry) {
    await db.outreachLogs.put(entry);
  }
  async getAccounts() {
    return db.accounts.toArray();
  }
  async putAccount(acc: AgentAccount) {
    await db.accounts.put(acc);
  }
  async deleteAccount(agentId: string) {
    await db.accounts.delete(agentId);
  }
  async getVaultStatuses() {
    return db.vaultStatuses.toArray();
  }
  async putVaultStatus(status: VaultAccountStatus) {
    await db.vaultStatuses.put(status);
  }
  async getTokenUsage() {
    return db.tokenUsage.orderBy('timestamp').reverse().limit(500).toArray();
  }
  async addTokenUsage(rec: TokenUsageRecord) {
    await db.tokenUsage.put(rec);
  }
  async getAgentMemories() {
    return db.agentMemories.toArray();
  }
  async putAgentMemory(mem: AgentMemory) {
    await db.agentMemories.put(mem);
  }
  async getCompanyMemories() {
    return db.companyMemories.toArray();
  }
  async putCompanyMemory(mem: CompanyMemoryRecord) {
    await db.companyMemories.put(mem);
  }
  async getWorkflows() {
    return db.workflows.orderBy('createdAt').reverse().limit(30).toArray();
  }
  async putWorkflow(wf: WorkflowTrace) {
    await db.workflows.put(wf);
  }
  async getAgentAppearances() {
    return db.agentAppearances.toArray();
  }
  async putAgentAppearance(app: AgentAppearance) {
    await db.agentAppearances.put(app);
  }
  async getBrandKit() {
    return db.brandKits.get('kit_default');
  }
  async putBrandKit(kit: BrandLaunchKit) {
    await db.brandKits.put(kit);
  }
  async getMarketingChannels() {
    return db.marketingChannels.toArray();
  }
  async putMarketingChannel(ch: MarketingChannelRecord) {
    await db.marketingChannels.put(ch);
  }
  async getScheduledPosts() {
    return db.scheduledPosts.orderBy('dayNumber').toArray();
  }
  async putScheduledPost(post: ScheduledSocialPost) {
    await db.scheduledPosts.put(post);
  }
  async getAdCampaigns() {
    return db.adCampaigns.orderBy('createdAt').reverse().toArray();
  }
  async putAdCampaign(ad: AdCampaignItem) {
    await db.adCampaigns.put(ad);
  }
  async getSocialComments() {
    return db.socialComments.orderBy('createdAt').reverse().toArray();
  }
  async putSocialComment(cmt: SocialCommentInboxItem) {
    await db.socialComments.put(cmt);
  }
  async getSocialLogs() {
    return db.socialLogs.orderBy('timestamp').reverse().limit(300).toArray();
  }
  async addSocialLog(entry: SocialPostLogEntry) {
    await db.socialLogs.put(entry);
  }
  async getExpenses() {
    return db.expenses.orderBy('createdAt').reverse().toArray();
  }
  async putExpense(exp: ExpenseItem) {
    await db.expenses.put(exp);
  }
  async getExpenseRules() {
    return db.expenseRules.orderBy('createdAt').reverse().toArray();
  }
  async putExpenseRule(rule: ExpenseRule) {
    await db.expenseRules.put(rule);
  }
  async deleteExpenseRule(ruleId: string) {
    await db.expenseRules.delete(ruleId);
  }
  async getExpenseBudgets() {
    return db.expenseBudgets.toArray();
  }
  async putExpenseBudget(budget: ExpenseBudget) {
    await db.expenseBudgets.put(budget);
  }
  async getExpenseCategories() {
    return db.expenseCategories.toArray();
  }
  async putExpenseCategory(cat: ExpenseCategoryConfig) {
    await db.expenseCategories.put(cat);
  }
  async resetAll() {
    await db.delete();
    await db.open();
    await seedInitialDatabase();
  }
}

export const repository = new DexieRepository();
