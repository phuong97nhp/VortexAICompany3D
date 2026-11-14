export type BuiltinDepartmentId =
  | 'exec'
  | 'marketing'
  | 'sales'
  | 'cs'
  | 'product'
  | 'data'
  | 'backoffice'
  | 'reception';

// Dynamic DepartmentId allows builtin + CEO-created custom departments (BỔ SUNG D)
export type DepartmentId = BuiltinDepartmentId | (string & {});

export type RoleType = 'CEO' | 'Exec' | 'Dept Head' | 'Specialist' | 'Read-only';

export type Permission =
  | 'lead:read'
  | 'lead:write'
  | 'lead:export'
  | 'account:create'
  | 'vault:use'
  | 'outreach:send'
  | 'quote:create'
  | 'quote:send'
  | 'contract:draft'
  | 'doc:write'
  | 'task:assign'
  | 'meeting:call'
  | 'budget:spend'
  | 'kpi:read'
  | 'approval:request'
  | 'settings:write'
  | 'memory:read'
  | 'memory:write'
  | 'browser:use'
  | 'post:publish'
  | 'ads:manage'
  | 'hr:manage'
  | 'expense:request'
  | 'expense:review'
  | 'expense:approve_final'
  | 'expense:rule_manage'
  | 'policy:write'
  | 'expense:mark_paid'
  | 'hubcw:read'
  | 'hubcw:write';

export type AgentStatus =
  | 'idle'
  | 'sleeping'
  | 'thinking'
  | 'typing'
  | 'talking'
  | 'in_meeting'
  | 'walking'
  | 'blocked'
  | 'done'
  | 'error';

export type ToolName =
  | 'create_task'
  | 'assign_task'
  | 'send_message'
  | 'call_meeting'
  | 'write_document'
  | 'search_web'
  | 'fetch_page'
  | 'read_memory'
  | 'write_memory'
  | 'generate_report'
  | 'request_approval'
  | 'request_permission'
  | 'ask_ceo'
  | 'find_leads'
  | 'save_lead'
  | 'update_lead'
  | 'score_lead'
  | 'send_outreach'
  | 'schedule_followup'
  | 'create_account'
  | 'browser_action'
  | 'create_quote'
  | 'get_kpis'
  | 'generate_brand_kit'
  | 'provision_channel'
  | 'schedule_social_post'
  | 'publish_social_post'
  | 'reply_social_comment'
  | 'create_ad_campaign'
  | 'hire_agent'
  | 'request_expense'
  | 'review_expense'
  | 'pay_expense'
  | 'buy_domain'
  | 'subscribe_tool'
  | 'spend'
  | 'hubcw_read'
  | 'hubcw_write'
  | 'hubcw_sync';

export type EmploymentStatus = 'active' | 'suspended' | 'archived';

export interface AgentProfile {
  id: string;
  name: string;
  nickname?: string;
  gender?: 'male' | 'female' | 'other';
  title: string;
  department: DepartmentId;
  floor: 1 | 2;
  roomId: string;
  deskPosition: [number, number, number];
  deskRotationY?: number;
  avatarColor: string;
  accentColor: string;
  role: RoleType;
  reportsTo?: string;
  usesReasoner?: boolean;
  allowedTools: ToolName[];
  defaultPermissions: Permission[];
  systemPrompt: string;
  bio: string;
  personalityNote?: string;
  toneStyle?: string;
  templateId?: string;
  providerOverride?: ProviderId | 'company_default';
  modelOverride?: string;
  sleepWhenIdle?: boolean;
  employmentStatus?: EmploymentStatus;
  archivedAt?: number;
  archivedReason?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface DepartmentConfig {
  id: string;
  name: string;
  shortName: string;
  floor: 1 | 2;
  color: string;
  bgTint: string;
  badgeText: string;
  description: string;
  roomId: string;
  roomCenter: [number, number, number];
  roomSize: [number, number];
  cameraOffset: [number, number, number];
  isCustom?: boolean;
  collapsed?: boolean;
}

export interface RoleTemplate {
  id: string;
  title: string;
  department: DepartmentId;
  role: RoleType;
  usesReasoner?: boolean;
  defaultTools: ToolName[];
  defaultPermissions: Permission[];
  defaultTone: string;
  promptTemplate: string;
  bioTemplate: string;
  gender: 'male' | 'female';
  hairStyle: HairStyleId;
  outfitStyle: OutfitStyleId;
  accessory: AccessoryId;
}

export interface HrAuditEntry {
  id: string;
  action:
    | 'hire'
    | 'batch_hire'
    | 'update'
    | 'rename'
    | 'move_dept'
    | 'clone'
    | 'suspend'
    | 'resume'
    | 'offboard'
    | 'rehire'
    | 'delete'
    | 'dept_create'
    | 'dept_update'
    | 'dept_delete';
  actor: string;
  targetId: string;
  targetName: string;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  timestamp: number;
}

export interface AgentRuntimeState {
  agentId: string;
  status: AgentStatus;
  currentPosition: [number, number, number];
  targetPosition: [number, number, number];
  waypoints: Array<[number, number, number]>;
  bubbleText?: string;
  bubbleExpiresAt?: number;
  currentTaskTitle?: string;
  progressPercent?: number;
  isPostingSocial?: boolean;
  isDelayed?: boolean;
  pendingReviewCount?: number;
  exiting?: boolean;
  lastHeartbeatAt: number;
}

export interface AgentAccount {
  agentId: string;
  username: string;
  internalEmail: string;
  role: RoleType;
  department: DepartmentId;
  status: 'active' | 'suspended';
  tokenHash: string;
  permissions: Permission[];
  lastActiveAt: number;
}

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'waiting_approval'
  | 'review'
  | 'blocked'
  | 'done'
  | 'failed'
  | 'waiting_resume';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskDeliverableLink {
  type: 'doc' | 'lead' | 'quote' | 'expense' | 'post' | 'report' | 'agent';
  id: string;
  title: string;
}

export interface TaskItem {
  id: string;
  taskCode: string;
  title: string;
  description: string;
  definitionOfDone: string;
  expectedDeliverable: string;
  department: DepartmentId;
  assignedTo: string;
  createdBy: string;
  status: TaskStatus;
  priority: TaskPriority;
  productId?: string;
  relatedLeadId?: string;
  etaMinutes: number;
  etaAt: number;
  startedAt?: number;
  completedAt?: number;
  progressPercent: number;
  lastProgressAt: number;
  lastNotifiedPct?: number;
  delayNotified?: boolean;
  escalatedLevel?: number;
  deliverables: TaskDeliverableLink[];
  failureReason?: string;
  ceoFeedback?: string;
  channelId?: ChatChannelId;
  createdAt: number;
  updatedAt: number;
  dueLabel?: string;
  origin?: OriginTag;
  provenance?: DataProvenance;
  externalRefId?: string;
  verificationStatus?: VerificationStatus;
}

export type LeadStage = 'new' | 'contacted' | 'replied' | 'demo' | 'proposal' | 'won' | 'lost';

export interface LeadInteraction {
  id: string;
  channel: 'Email' | 'Zalo OA' | 'Facebook' | 'Phone' | 'Demo' | 'System';
  direction: 'outbound' | 'inbound' | 'internal';
  content: string;
  agentId: string;
  timestamp: number;
  dryRun: boolean;
}

export interface LeadItem {
  id: string;
  name: string;
  category: 'Trung tâm ngoại ngữ' | 'Trường mầm non' | 'Doanh nghiệp kho/bán lẻ' | 'Doanh nghiệp SME';
  address: string;
  province: string;
  website?: string;
  email?: string;
  phone?: string;
  zalo?: string;
  fanpage?: string;
  source: string;
  score: number;
  scoreReason: string;
  recommendedProductId: string;
  stage: LeadStage;
  assignedAgentId: string;
  followUpCount: number;
  lastContactedAt?: number;
  nextFollowUpAt?: number;
  blacklisted: boolean;
  estimatedValueVnd: number;
  interactions: LeadInteraction[];
  createdAt: number;
  origin?: OriginTag;
  provenance?: DataProvenance;
  externalRefId?: string;
  verificationStatus?: VerificationStatus;
}

export type ChatChannelId =
  | 'all'
  | 'meeting'
  | 'exec'
  | 'marketing'
  | 'sales'
  | 'cs'
  | 'product'
  | 'data'
  | 'backoffice'
  | 'ask_ceo'
  | string;

export type MessageCardType =
  | 'text'
  | 'approval'
  | 'ask_ceo'
  | 'document'
  | 'lead'
  | 'meeting_minutes'
  | 'kpi'
  | 'timeline'
  | 'task_ack'
  | 'task_progress'
  | 'task_report'
  | 'system_blocker'
  | 'hr_proposal'
  | 'expense'
  | 'expense_rule';

export interface ChatMessage {
  id: string;
  channelId: ChatChannelId;
  senderId: string;
  senderName: string;
  senderTitle: string;
  department: DepartmentId | 'ceo';
  content: string;
  timestamp: number;
  busType?: 'request' | 'report' | 'question' | 'approval_needed' | 'escalation' | 'chat';
  isInternalPeek?: boolean;
  threadParentId?: string;
  cardType?: MessageCardType;
  cardData?: Record<string, unknown>;
  mentions?: string[];
}

export type DocumentCategory =
  | 'strategy'
  | 'content'
  | 'seo'
  | 'quote'
  | 'contract'
  | 'meeting_minutes'
  | 'faq'
  | 'report'
  | 'research';

export interface DocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  authorId: string;
  department: DepartmentId;
  productId?: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  origin?: OriginTag;
  provenance?: DataProvenance;
  externalRefId?: string;
  verificationStatus?: VerificationStatus;
}

export type ApprovalType = 'budget' | 'quote' | 'contract' | 'public_post' | 'outreach' | 'permission' | 'expense' | 'hr_hire';

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  requestedBy: string;
  department: DepartmentId;
  amountVnd?: number;
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  ceoNote?: string;
  createdAt: number;
  resolvedAt?: number;
}

export interface AskCeoQuestion {
  id: string;
  agentId: string;
  department: DepartmentId;
  question: string;
  options: string[];
  urgency: 'normal' | 'urgent';
  context: string;
  stepType?: 'otp' | 'captcha' | '2fa' | 'kyc' | 'payment' | 'expense_confirm' | 'general';
  resumeAction?: {
    type: 'channel_setup' | 'social_escalation' | 'expense_approval' | 'expense_rule_confirm';
    channelId?: string;
    nextStep?: number;
    commentId?: string;
    expenseId?: string;
    ruleId?: string;
  };
  status: 'pending' | 'answered' | 'reminded' | 'expired';
  answer?: string;
  answeredVia?: 'web' | 'zalo_sim' | 'zalo_oa';
  remindedAt?: number;
  createdAt: number;
  answeredAt?: number;
}

export interface AuditLogEntry {
  id: string;
  agentId: string;
  agentName: string;
  action: string;
  permission?: Permission;
  resource?: string;
  result: 'allowed' | 'denied';
  reason?: string;
  externalRefId?: string;
  idempotencyKey?: string;
  origin?: OriginTag;
  timestamp: number;
}

export interface OutreachLogEntry {
  id: string;
  agentId: string;
  agentName: string;
  leadId: string;
  leadName: string;
  channel: 'Email' | 'Zalo OA' | 'Facebook' | 'Phone';
  subjectOrPreview: string;
  result: 'sent_dry_run' | 'sent_live' | 'blocked_quota' | 'blocked_hours' | 'blocked_blacklist' | 'blocked_approval';
  dryRun: boolean;
  timestamp: number;
}

export interface VaultAccountStatus {
  id: string;
  platform: string;
  handle: string;
  purpose: string;
  playbook: string;
  status: 'connected' | 'dry_run_ready' | 'needs_verification' | 'not_created';
  managedBy: string;
  lastCheckedAt: number;
  note?: string;
}

export type ProviderId = 'gemini' | 'deepseek' | 'local' | 'mock';

export type RoutingTaskGroup =
  | 'leadership'
  | 'marketing'
  | 'sales_sdr'
  | 'sales_closing'
  | 'product_cs'
  | 'memory_summary';

export interface RoleRouteEntry {
  group: RoutingTaskGroup;
  label: string;
  provider: ProviderId;
  model: string;
}

export type RoutingPresetId = 'balanced' | 'economy' | 'quality' | 'offline';

export interface TokenUsageRecord {
  id: string;
  dateKey: string;
  agentId: string;
  department: DepartmentId;
  provider: ProviderId;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  cached: boolean;
  timestamp: number;
}

export interface AgentMemory {
  agentId: string;
  shortTerm: string[];
  longTermSummary: string;
  updatedAt: number;
}

export interface WorkflowTrace {
  id: string;
  title: string;
  steps: Array<{
    agentId: string;
    agentName: string;
    label: string;
    status: 'pending' | 'running' | 'done' | 'blocked';
    timestamp: number;
  }>;
  createdAt: number;
}

export type HairStyleId =
  | 'short_neat'
  | 'side_part'
  | 'bob'
  | 'ponytail'
  | 'curly'
  | 'spiky'
  | 'bun'
  | 'long_wave'
  | 'undercut'
  | 'cap_hat';

export type OutfitStyleId = 'casual' | 'vest' | 'hoodie' | 'shirt';

export type AccessoryId = 'none' | 'glasses' | 'headset' | 'tie' | 'beret' | 'badge' | 'backpack';

export type LogoPlacement = 'chest' | 'chest_back' | 'chest_cap';

export interface AgentAppearance {
  agentId: string;
  hairStyle: HairStyleId;
  hairColor: string;
  skinTone: string;
  outfitStyle: OutfitStyleId;
  outfitColor: string;
  outfitAccent: string;
  pantsColor: string;
  accessory: AccessoryId;
  useUniform?: boolean;
  logoPlacement?: LogoPlacement;
  showBadge?: boolean;
}

export type AutonomyLevel = 1 | 2 | 3;
export type GraphicsQuality = 'low' | 'medium' | 'high';

// === BỔ SUNG E: EXPENSE MANAGEMENT, ACCOUNTING & AUTO-APPROVAL RULES ===
export type ExpenseStatus =
  | 'draft'
  | 'pending_accountant'
  | 'needs_info'
  | 'pending_ceo'
  | 'rejected'
  | 'approved'
  | 'paid'
  | 'reconciled';

export type ExpenseFrequency = 'once' | 'recurring';

export interface ExpenseAuditStep {
  at: number;
  actorId: string;
  actorName: string;
  fromStatus: ExpenseStatus;
  toStatus: ExpenseStatus;
  note?: string;
}

export interface ExpenseItem {
  id: string;
  expenseCode: string; // e.g. #CP-101
  requesterId: string;
  department: DepartmentId;
  projectOrCampaign: string;
  category: string;
  title: string;
  amountVnd: number;
  frequency: ExpenseFrequency;
  recurringCycleDays?: number;
  nextDueAt?: number;
  justification: string;
  expectedRoi: string;
  vendor: string;
  dueDate: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
  receiptNote?: string;
  status: ExpenseStatus;
  accountantId?: string;
  accountantNote?: string;
  accountantCheckedAt?: number;
  ceoDecisionNote?: string;
  ceoDecidedAt?: number;
  paidAt?: number;
  paidNote?: string;
  reconciledAt?: number;
  autoApprovedByRuleId?: string;
  autoApprovedByRuleName?: string;
  autoBypassReason?: string;
  flags: string[];
  simulated: boolean;
  history: ExpenseAuditStep[];
  createdAt: number;
  updatedAt: number;
  origin?: OriginTag;
  provenance?: DataProvenance;
  externalRefId?: string;
  verificationStatus?: VerificationStatus;
}

export type ExpenseRuleType = 'accountant_auto' | 'full_auto';

export interface ExpenseRule {
  id: string;
  ruleCode: string; // #QT-01
  name: string;
  ruleType: ExpenseRuleType;
  category: string; // exact category or '*'
  vendorPattern: string; // substring/regex or '*'
  department: DepartmentId | 'all';
  requesterId: string | 'all';
  maxPerExpenseVnd: number;
  maxPerMonthVnd: number;
  maxCountPerMonth: number;
  requiresAttachment: boolean;
  expiresAt: number;
  enabled: boolean;
  revokedByCeo?: boolean;
  ceoConfirmedOnce: boolean;
  createdBy: string;
  usageMonthKey: string;
  usedCountMonth: number;
  usedAmountMonthVnd: number;
  createdAt: number;
  updatedAt: number;
}

export interface ExpenseBudget {
  id: string; // e.g. 2025-05::marketing::Quảng cáo
  monthKey: string; // YYYY-MM
  department: DepartmentId | 'all';
  category: string;
  limitVnd: number;
  proposedBy: string;
  ceoApproved: boolean;
  unlockedOverLimit?: boolean;
  warned80?: boolean;
  warned100?: boolean;
  updatedAt: number;
}

export interface ExpenseCategoryConfig {
  id: string;
  name: string;
  isDefault?: boolean;
  blockedForAutoDefault?: boolean;
}

export interface SpendingPolicy {
  autoApproveMaxPerTxVnd: number;
  autoApproveMaxPerMonthVnd: number;
  mandatoryCeoThresholdVnd: number;
  allowedAutoCategories: string[];
  blockedAutoCategories: string[];
  requireOneTimeCeoRuleConfirm: boolean;
  blockBudgetAt100Percent: boolean;
  anomalyThresholdPercent: number; // default 30
  overdueReminderHours: number;
  updatedAt: number;
}

export interface CompanySettings {
  id: 'default';
  companyName: string;
  // Multi-Provider AI Brain settings
  primaryProvider: ProviderId;
  fallbackProvider: ProviderId;
  geminiApiKey: string;
  deepseekApiKey: string;
  deepseekMode: 'proxy' | 'direct';
  localBaseUrl: string;
  localModel: string;
  localApiKey: string;
  localUseWorkerProxy: boolean;
  routingPreset: RoutingPresetId;
  roleRoutes: RoleRouteEntry[];
  // Per-provider daily token budgets
  providerBudgets: Record<ProviderId, number>;
  dailyTokenBudget: number;
  dryRun: boolean;
  autonomyLevel: AutonomyLevel;
  autopilotEnabled: boolean;
  autopilotIntervalMinutes: number;
  autopilotDailyLeadTarget: number;
  priorityProductId: string;
  simulationSpeed: 1 | 2 | 4;
  paused: boolean;
  killSwitchActive: boolean;
  theme: 'dark' | 'light';
  dayNightMode: 'day' | 'night';
  graphicsQuality: GraphicsQuality;
  // SDR guardrails
  sdrDailyLimitEmail: number;
  sdrDailyLimitOther: number;
  sdrAllowedStartHour: number;
  sdrAllowedEndHour: number;
  sdrMaxFollowups: number;
  sdrMinDaysBetweenFollowups: number;
  // Zalo Ask CEO settings
  zaloMaxMessagesPerHour: number;
  zaloDndStartHour: number;
  zaloDndEndHour: number;
  zaloOverdueHours: number;
  // CEO Password security
  ceoPasswordHash: string;
  ceoPasswordSalt: string;
  mustChangeDefaultPassword: boolean;
  // Marketing Autopilot & Safe Cadence Guardrails
  marketingAutopilotEnabled: boolean;
  marketingPostsPerWeek: number;
  marketingDailyPostCap: number;
  marketingDailyAdBudgetVnd: number;
  // BỔ SUNG D: HR & Resource Guardrails
  hrAutoDecide: boolean;
  sleepIdleAgents: boolean;
  maxConcurrentAgents: number;
  // BỔ SUNG E: Spending Policy
  spendingPolicy: SpendingPolicy;
  // BỔ SUNG F: Daily digest summary toggle
  dailyDigestEnabled: boolean;
  // BỔ SUNG G & H: Environment, HubCW Connector & Brand Uniform
  envMode: SystemEnvMode;
  hubcw: HubCwSettings;
  brand: BrandSettings;
}

export type SocialPlatformId =
  | 'tiktok'
  | 'facebook'
  | 'zalo_oa'
  | 'youtube'
  | 'google_business'
  | 'linkedin'
  | 'email';

export type ChannelSetupStatus = 'not_created' | 'provisioning' | 'waiting_ceo_otp' | 'ready';

export interface MarketingChannelRecord {
  id: SocialPlatformId;
  platform: SocialPlatformId;
  label: string;
  handle: string;
  bio: string;
  category: string;
  websiteUrl: string;
  avatarSpec: string;
  bannerSpec: string;
  status: ChannelSetupStatus;
  progressStep: number;
  totalSteps: number;
  stepLabels: string[];
  pausedReason?: string;
  pendingAskId?: string;
  accountUrl: string;
  apiMode: 'simulated' | 'official_api' | 'playbook';
  tokenStatus: 'simulated' | 'active' | 'refreshing' | 'not_linked';
  metrics: {
    followers: number;
    views: number;
    engagement: number;
    clicks: number;
    leads: number;
  };
  updatedAt: number;
}

export interface BrandLaunchKit {
  id: string;
  brandName: string;
  handle: string;
  tagline: string;
  voiceTone: string;
  contentPillars: Array<{ title: string; ratioPercent: number; description: string }>;
  productDescriptions: Array<{ productId: string; shortName: string; summary: string }>;
  biosByPlatform: Record<SocialPlatformId, string>;
  imagePrompts: Array<{
    id: string;
    slot: 'Logo' | 'Avatar' | 'Banner';
    platform: string;
    dimensions: string;
    prompt: string;
  }>;
  hashtags: string[];
  videoScripts: Array<{ id: string; title: string; durationSec: number; hook: string; body: string; cta: string }>;
  createdAt: number;
}

export type SocialPostStatus = 'draft' | 'waiting_approval' | 'approved' | 'published' | 'blocked';

export interface ScheduledSocialPost {
  id: string;
  platform: SocialPlatformId;
  dayNumber: number;
  scheduledTime: string;
  title: string;
  content: string;
  hashtags: string[];
  pillar: string;
  mediaType: 'video' | 'image' | 'carousel' | 'article';
  mediaDimensions: string;
  imagePrompt: string;
  status: SocialPostStatus;
  hasPricingOrClaim: boolean;
  isFirstPostOnPlatform: boolean;
  requiresApprovalReason?: string;
  approvalId?: string;
  authorId: string;
  simulated: boolean;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    leads: number;
  };
  publishedAt?: number;
  createdAt: number;
}

export interface AdCampaignItem {
  id: string;
  name: string;
  platform: 'facebook' | 'tiktok' | 'zalo_oa' | 'google_business';
  objective: 'Leads' | 'Traffic' | 'Messages';
  audience: string;
  dailyBudgetVnd: number;
  totalBudgetVnd: number;
  expenseId?: string;
  variants: Array<{ label: string; headline: string; primaryText: string }>;
  status: 'pending_approval' | 'approved' | 'active' | 'paused' | 'rejected';
  approvalId?: string;
  impressions: number;
  clicks: number;
  leads: number;
  spentVnd: number;
  createdAt: number;
}

export interface SocialCommentInboxItem {
  id: string;
  platform: SocialPlatformId;
  postId?: string;
  authorName: string;
  type: 'comment' | 'inbox';
  message: string;
  intent: 'inquiry_lead' | 'pricing' | 'complaint' | 'sensitive' | 'general';
  status: 'new' | 'replied' | 'escalated_ceo' | 'converted_lead';
  agentReply?: string;
  linkedLeadId?: string;
  askCeoId?: string;
  createdAt: number;
}

export interface SocialPostLogEntry {
  id: string;
  postId?: string;
  platform: SocialPlatformId;
  agentId: string;
  agentName: string;
  actionType: 'publish_post' | 'reply_comment' | 'schedule_post' | 'ad_campaign';
  preview: string;
  result: 'published_sim' | 'published_live' | 'replied_sim' | 'blocked_approval' | 'blocked_quota' | 'blocked_killswitch';
  simulated: boolean;
  timestamp: number;
}

export interface RoomMeshStat {
  roomId: string;
  roomName: string;
  meshCount: number;
  instanceCount: number;
  characterCount: number;
}

export interface Scene3dDiagnostics {
  fps: number;
  totalMeshes: number;
  totalInstancedMeshes: number;
  totalInstances: number;
  characterCount: number;
  roomStats: RoomMeshStat[];
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraDistance: number;
  buildingBounds: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
  };
  rendererInfo: string;
  isSoftwareGl: boolean;
  webglError: string | null;
  updatedAt: number;
}

// === BỔ SUNG G & H: HUB.CHUYENWEB.COM CONNECTOR, UNIFORM & HARD DATA PROVENANCE ===

export type SystemEnvMode = 'sandbox' | 'read_only' | 'live';

export type OriginTag = 'simulated' | 'hubcw_live' | 'user_verified' | 'system_calculated';

export type VerificationStatus = 'verified' | 'pending_verification' | 'simulated' | 'blocked';

export type ProvenanceSource =
  | 'hubcw_record'
  | 'user_input'
  | 'external_document'
  | 'verified_web'
  | 'platform_api'
  | 'calculation'
  | 'llm_generated'
  | 'estimated'
  | 'unknown';

export interface DataProvenance {
  source: ProvenanceSource;
  origin?: OriginTag;
  refId?: string;
  sourceLabel?: string;
  verifiedAt?: number;
  verifiedBy?: string;
  inputs?: Record<string, unknown>;
  formula?: string;
}

export type HubCwModuleId =
  | 'dashboard'
  | 'customers'
  | 'orders'
  | 'wallet'
  | 'golden_pig'
  | 'resources'
  | 'automation'
  | 'accounts'
  | 'licenses'
  | 'products'
  | 'cashflow'
  | 'reports'
  | 'users'
  | 'tasks'
  | 'support'
  | 'documents'
  | 'permissions'
  | 'notifications'
  | 'settings';

export type HubCwConnectionMode = 'api' | 'browser' | 'sandbox';

export interface HubCwModuleHealth {
  moduleId: HubCwModuleId;
  status: 'ok' | 'error' | 'unsupported' | 'untested';
  latencyMs?: number;
  lastCheckedAt?: number;
  message?: string;
}

export interface BrandSettings {
  logoDataUrl?: string;
  logoName?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  defaultUniformStyle: OutfitStyleId;
}

export interface HubCwSettings {
  baseUrl: string;
  connectionMode: HubCwConnectionMode;
  hourlyWriteLimit: number;
  requireApprovalForCritical: boolean;
  unclearWriteUnlocked: Partial<Record<'golden_pig' | 'automation' | 'resources', boolean>>;
  lastHealthCheckAt?: number;
  moduleHealth: Record<string, HubCwModuleHealth>;
}

export type ExternalAccountStatus =
  | 'unlinked'
  | 'pending_creation'
  | 'active'
  | 'suspended'
  | 'error';

export interface HubCwModulePermissionFlag {
  read: boolean;
  write: boolean;
}

export interface AgentExternalAccount {
  agentId: string;
  system: 'hubcw';
  externalUserId?: string;
  username?: string;
  email?: string;
  externalRole?: string;
  externalPermissions: Record<HubCwModuleId, HubCwModulePermissionFlag>;
  status: ExternalAccountStatus;
  linkedAt?: number;
  lastActivityAt?: number;
  tokenExpiresAt?: number;
  lastError?: string;
  handoverNote?: string;
}

export interface EncryptedCredentialRecord {
  id: string; // `${agentId}::hubcw`
  agentId: string;
  system: 'hubcw';
  authType: 'token' | 'password_session';
  ivHex: string;
  ciphertextB64: string;
  keyFingerprint: string;
  updatedAt: number;
}

export interface HubCwApiLog {
  id: string;
  agentId: string;
  agentName: string;
  externalUserId?: string;
  module: HubCwModuleId;
  operation: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'BROWSER';
  endpoint: string;
  envMode: SystemEnvMode;
  connectionMode: HubCwConnectionMode;
  result: 'ok' | 'blocked_gate' | 'blocked_permission' | 'blocked_killswitch' | 'error';
  statusCode?: number;
  externalRecordId?: string;
  idempotencyKey?: string;
  requestId?: string;
  reason?: string;
  durationMs: number;
  timestamp: number;
}

export interface HubCwSyncItem {
  id: string;
  direction: 'pull_from_hubcw' | 'push_to_hubcw';
  module: HubCwModuleId;
  agentId: string;
  entityType: 'lead' | 'task' | 'order' | 'support' | 'cashflow' | 'report' | 'notification';
  localId?: string;
  externalId?: string;
  payload: Record<string, unknown>;
  provenance?: DataProvenance;
  status: 'queued' | 'synced' | 'conflict' | 'blocked' | 'failed';
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface HubCwUndoSnapshot {
  id: string;
  agentId: string;
  agentName: string;
  module: HubCwModuleId;
  operation: 'create' | 'update' | 'delete';
  externalRecordId: string;
  endpoint: string;
  beforeData?: Record<string, unknown> | null;
  afterData: Record<string, unknown>;
  idempotencyKey: string;
  requestId: string;
  reverted: boolean;
  revertedAt?: number;
  createdAt: number;
}

export interface HubCwReconciliationDiscrepancy {
  id: string;
  module: HubCwModuleId;
  localId?: string;
  externalId?: string;
  field: string;
  localValue: string;
  hubcwValue: string;
  severity: 'info' | 'warning' | 'critical';
  note: string;
}

export interface HubCwReconciliationReport {
  id: string;
  totalLocalRecords: number;
  validProvenanceCount: number;
  validProvenancePercent: number;
  simulatedRecordCount: number;
  blockedWriteCount: number;
  topBlockedReasons: Array<{ reason: string; count: number }>;
  discrepancies: HubCwReconciliationDiscrepancy[];
  createdAt: number;
}

