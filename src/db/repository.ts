import Dexie, { Table } from 'dexie';
import {
  AdCampaignItem,
  AffiliateCampaign,
  AffiliateClickConversion,
  AffiliateCommission,
  AffiliateContentPiece,
  AffiliateExperiment,
  AffiliateOffer,
  AffiliateProduct,
  AffiliateProductScore,
  AffiliateChannelPost,
  AgentAccount,
  AgentAppearance,
  AgentExternalAccount,
  AgentMemory,
  AgentProfile,
  ApprovalRequest,
  AskCeoQuestion,
  AuditLogEntry,
  BackupSnapshotRecord,
  BrandLaunchKit,
  ChatMessage,
  CompanySettings,
  ContractRecord,
  ContractTemplate,
  DepartmentConfig,
  DocumentItem,
  DurableJob,
  EncryptedCredentialRecord,
  ExpenseBudget,
  ExpenseCategoryConfig,
  ExpenseItem,
  ExpenseRule,
  HrAuditEntry,
  HubCwApiLog,
  HubCwReconciliationReport,
  HubCwSyncItem,
  HubCwUndoSnapshot,
  LeadItem,
  LegalDocument,
  LegalReportRecord,
  MarketingChannelRecord,
  OutreachLogEntry,
  ScheduledSocialPost,
  SocialCommentInboxItem,
  SocialPostLogEntry,
  SystemHealthLog,
  TaskItem,
  TokenUsageRecord,
  TrackedLink,
  VaultAccountStatus,
  WorkflowTrace,
} from '../types';
import { buildDefaultHubCwPermissions } from '../integrations/hubcw/hubcw.config';
import { generateHashedAgentToken, generateSalt, hashPasswordPBKDF2 } from '../engine/auth';
import { getDefaultAppearance } from '../engine/characterAppearance';
import { buildSeedAgents, buildSeedDepartments } from '../engine/liveRegistry';
import {
  buildSeedExpenseBudgets,
  buildSeedExpenseRules,
  buildSeedExpenses,
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
import { buildSeedContractTemplates, buildSeedLegalDocuments } from '../engine/legal/legalSeeds';
import {
  buildFallbackBaseSettings,
  migrateAgentsList,
  migrateDepartmentsList,
  migrateSettingsRecord,
  safeBackupCorruptedData,
} from './schemaMigration';

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
  getExternalAccounts(): Promise<AgentExternalAccount[]>;
  putExternalAccount(acc: AgentExternalAccount): Promise<void>;
  deleteExternalAccount(agentId: string): Promise<void>;
  getEncryptedCredentials(): Promise<EncryptedCredentialRecord[]>;
  getEncryptedCredential(agentId: string): Promise<EncryptedCredentialRecord | undefined>;
  putEncryptedCredential(cred: EncryptedCredentialRecord): Promise<void>;
  deleteEncryptedCredential(agentId: string): Promise<void>;
  getHubCwApiLogs(): Promise<HubCwApiLog[]>;
  addHubCwApiLog(log: HubCwApiLog): Promise<void>;
  getHubCwSyncQueue(): Promise<HubCwSyncItem[]>;
  putHubCwSyncItem(item: HubCwSyncItem): Promise<void>;
  getHubCwUndoSnapshots(): Promise<HubCwUndoSnapshot[]>;
  putHubCwUndoSnapshot(snap: HubCwUndoSnapshot): Promise<void>;
  getHubCwReconciliations(): Promise<HubCwReconciliationReport[]>;
  addHubCwReconciliation(report: HubCwReconciliationReport): Promise<void>;
  // BỔ SUNG I: Affiliate
  getAffiliateOffers(): Promise<AffiliateOffer[]>;
  putAffiliateOffer(offer: AffiliateOffer): Promise<void>;
  getAffiliateProducts(): Promise<AffiliateProduct[]>;
  putAffiliateProduct(p: AffiliateProduct): Promise<void>;
  getAffiliateScores(): Promise<AffiliateProductScore[]>;
  putAffiliateScore(s: AffiliateProductScore): Promise<void>;
  getAffiliateCampaigns(): Promise<AffiliateCampaign[]>;
  putAffiliateCampaign(c: AffiliateCampaign): Promise<void>;
  getTrackedLinks(): Promise<TrackedLink[]>;
  putTrackedLink(l: TrackedLink): Promise<void>;
  getAffiliateContent(): Promise<AffiliateContentPiece[]>;
  putAffiliateContent(p: AffiliateContentPiece): Promise<void>;
  getAffiliatePosts(): Promise<AffiliateChannelPost[]>;
  putAffiliatePost(p: AffiliateChannelPost): Promise<void>;
  getAffiliateConversions(): Promise<AffiliateClickConversion[]>;
  putAffiliateConversion(c: AffiliateClickConversion): Promise<void>;
  getAffiliateCommissions(): Promise<AffiliateCommission[]>;
  putAffiliateCommission(c: AffiliateCommission): Promise<void>;
  getAffiliateExperiments(): Promise<AffiliateExperiment[]>;
  putAffiliateExperiment(e: AffiliateExperiment): Promise<void>;
  // BỔ SUNG K: Legal
  getLegalDocuments(): Promise<LegalDocument[]>;
  putLegalDocument(d: LegalDocument): Promise<void>;
  getContractTemplates(): Promise<ContractTemplate[]>;
  putContractTemplate(t: ContractTemplate): Promise<void>;
  getContracts(): Promise<ContractRecord[]>;
  putContract(c: ContractRecord): Promise<void>;
  getLegalReports(): Promise<LegalReportRecord[]>;
  putLegalReport(r: LegalReportRecord): Promise<void>;
  // BỔ SUNG J: 24/7 Durable Jobs, Logs, Backups
  getDurableJobs(): Promise<DurableJob[]>;
  putDurableJob(j: DurableJob): Promise<void>;
  getSystemHealthLogs(): Promise<SystemHealthLog[]>;
  addSystemHealthLog(l: SystemHealthLog): Promise<void>;
  getBackupSnapshots(): Promise<BackupSnapshotRecord[]>;
  putBackupSnapshot(b: BackupSnapshotRecord): Promise<void>;
  exportAllTablesForBackup(): Promise<Record<string, unknown>>;
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
  agentExternalAccounts!: Table<AgentExternalAccount, string>;
  credentialVault!: Table<EncryptedCredentialRecord, string>;
  hubcwApiLogs!: Table<HubCwApiLog, string>;
  hubcwSyncQueue!: Table<HubCwSyncItem, string>;
  hubcwUndoSnapshots!: Table<HubCwUndoSnapshot, string>;
  hubcwReconciliations!: Table<HubCwReconciliationReport, string>;
  // v6 tables
  affiliateOffers!: Table<AffiliateOffer, string>;
  affiliateProducts!: Table<AffiliateProduct, string>;
  affiliateScores!: Table<AffiliateProductScore, string>;
  affiliateCampaigns!: Table<AffiliateCampaign, string>;
  trackedLinks!: Table<TrackedLink, string>;
  affiliateContent!: Table<AffiliateContentPiece, string>;
  affiliatePosts!: Table<AffiliateChannelPost, string>;
  affiliateConversions!: Table<AffiliateClickConversion, string>;
  affiliateCommissions!: Table<AffiliateCommission, string>;
  affiliateExperiments!: Table<AffiliateExperiment, string>;
  legalDocuments!: Table<LegalDocument, string>;
  contractTemplates!: Table<ContractTemplate, string>;
  contracts!: Table<ContractRecord, string>;
  legalReports!: Table<LegalReportRecord, string>;
  durableJobs!: Table<DurableJob, string>;
  systemHealthLogs!: Table<SystemHealthLog, string>;
  backupSnapshots!: Table<BackupSnapshotRecord, string>;

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

    this.version(5).stores({
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
      agentExternalAccounts: 'agentId, system, externalUserId, status',
      credentialVault: 'id, agentId, system, updatedAt',
      hubcwApiLogs: 'id, agentId, module, method, result, timestamp',
      hubcwSyncQueue: 'id, direction, module, status, createdAt',
      hubcwUndoSnapshots: 'id, agentId, module, externalRecordId, reverted, createdAt',
      hubcwReconciliations: 'id, createdAt',
    });

    this.version(6).stores({
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
      agentExternalAccounts: 'agentId, system, externalUserId, status',
      credentialVault: 'id, agentId, system, updatedAt',
      hubcwApiLogs: 'id, agentId, module, method, result, timestamp',
      hubcwSyncQueue: 'id, direction, module, status, createdAt',
      hubcwUndoSnapshots: 'id, agentId, module, externalRecordId, reverted, createdAt',
      hubcwReconciliations: 'id, createdAt',
      // v6 stores
      affiliateOffers: 'id, networkId, niche, fetchedAt',
      affiliateProducts: 'id, networkId, niche, fetchedAt',
      affiliateScores: 'id, productId, label, totalScore, scoredAt',
      affiliateCampaigns: 'id, productId, networkId, status, updatedAt',
      trackedLinks: 'id, campaignId, productId, networkId, subId, linkHealth, createdAt',
      affiliateContent: 'id, campaignId, productId, complianceStatus, createdAt',
      affiliatePosts: 'id, contentPieceId, campaignId, platform, status, createdAt',
      affiliateConversions: 'id, networkId, subId, reportDate, importedAt',
      affiliateCommissions: 'id, networkId, subId, status, reportDate, importedAt',
      affiliateExperiments: 'id, campaignId, status, createdAt',
      legalDocuments: 'id, docNumber, domain, effectiveStatus',
      contractTemplates: 'id, code, category, updatedAt',
      contracts: 'id, contractCode, templateId, status, expiresAt, createdAt',
      legalReports: 'id, reportType, contractId, createdAt',
      durableJobs: 'id, status, agentId, department, traceId, createdAt',
      systemHealthLogs: 'id, level, component, traceId, timestamp',
      backupSnapshots: 'id, createdBy, createdAt',
    });
  }
}

export const db = new AICompanyDexieDB();

export async function createDefaultSettings(): Promise<CompanySettings> {
  const salt = generateSalt(16);
  const hash = await hashPasswordPBKDF2('admin123', salt);
  return buildFallbackBaseSettings({
    ceoPasswordHash: hash,
    ceoPasswordSalt: salt,
    mustChangeDefaultPassword: true,
  });
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
  const existingDepts = await db.departments.toArray();
  const migratedDepts = migrateDepartmentsList(existingDepts);
  if (existingDepts.length === 0 || migratedDepts.length !== existingDepts.length) {
    await db.departments.bulkPut(migratedDepts);
  }

  const existingAgents = await db.agents.toArray();
  const migratedAgents = migrateAgentsList(existingAgents);
  if (existingAgents.length === 0 || migratedAgents.length !== existingAgents.length) {
    await db.agents.bulkPut(migratedAgents);
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

  // Ensure missing accounts & appearances & externalAccounts are created for any new Floor 2 Legal / Floor 3 Affiliate agents
  const now = Date.now();
  const allAccounts = await db.accounts.toArray();
  const accMap = new Map(allAccounts.map((a) => [a.agentId, a]));
  const allApps = await db.agentAppearances.toArray();
  const appMap = new Map(allApps.map((a) => [a.agentId, a]));
  const allExts = await db.agentExternalAccounts.toArray();
  const extMap = new Map(allExts.map((a) => [a.agentId, a]));

  for (const agent of migratedAgents) {
    if (!accMap.has(agent.id)) {
      const token = await generateHashedAgentToken(agent.id);
      await db.accounts.put({
        agentId: agent.id,
        username: agent.id,
        internalEmail: `${agent.id}@aicompany.vn`,
        role: agent.role,
        department: agent.department,
        status: 'active',
        tokenHash: token.hash,
        permissions: [...agent.defaultPermissions],
        lastActiveAt: now,
      });
    }
    if (!appMap.has(agent.id)) {
      await db.agentAppearances.put(getDefaultAppearance(agent));
    }
    if (!extMap.has(agent.id)) {
      await db.agentExternalAccounts.put({
        agentId: agent.id,
        system: 'hubcw',
        externalPermissions: buildDefaultHubCwPermissions(agent.department, agent.role, agent.title),
        status: 'unlinked',
      });
    }
  }
}

async function ensureV6Seeded(): Promise<void> {
  const lawCount = await db.legalDocuments.count();
  if (lawCount === 0) {
    await db.legalDocuments.bulkPut(buildSeedLegalDocuments());
  }
  const tplCount = await db.contractTemplates.count();
  if (tplCount === 0) {
    await db.contractTemplates.bulkPut(buildSeedContractTemplates());
  }
}

export async function seedInitialDatabase(): Promise<void> {
  try {
    const existingSettings = await db.settings.get('default');
    if (existingSettings) {
      const { settings, migrated } = migrateSettingsRecord(existingSettings);
      if (migrated) {
        await db.settings.put(settings);
      }
      await ensureMarketingSeeded(settings.companyName || 'AI COMPANY VIỆT NAM');
      await ensureV4Seeded();
      await ensureV6Seeded();
      return;
    }
  } catch (err) {
    // Corrupted IndexedDB / incompatible schema: back up & recreate cleanly
    safeBackupCorruptedData('db_open_error', String(err));
    await db.delete();
    await db.open();
  }

  const now = Date.now();
  const todayKey = new Date().toISOString().slice(0, 10);

  const settings = await createDefaultSettings();
  await db.settings.put(settings);

  const seedDepts = buildSeedDepartments();
  const seedAgents = buildSeedAgents();
  await db.departments.bulkPut(seedDepts);
  await db.agents.bulkPut(seedAgents);
  await db.agentAppearances.bulkPut(seedAgents.map((a) => getDefaultAppearance(a)));

  await ensureMarketingSeeded(settings.companyName);
  await ensureV4Seeded();
  await ensureV6Seeded();

  await db.agentMemories.bulkPut(
    seedAgents.map((a) => ({
      agentId: a.id,
      shortTerm: [`Nhận bàn làm việc tại ${a.roomId}`, `Sản phẩm ưu tiên hiện tại: EduCenter Pro`],
      longTermSummary: `${a.name} (${a.title}) sẵn sàng phối hợp theo quy trình RBAC và Sandbox mặc định.`,
      updatedAt: now,
    }))
  );

  await db.companyMemories.bulkPut([
    {
      id: 'cm_mission',
      key: 'Chiến lược Q4',
      content:
        'Tập trung 60% nguồn lực Sales vào phân khúc Trung tâm Ngoại ngữ tại TP.HCM & Hà Nội, kết hợp Khối Affiliate Tầng 3 săn sản phẩm Win.',
      updatedAt: now,
    },
    {
      id: 'cm_compliance',
      key: 'Tuân thủ NĐ 91/2020 & Minh bạch Affiliate',
      content:
        'Tin nhắn outreach phải có "Nhắn DỪNG để không nhận thêm". Bài Affiliate bắt buộc gắn nhãn tiếp thị và không bịa trải nghiệm.',
      updatedAt: now,
    },
  ]);

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
      origin: 'simulated',
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
      ],
      createdAt: now - 259200000,
    },
    {
      id: 'lead_2',
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
      origin: 'simulated',
      interactions: [],
      createdAt: now - 300000000,
    },
  ];
  await db.leads.bulkPut(initialLeads);

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
      origin: 'simulated',
      createdAt: now - 7200000,
      updatedAt: now - 60000,
      dueLabel: 'Hôm nay 14:00',
    },
    {
      id: 'task_2',
      taskCode: '#T-102',
      title: 'Rà soát điều khoản bảo vệ dữ liệu trẻ em cho HĐ Mầm non',
      description: 'Đảm bảo điều khoản đồng ý phụ huynh theo NĐ 13/2023 và Luật Bảo vệ DLCN.',
      definitionOfDone: 'Pháp chế kiểm tra mẫu HĐ-SAAS-MN và xuất báo cáo kiểm tra.',
      expectedDeliverable: 'Báo cáo pháp lý & mẫu HĐ hoàn chỉnh',
      department: 'legal',
      assignedTo: 'legal',
      createdBy: 'coo',
      status: 'todo',
      priority: 'high',
      productId: 'preschool-care',
      etaMinutes: 15,
      etaAt: now + 900000,
      progressPercent: 0,
      lastProgressAt: now - 3600000,
      deliverables: [],
      origin: 'simulated',
      createdAt: now - 3600000,
      updatedAt: now - 3600000,
      dueLabel: 'Ưu tiên',
    },
  ]);

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
      note: 'Chế độ Sandbox. Sẵn sàng chạy thật khi đổi sang LIVE.',
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
    },
  ]);

  await db.approvals.put({
    id: 'apr_seed_1',
    type: 'quote',
    title: 'Duyệt giảm 10% cho Mầm non Hoa Hướng Dương (Thanh toán 12 tháng)',
    description:
      'Châu Kim Ngân (Pricing) đề xuất áp dụng mức ưu đãi 10% ngoài bảng giá chuẩn (còn 17.172.000đ/năm).',
    requestedBy: 'pricing_proposal',
    department: 'sales',
    amountVnd: 17172000,
    payload: { leadId: 'lead_2', discountPercent: 10 },
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
    content: `# Bộ từ khóa SEO Trọng tâm – EduCenter Pro\n\n| Từ khóa | Lượng tìm/tháng | Mức độ ưu tiên |\n|---|---|---|\n| phần mềm quản lý trung tâm ngoại ngữ | 2.400 | Cao |\n| phần mềm quản lý trung tâm tiếng Anh | 3.100 | Rất cao |`,
    origin: 'simulated',
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
        'Chào mừng Chủ tịch vào **Văn phòng ảo 3D – AI Company (3 tầng)**! Toàn bộ nhân sự 3 tầng (Tầng 1 Sales/CS, Tầng 2 Giám đốc/Marketing/Tech/Pháp chế, Tầng 3 Khối Affiliate) đã sẵn sàng.\n\n- Mở **Cài đặt** hoặc **Sức khỏe hệ thống** để hoàn tất **Checklist Go-Live 10 bước** trước khi chuyển sang chế độ **LIVE**.',
      timestamp: now - 600000,
      busType: 'chat',
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
}

export class DexieRepository implements IDataRepository {
  async getSettings() {
    await seedInitialDatabase();
    const stored = await db.settings.get('default');
    const { settings } = migrateSettingsRecord(stored);
    return settings;
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
    return db.workflows.orderBy('createdAt').reverse().limit(50).toArray();
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
    const all = await db.brandKits.toArray();
    return all[0];
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
  async getExternalAccounts() {
    return db.agentExternalAccounts.toArray();
  }
  async putExternalAccount(acc: AgentExternalAccount) {
    await db.agentExternalAccounts.put(acc);
  }
  async deleteExternalAccount(agentId: string) {
    await db.agentExternalAccounts.delete(agentId);
  }
  async getEncryptedCredentials() {
    return db.credentialVault.toArray();
  }
  async getEncryptedCredential(agentId: string) {
    return db.credentialVault.get(`${agentId}::hubcw`);
  }
  async putEncryptedCredential(cred: EncryptedCredentialRecord) {
    await db.credentialVault.put(cred);
  }
  async deleteEncryptedCredential(agentId: string) {
    await db.credentialVault.delete(`${agentId}::hubcw`);
  }
  async getHubCwApiLogs() {
    return db.hubcwApiLogs.orderBy('timestamp').reverse().limit(400).toArray();
  }
  async addHubCwApiLog(log: HubCwApiLog) {
    await db.hubcwApiLogs.put(log);
  }
  async getHubCwSyncQueue() {
    return db.hubcwSyncQueue.orderBy('createdAt').reverse().toArray();
  }
  async putHubCwSyncItem(item: HubCwSyncItem) {
    await db.hubcwSyncQueue.put(item);
  }
  async getHubCwUndoSnapshots() {
    return db.hubcwUndoSnapshots.orderBy('createdAt').reverse().limit(150).toArray();
  }
  async putHubCwUndoSnapshot(snap: HubCwUndoSnapshot) {
    await db.hubcwUndoSnapshots.put(snap);
  }
  async getHubCwReconciliations() {
    return db.hubcwReconciliations.orderBy('createdAt').reverse().limit(30).toArray();
  }
  async addHubCwReconciliation(report: HubCwReconciliationReport) {
    await db.hubcwReconciliations.put(report);
  }
  // Affiliate
  async getAffiliateOffers() {
    return db.affiliateOffers.orderBy('fetchedAt').reverse().limit(150).toArray();
  }
  async putAffiliateOffer(offer: AffiliateOffer) {
    await db.affiliateOffers.put(offer);
  }
  async getAffiliateProducts() {
    return db.affiliateProducts.orderBy('fetchedAt').reverse().limit(200).toArray();
  }
  async putAffiliateProduct(p: AffiliateProduct) {
    await db.affiliateProducts.put(p);
  }
  async getAffiliateScores() {
    return db.affiliateScores.orderBy('scoredAt').reverse().limit(200).toArray();
  }
  async putAffiliateScore(s: AffiliateProductScore) {
    await db.affiliateScores.put(s);
  }
  async getAffiliateCampaigns() {
    return db.affiliateCampaigns.orderBy('updatedAt').reverse().toArray();
  }
  async putAffiliateCampaign(c: AffiliateCampaign) {
    await db.affiliateCampaigns.put(c);
  }
  async getTrackedLinks() {
    return db.trackedLinks.orderBy('createdAt').reverse().toArray();
  }
  async putTrackedLink(l: TrackedLink) {
    await db.trackedLinks.put(l);
  }
  async getAffiliateContent() {
    return db.affiliateContent.orderBy('createdAt').reverse().toArray();
  }
  async putAffiliateContent(p: AffiliateContentPiece) {
    await db.affiliateContent.put(p);
  }
  async getAffiliatePosts() {
    return db.affiliatePosts.orderBy('createdAt').reverse().toArray();
  }
  async putAffiliatePost(p: AffiliateChannelPost) {
    await db.affiliatePosts.put(p);
  }
  async getAffiliateConversions() {
    return db.affiliateConversions.orderBy('importedAt').reverse().toArray();
  }
  async putAffiliateConversion(c: AffiliateClickConversion) {
    await db.affiliateConversions.put(c);
  }
  async getAffiliateCommissions() {
    return db.affiliateCommissions.orderBy('importedAt').reverse().toArray();
  }
  async putAffiliateCommission(c: AffiliateCommission) {
    await db.affiliateCommissions.put(c);
  }
  async getAffiliateExperiments() {
    return db.affiliateExperiments.orderBy('createdAt').reverse().toArray();
  }
  async putAffiliateExperiment(e: AffiliateExperiment) {
    await db.affiliateExperiments.put(e);
  }
  // Legal
  async getLegalDocuments() {
    return db.legalDocuments.toArray();
  }
  async putLegalDocument(d: LegalDocument) {
    await db.legalDocuments.put(d);
  }
  async getContractTemplates() {
    return db.contractTemplates.toArray();
  }
  async putContractTemplate(t: ContractTemplate) {
    await db.contractTemplates.put(t);
  }
  async getContracts() {
    return db.contracts.orderBy('createdAt').reverse().toArray();
  }
  async putContract(c: ContractRecord) {
    await db.contracts.put(c);
  }
  async getLegalReports() {
    return db.legalReports.orderBy('createdAt').reverse().toArray();
  }
  async putLegalReport(r: LegalReportRecord) {
    await db.legalReports.put(r);
  }
  // 24/7 Ops
  async getDurableJobs() {
    return db.durableJobs.orderBy('createdAt').reverse().limit(200).toArray();
  }
  async putDurableJob(j: DurableJob) {
    await db.durableJobs.put(j);
  }
  async getSystemHealthLogs() {
    return db.systemHealthLogs.orderBy('timestamp').reverse().limit(400).toArray();
  }
  async addSystemHealthLog(l: SystemHealthLog) {
    await db.systemHealthLogs.put(l);
  }
  async getBackupSnapshots() {
    return db.backupSnapshots.orderBy('createdAt').reverse().limit(30).toArray();
  }
  async putBackupSnapshot(b: BackupSnapshotRecord) {
    await db.backupSnapshots.put(b);
  }
  async exportAllTablesForBackup() {
    const [
      settings,
      agents,
      departments,
      tasks,
      leads,
      documents,
      expenses,
      expenseRules,
      expenseBudgets,
      affiliateOffers,
      affiliateProducts,
      affiliateScores,
      affiliateCampaigns,
      trackedLinks,
      affiliateContent,
      affiliateConversions,
      affiliateCommissions,
      legalDocuments,
      contractTemplates,
      contracts,
      legalReports,
    ] = await Promise.all([
      db.settings.get('default'),
      db.agents.toArray(),
      db.departments.toArray(),
      db.tasks.toArray(),
      db.leads.toArray(),
      db.documents.toArray(),
      db.expenses.toArray(),
      db.expenseRules.toArray(),
      db.expenseBudgets.toArray(),
      db.affiliateOffers.toArray(),
      db.affiliateProducts.toArray(),
      db.affiliateScores.toArray(),
      db.affiliateCampaigns.toArray(),
      db.trackedLinks.toArray(),
      db.affiliateContent.toArray(),
      db.affiliateConversions.toArray(),
      db.affiliateCommissions.toArray(),
      db.legalDocuments.toArray(),
      db.contractTemplates.toArray(),
      db.contracts.toArray(),
      db.legalReports.toArray(),
    ]);
    return {
      settings,
      agents,
      departments,
      tasks,
      leads,
      documents,
      expenses,
      expenseRules,
      expenseBudgets,
      affiliateOffers,
      affiliateProducts,
      affiliateScores,
      affiliateCampaigns,
      trackedLinks,
      affiliateContent,
      affiliateConversions,
      affiliateCommissions,
      legalDocuments,
      contractTemplates,
      contracts,
      legalReports,
    };
  }
  async resetAll() {
    await db.delete();
    await db.open();
    await seedInitialDatabase();
  }
}

export const repository = new DexieRepository();
