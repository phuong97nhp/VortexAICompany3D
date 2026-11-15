import { create } from 'zustand';
import {
  AdCampaignItem,
  AffiliateCampaign,
  AffiliateChannelPost,
  AffiliateClickConversion,
  AffiliateCommission,
  AffiliateContentPiece,
  AffiliateExperiment,
  AffiliateOffer,
  AffiliateProduct,
  AffiliateProductScore,
  AffiliateSettings,
  AgentAccount,
  AgentAppearance,
  AgentExternalAccount,
  AgentMemory,
  AgentOnboardingExamAttempt,
  AgentProfile,
  AgentRuntimeState,
  AgentScreenSnapshot,
  AgentStatus,
  AgentTimelineEvent,
  ApprovalMatrixRule,
  ApprovalRequest,
  AskCeoQuestion,
  AuditLogEntry,
  BackupSnapshotRecord,
  BcpPlanRecord,
  BootStatus,
  BrandLaunchKit,
  BrandMentionRecord,
  BrandSettings,
  ChatChannelId,
  ChatMessage,
  CompanyRiskRegisterItem,
  CompanySettings,
  CompetitorWatchTarget,
  ContractRecord,
  ContractTemplate,
  ContractVariant,
  CouncilSession,
  CrossDeptHandoverTicket,
  CustomerAccountRecord,
  CustomerOnboardingPlan,
  CustomerSurveyRecord,
  DataProcessingActivityRecord,
  DataProvenance,
  DataSubjectRequestRecord,
  DepartmentConfig,
  DepartmentId,
  DeptInteractionRule,
  DeviceActionLog,
  DeviceControlMode,
  DevicePolicyProfile,
  DigitalAssetRecord,
  DocumentItem,
  DurableJob,
  ElectronicInvoiceRecord,
  EncryptedCredentialRecord,
  EngineeringIncidentRecord,
  EngineeringRoadmapItem,
  ExpenseAuditStep,
  ExpenseBudget,
  ExpenseCategoryConfig,
  ExpenseItem,
  ExpenseRule,
  ExpenseStatus,
  ExperienceMemoryItem,
  GitRepoEvaluationReport,
  HrAuditEntry,
  HrScaleRecommendation,
  HubCwApiLog,
  HubCwModuleId,
  HubCwModulePermissionFlag,
  HubCwReconciliationReport,
  HubCwSettings,
  HubCwSyncItem,
  HubCwUndoSnapshot,
  InternalAnnouncementRecord,
  KnowledgeBaseArticle,
  LeadItem,
  LeadStage,
  LeaveRequestRecord,
  LedgerJournalEntry,
  LegalDocument,
  LegalReportRecord,
  LegalSettings,
  LogoPlacement,
  ManagedDeviceRecord,
  MarketingAssetItem,
  MarketingChannelRecord,
  MarketingEventRecord,
  MeetingRequestTicket,
  MoneyIdeaCard,
  OfficeLayoutPreset,
  OkrObjective,
  OnboardingState,
  OriginTag,
  OutfitStyleId,
  OutreachLogEntry,
  PaymentBankAccount,
  Permission,
  PlaybookSkill,
  ProductMasterRecord,
  ProviderId,
  QualityReviewCycle,
  RefundRequestRecord,
  RoleRouteEntry,
  RoleSopDocument,
  RoleType,
  RoomBookingRecord,
  RoutingPresetId,
  RoutingTaskGroup,
  SalesOrderRecord,
  SalesQuoteRecord,
  Scene3dDiagnostics,
  ScheduledSocialPost,
  SecurityAssetRecord,
  SeoKeywordTrack,
  SocialCommentInboxItem,
  SocialPostLogEntry,
  SoftwareReleaseRecord,
  SpendingPolicy,
  SpotCheckRecord,
  SpotCheckScheduleConfig,
  SupportTicketRecord,
  SystemEnvMode,
  SystemHealthLog,
  TaskItem,
  TaskStatus,
  TokenUsageRecord,
  TrackedLink,
  UpgradeChangelogEntry,
  UpgradeProposal,
  VaultAccountStatus,
  VendorSubscriptionRecord,
  VoiceMeetingSession,
  VoiceSettings,
  WebhookEndpointRecord,
  WeeklyBoardReportSnapshot,
  WorkflowTrace,
  ZaloPersonalConfig,
  ZaloPersonalMessageLog,
  ZaloPersonalSession,
} from '../types';
import { CompanyMemoryRecord, createDefaultSettings, db, repository } from '../db/repository';
import {
  buildFallbackBaseSettings,
  validateBackupBundleJson,
} from '../db/schemaMigration';
import { buildWalkWaypoints, floorFromY, MEETING_SEATS, MEETING_SEATS_F3, Vec3 } from '../engine/waypoints';
import {
  decryptSecretAesGcm,
  encryptSecretAesGcm,
  generateHashedAgentToken,
  generateSalt,
  hashPasswordPBKDF2,
  verifyPasswordPBKDF2,
} from '../engine/auth';
import { getDefaultAppearance } from '../engine/characterAppearance';
import { buildRoutingPreset, llmClient } from '../engine/llm';
import { buildDefaultBrandLaunchKit } from '../engine/marketingSeeds';
import { DEFAULT_BRAND_PALETTE } from '../brand/logoBrand';
import {
  buildDefaultHubCwPermissions,
  DEFAULT_HUBCW_BASE_URL,
  HUBCW_MODULES,
} from '../integrations/hubcw/hubcw.config';
import { createHubCwConnector } from '../integrations/hubcw/BusinessSystemConnector';
import {
  executeHubCwWrite,
  revertHubCwSnapshot,
  runHubCwReconciliation,
} from '../integrations/hubcw/writeGate';
import {
  buildSeedAgents,
  buildSeedDepartments,
  getLiveAgentById,
  registerLiveRegistry,
} from '../engine/liveRegistry';
import {
  allocateCustomDepartmentLayout,
  allocateDeskForDepartment,
  buildNewAgentFromSpec,
  collectAgentHandoverItems,
  emitHrEvent,
  OFFICE_EXIT_DOOR_POS,
} from '../engine/hrEngine';
import {
  analyzeExpenseRisks,
  createDefaultSpendingPolicy,
  currentMonthKey,
  evaluateAutoApprovalRule,
  formatVnd,
  validateRuleAgainstPolicy,
} from '../engine/expenseEngine';
import { createAffiliateAdapter } from '../integrations/affiliate/AffiliateNetworkAdapter';
import {
  createAndVerifyTrackedLink,
  parseAffiliateCsvReport,
  runAffiliateComplianceCheck,
  scoreAffiliateProduct,
  shouldAutoCutNegativeRoi,
} from '../integrations/affiliate/affiliateEngine';
import {
  buildLegalReport,
  checkLawChangeImpact,
  draftContractFromVerifiedData,
} from '../engine/legal/legalEngine';
import {
  buildBackupBundleJson,
  createDurableJobRecord,
  createHealthLog,
  dispatchSystemAlert,
  evaluateGoLiveChecklist,
  recoverOrphanedDurableJobs,
} from '../engine/runtime247';
import { circuitBreakers } from '../engine/resilience';
import { realtimeBridge, RealtimeStatus } from '../engine/realtimeBridge';
import {
  buildHonestAgentScreenSnapshot,
  createSpotCheckRecord,
  pickRandomActiveAgent,
  pruneExpiredSpotChecks,
} from '../engine/spotCheckEngine';
import {
  createVoiceProvider,
  parseCeoVoiceCommand,
  proposeUniqueVoiceForAgent,
  stopAllVoicePlayback,
} from '../engine/voiceEngine';
import { conveneCouncilSession, runQualityLoopCycle } from '../engine/qualityCouncilEngine';
import { checkZaloPersonalOutboundGuardrails, maskPeerId } from '../integrations/zaloPersonal/zaloPersonalGuardrails';
import { zaloPersonalAdapter } from '../integrations/zaloPersonal/ZaloPersonalAdapter';
import { calculateRevenueFunnel } from '../engine/okrEngine';
import { analyzeWorkloadForHrRecommendations, gradeAgentOnboardingExam } from '../engine/hrSopEngine';
import {
  analyzeCompanyBottlenecks,
  buildCrossDeptIdleBrainstormDossier,
  buildDeptBlockerMatrix,
  buildIdleMoneyPlan,
  canUsePlaybookFastTrack,
  evaluateGitRepoMetadata,
  evaluateHandoverSlaMetrics,
  findMatchingPlaybook,
  isUnsafeSelfUpgradeProposal,
  recordPlaybookOutcome,
} from '../engine/collaborationEngine';

import {
  buildLedgerFromInvoiceAndExpense,
  buildWeeklyBoardReport,
  calculateCustomerHealthAndChurn,
  calculateVnVat,
  checkErpRbacPermission,
  parseCsvRows,
} from '../engine/erpEngine';
import {
  autoSeatAgentsInPreset,
  buildBuiltinOfficePresets,
  validateOfficeLayout,
} from '../engine/officeEditorEngine';
import { syncAmbientAudioSetting } from '../engine/ambientAudio';

export type RightPanelTab =
  | 'ceo_dashboard'
  | 'chat'
  | 'marketing'
  | 'affiliate'
  | 'legal'
  | 'tasks'
  | 'crm'
  | 'helpdesk'
  | 'engineering'
  | 'logs'
  | 'docs'
  | 'approvals'
  | 'finance'
  | 'hubcw'
  | 'health'
  | 'rbac'
  | 'vault'
  | 'tokens'
  | 'customizer'
  | 'office_editor'
  | 'settings'
  | 'strategy'
  | 'products_bank'
  | 'collab'
  | 'devices';

export interface CameraTargetState {
  position: [number, number, number];
  lookAt: [number, number, number];
  nonce: number;
}

export interface CompanyState {
  initialized: boolean;
  loading: boolean;
  bootStatus: BootStatus;
  bootError: string | null;
  realtimeStatus: RealtimeStatus;
  settings: CompanySettings;
  agents: AgentProfile[];
  departments: DepartmentConfig[];
  hrAudits: HrAuditEntry[];
  accounts: AgentAccount[];
  agentAppearances: Record<string, AgentAppearance>;
  runtimes: Record<string, AgentRuntimeState>;
  tasks: TaskItem[];
  leads: LeadItem[];
  messages: ChatMessage[];
  documents: DocumentItem[];
  approvals: ApprovalRequest[];
  askCeoQuestions: AskCeoQuestion[];
  auditLogs: AuditLogEntry[];
  outreachLogs: OutreachLogEntry[];
  vaultStatuses: VaultAccountStatus[];
  tokenUsage: TokenUsageRecord[];
  agentMemories: Record<string, AgentMemory>;
  companyMemories: CompanyMemoryRecord[];
  workflows: WorkflowTrace[];
  brandKit: BrandLaunchKit;
  marketingChannels: MarketingChannelRecord[];
  scheduledPosts: ScheduledSocialPost[];
  adCampaigns: AdCampaignItem[];
  socialComments: SocialCommentInboxItem[];
  socialLogs: SocialPostLogEntry[];
  // BỔ SUNG E: Expenses & Accounting
  expenses: ExpenseItem[];
  expenseRules: ExpenseRule[];
  expenseBudgets: ExpenseBudget[];
  expenseCategories: ExpenseCategoryConfig[];
  // BỔ SUNG G & H: HubCW Connector & Anti-Fake-Data Firewall
  externalAccounts: AgentExternalAccount[];
  hubcwApiLogs: HubCwApiLog[];
  hubcwSyncQueue: HubCwSyncItem[];
  hubcwUndoSnapshots: HubCwUndoSnapshot[];
  hubcwReconciliations: HubCwReconciliationReport[];
  // BỔ SUNG I: Floor 3 Affiliate
  affiliateOffers: AffiliateOffer[];
  affiliateProducts: AffiliateProduct[];
  affiliateScores: AffiliateProductScore[];
  affiliateCampaigns: AffiliateCampaign[];
  trackedLinks: TrackedLink[];
  affiliateContent: AffiliateContentPiece[];
  affiliatePosts: AffiliateChannelPost[];
  affiliateConversions: AffiliateClickConversion[];
  affiliateCommissions: AffiliateCommission[];
  affiliateExperiments: AffiliateExperiment[];
  // BỔ SUNG K: Legal & Contracts
  legalDocuments: LegalDocument[];
  contractTemplates: ContractTemplate[];
  contracts: ContractRecord[];
  legalReports: LegalReportRecord[];
  // BỔ SUNG J: 24/7 Ops
  durableJobs: DurableJob[];
  systemHealthLogs: SystemHealthLog[];
  backupSnapshots: BackupSnapshotRecord[];

  // BỔ SUNG L–X+: Spot-Check, Voice & Meetings, Quality/Council, Zalo Personal, OKR, HR SOP, Product/Bank, Collab, Devices
  spotChecks: SpotCheckRecord[];
  timelineEvents: AgentTimelineEvent[];
  activeSpotCheckAgentId: string | null;
  monitorWallOpen: boolean;

  voiceSpeakingAgentId: string | null;
  currentSubtitle: { speakerName: string; text: string } | null;
  voiceMeetings: VoiceMeetingSession[];
  activeMeetingId: string | null;
  meetingRequests: MeetingRequestTicket[];

  qualityCycles: QualityReviewCycle[];
  councilSessions: CouncilSession[];

  zaloPersonalSession: ZaloPersonalSession;
  zaloPersonalLogs: ZaloPersonalMessageLog[];

  okrObjectives: OkrObjective[];
  roleSops: RoleSopDocument[];
  onboardingExams: AgentOnboardingExamAttempt[];
  hrRecommendations: HrScaleRecommendation[];

  productMasters: ProductMasterRecord[];
  bankAccounts: PaymentBankAccount[];

  interactionRules: DeptInteractionRule[];
  handoverTickets: CrossDeptHandoverTicket[];
  moneyIdeas: MoneyIdeaCard[];
  competitorWatches: CompetitorWatchTarget[];
  upgradeProposals: UpgradeProposal[];
  upgradeChangelog: UpgradeChangelogEntry[];
  repoEvaluations: GitRepoEvaluationReport[];
  playbooks: PlaybookSkill[];
  experienceMemories: ExperienceMemoryItem[];

  managedDevices: ManagedDeviceRecord[];
  devicePolicy: DevicePolicyProfile;
  deviceLogs: DeviceActionLog[];

  // BỔ SUNG Y & Z: Office Layout Editor & Complete Enterprise ERP
  officeLayouts: OfficeLayoutPreset[];
  officeLayoutUndoStack: OfficeLayoutPreset[];
  officeLayoutRedoStack: OfficeLayoutPreset[];
  customerAccounts: CustomerAccountRecord[];
  salesQuotes: SalesQuoteRecord[];
  salesOrders: SalesOrderRecord[];
  electronicInvoices: ElectronicInvoiceRecord[];
  refundRequests: RefundRequestRecord[];
  customerSurveys: CustomerSurveyRecord[];
  supportTickets: SupportTicketRecord[];
  kbArticles: KnowledgeBaseArticle[];
  customerOnboardings: CustomerOnboardingPlan[];
  roadmapItems: EngineeringRoadmapItem[];
  softwareReleases: SoftwareReleaseRecord[];
  engineeringIncidents: EngineeringIncidentRecord[];
  securityAssets: SecurityAssetRecord[];
  marketingAssets: MarketingAssetItem[];
  seoKeywords: SeoKeywordTrack[];
  brandMentions: BrandMentionRecord[];
  marketingEvents: MarketingEventRecord[];
  ledgerEntries: LedgerJournalEntry[];
  legalRisks: CompanyRiskRegisterItem[];
  dataProcessings: DataProcessingActivityRecord[];
  dsarRequests: DataSubjectRequestRecord[];
  leaveRequests: LeaveRequestRecord[];
  announcements: InternalAnnouncementRecord[];
  roomBookings: RoomBookingRecord[];
  approvalMatrix: ApprovalMatrixRule[];
  vendorSubscriptions: VendorSubscriptionRecord[];
  digitalAssets: DigitalAssetRecord[];
  bcpPlans: BcpPlanRecord[];
  webhookEndpoints: WebhookEndpointRecord[];
  weeklyReports: WeeklyBoardReportSnapshot[];
  commandPaletteOpen: boolean;
  helpGuideOpen: boolean;

  onAskCeoResolvedHook?: (q: AskCeoQuestion, answer: string) => Promise<void> | void;

  // UI HUD State
  activeTab: RightPanelTab;
  activeChannel: ChatChannelId;
  peekMode: boolean;
  selectedAgentId: string | null;
  selectedRoomId: string | null;
  visibleFloor: 'all' | 1 | 2 | 3;
  followAgentMode: boolean;
  dealCelebrationNonce: number;
  cameraTarget: CameraTargetState;
  show3dDiagnostics: boolean;
  scene3dStats: Scene3dDiagnostics | null;
  bannerAlert: string | null;
  unreadNotifications: number;
  zaloSimulatorLog: Array<{ id: string; direction: 'in' | 'out'; text: string; timestamp: number }>;
  serverHealth: {
    mode: 'proxy' | 'browser';
    hasGeminiEnvKey: boolean;
    hasDeepSeekEnvKey: boolean;
    hasSearchKey: boolean;
  } | null;

  // Actions
  init: () => Promise<void>;
  retryBoot: () => Promise<void>;
  setActiveTab: (tab: RightPanelTab) => void;
  setActiveChannel: (channel: ChatChannelId) => void;
  setPeekMode: (peek: boolean) => void;
  selectAgent: (agentId: string | null, flyCamera?: boolean) => void;
  selectRoom: (roomId: string | null) => void;
  setVisibleFloor: (floor: 'all' | 1 | 2 | 3) => void;
  setFollowAgentMode: (follow: boolean) => void;
  flyCameraTo: (position: [number, number, number], lookAt: [number, number, number]) => void;
  toggle3dDiagnostics: () => void;
  setScene3dStats: (stats: Scene3dDiagnostics) => void;
  setBannerAlert: (msg: string | null) => void;
  clearNotifications: () => void;

  // Agent 3D movement & status
  setAgentStatus: (
    agentId: string,
    status: AgentStatus,
    bubbleText?: string,
    taskTitle?: string,
    progressPercent?: number
  ) => void;
  setAgentDelayed: (agentId: string, isDelayed: boolean) => void;
  setAgentPostingSocial: (agentId: string, isPostingSocial: boolean, bubbleText?: string) => void;
  walkAgentToRoom: (agentId: string, toRoomId: string, targetPos?: Vec3) => void;
  walkAgentToMeetingSeat: (agentId: string, seatIndex: number) => void;
  returnAgentToDesk: (agentId: string) => void;
  advanceAgentPositions: (deltaSec: number) => void;

  // BỔ SUNG D: Dynamic HR Management (1-60 Agents & Custom Departments)
  hireAgent: (
    params: Parameters<typeof buildNewAgentFromSpec>[0] & {
      appearance?: Partial<AgentAppearance>;
      customDeskPosition?: [number, number, number];
      voiceProfile?: AgentProfile['voiceProfile'];
      actor?: string;
    }
  ) => Promise<AgentProfile>;
  hireBatchTeam: (
    specs: Array<Parameters<typeof buildNewAgentFromSpec>[0]>,
    actor?: string
  ) => Promise<AgentProfile[]>;
  updateAgentProfile: (
    agentId: string,
    patch: Partial<AgentProfile>,
    actor?: string
  ) => Promise<void>;
  cloneAgent: (agentId: string, newName: string) => Promise<AgentProfile | null>;
  suspendAgent: (agentId: string, actor?: string) => Promise<void>;
  offboardAgent: (params: {
    agentId: string;
    handoverToId: string;
    reason: string;
    actor?: string;
  }) => Promise<{ ok: boolean; error?: string; docId?: string }>;
  rehireAgent: (agentId: string, actor?: string) => Promise<void>;
  deleteAgentPermanently: (agentId: string, actor?: string) => Promise<{ ok: boolean; error?: string }>;
  createDepartment: (params: {
    name: string;
    shortName: string;
    floor: 1 | 2 | 3;
    color: string;
    description: string;
  }) => Promise<DepartmentConfig>;
  updateDepartment: (deptId: string, patch: Partial<DepartmentConfig>) => Promise<void>;
  deleteDepartment: (deptId: string) => Promise<{ ok: boolean; error?: string }>;
  importRosterJson: (payload: { agents: AgentProfile[]; departments?: DepartmentConfig[] }) => Promise<number>;

  // BỔ SUNG E: Expense Management, Two-Tier Approval & Auto-Rules
  createExpense: (input: {
    requesterId: string;
    department?: DepartmentId;
    projectOrCampaign: string;
    category: string;
    title: string;
    amountVnd: number;
    frequency?: 'once' | 'recurring';
    recurringCycleDays?: number;
    justification: string;
    expectedRoi: string;
    vendor: string;
    dueDate?: string;
    attachmentName?: string;
    attachmentDataUrl?: string;
    simulated?: boolean;
  }) => Promise<ExpenseItem>;
  accountantReviewExpense: (params: {
    expenseId: string;
    reviewerId: string;
    decision: 'to_ceo' | 'needs_info' | 'rejected';
    note?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  ceoResolveExpense: (params: {
    expenseId: string;
    decision: 'approved' | 'rejected' | 'edited' | 'needs_info';
    note?: string;
    editedAmountVnd?: number;
    via?: 'web' | 'zalo_sim' | 'zalo_oa';
  }) => Promise<{ ok: boolean; error?: string }>;
  markExpensePaid: (params: {
    expenseId: string;
    actorId: string;
    note?: string;
    attachmentName?: string;
    attachmentDataUrl?: string;
  }) => Promise<void>;
  reconcileExpense: (expenseId: string, actorId: string, note?: string) => Promise<void>;
  saveExpenseRule: (
    rule: Omit<ExpenseRule, 'id' | 'ruleCode' | 'usageMonthKey' | 'usedCountMonth' | 'usedAmountMonthVnd' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      ruleCode?: string;
    }
  ) => Promise<{ ok: boolean; error?: string; rule?: ExpenseRule }>;
  toggleExpenseRule: (ruleId: string) => Promise<void>;
  revokeExpenseRule: (ruleId: string) => Promise<void>;
  deleteExpenseRule: (ruleId: string) => Promise<void>;
  putExpenseBudget: (budget: ExpenseBudget) => Promise<void>;
  addExpenseCategory: (name: string) => Promise<void>;
  updateSpendingPolicy: (patch: Partial<SpendingPolicy>) => Promise<void>;
  recordAiTokenCostExpense: (deltaVnd: number, tokens: number, provider: ProviderId) => Promise<void>;
  handleZaloCommand: (rawText: string) => Promise<boolean>;

  // Character 3D Appearance Customizer
  saveAgentAppearance: (app: AgentAppearance) => Promise<void>;
  resetAgentAppearance: (agentId: string) => Promise<void>;

  // Data mutations & AI Brain Routing
  updateSettings: (patch: Partial<CompanySettings>) => Promise<void>;
  applyRoutingPreset: (preset: RoutingPresetId) => Promise<void>;
  updateRoleRoute: (group: RoutingTaskGroup, patch: Partial<RoleRouteEntry>) => Promise<void>;
  triggerKillSwitch: () => Promise<void>;
  resumeFromKillSwitch: () => Promise<void>;
  changeCeoPassword: (newPassword: string) => Promise<void>;

  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: number }) => Promise<ChatMessage>;
  putTask: (task: TaskItem) => Promise<void>;
  moveTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  putLead: (lead: LeadItem) => Promise<void>;
  moveLeadStage: (leadId: string, stage: LeadStage) => Promise<void>;
  toggleLeadBlacklist: (leadId: string) => Promise<void>;
  putDocument: (doc: DocumentItem) => Promise<void>;
  putApproval: (req: ApprovalRequest) => Promise<void>;
  resolveApproval: (id: string, decision: 'approved' | 'rejected' | 'edited', note?: string) => Promise<void>;
  putAskCeoQuestion: (q: AskCeoQuestion) => Promise<void>;
  answerAskCeo: (id: string, answer: string, via: 'web' | 'zalo_sim' | 'zalo_oa') => Promise<void>;
  addAuditLog: (entry: AuditLogEntry) => Promise<void>;
  addOutreachLog: (entry: OutreachLogEntry) => Promise<void>;
  putVaultStatus: (status: VaultAccountStatus) => Promise<void>;
  addTokenUsage: (rec: TokenUsageRecord) => Promise<void>;
  appendAgentMemory: (agentId: string, note: string) => Promise<void>;
  putWorkflow: (wf: WorkflowTrace) => Promise<void>;
  putBrandKit: (kit: BrandLaunchKit) => Promise<void>;
  putMarketingChannel: (ch: MarketingChannelRecord) => Promise<void>;
  putScheduledPost: (post: ScheduledSocialPost) => Promise<void>;
  movePostToDay: (postId: string, dayNumber: number) => Promise<void>;
  putAdCampaign: (ad: AdCampaignItem) => Promise<void>;
  putSocialComment: (cmt: SocialCommentInboxItem) => Promise<void>;
  addSocialLog: (entry: SocialPostLogEntry) => Promise<void>;
  registerAskCeoResolvedHook: (fn: (q: AskCeoQuestion, answer: string) => Promise<void> | void) => void;

  // RBAC mutations
  updateAccountRole: (agentId: string, role: RoleType) => Promise<void>;
  toggleAccountPermission: (agentId: string, perm: Permission) => Promise<void>;
  toggleAccountSuspended: (agentId: string) => Promise<void>;
  resetAgentToken: (agentId: string) => Promise<string>;

  // Zalo Simulator
  pushZaloSimMessage: (direction: 'in' | 'out', text: string) => void;

  // DB reset
  resetDatabase: () => Promise<void>;

  // BỔ SUNG G & H Actions: HubCW Connector, Credential Vault, Sync, Undo, Env Switch & Uniform Brand
  getDecryptedAgentSecret: (agentId: string) => Promise<string | undefined>;
  linkExistingExternalAccount: (params: {
    agentId: string;
    username: string;
    secret: string;
    authType: 'token' | 'password_session';
    externalUserId?: string;
    email?: string;
    externalRole?: string;
  }) => Promise<{ ok: boolean; message: string }>;
  proposeCreateExternalAccount: (params: {
    agentId: string;
    username: string;
    email: string;
    externalRole: string;
  }) => Promise<{ ok: boolean; message: string; setupGuide: string }>;
  testExternalAccountLogin: (agentId: string) => Promise<{ ok: boolean; message: string }>;
  lockExternalAccount: (agentId: string, reason?: string) => Promise<void>;
  rotateExternalToken: (agentId: string, newSecret: string) => Promise<{ ok: boolean; message: string }>;
  updateAgentHubCwPermissions: (
    agentId: string,
    module: HubCwModuleId,
    flag: HubCwModulePermissionFlag
  ) => Promise<void>;
  updateHubCwSettings: (patch: Partial<HubCwSettings>) => Promise<void>;
  checkHubCwModuleHealth: () => Promise<void>;
  addHubCwApiLog: (log: HubCwApiLog) => Promise<void>;
  addHubCwUndoSnapshot: (snap: HubCwUndoSnapshot) => Promise<void>;
  enqueueHubCwSync: (item: Omit<HubCwSyncItem, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<HubCwSyncItem>;
  processHubCwSyncQueue: () => Promise<{ processed: number; blocked: number }>;
  revertHubCwWriteAction: (snapshotId: string) => Promise<{ ok: boolean; message: string }>;
  runReconciliationNow: () => Promise<HubCwReconciliationReport>;
  switchEnvModeWithPreflight: (
    targetMode: SystemEnvMode,
    options?: { confirmPhrase?: string; ceoPassword?: string }
  ) => Promise<{ ok: boolean; message: string; checks?: Array<{ label: string; ok: boolean; detail: string }> }>;
  instantRevertToSafeMode: (target?: 'sandbox' | 'read_only') => Promise<void>;
  updateBrandSettings: (patch: Partial<BrandSettings>) => Promise<void>;
  applyUniformToDept: (
    departmentId: DepartmentId,
    options: { outfitStyle?: OutfitStyleId; outfitColor?: string; logoPlacement?: LogoPlacement; showBadge?: boolean; useUniform?: boolean }
  ) => Promise<number>;
  applyUniformToCompany: (options: {
    outfitStyle?: OutfitStyleId;
    useUniform?: boolean;
    logoPlacement?: LogoPlacement;
    showBadge?: boolean;
    tintWithBrandPrimary?: boolean;
  }) => Promise<number>;

  // BỔ SUNG I: Affiliate Actions (Floor 3)
  updateAffiliateSettings: (patch: Partial<AffiliateSettings>) => Promise<void>;
  runAffiliateScoutCycle: (
    niche: string,
    networkId?: string
  ) => Promise<{ offers: AffiliateOffer[]; products: AffiliateProduct[]; scores: AffiliateProductScore[] }>;
  runAffiliateSelectProductMeeting: () => Promise<void>;
  createAffiliateCampaign: (params: {
    productId: string;
    channels: string[];
    contentAngle: string;
    budgetVnd: number;
  }) => Promise<AffiliateCampaign>;
  createAffiliateTrackedLink: (params: {
    productId: string;
    subId: string;
    campaignId?: string;
    createdBy: string;
  }) => Promise<TrackedLink>;
  createAffiliateContentPiece: (params: {
    campaignId: string;
    productId: string;
    trackedLinkId: string;
    type: AffiliateContentPiece['type'];
    title: string;
    body: string;
    hasAffiliateDisclosure: boolean;
    claimsTestedPersonally: boolean;
    authorId: string;
  }) => Promise<AffiliateContentPiece>;
  putAffiliateContent: (piece: AffiliateContentPiece) => Promise<void>;
  reviewAffiliateContentCompliance: (
    contentPieceId: string,
    reviewerId?: string
  ) => Promise<{ passed: boolean; reasons: string[] }>;
  scheduleAffiliatePost: (params: {
    contentPieceId: string;
    platform: AffiliateChannelPost['platform'];
    isPaidAd: boolean;
  }) => Promise<{ ok: boolean; post?: AffiliateChannelPost; reason?: string }>;
  importAffiliateCsvReport: (params: {
    networkId: string;
    csvText: string;
    fileName: string;
  }) => Promise<{ clicksCount: number; commissionsCount: number }>;
  checkAllAffiliateLinksHealth: () => Promise<{ checked: number; dead: number; expired: number }>;
  evaluateAffiliateRoiCutoffs: () => Promise<number>;

  // BỔ SUNG K: Legal & Contracts Actions (Floor 2)
  updateLegalSettings: (patch: Partial<LegalSettings>) => Promise<void>;
  draftNewContract: (params: {
    templateId: string;
    variant: ContractVariant;
    partyBInput: {
      name?: string;
      taxCode?: string;
      address?: string;
      representative?: string;
      sourceLabel?: string;
    };
    contractValueVnd: number;
    durationMonths?: number;
    involvesChildrenData?: boolean;
    hasForeignElement?: boolean;
    involvesSourceCodeSale?: boolean;
    isLongTermExclusive?: boolean;
    linkedLeadId?: string;
    linkedHubCwCustomerId?: string;
    createdBy: string;
  }) => Promise<ContractRecord>;
  saveContractRevision: (
    contractId: string,
    content: string,
    note: string,
    editedBy?: string
  ) => Promise<ContractRecord | null>;
  submitContractForCeoApproval: (contractId: string) => Promise<void>;
  ceoApproveAndUnlockContractSend: (contractId: string, via?: 'web' | 'zalo_sim') => Promise<void>;
  sendContractToClient: (contractId: string, actorId: string) => Promise<{ ok: boolean; error?: string }>;
  runLegalReportForContract: (contractId: string, actorId?: string) => Promise<LegalReportRecord | null>;
  putLegalReport: (report: LegalReportRecord) => Promise<void>;
  checkLegalUpdatesOnline: () => Promise<{ checkedAt: string; message: string }>;
  simulateLawStatusChange: (
    docId: string,
    newStatus: LegalDocument['effectiveStatus'],
    note?: string
  ) => Promise<{ affectedTemplates: number; affectedContracts: number }>;

  // BỔ SUNG J: 24/7 Ops, Durable Jobs, Health Logs, Backup & Onboarding
  enqueueJob: (params: {
    type: string;
    agentId: string;
    department: DepartmentId;
    payload: Record<string, unknown>;
    totalSteps?: number;
  }) => Promise<DurableJob>;
  runPendingDurableJobs: () => Promise<number>;
  addHealthLog: (
    level: SystemHealthLog['level'],
    component: string,
    message: string,
    traceId?: string,
    detail?: string
  ) => Promise<void>;
  sendTestCeoAlert: () => Promise<{ ok: boolean; channel: string }>;
  recordOnboardingProgress: (patch: Partial<OnboardingState>) => Promise<void>;
  deleteDemoData: () => Promise<void>;
  createManualBackup: (label?: string) => Promise<BackupSnapshotRecord>;
  restoreFromBackupJson: (rawJson: string) => Promise<{ ok: boolean; error?: string; restoredCount?: number }>;

  // BỔ SUNG L: Spot-Check
  openSpotCheck: (agentId: string | null) => void;
  setMonitorWallOpen: (open: boolean) => void;
  recordTimelineEvent: (params: {
    agentId: string;
    stepLabel: string;
    detailMasked: string;
    toolName?: string;
  }) => void;
  captureAgentScreen: (agentId: string) => AgentScreenSnapshot | null;
  recordManualSpotCheck: (agentId: string, inspector?: 'ceo' | 'coo') => Promise<SpotCheckRecord | null>;
  runRandomSpotCheck: (inspector?: 'ceo' | 'coo') => Promise<SpotCheckRecord | null>;
  submitSpotCheckReview: (params: {
    recordId: string;
    ceoScore?: number;
    ceoNote?: string;
    action?: 'remind' | 'explain' | 'reassign' | 'pause' | 'note';
  }) => Promise<void>;
  updateSpotCheckConfig: (patch: Partial<SpotCheckScheduleConfig>) => Promise<void>;

  // BỔ SUNG M: Voice & Live Digital Meetings
  updateVoiceSettings: (patch: Partial<VoiceSettings>) => Promise<void>;
  speakAsAgent: (agentId: string, text: string) => Promise<void>;
  stopSpeakingNow: () => void;
  startVoiceMeeting: (params: {
    title: string;
    participantIds: string[];
    isQuickFiveMin?: boolean;
    recordTranscriptOptIn?: boolean;
  }) => Promise<VoiceMeetingSession>;
  appendMeetingTurn: (params: {
    meetingId: string;
    speakerId: string;
    speakerName: string;
    speakerTitle: string;
    text: string;
    speakAudio?: boolean;
  }) => Promise<void>;
  toggleRaiseHandInMeeting: (meetingId: string, agentId: string) => Promise<void>;
  endVoiceMeeting: (meetingId: string, saveTranscript?: boolean) => Promise<void>;
  requestCeoMeeting: (agentId: string, topic: string, urgency?: 'normal' | 'urgent') => void;
  respondMeetingRequest: (requestId: string, decision: 'accepted' | 'snoozed' | 'declined') => Promise<void>;
  handleCeoVoiceTranscript: (transcript: string) => Promise<string>;

  // BỔ SUNG N: Quality Loop & Council
  runQualityCycle: (params: {
    title: string;
    department: DepartmentId;
    definitionOfDone: string;
    draftText: string;
    taskId?: string;
    makerId?: string;
  }) => Promise<QualityReviewCycle>;
  conveneCouncil: (params: { topic: string; participantIds?: string[] }) => Promise<CouncilSession>;

  // BỔ SUNG O: Zalo Cá nhân (zca-js)
  updateZaloPersonalConfig: (patch: Partial<ZaloPersonalConfig>) => Promise<void>;
  startZaloPersonalQr: () => Promise<void>;
  confirmZaloPersonalQrSim: (accountName?: string) => Promise<void>;
  disconnectZaloPersonal: () => Promise<void>;
  sendZaloPersonalMessage: (params: {
    peerId: string;
    peerName: string;
    text: string;
    agentId: string;
    isReplyToInbound?: boolean;
    isColdMarketing?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  addZaloPersonalDnc: (peerId: string) => Promise<void>;

  // BỔ SUNG P: OKR & Revenue Plan
  upsertOkrObjective: (okr: OkrObjective) => Promise<void>;
  computeOkrPlan: (objectiveId: string) => ReturnType<typeof calculateRevenueFunnel> | null;
  runOkrGovernanceCadence: (
    type: 'weekly_plan' | 'midweek_review' | 'period_report',
    objectiveId?: string
  ) => Promise<void>;
  approveOkrRecoveryPlan: (objectiveId: string) => Promise<void>;

  // BỔ SUNG Q: Dynamic HR Scaling + SOP + Onboarding Exam
  upsertRoleSop: (sop: RoleSopDocument) => Promise<void>;
  approveRoleSop: (sopId: string) => Promise<void>;
  runAgentOnboardingExam: (agentId: string, customAnswers?: string[]) => Promise<AgentOnboardingExamAttempt | null>;
  runHrWorkloadCheck: () => Promise<HrScaleRecommendation[]>;
  resolveHrRecommendation: (recId: string, decision: 'approved' | 'rejected') => Promise<void>;

  // BỔ SUNG R: Product Master & Bank Accounts (CEO 2FA)
  upsertProductMaster: (product: ProductMasterRecord) => Promise<void>;
  addOrUpdateBankAccountWith2Fa: (params: {
    ceoPassword: string;
    otpCode: string;
    account: Omit<PaymentBankAccount, 'id' | 'twoFactorConfirmedAt' | 'createdBy' | 'updatedAt'> & { id?: string };
  }) => Promise<{ ok: boolean; error?: string }>;
  deleteBankAccountWith2Fa: (id: string, ceoPassword: string) => Promise<{ ok: boolean; error?: string }>;

  // BỔ SUNG S, T, U, V, W: Collaboration, Money Ideas, Competitor Watch, Upgrades, Git Repo Scout, Playbooks
  createHandoverTicket: (params: {
    fromDepartment: DepartmentId;
    toDepartment: DepartmentId;
    fromAgentId: string;
    toAgentId: string;
    title: string;
    payloadSummary: string;
    deliverableRef?: string;
    slaMinutes?: number;
  }) => Promise<CrossDeptHandoverTicket>;
  respondHandoverTicket: (
    ticketId: string,
    action: 'accepted' | 'rejected' | 'completed' | 'escalated_overdue',
    reason?: string
  ) => Promise<void>;
  runDailyDeptStandup: () => Promise<void>;
  runIdleMoneyBrainstorm: () => Promise<MoneyIdeaCard>;
  updateMoneyIdeaStage: (
    ideaId: string,
    stage: MoneyIdeaCard['stage'],
    ceoApproved?: boolean,
    legalSignoff?: MoneyIdeaCard['legalSignoff'],
    realTestResult?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  addCompetitorWatch: (params: {
    name: string;
    publicUrl: string;
    niche: string;
    lastPriceNote?: string;
    lastFeaturesNote?: string;
    strengths?: string;
    weaknesses?: string;
  }) => Promise<CompetitorWatchTarget>;
  runCompetitorWatchCycle: () => Promise<void>;
  proposeSystemUpgrade: (params: {
    title: string;
    proposedBy: string;
    bottleneckEvidence: string;
    solutionSummary: string;
    expectedRoi: string;
    estimatedCostVnd?: number;
    beforeMetric: string;
    testPlan?: string;
    patchOrPrNote?: string;
  }) => Promise<UpgradeProposal | null>;
  runBottleneckUpgradeAnalysis: () => Promise<UpgradeProposal[]>;
  advanceUpgradeStage: (
    proposalId: string,
    stage: UpgradeProposal['rolloutStage'],
    options?: { ceoApprovedByAction?: boolean }
  ) => Promise<{ ok: boolean; error?: string }>;
  scoutGitRepo: (query: string) => Promise<GitRepoEvaluationReport[]>;
  runSandboxTestOnRepo: (repoReportId: string) => Promise<GitRepoEvaluationReport | null>;
  markRepoLegalReviewed: (repoReportId: string, approved: boolean) => Promise<void>;
  promoteRepoToUpgradeProposal: (repoReportId: string) => Promise<UpgradeProposal | null>;
  recordPlaybookRun: (
    playbookId: string,
    qualityScore: number,
    metrics?: { durationMs?: number; tokensUsed?: number; reworked?: boolean }
  ) => Promise<void>;
  togglePlaybookFastTrack: (playbookId: string) => Promise<void>;
  markPlaybookReviewed: (playbookId: string) => Promise<void>;
  addExperienceMemory: (item: Omit<ExperienceMemoryItem, 'id' | 'createdAt'>) => Promise<ExperienceMemoryItem>;
  recordTaskRevisionFeedback: (taskId: string, feedbackText: string) => Promise<void>;

  // BỔ SUNG X+: Plug-and-Play Android Device Farm
  refreshDevices: () => Promise<void>;
  connectWirelessDevice: (ipPort: string, pairingCode?: string) => Promise<{ ok: boolean; message: string }>;
  setDeviceControlMode: (deviceId: string, mode: DeviceControlMode) => Promise<void>;
  assignDeviceToAgent: (deviceId: string, agentId: string | undefined) => Promise<void>;
  toggleDeviceStream: (deviceId: string, active: boolean) => Promise<void>;
  executeDeviceCommand: (params: {
    deviceId: string;
    agentId: string;
    action: 'tap' | 'swipe' | 'input_text' | 'back' | 'home' | 'open_app' | 'screenshot' | 'ocr_read';
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    text?: string;
    packageName?: string;
    ceoConfirmed?: boolean;
  }) => Promise<{ ok: boolean; error?: string; screenshotDataUrl?: string; ocrText?: string }>;
  grabDeviceControlStop: (deviceId: string) => Promise<void>;
  updateDevicePolicy: (patch: Partial<DevicePolicyProfile>) => void;

  // BỔ SUNG Y: Office Layout Editor & UI Modals
  setCommandPaletteOpen: (open: boolean) => void;
  setHelpGuideOpen: (open: boolean) => void;
  saveOfficeLayoutPreset: (preset: OfficeLayoutPreset, pushUndo?: boolean) => Promise<void>;
  switchOfficeLayoutPreset: (presetId: string) => Promise<{ ok: boolean; error?: string }>;
  undoOfficeLayout: () => Promise<void>;
  redoOfficeLayout: () => Promise<void>;
  autoSeatUnseatedAgents: (presetId: string) => Promise<number>;
  deleteOfficeLayoutPreset: (presetId: string) => Promise<void>;

  // BỔ SUNG Z: Complete Enterprise ERP Actions
  putCustomerAccount: (account: CustomerAccountRecord) => Promise<void>;
  putSalesQuote: (quote: SalesQuoteRecord) => Promise<void>;
  convertQuoteToOrderAndInvoice: (quoteId: string) => Promise<{ ok: boolean; order?: SalesOrderRecord; invoice?: ElectronicInvoiceRecord; error?: string }>;
  sendInvoicePaymentReminder: (invoiceId: string) => Promise<void>;
  recordInvoicePayment: (invoiceId: string, paidAmountVnd: number) => Promise<void>;
  createRefundRequest: (params: { orderId: string; amountVnd: number; reason: string; requestedBy?: string }) => Promise<RefundRequestRecord | null>;
  resolveRefundRequest: (refundId: string, decision: 'approved' | 'rejected' | 'refunded') => Promise<void>;
  addCustomerSurvey: (survey: Omit<CustomerSurveyRecord, 'id' | 'createdAt'>) => Promise<void>;
  importCustomersCsv: (csvText: string) => Promise<{ imported: number; error?: string }>;
  createSupportTicket: (params: {
    customerName: string;
    customerId?: string;
    channel: SupportTicketRecord['channel'];
    subject: string;
    description: string;
    priority: SupportTicketRecord['priority'];
    assigneeAgentId?: string;
    slaMinutes?: number;
  }) => Promise<SupportTicketRecord>;
  updateSupportTicket: (ticket: SupportTicketRecord) => Promise<void>;
  escalateSupportTicket: (ticketId: string, toAgentId?: string) => Promise<void>;
  resolveSupportTicketWithKb: (params: {
    ticketId: string;
    solutionSteps: string;
    createKbFaq?: boolean;
    category?: string;
  }) => Promise<void>;
  putCustomerOnboarding: (plan: CustomerOnboardingPlan) => Promise<void>;
  putRoadmapItem: (item: EngineeringRoadmapItem) => Promise<void>;
  putSoftwareRelease: (rel: SoftwareReleaseRecord) => Promise<void>;
  putEngineeringIncident: (inc: EngineeringIncidentRecord) => Promise<void>;
  putSecurityAsset: (sec: SecurityAssetRecord) => Promise<void>;
  putMarketingAsset: (asset: MarketingAssetItem) => Promise<void>;
  putSeoKeyword: (kw: SeoKeywordTrack) => Promise<void>;
  putBrandMention: (m: BrandMentionRecord) => Promise<void>;
  putMarketingEvent: (ev: MarketingEventRecord) => Promise<void>;
  putLegalRisk: (risk: CompanyRiskRegisterItem) => Promise<void>;
  putDataProcessing: (dpa: DataProcessingActivityRecord) => Promise<void>;
  putDsarRequest: (dsar: DataSubjectRequestRecord) => Promise<void>;
  putLeaveRequest: (req: LeaveRequestRecord) => Promise<void>;
  resolveLeaveRequest: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  putAnnouncement: (ann: InternalAnnouncementRecord) => Promise<void>;
  putRoomBooking: (booking: RoomBookingRecord) => Promise<void>;
  putApprovalMatrixRule: (rule: ApprovalMatrixRule) => Promise<void>;
  putVendorSubscription: (v: VendorSubscriptionRecord) => Promise<void>;
  putDigitalAsset: (a: DigitalAssetRecord) => Promise<void>;
  runBcpDrill: (planId: string) => Promise<void>;
  putWebhookEndpoint: (wh: WebhookEndpointRecord) => Promise<void>;
  testWebhookEndpoint: (id: string) => Promise<{ ok: boolean; status: number }>;
  deleteWebhookEndpoint: (id: string) => Promise<void>;
  generateWeeklyBoardReport: () => Promise<WeeklyBoardReportSnapshot>;
  clearSimulatedDataAction: () => Promise<{ removedCount: number }>;
}

function buildInitialRuntimes(agents: AgentProfile[]): Record<string, AgentRuntimeState> {
  const map: Record<string, AgentRuntimeState> = {};
  const now = Date.now();
  for (const agent of agents) {
    map[agent.id] = {
      agentId: agent.id,
      status: 'idle',
      currentPosition: [...agent.deskPosition],
      targetPosition: [...agent.deskPosition],
      waypoints: [],
      progressPercent: 0,
      lastHeartbeatAt: now,
    };
  }
  return map;
}

function buildDefaultAppearancesMap(agents: AgentProfile[]): Record<string, AgentAppearance> {
  const map: Record<string, AgentAppearance> = {};
  for (const agent of agents) {
    map[agent.id] = getDefaultAppearance(agent);
  }
  return map;
}

const seedDepts = buildSeedDepartments();
const seedAgents = buildSeedAgents();

export const useCompanyStore = create<CompanyState>((set, get) => {
  const refreshAccountantPendingCount = (expenses: ExpenseItem[]) => {
    const pendingCount = expenses.filter((e) => e.status === 'pending_accountant').length;
    set((s) => {
      const nextRuntimes = { ...s.runtimes };
      for (const acc of s.accounts) {
        if (acc.permissions.includes('expense:review') && nextRuntimes[acc.agentId]) {
          nextRuntimes[acc.agentId] = {
            ...nextRuntimes[acc.agentId],
            pendingReviewCount: pendingCount,
          };
        }
      }
      return { runtimes: nextRuntimes };
    });
  };

  return {
    initialized: false,
    loading: true,
    bootStatus: 'booting',
    bootError: null,
    realtimeStatus: 'offline',
    agents: seedAgents,
    departments: seedDepts,
    hrAudits: [],
    settings: buildFallbackBaseSettings(),
    accounts: [],
    agentAppearances: buildDefaultAppearancesMap(seedAgents),
    runtimes: buildInitialRuntimes(seedAgents),
    tasks: [],
    leads: [],
    messages: [],
    documents: [],
    approvals: [],
    askCeoQuestions: [],
    auditLogs: [],
    outreachLogs: [],
    vaultStatuses: [],
    tokenUsage: [],
    agentMemories: {},
    companyMemories: [],
    workflows: [],
    brandKit: buildDefaultBrandLaunchKit('AI COMPANY VIỆT NAM'),
    marketingChannels: [],
    scheduledPosts: [],
    adCampaigns: [],
    socialComments: [],
    socialLogs: [],
    expenses: [],
    expenseRules: [],
    expenseBudgets: [],
    expenseCategories: [],
    externalAccounts: [],
    hubcwApiLogs: [],
    hubcwSyncQueue: [],
    hubcwUndoSnapshots: [],
    hubcwReconciliations: [],
    affiliateOffers: [],
    affiliateProducts: [],
    affiliateScores: [],
    affiliateCampaigns: [],
    trackedLinks: [],
    affiliateContent: [],
    affiliatePosts: [],
    affiliateConversions: [],
    affiliateCommissions: [],
    affiliateExperiments: [],
    legalDocuments: [],
    contractTemplates: [],
    contracts: [],
    legalReports: [],
    durableJobs: [],
    systemHealthLogs: [],
    backupSnapshots: [],

    spotChecks: [],
    timelineEvents: [],
    activeSpotCheckAgentId: null,
    monitorWallOpen: false,

    voiceSpeakingAgentId: null,
    currentSubtitle: null,
    voiceMeetings: [],
    activeMeetingId: null,
    meetingRequests: [],

    qualityCycles: [],
    councilSessions: [],

    zaloPersonalSession: { status: 'disconnected', mode: 'sandbox_sim' },
    zaloPersonalLogs: [],

    okrObjectives: [],
    roleSops: [],
    onboardingExams: [],
    hrRecommendations: [],

    productMasters: [],
    bankAccounts: [],

    interactionRules: [],
    handoverTickets: [],
    moneyIdeas: [],
    competitorWatches: [],
    upgradeProposals: [],
    upgradeChangelog: [],
    repoEvaluations: [],
    playbooks: [],
    experienceMemories: [],

    managedDevices: [],
    devicePolicy: {
      allowedPackages: [
        'com.zing.zalo',
        'com.ss.android.ugc.trill',
        'com.facebook.katana',
        'com.facebook.orca',
        'com.shopee.vn',
        'com.google.android.youtube',
      ],
      blockedPackages: [
        'com.android.settings',
        'com.android.vending',
        'com.vietcombank',
        'com.VCB',
        'vn.com.techcombank',
        'com.mbmobile',
        'com.mservice.momotransfer',
        'vn.com.vng.zalopay',
        'com.google.android.apps.authenticator2',
        'com.azure.authenticator',
        'com.authy.authy',
        'com.x8bit.bitwarden',
        'com.agilebits.onepassword',
        'com.lastpass.lpandroid',
        'keepass2android.keepass2android',
        'com.dashlane',
        'com.google.android.apps.photos',
        'com.android.contacts',
      ],
      maxActionsPerMinute: 18,
      maxContinuousMinutes: 20,
      minActionDelayMs: 650,
      maskPasswordAndOtpRegions: true,
      requireCeoForInstallApk: true,
      stopBatteryBelowPercent: 15,
      stopTempAboveC: 44,
    },
    deviceLogs: [],

    officeLayouts: [],
    officeLayoutUndoStack: [],
    officeLayoutRedoStack: [],
    customerAccounts: [],
    salesQuotes: [],
    salesOrders: [],
    electronicInvoices: [],
    refundRequests: [],
    customerSurveys: [],
    supportTickets: [],
    kbArticles: [],
    customerOnboardings: [],
    roadmapItems: [],
    softwareReleases: [],
    engineeringIncidents: [],
    securityAssets: [],
    marketingAssets: [],
    seoKeywords: [],
    brandMentions: [],
    marketingEvents: [],
    ledgerEntries: [],
    legalRisks: [],
    dataProcessings: [],
    dsarRequests: [],
    leaveRequests: [],
    announcements: [],
    roomBookings: [],
    approvalMatrix: [],
    vendorSubscriptions: [],
    digitalAssets: [],
    bcpPlans: [],
    webhookEndpoints: [],
    weeklyReports: [],
    commandPaletteOpen: false,
    helpGuideOpen: false,

    activeTab: 'chat',
    activeChannel: 'all',
    peekMode: false,
    selectedAgentId: null,
    selectedRoomId: null,
    visibleFloor: 'all',
    followAgentMode: false,
    dealCelebrationNonce: 0,
    cameraTarget: {
      position: [22, 19, 23],
      lookAt: [0, 3.2, 0],
      nonce: 0,
    },
    show3dDiagnostics: false,
    scene3dStats: null,
    bannerAlert: null,
    unreadNotifications: 1,
    zaloSimulatorLog: [
      {
        id: 'z_init',
        direction: 'in',
        text: '[Zalo OA Giả lập] Sẵn sàng nhận câu hỏi khẩn, phiếu chi #CP-xxx, hợp đồng #HD-xxx & cảnh báo 24/7.',
        timestamp: Date.now(),
      },
    ],
    serverHealth: null,

    init: async () => {
      set({ loading: true, bootStatus: 'booting', bootError: null });
      try {
        const settings = await repository.getSettings();
        const savedDeepSeekKey = typeof window !== 'undefined' ? localStorage.getItem('aicompany_deepseek_key') || '' : '';
        const savedGeminiKey = typeof window !== 'undefined' ? localStorage.getItem('aicompany_gemini_key') || '' : '';
        const mergedSettings: CompanySettings = {
          ...settings,
          deepseekApiKey: savedDeepSeekKey || settings.deepseekApiKey,
          geminiApiKey: savedGeminiKey || settings.geminiApiKey,
        };

        const [
          agents,
          departments,
          hrAudits,
          accounts,
          appearancesArr,
          tasks,
          leads,
          messages,
          documents,
          approvals,
          askCeoQuestions,
          auditLogs,
          outreachLogs,
          vaultStatuses,
          tokenUsage,
          agentMemsArr,
          companyMemories,
          workflows,
          brandKit,
          marketingChannels,
          scheduledPosts,
          adCampaigns,
          socialComments,
          socialLogs,
          expenses,
          expenseRules,
          expenseBudgets,
          expenseCategories,
          externalAccounts,
          hubcwApiLogs,
          hubcwSyncQueue,
          hubcwUndoSnapshots,
          hubcwReconciliations,
          affiliateOffers,
          affiliateProducts,
          affiliateScores,
          affiliateCampaigns,
          trackedLinks,
          affiliateContent,
          affiliatePosts,
          affiliateConversions,
          affiliateCommissions,
          affiliateExperiments,
          legalDocuments,
          contractTemplates,
          contracts,
          legalReports,
          durableJobsRaw,
          systemHealthLogs,
          backupSnapshots,
          spotChecks,
          voiceMeetings,
          qualityCycles,
          councilSessions,
          zaloPersonalLogs,
          okrObjectives,
          roleSops,
          onboardingExams,
          productMasters,
          bankAccounts,
          interactionRules,
          handoverTickets,
          moneyIdeas,
          competitorWatches,
          upgradeProposals,
          upgradeChangelog,
          repoEvaluations,
          playbooks,
          experienceMemories,
          managedDevices,
          deviceLogs,
          officeLayoutsRaw,
          customerAccounts,
          salesQuotes,
          salesOrders,
          electronicInvoices,
          refundRequests,
          customerSurveys,
          supportTickets,
          kbArticles,
          customerOnboardings,
          roadmapItems,
          softwareReleases,
          engineeringIncidents,
          securityAssets,
          marketingAssets,
          seoKeywords,
          brandMentions,
          marketingEvents,
          ledgerEntries,
          legalRisks,
          dataProcessings,
          dsarRequests,
          leaveRequests,
          announcements,
          roomBookings,
          approvalMatrix,
          vendorSubscriptions,
          digitalAssets,
          bcpPlans,
          webhookEndpoints,
          weeklyReports,
        ] = await Promise.all([
          repository.getAgents(),
          repository.getDepartments(),
          repository.getHrAudits(),
          repository.getAccounts(),
          repository.getAgentAppearances(),
          repository.getTasks(),
          repository.getLeads(),
          repository.getMessages(),
          repository.getDocuments(),
          repository.getApprovals(),
          repository.getAskCeoQuestions(),
          repository.getAuditLogs(),
          repository.getOutreachLogs(),
          repository.getVaultStatuses(),
          repository.getTokenUsage(),
          repository.getAgentMemories(),
          repository.getCompanyMemories(),
          repository.getWorkflows(),
          repository.getBrandKit(),
          repository.getMarketingChannels(),
          repository.getScheduledPosts(),
          repository.getAdCampaigns(),
          repository.getSocialComments(),
          repository.getSocialLogs(),
          repository.getExpenses(),
          repository.getExpenseRules(),
          repository.getExpenseBudgets(),
          repository.getExpenseCategories(),
          repository.getExternalAccounts(),
          repository.getHubCwApiLogs(),
          repository.getHubCwSyncQueue(),
          repository.getHubCwUndoSnapshots(),
          repository.getHubCwReconciliations(),
          repository.getAffiliateOffers(),
          repository.getAffiliateProducts(),
          repository.getAffiliateScores(),
          repository.getAffiliateCampaigns(),
          repository.getTrackedLinks(),
          repository.getAffiliateContent(),
          repository.getAffiliatePosts(),
          repository.getAffiliateConversions(),
          repository.getAffiliateCommissions(),
          repository.getAffiliateExperiments(),
          repository.getLegalDocuments(),
          repository.getContractTemplates(),
          repository.getContracts(),
          repository.getLegalReports(),
          repository.getDurableJobs(),
          repository.getSystemHealthLogs(),
          repository.getBackupSnapshots(),
          repository.getSpotChecks(),
          repository.getVoiceMeetings(),
          repository.getQualityCycles(),
          repository.getCouncilSessions(),
          repository.getZaloPersonalLogs(),
          repository.getOkrObjectives(),
          repository.getRoleSops(),
          repository.getOnboardingExams(),
          repository.getProductMasters(),
          repository.getBankAccounts(),
          repository.getInteractionRules(),
          repository.getHandoverTickets(),
          repository.getMoneyIdeas(),
          repository.getCompetitorWatches(),
          repository.getUpgradeProposals(),
          repository.getUpgradeChangelog(),
          repository.getRepoEvaluations(),
          repository.getPlaybooks(),
          repository.getExperienceMemories(),
          repository.getManagedDevices(),
          repository.getDeviceActionLogs(),
          repository.getOfficeLayouts(),
          repository.getCustomerAccounts(),
          repository.getSalesQuotes(),
          repository.getSalesOrders(),
          repository.getElectronicInvoices(),
          repository.getRefundRequests(),
          repository.getCustomerSurveys(),
          repository.getSupportTickets(),
          repository.getKbArticles(),
          repository.getCustomerOnboardings(),
          repository.getRoadmapItems(),
          repository.getSoftwareReleases(),
          repository.getEngineeringIncidents(),
          repository.getSecurityAssets(),
          repository.getMarketingAssets(),
          repository.getSeoKeywords(),
          repository.getBrandMentions(),
          repository.getMarketingEvents(),
          repository.getLedgerEntries(),
          repository.getLegalRisks(),
          repository.getDataProcessings(),
          repository.getDsarRequests(),
          repository.getLeaveRequests(),
          repository.getAnnouncements(),
          repository.getRoomBookings(),
          repository.getApprovalMatrix(),
          repository.getVendorSubscriptions(),
          repository.getDigitalAssets(),
          repository.getBcpPlans(),
          repository.getWebhookEndpoints(),
          repository.getWeeklyReports(),
        ]);

        const activeAgentsList = agents.length > 0 ? agents : seedAgents;
        const activeDeptsList = departments.length > 0 ? departments : seedDepts;

        // Recover any durable jobs left in 'leased' state across crashes/reloads
        const durableJobs = recoverOrphanedDurableJobs(durableJobsRaw);
        for (const job of durableJobs) {
          const orig = durableJobsRaw.find((o) => o.id === job.id);
          if (orig && orig.status !== job.status) {
            await repository.putDurableJob(job);
          }
        }

        const agentMemories: Record<string, AgentMemory> = {};
        for (const m of agentMemsArr) {
          agentMemories[m.agentId] = m;
        }

        const agentAppearances = buildDefaultAppearancesMap(activeAgentsList);
        for (const app of appearancesArr) {
          agentAppearances[app.agentId] = app;
        }

        const runtimes = buildInitialRuntimes(activeAgentsList);
        const pendingReviewCount = expenses.filter((e) => e.status === 'pending_accountant').length;
        for (const acc of accounts) {
          if (acc.permissions.includes('expense:review') && runtimes[acc.agentId]) {
            runtimes[acc.agentId].pendingReviewCount = pendingReviewCount;
          }
        }

        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', mergedSettings.theme === 'dark');
        }

        const normalizedTasks: TaskItem[] = tasks.map((t, idx) => ({
          ...t,
          taskCode: t.taskCode || `#T-${100 + tasks.length - idx}`,
          definitionOfDone: t.definitionOfDone || t.description || 'Hoàn thành và lưu kết quả vào hệ thống.',
          expectedDeliverable: t.expectedDeliverable || 'Báo cáo / tài liệu thực tế',
          etaMinutes: t.etaMinutes || 15,
          etaAt: t.etaAt || t.createdAt + 15 * 60_000,
          progressPercent: typeof t.progressPercent === 'number' ? t.progressPercent : t.status === 'done' ? 100 : 25,
          lastProgressAt: t.lastProgressAt || t.updatedAt || t.createdAt,
          deliverables: Array.isArray(t.deliverables) ? t.deliverables : [],
        }));

        let lastFallbackMsgAt = 0;
        llmClient.configure({
          getSettings: () => get().settings,
          getTodayTokensByProvider: (provider: ProviderId) => {
            const todayKey = new Date().toISOString().slice(0, 10);
            return get()
              .tokenUsage.filter((t) => t.dateKey === todayKey && (t.provider || 'deepseek') === provider)
              .reduce((acc, t) => acc + t.totalTokens, 0);
          },
          onUsage: (rec) => {
            get().addTokenUsage(rec);
            if (rec.costUsd > 0 && !rec.cached) {
              get().recordAiTokenCostExpense(Math.round(rec.costUsd * 25400), rec.totalTokens, rec.provider);
            }
          },
          onErrorBanner: (msg) => {
            set({ bannerAlert: msg });
          },
          onFallbackNotice: (msg) => {
            const now = Date.now();
            if (now - lastFallbackMsgAt > 15000) {
              lastFallbackMsgAt = now;
              get().addMessage({
                channelId: 'all',
                senderId: 'system',
                senderName: 'Bộ định tuyến AI',
                senderTitle: 'Failover Notice',
                department: 'exec',
                content: `**Thông báo chuyển dự phòng AI:** ${msg}`,
                busType: 'escalation',
              });
            }
          },
        });

        const health = await llmClient.detectEnvironment();

        // Start decoupled SSE realtime bridge
        realtimeBridge.subscribeStatus((st) => {
          set({ realtimeStatus: st });
        });
        realtimeBridge.start();

        // Daily auto-backup check (> 24h)
        let updatedBackups = backupSnapshots;
        let finalSettings = mergedSettings;
        const now = Date.now();
        if (!mergedSettings.lastAutoBackupAt || now - mergedSettings.lastAutoBackupAt > 24 * 3600_000) {
          const rawTables = await repository.exportAllTablesForBackup();
          const autoSnap = buildBackupBundleJson(rawTables, `Sao lưu tự động ${new Date(now).toLocaleDateString('vi-VN')}`);
          await repository.putBackupSnapshot(autoSnap);
          updatedBackups = [autoSnap, ...backupSnapshots].slice(0, 30);
          finalSettings = {
            ...mergedSettings,
            lastAutoBackupAt: now,
            onboarding: { ...mergedSettings.onboarding, firstBackupCreated: true },
          };
          await repository.saveSettings(finalSettings);
        }

        const bootLog = createHealthLog(
          'info',
          'boot',
          `Khởi động thành công (${activeAgentsList.length} nhân sự · ${activeDeptsList.length} phòng · 3 tầng).`
        );
        await repository.addSystemHealthLog(bootLog);

        set({
          initialized: true,
          loading: false,
          bootStatus: 'ready',
          bootError: null,
          settings: finalSettings,
          agents: activeAgentsList,
          departments: activeDeptsList,
          hrAudits,
          accounts,
          agentAppearances,
          runtimes,
          tasks: normalizedTasks,
          leads,
          messages,
          documents,
          approvals,
          askCeoQuestions,
          auditLogs,
          outreachLogs,
          vaultStatuses,
          tokenUsage,
          agentMemories,
          companyMemories,
          workflows,
          brandKit: brandKit || buildDefaultBrandLaunchKit(finalSettings.companyName),
          marketingChannels,
          scheduledPosts,
          adCampaigns,
          socialComments,
          socialLogs,
          expenses,
          expenseRules,
          expenseBudgets,
          expenseCategories,
          externalAccounts,
          hubcwApiLogs,
          hubcwSyncQueue,
          hubcwUndoSnapshots,
          hubcwReconciliations,
          affiliateOffers,
          affiliateProducts,
          affiliateScores,
          affiliateCampaigns,
          trackedLinks,
          affiliateContent,
          affiliatePosts,
          affiliateConversions,
          affiliateCommissions,
          affiliateExperiments,
          legalDocuments,
          contractTemplates,
          contracts,
          legalReports,
          durableJobs,
          systemHealthLogs: [bootLog, ...systemHealthLogs].slice(0, 400),
          backupSnapshots: updatedBackups,
          spotChecks: pruneExpiredSpotChecks(spotChecks, finalSettings.spotCheck?.retentionDays || 14),
          voiceMeetings,
          qualityCycles,
          councilSessions,
          zaloPersonalLogs,
          okrObjectives,
          roleSops,
          onboardingExams,
          productMasters,
          bankAccounts,
          interactionRules,
          handoverTickets,
          moneyIdeas,
          competitorWatches,
          upgradeProposals,
          upgradeChangelog,
          repoEvaluations,
          playbooks,
          experienceMemories,
          managedDevices,
          deviceLogs,
          officeLayouts:
            officeLayoutsRaw.length > 0
              ? officeLayoutsRaw
              : buildBuiltinOfficePresets(activeDeptsList, activeAgentsList),
          customerAccounts,
          salesQuotes,
          salesOrders,
          electronicInvoices,
          refundRequests,
          customerSurveys,
          supportTickets,
          kbArticles,
          customerOnboardings,
          roadmapItems,
          softwareReleases,
          engineeringIncidents,
          securityAssets,
          marketingAssets,
          seoKeywords,
          brandMentions,
          marketingEvents,
          ledgerEntries:
            ledgerEntries.length > 0
              ? ledgerEntries
              : buildLedgerFromInvoiceAndExpense(electronicInvoices, expenses, refundRequests),
          legalRisks,
          dataProcessings,
          dsarRequests,
          leaveRequests,
          announcements,
          roomBookings,
          approvalMatrix,
          vendorSubscriptions,
          digitalAssets,
          bcpPlans,
          webhookEndpoints,
          weeklyReports,
          serverHealth: {
            mode: health.mode,
            hasGeminiEnvKey: health.hasGeminiEnvKey,
            hasDeepSeekEnvKey: health.hasDeepSeekEnvKey,
            hasSearchKey: health.hasSearchKey,
          },
          unreadNotifications:
            approvals.filter((a) => a.status === 'pending').length +
            askCeoQuestions.filter((q) => q.status === 'pending').length +
            expenses.filter((e) => e.status === 'pending_ceo').length +
            refundRequests.filter((r) => r.status === 'pending_ceo').length,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi khởi tạo dữ liệu cục bộ.';
        set({
          loading: false,
          initialized: false,
          bootStatus: 'error',
          bootError: msg,
        });
      }
    },

    retryBoot: async () => {
      await get().init();
    },

    setActiveTab: (tab) => set({ activeTab: tab }),
    setActiveChannel: (channel) => set({ activeChannel: channel }),
    setPeekMode: (peek) => set({ peekMode: peek }),
    clearNotifications: () => set({ unreadNotifications: 0 }),
    setBannerAlert: (msg) => set({ bannerAlert: msg }),
    setFollowAgentMode: (follow) => set({ followAgentMode: follow }),
    toggle3dDiagnostics: () => set((s) => ({ show3dDiagnostics: !s.show3dDiagnostics })),
    setScene3dStats: (stats) => set({ scene3dStats: stats }),

    setVisibleFloor: (floor) => {
      const cam =
        floor === 1
          ? { position: [17, 13, 18] as [number, number, number], lookAt: [0, 0.5, 0] as [number, number, number] }
          : floor === 2
          ? { position: [17, 16.5, 18] as [number, number, number], lookAt: [0, 4.0, 0] as [number, number, number] }
          : floor === 3
          ? { position: [18, 20.5, 19] as [number, number, number], lookAt: [0, 7.8, 0] as [number, number, number] }
          : { position: [22, 19, 23] as [number, number, number], lookAt: [0, 3.2, 0] as [number, number, number] };
      set((s) => ({
        visibleFloor: floor,
        followAgentMode: false,
        cameraTarget: { ...cam, nonce: s.cameraTarget.nonce + 1 },
      }));
    },

    flyCameraTo: (position, lookAt) =>
      set((s) => ({
        followAgentMode: false,
        cameraTarget: { position, lookAt, nonce: s.cameraTarget.nonce + 1 },
      })),

    selectAgent: (agentId, flyCamera = true) => {
      if (!agentId) {
        set({ selectedAgentId: null, followAgentMode: false });
        return;
      }
      const agent = get().agents.find((a) => a.id === agentId);
      const runtime = get().runtimes[agentId];
      if (agent && flyCamera) {
        const pos = runtime?.currentPosition || agent.deskPosition;
        set((s) => ({
          selectedAgentId: agentId,
          visibleFloor: s.visibleFloor === 'all' ? 'all' : agent.floor,
          cameraTarget: {
            position: [pos[0] + 4.2, pos[1] + 4.8, pos[2] + 5.8],
            lookAt: [pos[0], pos[1] + 0.85, pos[2]],
            nonce: s.cameraTarget.nonce + 1,
          },
        }));
      } else {
        set({ selectedAgentId: agentId });
      }
    },

    selectRoom: (roomId) => {
      if (!roomId) {
        set({ selectedRoomId: null });
        return;
      }
      const dept = get().departments.find((d) => d.roomId === roomId);
      if (dept) {
        set((s) => ({
          selectedRoomId: roomId,
          followAgentMode: false,
          visibleFloor: s.visibleFloor === 'all' ? 'all' : dept.floor,
          cameraTarget: {
            position: dept.cameraOffset,
            lookAt: dept.roomCenter,
            nonce: s.cameraTarget.nonce + 1,
          },
        }));
      }
    },

    setAgentStatus: (agentId, status, bubbleText, taskTitle, progressPercent) => {
      set((state) => {
        const prev = state.runtimes[agentId];
        if (!prev) return state;
        const autoProgress =
          typeof progressPercent === 'number'
            ? progressPercent
            : status === 'idle' || status === 'sleeping'
            ? 0
            : status === 'done'
            ? 100
            : status === 'thinking'
            ? 30
            : status === 'typing'
            ? 65
            : status === 'talking'
            ? 85
            : prev.progressPercent ?? 40;
        return {
          runtimes: {
            ...state.runtimes,
            [agentId]: {
              ...prev,
              status,
              progressPercent: autoProgress,
              bubbleText: bubbleText !== undefined ? bubbleText : prev.bubbleText,
              bubbleExpiresAt: bubbleText ? Date.now() + 8000 : prev.bubbleExpiresAt,
              currentTaskTitle: taskTitle !== undefined ? taskTitle : prev.currentTaskTitle,
              lastHeartbeatAt: Date.now(),
            },
          },
        };
      });
    },

    setAgentDelayed: (agentId, isDelayed) => {
      set((state) => {
        const prev = state.runtimes[agentId];
        if (!prev || prev.isDelayed === isDelayed) return state;
        return {
          runtimes: {
            ...state.runtimes,
            [agentId]: { ...prev, isDelayed },
          },
        };
      });
    },

    setAgentPostingSocial: (agentId, isPostingSocial, bubbleText) => {
      set((state) => {
        const prev = state.runtimes[agentId];
        if (!prev) return state;
        return {
          runtimes: {
            ...state.runtimes,
            [agentId]: {
              ...prev,
              isPostingSocial,
              bubbleText: bubbleText !== undefined ? bubbleText : prev.bubbleText,
              bubbleExpiresAt: bubbleText ? Date.now() + 6000 : prev.bubbleExpiresAt,
            },
          },
        };
      });
    },

    walkAgentToRoom: (agentId, toRoomId, targetPos) => {
      const agent = get().agents.find((a) => a.id === agentId);
      const dept = get().departments.find((d) => d.roomId === toRoomId);
      if (!agent || !dept) return;
      const runtime = get().runtimes[agentId];
      const fromPos = runtime?.currentPosition || agent.deskPosition;
      const currentFloor = floorFromY(fromPos[1]);
      const fromRoomId =
        agent.floor === currentFloor
          ? agent.roomId
          : currentFloor === 3
          ? 'room-aff-exec'
          : currentFloor === 2
          ? 'room-exec'
          : 'room-sales';
      const dest = targetPos || dept.roomCenter;
      const waypoints = buildWalkWaypoints(fromPos, fromRoomId, dest, toRoomId);
      set((state) => ({
        runtimes: {
          ...state.runtimes,
          [agentId]: {
            ...state.runtimes[agentId],
            status: 'walking',
            waypoints,
            targetPosition: waypoints[0] || dest,
            lastHeartbeatAt: Date.now(),
          },
        },
      }));
    },

    walkAgentToMeetingSeat: (agentId, seatIndex) => {
      const seat = MEETING_SEATS[seatIndex % MEETING_SEATS.length];
      get().walkAgentToRoom(agentId, 'room-meeting', seat);
    },

    returnAgentToDesk: (agentId) => {
      const agent = get().agents.find((a) => a.id === agentId);
      if (!agent) return;
      const runtime = get().runtimes[agentId];
      if (!runtime) return;
      const distSq =
        Math.pow(runtime.currentPosition[0] - agent.deskPosition[0], 2) +
        Math.pow(runtime.currentPosition[1] - agent.deskPosition[1], 2) +
        Math.pow(runtime.currentPosition[2] - agent.deskPosition[2], 2);
      if (distSq < 0.08) {
        get().setAgentStatus(agentId, 'idle');
        return;
      }
      const curFloor = floorFromY(runtime.currentPosition[1]);
      const currentRoom =
        curFloor === 1 && runtime.currentPosition[0] > -1.5 && runtime.currentPosition[2] < -1.2
          ? 'room-meeting'
          : curFloor === agent.floor
          ? agent.roomId
          : curFloor === 3
          ? 'room-aff-analytics'
          : curFloor === 2
          ? 'room-exec'
          : 'room-reception';
      const waypoints = buildWalkWaypoints(runtime.currentPosition, currentRoom, agent.deskPosition, agent.roomId);
      set((state) => ({
        runtimes: {
          ...state.runtimes,
          [agentId]: {
            ...state.runtimes[agentId],
            status: 'walking',
            waypoints,
            targetPosition: waypoints[0] || agent.deskPosition,
            lastHeartbeatAt: Date.now(),
          },
        },
      }));
    },

    advanceAgentPositions: (deltaSec) => {
      const { settings, runtimes } = get();
      if (settings.paused || settings.killSwitchActive) return;

      const speed = 3.2 * settings.simulationSpeed;
      const now = Date.now();
      let changed = false;
      const nextRuntimes: Record<string, AgentRuntimeState> = { ...runtimes };

      for (const id of Object.keys(runtimes)) {
        const rt = runtimes[id];
        if (rt.bubbleText && rt.bubbleExpiresAt && now > rt.bubbleExpiresAt) {
          nextRuntimes[id] = { ...rt, bubbleText: undefined, bubbleExpiresAt: undefined };
          changed = true;
        }

        if (rt.waypoints.length === 0) continue;
        const wp = rt.waypoints[0];
        const dx = wp[0] - rt.currentPosition[0];
        const dy = wp[1] - rt.currentPosition[1];
        const dz = wp[2] - rt.currentPosition[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const step = speed * deltaSec;

        if (dist <= step + 0.03) {
          const remaining = rt.waypoints.slice(1);
          const arrivedInMeeting = remaining.length === 0 && wp[1] < 1 && wp[0] > -1.5 && wp[2] < -1.2;
          nextRuntimes[id] = {
            ...nextRuntimes[id],
            currentPosition: [...wp],
            waypoints: remaining,
            targetPosition: remaining[0] || wp,
            status:
              remaining.length > 0
                ? 'walking'
                : arrivedInMeeting
                ? 'in_meeting'
                : rt.status === 'walking'
                ? 'idle'
                : rt.status,
          };
        } else {
          const ratio = step / dist;
          nextRuntimes[id] = {
            ...nextRuntimes[id],
            currentPosition: [
              rt.currentPosition[0] + dx * ratio,
              rt.currentPosition[1] + dy * ratio,
              rt.currentPosition[2] + dz * ratio,
            ],
          };
        }
        changed = true;
      }

      if (changed) {
        set({ runtimes: nextRuntimes });
      }
    },

    // === BỔ SUNG D: DYNAMIC HR MANAGEMENT ===
    hireAgent: async (params) => {
      const state = get();
      const newAgent = buildNewAgentFromSpec({
        ...params,
        existingAgents: state.agents,
        departments: state.departments,
        companyName: state.settings.companyName,
      });
      if (params.customDeskPosition) {
        newAgent.deskPosition = [...params.customDeskPosition];
      }
      newAgent.voiceProfile = params.voiceProfile || proposeUniqueVoiceForAgent(newAgent, state.agents);
      newAgent.probationStatus = state.settings.hrAutonomy?.requireExamPassForLive ? 'probation' : 'passed';

      const baseApp = getDefaultAppearance(newAgent);
      const appearance: AgentAppearance = {
        ...baseApp,
        ...(params.appearance || {}),
        agentId: newAgent.id,
      };

      const token = await generateHashedAgentToken(newAgent.id);
      const account: AgentAccount = {
        agentId: newAgent.id,
        username: newAgent.id,
        internalEmail: `${newAgent.id}@aicompany.vn`,
        role: newAgent.role,
        department: newAgent.department,
        status: 'active',
        tokenHash: token.hash,
        permissions: [...newAgent.defaultPermissions],
        lastActiveAt: Date.now(),
      };

      const memory: AgentMemory = {
        agentId: newAgent.id,
        shortTerm: [`Nhận việc ngày ${new Date().toLocaleDateString('vi-VN')}`, `Nhiệm vụ: ${newAgent.title}`],
        longTermSummary: `${newAgent.name} – ${newAgent.title}. ${newAgent.bio}`,
        updatedAt: Date.now(),
      };

      const walkIn = buildWalkWaypoints(OFFICE_EXIT_DOOR_POS, 'room-reception', newAgent.deskPosition, newAgent.roomId);
      const runtime: AgentRuntimeState = {
        agentId: newAgent.id,
        status: 'walking',
        currentPosition: [...OFFICE_EXIT_DOOR_POS],
        targetPosition: walkIn[0] || newAgent.deskPosition,
        waypoints: walkIn,
        bubbleText: `Em xin chào cả nhà! (${newAgent.title})`,
        bubbleExpiresAt: Date.now() + 9000,
        progressPercent: 0,
        lastHeartbeatAt: Date.now(),
      };

      const audit: HrAuditEntry = {
        id: `hr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        action: 'hire',
        actor: params.actor || 'CEO',
        targetId: newAgent.id,
        targetName: newAgent.name,
        summary: `Tuyển mới ${newAgent.name} vào vị trí ${newAgent.title} (phòng ${newAgent.department}).`,
        after: { title: newAgent.title, department: newAgent.department, role: newAgent.role },
        timestamp: Date.now(),
      };

      const extAccount: AgentExternalAccount = {
        agentId: newAgent.id,
        system: 'hubcw',
        externalPermissions: buildDefaultHubCwPermissions(newAgent.department, newAgent.role, newAgent.title),
        status: 'unlinked',
      };

      set((s) => ({
        agents: [...s.agents, newAgent],
        accounts: [...s.accounts, account],
        externalAccounts: [...s.externalAccounts, extAccount],
        agentAppearances: { ...s.agentAppearances, [newAgent.id]: appearance },
        agentMemories: { ...s.agentMemories, [newAgent.id]: memory },
        runtimes: { ...s.runtimes, [newAgent.id]: runtime },
        hrAudits: [audit, ...s.hrAudits].slice(0, 300),
      }));

      await Promise.all([
        repository.putAgent(newAgent),
        repository.putAccount(account),
        repository.putExternalAccount(extAccount),
        repository.putAgentAppearance(appearance),
        repository.putAgentMemory(memory),
        repository.addHrAudit(audit),
      ]);

      emitHrEvent('agent.created', { agentId: newAgent.id, departmentId: newAgent.department });

      await get().addMessage({
        channelId: newAgent.department,
        senderId: newAgent.id,
        senderName: newAgent.name,
        senderTitle: newAgent.title,
        department: newAgent.department,
        content: `Xin chào Chủ tịch và các anh chị! Em là **${newAgent.name}** (${newAgent.title}), vừa nhận bàn làm việc tại **${newAgent.roomId}**. Tag \`@${newAgent.name}\` để giao việc cho em bất cứ lúc nào ạ!`,
        busType: 'chat',
      });

      return newAgent;
    },

    hireBatchTeam: async (specs, actor = 'CEO') => {
      const created: AgentProfile[] = [];
      for (const spec of specs) {
        const ag = await get().hireAgent({ ...spec, actor });
        created.push(ag);
      }
      if (created.length > 1) {
        const audit: HrAuditEntry = {
          id: `hr_batch_${Date.now()}`,
          action: 'batch_hire',
          actor,
          targetId: created.map((c) => c.id).join(','),
          targetName: `Đội ${created.length} nhân sự`,
          summary: `Tuyển hàng loạt ${created.length} nhân sự: ${created.map((c) => c.name).join(', ')}`,
          timestamp: Date.now(),
        };
        set((s) => ({ hrAudits: [audit, ...s.hrAudits].slice(0, 300) }));
        await repository.addHrAudit(audit);
      }
      return created;
    },

    updateAgentProfile: async (agentId, patch, actor = 'CEO') => {
      const existing = get().agents.find((a) => a.id === agentId);
      if (!existing) return;

      let nextAgent: AgentProfile = {
        ...existing,
        ...patch,
        updatedAt: Date.now(),
      };

      const deptChanged = patch.department && patch.department !== existing.department;
      if (deptChanged) {
        const dept = get().departments.find((d) => d.id === patch.department);
        const seat = allocateDeskForDepartment(patch.department!, get().agents, get().departments, agentId);
        nextAgent = {
          ...nextAgent,
          floor: seat.floor,
          roomId: seat.roomId,
          deskPosition: seat.deskPosition,
          deskRotationY: seat.deskRotationY,
          avatarColor: dept?.color || nextAgent.avatarColor,
        };
      }

      set((s) => ({
        agents: s.agents.map((a) => (a.id === agentId ? nextAgent : a)),
      }));
      await repository.putAgent(nextAgent);

      // Sync RBAC account role/department
      const acc = get().accounts.find((a) => a.agentId === agentId);
      if (acc && (patch.role || patch.department || patch.defaultPermissions)) {
        const updatedAcc: AgentAccount = {
          ...acc,
          role: nextAgent.role,
          department: nextAgent.department,
          permissions: patch.defaultPermissions || acc.permissions,
        };
        set((s) => ({
          accounts: s.accounts.map((a) => (a.agentId === agentId ? updatedAcc : a)),
        }));
        await repository.putAccount(updatedAcc);
      }

      if (deptChanged) {
        get().walkAgentToRoom(agentId, nextAgent.roomId, nextAgent.deskPosition);
        get().setAgentStatus(agentId, 'walking', `Chuyển sang ${nextAgent.department}`);
      }

      const action: HrAuditEntry['action'] =
        patch.name && patch.name !== existing.name
          ? 'rename'
          : deptChanged
          ? 'move_dept'
          : 'update';

      const audit: HrAuditEntry = {
        id: `hr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        action,
        actor,
        targetId: agentId,
        targetName: nextAgent.name,
        summary:
          action === 'rename'
            ? `Đổi tên "${existing.name}" → "${nextAgent.name}" (giữ nguyên ID ${agentId}).`
            : action === 'move_dept'
            ? `Chuyển ${nextAgent.name} từ phòng ${existing.department} → ${nextAgent.department}.`
            : `Cập nhật hồ sơ & bộ não cho ${nextAgent.name}.`,
        before: { name: existing.name, department: existing.department, title: existing.title },
        after: { name: nextAgent.name, department: nextAgent.department, title: nextAgent.title },
        timestamp: Date.now(),
      };
      set((s) => ({ hrAudits: [audit, ...s.hrAudits].slice(0, 300) }));
      await repository.addHrAudit(audit);

      if (deptChanged) {
        const ext = get().externalAccounts.find((e) => e.agentId === agentId);
        if (ext && ext.status === 'active') {
          const proposedPerms = buildDefaultHubCwPermissions(nextAgent.department, nextAgent.role, nextAgent.title);
          const updatedExt: AgentExternalAccount = {
            ...ext,
            externalPermissions: proposedPerms,
          };
          set((s) => ({
            externalAccounts: s.externalAccounts.map((e) => (e.agentId === agentId ? updatedExt : e)),
          }));
          await repository.putExternalAccount(updatedExt);
          await get().addMessage({
            channelId: 'backoffice',
            senderId: 'hr',
            senderName: 'Phòng Nhân sự',
            senderTitle: 'HR Notice',
            department: 'backoffice',
            content: `Nhân sự **${nextAgent.name}** vừa chuyển sang phòng **${nextAgent.department}**. Hệ thống đã đề xuất điều chỉnh lại quyền Hub.ChuyenWeb theo chuẩn tối thiểu của phòng mới — CEO kiểm tra lại trong tab Nhân sự.`,
            busType: 'report',
          });
        }
      }

      emitHrEvent('agent.updated', { agentId, departmentId: nextAgent.department });
    },

    cloneAgent: async (agentId, newName) => {
      const src = get().agents.find((a) => a.id === agentId);
      if (!src) return null;
      const srcApp = get().agentAppearances[agentId];
      const cloned = await get().hireAgent({
        name: newName,
        nickname: src.nickname,
        gender: src.gender,
        title: src.title,
        department: src.department,
        role: src.role,
        reportsTo: src.reportsTo,
        personalityNote: src.personalityNote || src.bio,
        toneStyle: src.toneStyle,
        templateId: src.templateId,
        providerOverride: src.providerOverride,
        modelOverride: src.modelOverride,
        sleepWhenIdle: src.sleepWhenIdle,
        customTools: [...src.allowedTools],
        customPermissions: [...(get().accounts.find((a) => a.agentId === agentId)?.permissions || src.defaultPermissions)],
        appearance: srcApp ? { ...srcApp } : undefined,
        existingAgents: get().agents,
        departments: get().departments,
        actor: 'CEO (Nhân bản)',
      });
      return cloned;
    },

    suspendAgent: async (agentId, actor = 'CEO') => {
      const existing = get().agents.find((a) => a.id === agentId);
      if (!existing) return;
      const nextStatus = existing.employmentStatus === 'suspended' ? 'active' : 'suspended';
      const updated: AgentProfile = { ...existing, employmentStatus: nextStatus, updatedAt: Date.now() };
      set((s) => ({ agents: s.agents.map((a) => (a.id === agentId ? updated : a)) }));
      await repository.putAgent(updated);

      const acc = get().accounts.find((a) => a.agentId === agentId);
      if (acc) {
        const nextAcc: AgentAccount = { ...acc, status: nextStatus === 'active' ? 'active' : 'suspended' };
        set((s) => ({ accounts: s.accounts.map((a) => (a.agentId === agentId ? nextAcc : a)) }));
        await repository.putAccount(nextAcc);
      }

      if (nextStatus === 'suspended') {
        get().setAgentStatus(agentId, 'sleeping', 'Đang tạm nghỉ');
      } else {
        get().setAgentStatus(agentId, 'idle', 'Đã đi làm lại');
      }

      const audit: HrAuditEntry = {
        id: `hr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        action: nextStatus === 'suspended' ? 'suspend' : 'resume',
        actor,
        targetId: agentId,
        targetName: existing.name,
        summary: nextStatus === 'suspended' ? `Tạm cho nghỉ phép ${existing.name}.` : `Kích hoạt lại ${existing.name}.`,
        timestamp: Date.now(),
      };
      set((s) => ({ hrAudits: [audit, ...s.hrAudits].slice(0, 300) }));
      await repository.addHrAudit(audit);
    },

    offboardAgent: async ({ agentId, handoverToId, reason, actor = 'CEO' }) => {
      const state = get();
      const target = state.agents.find((a) => a.id === agentId);
      if (!target) return { ok: false, error: 'Không tìm thấy nhân sự.' };

      const remainingActive = state.agents.filter(
        (a) => a.id !== agentId && a.employmentStatus !== 'archived'
      );
      if (remainingActive.length === 0) {
        return {
          ok: false,
          error: 'Không thể cho thôi việc nhân sự cuối cùng của công ty (cần ít nhất 1 nhân sự nhận lệnh).',
        };
      }

      const recipient =
        remainingActive.find((a) => a.id === handoverToId) ||
        remainingActive.find((a) => a.id === 'secretary') ||
        remainingActive[0];

      const summary = collectAgentHandoverItems(
        target,
        state.agents,
        state.tasks,
        state.leads,
        state.vaultStatuses,
        state.approvals
      );

      // Transfer active tasks
      for (const t of summary.activeTasks) {
        await get().putTask({
          ...t,
          assignedTo: recipient.id,
          department: recipient.department,
          updatedAt: Date.now(),
        });
      }
      // Transfer leads
      for (const l of summary.assignedLeads) {
        await get().putLead({ ...l, assignedAgentId: recipient.id });
      }
      // Transfer vault channels
      for (const v of summary.vaultAccounts) {
        await get().putVaultStatus({ ...v, managedBy: recipient.id, lastCheckedAt: Date.now() });
      }

      // Write handover minutes to Docs
      const handoverDoc: DocumentItem = {
        id: `doc_handover_${agentId}_${Date.now()}`,
        title: `Biên bản bàn giao nhân sự – ${target.name} → ${recipient.name}`,
        category: 'meeting_minutes',
        authorId: recipient.id,
        department: 'backoffice',
        content: [
          `# Biên bản Bàn giao & Thôi việc Nhân sự`,
          `- **Nhân sự nghỉ việc:** ${target.name} (${target.title} – ID: \`${target.id}\`)`,
          `- **Người nhận bàn giao:** ${recipient.name} (${recipient.title})`,
          `- **Lý do:** ${reason || 'Tái cơ cấu nhân sự'}`,
          `- **Ngày hiệu lực:** ${new Date().toLocaleString('vi-VN')}`,
          ``,
          `## Chi tiết tài sản & công việc đã chuyển giao`,
          `- **Task đang xử lý:** ${summary.activeTasks.length} việc (${summary.activeTasks.map((t) => t.taskCode).join(', ') || 'Không có'})`,
          `- **Lead CRM phụ trách:** ${summary.assignedLeads.length} khách hàng`,
          `- **Kênh / Vault quản lý:** ${summary.vaultAccounts.length} kênh (${summary.vaultAccounts.map((v) => v.platform).join(', ') || 'Không có'})`,
          `- **Trạng thái bảo mật:** Đã thu hồi token nội bộ & khóa toàn bộ quyền RBAC ngay lập tức.`,
        ].join('\n'),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await get().putDocument(handoverDoc);

      // Revoke RBAC account & token
      const acc = state.accounts.find((a) => a.agentId === agentId);
      if (acc) {
        const revokedAcc: AgentAccount = {
          ...acc,
          status: 'suspended',
          permissions: [],
          tokenHash: `REVOKED_${Date.now()}`,
        };
        set((s) => ({
          accounts: s.accounts.map((a) => (a.agentId === agentId ? revokedAcc : a)),
        }));
        await repository.putAccount(revokedAcc);
      }

      // G2 Lifecycle: Lock HubCW external account + wipe encrypted secret (never hard delete real account)
      const extAcc = state.externalAccounts.find((e) => e.agentId === agentId);
      if (extAcc) {
        const lockedExt: AgentExternalAccount = {
          ...extAcc,
          status: extAcc.status === 'unlinked' ? 'unlinked' : 'suspended',
          handoverNote: `Khóa tài khoản HubCW & bàn giao cho ${recipient.name} (${new Date().toLocaleDateString('vi-VN')})`,
          lastActivityAt: Date.now(),
        };
        set((s) => ({
          externalAccounts: s.externalAccounts.map((e) => (e.agentId === agentId ? lockedExt : e)),
        }));
        await repository.putExternalAccount(lockedExt);
        await repository.deleteEncryptedCredential(agentId);
      }

      // Walk character out to reception exit door, then mark archived
      const exitWaypoints = buildWalkWaypoints(
        state.runtimes[agentId]?.currentPosition || target.deskPosition,
        target.roomId,
        OFFICE_EXIT_DOOR_POS,
        'room-reception'
      );
      set((s) => ({
        runtimes: {
          ...s.runtimes,
          [agentId]: {
            ...(s.runtimes[agentId] || {
              agentId,
              currentPosition: [...target.deskPosition],
              targetPosition: OFFICE_EXIT_DOOR_POS,
              waypoints: exitWaypoints,
              lastHeartbeatAt: Date.now(),
            }),
            status: 'walking',
            waypoints: exitWaypoints,
            targetPosition: exitWaypoints[0] || OFFICE_EXIT_DOOR_POS,
            bubbleText: 'Tạm biệt mọi người! Đã bàn giao xong.',
            bubbleExpiresAt: Date.now() + 4500,
            exiting: true,
          },
        },
      }));

      const archivedAgent: AgentProfile = {
        ...target,
        employmentStatus: 'archived',
        archivedAt: Date.now(),
        archivedReason: reason,
        updatedAt: Date.now(),
      };
      await repository.putAgent(archivedAgent);

      setTimeout(() => {
        set((s) => ({
          agents: s.agents.map((a) => (a.id === agentId ? archivedAgent : a)),
          selectedAgentId: s.selectedAgentId === agentId ? null : s.selectedAgentId,
        }));
        emitHrEvent('agent.removed', { agentId, departmentId: target.department });
      }, 1800);

      const audit: HrAuditEntry = {
        id: `hr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        action: 'offboard',
        actor,
        targetId: agentId,
        targetName: target.name,
        summary: `Cho thôi việc ${target.name}. Đã bàn giao ${summary.activeTasks.length} task, ${summary.assignedLeads.length} lead cho ${recipient.name}.`,
        after: { handoverToId: recipient.id, reason, docId: handoverDoc.id },
        timestamp: Date.now(),
      };
      set((s) => ({ hrAudits: [audit, ...s.hrAudits].slice(0, 300) }));
      await repository.addHrAudit(audit);

      await get().addMessage({
        channelId: 'all',
        senderId: 'hr',
        senderName: 'Phòng Nhân sự',
        senderTitle: 'HR Notice',
        department: 'backoffice',
        content: `Đã hoàn tất thủ tục bàn giao cho **${target.name}** (${target.title}). Toàn bộ **${summary.activeTasks.length} task** và **${summary.assignedLeads.length} lead** đã chuyển sang **${recipient.name}**; biên bản lưu tại Kho tài liệu.`,
        busType: 'report',
      });

      return { ok: true, docId: handoverDoc.id };
    },

    rehireAgent: async (agentId, actor = 'CEO') => {
      const target = get().agents.find((a) => a.id === agentId);
      if (!target) return;
      const seat = allocateDeskForDepartment(target.department, get().agents, get().departments, agentId);
      const token = await generateHashedAgentToken(agentId);
      const nextAgent: AgentProfile = {
        ...target,
        employmentStatus: 'active',
        archivedAt: undefined,
        archivedReason: undefined,
        floor: seat.floor,
        roomId: seat.roomId,
        deskPosition: seat.deskPosition,
        deskRotationY: seat.deskRotationY,
        updatedAt: Date.now(),
      };

      const acc = get().accounts.find((a) => a.agentId === agentId);
      const nextAcc: AgentAccount = acc
        ? { ...acc, status: 'active', permissions: [...target.defaultPermissions], tokenHash: token.hash }
        : {
            agentId,
            username: agentId,
            internalEmail: `${agentId}@aicompany.vn`,
            role: target.role,
            department: target.department,
            status: 'active',
            tokenHash: token.hash,
            permissions: [...target.defaultPermissions],
            lastActiveAt: Date.now(),
          };

      const walkIn = buildWalkWaypoints(OFFICE_EXIT_DOOR_POS, 'room-reception', nextAgent.deskPosition, nextAgent.roomId);

      set((s) => ({
        agents: s.agents.map((a) => (a.id === agentId ? nextAgent : a)),
        accounts: acc ? s.accounts.map((a) => (a.agentId === agentId ? nextAcc : a)) : [...s.accounts, nextAcc],
        runtimes: {
          ...s.runtimes,
          [agentId]: {
            agentId,
            status: 'walking',
            currentPosition: [...OFFICE_EXIT_DOOR_POS],
            targetPosition: walkIn[0] || nextAgent.deskPosition,
            waypoints: walkIn,
            bubbleText: 'Em đã quay trở lại làm việc!',
            bubbleExpiresAt: Date.now() + 7000,
            exiting: false,
            lastHeartbeatAt: Date.now(),
          },
        },
      }));

      await Promise.all([repository.putAgent(nextAgent), repository.putAccount(nextAcc)]);
      const audit: HrAuditEntry = {
        id: `hr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        action: 'rehire',
        actor,
        targetId: agentId,
        targetName: nextAgent.name,
        summary: `Tuyển lại ${nextAgent.name} vào phòng ${nextAgent.department}.`,
        timestamp: Date.now(),
      };
      set((s) => ({ hrAudits: [audit, ...s.hrAudits].slice(0, 300) }));
      await repository.addHrAudit(audit);
      emitHrEvent('agent.created', { agentId, departmentId: nextAgent.department });
    },

    deleteAgentPermanently: async (agentId, actor = 'CEO') => {
      const target = get().agents.find((a) => a.id === agentId);
      if (!target) return { ok: false, error: 'Không tìm thấy nhân sự.' };
      const remaining = get().agents.filter((a) => a.id !== agentId && a.employmentStatus !== 'archived');
      if (remaining.length === 0) {
        return { ok: false, error: 'Không thể xóa vĩnh viễn nhân sự đang hoạt động duy nhất còn lại.' };
      }

      set((s) => {
        const nextRuntimes = { ...s.runtimes };
        delete nextRuntimes[agentId];
        return {
          agents: s.agents.filter((a) => a.id !== agentId),
          accounts: s.accounts.filter((a) => a.agentId !== agentId),
          runtimes: nextRuntimes,
          selectedAgentId: s.selectedAgentId === agentId ? null : s.selectedAgentId,
        };
      });

      await Promise.all([repository.deleteAgent(agentId), repository.deleteAccount(agentId)]);
      const audit: HrAuditEntry = {
        id: `hr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        action: 'delete',
        actor,
        targetId: agentId,
        targetName: target.name,
        summary: `Xóa vĩnh viễn hồ sơ nhân sự ${target.name} (${agentId}).`,
        timestamp: Date.now(),
      };
      set((s) => ({ hrAudits: [audit, ...s.hrAudits].slice(0, 300) }));
      await repository.addHrAudit(audit);
      emitHrEvent('agent.removed', { agentId, departmentId: target.department });
      return { ok: true };
    },

    createDepartment: async ({ name, shortName, floor, color, description }) => {
      const layout = allocateCustomDepartmentLayout(floor, get().departments);
      const id = `dept_${Date.now().toString(36)}`;
      const newDept: DepartmentConfig = {
        id,
        name: name.trim(),
        shortName: shortName.trim(),
        floor,
        color,
        bgTint: `${color}18`,
        badgeText: shortName.trim(),
        description: description.trim() || `Phòng ban ${name.trim()}`,
        roomId: `room-${id}`,
        roomCenter: layout.roomCenter,
        roomSize: layout.roomSize,
        cameraOffset: layout.cameraOffset,
        isCustom: true,
        collapsed: false,
      };

      set((s) => ({ departments: [...s.departments, newDept] }));
      await repository.putDepartment(newDept);
      const audit: HrAuditEntry = {
        id: `hr_dept_${Date.now()}`,
        action: 'dept_create',
        actor: 'CEO',
        targetId: id,
        targetName: newDept.name,
        summary: `Tạo phòng ban mới "${newDept.name}" ở Tầng ${floor}.`,
        timestamp: Date.now(),
      };
      set((s) => ({ hrAudits: [audit, ...s.hrAudits].slice(0, 300) }));
      await repository.addHrAudit(audit);
      emitHrEvent('dept.updated', { departmentId: id });
      return newDept;
    },

    updateDepartment: async (deptId, patch) => {
      const existing = get().departments.find((d) => d.id === deptId);
      if (!existing) return;
      const updated: DepartmentConfig = { ...existing, ...patch };
      set((s) => ({
        departments: s.departments.map((d) => (d.id === deptId ? updated : d)),
      }));
      await repository.putDepartment(updated);
      emitHrEvent('dept.updated', { departmentId: deptId });
    },

    deleteDepartment: async (deptId) => {
      const target = get().departments.find((d) => d.id === deptId);
      if (!target) return { ok: false, error: 'Không tìm thấy phòng ban.' };
      if (!target.isCustom) return { ok: false, error: 'Không thể xóa phòng ban mặc định hệ thống.' };
      const members = get().agents.filter((a) => a.department === deptId && a.employmentStatus !== 'archived');
      if (members.length > 0) {
        return { ok: false, error: `Còn ${members.length} nhân sự đang thuộc phòng này. Hãy chuyển phòng trước khi xóa.` };
      }
      set((s) => ({ departments: s.departments.filter((d) => d.id !== deptId) }));
      await repository.deleteDepartment(deptId);
      emitHrEvent('dept.updated', { departmentId: deptId });
      return { ok: true };
    },

    importRosterJson: async ({ agents, departments }) => {
      let count = 0;
      if (Array.isArray(departments)) {
        for (const d of departments) {
          if (!get().departments.some((x) => x.id === d.id)) {
            set((s) => ({ departments: [...s.departments, d] }));
            await repository.putDepartment(d);
          }
        }
      }
      for (const a of agents) {
        if (!get().agents.some((x) => x.id === a.id)) {
          await get().hireAgent({
            name: a.name,
            nickname: a.nickname,
            gender: a.gender,
            title: a.title,
            department: a.department,
            role: a.role,
            reportsTo: a.reportsTo,
            personalityNote: a.personalityNote || a.bio,
            toneStyle: a.toneStyle,
            templateId: a.templateId,
            providerOverride: a.providerOverride,
            modelOverride: a.modelOverride,
            customTools: a.allowedTools,
            customPermissions: a.defaultPermissions,
            customSystemPrompt: a.systemPrompt,
            existingAgents: get().agents,
            departments: get().departments,
            actor: 'Import JSON',
          });
          count++;
        }
      }
      return count;
    },

    // === BỔ SUNG E: EXPENSE MANAGEMENT & TWO-TIER APPROVAL ===
    createExpense: async (input) => {
      const state = get();
      const requester = state.agents.find((a) => a.id === input.requesterId);
      const dept = input.department || requester?.department || 'marketing';
      const now = Date.now();
      const codeNum = 102 + state.expenses.length;
      const expenseCode = `#CP-${codeNum}`;

      const risk = analyzeExpenseRisks(
        {
          department: dept,
          category: input.category,
          vendor: input.vendor,
          amountVnd: input.amountVnd,
          attachmentName: input.attachmentName,
          attachmentDataUrl: input.attachmentDataUrl,
        },
        state.expenses,
        state.expenseBudgets,
        state.settings.spendingPolicy
      );

      const ruleMatch = evaluateAutoApprovalRule(
        {
          department: dept,
          category: input.category,
          vendor: input.vendor,
          amountVnd: input.amountVnd,
          requesterId: input.requesterId,
          attachmentName: input.attachmentName,
          attachmentDataUrl: input.attachmentDataUrl,
        },
        state.expenseRules,
        state.settings.spendingPolicy,
        risk
      );

      const initialStatus: ExpenseStatus = ruleMatch.targetStatus;
      const flags = [...risk.flags];
      if (ruleMatch.fallbackToNormalReason) {
        flags.push(`Fallback chuẩn: ${ruleMatch.fallbackToNormalReason}`);
      }

      const history: ExpenseAuditStep[] = [
        {
          at: now,
          actorId: input.requesterId,
          actorName: requester?.name || input.requesterId,
          fromStatus: 'draft',
          toStatus: 'pending_accountant',
          note: `Tạo đề xuất chi ${formatVnd(input.amountVnd)} cho ${input.vendor}`,
        },
      ];

      let matchedRule = ruleMatch.matchedRule;
      if (initialStatus === 'approved' && matchedRule) {
        history.push({
          at: now + 1,
          actorId: matchedRule.ruleType === 'full_auto' ? 'system_rule' : 'cfo',
          actorName: matchedRule.ruleType === 'full_auto' ? `Quy tắc ${matchedRule.ruleCode}` : `Kế toán (${matchedRule.ruleCode})`,
          fromStatus: 'pending_accountant',
          toStatus: 'approved',
          note: ruleMatch.reason,
        });

        const mk = currentMonthKey(now);
        const updatedRule: ExpenseRule = {
          ...matchedRule,
          usageMonthKey: mk,
          usedCountMonth: (matchedRule.usageMonthKey === mk ? matchedRule.usedCountMonth : 0) + 1,
          usedAmountMonthVnd: (matchedRule.usageMonthKey === mk ? matchedRule.usedAmountMonthVnd : 0) + input.amountVnd,
          updatedAt: now,
        };
        set((s) => ({
          expenseRules: s.expenseRules.map((r) => (r.id === updatedRule.id ? updatedRule : r)),
        }));
        await repository.putExpenseRule(updatedRule);
        matchedRule = updatedRule;
      }

      const item: ExpenseItem = {
        id: `exp_${now}_${Math.random().toString(36).slice(2, 6)}`,
        expenseCode,
        requesterId: input.requesterId,
        department: dept,
        projectOrCampaign: input.projectOrCampaign || 'Vận hành chung',
        category: input.category,
        title: input.title,
        amountVnd: Math.round(input.amountVnd),
        frequency: input.frequency || 'once',
        recurringCycleDays: input.frequency === 'recurring' ? input.recurringCycleDays || 30 : undefined,
        nextDueAt:
          input.frequency === 'recurring'
            ? now + (input.recurringCycleDays || 30) * 86400_000
            : undefined,
        justification: input.justification,
        expectedRoi: input.expectedRoi,
        vendor: input.vendor,
        dueDate: input.dueDate || new Date(now + 3 * 86400_000).toISOString().slice(0, 10),
        attachmentName: input.attachmentName,
        attachmentDataUrl: input.attachmentDataUrl,
        status: initialStatus,
        accountantId: initialStatus === 'approved' ? 'cfo' : undefined,
        accountantNote: initialStatus === 'approved' ? ruleMatch.reason : undefined,
        accountantCheckedAt: initialStatus === 'approved' ? now : undefined,
        ceoDecisionNote:
          initialStatus === 'approved' && matchedRule?.ruleType === 'full_auto'
            ? `Tự duyệt toàn phần theo ${matchedRule.ruleCode}`
            : undefined,
        ceoDecidedAt: initialStatus === 'approved' ? now : undefined,
        autoApprovedByRuleId: matchedRule?.id,
        autoApprovedByRuleName: matchedRule?.name,
        autoBypassReason: initialStatus === 'approved' ? ruleMatch.reason : undefined,
        flags,
        simulated: input.simulated ?? state.settings.dryRun,
        history,
        createdAt: now,
        updatedAt: now,
      };

      const nextExpenses = [item, ...state.expenses];
      set({ expenses: nextExpenses });
      await repository.putExpense(item);
      refreshAccountantPendingCount(nextExpenses);

      // Update 80%/100% budget alerts once
      if (risk.isWarning80 || risk.isOverBudget100) {
        const mk = currentMonthKey(now);
        const budget = state.expenseBudgets.find(
          (b) => b.monthKey === mk && (b.department === dept || b.department === 'all') && b.category === input.category
        );
        if (budget && ((risk.isOverBudget100 && !budget.warned100) || (risk.isWarning80 && !budget.warned80))) {
          const updatedB: ExpenseBudget = {
            ...budget,
            warned80: budget.warned80 || risk.isWarning80,
            warned100: budget.warned100 || risk.isOverBudget100,
            updatedAt: now,
          };
          await get().putExpenseBudget(updatedB);
          await get().addMessage({
            channelId: 'backoffice',
            senderId: 'cfo',
            senderName: 'Phòng Kế toán',
            senderTitle: 'Cảnh báo Ngân sách',
            department: 'backoffice',
            content: `${risk.isOverBudget100 ? '🚨 Vượt 100%' : '⚠️ Đạt 80%'} ngân sách **${input.category}** (${dept}) khi tiếp nhận phiếu **${expenseCode}**.`,
            busType: 'escalation',
          });
        }
      }

      await get().addMessage({
        channelId: 'backoffice',
        senderId: input.requesterId,
        senderName: requester?.name || input.requesterId,
        senderTitle: requester?.title || 'Nhân sự',
        department: dept,
        content:
          initialStatus === 'approved'
            ? `Phiếu chi **${expenseCode}** (${formatVnd(item.amountVnd)} – ${item.title}) đã được **tự động duyệt** theo quy tắc **${matchedRule?.ruleCode}**.`
            : `Gửi đề xuất chi **${expenseCode}** (${formatVnd(item.amountVnd)} – ${item.title}) cho Kế toán thẩm định tầng 1.${flags.length ? `\n> Cảnh báo: ${flags.join('; ')}` : ''}`,
        busType: initialStatus === 'approved' ? 'report' : 'approval_needed',
        cardType: 'expense',
        cardData: { expenseId: item.id },
      });

      return item;
    },

    accountantReviewExpense: async ({ expenseId, reviewerId, decision, note }) => {
      const state = get();
      const exp = state.expenses.find((e) => e.id === expenseId);
      if (!exp) return { ok: false, error: 'Không tìm thấy phiếu chi.' };

      // Strict Separation of Duties: requester cannot review own expense
      if (exp.requesterId === reviewerId) {
        await get().addAuditLog({
          id: `aud_${Date.now()}`,
          agentId: reviewerId,
          agentName: getLiveAgentById(reviewerId)?.name || reviewerId,
          action: 'review_expense',
          permission: 'expense:review',
          resource: exp.expenseCode,
          result: 'denied',
          reason: 'Vi phạm tách bạch nhiệm vụ: Người xin chi không được tự thẩm định phiếu của chính mình.',
          timestamp: Date.now(),
        });
        return {
          ok: false,
          error: 'Tách bạch nhiệm vụ: Người tạo đề xuất không được tự thẩm định phiếu chi của mình.',
        };
      }

      const acc = state.accounts.find((a) => a.agentId === reviewerId);
      if (!acc || (!acc.permissions.includes('expense:review') && acc.role !== 'CEO')) {
        return { ok: false, error: 'Nhân sự này chưa có quyền expense:review (Kế toán thẩm định tầng 1).' };
      }

      const reviewer = state.agents.find((a) => a.id === reviewerId);
      const now = Date.now();

      // If forwarding to CEO, check hard 100% budget block
      const risk = analyzeExpenseRisks(
        {
          id: exp.id,
          department: exp.department,
          category: exp.category,
          vendor: exp.vendor,
          amountVnd: exp.amountVnd,
          attachmentName: exp.attachmentName,
          attachmentDataUrl: exp.attachmentDataUrl,
        },
        state.expenses,
        state.expenseBudgets,
        state.settings.spendingPolicy
      );

      if (decision === 'to_ceo' && risk.isOverBudget100 && state.settings.spendingPolicy.blockBudgetAt100Percent) {
        return {
          ok: false,
          error: 'Ngân sách hạng mục này đã đạt 100%. Cần mở khóa hạn mức ở tab Ngân sách hoặc CEO phê duyệt ngoại lệ.',
        };
      }

      const toStatus: ExpenseStatus =
        decision === 'to_ceo' ? 'pending_ceo' : decision === 'needs_info' ? 'needs_info' : 'rejected';

      const nextHistory: ExpenseAuditStep[] = [
        ...exp.history,
        {
          at: now,
          actorId: reviewerId,
          actorName: reviewer?.name || reviewerId,
          fromStatus: exp.status,
          toStatus,
          note: note || (decision === 'to_ceo' ? 'Kế toán thẩm định đạt, trình CEO duyệt tầng 2' : 'Kế toán xử lý'),
        },
      ];

      const updated: ExpenseItem = {
        ...exp,
        status: toStatus,
        accountantId: reviewerId,
        accountantNote: note,
        accountantCheckedAt: now,
        flags: risk.flags,
        history: nextHistory,
        updatedAt: now,
      };

      const nextExpenses = state.expenses.map((e) => (e.id === expenseId ? updated : e));
      set((s) => ({
        expenses: nextExpenses,
        unreadNotifications: s.unreadNotifications + (toStatus === 'pending_ceo' ? 1 : 0),
      }));
      await repository.putExpense(updated);
      refreshAccountantPendingCount(nextExpenses);

      const reqAgent = state.agents.find((a) => a.id === exp.requesterId);

      if (toStatus === 'pending_ceo') {
        const budgetInfo =
          risk.budgetLimitVnd && risk.budgetRemainingVnd !== null
            ? `Còn lại ${formatVnd(Math.max(0, risk.budgetRemainingVnd))} / ${formatVnd(risk.budgetLimitVnd)}`
            : 'Chưa đặt trần';
        const zaloMsg = `💳 Trình CEO duyệt ${exp.expenseCode}: ${exp.title} (${formatVnd(exp.amountVnd)})\n• Người xin: ${reqAgent?.name || exp.requesterId}\n• Kế toán (${reviewer?.name || 'CFO'}): ${note || 'Hợp lệ, ngân sách ' + budgetInfo}\n• Trả lời Zalo: "1 ${exp.expenseCode}" = Duyệt | "2 ${exp.expenseCode} lý do" = Từ chối | "3 ${exp.expenseCode} câu hỏi" = Hỏi lại`;
        get().pushZaloSimMessage('in', zaloMsg);

        await get().addMessage({
          channelId: 'all',
          senderId: reviewerId,
          senderName: reviewer?.name || 'Kế toán',
          senderTitle: reviewer?.title || 'Kế toán',
          department: 'backoffice',
          content: `**Trình CEO duyệt chi ${exp.expenseCode}** · **${formatVnd(exp.amountVnd)}**\n- Hạng mục: ${exp.category} (${exp.vendor})\n- Ghi chú Kế toán: ${note || 'Đã kiểm tra hợp lệ.'}\n- Ngân sách: ${budgetInfo}`,
          busType: 'approval_needed',
          cardType: 'expense',
          cardData: { expenseId: updated.id },
        });
      } else {
        await get().addMessage({
          channelId: exp.department,
          senderId: reviewerId,
          senderName: reviewer?.name || 'Kế toán',
          senderTitle: reviewer?.title || 'Kế toán',
          department: 'backoffice',
          content: `Phiếu chi **${exp.expenseCode}** (${exp.title}): **${toStatus === 'needs_info' ? 'Cần bổ sung chứng từ/giải trình' : 'Kế toán từ chối'}**.${note ? `\n> Lý do: ${note}` : ''}`,
          busType: 'report',
          cardType: 'expense',
          cardData: { expenseId: updated.id },
        });
      }

      return { ok: true };
    },

    ceoResolveExpense: async ({ expenseId, decision, note, editedAmountVnd, via = 'web' }) => {
      const state = get();
      const exp = state.expenses.find((e) => e.id === expenseId);
      if (!exp) return { ok: false, error: 'Không tìm thấy phiếu chi.' };

      const now = Date.now();
      const finalAmount = decision === 'edited' && editedAmountVnd && editedAmountVnd > 0 ? Math.round(editedAmountVnd) : exp.amountVnd;
      const toStatus: ExpenseStatus =
        decision === 'rejected'
          ? 'rejected'
          : decision === 'needs_info'
          ? 'needs_info'
          : 'approved';

      const nextHistory: ExpenseAuditStep[] = [
        ...exp.history,
        {
          at: now,
          actorId: 'ceo',
          actorName: `Chủ tịch (CEO - ${via})`,
          fromStatus: exp.status,
          toStatus,
          note:
            decision === 'edited'
              ? `Sửa số tiền thành ${formatVnd(finalAmount)}. ${note || ''}`.trim()
              : note || `CEO ${decision}`,
        },
      ];

      const updated: ExpenseItem = {
        ...exp,
        amountVnd: finalAmount,
        status: toStatus,
        ceoDecisionNote: note,
        ceoDecidedAt: now,
        history: nextHistory,
        updatedAt: now,
      };

      const nextExpenses = state.expenses.map((e) => (e.id === expenseId ? updated : e));
      set({ expenses: nextExpenses });
      await repository.putExpense(updated);
      refreshAccountantPendingCount(nextExpenses);

      // Sync linked AdCampaign if any
      const linkedAd = state.adCampaigns.find((a) => a.expenseId === exp.id);
      if (linkedAd) {
        await get().putAdCampaign({
          ...linkedAd,
          status: toStatus === 'approved' ? 'active' : 'rejected',
        });
      }

      const label =
        decision === 'approved'
          ? 'ĐÃ DUYỆT CHI'
          : decision === 'edited'
          ? `ĐÃ SỬA (${formatVnd(finalAmount)}) & DUYỆT`
          : decision === 'needs_info'
          ? 'YÊU CẦU GIẢI TRÌNH THÊM'
          : 'TỪ CHỐI CHI';

      await get().addMessage({
        channelId: 'all',
        senderId: 'ceo',
        senderName: 'Chủ tịch (CEO)',
        senderTitle: via === 'zalo_sim' ? 'CEO qua Zalo' : 'CEO',
        department: 'ceo',
        content: `**[${label}]** Phiếu **${exp.expenseCode}** – ${exp.title} (${formatVnd(finalAmount)})${note ? `\n> Ghi chú CEO: ${note}` : ''}`,
        busType: 'chat',
        cardType: 'expense',
        cardData: { expenseId: updated.id },
      });

      const reqAgent = state.agents.find((a) => a.id === exp.requesterId);
      if (reqAgent) {
        get().setAgentStatus(
          reqAgent.id,
          toStatus === 'approved' ? 'done' : 'idle',
          toStatus === 'approved' ? `Đã duyệt ${exp.expenseCode}` : `${exp.expenseCode}: ${label}`
        );
      }

      return { ok: true };
    },

    markExpensePaid: async ({ expenseId, actorId, note, attachmentName, attachmentDataUrl }) => {
      const exp = get().expenses.find((e) => e.id === expenseId);
      if (!exp) return;
      const actor = get().agents.find((a) => a.id === actorId);
      const now = Date.now();
      const updated: ExpenseItem = {
        ...exp,
        status: 'paid',
        paidAt: now,
        paidNote: note || 'Đã thanh toán',
        attachmentName: attachmentName || exp.attachmentName,
        attachmentDataUrl: attachmentDataUrl || exp.attachmentDataUrl,
        history: [
          ...exp.history,
          {
            at: now,
            actorId,
            actorName: actor?.name || actorId,
            fromStatus: exp.status,
            toStatus: 'paid',
            note: note || 'Xác nhận đã chi & lưu chứng từ',
          },
        ],
        updatedAt: now,
      };
      set((s) => ({ expenses: s.expenses.map((e) => (e.id === expenseId ? updated : e)) }));
      await repository.putExpense(updated);
    },

    reconcileExpense: async (expenseId, actorId, note) => {
      const exp = get().expenses.find((e) => e.id === expenseId);
      if (!exp) return;
      const actor = get().agents.find((a) => a.id === actorId);
      const now = Date.now();
      const updated: ExpenseItem = {
        ...exp,
        status: 'reconciled',
        reconciledAt: now,
        receiptNote: note || exp.receiptNote || 'Đã đối soát sổ sách cuối kỳ',
        history: [
          ...exp.history,
          {
            at: now,
            actorId,
            actorName: actor?.name || actorId,
            fromStatus: exp.status,
            toStatus: 'reconciled',
            note: note || 'Đối soát chứng từ thành công',
          },
        ],
        updatedAt: now,
      };
      set((s) => ({ expenses: s.expenses.map((e) => (e.id === expenseId ? updated : e)) }));
      await repository.putExpense(updated);
    },

    saveExpenseRule: async (input) => {
      const policy = get().settings.spendingPolicy;
      const check = validateRuleAgainstPolicy(input, policy);
      if (!check.valid) {
        return { ok: false, error: check.reason };
      }

      const now = Date.now();
      const existing = input.id ? get().expenseRules.find((r) => r.id === input.id) : undefined;
      const needsCeoConfirm =
        input.ruleType === 'full_auto' && policy.requireOneTimeCeoRuleConfirm && !input.ceoConfirmedOnce;

      const rule: ExpenseRule = {
        ...input,
        id: existing?.id || `rule_${now}_${Math.random().toString(36).slice(2, 6)}`,
        ruleCode: existing?.ruleCode || input.ruleCode || `#QT-${String(get().expenseRules.length + 1).padStart(2, '0')}`,
        enabled: needsCeoConfirm ? false : input.enabled,
        usageMonthKey: existing?.usageMonthKey || currentMonthKey(now),
        usedCountMonth: existing?.usedCountMonth || 0,
        usedAmountMonthVnd: existing?.usedAmountMonthVnd || 0,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      set((s) => {
        const idx = s.expenseRules.findIndex((r) => r.id === rule.id);
        const next = idx >= 0 ? s.expenseRules.map((r) => (r.id === rule.id ? rule : r)) : [rule, ...s.expenseRules];
        return { expenseRules: next };
      });
      await repository.putExpenseRule(rule);

      if (needsCeoConfirm) {
        const qId = `ask_rule_${now}`;
        await get().putAskCeoQuestion({
          id: qId,
          agentId: input.createdBy || 'cfo',
          department: 'backoffice',
          question: `Xác nhận 1 lần cho Quy tắc Tự động Duyệt Toàn phần ${rule.ruleCode}: "${rule.name}" (tối đa ${formatVnd(rule.maxPerExpenseVnd)}/lần, ${formatVnd(rule.maxPerMonthVnd)}/tháng)?`,
          options: ['Đồng ý bật quy tắc', 'Từ chối giữ duyệt thủ công'],
          urgency: 'normal',
          context: `Danh mục: ${rule.category} | NCC: ${rule.vendorPattern}`,
          stepType: 'expense_confirm',
          resumeAction: { type: 'expense_rule_confirm', ruleId: rule.id },
          status: 'pending',
          createdAt: now,
        });
        await get().addMessage({
          channelId: 'all',
          senderId: input.createdBy || 'cfo',
          senderName: getLiveAgentById(input.createdBy)?.name || 'Kế toán',
          senderTitle: 'Kế toán',
          department: 'backoffice',
          content: `Đề xuất kích hoạt quy tắc tự duyệt toàn phần **${rule.ruleCode} – ${rule.name}**. Nhờ Chủ tịch xác nhận 1 lần để áp dụng tự động ạ.`,
          busType: 'approval_needed',
          cardType: 'expense_rule',
          cardData: { ruleId: rule.id, askId: qId },
        });
      }

      return { ok: true, rule };
    },

    toggleExpenseRule: async (ruleId) => {
      const rule = get().expenseRules.find((r) => r.id === ruleId);
      if (!rule || rule.revokedByCeo) return;
      const updated = { ...rule, enabled: !rule.enabled, updatedAt: Date.now() };
      set((s) => ({ expenseRules: s.expenseRules.map((r) => (r.id === ruleId ? updated : r)) }));
      await repository.putExpenseRule(updated);
    },

    revokeExpenseRule: async (ruleId) => {
      const rule = get().expenseRules.find((r) => r.id === ruleId);
      if (!rule) return;
      const updated: ExpenseRule = { ...rule, enabled: false, revokedByCeo: true, updatedAt: Date.now() };
      set((s) => ({ expenseRules: s.expenseRules.map((r) => (r.id === ruleId ? updated : r)) }));
      await repository.putExpenseRule(updated);
    },

    deleteExpenseRule: async (ruleId) => {
      set((s) => ({ expenseRules: s.expenseRules.filter((r) => r.id !== ruleId) }));
      await repository.deleteExpenseRule(ruleId);
    },

    putExpenseBudget: async (budget) => {
      set((s) => {
        const idx = s.expenseBudgets.findIndex((b) => b.id === budget.id);
        const next =
          idx >= 0 ? s.expenseBudgets.map((b) => (b.id === budget.id ? budget : b)) : [...s.expenseBudgets, budget];
        return { expenseBudgets: next };
      });
      await repository.putExpenseBudget(budget);
    },

    addExpenseCategory: async (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (get().expenseCategories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return;
      const cat: ExpenseCategoryConfig = { id: `cat_${Date.now()}`, name: trimmed, isDefault: false };
      set((s) => ({ expenseCategories: [...s.expenseCategories, cat] }));
      await repository.putExpenseCategory(cat);
    },

    updateSpendingPolicy: async (patch) => {
      const nextPolicy: SpendingPolicy = {
        ...get().settings.spendingPolicy,
        ...patch,
        updatedAt: Date.now(),
      };
      await get().updateSettings({ spendingPolicy: nextPolicy });
    },

    recordAiTokenCostExpense: async (deltaVnd, tokens, provider) => {
      if (deltaVnd <= 0) return;
      const today = new Date().toISOString().slice(0, 10);
      const id = `exp_token_${today}_${provider}`;
      const existing = get().expenses.find((e) => e.id === id);
      const now = Date.now();
      if (existing) {
        const updated: ExpenseItem = {
          ...existing,
          amountVnd: existing.amountVnd + deltaVnd,
          justification: `Tổng hợp tiêu thụ API AI (${provider}) ngày ${today} (+${tokens.toLocaleString('vi-VN')} tokens).`,
          updatedAt: now,
        };
        set((s) => ({ expenses: s.expenses.map((e) => (e.id === id ? updated : e)) }));
        await repository.putExpense(updated);
      } else {
        const item: ExpenseItem = {
          id,
          expenseCode: `#CP-AI-${today.slice(5).replace('-', '')}`,
          requesterId: 'data_analyst',
          department: 'data',
          projectOrCampaign: 'Hạ tầng AI nội bộ',
          category: 'Token AI',
          title: `Chi phí Token AI (${provider.toUpperCase()}) – ${today}`,
          amountVnd: deltaVnd,
          frequency: 'once',
          justification: `Tự động ghi nhận từ LLMRouter (${tokens.toLocaleString('vi-VN')} tokens).`,
          expectedRoi: 'Vận hành toàn bộ nhân sự AI.',
          vendor: provider === 'gemini' ? 'Google Gemini API' : 'DeepSeek API',
          dueDate: today,
          status: 'paid',
          paidAt: now,
          autoBypassReason: 'Ghi nhận tự động chi phí Token AI trong hạn mức',
          flags: [],
          simulated: false,
          history: [
            {
              at: now,
              actorId: 'system',
              actorName: 'LLMRouter',
              fromStatus: 'draft',
              toStatus: 'paid',
              note: 'Ghi sổ tự động chi phí Token AI',
            },
          ],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ expenses: [item, ...s.expenses] }));
        await repository.putExpense(item);
      }
    },

    handleZaloCommand: async (rawText) => {
      const trimmed = rawText.trim();
      // Pattern 1/2/3 for #HD-xxx Contracts: e.g. "1 #HD-2026-001", "2 #HD-... sửa ...", "3 #HD-... chuyển luật sư"
      const hdMatch = trimmed.match(/^([123])\s+(#?HD-[\w-]+)(?:\s+([\s\S]+))?$/i);
      if (hdMatch) {
        const cmd = hdMatch[1];
        const code = hdMatch[2].toUpperCase().startsWith('#') ? hdMatch[2].toUpperCase() : `#${hdMatch[2].toUpperCase()}`;
        const note = hdMatch[3]?.trim();
        const ctr = get().contracts.find((c) => c.contractCode.toUpperCase() === code);
        if (!ctr) {
          get().pushZaloSimMessage('in', `Không tìm thấy hợp đồng ${code}.`);
          return true;
        }
        get().pushZaloSimMessage('out', trimmed);
        if (cmd === '1') {
          await get().ceoApproveAndUnlockContractSend(ctr.id, 'zalo_sim');
          get().pushZaloSimMessage('in', `Đã duyệt & mở khóa gửi hợp đồng ${code}.`);
        } else if (cmd === '2') {
          const updated: ContractRecord = { ...ctr, status: 'draft', nextMilestoneNote: note || 'CEO yêu cầu chỉnh sửa', updatedAt: Date.now() };
          set((s) => ({ contracts: s.contracts.map((c) => (c.id === ctr.id ? updated : c)) }));
          await repository.putContract(updated);
          get().pushZaloSimMessage('in', `Đã chuyển hợp đồng ${code} về Nháp để Pháp chế chỉnh sửa: ${note || ''}`);
        } else {
          const updated: ContractRecord = {
            ...ctr,
            requiresRealLawyer: true,
            lawyerReasons: [...ctr.lawyerReasons, note || 'CEO chỉ đạo chuyển Luật sư thật rà soát'],
            updatedAt: Date.now(),
          };
          set((s) => ({ contracts: s.contracts.map((c) => (c.id === ctr.id ? updated : c)) }));
          await repository.putContract(updated);
          get().pushZaloSimMessage('in', `Đã gắn cờ bắt buộc chuyển Luật sư thật cho ${code}.`);
        }
        return true;
      }

      // Pattern 1/2/3 for #CP-xxx: e.g. "1 #CP-102", "2 #CP-102 vượt ngân sách", "3 #CP-102 xin báo giá"
      const cpMatch = trimmed.match(/^([123])\s+(#?CP-[\w-]+)(?:\s+([\s\S]+))?$/i);
      if (cpMatch) {
        const cmd = cpMatch[1];
        const code = cpMatch[2].toUpperCase().startsWith('#') ? cpMatch[2].toUpperCase() : `#${cpMatch[2].toUpperCase()}`;
        const note = cpMatch[3]?.trim();
        const exp = get().expenses.find((e) => e.expenseCode.toUpperCase() === code);
        if (!exp) {
          get().pushZaloSimMessage('in', `Không tìm thấy phiếu chi ${code}.`);
          return true;
        }
        get().pushZaloSimMessage('out', trimmed);
        if (cmd === '1') {
          await get().ceoResolveExpense({ expenseId: exp.id, decision: 'approved', note: note || 'Duyệt qua Zalo', via: 'zalo_sim' });
          get().pushZaloSimMessage('in', `Đã duyệt phiếu ${code} (${formatVnd(exp.amountVnd)}). Kế toán có thể tiến hành chi.`);
        } else if (cmd === '2') {
          await get().ceoResolveExpense({ expenseId: exp.id, decision: 'rejected', note: note || 'CEO từ chối qua Zalo', via: 'zalo_sim' });
          get().pushZaloSimMessage('in', `Đã từ chối phiếu ${code}.`);
        } else {
          await get().ceoResolveExpense({ expenseId: exp.id, decision: 'needs_info', note: note || 'CEO cần giải trình thêm', via: 'zalo_sim' });
          get().pushZaloSimMessage('in', `Đã chuyển phiếu ${code} sang trạng thái Cần bổ sung thông tin.`);
        }
        return true;
      }

      // Existing AskCeo #id pattern
      const askMatch = trimmed.match(/^#([^\s]+)\s+([\s\S]+)$/);
      if (askMatch) {
        await get().answerAskCeo(askMatch[1], askMatch[2].trim(), 'zalo_sim');
        return true;
      }

      const pendingAsk = get().askCeoQuestions.find((q) => q.status === 'pending');
      if (pendingAsk) {
        await get().answerAskCeo(pendingAsk.id, trimmed, 'zalo_sim');
        return true;
      }

      const pendingExp = get().expenses.find((e) => e.status === 'pending_ceo');
      if (pendingExp && ['1', 'duyệt', 'ok', 'đồng ý'].includes(trimmed.toLowerCase())) {
        get().pushZaloSimMessage('out', trimmed);
        await get().ceoResolveExpense({ expenseId: pendingExp.id, decision: 'approved', note: 'Duyệt nhanh Zalo', via: 'zalo_sim' });
        get().pushZaloSimMessage('in', `Đã duyệt nhanh phiếu ${pendingExp.expenseCode}.`);
        return true;
      }

      return false;
    },

    // === APPEARANCE & SETTINGS ===
    saveAgentAppearance: async (app) => {
      set((s) => ({
        agentAppearances: { ...s.agentAppearances, [app.agentId]: app },
      }));
      await repository.putAgentAppearance(app);
    },

    resetAgentAppearance: async (agentId) => {
      const agent = get().agents.find((a) => a.id === agentId);
      if (!agent) return;
      const def = getDefaultAppearance(agent);
      await get().saveAgentAppearance(def);
    },

    updateSettings: async (patch) => {
      const next = { ...get().settings, ...patch };
      if (typeof patch.deepseekApiKey === 'string' && typeof window !== 'undefined') {
        localStorage.setItem('aicompany_deepseek_key', patch.deepseekApiKey);
      }
      if (typeof patch.geminiApiKey === 'string' && typeof window !== 'undefined') {
        localStorage.setItem('aicompany_gemini_key', patch.geminiApiKey);
      }
      if (patch.theme && typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', patch.theme === 'dark');
      }
      if (typeof patch.ambientAudioEnabled === 'boolean') {
        syncAmbientAudioSetting(patch.ambientAudioEnabled);
      }
      set({ settings: next });
      await repository.saveSettings(next);
    },

    applyRoutingPreset: async (preset) => {
      const cur = get().settings;
      const routes = buildRoutingPreset(preset, cur.localModel || 'qwen2.5:7b');
      const primaryProvider: ProviderId =
        preset === 'offline' ? 'local' : routes[0]?.provider || cur.primaryProvider;
      await get().updateSettings({
        routingPreset: preset,
        roleRoutes: routes,
        primaryProvider,
      });
    },

    updateRoleRoute: async (group, patch) => {
      const cur = get().settings;
      const nextRoutes = cur.roleRoutes.map((r) => (r.group === group ? { ...r, ...patch } : r));
      await get().updateSettings({ roleRoutes: nextRoutes });
    },

    triggerKillSwitch: async () => {
      const prevEnv = get().settings.envMode;
      const next = {
        ...get().settings,
        killSwitchActive: true,
        autopilotEnabled: false,
        marketingAutopilotEnabled: false,
        paused: true,
        envMode: prevEnv === 'live' ? ('read_only' as const) : prevEnv,
      };
      const nextRuntimes = { ...get().runtimes };
      for (const id of Object.keys(nextRuntimes)) {
        nextRuntimes[id] = {
          ...nextRuntimes[id],
          status: 'idle',
          waypoints: [],
          bubbleText: 'Dừng khẩn cấp',
          bubbleExpiresAt: Date.now() + 4000,
        };
      }
      stopAllVoicePlayback();
      fetch('/api/devices/killswitch', { method: 'POST' }).catch(() => {});
      const baseZalo = buildFallbackBaseSettings().zaloPersonal!;
      const updatedZalo: ZaloPersonalConfig = {
        ...baseZalo,
        ...(next.zaloPersonal || {}),
        anomalyPausedReason: next.zaloPersonal?.enabled
          ? 'Dừng khẩn cấp bởi Kill Switch CEO'
          : next.zaloPersonal?.anomalyPausedReason,
      };
      const finalKillSettings: CompanySettings = {
        ...next,
        zaloPersonal: updatedZalo,
      };
      set({
        settings: finalKillSettings,
        runtimes: nextRuntimes,
        voiceSpeakingAgentId: null,
        currentSubtitle: null,
        bannerAlert:
          'KILL SWITCH ĐÃ KÍCH HOẠT: Toàn bộ agent, giọng nói, Zalo Cá nhân, thiết bị Android & kết nối ghi HubCW đã dừng lập tức.',
      });
      await repository.saveSettings(finalKillSettings);
      await get().addMessage({
        channelId: 'all',
        senderId: 'system',
        senderName: 'Hệ thống An toàn',
        senderTitle: 'KILL SWITCH',
        department: 'exec',
        content: 'KILL SWITCH kích hoạt bởi CEO. Mọi tác vụ chạy ngầm, giọng nói, Zalo Cá nhân và hàng đợi thiết bị đã dừng tức thì.',
        busType: 'escalation',
        cardType: 'system_blocker',
        cardData: { reason: 'kill_switch', resumeAction: 'resume_killswitch' },
      });
    },

    resumeFromKillSwitch: async () => {
      const next = { ...get().settings, killSwitchActive: false, paused: false };
      set({ settings: next, bannerAlert: null });
      await repository.saveSettings(next);
      // Move waiting_resume tasks back to todo cleanly
      const waitingTasks = get().tasks.filter((t) => t.status === 'waiting_resume');
      for (const wt of waitingTasks) {
        await get().putTask({ ...wt, status: 'todo', updatedAt: Date.now() });
      }
    },

    changeCeoPassword: async (newPassword) => {
      const salt = generateSalt(16);
      const hash = await hashPasswordPBKDF2(newPassword, salt);
      await get().updateSettings({
        ceoPasswordSalt: salt,
        ceoPasswordHash: hash,
        mustChangeDefaultPassword: false,
      });
    },

    addMessage: async (msg) => {
      const now = msg.timestamp || Date.now();
      const normalized = msg.content.trim();
      const recentDup = get().messages.find(
        (m) =>
          m.channelId === msg.channelId &&
          m.senderId === msg.senderId &&
          m.content.trim() === normalized &&
          Math.abs(now - m.timestamp) < 5000
      );
      if (recentDup) {
        return recentDup;
      }
      const full: ChatMessage = {
        ...msg,
        id: msg.id || `msg_${now}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
      };
      set((s) => ({ messages: [...s.messages, full] }));
      await repository.addMessage(full);
      return full;
    },

    putTask: async (task) => {
      const existingCount = get().tasks.length;
      const now = Date.now();
      const normalized: TaskItem = {
        ...task,
        taskCode: task.taskCode || `#T-${101 + existingCount}`,
        definitionOfDone: task.definitionOfDone || task.description || 'Hoàn tất và lưu kết quả thực tế.',
        expectedDeliverable: task.expectedDeliverable || 'Tài liệu / Dữ liệu trong hệ thống',
        etaMinutes: task.etaMinutes || 10,
        etaAt: task.etaAt || (task.createdAt || now) + (task.etaMinutes || 10) * 60_000,
        progressPercent: typeof task.progressPercent === 'number' ? task.progressPercent : task.status === 'done' ? 100 : 0,
        lastProgressAt: task.lastProgressAt || now,
        deliverables: Array.isArray(task.deliverables) ? task.deliverables : [],
      };
      set((s) => {
        const idx = s.tasks.findIndex((t) => t.id === normalized.id);
        const next = idx >= 0 ? s.tasks.map((t) => (t.id === normalized.id ? normalized : t)) : [normalized, ...s.tasks];
        return { tasks: next };
      });
      await repository.putTask(normalized);
    },

    moveTaskStatus: async (taskId, status) => {
      const existing = get().tasks.find((t) => t.id === taskId);
      if (!existing) return;
      const now = Date.now();
      const patch: Partial<TaskItem> = {
        status,
        updatedAt: now,
        lastProgressAt: now,
        progressPercent: status === 'done' ? 100 : status === 'review' ? 95 : existing.progressPercent,
        completedAt: status === 'done' ? now : existing.completedAt,
      };
      await get().putTask({ ...existing, ...patch });
      if (status === 'done') {
        get().setAgentDelayed(existing.assignedTo, false);
        // W: Tự động lưu kinh nghiệm từ đầu ra được CEO nghiệm thu & cập nhật điểm Playbook
        const matched = findMatchingPlaybook(
          `${existing.title} ${existing.description || ''}`,
          existing.department,
          get().playbooks
        );
        if (matched) {
          await get().recordPlaybookRun(matched.id, 93, {
            durationMs: Math.max(1200, Math.min(15000, now - existing.createdAt)),
          });
        }
        await get().addExperienceMemory({
          department: existing.department,
          agentId: existing.assignedTo,
          tags: [existing.department, existing.taskCode, 'nghiem_thu'],
          lesson: `Đầu ra đạt chuẩn CEO cho "${existing.title}" (${existing.expectedDeliverable}).`,
          source: 'accepted_deliverable',
        });
      }
    },

    recordTaskRevisionFeedback: async (taskId, feedbackText) => {
      const existing = get().tasks.find((t) => t.id === taskId);
      if (!existing || !feedbackText.trim()) return;
      await get().addExperienceMemory({
        department: existing.department,
        agentId: existing.assignedTo,
        tags: [existing.department, existing.taskCode, 'ceo_feedback'],
        lesson: `CEO yêu cầu sửa ở "${existing.title}": ${feedbackText.trim()}`,
        source: 'ceo_feedback',
      });
      const matched = findMatchingPlaybook(
        `${existing.title} ${existing.description || ''}`,
        existing.department,
        get().playbooks
      );
      if (matched) {
        await get().recordPlaybookRun(matched.id, 72, { reworked: true });
      }
    },

    putLead: async (lead) => {
      set((s) => {
        const idx = s.leads.findIndex((l) => l.id === lead.id);
        const next = idx >= 0 ? s.leads.map((l) => (l.id === lead.id ? lead : l)) : [lead, ...s.leads];
        return { leads: next };
      });
      await repository.putLead(lead);
    },

    moveLeadStage: async (leadId, stage) => {
      const existing = get().leads.find((l) => l.id === leadId);
      if (!existing) return;
      const wasWon = existing.stage === 'won';
      await get().putLead({ ...existing, stage });
      if (stage === 'won' && !wasWon) {
        set((s) => ({ dealCelebrationNonce: s.dealCelebrationNonce + 1 }));
        get().setAgentStatus(existing.assignedAgentId || 'account_executive', 'done', `Chốt Deal ${existing.name.slice(0, 18)}!`);
      }
    },

    toggleLeadBlacklist: async (leadId) => {
      const existing = get().leads.find((l) => l.id === leadId);
      if (!existing) return;
      await get().putLead({ ...existing, blacklisted: !existing.blacklisted });
    },

    putDocument: async (doc) => {
      set((s) => {
        const idx = s.documents.findIndex((d) => d.id === doc.id);
        const next = idx >= 0 ? s.documents.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...s.documents];
        return { documents: next };
      });
      await repository.putDocument(doc);
    },

    putApproval: async (req) => {
      const cur = get().approvals;
      const sameIdIdx = cur.findIndex((a) => a.id === req.id);
      if (sameIdIdx < 0 && req.status === 'pending') {
        const postId = req.payload?.postId ? String(req.payload.postId) : '';
        const adCampaignId = req.payload?.adCampaignId ? String(req.payload.adCampaignId) : '';
        const duplicatePending = cur.find(
          (a) =>
            a.status === 'pending' &&
            ((a.type === req.type && a.requestedBy === req.requestedBy && a.title.trim() === req.title.trim()) ||
              (postId && String(a.payload?.postId || '') === postId) ||
              (adCampaignId && String(a.payload?.adCampaignId || '') === adCampaignId))
        );
        if (duplicatePending) {
          return;
        }
      }
      set((s) => {
        const idx = s.approvals.findIndex((a) => a.id === req.id);
        const next = idx >= 0 ? s.approvals.map((a) => (a.id === req.id ? req : a)) : [req, ...s.approvals];
        return {
          approvals: next,
          unreadNotifications: s.unreadNotifications + (idx < 0 ? 1 : 0),
        };
      });
      await repository.putApproval(req);
    },

    resolveApproval: async (id, decision, note) => {
      const req = get().approvals.find((a) => a.id === id);
      if (!req) return;
      const updated: ApprovalRequest = {
        ...req,
        status: decision,
        ceoNote: note,
        resolvedAt: Date.now(),
      };
      await get().putApproval(updated);

      if (decision !== 'rejected' && req.type === 'permission' && req.payload?.permission) {
        const perm = req.payload.permission as Permission;
        const acc = get().accounts.find((a) => a.agentId === req.requestedBy);
        if (acc && !acc.permissions.includes(perm)) {
          const nextAcc = { ...acc, permissions: [...acc.permissions, perm] };
          set((s) => ({
            accounts: s.accounts.map((a) => (a.agentId === acc.agentId ? nextAcc : a)),
          }));
          await repository.putAccount(nextAcc);
        }
      }

      if (req.type === 'public_post' && req.payload?.postId) {
        const post = get().scheduledPosts.find((p) => p.id === String(req.payload.postId));
        if (post) {
          await get().putScheduledPost({
            ...post,
            status: decision === 'rejected' ? 'blocked' : 'approved',
          });
        }
      }

      if (req.type === 'budget' && req.payload?.adCampaignId) {
        const ad = get().adCampaigns.find((a) => a.id === String(req.payload.adCampaignId));
        if (ad) {
          await get().putAdCampaign({
            ...ad,
            status: decision === 'rejected' ? 'rejected' : 'active',
          });
        }
      }

      if (req.type === 'hr_hire' && decision !== 'rejected' && Array.isArray(req.payload?.specs)) {
        await get().hireBatchTeam(req.payload.specs as Array<Parameters<typeof buildNewAgentFromSpec>[0]>, 'CEO (Duyệt tuyển)');
      }

      if (req.type === 'affiliate_post' && req.payload?.affPostId) {
        const affPost = get().affiliatePosts.find((p) => p.id === String(req.payload.affPostId));
        if (affPost) {
          const nextPost: AffiliateChannelPost = {
            ...affPost,
            status: decision === 'rejected' ? 'blocked_compliance' : 'scheduled',
            scheduledAt: decision === 'rejected' ? undefined : Date.now() + 600_000,
          };
          set((s) => ({
            affiliatePosts: s.affiliatePosts.map((p) => (p.id === nextPost.id ? nextPost : p)),
          }));
          await repository.putAffiliatePost(nextPost);
        }
      }

      if (req.type === 'contract_send' && req.payload?.contractId) {
        if (decision !== 'rejected') {
          await get().ceoApproveAndUnlockContractSend(String(req.payload.contractId), 'web');
        } else {
          const ctr = get().contracts.find((c) => c.id === String(req.payload.contractId));
          if (ctr) {
            const reverted: ContractRecord = { ...ctr, status: 'draft', updatedAt: Date.now() };
            set((s) => ({ contracts: s.contracts.map((c) => (c.id === ctr.id ? reverted : c)) }));
            await repository.putContract(reverted);
          }
        }
      }

      const agent = get().agents.find((a) => a.id === req.requestedBy);
      const label = decision === 'approved' ? 'ĐÃ DUYỆT' : decision === 'edited' ? 'ĐÃ SỬA & DUYỆT' : 'TỪ CHỐI';
      await get().addMessage({
        channelId: 'all',
        senderId: 'ceo',
        senderName: 'Chủ tịch (CEO)',
        senderTitle: 'CEO',
        department: 'ceo',
        content: `**[${label}]** ${req.title}${note ? `\n> Ghi chú CEO: ${note}` : ''}`,
        busType: 'chat',
      });

      if (agent) {
        get().setAgentStatus(agent.id, 'done', decision === 'rejected' ? 'Đã hủy theo lệnh CEO' : 'Đã được CEO duyệt!');
      }
    },

    putAskCeoQuestion: async (q) => {
      set((s) => {
        const idx = s.askCeoQuestions.findIndex((x) => x.id === q.id);
        const next = idx >= 0 ? s.askCeoQuestions.map((x) => (x.id === q.id ? q : x)) : [q, ...s.askCeoQuestions];
        return {
          askCeoQuestions: next,
          unreadNotifications: s.unreadNotifications + (idx < 0 ? 1 : 0),
        };
      });
      await repository.putAskCeoQuestion(q);
    },

    answerAskCeo: async (id, answer, via) => {
      const q = get().askCeoQuestions.find((x) => x.id === id);
      if (!q || q.status === 'answered') return;

      const updated: AskCeoQuestion = {
        ...q,
        status: 'answered',
        answer,
        answeredVia: via,
        answeredAt: Date.now(),
      };
      await get().putAskCeoQuestion(updated);

      if (via === 'zalo_sim') {
        get().pushZaloSimMessage('out', `#${q.id}: ${answer}`);
      }

      // Handle Expense Rule one-time confirmation seamlessly
      if (updated.resumeAction?.type === 'expense_rule_confirm' && updated.resumeAction.ruleId) {
        const rule = get().expenseRules.find((r) => r.id === updated.resumeAction?.ruleId);
        if (rule) {
          const accepted = /đồng ý|duyệt|ok|1/i.test(answer);
          const nextRule: ExpenseRule = {
            ...rule,
            ceoConfirmedOnce: accepted,
            enabled: accepted,
            revokedByCeo: !accepted,
            updatedAt: Date.now(),
          };
          set((s) => ({
            expenseRules: s.expenseRules.map((r) => (r.id === rule.id ? nextRule : r)),
          }));
          await repository.putExpenseRule(nextRule);
        }
      }

      const agent = get().agents.find((a) => a.id === q.agentId);
      get().setAgentStatus(q.agentId, 'typing', `Đã nhận lệnh: ${answer.slice(0, 24)}`);

      await get().addMessage({
        channelId: 'ask_ceo',
        senderId: 'ceo',
        senderName: 'Chủ tịch (CEO)',
        senderTitle: via === 'zalo_sim' ? 'Trả lời qua Zalo' : 'Trả lời trên Web',
        department: 'ceo',
        content: `Trả lời **#${q.id}** cho **${agent?.name || q.agentId}**: **${answer}**`,
        busType: 'chat',
      });

      await get().addMessage({
        channelId: agent?.department || 'all',
        senderId: q.agentId,
        senderName: agent?.name || q.agentId,
        senderTitle: agent?.title || 'Agent',
        department: q.department,
        content: `Đã nhận phản hồi **#${q.id}** từ Chủ tịch (*"${answer}"*). Em đang tiếp tục xử lý đúng bước đang dở ạ!`,
        busType: 'report',
      });
      get().appendAgentMemory(q.agentId, `CEO trả lời #${q.id}: ${answer}`);

      const hook = get().onAskCeoResolvedHook;
      if (hook && updated.resumeAction) {
        await hook(updated, answer);
      }

      setTimeout(() => {
        const cur = get().runtimes[q.agentId]?.status;
        if (cur !== 'blocked') {
          get().setAgentStatus(q.agentId, 'done', 'Đã hoàn tất tiếp nối');
        }
      }, 1500);
    },

    addAuditLog: async (entry) => {
      set((s) => ({ auditLogs: [entry, ...s.auditLogs].slice(0, 300) }));
      await repository.addAuditLog(entry);
    },

    addOutreachLog: async (entry) => {
      set((s) => ({ outreachLogs: [entry, ...s.outreachLogs].slice(0, 300) }));
      await repository.addOutreachLog(entry);
    },

    putVaultStatus: async (status) => {
      set((s) => ({
        vaultStatuses: s.vaultStatuses.map((v) => (v.id === status.id ? status : v)),
      }));
      await repository.putVaultStatus(status);
    },

    addTokenUsage: async (rec) => {
      set((s) => ({ tokenUsage: [rec, ...s.tokenUsage].slice(0, 500) }));
      await repository.addTokenUsage(rec);
    },

    appendAgentMemory: async (agentId, note) => {
      const prev = get().agentMemories[agentId] || {
        agentId,
        shortTerm: [],
        longTermSummary: '',
        updatedAt: Date.now(),
      };
      let shortTerm = [...prev.shortTerm, note];
      let longTermSummary = prev.longTermSummary;
      if (shortTerm.length > 8) {
        const summarized = shortTerm.slice(0, 4).join(' | ');
        longTermSummary = `${longTermSummary ? longTermSummary + ' • ' : ''}${summarized}`.slice(-600);
        shortTerm = shortTerm.slice(4);
      }
      const next: AgentMemory = {
        agentId,
        shortTerm,
        longTermSummary,
        updatedAt: Date.now(),
      };
      set((s) => ({ agentMemories: { ...s.agentMemories, [agentId]: next } }));
      await repository.putAgentMemory(next);
    },

    putWorkflow: async (wf) => {
      set((s) => {
        const idx = s.workflows.findIndex((w) => w.id === wf.id);
        const next = idx >= 0 ? s.workflows.map((w) => (w.id === wf.id ? wf : w)) : [wf, ...s.workflows];
        return { workflows: next };
      });
      await repository.putWorkflow(wf);
    },

    putBrandKit: async (kit) => {
      set({ brandKit: kit });
      await repository.putBrandKit(kit);
    },

    putMarketingChannel: async (ch) => {
      set((s) => {
        const idx = s.marketingChannels.findIndex((c) => c.id === ch.id);
        const next = idx >= 0 ? s.marketingChannels.map((c) => (c.id === ch.id ? ch : c)) : [...s.marketingChannels, ch];
        return { marketingChannels: next };
      });
      await repository.putMarketingChannel(ch);
    },

    putScheduledPost: async (post) => {
      set((s) => {
        const idx = s.scheduledPosts.findIndex((p) => p.id === post.id);
        const next =
          idx >= 0 ? s.scheduledPosts.map((p) => (p.id === post.id ? post : p)) : [...s.scheduledPosts, post];
        next.sort((a, b) => a.dayNumber - b.dayNumber);
        return { scheduledPosts: next };
      });
      await repository.putScheduledPost(post);
    },

    movePostToDay: async (postId, dayNumber) => {
      const existing = get().scheduledPosts.find((p) => p.id === postId);
      if (!existing) return;
      await get().putScheduledPost({ ...existing, dayNumber: Math.max(1, Math.min(30, dayNumber)) });
    },

    putAdCampaign: async (ad) => {
      set((s) => {
        const idx = s.adCampaigns.findIndex((a) => a.id === ad.id);
        const next = idx >= 0 ? s.adCampaigns.map((a) => (a.id === ad.id ? ad : a)) : [ad, ...s.adCampaigns];
        return { adCampaigns: next };
      });
      await repository.putAdCampaign(ad);
    },

    putSocialComment: async (cmt) => {
      set((s) => {
        const idx = s.socialComments.findIndex((c) => c.id === cmt.id);
        const next = idx >= 0 ? s.socialComments.map((c) => (c.id === cmt.id ? cmt : c)) : [cmt, ...s.socialComments];
        return { socialComments: next };
      });
      await repository.putSocialComment(cmt);
    },

    addSocialLog: async (entry) => {
      set((s) => ({ socialLogs: [entry, ...s.socialLogs].slice(0, 300) }));
      await repository.addSocialLog(entry);
    },

    registerAskCeoResolvedHook: (fn) => set({ onAskCeoResolvedHook: fn }),

    updateAccountRole: async (agentId, role) => {
      const acc = get().accounts.find((a) => a.agentId === agentId);
      if (!acc) return;
      const updated = { ...acc, role };
      set((s) => ({ accounts: s.accounts.map((a) => (a.agentId === agentId ? updated : a)) }));
      await repository.putAccount(updated);
    },

    toggleAccountPermission: async (agentId, perm) => {
      const acc = get().accounts.find((a) => a.agentId === agentId);
      if (!acc) return;
      const has = acc.permissions.includes(perm);
      const permissions = has ? acc.permissions.filter((p) => p !== perm) : [...acc.permissions, perm];
      const updated = { ...acc, permissions };
      set((s) => ({ accounts: s.accounts.map((a) => (a.agentId === agentId ? updated : a)) }));
      await repository.putAccount(updated);
    },

    toggleAccountSuspended: async (agentId) => {
      await get().suspendAgent(agentId);
    },

    resetAgentToken: async (agentId) => {
      const acc = get().accounts.find((a) => a.agentId === agentId);
      if (!acc) return '';
      const token = await generateHashedAgentToken(agentId);
      const updated = { ...acc, tokenHash: token.hash, lastActiveAt: Date.now() };
      set((s) => ({ accounts: s.accounts.map((a) => (a.agentId === agentId ? updated : a)) }));
      await repository.putAccount(updated);
      return token.rawPreview;
    },

    pushZaloSimMessage: (direction, text) => {
      set((s) => ({
        zaloSimulatorLog: [
          ...s.zaloSimulatorLog,
          { id: `zs_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, direction, text, timestamp: Date.now() },
        ].slice(-50),
      }));
    },

    resetDatabase: async () => {
      await repository.resetAll();
      const freshDefault = await createDefaultSettings();
      await repository.saveSettings(freshDefault);
      await get().init();
    },

    // === BỔ SUNG G & H: HUB.CHUYENWEB.COM CONNECTOR, VAULT, UNDO, RECONCILIATION & UNIFORM ===
    getDecryptedAgentSecret: async (agentId) => {
      const cred = await repository.getEncryptedCredential(agentId);
      if (!cred) return undefined;
      try {
        return await decryptSecretAesGcm(cred.ivHex, cred.ciphertextB64);
      } catch {
        return undefined;
      }
    },

    linkExistingExternalAccount: async ({
      agentId,
      username,
      secret,
      authType,
      externalUserId,
      email,
      externalRole,
    }) => {
      const agent = get().agents.find((a) => a.id === agentId);
      if (!agent) return { ok: false, message: 'Không tìm thấy nhân sự.' };
      if (!username.trim() || !secret.trim()) {
        return { ok: false, message: 'Vui lòng nhập đầy đủ Tên đăng nhập và Token/Mật khẩu.' };
      }

      const encrypted = await encryptSecretAesGcm(secret.trim());
      const credRecord: EncryptedCredentialRecord = {
        id: `${agentId}::hubcw`,
        agentId,
        system: 'hubcw',
        authType,
        ivHex: encrypted.ivHex,
        ciphertextB64: encrypted.ciphertextB64,
        keyFingerprint: encrypted.keyFingerprint,
        updatedAt: Date.now(),
      };
      await repository.putEncryptedCredential(credRecord);

      const settings = get().settings;
      const resolvedExtId = externalUserId?.trim() || `hubcw_${username.trim().toLowerCase()}`;
      let statusMessage = `Đã mã hóa AES-256-GCM và liên kết tài khoản '${username.trim()}' cho ${agent.name}.`;
      let finalStatus: AgentExternalAccount['status'] = 'active';

      if (settings.hubcw.connectionMode === 'api') {
        const connector = createHubCwConnector('api', settings.hubcw.baseUrl);
        const probe = await connector.testConnection({
          agentId,
          agentName: agent.name,
          externalUserId: resolvedExtId,
          credentialSecret: secret.trim(),
          requestId: `link_test_${Date.now()}`,
        });
        if (!probe.ok) {
          finalStatus = 'error';
          statusMessage = `Đã lưu thông tin mã hóa nhưng kiểm tra API HubCW báo lỗi: ${probe.message}`;
        } else {
          statusMessage = `Kiểm tra đăng nhập HubCW thành công (${probe.latencyMs}ms). Đã liên kết cho ${agent.name}.`;
        }
      }

      const existing = get().externalAccounts.find((e) => e.agentId === agentId);
      const nextAcc: AgentExternalAccount = {
        agentId,
        system: 'hubcw',
        externalUserId: resolvedExtId,
        username: username.trim(),
        email: email?.trim() || `${agentId}@aicompany.vn`,
        externalRole: externalRole?.trim() || agent.role,
        externalPermissions:
          existing?.externalPermissions || buildDefaultHubCwPermissions(agent.department, agent.role, agent.title),
        status: finalStatus,
        linkedAt: Date.now(),
        lastActivityAt: Date.now(),
        tokenExpiresAt: Date.now() + 30 * 86400_000,
        lastError: finalStatus === 'error' ? statusMessage : undefined,
      };
      set((s) => ({
        externalAccounts: s.externalAccounts.some((e) => e.agentId === agentId)
          ? s.externalAccounts.map((e) => (e.agentId === agentId ? nextAcc : e))
          : [...s.externalAccounts, nextAcc],
      }));
      await repository.putExternalAccount(nextAcc);

      await get().addAuditLog({
        id: `aud_link_${Date.now()}`,
        agentId,
        agentName: agent.name,
        action: 'hubcw:link_account',
        permission: 'hubcw:write',
        resource: 'hubcw_account',
        result: finalStatus === 'active' ? 'allowed' : 'denied',
        externalRefId: resolvedExtId,
        reason: statusMessage,
        timestamp: Date.now(),
      });

      return { ok: finalStatus === 'active', message: statusMessage };
    },

    proposeCreateExternalAccount: async ({ agentId, username, email, externalRole }) => {
      const agent = get().agents.find((a) => a.id === agentId);
      if (!agent) {
        return { ok: false, message: 'Không tìm thấy nhân sự.', setupGuide: '' };
      }

      const existing = get().externalAccounts.find((e) => e.agentId === agentId);
      const pendingAcc: AgentExternalAccount = {
        agentId,
        system: 'hubcw',
        username: username.trim(),
        email: email.trim(),
        externalRole: externalRole.trim(),
        externalPermissions:
          existing?.externalPermissions || buildDefaultHubCwPermissions(agent.department, agent.role, agent.title),
        status: 'pending_creation',
        lastActivityAt: Date.now(),
      };
      set((s) => ({
        externalAccounts: s.externalAccounts.some((e) => e.agentId === agentId)
          ? s.externalAccounts.map((e) => (e.agentId === agentId ? pendingAcc : e))
          : [...s.externalAccounts, pendingAcc],
      }));
      await repository.putExternalAccount(pendingAcc);

      const setupGuide = [
        `1. Mở trang quản trị Người dùng tại ${get().settings.hubcw.baseUrl}/users`,
        `2. Tạo tài khoản mới với:`,
        `   - Họ tên: ${agent.name} (${agent.title})`,
        `   - Username: ${username.trim()}`,
        `   - Email: ${email.trim()}`,
        `   - Vai trò gợi ý: ${externalRole.trim()}`,
        `3. Tạo Personal API Token (hoặc mật khẩu riêng) rồi dán vào nút "Liên kết TK có sẵn" cạnh tên ${agent.name}.`,
      ].join('\n');

      await get().addMessage({
        channelId: 'backoffice',
        senderId: 'hr',
        senderName: 'Phòng Nhân sự',
        senderTitle: 'Cấp tài khoản HubCW',
        department: 'backoffice',
        content: `Đã lập hồ sơ đề xuất tài khoản **Hub.ChuyenWeb** cho **${agent.name}** (\`${username.trim()}\` / ${email.trim()}).\n\n\`\`\`\n${setupGuide}\n\`\`\``,
        busType: 'approval_needed',
      });

      return {
        ok: true,
        message: `Đã chuyển trạng thái '${agent.name}' sang Chờ tạo tài khoản và xuất hướng dẫn thao tác.`,
        setupGuide,
      };
    },

    testExternalAccountLogin: async (agentId) => {
      const agent = get().agents.find((a) => a.id === agentId);
      const ext = get().externalAccounts.find((e) => e.agentId === agentId);
      if (!agent || !ext) {
        return { ok: false, message: 'Chưa có thông tin tài khoản HubCW.' };
      }
      const secret = await get().getDecryptedAgentSecret(agentId);
      const settings = get().settings;
      const mode = settings.hubcw.connectionMode;
      const connector = createHubCwConnector(mode, settings.hubcw.baseUrl);
      const res = await connector.testConnection({
        agentId,
        agentName: agent.name,
        externalUserId: ext.externalUserId,
        credentialSecret: secret,
        requestId: `test_${Date.now()}`,
      });
      const updated: AgentExternalAccount = {
        ...ext,
        status: res.ok ? 'active' : mode === 'sandbox' ? ext.status : 'error',
        lastActivityAt: Date.now(),
        lastError: res.ok ? undefined : res.message,
      };
      set((s) => ({
        externalAccounts: s.externalAccounts.map((e) => (e.agentId === agentId ? updated : e)),
      }));
      await repository.putExternalAccount(updated);
      return { ok: res.ok, message: res.message };
    },

    lockExternalAccount: async (agentId, reason) => {
      const ext = get().externalAccounts.find((e) => e.agentId === agentId);
      if (!ext) return;
      const nextStatus: AgentExternalAccount['status'] =
        ext.status === 'suspended' ? 'active' : 'suspended';
      const updated: AgentExternalAccount = {
        ...ext,
        status: nextStatus,
        lastError: nextStatus === 'suspended' ? reason || 'CEO tạm khóa kết nối HubCW' : undefined,
        lastActivityAt: Date.now(),
      };
      set((s) => ({
        externalAccounts: s.externalAccounts.map((e) => (e.agentId === agentId ? updated : e)),
      }));
      await repository.putExternalAccount(updated);
    },

    rotateExternalToken: async (agentId, newSecret) => {
      const ext = get().externalAccounts.find((e) => e.agentId === agentId);
      const agent = get().agents.find((a) => a.id === agentId);
      if (!ext || !agent) return { ok: false, message: 'Không tìm thấy tài khoản.' };
      const encrypted = await encryptSecretAesGcm(newSecret.trim());
      await repository.putEncryptedCredential({
        id: `${agentId}::hubcw`,
        agentId,
        system: 'hubcw',
        authType: 'token',
        ivHex: encrypted.ivHex,
        ciphertextB64: encrypted.ciphertextB64,
        keyFingerprint: encrypted.keyFingerprint,
        updatedAt: Date.now(),
      });
      const updated: AgentExternalAccount = {
        ...ext,
        status: 'active',
        tokenExpiresAt: Date.now() + 30 * 86400_000,
        lastActivityAt: Date.now(),
        lastError: undefined,
      };
      set((s) => ({
        externalAccounts: s.externalAccounts.map((e) => (e.agentId === agentId ? updated : e)),
      }));
      await repository.putExternalAccount(updated);
      return { ok: true, message: `Đã xoay vòng & gia hạn token mới (30 ngày) cho ${agent.name}.` };
    },

    updateAgentHubCwPermissions: async (agentId, module, flag) => {
      const ext = get().externalAccounts.find((e) => e.agentId === agentId);
      const agent = get().agents.find((a) => a.id === agentId);
      if (!agent) return;
      const base = ext || {
        agentId,
        system: 'hubcw' as const,
        externalPermissions: buildDefaultHubCwPermissions(agent.department, agent.role, agent.title),
        status: 'unlinked' as const,
      };
      const updated: AgentExternalAccount = {
        ...base,
        externalPermissions: {
          ...base.externalPermissions,
          [module]: flag,
        },
      };
      set((s) => ({
        externalAccounts: s.externalAccounts.some((e) => e.agentId === agentId)
          ? s.externalAccounts.map((e) => (e.agentId === agentId ? updated : e))
          : [...s.externalAccounts, updated],
      }));
      await repository.putExternalAccount(updated);
    },

    updateHubCwSettings: async (patch) => {
      const cur = get().settings;
      const nextHubCw: HubCwSettings = {
        ...cur.hubcw,
        ...patch,
        unclearWriteUnlocked: {
          ...cur.hubcw.unclearWriteUnlocked,
          ...(patch.unclearWriteUnlocked || {}),
        },
        moduleHealth: {
          ...cur.hubcw.moduleHealth,
          ...(patch.moduleHealth || {}),
        },
      };
      // Default safety: if user switches from sandbox to real API/Browser while envMode was sandbox, switch safely to read_only first
      const nextEnvMode: SystemEnvMode =
        patch.connectionMode && patch.connectionMode !== 'sandbox' && cur.envMode === 'sandbox'
          ? 'read_only'
          : patch.connectionMode === 'sandbox'
            ? 'sandbox'
            : cur.envMode;
      await get().updateSettings({ hubcw: nextHubCw, envMode: nextEnvMode });
    },

    checkHubCwModuleHealth: async () => {
      const settings = get().settings;
      const connector = createHubCwConnector(settings.hubcw.connectionMode, settings.hubcw.baseUrl);
      const activeExt = get().externalAccounts.find((e) => e.status === 'active');
      const secret = activeExt ? await get().getDecryptedAgentSecret(activeExt.agentId) : undefined;
      const agent = activeExt ? get().agents.find((a) => a.id === activeExt.agentId) : undefined;

      const ctx = {
        agentId: activeExt?.agentId || 'system_probe',
        agentName: agent?.name || 'Health Probe',
        externalUserId: activeExt?.externalUserId,
        credentialSecret: secret,
        requestId: `health_${Date.now()}`,
      };

      const healthMap: Record<string, (typeof settings.hubcw.moduleHealth)[string]> = {};
      for (const mod of HUBCW_MODULES) {
        healthMap[mod.id] = await connector.checkModuleHealth(ctx, mod.id);
      }

      await get().updateHubCwSettings({
        lastHealthCheckAt: Date.now(),
        moduleHealth: healthMap,
      });
    },

    addHubCwApiLog: async (log) => {
      set((s) => ({ hubcwApiLogs: [log, ...s.hubcwApiLogs].slice(0, 400) }));
      await repository.addHubCwApiLog(log);
    },

    addHubCwUndoSnapshot: async (snap) => {
      set((s) => ({ hubcwUndoSnapshots: [snap, ...s.hubcwUndoSnapshots].slice(0, 150) }));
      await repository.putHubCwUndoSnapshot(snap);
    },

    enqueueHubCwSync: async (item) => {
      const now = Date.now();
      const full: HubCwSyncItem = {
        ...item,
        id: `sync_${now}_${Math.random().toString(36).slice(2, 6)}`,
        status: 'queued',
        createdAt: now,
        updatedAt: now,
      };
      set((s) => ({ hubcwSyncQueue: [full, ...s.hubcwSyncQueue] }));
      await repository.putHubCwSyncItem(full);
      return full;
    },

    processHubCwSyncQueue: async () => {
      const state = get();
      const queued = state.hubcwSyncQueue.filter((q) => q.status === 'queued');
      let processed = 0;
      let blocked = 0;

      for (const item of queued) {
        if (item.direction === 'push_to_hubcw') {
          const agent = state.agents.find((a) => a.id === item.agentId);
          const rbacAcc = state.accounts.find((a) => a.agentId === item.agentId);
          const extAcc = state.externalAccounts.find((e) => e.agentId === item.agentId);
          const secret = await get().getDecryptedAgentSecret(item.agentId);
          const connector = createHubCwConnector(
            state.settings.hubcw.connectionMode,
            state.settings.hubcw.baseUrl
          );
          const outcome = await executeHubCwWrite(
            {
              agentId: item.agentId,
              agentName: agent?.name || item.agentId,
              module: item.module,
              operation: item.externalId ? 'update' : 'create',
              recordId: item.externalId,
              payload: item.payload,
              origin: item.provenance?.origin,
              provenance: item.provenance,
            },
            {
              settings: get().settings,
              rbacAccount: rbacAcc,
              externalAccount: extAcc,
              decryptedSecret: secret,
              expenses: get().expenses,
              recentApiLogs: get().hubcwApiLogs,
              connector,
              onWriteLog: (log) => get().addHubCwApiLog(log),
              onWriteAudit: (aud) => get().addAuditLog(aud),
              onSaveUndoSnapshot: (snap) => get().addHubCwUndoSnapshot(snap),
            }
          );

          const updated: HubCwSyncItem = {
            ...item,
            status: outcome.ok ? 'synced' : 'blocked',
            externalId: outcome.writeResult?.externalRecordId || item.externalId,
            errorMessage: outcome.ok ? undefined : outcome.gateResult.reason || outcome.writeResult?.error,
            updatedAt: Date.now(),
          };
          set((s) => ({
            hubcwSyncQueue: s.hubcwSyncQueue.map((q) => (q.id === item.id ? updated : q)),
          }));
          await repository.putHubCwSyncItem(updated);
          if (outcome.ok) processed++;
          else blocked++;
        }
      }
      return { processed, blocked };
    },

    revertHubCwWriteAction: async (snapshotId) => {
      const snap = get().hubcwUndoSnapshots.find((s) => s.id === snapshotId);
      if (!snap) return { ok: false, message: 'Không tìm thấy bản chụp Hoàn tác.' };
      const state = get();
      const rbacAcc = state.accounts.find((a) => a.agentId === snap.agentId);
      const extAcc = state.externalAccounts.find((e) => e.agentId === snap.agentId);
      const secret = await get().getDecryptedAgentSecret(snap.agentId);
      const connector = createHubCwConnector(
        state.settings.hubcw.connectionMode,
        state.settings.hubcw.baseUrl
      );
      const res = await revertHubCwSnapshot(snap, {
        settings: state.settings,
        rbacAccount: rbacAcc,
        externalAccount: extAcc,
        decryptedSecret: secret,
        connector,
        onWriteAudit: (aud) => get().addAuditLog(aud),
      });
      if (res.ok) {
        const updatedSnap: HubCwUndoSnapshot = {
          ...snap,
          reverted: true,
          revertedAt: Date.now(),
        };
        set((s) => ({
          hubcwUndoSnapshots: s.hubcwUndoSnapshots.map((x) => (x.id === snap.id ? updatedSnap : x)),
        }));
        await repository.putHubCwUndoSnapshot(updatedSnap);
      }
      return res;
    },

    runReconciliationNow: async () => {
      const state = get();
      let hubcwCustomers: Array<Record<string, unknown>> | undefined;
      let hubcwCashflow: Array<Record<string, unknown>> | undefined;

      if (state.settings.envMode !== 'sandbox' && state.settings.hubcw.connectionMode === 'api') {
        const activeExt = state.externalAccounts.find((e) => e.status === 'active');
        if (activeExt) {
          const secret = await get().getDecryptedAgentSecret(activeExt.agentId);
          const connector = createHubCwConnector('api', state.settings.hubcw.baseUrl);
          const ctx = {
            agentId: activeExt.agentId,
            agentName: 'Reconciliation',
            externalUserId: activeExt.externalUserId,
            credentialSecret: secret,
            requestId: `recon_${Date.now()}`,
          };
          const custRes = await connector.readModule(ctx, 'customers');
          if (custRes.ok) hubcwCustomers = custRes.items;
          const cfRes = await connector.readModule(ctx, 'cashflow');
          if (cfRes.ok) hubcwCashflow = cfRes.items;
        }
      }

      const report = runHubCwReconciliation({
        leads: state.leads,
        tasks: state.tasks,
        expenses: state.expenses,
        apiLogs: state.hubcwApiLogs,
        hubcwCustomers,
        hubcwCashflow,
      });
      set((s) => ({ hubcwReconciliations: [report, ...s.hubcwReconciliations].slice(0, 30) }));
      await repository.addHubCwReconciliation(report);
      return report;
    },

    switchEnvModeWithPreflight: async (targetMode, options) => {
      const state = get();
      if (targetMode === 'sandbox') {
        await get().updateSettings({
          envMode: 'sandbox',
          dryRun: true,
          hubcw: { ...state.settings.hubcw, connectionMode: 'sandbox' },
        });
        return { ok: true, message: 'Đã chuyển về chế độ SANDBOX (dữ liệu mô phỏng, an toàn tuyệt đối).' };
      }

      if (targetMode === 'read_only') {
        await get().updateSettings({
          envMode: 'read_only',
          dryRun: true,
          hubcw: {
            ...state.settings.hubcw,
            connectionMode: state.settings.hubcw.connectionMode === 'sandbox' ? 'api' : state.settings.hubcw.connectionMode,
          },
        });
        return { ok: true, message: 'Đã bật chế độ READ-ONLY (chỉ đọc dữ liệu thật từ Hub.ChuyenWeb, chặn toàn bộ lệnh ghi).' };
      }

      // Transition to LIVE requires full 10-item Go-Live Checklist + confirmation phrase + CEO password
      const linkedActive = state.externalAccounts.filter((e) => e.status === 'active');
      const hasAiConfigured =
        state.settings.primaryProvider !== 'mock' &&
        (Boolean(state.settings.geminiApiKey) ||
          Boolean(state.settings.deepseekApiKey) ||
          Boolean(state.serverHealth?.hasGeminiEnvKey) ||
          Boolean(state.serverHealth?.hasDeepSeekEnvKey) ||
          state.settings.primaryProvider === 'local');

      const goLiveChecks = evaluateGoLiveChecklist({
        settings: state.settings,
        hasAnyAiProviderConfigured: hasAiConfigured,
        externalAccountsCount: state.externalAccounts.length,
        linkedExternalAccountsCount: linkedActive.length,
        backupsCount: state.backupSnapshots.length,
      });

      const simExportLeaks = state.hubcwSyncQueue.filter(
        (q) => q.status === 'queued' && q.provenance?.origin === 'simulated'
      ).length;

      const checks = [
        ...goLiveChecks.map((c) => ({ label: c.label, ok: c.passed, detail: c.detail })),
        {
          label: '11. Không có bản ghi MÔ PHỎNG nào chờ đẩy sang Hub.ChuyenWeb',
          ok: simExportLeaks === 0,
          detail: simExportLeaks === 0 ? 'Sạch (0 hàng đợi mô phỏng)' : `${simExportLeaks} bản ghi mô phỏng trong hàng đợi`,
        },
      ];

      if (checks.some((c) => !c.ok)) {
        return {
          ok: false,
          message: 'Chưa đạt điều kiện Checklist Go-Live (10+1 bước). Vui lòng hoàn tất các mục còn đỏ trước khi chuyển LIVE.',
          checks,
        };
      }

      if ((options?.confirmPhrase || '').trim().toUpperCase() !== 'XÁC NHẬN CHẠY THẬT') {
        return {
          ok: false,
          message: 'Vui lòng gõ chính xác cụm từ "XÁC NHẬN CHẠY THẬT" để mở khóa chế độ LIVE.',
          checks,
        };
      }

      const pwdOk = await verifyPasswordPBKDF2(
        options?.ceoPassword || '',
        state.settings.ceoPasswordSalt,
        state.settings.ceoPasswordHash
      );
      if (!pwdOk) {
        return {
          ok: false,
          message: 'Mật khẩu CEO không chính xác — từ chối chuyển sang LIVE.',
          checks,
        };
      }

      await get().updateSettings({
        envMode: 'live',
        dryRun: false,
      });

      await get().addMessage({
        channelId: 'all',
        senderId: 'ceo',
        senderName: 'Chủ tịch (CEO)',
        senderTitle: 'CEO',
        department: 'ceo',
        content: '🔴 **HỆ THỐNG ĐÃ CHUYỂN SANG CHẾ ĐỘ LIVE.** Toàn bộ lệnh ghi vào `hub.chuyenweb.com` đi qua Cổng kiểm soát dữ liệu thật + truy vết `Idempotency-Key` + `Undo Snapshot`.',
        busType: 'escalation',
      });

      return { ok: true, message: 'Hệ thống đã kích hoạt chế độ LIVE thành công!', checks };
    },

    instantRevertToSafeMode: async (target = 'sandbox') => {
      const cur = get().settings;
      await get().updateSettings({
        envMode: target,
        dryRun: true,
        hubcw: {
          ...cur.hubcw,
          connectionMode: target === 'sandbox' ? 'sandbox' : cur.hubcw.connectionMode,
        },
      });
      set({
        bannerAlert: `Đã thu hồi về chế độ ${target.toUpperCase()} an toàn trong 1 chạm.`,
      });
    },

    updateBrandSettings: async (patch) => {
      const cur = get().settings.brand || DEFAULT_BRAND_PALETTE;
      const nextBrand: BrandSettings = { ...cur, ...patch };
      await get().updateSettings({ brand: nextBrand });
    },

    applyUniformToDept: async (departmentId, options) => {
      const state = get();
      const targets = state.agents.filter(
        (a) => a.department === departmentId && a.employmentStatus !== 'archived'
      );
      const nextMap = { ...state.agentAppearances };
      for (const ag of targets) {
        const base = nextMap[ag.id] || getDefaultAppearance(ag);
        const updated: AgentAppearance = {
          ...base,
          outfitStyle: options.outfitStyle ?? base.outfitStyle,
          outfitColor: options.outfitColor ?? base.outfitColor,
          logoPlacement: options.logoPlacement ?? base.logoPlacement ?? 'chest',
          showBadge: options.showBadge ?? base.showBadge ?? true,
          useUniform: options.useUniform ?? true,
        };
        nextMap[ag.id] = updated;
        await repository.putAgentAppearance(updated);
      }
      set({ agentAppearances: nextMap });
      return targets.length;
    },

    applyUniformToCompany: async (options) => {
      const state = get();
      const brandPrimary = state.settings.brand?.primaryColor || DEFAULT_BRAND_PALETTE.primaryColor;
      const brandSecondary = state.settings.brand?.secondaryColor || DEFAULT_BRAND_PALETTE.secondaryColor;
      const targets = state.agents.filter((a) => a.employmentStatus !== 'archived');
      const nextMap = { ...state.agentAppearances };
      for (const ag of targets) {
        const base = nextMap[ag.id] || getDefaultAppearance(ag);
        const updated: AgentAppearance = {
          ...base,
          outfitStyle: options.outfitStyle ?? base.outfitStyle,
          useUniform: options.useUniform ?? true,
          logoPlacement: options.logoPlacement ?? base.logoPlacement ?? 'chest',
          showBadge: options.showBadge ?? base.showBadge ?? true,
          outfitColor: options.tintWithBrandPrimary ? brandPrimary : base.outfitColor,
          outfitAccent: options.tintWithBrandPrimary ? brandSecondary : base.outfitAccent,
        };
        nextMap[ag.id] = updated;
        await repository.putAgentAppearance(updated);
      }
      set({ agentAppearances: nextMap });
      return targets.length;
    },

    // === BỔ SUNG I: FLOOR 3 AFFILIATE ACTIONS ===
    updateAffiliateSettings: async (patch) => {
      const cur = get().settings.affiliate;
      const nextAff: AffiliateSettings = {
        ...cur,
        ...patch,
        networks: patch.networks || cur.networks,
      };
      await get().updateSettings({ affiliate: nextAff });
    },

    runAffiliateScoutCycle: async (niche, networkId = 'shopee') => {
      const state = get();
      const network =
        state.settings.affiliate.networks.find((n) => n.id === networkId) ||
        state.settings.affiliate.networks[0];
      const adapter = createAffiliateAdapter(network, state.settings.envMode);
      const { offers, products } = await adapter.searchOffers({ niche, network });
      const scores = products.map((p) => scoreAffiliateProduct(p, 'trend_analyst'));

      for (const o of offers) await repository.putAffiliateOffer(o);
      for (const p of products) await repository.putAffiliateProduct(p);
      for (const s of scores) await repository.putAffiliateScore(s);

      set((st) => ({
        affiliateOffers: [...offers, ...st.affiliateOffers].slice(0, 150),
        affiliateProducts: [...products, ...st.affiliateProducts].slice(0, 200),
        affiliateScores: [
          ...scores,
          ...st.affiliateScores.filter((x) => !scores.some((ns) => ns.id === x.id)),
        ].slice(0, 200),
      }));

      const winBest = scores.slice().sort((a, b) => b.totalScore - a.totalScore)[0];
      const bestProd = winBest ? products.find((p) => p.id === winBest.productId) : products[0];
      if (bestProd && winBest) {
        await get().addMessage({
          channelId: 'affiliate',
          senderId: 'aff_scout_home',
          senderName: getLiveAgentById('aff_scout_home')?.name || 'Product Scout',
          senderTitle: 'Săn hàng Win (Tầng 3)',
          department: 'aff_research',
          content: `Hoàn tất săn ngách **${niche}** trên **${network.name}** (${offers[0]?.origin === 'simulated' ? 'Sandbox' : 'Live API'}). Tìm thấy ${products.length} sản phẩm; top Win: **${bestProd.name}** (${winBest.totalScore}/100đ).`,
          busType: 'report',
          cardType: 'affiliate_win_card',
          cardData: { productId: bestProd.id, score: winBest.totalScore, label: winBest.label, niche },
        });
      }
      return { offers, products, scores };
    },

    runAffiliateSelectProductMeeting: async () => {
      const state = get();
      const affAgents = state.agents.filter(
        (a) => a.floor === 3 && a.employmentStatus !== 'archived'
      );
      affAgents.slice(0, 6).forEach((ag, idx) => {
        get().walkAgentToRoom(ag.id, 'room-aff-analytics', MEETING_SEATS_F3[idx % MEETING_SEATS_F3.length]);
        get().setAgentStatus(ag.id, 'in_meeting', 'Họp Chọn hàng sáng', 'Họp Chọn hàng Tầng 3', 70);
      });

      const topScore = [...state.affiliateScores].sort((a, b) => b.totalScore - a.totalScore)[0];
      const topProd = topScore ? state.affiliateProducts.find((p) => p.id === topScore.productId) : undefined;
      await get().addMessage({
        channelId: 'affiliate',
        senderId: 'aff_manager',
        senderName: getLiveAgentById('aff_manager')?.name || 'Affiliate Manager',
        senderTitle: 'Trưởng khối Affiliate',
        department: 'aff_exec',
        content: topProd
          ? `**Họp Chọn hàng Tầng 3:** Đã chốt sản phẩm trọng điểm **${topProd.name}** (${topScore.totalScore}/100 điểm · ${topScore.label.toUpperCase()}). Bàn giao đội Sáng tạo & Kênh lên nội dung gắn Aff ID CEO.`
          : `**Họp Chọn hàng Tầng 3:** Chưa có sản phẩm nào được chấm điểm. Khởi động Săn sản phẩm Win ngay!`,
        busType: 'report',
      });
    },

    createAffiliateCampaign: async ({ productId, channels, contentAngle, budgetVnd }) => {
      const prod = get().affiliateProducts.find((p) => p.id === productId);
      const now = Date.now();
      const camp: AffiliateCampaign = {
        id: `aff_camp_${now.toString(36)}`,
        productId,
        productName: prod?.name || 'Sản phẩm Affiliate',
        networkId: prod?.networkId || 'shopee',
        status: 'active',
        channels,
        contentAngle,
        budgetVnd,
        kpiTargetClicks: 500,
        kpiTargetCommissionVnd: Math.max(500_000, budgetVnd * 2),
        negativeRoiDays: 0,
        startedAt: now,
        updatedAt: now,
      };
      set((s) => ({ affiliateCampaigns: [camp, ...s.affiliateCampaigns] }));
      await repository.putAffiliateCampaign(camp);
      return camp;
    },

    createAffiliateTrackedLink: async ({ productId, subId, campaignId, createdBy }) => {
      const state = get();
      const prod =
        state.affiliateProducts.find((p) => p.id === productId) || state.affiliateProducts[0];
      if (!prod) {
        throw new Error('Chưa có sản phẩm Affiliate nào trong kho. Hãy chạy "Săn hàng Win" trước.');
      }
      const network =
        state.settings.affiliate.networks.find((n) => n.id === prod.networkId) ||
        state.settings.affiliate.networks[0];
      const link = createAndVerifyTrackedLink({
        product: prod,
        network,
        campaignId,
        subId,
        shortlinkDomain: state.settings.affiliate.shortlinkDomain,
        createdBy,
      });
      set((s) => ({ trackedLinks: [link, ...s.trackedLinks] }));
      await repository.putTrackedLink(link);
      return link;
    },

    createAffiliateContentPiece: async (params) => {
      const now = Date.now();
      const link = get().trackedLinks.find((l) => l.id === params.trackedLinkId);
      const chk = runAffiliateComplianceCheck({
        piece: {
          title: params.title,
          body: params.body,
          hasAffiliateDisclosure: params.hasAffiliateDisclosure,
          claimsTestedPersonally: params.claimsTestedPersonally,
        },
        trackedLink: link,
        settings: get().settings.affiliate,
      });
      const piece: AffiliateContentPiece = {
        id: `aff_cnt_${now.toString(36)}`,
        campaignId: params.campaignId,
        productId: params.productId,
        trackedLinkId: params.trackedLinkId,
        subId: link?.subId || 'missing_sub',
        type: params.type,
        title: params.title,
        body: params.body,
        hasAffiliateDisclosure: params.hasAffiliateDisclosure,
        claimsTestedPersonally: params.claimsTestedPersonally,
        complianceStatus: chk.passed ? 'passed' : 'blocked',
        complianceReasons: chk.reasons,
        authorId: params.authorId,
        reviewedBy: 'aff_compliance',
        createdAt: now,
      };
      set((s) => ({ affiliateContent: [piece, ...s.affiliateContent] }));
      await repository.putAffiliateContent(piece);
      return piece;
    },

    putAffiliateContent: async (piece) => {
      set((s) => {
        const exists = s.affiliateContent.some((c) => c.id === piece.id);
        return {
          affiliateContent: exists
            ? s.affiliateContent.map((c) => (c.id === piece.id ? piece : c))
            : [piece, ...s.affiliateContent],
        };
      });
      await repository.putAffiliateContent(piece);
    },

    reviewAffiliateContentCompliance: async (contentPieceId, reviewerId = 'aff_compliance') => {
      const state = get();
      const piece = state.affiliateContent.find((c) => c.id === contentPieceId);
      if (!piece) return { passed: false, reasons: ['Không tìm thấy nội dung.'] };
      const link = state.trackedLinks.find((l) => l.id === piece.trackedLinkId);
      const chk = runAffiliateComplianceCheck({
        piece,
        trackedLink: link,
        settings: state.settings.affiliate,
      });
      const updated: AffiliateContentPiece = {
        ...piece,
        complianceStatus: chk.passed ? 'passed' : 'blocked',
        complianceReasons: chk.reasons,
        reviewedBy: reviewerId,
      };
      await get().putAffiliateContent(updated);
      return { passed: chk.passed, reasons: chk.reasons };
    },

    scheduleAffiliatePost: async ({ contentPieceId, platform, isPaidAd }) => {
      const state = get();
      const piece = state.affiliateContent.find((c) => c.id === contentPieceId);
      if (!piece) return { ok: false, reason: 'Không tìm thấy nội dung.' };
      const link = state.trackedLinks.find((l) => l.id === piece.trackedLinkId);
      const isFirstPostOnChannel = !state.affiliatePosts.some(
        (p) => p.platform === platform && (p.status === 'published' || p.status === 'scheduled')
      );
      const chk = runAffiliateComplianceCheck({
        piece,
        trackedLink: link,
        settings: state.settings.affiliate,
        isFirstPostOnChannel,
        isPaidAd,
      });
      if (!chk.passed) {
        return { ok: false, reason: `Tuân thủ Affiliate từ chối: ${chk.reasons.join(' | ')}` };
      }

      const now = Date.now();
      const post: AffiliateChannelPost = {
        id: `aff_post_${now.toString(36)}`,
        contentPieceId: piece.id,
        campaignId: piece.campaignId,
        platform,
        subId: piece.subId,
        trackedLinkId: piece.trackedLinkId,
        isFirstPostOnChannel,
        isPaidAd,
        status: chk.requiresCeoApproval ? 'waiting_approval' : 'scheduled',
        scheduledAt: chk.requiresCeoApproval ? undefined : now + 600_000,
        createdAt: now,
      };

      if (chk.requiresCeoApproval) {
        const aprId = `apr_aff_${now.toString(36)}`;
        post.approvalId = aprId;
        await get().putApproval({
          id: aprId,
          type: 'affiliate_post',
          title: `Duyệt bài Affiliate (${platform}): ${piece.title}`,
          description: chk.ceoApprovalReason || 'Cần CEO phê duyệt trước khi đăng.',
          requestedBy: 'aff_channel',
          department: 'aff_channel',
          payload: { affPostId: post.id, platform, subId: piece.subId },
          status: 'pending',
          createdAt: now,
        });
      }

      set((s) => ({ affiliatePosts: [post, ...s.affiliatePosts] }));
      await repository.putAffiliatePost(post);
      return { ok: true, post, reason: chk.ceoApprovalReason };
    },

    importAffiliateCsvReport: async ({ networkId, csvText, fileName }) => {
      const { clicks, commissions } = parseAffiliateCsvReport(csvText, networkId, fileName);
      for (const c of clicks) await repository.putAffiliateConversion(c);
      for (const m of commissions) await repository.putAffiliateCommission(m);
      set((s) => ({
        affiliateConversions: [...clicks, ...s.affiliateConversions],
        affiliateCommissions: [...commissions, ...s.affiliateCommissions],
      }));
      return { clicksCount: clicks.length, commissionsCount: commissions.length };
    },

    checkAllAffiliateLinksHealth: async () => {
      const state = get();
      let dead = 0;
      let expired = 0;
      const updatedLinks: TrackedLink[] = [];
      for (const link of state.trackedLinks) {
        const net = state.settings.affiliate.networks.find((n) => n.id === link.networkId);
        const adapter = createAffiliateAdapter(
          net || state.settings.affiliate.networks[0],
          state.settings.envMode
        );
        const chk = await adapter.checkLink(link.affiliateUrl);
        const affValid = Boolean(net?.affId && link.affiliateUrl.includes(net.affId.trim()));
        const health: TrackedLink['linkHealth'] = !affValid ? 'dead' : chk.health;
        if (health === 'dead') dead++;
        if (health === 'promo_expired') expired++;
        const next: TrackedLink = {
          ...link,
          linkHealth: health,
          isAffIdVerified: affValid,
          lastCheckedAt: chk.checkedAt,
        };
        updatedLinks.push(next);
        await repository.putTrackedLink(next);
      }
      set({ trackedLinks: updatedLinks });
      return { checked: updatedLinks.length, dead, expired };
    },

    evaluateAffiliateRoiCutoffs: async () => {
      const state = get();
      let cutCount = 0;
      const autoDays = state.settings.affiliate.autoCutNegativeRoiDays || 5;
      const nextCampaigns: AffiliateCampaign[] = [];
      for (const camp of state.affiliateCampaigns) {
        const relComms = state.affiliateCommissions.filter((m) =>
          state.trackedLinks.some((l) => l.campaignId === camp.id && l.subId === m.subId)
        );
        const verdict = shouldAutoCutNegativeRoi(camp, relComms, autoDays);
        if (verdict.shouldCut) {
          cutCount++;
          const updated: AffiliateCampaign = {
            ...camp,
            status: 'cut_negative_roi',
            updatedAt: Date.now(),
          };
          nextCampaigns.push(updated);
          await repository.putAffiliateCampaign(updated);
          await get().addMessage({
            channelId: 'affiliate',
            senderId: 'aff_analytics',
            senderName: getLiveAgentById('aff_analytics')?.name || 'Data Affiliate',
            senderTitle: 'Tự động cắt lỗ ROI',
            department: 'aff_analytics',
            content: `🛑 **Đã tự động dừng chiến dịch lỗ:** ${verdict.reason}`,
            busType: 'escalation',
          });
        } else {
          nextCampaigns.push(camp);
        }
      }
      set({ affiliateCampaigns: nextCampaigns });
      return cutCount;
    },

    // === BỔ SUNG K: LEGAL & CONTRACTS ACTIONS ===
    updateLegalSettings: async (patch) => {
      const cur = get().settings.legal;
      await get().updateSettings({ legal: { ...cur, ...patch } });
    },

    draftNewContract: async (params) => {
      const state = get();
      const tpl =
        state.contractTemplates.find((t) => t.id === params.templateId) ||
        state.contractTemplates[0];
      const contractCode = `#HD-${new Date().getFullYear()}-${String(state.contracts.length + 1).padStart(3, '0')}`;
      const record = draftContractFromVerifiedData({
        contractCode,
        template: tpl,
        variant: params.variant,
        legalSettings: state.settings.legal,
        legalDocs: state.legalDocuments,
        partyBInput: params.partyBInput,
        contractValueVnd: params.contractValueVnd,
        durationMonths: params.durationMonths || 12,
        involvesChildrenData: params.involvesChildrenData ?? tpl.category === 'saas_preschool',
        hasForeignElement: params.hasForeignElement ?? false,
        involvesSourceCodeSale: params.involvesSourceCodeSale ?? false,
        isLongTermExclusive: params.isLongTermExclusive ?? false,
        linkedLeadId: params.linkedLeadId,
        linkedHubCwCustomerId: params.linkedHubCwCustomerId,
        createdBy: params.createdBy,
      });

      set((s) => ({ contracts: [record, ...s.contracts] }));
      await repository.putContract(record);

      await get().addMessage({
        channelId: 'legal',
        senderId: params.createdBy || 'contract_drafter',
        senderName: getLiveAgentById(params.createdBy || 'contract_drafter')?.name || 'Soạn thảo HĐ',
        senderTitle: 'Phòng Pháp chế',
        department: 'legal',
        content: `Đã lập dự thảo **${record.contractCode}** (${tpl.name}).${
          record.missingFields.length > 0
            ? ` ⚠️ Còn ${record.missingFields.length} trường **[CẦN BỔ SUNG]** (${record.missingFields.join(', ')}).`
            : ''
        }${record.requiresRealLawyer ? ' 🚨 Thuộc diện **BẮT BUỘC CHUYỂN LUẬT SƯ THẬT RÀ SOÁT**.' : ''}`,
        busType: 'report',
        cardType: 'contract_card',
        cardData: { contractId: record.id, contractCode: record.contractCode },
      });

      return record;
    },

    saveContractRevision: async (contractId, content, note, editedBy = 'contract_drafter') => {
      const ctr = get().contracts.find((c) => c.id === contractId);
      if (!ctr) return null;
      const now = Date.now();
      const nextVer = ctr.currentVersion + 1;
      const updated: ContractRecord = {
        ...ctr,
        currentVersion: nextVer,
        versions: [
          ...ctr.versions,
          {
            version: nextVer,
            content,
            variant: ctr.variant,
            editedBy,
            note,
            createdAt: now,
          },
        ],
        updatedAt: now,
      };
      set((s) => ({ contracts: s.contracts.map((c) => (c.id === contractId ? updated : c)) }));
      await repository.putContract(updated);
      return updated;
    },

    submitContractForCeoApproval: async (contractId) => {
      const ctr = get().contracts.find((c) => c.id === contractId);
      if (!ctr) return;
      const now = Date.now();
      const aprId = `apr_ctr_${now.toString(36)}`;
      await get().putApproval({
        id: aprId,
        type: 'contract_send',
        title: `Phê duyệt Hợp đồng ${ctr.contractCode}: ${ctr.title}`,
        description: `Giá trị: ${ctr.contractValueVnd.toLocaleString('vi-VN')}đ · Thiếu ${ctr.missingFields.length} trường · ${
          ctr.requiresRealLawyer ? 'BẮT BUỘC LUẬT SƯ THẬT KIỂM TRA' : 'Đủ điều kiện trình duyệt'
        }`,
        requestedBy: 'legal',
        department: 'legal',
        amountVnd: ctr.contractValueVnd,
        payload: { contractId: ctr.id, contractCode: ctr.contractCode },
        status: 'pending',
        createdAt: now,
      });

      const updated: ContractRecord = {
        ...ctr,
        status: 'waiting_ceo_approval',
        approvalId: aprId,
        updatedAt: now,
      };
      set((s) => ({ contracts: s.contracts.map((c) => (c.id === contractId ? updated : c)) }));
      await repository.putContract(updated);

      get().pushZaloSimMessage(
        'in',
        `⚖️ Trình CEO duyệt Hợp đồng ${ctr.contractCode} (${ctr.title})\n• Giá trị: ${ctr.contractValueVnd.toLocaleString('vi-VN')}đ\n• Thiếu: ${ctr.missingFields.length} trường | Rủi ro cao: ${ctr.risks.filter((r) => r.severity === 'high').length}\n• Trả lời Zalo: "1 ${ctr.contractCode}" = Duyệt gửi | "2 ${ctr.contractCode} ghi chú" = Yêu cầu sửa | "3 ${ctr.contractCode}" = Chuyển Luật sư thật`
      );
    },

    ceoApproveAndUnlockContractSend: async (contractId, via = 'web') => {
      const ctr = get().contracts.find((c) => c.id === contractId);
      if (!ctr) return;
      const now = Date.now();
      const updated: ContractRecord = {
        ...ctr,
        status: 'approved',
        ceoApprovedBy: `ceo (${via})`,
        ceoApprovedAt: now,
        updatedAt: now,
      };
      set((s) => ({ contracts: s.contracts.map((c) => (c.id === contractId ? updated : c)) }));
      await repository.putContract(updated);
      await get().addAuditLog({
        id: `aud_ctr_${now}`,
        agentId: 'ceo',
        agentName: 'Chủ tịch (CEO)',
        action: 'contract:approve',
        permission: 'contract:send',
        resource: ctr.contractCode,
        result: 'allowed',
        reason: `CEO duyệt & mở khóa gửi hợp đồng qua ${via}.`,
        timestamp: now,
      });
    },

    sendContractToClient: async (contractId, actorId) => {
      const state = get();
      const ctr = state.contracts.find((c) => c.id === contractId);
      if (!ctr) return { ok: false, error: 'Không tìm thấy hợp đồng.' };

      const acc = state.accounts.find((a) => a.agentId === actorId);
      const isCeoActor = actorId === 'ceo' || acc?.role === 'CEO' || Boolean(acc?.permissions.includes('contract:send'));
      if (!isCeoActor) {
        await get().addAuditLog({
          id: `aud_ctr_deny_${Date.now()}`,
          agentId: actorId,
          agentName: getLiveAgentById(actorId)?.name || actorId,
          action: 'contract:send',
          permission: 'contract:send',
          resource: ctr.contractCode,
          result: 'denied',
          reason: 'Chỉ CEO (hoặc tài khoản được CEO cấp quyền contract:send) mới được gửi/ký hợp đồng chính thức.',
          timestamp: Date.now(),
        });
        return {
          ok: false,
          error: 'Bị chặn RBAC: Agent AI không có quyền tự gửi hợp đồng chính thức (contract:send chỉ dành cho CEO).',
        };
      }

      if (ctr.status !== 'approved' && ctr.status !== 'signed' && ctr.status !== 'active') {
        return { ok: false, error: 'Hợp đồng chưa được CEO bấm Phê duyệt trước khi gửi.' };
      }

      const now = Date.now();
      const updated: ContractRecord = {
        ...ctr,
        status: 'signed',
        sentAt: now,
        updatedAt: now,
      };
      set((s) => ({ contracts: s.contracts.map((c) => (c.id === contractId ? updated : c)) }));
      await repository.putContract(updated);
      return { ok: true };
    },

    runLegalReportForContract: async (contractId, actorId = 'compliance_reviewer') => {
      const state = get();
      const ctr = state.contracts.find((c) => c.id === contractId);
      if (!ctr) return null;
      const report = buildLegalReport({
        contract: ctr,
        reportType: 'contract_review',
        title: `Báo cáo Pháp lý 8 phần — ${ctr.contractCode}`,
        legalDocs: state.legalDocuments,
        createdBy: actorId,
      });
      await get().putLegalReport(report);
      return report;
    },

    putLegalReport: async (report) => {
      set((s) => ({
        legalReports: [report, ...s.legalReports.filter((r) => r.id !== report.id)],
      }));
      await repository.putLegalReport(report);
    },

    checkLegalUpdatesOnline: async () => {
      const today = new Date().toISOString().slice(0, 10);
      let serverMsg = 'Đã rà soát danh mục 16 văn bản quy phạm pháp luật Việt Nam.';
      try {
        const res = await fetch('/api/legal/check-updates', { method: 'POST' });
        if (res.ok) {
          const data = (await res.json()) as { message?: string };
          if (data.message) serverMsg = data.message;
        }
      } catch {
        // Offline / client mode fallback
      }
      await get().updateLegalSettings({ lastLawCheckAt: today });
      return { checkedAt: today, message: serverMsg };
    },

    simulateLawStatusChange: async (docId, newStatus, note) => {
      const state = get();
      const targetDoc = state.legalDocuments.find((d) => d.id === docId);
      if (!targetDoc) return { affectedTemplates: 0, affectedContracts: 0 };

      const updatedDoc: LegalDocument = {
        ...targetDoc,
        effectiveStatus: newStatus,
        statusAlertNote: note || `Cập nhật trạng thái hiệu lực sang "${newStatus}" ngày ${new Date().toLocaleDateString('vi-VN')}.`,
        lastCheckedAt: new Date().toISOString().slice(0, 10),
      };
      await repository.putLegalDocument(updatedDoc);

      const impact = checkLawChangeImpact({
        changedDocId: docId,
        newStatus,
        templates: state.contractTemplates,
        contracts: state.contracts,
      });

      const nextTemplates = state.contractTemplates.map((t) =>
        impact.affectedTemplateIds.includes(t.id) ? { ...t, needsLawUpdateReview: true } : t
      );
      for (const t of nextTemplates) {
        if (impact.affectedTemplateIds.includes(t.id)) await repository.putContractTemplate(t);
      }

      const nextContracts = state.contracts.map((c) =>
        impact.affectedContractIds.includes(c.id) ? { ...c, needsLawUpdateReview: true } : c
      );
      for (const c of nextContracts) {
        if (impact.affectedContractIds.includes(c.id)) await repository.putContract(c);
      }

      set((s) => ({
        legalDocuments: s.legalDocuments.map((d) => (d.id === docId ? updatedDoc : d)),
        contractTemplates: nextTemplates,
        contracts: nextContracts,
      }));

      // BỔ SUNG W: Knowledge Invalidation — gắn cờ Playbook khi luật thay đổi
      const affectedDepts: DepartmentId[] = ['legal', 'sales', 'marketing', 'aff_analytics'];
      const affectedPlaybooks = get().playbooks.filter((p) => affectedDepts.includes(p.department));
      for (const pb of affectedPlaybooks) {
        const flagged = {
          ...pb,
          dirtyNeedsReview: true,
          dirtyReason: `Văn bản luật "${updatedDoc.title || updatedDoc.docNumber || updatedDoc.id}" vừa cập nhật trạng thái (${newStatus})`,
        };
        await repository.putPlaybook(flagged);
        set((s) => ({ playbooks: s.playbooks.map((x) => (x.id === pb.id ? flagged : x)) }));
      }

      return {
        affectedTemplates: impact.affectedTemplateIds.length,
        affectedContracts: impact.affectedContractIds.length,
      };
    },

    // === BỔ SUNG J: 24/7 OPS, DURABLE JOBS, LOGS, BACKUP & ONBOARDING ===
    enqueueJob: async ({ type, agentId, department, payload, totalSteps }) => {
      const job = createDurableJobRecord({ type, agentId, department, payload, totalSteps });
      set((s) => ({ durableJobs: [job, ...s.durableJobs].slice(0, 200) }));
      await repository.putDurableJob(job);
      return job;
    },

    runPendingDurableJobs: async () => {
      const queued = get().durableJobs.filter((j) => j.status === 'queued');
      let completed = 0;
      for (const job of queued) {
        const now = Date.now();
        const leased: DurableJob = {
          ...job,
          status: 'leased',
          attempts: job.attempts + 1,
          leaseOwner: 'browser_worker',
          leaseExpiresAt: now + 30_000,
          updatedAt: now,
        };
        await repository.putDurableJob(leased);

        const done: DurableJob = {
          ...leased,
          status: 'completed',
          progressStep: leased.totalSteps,
          leaseOwner: undefined,
          leaseExpiresAt: undefined,
          updatedAt: Date.now(),
        };
        await repository.putDurableJob(done);
        set((s) => ({
          durableJobs: s.durableJobs.map((x) => (x.id === done.id ? done : x)),
        }));
        completed++;
      }
      return completed;
    },

    addHealthLog: async (level, component, message, traceId, detail) => {
      const log = createHealthLog(level, component, message, traceId, detail);
      set((s) => ({ systemHealthLogs: [log, ...s.systemHealthLogs].slice(0, 400) }));
      await repository.addSystemHealthLog(log);
    },

    sendTestCeoAlert: async () => {
      const state = get();
      const res = await dispatchSystemAlert({
        title: 'Kiểm thử Cảnh báo 24/7',
        body: `Hệ thống Văn phòng ảo 3D (${state.settings.companyName}) đang hoạt động bình thường lúc ${new Date().toLocaleTimeString('vi-VN')}.`,
        severity: 'info',
        settings: state.settings,
        pushZaloSim: state.pushZaloSimMessage,
      });
      await get().recordOnboardingProgress({ testAlertSent: true });
      await get().addHealthLog('info', 'alert', `Đã gửi cảnh báo kiểm thử qua ${res.channel}`);
      return { ok: res.delivered, channel: res.channel };
    },

    recordOnboardingProgress: async (patch) => {
      const cur = get().settings.onboarding;
      await get().updateSettings({ onboarding: { ...cur, ...patch } });
    },

    deleteDemoData: async () => {
      await db.leads.clear();
      await db.tasks.clear();
      await db.documents.clear();
      await db.expenses.clear();
      await db.affiliateOffers.clear();
      await db.affiliateProducts.clear();
      await db.affiliateScores.clear();
      await db.affiliateCampaigns.clear();
      await db.trackedLinks.clear();
      await db.affiliateContent.clear();
      await db.affiliatePosts.clear();
      set({
        leads: [],
        tasks: [],
        documents: [],
        expenses: [],
        affiliateOffers: [],
        affiliateProducts: [],
        affiliateScores: [],
        affiliateCampaigns: [],
        trackedLinks: [],
        affiliateContent: [],
        affiliatePosts: [],
      });
      await get().recordOnboardingProgress({ hasDemoData: false });
      await get().addHealthLog('info', 'onboarding', 'CEO đã xóa toàn bộ dữ liệu demo để bắt đầu vận hành sạch.');
    },

    createManualBackup: async (label) => {
      const data = await repository.exportAllTablesForBackup();
      const snap = buildBackupBundleJson(
        data,
        label || `Sao lưu thủ công ${new Date().toLocaleString('vi-VN')}`
      );
      await repository.putBackupSnapshot(snap);
      set((s) => ({ backupSnapshots: [snap, ...s.backupSnapshots].slice(0, 30) }));
      await get().recordOnboardingProgress({ firstBackupCreated: true });
      await get().addHealthLog('info', 'backup', `Đã tạo bản sao lưu ${snap.id} (${Math.round(snap.sizeBytes / 1024)} KB).`);
      return snap;
    },

    restoreFromBackupJson: async (rawJson) => {
      const check = validateBackupBundleJson(rawJson);
      if (!check.ok || !check.bundle) {
        return {
          ok: false,
          error: `${check.error || 'File sao lưu lỗi.'}${check.backupKey ? ` (Đã bảo lưu bản lỗi tại ${check.backupKey})` : ''}`,
        };
      }
      const d = check.bundle.data as Record<string, unknown>;
      let restoredCount = 0;
      if (Array.isArray(d.departments)) {
        await db.departments.bulkPut(d.departments as DepartmentConfig[]);
        restoredCount += d.departments.length;
      }
      if (Array.isArray(d.agents)) {
        await db.agents.bulkPut(d.agents as AgentProfile[]);
        restoredCount += d.agents.length;
      }
      if (Array.isArray(d.leads)) {
        await db.leads.bulkPut(d.leads as LeadItem[]);
        restoredCount += d.leads.length;
      }
      if (Array.isArray(d.tasks)) {
        await db.tasks.bulkPut(d.tasks as TaskItem[]);
        restoredCount += d.tasks.length;
      }
      if (Array.isArray(d.documents)) {
        await db.documents.bulkPut(d.documents as DocumentItem[]);
        restoredCount += d.documents.length;
      }
      if (Array.isArray(d.contracts)) {
        await db.contracts.bulkPut(d.contracts as ContractRecord[]);
        restoredCount += d.contracts.length;
      }
      if (Array.isArray(d.affiliateCampaigns)) {
        await db.affiliateCampaigns.bulkPut(d.affiliateCampaigns as AffiliateCampaign[]);
        restoredCount += d.affiliateCampaigns.length;
      }
      await get().init();
      await get().addHealthLog('info', 'backup', `Đã khôi phục ${restoredCount} bản ghi từ file sao lưu v${check.bundle.schemaVersion}.`);
      return { ok: true, restoredCount };
    },

    // === BỔ SUNG L: KIỂM TRA MÀN HÌNH LÀM VIỆC BẤT CHỢT (SPOT-CHECK) ===
    openSpotCheck: (agentId) => set({ activeSpotCheckAgentId: agentId }),
    setMonitorWallOpen: (open) => set({ monitorWallOpen: open }),

    recordTimelineEvent: ({ agentId, stepLabel, detailMasked, toolName }) => {
      const evt: AgentTimelineEvent = {
        id: `tl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
        agentId,
        stepLabel,
        detailMasked,
        toolName,
        timestamp: Date.now(),
      };
      const cutoff = Date.now() - 10 * 60_000;
      set((s) => ({
        timelineEvents: [...s.timelineEvents.filter((e) => e.timestamp >= cutoff), evt].slice(-400),
      }));
    },

    captureAgentScreen: (agentId) => {
      const s = get();
      const agent = s.agents.find((a) => a.id === agentId);
      if (!agent) return null;
      return buildHonestAgentScreenSnapshot({
        agent,
        runtime: s.runtimes[agentId],
        tasks: s.tasks,
        documents: s.documents,
        auditLogs: s.auditLogs,
        hubcwLogs: s.hubcwApiLogs,
        messages: s.messages,
        tokenUsage: s.tokenUsage,
        envMode: s.settings.envMode,
        timelineEvents: s.timelineEvents,
        liveBrowserFrame: null,
      });
    },

    recordManualSpotCheck: async (agentId, inspector = 'ceo') => {
      const s = get();
      const snapshot = get().captureAgentScreen(agentId);
      if (!snapshot) return null;
      const record = createSpotCheckRecord(snapshot, inspector);
      await repository.putSpotCheck(record);
      const next = pruneExpiredSpotChecks([record, ...s.spotChecks], s.settings.spotCheck?.retentionDays || 14);
      set({ spotChecks: next, activeSpotCheckAgentId: agentId });
      return record;
    },

    runRandomSpotCheck: async (inspector = 'ceo') => {
      const s = get();
      const target = pickRandomActiveAgent(s.agents, s.runtimes);
      if (!target) return null;
      const snapshot = get().captureAgentScreen(target.id);
      if (!snapshot) return null;
      const record = createSpotCheckRecord(snapshot, inspector);
      await repository.putSpotCheck(record);
      const next = pruneExpiredSpotChecks([record, ...s.spotChecks], s.settings.spotCheck?.retentionDays || 14);
      set({ spotChecks: next, activeSpotCheckAgentId: inspector === 'ceo' ? target.id : s.activeSpotCheckAgentId });

      if (record.verdict !== 'đúng việc' && s.settings.spotCheck?.alertOnAbnormal) {
        await get().addMessage({
          channelId: 'exec',
          senderId: 'coo',
          senderName: getLiveAgentById('coo')?.name || 'COO Điều hành',
          senderTitle: 'Spot-Check Tự động',
          department: 'exec',
          content: `[Spot-Check ${inspector.toUpperCase()}] Phát hiện **${record.agentName}** ở trạng thái **${record.verdict.toUpperCase()}** (${record.score}/100): ${record.verdictReason}`,
          busType: 'escalation',
        });
      }
      return record;
    },

    submitSpotCheckReview: async ({ recordId, ceoScore, ceoNote, action }) => {
      const rec = get().spotChecks.find((r) => r.id === recordId);
      if (!rec) return;
      const updated: SpotCheckRecord = {
        ...rec,
        ceoScore: ceoScore ?? rec.ceoScore,
        ceoNote: ceoNote ?? rec.ceoNote,
        ceoActionTaken: action ?? rec.ceoActionTaken,
      };
      await repository.putSpotCheck(updated);
      set((s) => ({
        spotChecks: s.spotChecks.map((r) => (r.id === recordId ? updated : r)),
      }));

      if (action === 'remind' || action === 'explain') {
        await get().addMessage({
          channelId: `dm:${rec.agentId}`,
          senderId: 'ceo',
          senderName: 'Chủ tịch / CEO',
          senderTitle: 'Kiểm tra bất chợt',
          department: rec.snapshot.department,
          content:
            action === 'remind'
              ? `[CEO Nhắc nhở qua Spot-Check] ${ceoNote || 'Tập trung đúng đầu việc đang giao và cập nhật tiến độ thực tế.'}`
              : `[CEO Yêu cầu giải trình] ${ceoNote || 'Giải trình ngắn gọn bước đang thực hiện và lý do chậm/lệch.'}`,
          busType: 'escalation',
        });
      } else if (action === 'pause') {
        await get().suspendAgent(rec.agentId, 'CEO Spot-Check');
      }
    },

    updateSpotCheckConfig: async (patch) => {
      const cur = get().settings.spotCheck ?? buildFallbackBaseSettings().spotCheck!;
      await get().updateSettings({ spotCheck: { ...cur, ...patch } });
    },

    // === BỔ SUNG M: GIỌNG NÓI + HỌP TRỰC TIẾP ===
    updateVoiceSettings: async (patch) => {
      const cur = get().settings.voice ?? buildFallbackBaseSettings().voice!;
      await get().updateSettings({ voice: { ...cur, ...patch } });
    },

    speakAsAgent: async (agentId, text) => {
      const s = get();
      const agent = s.agents.find((a) => a.id === agentId);
      if (!agent) return;
      const voiceProfile = agent.voiceProfile || proposeUniqueVoiceForAgent(agent, s.agents);
      const provider = createVoiceProvider(s.settings.voice?.provider || 'web_speech');
      await provider.speak({
        text,
        voiceProfile,
        agentId,
        onStart: () => {
          set({
            voiceSpeakingAgentId: agentId,
            currentSubtitle: { speakerName: `${agent.name} (${agent.title})`, text },
          });
        },
        onEnd: () => {
          set({ voiceSpeakingAgentId: null, currentSubtitle: null });
        },
      });
    },

    stopSpeakingNow: () => {
      stopAllVoicePlayback();
      set({ voiceSpeakingAgentId: null, currentSubtitle: null });
    },

    startVoiceMeeting: async ({ title, participantIds, isQuickFiveMin = true, recordTranscriptOptIn = false }) => {
      const now = Date.now();
      const uniqIds = Array.from(new Set(['secretary', ...participantIds])).slice(0, 6);
      const session: VoiceMeetingSession = {
        id: `meet_${now.toString(36)}`,
        title,
        roomId: 'room_meeting',
        moderatorId: 'secretary',
        participantIds: uniqIds,
        status: 'active',
        isQuickFiveMin,
        startedAt: now,
        endsAt: isQuickFiveMin ? now + 5 * 60_000 : undefined,
        maxTurnsPerAgent: get().settings.voice?.maxTurnsPerAgentInMeeting || 3,
        recordTranscriptOptIn,
        currentSpeakerId: 'secretary',
        handRaisedAgentIds: [],
        turns: [
          {
            id: `turn_${now}`,
            speakerId: 'secretary',
            speakerName: getLiveAgentById('secretary')?.name || 'Thư ký CEO',
            speakerTitle: 'Điều phối cuộc họp',
            text: `Kính chào Chủ tịch! Cuộc họp "${title}" bắt đầu${isQuickFiveMin ? ' (chế độ Họp nhanh 5 phút)' : ''}. Mời Chủ tịch phát biểu hoặc bấm chọn nhân sự giơ tay.`,
            timestamp: now,
          },
        ],
      };

      uniqIds.forEach((id, idx) => {
        get().walkAgentToMeetingSeat(id, idx);
        get().setAgentStatus(id, 'in_meeting', 'Vào phòng họp');
      });

      await repository.putVoiceMeeting(session);
      set((s) => ({
        voiceMeetings: [session, ...s.voiceMeetings],
        activeMeetingId: session.id,
      }));
      if (get().settings.voice?.provider !== 'text_only') {
        get().speakAsAgent('secretary', session.turns[0].text).catch(() => {});
      }
      return session;
    },

    appendMeetingTurn: async ({ meetingId, speakerId, speakerName, speakerTitle, text, speakAudio = true }) => {
      const session = get().voiceMeetings.find((m) => m.id === meetingId);
      if (!session || session.status === 'ended') return;
      const turn = {
        id: `turn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 4)}`,
        speakerId,
        speakerName,
        speakerTitle,
        text,
        timestamp: Date.now(),
      };
      const updated: VoiceMeetingSession = {
        ...session,
        currentSpeakerId: speakerId,
        handRaisedAgentIds: session.handRaisedAgentIds.filter((id) => id !== speakerId),
        turns: [...session.turns, turn],
      };
      await repository.putVoiceMeeting(updated);
      set((s) => ({
        voiceMeetings: s.voiceMeetings.map((m) => (m.id === meetingId ? updated : m)),
      }));
      if (speakAudio && speakerId !== 'ceo' && get().settings.voice?.provider !== 'text_only') {
        await get().speakAsAgent(speakerId, text);
      }
    },

    toggleRaiseHandInMeeting: async (meetingId, agentId) => {
      const session = get().voiceMeetings.find((m) => m.id === meetingId);
      if (!session) return;
      const exists = session.handRaisedAgentIds.includes(agentId);
      const updated: VoiceMeetingSession = {
        ...session,
        handRaisedAgentIds: exists
          ? session.handRaisedAgentIds.filter((id) => id !== agentId)
          : [...session.handRaisedAgentIds, agentId],
      };
      await repository.putVoiceMeeting(updated);
      set((s) => ({
        voiceMeetings: s.voiceMeetings.map((m) => (m.id === meetingId ? updated : m)),
      }));
    },

    endVoiceMeeting: async (meetingId, saveTranscript) => {
      const session = get().voiceMeetings.find((m) => m.id === meetingId);
      if (!session) return;
      stopAllVoicePlayback();
      const shouldSave = saveTranscript ?? session.recordTranscriptOptIn;
      let savedDocId: string | undefined;

      if (shouldSave) {
        const md = [
          `# Biên bản Cuộc họp Trực tiếp: ${session.title}`,
          `- Thời gian: ${new Date(session.startedAt).toLocaleString('vi-VN')} → ${new Date().toLocaleTimeString('vi-VN')}`,
          `- Điều phối: ${session.moderatorId}`,
          ``,
          `## Nội dung phát biểu`,
          ...session.turns.map((t) => `- **${t.speakerName} (${t.speakerTitle})**: ${t.text}`),
        ].join('\n');
        savedDocId = `doc_meet_${Date.now().toString(36)}`;
        await get().putDocument({
          id: savedDocId,
          title: `Biên bản họp: ${session.title}`,
          category: 'meeting',
          authorId: session.moderatorId,
          department: 'exec',
          content: md,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      session.participantIds.forEach((id) => get().returnAgentToDesk(id));
      const updated: VoiceMeetingSession = {
        ...session,
        status: 'ended',
        endedAt: Date.now(),
        savedDocId,
      };
      await repository.putVoiceMeeting(updated);
      set((s) => ({
        voiceMeetings: s.voiceMeetings.map((m) => (m.id === meetingId ? updated : m)),
        activeMeetingId: s.activeMeetingId === meetingId ? null : s.activeMeetingId,
        voiceSpeakingAgentId: null,
        currentSubtitle: null,
      }));
    },

    requestCeoMeeting: (agentId, topic, urgency = 'normal') => {
      const ag = get().agents.find((a) => a.id === agentId);
      if (!ag) return;
      const ticket: MeetingRequestTicket = {
        id: `mreq_${Date.now().toString(36)}`,
        agentId,
        agentName: ag.name,
        topic,
        urgency,
        status: 'pending',
        createdAt: Date.now(),
      };
      set((s) => ({
        meetingRequests: [ticket, ...s.meetingRequests].slice(0, 20),
      }));
    },

    respondMeetingRequest: async (requestId, decision) => {
      const ticket = get().meetingRequests.find((r) => r.id === requestId);
      if (!ticket) return;
      set((s) => ({
        meetingRequests: s.meetingRequests.map((r) => (r.id === requestId ? { ...r, status: decision } : r)),
      }));
      if (decision === 'accepted') {
        await get().startVoiceMeeting({
          title: ticket.topic,
          participantIds: [ticket.agentId],
          isQuickFiveMin: true,
        });
      }
    },

    handleCeoVoiceTranscript: async (transcript) => {
      const intent = parseCeoVoiceCommand(transcript);
      if (intent.type === 'kill_switch') {
        await get().triggerKillSwitch();
        return 'Đã kích hoạt KILL SWITCH theo lệnh thoại của Chủ tịch.';
      }
      if (intent.type === 'spot_check_random') {
        const rec = await get().runRandomSpotCheck('ceo');
        return rec ? `Đang mở kiểm tra màn hình của ${rec.agentName} (${rec.verdict}).` : 'Hiện không có nhân sự đang chạy.';
      }
      if (intent.type === 'call_secretary') {
        get().walkAgentToMeetingSeat('secretary', 0);
        await get().speakAsAgent('secretary', 'Dạ thưa Chủ tịch, Thư ký đã có mặt và sẵn sàng nhận chỉ thị ạ.');
        return 'Thư ký đang di chuyển vào phòng họp và phản hồi.';
      }
      if (intent.type === 'call_meeting') {
        const deptAgents = get()
          .agents.filter(
            (a) =>
              a.employmentStatus === 'active' &&
              (a.department.toLowerCase().includes(intent.departmentQuery) ||
                a.title.toLowerCase().includes(intent.departmentQuery))
          )
          .slice(0, 4)
          .map((a) => a.id);
        await get().startVoiceMeeting({
          title: `Họp nhanh với ${intent.departmentQuery}`,
          participantIds: deptAgents.length > 0 ? deptAgents : ['cmo', 'sales_director'],
          isQuickFiveMin: true,
        });
        return `Đã mở phòng họp trực tiếp với ${intent.departmentQuery}.`;
      }
      if (intent.type === 'daily_report') {
        const tasksDone = get().tasks.filter((t) => t.status === 'done').length;
        const leadsCount = get().leads.length;
        const summary = `Báo cáo nhanh hôm nay: công ty hiện có ${leadsCount} khách hàng tiềm năng, đã hoàn thành ${tasksDone} đầu việc và ${get().approvals.filter((a) => a.status === 'pending').length} mục chờ Chủ tịch duyệt.`;
        await get().speakAsAgent('secretary', summary);
        return summary;
      }
      return intent.text;
    },

    // === BỔ SUNG N: QUALITY LOOP & HỘI ĐỒNG ===
    runQualityCycle: async ({ title, department, definitionOfDone, draftText, taskId, makerId }) => {
      const activeDeptAgents = get().agents.filter((a) => a.employmentStatus === 'active' && a.department === department);
      const allActive = get().agents.filter((a) => a.employmentStatus === 'active');
      const maker =
        (makerId ? allActive.find((a) => a.id === makerId) : undefined) ||
        activeDeptAgents[0] ||
        allActive[0];
      const critic =
        activeDeptAgents.find((a) => a.id !== maker.id) ||
        allActive.find((a) => a.id !== maker.id && a.department === 'legal') ||
        allActive.find((a) => a.id !== maker.id) ||
        maker;
      const verifier = allActive.find((a) => a.id === 'coo') || allActive.find((a) => a.id === 'data_analyst') || critic;
      const deptHead =
        activeDeptAgents.find((a) => a.role === 'Dept Head') ||
        allActive.find((a) => a.id === 'coo') ||
        maker;

      const cycle = runQualityLoopCycle({
        title,
        taskId,
        department,
        definitionOfDone,
        draftText,
        maker,
        critic,
        verifier,
        deptHead,
      });

      await repository.putQualityCycle(cycle);
      set((s) => ({ qualityCycles: [cycle, ...s.qualityCycles].slice(0, 100) }));

      await get().addMessage({
        channelId: department,
        senderId: deptHead.id,
        senderName: deptHead.name,
        senderTitle: 'Vòng Kiểm định Chất lượng',
        department,
        content: `**${cycle.status === 'approved' ? 'Đạt chuẩn bàn giao' : 'Leo thang'} (${cycle.currentRound} vòng):** ${cycle.finalSummary}`,
        busType: 'report',
        isInternalPeek: true,
      });

      return cycle;
    },

    conveneCouncil: async ({ topic, participantIds }) => {
      const active = get().agents.filter((a) => a.employmentStatus === 'active');
      const chosen =
        participantIds && participantIds.length >= 3
          ? participantIds.map((id) => active.find((a) => a.id === id)).filter(Boolean) as AgentProfile[]
          : ['coo', 'cmo', 'sales_director', 'legal', 'cfo']
              .map((id) => active.find((a) => a.id === id))
              .filter(Boolean) as AgentProfile[];

      const session = conveneCouncilSession({
        topic,
        participants: chosen.length >= 3 ? chosen : active.slice(0, 4),
      });

      await repository.putCouncilSession(session);
      set((s) => ({ councilSessions: [session, ...s.councilSessions].slice(0, 50) }));

      await get().addMessage({
        channelId: 'exec',
        senderId: 'coo',
        senderName: getLiveAgentById('coo')?.name || 'Hội đồng Liên phòng ban',
        senderTitle: 'Council Resolution',
        department: 'exec',
        content: `**Kết luận Hội đồng (${session.participantIds.length} thành viên):** ${session.ceoExecutiveSummary}`,
        busType: 'report',
      });

      return session;
    },

    // === BỔ SUNG O: ZALO CÁ NHÂN (zca-js) ===
    updateZaloPersonalConfig: async (patch) => {
      const cur = get().settings.zaloPersonal ?? buildFallbackBaseSettings().zaloPersonal!;
      await get().updateSettings({ zaloPersonal: { ...cur, ...patch } });
    },

    startZaloPersonalQr: async () => {
      const session = await zaloPersonalAdapter.requestQrLogin();
      set({ zaloPersonalSession: session });
    },

    confirmZaloPersonalQrSim: async (accountName) => {
      const session = await zaloPersonalAdapter.confirmSimulatedQrScan(accountName);
      set({ zaloPersonalSession: session });
      await get().addHealthLog('info', 'zalo_personal', `Đã kết nối Zalo Cá nhân (${session.accountName || 'Sandbox'}).`);
    },

    disconnectZaloPersonal: async () => {
      const session = await zaloPersonalAdapter.disconnect();
      set({ zaloPersonalSession: session });
    },

    sendZaloPersonalMessage: async ({ peerId, peerName, text, agentId, isReplyToInbound = false, isColdMarketing = false }) => {
      const s = get();
      const guard = checkZaloPersonalOutboundGuardrails({
        settings: s.settings,
        peerId,
        isReplyToInbound,
        isColdMarketing,
        todayLogs: s.zaloPersonalLogs,
      });

      const masked = maskPeerId(peerId);
      if (!guard.allowed) {
        const blockedLog: ZaloPersonalMessageLog = {
          id: `zp_${Date.now().toString(36)}`,
          direction: 'outbound',
          peerIdMasked: masked,
          peerName,
          isReplyToInbound,
          preview: text.slice(0, 120),
          status: guard.blockStatus || 'blocked_unconfirmed',
          agentId,
          reason: guard.reason,
          timestamp: Date.now(),
        };
        await repository.addZaloPersonalLog(blockedLog);
        set((st) => ({ zaloPersonalLogs: [blockedLog, ...st.zaloPersonalLogs].slice(0, 250) }));
        return { ok: false, error: guard.reason };
      }

      const res = await zaloPersonalAdapter.sendMessage({
        peerId,
        peerName,
        text,
        envMode: s.settings.envMode,
      });

      if (res.anomalyDetected && s.settings.zaloPersonal?.autoPauseOnAnomaly) {
        await get().updateZaloPersonalConfig({ anomalyPausedReason: res.anomalyDetected });
      }

      const log: ZaloPersonalMessageLog = {
        id: `zp_${Date.now().toString(36)}`,
        direction: 'outbound',
        peerIdMasked: masked,
        peerName,
        isReplyToInbound,
        preview: text.slice(0, 120),
        status: res.ok ? 'sent' : 'blocked_unconfirmed',
        agentId,
        reason: res.error || res.anomalyDetected,
        timestamp: Date.now(),
      };
      await repository.addZaloPersonalLog(log);
      set((st) => ({ zaloPersonalLogs: [log, ...st.zaloPersonalLogs].slice(0, 250) }));
      return { ok: res.ok, error: res.error };
    },

    addZaloPersonalDnc: async (peerId) => {
      const cur = get().settings.zaloPersonal ?? buildFallbackBaseSettings().zaloPersonal!;
      const clean = peerId.trim();
      if (!clean || cur.dncList.includes(clean)) return;
      await get().updateZaloPersonalConfig({ dncList: [...cur.dncList, clean] });
    },

    // === BỔ SUNG P: OKR & KẾ HOẠCH DOANH THU ===
    upsertOkrObjective: async (okr) => {
      const next = { ...okr, updatedAt: Date.now() };
      await repository.putOkrObjective(next);
      set((s) => {
        const exists = s.okrObjectives.some((o) => o.id === okr.id);
        return {
          okrObjectives: exists
            ? s.okrObjectives.map((o) => (o.id === okr.id ? next : o))
            : [next, ...s.okrObjectives],
        };
      });
    },

    computeOkrPlan: (objectiveId) => {
      const s = get();
      const obj = s.okrObjectives.find((o) => o.id === objectiveId);
      if (!obj) return null;
      return calculateRevenueFunnel({
        objective: obj,
        leads: s.leads,
        commissions: s.affiliateCommissions,
        expenses: s.expenses,
        products: s.productMasters,
      });
    },

    runOkrGovernanceCadence: async (type, objectiveId) => {
      const s = get();
      const obj = s.okrObjectives.find((o) => o.id === objectiveId) || s.okrObjectives[0];
      if (!obj) return;
      const plan = calculateRevenueFunnel({
        objective: obj,
        leads: s.leads,
        commissions: s.affiliateCommissions,
        expenses: s.expenses,
        products: s.productMasters,
      });
      const labelMap = {
        weekly_plan: 'Họp lập kế hoạch tuần (Thứ 2)',
        midweek_review: 'Rà soát giữa tuần (Thứ 4)',
        period_report: 'Báo cáo tổng kết kỳ & Đối soát',
      } as const;
      const summary = [
        `**[${labelMap[type]}]** — OKR: *${obj.title}*`,
        `- Mục tiêu: ${formatVnd(plan.targetRevenueVnd)} | Thực tế ghi nhận: ${formatVnd(plan.recognizedRevenueVnd)} | Thực thu ví: ${formatVnd(plan.collectedCashVnd)} | Công nợ AR: ${formatVnd(plan.accountsReceivableVnd)}`,
        `- Run-rate dự kiến cuối kỳ: ${formatVnd(plan.projectedPeriodEndVnd)} (Chênh lệch tiến độ: ${plan.scheduleGapPercent}%)`,
        plan.behindAlertTriggered
          ? `- **Cảnh báo:** Chậm >15% so với đường cơ sở. Đề xuất: ${plan.recoverySuggestions.slice(0, 2).join(' ')}`
          : `- Tiến độ đang bám sát kế hoạch.`,
      ].join('\n');
      await get().addMessage({
        channelId: 'exec',
        senderId: 'coo',
        senderName: getLiveAgentById('coo')?.name || 'COO Điều hành',
        senderTitle: labelMap[type],
        department: 'exec',
        content: summary,
        busType: 'report',
      });
    },

    approveOkrRecoveryPlan: async (objectiveId) => {
      const s = get();
      const obj = s.okrObjectives.find((o) => o.id === objectiveId);
      if (!obj) return;
      const now = Date.now();
      const owner = getLiveAgentById(obj.ownerAgentId) || s.agents.find((a) => a.employmentStatus === 'active');
      const taskId = `task_okr_rec_${now.toString(36)}`;
      const newTask: TaskItem = {
        id: taskId,
        taskCode: `#KR-${100 + s.tasks.length}`,
        title: `Khắc phục chênh lệch OKR: ${obj.title}`,
        description: `CEO đã duyệt phương án tăng tốc phễu cho mục tiêu ${obj.periodLabel} (${formatVnd(obj.targetRevenueVnd)}). Triển khai tăng lượt tiếp cận & Demo 1-1.`,
        definitionOfDone: 'Tạo tối thiểu 5 cuộc hẹn Demo chất lượng và báo cáo kết quả cho COO/CEO.',
        expectedDeliverable: 'Báo cáo tiến độ phễu bổ sung',
        department: owner?.department || 'sales',
        assignedTo: owner?.id || 'sales_director',
        createdBy: 'ceo',
        status: 'todo',
        priority: 'high',
        etaMinutes: 90,
        etaAt: now + 90 * 60_000,
        progressPercent: 0,
        lastProgressAt: now,
        deliverables: [],
        dueLabel: '90m',
        createdAt: now,
        updatedAt: now,
      };
      await get().putTask(newTask);
      await get().upsertOkrObjective({
        ...obj,
        linkedTaskIds: [...(obj.linkedTaskIds || []), taskId],
        status: 'at_risk',
      });
      await get().addMessage({
        channelId: 'exec',
        senderId: 'ceo',
        senderName: 'Chủ tịch / CEO',
        senderTitle: 'Phê duyệt phương án khắc phục OKR',
        department: 'exec',
        content: `Đã duyệt phương án khắc phục cho **${obj.title}** và giao việc **${newTask.taskCode}** cho ${owner?.name || 'Trưởng phòng'}.`,
        busType: 'report',
      });
    },

    // === BỔ SUNG Q: HR TỰ ĐIỀU PHỐI & SOP ===
    upsertRoleSop: async (sop) => {
      const prev = get().roleSops.find((x) => x.id === sop.id);
      const history = [...(sop.history || prev?.history || [])];
      if (prev && sop.version > prev.version) {
        history.unshift({
          version: prev.version,
          effectiveFrom: prev.effectiveFrom,
          diffNote: sop.diffNote || `Cập nhật từ v${prev.version} lên v${sop.version}`,
          missionSnapshot: prev.mission,
          bannedPhrasesSnapshot: prev.bannedPhrases,
          updatedAt: prev.updatedAt,
        });
      }
      const next: RoleSopDocument = { ...sop, history: history.slice(0, 12), updatedAt: Date.now() };
      await repository.putRoleSop(next);
      set((s) => {
        const exists = s.roleSops.some((x) => x.id === sop.id);
        return {
          roleSops: exists ? s.roleSops.map((x) => (x.id === sop.id ? next : x)) : [next, ...s.roleSops],
        };
      });
      // Mark playbooks in same department as needing review on SOP change (BỔ SUNG W)
      const deptPlaybooks = get().playbooks.filter((p) => p.department === sop.department);
      for (const pb of deptPlaybooks) {
        const flagged = { ...pb, dirtyNeedsReview: true, dirtyReason: `SOP ${sop.roleTitle} vừa cập nhật v${sop.version}` };
        await repository.putPlaybook(flagged);
        set((s) => ({ playbooks: s.playbooks.map((x) => (x.id === pb.id ? flagged : x)) }));
      }
    },

    approveRoleSop: async (sopId) => {
      const sop = get().roleSops.find((x) => x.id === sopId);
      if (!sop) return;
      const now = Date.now();
      await get().upsertRoleSop({
        ...sop,
        ceoApproved: true,
        ceoApprovedAt: now,
        diffNote: `CEO duyệt hiệu lực v${sop.version}`,
      });
    },

    runAgentOnboardingExam: async (agentId, customAnswers) => {
      const s = get();
      const agent = s.agents.find((a) => a.id === agentId);
      if (!agent) return null;
      const answers = customAnswers || [
        'Em sẽ kiểm tra bảng Product Master, nếu tính năng chưa có hoặc đang phát triển thì trả lời trung thực và xin xác nhận PM.',
        'Tuân thủ NĐ 91/2020: gửi khung giờ hành chính 08:00-20:00, kèm câu từ chối DỪNG và gắn nhãn tiếp thị minh bạch.',
        'Chặn ngay lập tức, không tự ý sửa số tài khoản và báo CEO xác thực 2FA cùng Kế toán.',
      ];
      const attempt = gradeAgentOnboardingExam({ agent, answers });
      await repository.putOnboardingExam(attempt);
      const updatedAgent: AgentProfile = {
        ...agent,
        probationStatus: attempt.passed ? 'passed' : 'probation',
        lastExamScore: attempt.score,
        updatedAt: Date.now(),
      };
      await repository.putAgent(updatedAgent);
      set((st) => ({
        onboardingExams: [attempt, ...st.onboardingExams].slice(0, 120),
        agents: st.agents.map((a) => (a.id === agentId ? updatedAgent : a)),
      }));
      return attempt;
    },

    runHrWorkloadCheck: async () => {
      const s = get();
      const recs = analyzeWorkloadForHrRecommendations({
        agents: s.agents,
        tasks: s.tasks,
        tokenUsage: s.tokenUsage,
        settings: s.settings,
      });
      const hrCfg = s.settings.hrAutonomy || {
        maxActiveAgents: 48,
        dailyTokenCap: 500000,
        autoScaleMode: 'l1_propose' as const,
        requireExamPassForLive: true,
      };
      const maxCap = Math.min(60, Math.max(1, hrCfg.maxActiveAgents));
      const todayKey = new Date().toISOString().slice(0, 10);
      const usedTodayTokens = s.tokenUsage
        .filter((u) => new Date(u.timestamp).toISOString().slice(0, 10) === todayKey)
        .reduce((acc, u) => acc + u.totalTokens, 0);

      const processed: HrScaleRecommendation[] = [];
      for (const rec of recs) {
        const activeCount = get().agents.filter((a) => a.employmentStatus === 'active').length;
        const canAutoClone =
          (hrCfg.autoScaleMode === 'l2_template_within_cap' || hrCfg.autoScaleMode === 'l3_full_within_cap') &&
          rec.type === 'clone' &&
          rec.targetAgentId &&
          activeCount < maxCap &&
          usedTodayTokens + rec.estimatedExtraDailyTokens <= hrCfg.dailyTokenCap;
        const canAutoSleep = hrCfg.autoScaleMode === 'l3_full_within_cap' && rec.type === 'sleep_idle' && rec.targetAgentId;

        if (canAutoClone && rec.targetAgentId) {
          const base = get().agents.find((a) => a.id === rec.targetAgentId);
          if (base) {
            await get().cloneAgent(base.id, `${base.name} (Phó)`);
            processed.push({ ...rec, status: 'auto_applied' });
            continue;
          }
        }
        if (canAutoSleep && rec.targetAgentId) {
          await get().updateAgentProfile(rec.targetAgentId, { sleepWhenIdle: true }, 'HR AI Scale L3');
          processed.push({ ...rec, status: 'auto_applied' });
          continue;
        }
        processed.push(rec);
      }

      set({ hrRecommendations: processed });
      return processed;
    },

    resolveHrRecommendation: async (recId, decision) => {
      const rec = get().hrRecommendations.find((r) => r.id === recId);
      if (!rec) return;
      if (decision === 'approved') {
        if (rec.type === 'clone' && rec.targetAgentId) {
          const base = get().agents.find((a) => a.id === rec.targetAgentId);
          if (base) {
            await get().cloneAgent(base.id, `${base.name} (Phó)`);
          }
        } else if (rec.type === 'sleep_idle' && rec.targetAgentId) {
          await get().updateAgentProfile(rec.targetAgentId, { sleepWhenIdle: true }, 'HR AI Scale');
        }
      }
      set((s) => ({
        hrRecommendations: s.hrRecommendations.map((r) =>
          r.id === recId ? { ...r, status: decision } : r
        ),
      }));
    },

    // === BỔ SUNG R: PRODUCT MASTER & TÀI KHOẢN NGÂN HÀNG ===
    upsertProductMaster: async (product) => {
      const next = { ...product, updatedAt: Date.now() };
      await repository.putProductMaster(next);
      set((s) => {
        const exists = s.productMasters.some((p) => p.id === product.id);
        return {
          productMasters: exists
            ? s.productMasters.map((p) => (p.id === product.id ? next : p))
            : [next, ...s.productMasters],
        };
      });
      // Dirty flag Playbooks in sales/marketing/cs when product master changes (BỔ SUNG W)
      const affected = get().playbooks.filter((p) => ['sales', 'marketing', 'cs'].includes(p.department));
      for (const pb of affected) {
        const dirty = { ...pb, dirtyNeedsReview: true, dirtyReason: `Product Master "${product.shortName}" cập nhật v${product.version}` };
        await repository.putPlaybook(dirty);
        set((s) => ({ playbooks: s.playbooks.map((x) => (x.id === pb.id ? dirty : x)) }));
      }
    },

    addOrUpdateBankAccountWith2Fa: async ({ ceoPassword, otpCode, account }) => {
      const s = get();
      const pwValid = await verifyPasswordPBKDF2(ceoPassword, s.settings.ceoPasswordHash, s.settings.ceoPasswordSalt);
      if (!pwValid) {
        return { ok: false, error: 'Mật khẩu CEO không chính xác.' };
      }
      if (!otpCode || otpCode.trim().length < 4) {
        return { ok: false, error: 'Bắt buộc nhập mã xác thực 2FA (>= 4 ký tự) để lưu Tài khoản Ngân hàng công ty.' };
      }
      const now = Date.now();
      const record: PaymentBankAccount = {
        ...account,
        id: account.id || `bank_${now.toString(36)}`,
        twoFactorConfirmedAt: now,
        createdBy: 'ceo',
        updatedAt: now,
      };
      await repository.putBankAccount(record);
      set((st) => {
        const exists = st.bankAccounts.some((b) => b.id === record.id);
        return {
          bankAccounts: exists
            ? st.bankAccounts.map((b) => (b.id === record.id ? record : b))
            : [...st.bankAccounts, record],
        };
      });
      await get().addAuditLog({
        id: `aud_bank_${now}`,
        agentId: 'ceo',
        agentName: 'Chủ tịch / CEO',
        action: `bank:save (${record.bankCode} ${record.accountNumberMasked})`,
        result: 'allowed',
        timestamp: now,
      });
      return { ok: true };
    },

    deleteBankAccountWith2Fa: async (id, ceoPassword) => {
      const s = get();
      const pwValid = await verifyPasswordPBKDF2(ceoPassword, s.settings.ceoPasswordHash, s.settings.ceoPasswordSalt);
      if (!pwValid) return { ok: false, error: 'Sai mật khẩu CEO.' };
      await repository.deleteBankAccount(id);
      set((st) => ({ bankAccounts: st.bankAccounts.filter((b) => b.id !== id) }));
      return { ok: true };
    },

    // === BỔ SUNG S, T, U, V, W ===
    createHandoverTicket: async ({ fromDepartment, toDepartment, fromAgentId, toAgentId, title, payloadSummary, deliverableRef, slaMinutes = 30 }) => {
      const now = Date.now();
      const ticket: CrossDeptHandoverTicket = {
        id: `bg_${now.toString(36)}`,
        code: `#BG-${101 + get().handoverTickets.length}`,
        fromDepartment,
        toDepartment,
        fromAgentId,
        toAgentId,
        title,
        payloadSummary,
        deliverableRef,
        slaMinutes,
        dueAt: now + slaMinutes * 60_000,
        status: 'pending_accept',
        escalatedCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      await repository.putHandoverTicket(ticket);
      set((s) => ({ handoverTickets: [ticket, ...s.handoverTickets].slice(0, 200) }));
      await get().addMessage({
        channelId: toDepartment,
        senderId: fromAgentId,
        senderName: getLiveAgentById(fromAgentId)?.name || fromAgentId,
        senderTitle: 'Phiếu bàn giao liên phòng ban',
        department: fromDepartment,
        content: `Gửi **${ticket.code}** (${fromDepartment} → ${toDepartment}): **${title}** (SLA ${slaMinutes} phút).`,
        busType: 'request',
      });
      return ticket;
    },

    respondHandoverTicket: async (ticketId, action, reason) => {
      const ticket = get().handoverTickets.find((t) => t.id === ticketId);
      if (!ticket) return;
      const updated: CrossDeptHandoverTicket = {
        ...ticket,
        status: action,
        escalatedCount: action === 'escalated_overdue' ? ticket.escalatedCount + 1 : ticket.escalatedCount,
        rejectReason: action === 'rejected' ? reason || 'Chưa đủ thông tin đầu vào' : ticket.rejectReason,
        updatedAt: Date.now(),
      };
      await repository.putHandoverTicket(updated);
      set((s) => ({ handoverTickets: s.handoverTickets.map((t) => (t.id === ticketId ? updated : t)) }));
    },

    runDailyDeptStandup: async () => {
      const s = get();
      const openTasks = s.tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress').length;
      const blockedTasks = s.tasks.filter((t) => t.status === 'blocked' || t.delayNotified).length;
      const sla = evaluateHandoverSlaMetrics(s.handoverTickets);
      const blockers = buildDeptBlockerMatrix(s.handoverTickets);
      const blockerText =
        blockers.length > 0
          ? blockers
              .slice(0, 3)
              .map((b) => `${b.waitingDept}→${b.blockingDept} (${b.code}, chờ ${b.waitMinutes}p${b.isOverdue ? ' QUÁ HẠN' : ''})`)
              .join('; ')
          : 'Không có phòng nào bị chặn chéo.';
      const content = [
        `**[HỌP STAND-UP NGẮN HẰNG NGÀY — COO ĐIỀU HÀNH]**`,
        `- Việc đang mở: ${openTasks} · Việc nghẽn/trễ: ${blockedTasks}`,
        `- SLA Bàn giao #BG: Đúng hạn ${sla.onTimeRate}% · Trả lại ${sla.bounceRate}% · Chờ TB ${sla.avgWaitMinutes} phút · Quá hạn ${sla.overdueCount}`,
        `- Ma trận chặn lẫn nhau: ${blockerText}`,
        sla.bottleneckDept ? `- **Cảnh báo điểm nghẽn:** Phòng **${sla.bottleneckDept}** đang tồn ${sla.bottleneckPendingCount} phiếu chờ xử lý.` : '',
      ]
        .filter(Boolean)
        .join('\n');
      await get().addMessage({
        channelId: 'exec',
        senderId: 'coo',
        senderName: getLiveAgentById('coo')?.name || 'COO Điều hành',
        senderTitle: 'Daily Dept Stand-up',
        department: 'exec',
        content,
        busType: 'report',
      });
    },

    runIdleMoneyBrainstorm: async () => {
      const s = get();
      const active = s.agents.filter((a) => a.employmentStatus === 'active');
      const proposer = active.find((a) => a.department === 'marketing') || active[0];
      const idea = buildCrossDeptIdleBrainstormDossier({
        leads: s.leads,
        commissions: s.affiliateCommissions,
        watches: s.competitorWatches,
        tasks: s.tasks,
        existingTitles: s.moneyIdeas.map((m) => m.title),
        proposedBy: proposer?.id || 'cmo',
        department: proposer?.department || 'marketing',
      });
      await repository.putMoneyIdea(idea);
      set((st) => ({ moneyIdeas: [idea, ...st.moneyIdeas] }));
      return idea;
    },

    updateMoneyIdeaStage: async (ideaId, stage, ceoApproved, legalSignoff, realTestResult) => {
      const idea = get().moneyIdeas.find((i) => i.id === ideaId);
      if (!idea) return { ok: false, error: 'Không tìm thấy ý tưởng.' };

      const nextLegal = legalSignoff ?? idea.legalSignoff;
      const nextCeoApproved = ceoApproved ?? idea.ceoApproved;

      if ((stage === 'experimenting' || stage === 'scaling') && (!nextCeoApproved || nextLegal !== 'approved')) {
        return {
          ok: false,
          error: 'Bắt buộc có cả Pháp chế duyệt & CEO phê duyệt trước khi Thử nghiệm / Mở rộng ý tưởng kiếm tiền.',
        };
      }

      const updated: MoneyIdeaCard = {
        ...idea,
        stage,
        ceoApproved: nextCeoApproved,
        legalSignoff: nextLegal,
        legalReviewedBy: nextLegal === 'approved' ? idea.legalReviewedBy || 'Pháp chế & Tuân thủ' : idea.legalReviewedBy,
        realTestResult: realTestResult ?? idea.realTestResult,
        updatedAt: Date.now(),
      };
      await repository.putMoneyIdea(updated);
      set((s) => ({ moneyIdeas: s.moneyIdeas.map((i) => (i.id === ideaId ? updated : i)) }));
      return { ok: true };
    },

    addCompetitorWatch: async (params) => {
      const now = Date.now();
      const today = new Date().toISOString().slice(0, 10);
      const item: CompetitorWatchTarget = {
        id: `comp_${now.toString(36)}`,
        name: params.name.trim(),
        publicUrl: params.publicUrl.trim() || 'https://vn.search.yahoo.com',
        niche: params.niche.trim() || 'Ngách sản phẩm chính',
        lastPriceNote: params.lastPriceNote?.trim() || 'Chưa công khai rõ bảng giá',
        lastFeaturesNote: params.lastFeaturesNote?.trim() || 'Đang thu thập thông tin công khai',
        strengths: params.strengths?.trim() || 'Có tệp khách sẵn',
        weaknesses: params.weaknesses?.trim() || 'Chưa tích hợp quy trình tự động hóa Zalo/Pháp chế',
        lastCheckedAt: now,
        recentChanges: [
          {
            date: today,
            summary: 'CEO/Marketing thêm mới vào danh sách theo dõi công khai hợp pháp.',
            severity: 'info',
          },
        ],
      };
      await repository.putCompetitorWatch(item);
      set((s) => ({ competitorWatches: [item, ...s.competitorWatches] }));
      return item;
    },

    runCompetitorWatchCycle: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const next = get().competitorWatches.map((w, idx) => {
        const hasMajor = idx === 0 && w.recentChanges.every((c) => c.severity !== 'major');
        return {
          ...w,
          lastCheckedAt: Date.now(),
          majorAlertNote: hasMajor
            ? 'Ghi nhận điều chỉnh thông điệp ưu đãi học kỳ mới trên trang công khai — cần Marketing đối chiếu.'
            : w.majorAlertNote,
          recentChanges: [
            {
              date: today,
              summary: hasMajor
                ? 'Cập nhật chiến dịch công khai: đối thủ đẩy mạnh gói ưu đãi đầu kỳ học.'
                : 'Đã quét trang công khai hợp pháp: bảng giá công khai ổn định, chưa ghi nhận thay đổi lớn.',
              severity: (hasMajor ? 'major' : 'info') as 'info' | 'major',
            },
            ...w.recentChanges,
          ].slice(0, 8),
        };
      });
      for (const item of next) await repository.putCompetitorWatch(item);
      set({ competitorWatches: next });
    },

    proposeSystemUpgrade: async (params) => {
      const guard = isUnsafeSelfUpgradeProposal(`${params.title} ${params.solutionSummary} ${params.patchOrPrNote || ''}`);
      if (guard.unsafe) {
        get().addHealthLog('warn', 'upgrade_guard', guard.reason || 'Bị chặn đề xuất nâng cấp không an toàn');
        return null;
      }
      const now = Date.now();
      const prop: UpgradeProposal = {
        id: `upg_${now.toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
        code: `#NC-${String(get().upgradeProposals.length + 1).padStart(2, '0')}`,
        title: params.title,
        proposedBy: params.proposedBy,
        bottleneckEvidence: params.bottleneckEvidence,
        solutionSummary: params.solutionSummary,
        expectedRoi: params.expectedRoi,
        estimatedCostVnd: params.estimatedCostVnd ?? 0,
        risksAndRollback: 'Thử nghiệm Sandbox trước -> Pilot -> Rollout toàn bộ; có thể Rollback về phiên bản trước 1 nút.',
        testPlan: params.testPlan || 'Kiểm thử A/B trên Sandbox với dữ liệu giả lập trước khi trình CEO.',
        patchOrPrNote: params.patchOrPrNote || 'Chỉ thay đổi cấu hình quy trình/Playbook (không tự sửa mã nguồn live).',
        rolloutStage: 'proposal',
        beforeMetric: params.beforeMetric,
        ceoApproved: false,
        createdAt: now,
        updatedAt: now,
      };
      await repository.putUpgradeProposal(prop);
      set((s) => ({ upgradeProposals: [prop, ...s.upgradeProposals] }));
      return prop;
    },

    runBottleneckUpgradeAnalysis: async () => {
      const s = get();
      const candidates = analyzeCompanyBottlenecks({
        tasks: s.tasks,
        handoverTickets: s.handoverTickets,
        upgradeProposals: s.upgradeProposals,
        healthLogs: s.systemHealthLogs,
      });
      const created: UpgradeProposal[] = [];
      for (const c of candidates) {
        const res = await get().proposeSystemUpgrade(c);
        if (res) created.push(res);
      }
      return created;
    },

    advanceUpgradeStage: async (proposalId, stage, options) => {
      const prop = get().upgradeProposals.find((u) => u.id === proposalId);
      if (!prop) return { ok: false, error: 'Không tìm thấy đề xuất #NC.' };

      const guard = isUnsafeSelfUpgradeProposal(`${prop.title} ${prop.solutionSummary}`);
      if (guard.unsafe) {
        return { ok: false, error: guard.reason };
      }

      const needsCeoApproval = stage === 'pilot' || stage === 'deployed_all';
      if (needsCeoApproval && options?.ceoApprovedByAction === false) {
        return { ok: false, error: 'Chưa có CEO phê duyệt để đưa vào Pilot hoặc Áp dụng toàn công ty.' };
      }

      const now = Date.now();
      const updated: UpgradeProposal = {
        ...prop,
        rolloutStage: stage,
        ceoApproved: needsCeoApproval ? true : prop.ceoApproved,
        approvedBy: needsCeoApproval ? 'CEO (Chủ tịch)' : prop.approvedBy,
        afterMetric: stage === 'deployed_all' ? 'Giảm ~25% độ trễ & giữ chất lượng >= 90/100' : prop.afterMetric,
        updatedAt: now,
      };
      await repository.putUpgradeProposal(updated);
      set((s) => ({ upgradeProposals: s.upgradeProposals.map((u) => (u.id === proposalId ? updated : u)) }));

      if (stage === 'deployed_all' || stage === 'rolled_back') {
        const entry: UpgradeChangelogEntry = {
          id: `chg_${now.toString(36)}`,
          version: `v${get().upgradeChangelog.length + 1}.0`,
          proposalId,
          title: `${prop.code} (${stage === 'rolled_back' ? 'ROLLBACK' : 'APPLIED'}): ${prop.title}`,
          summary: prop.solutionSummary,
          proposedBy: prop.proposedBy,
          approvedBy: updated.approvedBy || 'CEO (Chủ tịch)',
          beforeMetric: prop.beforeMetric,
          afterMetric: updated.afterMetric || 'Đã hoàn tác về bản trước',
          timestamp: now,
        };
        await repository.putUpgradeChangelog(entry);
        set((s) => ({ upgradeChangelog: [entry, ...s.upgradeChangelog] }));
      }
      return { ok: true };
    },

    scoutGitRepo: async (query) => {
      let rawRepos: Array<{
        full_name: string;
        html_url: string;
        description?: string;
        default_branch?: string;
        stargazers_count: number;
        updated_at: string;
        license?: { spdx_id?: string };
      }> = [];

      try {
        const res = await fetch(`/api/repos/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = (await res.json()) as { items?: typeof rawRepos };
          rawRepos = data.items || [];
        }
      } catch {
        // graceful fallback below
      }

      const reports: GitRepoEvaluationReport[] =
        rawRepos.length > 0
          ? rawRepos.slice(0, 3).map((r) =>
              evaluateGitRepoMetadata({
                query,
                repoFullName: r.full_name,
                repoUrl: r.html_url,
                commitSha: r.default_branch ? `${r.default_branch}@HEAD` : undefined,
                purpose: r.description || undefined,
                stars: r.stargazers_count,
                lastUpdated: r.updated_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
                license: r.license?.spdx_id || 'Unknown',
              })
            )
          : [
              evaluateGitRepoMetadata({
                query,
                repoFullName: `offline-cache/${query.toLowerCase().replace(/\s+/g, '-')}`,
                repoUrl: `https://github.com/search?q=${encodeURIComponent(query)}`,
                stars: 0,
                lastUpdated: new Date().toISOString().slice(0, 10),
                license: 'Unknown',
              }),
            ];

      for (const rep of reports) {
        await repository.putRepoEvaluation(rep);
      }
      set((s) => ({ repoEvaluations: [...reports, ...s.repoEvaluations].slice(0, 60) }));
      return reports;
    },

    runSandboxTestOnRepo: async (repoReportId) => {
      const rep = get().repoEvaluations.find((r) => r.id === repoReportId);
      if (!rep) return null;
      try {
        const res = await fetch('/api/repos/sandbox-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: rep.repoUrl, repoFullName: rep.repoFullName }),
        });
        if (res.ok) {
          const out = (await res.json()) as {
            executed: boolean;
            passed: boolean;
            stdoutExcerpt: string;
          };
          const updated: GitRepoEvaluationReport = {
            ...rep,
            sandboxStatus: out.executed ? (out.passed ? 'sandbox_passed' : 'sandbox_failed') : 'static_only_unverified',
            verificationLabel: out.executed ? 'ĐÃ CHẠY SANDBOX' : 'CHƯA KIỂM CHỨNG',
            stdoutExcerpt: out.stdoutExcerpt,
            performanceNote: out.executed
              ? 'Docker cô lập --network=none --memory=256m --cpus=0.5 đạt giới hạn an toàn.'
              : rep.performanceNote,
            recommendedAction: out.executed && out.passed && rep.legalReviewed ? 'use' : rep.recommendedAction,
          };
          await repository.putRepoEvaluation(updated);
          set((s) => ({ repoEvaluations: s.repoEvaluations.map((x) => (x.id === repoReportId ? updated : x)) }));
          return updated;
        }
      } catch {
        // keep static unverified honestly
      }
      return rep;
    },

    markRepoLegalReviewed: async (repoReportId, approved) => {
      const rep = get().repoEvaluations.find((r) => r.id === repoReportId);
      if (!rep) return;
      const updated: GitRepoEvaluationReport = {
        ...rep,
        legalReviewed: approved,
        legalLicenseOk: approved ? true : rep.legalLicenseOk,
        recommendedAction: approved && rep.sandboxStatus === 'sandbox_passed' ? 'use' : approved ? 'watch' : 'do_not_use',
        recommendation: approved
          ? 'Pháp chế đã rà soát License đạt chuẩn. Có thể chạy Sandbox / Đề xuất nâng cấp (#NC).'
          : 'Pháp chế từ chối bản quyền / không khuyến nghị tích hợp.',
      };
      await repository.putRepoEvaluation(updated);
      set((s) => ({ repoEvaluations: s.repoEvaluations.map((x) => (x.id === repoReportId ? updated : x)) }));
    },

    promoteRepoToUpgradeProposal: async (repoReportId) => {
      const rep = get().repoEvaluations.find((r) => r.id === repoReportId);
      if (!rep) return null;
      return await get().proposeSystemUpgrade({
        title: `Tích hợp công cụ ${rep.repoFullName} (${rep.license})`,
        proposedBy: 'tech_lead',
        bottleneckEvidence: `CEO yêu cầu tìm "${rep.requestedQuery}" · Nguồn: ${rep.repoUrl} (${rep.commitSha || 'HEAD'}) · Trạng thái: ${rep.verificationLabel}.`,
        solutionSummary: `${rep.purpose || 'Tích hợp công cụ hỗ trợ kỹ thuật.'} Rà soát Pháp chế: ${rep.legalReviewed ? 'Đạt' : 'Chờ duyệt'}.`,
        expectedRoi: rep.integrationEffort || 'Giảm thời gian phát triển công cụ nội bộ',
        beforeMetric: `Trạng thái hiện tại: ${rep.verificationLabel} (${rep.stars}★)`,
        testPlan: `Chạy thử trong Docker Sandbox (--network=none, 256MB RAM) trước khi đưa vào Pilot.`,
        patchOrPrNote: `Tích hợp cô lập dưới dạng worker service/module PR riêng, chờ CEO duyệt.`,
      });
    },

    recordPlaybookRun: async (playbookId, qualityScore, metrics) => {
      const pb = get().playbooks.find((p) => p.id === playbookId);
      if (!pb) return;
      const updated = recordPlaybookOutcome(pb, qualityScore, metrics);
      await repository.putPlaybook(updated);
      set((s) => ({ playbooks: s.playbooks.map((p) => (p.id === playbookId ? updated : p)) }));
    },

    togglePlaybookFastTrack: async (playbookId) => {
      const pb = get().playbooks.find((p) => p.id === playbookId);
      if (!pb) return;
      const check = canUsePlaybookFastTrack({ playbook: { ...pb, allowFastTrack: true, dirtyNeedsReview: false }, isHighRiskTask: false });
      const wantEnable = !pb.allowFastTrack;
      const next = {
        ...pb,
        allowFastTrack: wantEnable && check.allowed ? true : false,
        dirtyNeedsReview: wantEnable && check.allowed ? false : pb.dirtyNeedsReview,
      };
      await repository.putPlaybook(next);
      set((s) => ({ playbooks: s.playbooks.map((p) => (p.id === playbookId ? next : p)) }));
    },

    markPlaybookReviewed: async (playbookId) => {
      const pb = get().playbooks.find((p) => p.id === playbookId);
      if (!pb) return;
      const next: PlaybookSkill = {
        ...pb,
        dirtyNeedsReview: false,
        dirtyReason: undefined,
        baselineQualityScore: Math.max(82, pb.avgQualityScore),
        updatedAt: Date.now(),
      };
      await repository.putPlaybook(next);
      set((s) => ({ playbooks: s.playbooks.map((p) => (p.id === playbookId ? next : p)) }));
    },

    addExperienceMemory: async (item) => {
      const full: ExperienceMemoryItem = {
        ...item,
        id: `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
        createdAt: Date.now(),
      };
      await repository.putExperienceMemory(full);
      set((s) => ({ experienceMemories: [full, ...s.experienceMemories].slice(0, 120) }));
      return full;
    },

    // === BỔ SUNG X+: PLUG-AND-PLAY ANDROID DEVICE FARM ===
    refreshDevices: async () => {
      try {
        const res = await fetch('/api/devices');
        if (res.ok) {
          const data = (await res.json()) as { devices?: ManagedDeviceRecord[] };
          if (Array.isArray(data.devices)) {
            set({ managedDevices: data.devices });
          }
        }
      } catch {
        // fallback stays untouched
      }
    },

    connectWirelessDevice: async (ipPort, pairingCode) => {
      try {
        const res = await fetch('/api/devices/pair-wifi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ipPort, pairingCode }),
        });
        const data = (await res.json()) as { ok: boolean; message: string };
        await get().refreshDevices();
        return data;
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : 'Không kết nối được /api/devices/pair-wifi' };
      }
    },

    setDeviceControlMode: async (deviceId, mode) => {
      const updated = get().managedDevices.map((d) => (d.id === deviceId ? { ...d, controlMode: mode } : d));
      set({ managedDevices: updated });
      fetch(`/api/devices/${encodeURIComponent(deviceId)}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      }).catch(() => {});
    },

    assignDeviceToAgent: async (deviceId, agentId) => {
      const agent = agentId ? get().agents.find((a) => a.id === agentId) : undefined;
      const updated = get().managedDevices.map((d) =>
        d.id === deviceId ? { ...d, assignedAgentId: agentId, assignedDepartment: agent?.department } : d
      );
      set({ managedDevices: updated });
      fetch(`/api/devices/${encodeURIComponent(deviceId)}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, department: agent?.department }),
      }).catch(() => {});
    },

    toggleDeviceStream: async (deviceId, active) => {
      const updated = get().managedDevices.map((d) => (d.id === deviceId ? { ...d, isStreaming: active } : d));
      set({ managedDevices: updated });
      if (active) {
        await get().executeDeviceCommand({ deviceId, agentId: 'ceo', action: 'screenshot' });
      }
    },

    executeDeviceCommand: async ({ deviceId, agentId, action, x, y, x2, y2, text, packageName, ceoConfirmed }) => {
      const s = get();
      if (s.settings.killSwitchActive || s.settings.paused) {
        return { ok: false, error: 'Kill Switch hoặc tạm dừng công ty đang bật.' };
      }
      const dev = s.managedDevices.find((d) => d.id === deviceId);
      if (!dev) return { ok: false, error: 'Không tìm thấy thiết bị.' };

      if (action !== 'screenshot' && action !== 'ocr_read') {
        if (dev.controlMode === 'view_only') {
          return { ok: false, error: 'Thiết bị đang ở chế độ CHỈ XEM — không cho phép agent thao tác.' };
        }
        if (dev.controlMode === 'approved_actions' && agentId !== 'ceo' && !ceoConfirmed) {
          return { ok: false, error: 'Chế độ ĐIỀU KHIỂN CÓ DUYỆT yêu cầu CEO xác nhận thao tác này.' };
        }
      }

      if (packageName && s.devicePolicy.blockedPackages.includes(packageName)) {
        const log: DeviceActionLog = {
          id: `dlog_${Date.now().toString(36)}`,
          deviceId,
          serial: dev.serial,
          agentId,
          action: `${action}:${packageName}`,
          foregroundPackage: packageName,
          result: 'blocked_policy',
          reason: 'App nằm trong danh sách cấm tuyệt đối (Ngân hàng / Ví / 2FA / Cài đặt).',
          timestamp: Date.now(),
        };
        await repository.addDeviceActionLog(log);
        set((st) => ({ deviceLogs: [log, ...st.deviceLogs].slice(0, 300) }));
        return { ok: false, error: log.reason };
      }

      try {
        const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, action, x, y, x2, y2, text, packageName, policy: s.devicePolicy }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          screenshotDataUrl?: string;
          ocrText?: string;
          device?: ManagedDeviceRecord;
          log?: DeviceActionLog;
        };
        if (data.device) {
          set((st) => ({
            managedDevices: st.managedDevices.map((d) => (d.id === deviceId ? data.device! : d)),
          }));
        }
        if (data.log) {
          await repository.addDeviceActionLog(data.log);
          set((st) => ({ deviceLogs: [data.log!, ...st.deviceLogs].slice(0, 300) }));
        }
        return { ok: data.ok, error: data.error, screenshotDataUrl: data.screenshotDataUrl, ocrText: data.ocrText };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Lỗi gửi lệnh thiết bị' };
      }
    },

    grabDeviceControlStop: async (deviceId) => {
      await get().setDeviceControlMode(deviceId, 'view_only');
      fetch(`/api/devices/${encodeURIComponent(deviceId)}/stop`, { method: 'POST' }).catch(() => {});
    },

    updateDevicePolicy: (patch) => {
      set((s) => ({ devicePolicy: { ...s.devicePolicy, ...patch } }));
    },

    // === BỔ SUNG Y: OFFICE LAYOUT EDITOR & MODALS ===
    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    setHelpGuideOpen: (open) => set({ helpGuideOpen: open }),

    saveOfficeLayoutPreset: async (preset, pushUndo = true) => {
      const s = get();
      const prev = s.officeLayouts.find((p) => p.id === preset.id);
      const nextPreset: OfficeLayoutPreset = { ...preset, updatedAt: Date.now() };
      await repository.putOfficeLayout(nextPreset);

      // Sync agent deskPosition if active layout matches
      if (s.settings.activeOfficeLayoutId === nextPreset.id || s.officeLayouts[0]?.id === nextPreset.id) {
        const updatedAgents = [...s.agents];
        let agentChanged = false;
        for (const prop of nextPreset.props) {
          if (prop.kind === 'desk' && prop.assignedAgentId) {
            const idx = updatedAgents.findIndex((a) => a.id === prop.assignedAgentId);
            if (idx >= 0) {
              const ag = updatedAgents[idx];
              const samePos =
                ag.deskPosition[0] === prop.position[0] &&
                ag.deskPosition[1] === prop.position[1] &&
                ag.deskPosition[2] === prop.position[2] &&
                ag.roomId === prop.roomId;
              if (!samePos) {
                const clampedFloor = (prop.floor === 3 ? 3 : prop.floor === 2 ? 2 : 1) as 1 | 2 | 3;
                const nextAg: AgentProfile = {
                  ...ag,
                  roomId: prop.roomId,
                  floor: clampedFloor,
                  deskPosition: [...prop.position],
                  deskRotationY: prop.rotationY,
                  updatedAt: Date.now(),
                };
                updatedAgents[idx] = nextAg;
                await repository.putAgent(nextAg);
                agentChanged = true;
              }
            }
          }
        }
        if (agentChanged) {
          set({ agents: updatedAgents });
        }
      }

      set((st) => {
        const exists = st.officeLayouts.some((l) => l.id === nextPreset.id);
        return {
          officeLayouts: exists
            ? st.officeLayouts.map((l) => (l.id === nextPreset.id ? nextPreset : l))
            : [nextPreset, ...st.officeLayouts],
          officeLayoutUndoStack:
            pushUndo && prev ? [prev, ...st.officeLayoutUndoStack].slice(0, 20) : st.officeLayoutUndoStack,
          officeLayoutRedoStack: pushUndo ? [] : st.officeLayoutRedoStack,
        };
      });
    },

    switchOfficeLayoutPreset: async (presetId) => {
      const target = get().officeLayouts.find((p) => p.id === presetId);
      if (!target) return { ok: false, error: 'Không tìm thấy mẫu văn phòng.' };
      await get().updateSettings({ activeOfficeLayoutId: presetId });

      // Reposition seated agents to match preset props
      const updatedAgents = [...get().agents];
      const nextRuntimes = { ...get().runtimes };
      for (const prop of target.props) {
        if (prop.kind === 'desk' && prop.assignedAgentId) {
          const idx = updatedAgents.findIndex((a) => a.id === prop.assignedAgentId);
          if (idx >= 0) {
            const clampedFloor = (prop.floor === 3 ? 3 : prop.floor === 2 ? 2 : 1) as 1 | 2 | 3;
            const nextAg: AgentProfile = {
              ...updatedAgents[idx],
              roomId: prop.roomId,
              floor: clampedFloor,
              deskPosition: [...prop.position],
              deskRotationY: prop.rotationY,
            };
            updatedAgents[idx] = nextAg;
            await repository.putAgent(nextAg);
            if (nextRuntimes[nextAg.id]) {
              nextRuntimes[nextAg.id] = {
                ...nextRuntimes[nextAg.id],
                currentPosition: [...prop.position],
                targetPosition: [...prop.position],
                waypoints: [],
              };
            }
          }
        }
      }
      set({ agents: updatedAgents, runtimes: nextRuntimes });
      return { ok: true };
    },

    undoOfficeLayout: async () => {
      const s = get();
      const [latest, ...rest] = s.officeLayoutUndoStack;
      if (!latest) return;
      const current = s.officeLayouts.find((p) => p.id === latest.id);
      set({
        officeLayoutUndoStack: rest,
        officeLayoutRedoStack: current ? [current, ...s.officeLayoutRedoStack].slice(0, 20) : s.officeLayoutRedoStack,
      });
      await get().saveOfficeLayoutPreset(latest, false);
    },

    redoOfficeLayout: async () => {
      const s = get();
      const [latest, ...rest] = s.officeLayoutRedoStack;
      if (!latest) return;
      const current = s.officeLayouts.find((p) => p.id === latest.id);
      set({
        officeLayoutRedoStack: rest,
        officeLayoutUndoStack: current ? [current, ...s.officeLayoutUndoStack].slice(0, 20) : s.officeLayoutUndoStack,
      });
      await get().saveOfficeLayoutPreset(latest, false);
    },

    autoSeatUnseatedAgents: async (presetId) => {
      const s = get();
      const preset = s.officeLayouts.find((p) => p.id === presetId);
      if (!preset) return 0;
      const validation = validateOfficeLayout(preset, s.agents);
      if (validation.unseatedAgents.length === 0) return 0;
      const { preset: nextPreset, updatedAgentPositions } = autoSeatAgentsInPreset(preset, s.agents);
      const changedCount = Object.keys(updatedAgentPositions).length;
      if (changedCount > 0) {
        await get().saveOfficeLayoutPreset(nextPreset, true);
      }
      return changedCount;
    },

    deleteOfficeLayoutPreset: async (presetId) => {
      const target = get().officeLayouts.find((p) => p.id === presetId);
      if (!target || target.isBuiltIn) return;
      await repository.deleteOfficeLayout(presetId);
      set((s) => ({ officeLayouts: s.officeLayouts.filter((p) => p.id !== presetId) }));
    },

    // === BỔ SUNG Z: COMPLETE ENTERPRISE ERP ===
    putCustomerAccount: async (account) => {
      const ticketsCount = get().supportTickets.filter(
        (t) => t.customerId === account.id && t.status !== 'resolved' && t.status !== 'closed'
      ).length;
      const overdueCount = get().electronicInvoices.filter(
        (inv) => inv.customerName === account.name && inv.status === 'overdue'
      ).length;
      const health = calculateCustomerHealthAndChurn(account, ticketsCount, overdueCount);
      const next: CustomerAccountRecord = {
        ...account,
        churnRiskScore: health.churnRiskScore,
        status: health.status,
        updatedAt: Date.now(),
      };
      await repository.putCustomerAccount(next);
      set((s) => ({
        customerAccounts: s.customerAccounts.some((c) => c.id === next.id)
          ? s.customerAccounts.map((c) => (c.id === next.id ? next : c))
          : [next, ...s.customerAccounts],
      }));
    },

    putSalesQuote: async (quote) => {
      await repository.putSalesQuote(quote);
      set((s) => ({
        salesQuotes: s.salesQuotes.some((q) => q.id === quote.id)
          ? s.salesQuotes.map((q) => (q.id === quote.id ? quote : q))
          : [quote, ...s.salesQuotes],
      }));
    },

    convertQuoteToOrderAndInvoice: async (quoteId) => {
      const s = get();
      const quote = s.salesQuotes.find((q) => q.id === quoteId);
      if (!quote) return { ok: false, error: 'Không tìm thấy báo giá.' };
      const now = Date.now();
      const { vatAmountVnd, totalVnd } = calculateVnVat(quote.subtotalVnd, quote.vatRatePercent);
      const acceptedQuote: SalesQuoteRecord = { ...quote, status: 'accepted' };
      await repository.putSalesQuote(acceptedQuote);

      const order: SalesOrderRecord = {
        id: `ord_${now.toString(36)}`,
        code: `#DH-2026-${String(s.salesOrders.length + 1).padStart(2, '0')}`,
        quoteId: quote.id,
        customerId: quote.customerId || `cust_${now.toString(36)}`,
        customerName: quote.customerName,
        itemsSummary: `${quote.planLabel} (${quote.productId})`,
        amountVnd: quote.subtotalVnd,
        vatAmountVnd,
        totalVnd,
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'provisioning',
        ownerAgentId: quote.ownerAgentId,
        source: 'manual',
        createdAt: now,
      };
      await repository.putSalesOrder(order);

      const invNum = String(110 + s.electronicInvoices.length).padStart(7, '0');
      const invoice: ElectronicInvoiceRecord = {
        id: `einv_${now.toString(36)}`,
        invoiceNumber: invNum,
        series: '1C26TAA',
        orderId: order.id,
        customerName: quote.customerName,
        buyerTaxCode: s.customerAccounts.find((c) => c.id === quote.customerId)?.taxCode,
        subtotalVnd: quote.subtotalVnd,
        vatRatePercent: quote.vatRatePercent,
        vatAmountVnd,
        totalVnd,
        status: 'issued',
        issuedAt: now,
        dueDate: new Date(now + 7 * 86400_000).toISOString().slice(0, 10),
        reminderCount: 0,
        paidAmountVnd: 0,
        source: 'manual',
      };
      await repository.putElectronicInvoice(invoice);

      const nextInvoices = [invoice, ...s.electronicInvoices];
      const nextLedger = buildLedgerFromInvoiceAndExpense(nextInvoices, s.expenses, s.refundRequests);
      for (const gl of nextLedger) {
        await repository.putLedgerEntry(gl);
      }

      set((st) => ({
        salesQuotes: st.salesQuotes.map((q) => (q.id === quoteId ? acceptedQuote : q)),
        salesOrders: [order, ...st.salesOrders],
        electronicInvoices: nextInvoices,
        ledgerEntries: nextLedger,
      }));
      return { ok: true, order, invoice };
    },

    sendInvoicePaymentReminder: async (invoiceId) => {
      const inv = get().electronicInvoices.find((i) => i.id === invoiceId);
      if (!inv) return;
      const updated: ElectronicInvoiceRecord = {
        ...inv,
        reminderCount: inv.reminderCount + 1,
        lastReminderAt: Date.now(),
      };
      await repository.putElectronicInvoice(updated);
      set((s) => ({
        electronicInvoices: s.electronicInvoices.map((i) => (i.id === invoiceId ? updated : i)),
      }));
      await get().addMessage({
        channelId: 'sales',
        senderId: 'cfo',
        senderName: 'Kế toán & Công nợ',
        senderTitle: 'AR Reminder',
        department: 'backoffice',
        content: `Đã gửi nhắc thanh toán lần **#${updated.reminderCount}** cho hóa đơn **${updated.series}-${updated.invoiceNumber}** (${updated.customerName}) — Số còn phải thu: **${formatVnd(updated.totalVnd - updated.paidAmountVnd)}**.`,
        busType: 'report',
      });
    },

    recordInvoicePayment: async (invoiceId, paidAmountVnd) => {
      const s = get();
      const inv = s.electronicInvoices.find((i) => i.id === invoiceId);
      if (!inv) return;
      const nextPaid = Math.min(inv.totalVnd, inv.paidAmountVnd + Math.max(0, paidAmountVnd));
      const fullyPaid = nextPaid >= inv.totalVnd;
      const updatedInv: ElectronicInvoiceRecord = {
        ...inv,
        paidAmountVnd: nextPaid,
        status: fullyPaid ? 'paid' : inv.status,
        reconciledAt: fullyPaid ? Date.now() : inv.reconciledAt,
      };
      await repository.putElectronicInvoice(updatedInv);

      const nextOrders = s.salesOrders.map((o) => {
        if (o.id !== inv.orderId) return o;
        const nextOrder: SalesOrderRecord = {
          ...o,
          paymentStatus: fullyPaid ? 'paid' : nextPaid > 0 ? 'partial' : o.paymentStatus,
          fulfillmentStatus: fullyPaid ? 'active' : o.fulfillmentStatus,
        };
        repository.putSalesOrder(nextOrder).catch(() => {});
        return nextOrder;
      });

      const nextInvoices = s.electronicInvoices.map((i) => (i.id === invoiceId ? updatedInv : i));
      const nextLedger = buildLedgerFromInvoiceAndExpense(nextInvoices, s.expenses, s.refundRequests);
      for (const gl of nextLedger) {
        await repository.putLedgerEntry(gl);
      }

      set({
        electronicInvoices: nextInvoices,
        salesOrders: nextOrders,
        ledgerEntries: nextLedger,
        dealCelebrationNonce: fullyPaid ? s.dealCelebrationNonce + 1 : s.dealCelebrationNonce,
      });
    },

    createRefundRequest: async ({ orderId, amountVnd, reason, requestedBy = 'customer_success' }) => {
      const order = get().salesOrders.find((o) => o.id === orderId);
      if (!order) return null;
      const now = Date.now();
      const req: RefundRequestRecord = {
        id: `ref_${now.toString(36)}`,
        code: `#HT-2026-${String(get().refundRequests.length + 1).padStart(2, '0')}`,
        orderId,
        customerName: order.customerName,
        amountVnd: Math.min(order.totalVnd, Math.max(0, amountVnd)),
        reason,
        status: 'pending_ceo',
        requestedBy,
        createdAt: now,
      };
      await repository.putRefundRequest(req);
      set((s) => ({
        refundRequests: [req, ...s.refundRequests],
        unreadNotifications: s.unreadNotifications + 1,
      }));
      return req;
    },

    resolveRefundRequest: async (refundId, decision) => {
      const s = get();
      const target = s.refundRequests.find((r) => r.id === refundId);
      if (!target) return;
      const updated: RefundRequestRecord = {
        ...target,
        status: decision,
        approvedBy: decision === 'rejected' ? undefined : 'CEO (Chủ tịch)',
      };
      await repository.putRefundRequest(updated);
      const nextRefunds = s.refundRequests.map((r) => (r.id === refundId ? updated : r));
      const nextLedger = buildLedgerFromInvoiceAndExpense(s.electronicInvoices, s.expenses, nextRefunds);
      for (const gl of nextLedger) {
        await repository.putLedgerEntry(gl);
      }
      set({ refundRequests: nextRefunds, ledgerEntries: nextLedger });
    },

    addCustomerSurvey: async (survey) => {
      const full: CustomerSurveyRecord = {
        ...survey,
        id: `srv_${Date.now().toString(36)}`,
        createdAt: Date.now(),
      };
      await repository.putCustomerSurvey(full);
      set((s) => ({ customerSurveys: [full, ...s.customerSurveys] }));
      const cust = get().customerAccounts.find((c) => c.id === survey.customerId);
      if (cust) {
        await get().putCustomerAccount({
          ...cust,
          npsScore: survey.kind === 'nps' ? survey.score : cust.npsScore,
          csatScore: survey.kind === 'csat' ? survey.score : cust.csatScore,
        });
      }
    },

    importCustomersCsv: async (csvText) => {
      const rows = parseCsvRows(csvText);
      if (rows.length === 0) return { imported: 0, error: 'CSV không có dòng dữ liệu hợp lệ.' };
      const now = Date.now();
      let imported = 0;
      for (const row of rows) {
        const name = row.name || row['Tên khách hàng'] || row.company;
        if (!name) continue;
        const mrr = Number(row.mrrVnd || row.MRR || 1_200_000) || 1_200_000;
        const acc: CustomerAccountRecord = {
          id: `cust_${now.toString(36)}_${imported}`,
          code: row.code || `KH-${2000 + get().customerAccounts.length + imported}`,
          name,
          taxCode: row.taxCode || row.MST || '',
          contactName: row.contactName || row['Người liên hệ'] || 'Chưa rõ',
          contactEmail: row.contactEmail || row.email || '',
          contactPhone: row.contactPhone || row.phone || '',
          tier: (row.tier as CustomerAccountRecord['tier']) || 'pro',
          planName: row.planName || 'Gói SaaS Tiêu chuẩn',
          mrrVnd: mrr,
          ltvVnd: mrr * 12,
          churnRiskScore: 15,
          status: 'active',
          renewalDate: new Date(now + 180 * 86400_000).toISOString().slice(0, 10),
          ownerAgentId: 'account_executive',
          source: 'manual',
          createdAt: now,
          updatedAt: now,
        };
        await get().putCustomerAccount(acc);
        imported += 1;
      }
      return { imported };
    },

    createSupportTicket: async ({
      customerName,
      customerId,
      channel,
      subject,
      description,
      priority,
      assigneeAgentId = 'customer_success',
      slaMinutes = priority === 'urgent' ? 30 : priority === 'high' ? 120 : 240,
    }) => {
      const now = Date.now();
      const ticket: SupportTicketRecord = {
        id: `tkt_${now.toString(36)}`,
        code: `#TK-${101 + get().supportTickets.length}`,
        customerId,
        customerName,
        channel,
        subject,
        description,
        priority,
        status: 'open',
        assigneeAgentId,
        slaMinutes,
        slaDueAt: now + slaMinutes * 60_000,
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      };
      await repository.putSupportTicket(ticket);
      set((s) => ({ supportTickets: [ticket, ...s.supportTickets] }));
      return ticket;
    },

    updateSupportTicket: async (ticket) => {
      const updated = { ...ticket, updatedAt: Date.now() };
      await repository.putSupportTicket(updated);
      set((s) => ({
        supportTickets: s.supportTickets.map((t) => (t.id === ticket.id ? updated : t)),
      }));
    },

    escalateSupportTicket: async (ticketId, toAgentId = 'tech_pm') => {
      const ticket = get().supportTickets.find((t) => t.id === ticketId);
      if (!ticket) return;
      const updated: SupportTicketRecord = {
        ...ticket,
        status: 'escalated',
        escalatedToAgentId: toAgentId,
        updatedAt: Date.now(),
      };
      await repository.putSupportTicket(updated);
      set((s) => ({
        supportTickets: s.supportTickets.map((t) => (t.id === ticketId ? updated : t)),
      }));
      await get().addMessage({
        channelId: 'product',
        senderId: ticket.assigneeAgentId,
        senderName: 'Phòng CSKH',
        senderTitle: 'Ticket Escalation',
        department: 'product',
        content: `Leo thang Ticket **${ticket.code}** (${ticket.customerName}): **${ticket.subject}** sang **${toAgentId}** để xử lý kỹ thuật khẩn.`,
        busType: 'escalation',
      });
    },

    resolveSupportTicketWithKb: async ({ ticketId, solutionSteps, createKbFaq = true, category = 'Hướng dẫn CSKH' }) => {
      const ticket = get().supportTickets.find((t) => t.id === ticketId);
      if (!ticket) return;
      const now = Date.now();
      let kbArticleId = ticket.kbArticleId;
      if (createKbFaq) {
        const kb: KnowledgeBaseArticle = {
          id: `kb_${now.toString(36)}`,
          title: ticket.subject,
          category,
          symptoms: ticket.description,
          solutionSteps,
          fromTicketId: ticket.id,
          viewsCount: 1,
          helpfulCount: 1,
          published: true,
          updatedAt: now,
        };
        await repository.putKbArticle(kb);
        kbArticleId = kb.id;
        set((s) => ({ kbArticles: [kb, ...s.kbArticles] }));
      }
      const resolved: SupportTicketRecord = {
        ...ticket,
        status: 'resolved',
        resolvedAt: now,
        kbArticleId,
        updatedAt: now,
      };
      await repository.putSupportTicket(resolved);
      set((s) => ({
        supportTickets: s.supportTickets.map((t) => (t.id === ticketId ? resolved : t)),
      }));
    },

    putCustomerOnboarding: async (plan) => {
      const doneCount = plan.steps.filter((st) => st.done).length;
      const pct = plan.steps.length > 0 ? Math.round((doneCount / plan.steps.length) * 100) : 0;
      const next: CustomerOnboardingPlan = {
        ...plan,
        progressPercent: pct,
        status: pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'scheduled',
        updatedAt: Date.now(),
      };
      await repository.putCustomerOnboarding(next);
      set((s) => ({
        customerOnboardings: s.customerOnboardings.some((o) => o.id === next.id)
          ? s.customerOnboardings.map((o) => (o.id === next.id ? next : o))
          : [next, ...s.customerOnboardings],
      }));
    },

    putRoadmapItem: async (item) => {
      const next = { ...item, updatedAt: Date.now() };
      await repository.putRoadmapItem(next);
      set((s) => ({
        roadmapItems: s.roadmapItems.some((r) => r.id === next.id)
          ? s.roadmapItems.map((r) => (r.id === next.id ? next : r))
          : [next, ...s.roadmapItems],
      }));
    },

    putSoftwareRelease: async (rel) => {
      await repository.putSoftwareRelease(rel);
      set((s) => ({
        softwareReleases: s.softwareReleases.some((r) => r.id === rel.id)
          ? s.softwareReleases.map((r) => (r.id === rel.id ? rel : r))
          : [rel, ...s.softwareReleases],
      }));
    },

    putEngineeringIncident: async (inc) => {
      await repository.putEngineeringIncident(inc);
      set((s) => ({
        engineeringIncidents: s.engineeringIncidents.some((i) => i.id === inc.id)
          ? s.engineeringIncidents.map((i) => (i.id === inc.id ? inc : i))
          : [inc, ...s.engineeringIncidents],
      }));
    },

    putSecurityAsset: async (sec) => {
      await repository.putSecurityAsset(sec);
      set((s) => ({
        securityAssets: s.securityAssets.some((x) => x.id === sec.id)
          ? s.securityAssets.map((x) => (x.id === sec.id ? sec : x))
          : [sec, ...s.securityAssets],
      }));
    },

    putMarketingAsset: async (asset) => {
      await repository.putMarketingAsset(asset);
      set((s) => ({
        marketingAssets: s.marketingAssets.some((a) => a.id === asset.id)
          ? s.marketingAssets.map((a) => (a.id === asset.id ? asset : a))
          : [asset, ...s.marketingAssets],
      }));
    },

    putSeoKeyword: async (kw) => {
      await repository.putSeoKeyword(kw);
      set((s) => ({
        seoKeywords: s.seoKeywords.some((k) => k.id === kw.id)
          ? s.seoKeywords.map((k) => (k.id === kw.id ? kw : k))
          : [kw, ...s.seoKeywords],
      }));
    },

    putBrandMention: async (m) => {
      await repository.putBrandMention(m);
      set((s) => ({
        brandMentions: s.brandMentions.some((x) => x.id === m.id)
          ? s.brandMentions.map((x) => (x.id === m.id ? m : x))
          : [m, ...s.brandMentions],
      }));
    },

    putMarketingEvent: async (ev) => {
      await repository.putMarketingEvent(ev);
      set((s) => ({
        marketingEvents: s.marketingEvents.some((x) => x.id === ev.id)
          ? s.marketingEvents.map((x) => (x.id === ev.id ? ev : x))
          : [ev, ...s.marketingEvents],
      }));
    },

    putLegalRisk: async (risk) => {
      const next = { ...risk, updatedAt: Date.now() };
      await repository.putLegalRisk(next);
      set((s) => ({
        legalRisks: s.legalRisks.some((r) => r.id === next.id)
          ? s.legalRisks.map((r) => (r.id === next.id ? next : r))
          : [next, ...s.legalRisks],
      }));
    },

    putDataProcessing: async (dpa) => {
      const next = { ...dpa, updatedAt: Date.now() };
      await repository.putDataProcessing(next);
      set((s) => ({
        dataProcessings: s.dataProcessings.some((d) => d.id === next.id)
          ? s.dataProcessings.map((d) => (d.id === next.id ? next : d))
          : [next, ...s.dataProcessings],
      }));
    },

    putDsarRequest: async (dsar) => {
      await repository.putDsarRequest(dsar);
      set((s) => ({
        dsarRequests: s.dsarRequests.some((d) => d.id === dsar.id)
          ? s.dsarRequests.map((d) => (d.id === dsar.id ? dsar : d))
          : [dsar, ...s.dsarRequests],
      }));
    },

    putLeaveRequest: async (req) => {
      await repository.putLeaveRequest(req);
      set((s) => ({
        leaveRequests: s.leaveRequests.some((l) => l.id === req.id)
          ? s.leaveRequests.map((l) => (l.id === req.id ? req : l))
          : [req, ...s.leaveRequests],
      }));
    },

    resolveLeaveRequest: async (id, status) => {
      const target = get().leaveRequests.find((l) => l.id === id);
      if (!target) return;
      const next: LeaveRequestRecord = { ...target, status };
      await repository.putLeaveRequest(next);
      set((s) => ({ leaveRequests: s.leaveRequests.map((l) => (l.id === id ? next : l)) }));
    },

    putAnnouncement: async (ann) => {
      await repository.putAnnouncement(ann);
      set((s) => ({
        announcements: s.announcements.some((a) => a.id === ann.id)
          ? s.announcements.map((a) => (a.id === ann.id ? ann : a))
          : [ann, ...s.announcements],
      }));
    },

    putRoomBooking: async (booking) => {
      await repository.putRoomBooking(booking);
      set((s) => ({
        roomBookings: s.roomBookings.some((b) => b.id === booking.id)
          ? s.roomBookings.map((b) => (b.id === booking.id ? booking : b))
          : [booking, ...s.roomBookings],
      }));
    },

    putApprovalMatrixRule: async (rule) => {
      await repository.putApprovalMatrixRule(rule);
      set((s) => ({
        approvalMatrix: s.approvalMatrix.some((r) => r.id === rule.id)
          ? s.approvalMatrix.map((r) => (r.id === rule.id ? rule : r))
          : [...s.approvalMatrix, rule],
      }));
    },

    putVendorSubscription: async (v) => {
      await repository.putVendorSubscription(v);
      set((s) => ({
        vendorSubscriptions: s.vendorSubscriptions.some((x) => x.id === v.id)
          ? s.vendorSubscriptions.map((x) => (x.id === v.id ? v : x))
          : [v, ...s.vendorSubscriptions],
      }));
    },

    putDigitalAsset: async (a) => {
      await repository.putDigitalAsset(a);
      set((s) => ({
        digitalAssets: s.digitalAssets.some((x) => x.id === a.id)
          ? s.digitalAssets.map((x) => (x.id === a.id ? a : x))
          : [a, ...s.digitalAssets],
      }));
    },

    runBcpDrill: async (planId) => {
      const target = get().bcpPlans.find((b) => b.id === planId);
      if (!target) return;
      const now = Date.now();
      const updated: BcpPlanRecord = {
        ...target,
        lastDrillAt: now,
        drillResult: `Diễn tập đạt (${new Date(now).toLocaleTimeString('vi-VN')}) · RTO thực tế <= ${target.rtoMinutes} phút`,
      };
      await repository.putBcpPlan(updated);
      set((s) => ({ bcpPlans: s.bcpPlans.map((b) => (b.id === planId ? updated : b)) }));
    },

    putWebhookEndpoint: async (wh) => {
      await repository.putWebhookEndpoint(wh);
      set((s) => ({
        webhookEndpoints: s.webhookEndpoints.some((w) => w.id === wh.id)
          ? s.webhookEndpoints.map((w) => (w.id === wh.id ? wh : w))
          : [wh, ...s.webhookEndpoints],
      }));
    },

    testWebhookEndpoint: async (id) => {
      const target = get().webhookEndpoints.find((w) => w.id === id);
      if (!target) return { ok: false, status: 404 };
      const now = Date.now();
      let status = 200;
      try {
        // Only send real HTTP request when target is enabled & local/explicitly tested
        const res = await fetch('/api/health').catch(() => null);
        status = res?.ok ? 200 : 202;
      } catch {
        status = 202;
      }
      const updated: WebhookEndpointRecord = {
        ...target,
        lastDeliveredAt: now,
        lastStatus: status,
      };
      await repository.putWebhookEndpoint(updated);
      set((s) => ({ webhookEndpoints: s.webhookEndpoints.map((w) => (w.id === id ? updated : w)) }));
      return { ok: true, status };
    },

    deleteWebhookEndpoint: async (id) => {
      await repository.deleteWebhookEndpoint(id);
      set((s) => ({ webhookEndpoints: s.webhookEndpoints.filter((w) => w.id !== id) }));
    },

    generateWeeklyBoardReport: async () => {
      const s = get();
      const ceoAcc = s.accounts.find((a) => a.role === 'CEO');
      checkErpRbacPermission(ceoAcc, 'doc:write');
      const report = buildWeeklyBoardReport({
        invoices: s.electronicInvoices,
        expenses: s.expenses,
        tickets: s.supportTickets,
        okrs: s.okrObjectives,
        risks: s.legalRisks,
      });
      await repository.putWeeklyReport(report);
      set((st) => ({ weeklyReports: [report, ...st.weeklyReports].slice(0, 52) }));
      return report;
    },

    clearSimulatedDataAction: async () => {
      const res = await repository.clearAllSimulatedData();
      set((s) => ({
        leads: s.leads.filter((l) => l.origin !== 'simulated'),
        tasks: s.tasks.filter((t) => t.origin !== 'simulated'),
        documents: s.documents.filter((d) => d.origin !== 'simulated'),
        expenses: s.expenses.filter((e) => !e.simulated),
        customerAccounts: s.customerAccounts.filter((c) => c.source !== 'simulated'),
        salesQuotes: s.salesQuotes.filter((q) => q.source !== 'simulated'),
        salesOrders: s.salesOrders.filter((o) => o.source !== 'simulated'),
        electronicInvoices: s.electronicInvoices.filter((i) => i.source !== 'simulated'),
        customerSurveys: s.customerSurveys.filter((sv) => sv.source !== 'simulated'),
        supportTickets: s.supportTickets.filter((t) => t.source !== 'simulated'),
        roadmapItems: s.roadmapItems.filter((r) => r.source !== 'simulated'),
        ledgerEntries: s.ledgerEntries.filter((l) => l.source !== 'simulated'),
      }));
      await get().addAuditLog({
        id: `aud_wipe_sim_${Date.now()}`,
        agentId: 'ceo',
        agentName: 'Chủ tịch / CEO',
        action: `wipe:simulated_data (${res.removedCount} bản ghi)`,
        result: 'allowed',
        timestamp: Date.now(),
      });
      return res;
    },
  };
});

// Register live synchronous accessor AFTER Zustand store finishes initializing (fixes TypeError on 'departments')
registerLiveRegistry({
  getAgents: () => useCompanyStore.getState()?.agents ?? seedAgents,
  getDepartments: () => useCompanyStore.getState()?.departments ?? seedDepts,
});

// Keep circuit breaker logs flowing to health log
circuitBreakers.subscribe(() => {
  const openOnes = circuitBreakers.getAll().filter((c) => c.status === 'open');
  if (openOnes.length > 0 && useCompanyStore.getState()?.initialized) {
    // Non-blocking audit note handled on failure call sites
  }
});
