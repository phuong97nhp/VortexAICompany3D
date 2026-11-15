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
  AgentOnboardingExamAttempt,
  AgentProfile,
  ApprovalMatrixRule,
  ApprovalRequest,
  AskCeoQuestion,
  AuditLogEntry,
  BackupSnapshotRecord,
  BcpPlanRecord,
  BrandLaunchKit,
  BrandMentionRecord,
  ChatMessage,
  CompanyRiskRegisterItem,
  CompanySettings,
  CompetitorWatchTarget,
  ContractRecord,
  ContractTemplate,
  CouncilSession,
  CrossDeptHandoverTicket,
  CustomerAccountRecord,
  CustomerOnboardingPlan,
  CustomerSurveyRecord,
  DataProcessingActivityRecord,
  DataSubjectRequestRecord,
  DepartmentConfig,
  DeviceActionLog,
  DeptInteractionRule,
  DigitalAssetRecord,
  DocumentItem,
  DurableJob,
  ElectronicInvoiceRecord,
  EncryptedCredentialRecord,
  EngineeringIncidentRecord,
  EngineeringRoadmapItem,
  ExperienceMemoryItem,
  ExpenseBudget,
  ExpenseCategoryConfig,
  ExpenseItem,
  ExpenseRule,
  GitRepoEvaluationReport,
  HrAuditEntry,
  HubCwApiLog,
  HubCwReconciliationReport,
  HubCwSyncItem,
  HubCwUndoSnapshot,
  InternalAnnouncementRecord,
  KnowledgeBaseArticle,
  LeadItem,
  LeaveRequestRecord,
  LedgerJournalEntry,
  LegalDocument,
  LegalReportRecord,
  ManagedDeviceRecord,
  MarketingAssetItem,
  MarketingChannelRecord,
  MarketingEventRecord,
  MoneyIdeaCard,
  OfficeLayoutPreset,
  OkrObjective,
  OutreachLogEntry,
  PaymentBankAccount,
  PlaybookSkill,
  ProductMasterRecord,
  QualityReviewCycle,
  RefundRequestRecord,
  RoleSopDocument,
  RoomBookingRecord,
  SalesOrderRecord,
  SalesQuoteRecord,
  ScheduledSocialPost,
  SecurityAssetRecord,
  SeoKeywordTrack,
  SocialCommentInboxItem,
  SocialPostLogEntry,
  SoftwareReleaseRecord,
  SpotCheckRecord,
  SupportTicketRecord,
  SystemHealthLog,
  TaskItem,
  TokenUsageRecord,
  TrackedLink,
  UpgradeChangelogEntry,
  UpgradeProposal,
  VaultAccountStatus,
  VendorSubscriptionRecord,
  VoiceMeetingSession,
  WebhookEndpointRecord,
  WeeklyBoardReportSnapshot,
  WorkflowTrace,
  ZaloPersonalMessageLog,
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
import { buildSeedOkrObjectives } from '../engine/okrEngine';
import { buildSeedRoleSops } from '../engine/hrSopEngine';
import { buildSeedBankAccounts, buildSeedProductMasters } from '../engine/productBankEngine';
import {
  buildSeedCompetitorWatches,
  buildSeedExperienceMemories,
  buildSeedInteractionRules,
  buildSeedPlaybooks,
  buildSeedUpgradeProposals,
} from '../engine/collaborationEngine';
import { buildSeedErpData, buildLedgerFromInvoiceAndExpense } from '../engine/erpEngine';
import { buildBuiltinOfficePresets } from '../engine/officeEditorEngine';
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
  // BỔ SUNG L–X+: SpotCheck, Voice, Quality/Council, Zalo Personal, OKR, HR SOP, Product/Bank, Collab, Devices
  getSpotChecks(): Promise<SpotCheckRecord[]>;
  putSpotCheck(s: SpotCheckRecord): Promise<void>;
  getVoiceMeetings(): Promise<VoiceMeetingSession[]>;
  putVoiceMeeting(m: VoiceMeetingSession): Promise<void>;
  getQualityCycles(): Promise<QualityReviewCycle[]>;
  putQualityCycle(q: QualityReviewCycle): Promise<void>;
  getCouncilSessions(): Promise<CouncilSession[]>;
  putCouncilSession(c: CouncilSession): Promise<void>;
  getZaloPersonalLogs(): Promise<ZaloPersonalMessageLog[]>;
  addZaloPersonalLog(l: ZaloPersonalMessageLog): Promise<void>;
  getOkrObjectives(): Promise<OkrObjective[]>;
  putOkrObjective(o: OkrObjective): Promise<void>;
  getRoleSops(): Promise<RoleSopDocument[]>;
  putRoleSop(s: RoleSopDocument): Promise<void>;
  getOnboardingExams(): Promise<AgentOnboardingExamAttempt[]>;
  putOnboardingExam(e: AgentOnboardingExamAttempt): Promise<void>;
  getProductMasters(): Promise<ProductMasterRecord[]>;
  putProductMaster(p: ProductMasterRecord): Promise<void>;
  getBankAccounts(): Promise<PaymentBankAccount[]>;
  putBankAccount(b: PaymentBankAccount): Promise<void>;
  deleteBankAccount(id: string): Promise<void>;
  getInteractionRules(): Promise<DeptInteractionRule[]>;
  putInteractionRule(r: DeptInteractionRule): Promise<void>;
  getHandoverTickets(): Promise<CrossDeptHandoverTicket[]>;
  putHandoverTicket(t: CrossDeptHandoverTicket): Promise<void>;
  getMoneyIdeas(): Promise<MoneyIdeaCard[]>;
  putMoneyIdea(m: MoneyIdeaCard): Promise<void>;
  getCompetitorWatches(): Promise<CompetitorWatchTarget[]>;
  putCompetitorWatch(c: CompetitorWatchTarget): Promise<void>;
  getUpgradeProposals(): Promise<UpgradeProposal[]>;
  putUpgradeProposal(u: UpgradeProposal): Promise<void>;
  getUpgradeChangelog(): Promise<UpgradeChangelogEntry[]>;
  putUpgradeChangelog(c: UpgradeChangelogEntry): Promise<void>;
  getRepoEvaluations(): Promise<GitRepoEvaluationReport[]>;
  putRepoEvaluation(r: GitRepoEvaluationReport): Promise<void>;
  getPlaybooks(): Promise<PlaybookSkill[]>;
  putPlaybook(p: PlaybookSkill): Promise<void>;
  getExperienceMemories(): Promise<ExperienceMemoryItem[]>;
  putExperienceMemory(e: ExperienceMemoryItem): Promise<void>;
  getManagedDevices(): Promise<ManagedDeviceRecord[]>;
  putManagedDevice(d: ManagedDeviceRecord): Promise<void>;
  getDeviceActionLogs(): Promise<DeviceActionLog[]>;
  addDeviceActionLog(l: DeviceActionLog): Promise<void>;
  // BỔ SUNG Y & Z
  getOfficeLayouts(): Promise<OfficeLayoutPreset[]>;
  putOfficeLayout(p: OfficeLayoutPreset): Promise<void>;
  deleteOfficeLayout(id: string): Promise<void>;
  getCustomerAccounts(): Promise<CustomerAccountRecord[]>;
  putCustomerAccount(c: CustomerAccountRecord): Promise<void>;
  getSalesQuotes(): Promise<SalesQuoteRecord[]>;
  putSalesQuote(q: SalesQuoteRecord): Promise<void>;
  getSalesOrders(): Promise<SalesOrderRecord[]>;
  putSalesOrder(o: SalesOrderRecord): Promise<void>;
  getElectronicInvoices(): Promise<ElectronicInvoiceRecord[]>;
  putElectronicInvoice(inv: ElectronicInvoiceRecord): Promise<void>;
  getRefundRequests(): Promise<RefundRequestRecord[]>;
  putRefundRequest(r: RefundRequestRecord): Promise<void>;
  getCustomerSurveys(): Promise<CustomerSurveyRecord[]>;
  putCustomerSurvey(s: CustomerSurveyRecord): Promise<void>;
  getSupportTickets(): Promise<SupportTicketRecord[]>;
  putSupportTicket(t: SupportTicketRecord): Promise<void>;
  getKbArticles(): Promise<KnowledgeBaseArticle[]>;
  putKbArticle(k: KnowledgeBaseArticle): Promise<void>;
  getCustomerOnboardings(): Promise<CustomerOnboardingPlan[]>;
  putCustomerOnboarding(o: CustomerOnboardingPlan): Promise<void>;
  getRoadmapItems(): Promise<EngineeringRoadmapItem[]>;
  putRoadmapItem(r: EngineeringRoadmapItem): Promise<void>;
  getSoftwareReleases(): Promise<SoftwareReleaseRecord[]>;
  putSoftwareRelease(r: SoftwareReleaseRecord): Promise<void>;
  getEngineeringIncidents(): Promise<EngineeringIncidentRecord[]>;
  putEngineeringIncident(inc: EngineeringIncidentRecord): Promise<void>;
  getSecurityAssets(): Promise<SecurityAssetRecord[]>;
  putSecurityAsset(s: SecurityAssetRecord): Promise<void>;
  getMarketingAssets(): Promise<MarketingAssetItem[]>;
  putMarketingAsset(m: MarketingAssetItem): Promise<void>;
  getSeoKeywords(): Promise<SeoKeywordTrack[]>;
  putSeoKeyword(k: SeoKeywordTrack): Promise<void>;
  getBrandMentions(): Promise<BrandMentionRecord[]>;
  putBrandMention(b: BrandMentionRecord): Promise<void>;
  getMarketingEvents(): Promise<MarketingEventRecord[]>;
  putMarketingEvent(e: MarketingEventRecord): Promise<void>;
  getLedgerEntries(): Promise<LedgerJournalEntry[]>;
  putLedgerEntry(e: LedgerJournalEntry): Promise<void>;
  getLegalRisks(): Promise<CompanyRiskRegisterItem[]>;
  putLegalRisk(r: CompanyRiskRegisterItem): Promise<void>;
  getDataProcessings(): Promise<DataProcessingActivityRecord[]>;
  putDataProcessing(d: DataProcessingActivityRecord): Promise<void>;
  getDsarRequests(): Promise<DataSubjectRequestRecord[]>;
  putDsarRequest(r: DataSubjectRequestRecord): Promise<void>;
  getLeaveRequests(): Promise<LeaveRequestRecord[]>;
  putLeaveRequest(r: LeaveRequestRecord): Promise<void>;
  getAnnouncements(): Promise<InternalAnnouncementRecord[]>;
  putAnnouncement(a: InternalAnnouncementRecord): Promise<void>;
  getRoomBookings(): Promise<RoomBookingRecord[]>;
  putRoomBooking(b: RoomBookingRecord): Promise<void>;
  getApprovalMatrix(): Promise<ApprovalMatrixRule[]>;
  putApprovalMatrixRule(r: ApprovalMatrixRule): Promise<void>;
  getVendorSubscriptions(): Promise<VendorSubscriptionRecord[]>;
  putVendorSubscription(v: VendorSubscriptionRecord): Promise<void>;
  getDigitalAssets(): Promise<DigitalAssetRecord[]>;
  putDigitalAsset(a: DigitalAssetRecord): Promise<void>;
  getBcpPlans(): Promise<BcpPlanRecord[]>;
  putBcpPlan(p: BcpPlanRecord): Promise<void>;
  getWebhookEndpoints(): Promise<WebhookEndpointRecord[]>;
  putWebhookEndpoint(w: WebhookEndpointRecord): Promise<void>;
  deleteWebhookEndpoint(id: string): Promise<void>;
  getWeeklyReports(): Promise<WeeklyBoardReportSnapshot[]>;
  putWeeklyReport(r: WeeklyBoardReportSnapshot): Promise<void>;
  clearAllSimulatedData(): Promise<{ removedCount: number }>;
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
  // v7 tables (L - X+)
  spotChecks!: Table<SpotCheckRecord, string>;
  voiceMeetings!: Table<VoiceMeetingSession, string>;
  qualityCycles!: Table<QualityReviewCycle, string>;
  councilSessions!: Table<CouncilSession, string>;
  zaloPersonalLogs!: Table<ZaloPersonalMessageLog, string>;
  okrObjectives!: Table<OkrObjective, string>;
  roleSops!: Table<RoleSopDocument, string>;
  onboardingExams!: Table<AgentOnboardingExamAttempt, string>;
  productMasters!: Table<ProductMasterRecord, string>;
  bankAccounts!: Table<PaymentBankAccount, string>;
  interactionRules!: Table<DeptInteractionRule, string>;
  handoverTickets!: Table<CrossDeptHandoverTicket, string>;
  moneyIdeas!: Table<MoneyIdeaCard, string>;
  competitorWatches!: Table<CompetitorWatchTarget, string>;
  upgradeProposals!: Table<UpgradeProposal, string>;
  upgradeChangelog!: Table<UpgradeChangelogEntry, string>;
  repoEvaluations!: Table<GitRepoEvaluationReport, string>;
  playbooks!: Table<PlaybookSkill, string>;
  experienceMemories!: Table<ExperienceMemoryItem, string>;
  managedDevices!: Table<ManagedDeviceRecord, string>;
  deviceActionLogs!: Table<DeviceActionLog, string>;
  // v8 tables (Y & Z)
  officeLayouts!: Table<OfficeLayoutPreset, string>;
  customerAccounts!: Table<CustomerAccountRecord, string>;
  salesQuotes!: Table<SalesQuoteRecord, string>;
  salesOrders!: Table<SalesOrderRecord, string>;
  electronicInvoices!: Table<ElectronicInvoiceRecord, string>;
  refundRequests!: Table<RefundRequestRecord, string>;
  customerSurveys!: Table<CustomerSurveyRecord, string>;
  supportTickets!: Table<SupportTicketRecord, string>;
  kbArticles!: Table<KnowledgeBaseArticle, string>;
  customerOnboardings!: Table<CustomerOnboardingPlan, string>;
  roadmapItems!: Table<EngineeringRoadmapItem, string>;
  softwareReleases!: Table<SoftwareReleaseRecord, string>;
  engineeringIncidents!: Table<EngineeringIncidentRecord, string>;
  securityAssets!: Table<SecurityAssetRecord, string>;
  marketingAssets!: Table<MarketingAssetItem, string>;
  seoKeywords!: Table<SeoKeywordTrack, string>;
  brandMentions!: Table<BrandMentionRecord, string>;
  marketingEvents!: Table<MarketingEventRecord, string>;
  ledgerEntries!: Table<LedgerJournalEntry, string>;
  legalRisks!: Table<CompanyRiskRegisterItem, string>;
  dataProcessings!: Table<DataProcessingActivityRecord, string>;
  dsarRequests!: Table<DataSubjectRequestRecord, string>;
  leaveRequests!: Table<LeaveRequestRecord, string>;
  announcements!: Table<InternalAnnouncementRecord, string>;
  roomBookings!: Table<RoomBookingRecord, string>;
  approvalMatrix!: Table<ApprovalMatrixRule, string>;
  vendorSubscriptions!: Table<VendorSubscriptionRecord, string>;
  digitalAssets!: Table<DigitalAssetRecord, string>;
  bcpPlans!: Table<BcpPlanRecord, string>;
  webhookEndpoints!: Table<WebhookEndpointRecord, string>;
  weeklyReports!: Table<WeeklyBoardReportSnapshot, string>;

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

    this.version(7).stores({
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
      // v7 stores
      spotChecks: 'id, agentId, verdict, inspector, createdAt',
      voiceMeetings: 'id, status, startedAt',
      qualityCycles: 'id, department, status, updatedAt',
      councilSessions: 'id, topic, status, createdAt',
      zaloPersonalLogs: 'id, peerIdMasked, direction, status, timestamp',
      okrObjectives: 'id, periodType, ownerAgentId, status, updatedAt',
      roleSops: 'id, department, roleTitle, version',
      onboardingExams: 'id, agentId, passed, createdAt',
      productMasters: 'id, code, lifecycle, updatedAt',
      bankAccounts: 'id, bankCode, isDefault, updatedAt',
      interactionRules: 'id, fromDepartment, toDepartment',
      handoverTickets: 'id, code, fromDepartment, toDepartment, status, dueAt, createdAt',
      moneyIdeas: 'id, stage, department, proposedBy, updatedAt',
      competitorWatches: 'id, name, lastCheckedAt',
      upgradeProposals: 'id, code, rolloutStage, createdAt',
      upgradeChangelog: 'id, version, proposalId, timestamp',
      repoEvaluations: 'id, repoFullName, recommendation, createdAt',
      playbooks: 'id, department, triggerIntent, dirtyNeedsReview',
      experienceMemories: 'id, department, source, createdAt',
      managedDevices: 'id, serial, driverType, status, assignedAgentId',
      deviceActionLogs: 'id, deviceId, agentId, action, result, timestamp',
    });

    this.version(8).stores({
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
      spotChecks: 'id, agentId, verdict, inspector, createdAt',
      voiceMeetings: 'id, status, startedAt',
      qualityCycles: 'id, department, status, updatedAt',
      councilSessions: 'id, topic, status, createdAt',
      zaloPersonalLogs: 'id, peerIdMasked, direction, status, timestamp',
      okrObjectives: 'id, periodType, ownerAgentId, status, updatedAt',
      roleSops: 'id, department, roleTitle, version',
      onboardingExams: 'id, agentId, passed, createdAt',
      productMasters: 'id, code, lifecycle, updatedAt',
      bankAccounts: 'id, bankCode, isDefault, updatedAt',
      interactionRules: 'id, fromDepartment, toDepartment',
      handoverTickets: 'id, code, fromDepartment, toDepartment, status, dueAt, createdAt',
      moneyIdeas: 'id, stage, department, proposedBy, updatedAt',
      competitorWatches: 'id, name, lastCheckedAt',
      upgradeProposals: 'id, code, rolloutStage, createdAt',
      upgradeChangelog: 'id, version, proposalId, timestamp',
      repoEvaluations: 'id, repoFullName, recommendation, createdAt',
      playbooks: 'id, department, triggerIntent, dirtyNeedsReview',
      experienceMemories: 'id, department, source, createdAt',
      managedDevices: 'id, serial, driverType, status, assignedAgentId',
      deviceActionLogs: 'id, deviceId, agentId, action, result, timestamp',
      // v8 stores
      officeLayouts: 'id, name, updatedAt',
      customerAccounts: 'id, code, tier, status, source, updatedAt',
      salesQuotes: 'id, code, customerId, status, source, createdAt',
      salesOrders: 'id, code, customerId, paymentStatus, source, createdAt',
      electronicInvoices: 'id, invoiceNumber, orderId, status, source, issuedAt',
      refundRequests: 'id, code, orderId, status, createdAt',
      customerSurveys: 'id, customerId, kind, source, createdAt',
      supportTickets: 'id, code, customerId, priority, status, source, createdAt',
      kbArticles: 'id, category, fromTicketId, published, updatedAt',
      customerOnboardings: 'id, customerId, status, updatedAt',
      roadmapItems: 'id, code, quarter, status, source, updatedAt',
      softwareReleases: 'id, version, environment, status, releasedAt',
      engineeringIncidents: 'id, code, severity, status, startedAt',
      securityAssets: 'id, kind, severity, status, lastCheckedAt',
      marketingAssets: 'id, type, createdAt',
      seoKeywords: 'id, keyword, updatedAt',
      brandMentions: 'id, sentiment, handled, detectedAt',
      marketingEvents: 'id, kind, status, eventDate',
      ledgerEntries: 'id, entryCode, date, type, accountCode, source, createdAt',
      legalRisks: 'id, code, domain, status, updatedAt',
      dataProcessings: 'id, processName, updatedAt',
      dsarRequests: 'id, code, requestType, status, createdAt',
      leaveRequests: 'id, agentId, kind, status, createdAt',
      announcements: 'id, pinned, department, createdAt',
      roomBookings: 'id, roomId, createdAt',
      approvalMatrix: 'id, domain',
      vendorSubscriptions: 'id, status, ownerAgentId',
      digitalAssets: 'id, kind, status, expiresAt',
      bcpPlans: 'id, scenario',
      webhookEndpoints: 'id, enabled',
      weeklyReports: 'id, generatedAt',
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

async function ensureV7Seeded(companyLegalName: string): Promise<void> {
  if ((await db.okrObjectives.count()) === 0) {
    await db.okrObjectives.bulkPut(buildSeedOkrObjectives());
  }
  if ((await db.roleSops.count()) === 0) {
    await db.roleSops.bulkPut(buildSeedRoleSops());
  }
  if ((await db.productMasters.count()) === 0) {
    await db.productMasters.bulkPut(buildSeedProductMasters());
  }
  if ((await db.bankAccounts.count()) === 0) {
    await db.bankAccounts.bulkPut(buildSeedBankAccounts(companyLegalName));
  }
  if ((await db.interactionRules.count()) === 0) {
    await db.interactionRules.bulkPut(buildSeedInteractionRules());
  }
  if ((await db.competitorWatches.count()) === 0) {
    await db.competitorWatches.bulkPut(buildSeedCompetitorWatches());
  }
  if ((await db.playbooks.count()) === 0) {
    await db.playbooks.bulkPut(buildSeedPlaybooks());
  }
  if ((await db.upgradeProposals.count()) === 0) {
    await db.upgradeProposals.bulkPut(buildSeedUpgradeProposals());
  }
  if ((await db.experienceMemories.count()) === 0) {
    await db.experienceMemories.bulkPut(buildSeedExperienceMemories());
  }
}

async function ensureV8Seeded(): Promise<void> {
  const [depts, agents, existingExpenses] = await Promise.all([
    db.departments.toArray(),
    db.agents.toArray(),
    db.expenses.toArray(),
  ]);
  if ((await db.officeLayouts.count()) === 0) {
    await db.officeLayouts.bulkPut(buildBuiltinOfficePresets(depts, agents));
  }
  if ((await db.customerAccounts.count()) === 0) {
    const erp = buildSeedErpData(agents);
    await Promise.all([
      db.customerAccounts.bulkPut(erp.customerAccounts),
      db.salesQuotes.bulkPut(erp.salesQuotes),
      db.salesOrders.bulkPut(erp.salesOrders),
      db.electronicInvoices.bulkPut(erp.electronicInvoices),
      db.refundRequests.bulkPut(erp.refundRequests),
      db.customerSurveys.bulkPut(erp.customerSurveys),
      db.supportTickets.bulkPut(erp.supportTickets),
      db.kbArticles.bulkPut(erp.kbArticles),
      db.customerOnboardings.bulkPut(erp.customerOnboardings),
      db.roadmapItems.bulkPut(erp.roadmapItems),
      db.softwareReleases.bulkPut(erp.softwareReleases),
      db.engineeringIncidents.bulkPut(erp.engineeringIncidents),
      db.securityAssets.bulkPut(erp.securityAssets),
      db.marketingAssets.bulkPut(erp.marketingAssets),
      db.seoKeywords.bulkPut(erp.seoKeywords),
      db.brandMentions.bulkPut(erp.brandMentions),
      db.marketingEvents.bulkPut(erp.marketingEvents),
      db.legalRisks.bulkPut(erp.legalRisks),
      db.dataProcessings.bulkPut(erp.dataProcessings),
      db.dsarRequests.bulkPut(erp.dsarRequests),
      db.leaveRequests.bulkPut(erp.leaveRequests),
      db.announcements.bulkPut(erp.announcements),
      db.roomBookings.bulkPut(erp.roomBookings),
      db.approvalMatrix.bulkPut(erp.approvalMatrix),
      db.vendorSubscriptions.bulkPut(erp.vendorSubscriptions),
      db.digitalAssets.bulkPut(erp.digitalAssets),
      db.bcpPlans.bulkPut(erp.bcpPlans),
      db.webhookEndpoints.bulkPut(erp.webhookEndpoints),
      db.ledgerEntries.bulkPut(
        buildLedgerFromInvoiceAndExpense(erp.electronicInvoices, existingExpenses, erp.refundRequests)
      ),
    ]);
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
      await ensureV7Seeded(settings.legal?.companyLegalName || settings.companyName || 'AI COMPANY VIỆT NAM');
      await ensureV8Seeded();
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
  await ensureV7Seeded(settings.legal?.companyLegalName || settings.companyName);
  await ensureV8Seeded();

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
  // BỔ SUNG L–X+ implementations
  async getSpotChecks() {
    return db.spotChecks.orderBy('createdAt').reverse().limit(300).toArray();
  }
  async putSpotCheck(s: SpotCheckRecord) {
    await db.spotChecks.put(s);
  }
  async getVoiceMeetings() {
    return db.voiceMeetings.orderBy('startedAt').reverse().limit(50).toArray();
  }
  async putVoiceMeeting(m: VoiceMeetingSession) {
    await db.voiceMeetings.put(m);
  }
  async getQualityCycles() {
    return db.qualityCycles.orderBy('updatedAt').reverse().limit(100).toArray();
  }
  async putQualityCycle(q: QualityReviewCycle) {
    await db.qualityCycles.put(q);
  }
  async getCouncilSessions() {
    return db.councilSessions.orderBy('createdAt').reverse().limit(50).toArray();
  }
  async putCouncilSession(c: CouncilSession) {
    await db.councilSessions.put(c);
  }
  async getZaloPersonalLogs() {
    return db.zaloPersonalLogs.orderBy('timestamp').reverse().limit(250).toArray();
  }
  async addZaloPersonalLog(l: ZaloPersonalMessageLog) {
    await db.zaloPersonalLogs.put(l);
  }
  async getOkrObjectives() {
    return db.okrObjectives.orderBy('updatedAt').reverse().toArray();
  }
  async putOkrObjective(o: OkrObjective) {
    await db.okrObjectives.put(o);
  }
  async getRoleSops() {
    return db.roleSops.toArray();
  }
  async putRoleSop(s: RoleSopDocument) {
    await db.roleSops.put(s);
  }
  async getOnboardingExams() {
    return db.onboardingExams.orderBy('createdAt').reverse().limit(120).toArray();
  }
  async putOnboardingExam(e: AgentOnboardingExamAttempt) {
    await db.onboardingExams.put(e);
  }
  async getProductMasters() {
    return db.productMasters.toArray();
  }
  async putProductMaster(p: ProductMasterRecord) {
    await db.productMasters.put(p);
  }
  async getBankAccounts() {
    return db.bankAccounts.toArray();
  }
  async putBankAccount(b: PaymentBankAccount) {
    await db.bankAccounts.put(b);
  }
  async deleteBankAccount(id: string) {
    await db.bankAccounts.delete(id);
  }
  async getInteractionRules() {
    return db.interactionRules.toArray();
  }
  async putInteractionRule(r: DeptInteractionRule) {
    await db.interactionRules.put(r);
  }
  async getHandoverTickets() {
    return db.handoverTickets.orderBy('createdAt').reverse().limit(200).toArray();
  }
  async putHandoverTicket(t: CrossDeptHandoverTicket) {
    await db.handoverTickets.put(t);
  }
  async getMoneyIdeas() {
    return db.moneyIdeas.orderBy('updatedAt').reverse().toArray();
  }
  async putMoneyIdea(m: MoneyIdeaCard) {
    await db.moneyIdeas.put(m);
  }
  async getCompetitorWatches() {
    return db.competitorWatches.toArray();
  }
  async putCompetitorWatch(c: CompetitorWatchTarget) {
    await db.competitorWatches.put(c);
  }
  async getUpgradeProposals() {
    return db.upgradeProposals.orderBy('createdAt').reverse().toArray();
  }
  async putUpgradeProposal(u: UpgradeProposal) {
    await db.upgradeProposals.put(u);
  }
  async getUpgradeChangelog() {
    return db.upgradeChangelog.orderBy('timestamp').reverse().toArray();
  }
  async putUpgradeChangelog(c: UpgradeChangelogEntry) {
    await db.upgradeChangelog.put(c);
  }
  async getRepoEvaluations() {
    return db.repoEvaluations.orderBy('createdAt').reverse().limit(60).toArray();
  }
  async putRepoEvaluation(r: GitRepoEvaluationReport) {
    await db.repoEvaluations.put(r);
  }
  async getPlaybooks() {
    return db.playbooks.toArray();
  }
  async putPlaybook(p: PlaybookSkill) {
    await db.playbooks.put(p);
  }
  async getExperienceMemories() {
    return db.experienceMemories.orderBy('createdAt').reverse().limit(200).toArray();
  }
  async putExperienceMemory(e: ExperienceMemoryItem) {
    await db.experienceMemories.put(e);
  }
  async getManagedDevices() {
    return db.managedDevices.toArray();
  }
  async putManagedDevice(d: ManagedDeviceRecord) {
    await db.managedDevices.put(d);
  }
  async getDeviceActionLogs() {
    return db.deviceActionLogs.orderBy('timestamp').reverse().limit(300).toArray();
  }
  async addDeviceActionLog(l: DeviceActionLog) {
    await db.deviceActionLogs.put(l);
  }
  // BỔ SUNG Y & Z
  async getOfficeLayouts() {
    return db.officeLayouts.orderBy('updatedAt').reverse().toArray();
  }
  async putOfficeLayout(p: OfficeLayoutPreset) {
    await db.officeLayouts.put(p);
  }
  async deleteOfficeLayout(id: string) {
    await db.officeLayouts.delete(id);
  }
  async getCustomerAccounts() {
    return db.customerAccounts.orderBy('updatedAt').reverse().toArray();
  }
  async putCustomerAccount(c: CustomerAccountRecord) {
    await db.customerAccounts.put(c);
  }
  async getSalesQuotes() {
    return db.salesQuotes.orderBy('createdAt').reverse().toArray();
  }
  async putSalesQuote(q: SalesQuoteRecord) {
    await db.salesQuotes.put(q);
  }
  async getSalesOrders() {
    return db.salesOrders.orderBy('createdAt').reverse().toArray();
  }
  async putSalesOrder(o: SalesOrderRecord) {
    await db.salesOrders.put(o);
  }
  async getElectronicInvoices() {
    return db.electronicInvoices.orderBy('issuedAt').reverse().toArray();
  }
  async putElectronicInvoice(inv: ElectronicInvoiceRecord) {
    await db.electronicInvoices.put(inv);
  }
  async getRefundRequests() {
    return db.refundRequests.orderBy('createdAt').reverse().toArray();
  }
  async putRefundRequest(r: RefundRequestRecord) {
    await db.refundRequests.put(r);
  }
  async getCustomerSurveys() {
    return db.customerSurveys.orderBy('createdAt').reverse().toArray();
  }
  async putCustomerSurvey(s: CustomerSurveyRecord) {
    await db.customerSurveys.put(s);
  }
  async getSupportTickets() {
    return db.supportTickets.orderBy('createdAt').reverse().toArray();
  }
  async putSupportTicket(t: SupportTicketRecord) {
    await db.supportTickets.put(t);
  }
  async getKbArticles() {
    return db.kbArticles.orderBy('updatedAt').reverse().toArray();
  }
  async putKbArticle(k: KnowledgeBaseArticle) {
    await db.kbArticles.put(k);
  }
  async getCustomerOnboardings() {
    return db.customerOnboardings.orderBy('updatedAt').reverse().toArray();
  }
  async putCustomerOnboarding(o: CustomerOnboardingPlan) {
    await db.customerOnboardings.put(o);
  }
  async getRoadmapItems() {
    return db.roadmapItems.orderBy('updatedAt').reverse().toArray();
  }
  async putRoadmapItem(r: EngineeringRoadmapItem) {
    await db.roadmapItems.put(r);
  }
  async getSoftwareReleases() {
    return db.softwareReleases.orderBy('releasedAt').reverse().toArray();
  }
  async putSoftwareRelease(r: SoftwareReleaseRecord) {
    await db.softwareReleases.put(r);
  }
  async getEngineeringIncidents() {
    return db.engineeringIncidents.orderBy('startedAt').reverse().toArray();
  }
  async putEngineeringIncident(inc: EngineeringIncidentRecord) {
    await db.engineeringIncidents.put(inc);
  }
  async getSecurityAssets() {
    return db.securityAssets.orderBy('lastCheckedAt').reverse().toArray();
  }
  async putSecurityAsset(s: SecurityAssetRecord) {
    await db.securityAssets.put(s);
  }
  async getMarketingAssets() {
    return db.marketingAssets.orderBy('createdAt').reverse().toArray();
  }
  async putMarketingAsset(m: MarketingAssetItem) {
    await db.marketingAssets.put(m);
  }
  async getSeoKeywords() {
    return db.seoKeywords.orderBy('updatedAt').reverse().toArray();
  }
  async putSeoKeyword(k: SeoKeywordTrack) {
    await db.seoKeywords.put(k);
  }
  async getBrandMentions() {
    return db.brandMentions.orderBy('detectedAt').reverse().toArray();
  }
  async putBrandMention(b: BrandMentionRecord) {
    await db.brandMentions.put(b);
  }
  async getMarketingEvents() {
    return db.marketingEvents.toArray();
  }
  async putMarketingEvent(e: MarketingEventRecord) {
    await db.marketingEvents.put(e);
  }
  async getLedgerEntries() {
    return db.ledgerEntries.orderBy('createdAt').reverse().toArray();
  }
  async putLedgerEntry(e: LedgerJournalEntry) {
    await db.ledgerEntries.put(e);
  }
  async getLegalRisks() {
    return db.legalRisks.orderBy('updatedAt').reverse().toArray();
  }
  async putLegalRisk(r: CompanyRiskRegisterItem) {
    await db.legalRisks.put(r);
  }
  async getDataProcessings() {
    return db.dataProcessings.orderBy('updatedAt').reverse().toArray();
  }
  async putDataProcessing(d: DataProcessingActivityRecord) {
    await db.dataProcessings.put(d);
  }
  async getDsarRequests() {
    return db.dsarRequests.orderBy('createdAt').reverse().toArray();
  }
  async putDsarRequest(r: DataSubjectRequestRecord) {
    await db.dsarRequests.put(r);
  }
  async getLeaveRequests() {
    return db.leaveRequests.orderBy('createdAt').reverse().toArray();
  }
  async putLeaveRequest(r: LeaveRequestRecord) {
    await db.leaveRequests.put(r);
  }
  async getAnnouncements() {
    return db.announcements.orderBy('createdAt').reverse().toArray();
  }
  async putAnnouncement(a: InternalAnnouncementRecord) {
    await db.announcements.put(a);
  }
  async getRoomBookings() {
    return db.roomBookings.orderBy('createdAt').reverse().toArray();
  }
  async putRoomBooking(b: RoomBookingRecord) {
    await db.roomBookings.put(b);
  }
  async getApprovalMatrix() {
    return db.approvalMatrix.toArray();
  }
  async putApprovalMatrixRule(r: ApprovalMatrixRule) {
    await db.approvalMatrix.put(r);
  }
  async getVendorSubscriptions() {
    return db.vendorSubscriptions.toArray();
  }
  async putVendorSubscription(v: VendorSubscriptionRecord) {
    await db.vendorSubscriptions.put(v);
  }
  async getDigitalAssets() {
    return db.digitalAssets.toArray();
  }
  async putDigitalAsset(a: DigitalAssetRecord) {
    await db.digitalAssets.put(a);
  }
  async getBcpPlans() {
    return db.bcpPlans.toArray();
  }
  async putBcpPlan(p: BcpPlanRecord) {
    await db.bcpPlans.put(p);
  }
  async getWebhookEndpoints() {
    return db.webhookEndpoints.toArray();
  }
  async putWebhookEndpoint(w: WebhookEndpointRecord) {
    await db.webhookEndpoints.put(w);
  }
  async deleteWebhookEndpoint(id: string) {
    await db.webhookEndpoints.delete(id);
  }
  async getWeeklyReports() {
    return db.weeklyReports.orderBy('generatedAt').reverse().limit(52).toArray();
  }
  async putWeeklyReport(r: WeeklyBoardReportSnapshot) {
    await db.weeklyReports.put(r);
  }
  async clearAllSimulatedData() {
    let removedCount = 0;
    const filterAndDelete = async <T extends { id: string }>(table: Table<T, string>, pred: (row: T) => boolean) => {
      const all = await table.toArray();
      const ids = all.filter(pred).map((r) => r.id);
      if (ids.length > 0) {
        await table.bulkDelete(ids);
        removedCount += ids.length;
      }
    };
    await Promise.all([
      filterAndDelete(db.leads, (r) => r.origin === 'simulated'),
      filterAndDelete(db.tasks, (r) => r.origin === 'simulated'),
      filterAndDelete(db.documents, (r) => r.origin === 'simulated'),
      filterAndDelete(db.expenses, (r) => Boolean(r.simulated)),
      filterAndDelete(db.customerAccounts, (r) => r.source === 'simulated'),
      filterAndDelete(db.salesQuotes, (r) => r.source === 'simulated'),
      filterAndDelete(db.salesOrders, (r) => r.source === 'simulated'),
      filterAndDelete(db.electronicInvoices, (r) => r.source === 'simulated'),
      filterAndDelete(db.customerSurveys, (r) => r.source === 'simulated'),
      filterAndDelete(db.supportTickets, (r) => r.source === 'simulated'),
      filterAndDelete(db.roadmapItems, (r) => r.source === 'simulated'),
      filterAndDelete(db.ledgerEntries, (r) => r.source === 'simulated'),
    ]);
    return { removedCount };
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
      okrObjectives,
      roleSops,
      productMasters,
      bankAccounts,
      interactionRules,
      handoverTickets,
      playbooks,
      experienceMemories,
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
      db.okrObjectives.toArray(),
      db.roleSops.toArray(),
      db.productMasters.toArray(),
      db.bankAccounts.toArray(),
      db.interactionRules.toArray(),
      db.handoverTickets.toArray(),
      db.playbooks.toArray(),
      db.experienceMemories.toArray(),
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
      okrObjectives,
      roleSops,
      productMasters,
      bankAccounts,
      interactionRules,
      handoverTickets,
      playbooks,
      experienceMemories,
    };
  }
  async resetAll() {
    await db.delete();
    await db.open();
    await seedInitialDatabase();
  }
}

export const repository = new DexieRepository();
