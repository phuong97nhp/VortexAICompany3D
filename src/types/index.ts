export type DepartmentId =
  | 'exec'
  | 'marketing'
  | 'sales'
  | 'cs'
  | 'product'
  | 'data'
  | 'backoffice'
  | 'reception';

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
  | 'ads:manage';

export type AgentStatus =
  | 'idle'
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
  | 'create_ad_campaign';

export interface AgentProfile {
  id: string;
  name: string;
  title: string;
  department: DepartmentId;
  floor: 1 | 2;
  roomId: string;
  deskPosition: [number, number, number];
  deskRotationY?: number;
  avatarColor: string;
  accentColor: string;
  role: RoleType;
  usesReasoner?: boolean;
  allowedTools: ToolName[];
  defaultPermissions: Permission[];
  systemPrompt: string;
  bio: string;
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

export type TaskStatus = 'todo' | 'in_progress' | 'waiting_approval' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  department: DepartmentId;
  assignedTo: string;
  createdBy: string;
  status: TaskStatus;
  priority: TaskPriority;
  productId?: string;
  relatedLeadId?: string;
  createdAt: number;
  updatedAt: number;
  dueLabel?: string;
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
  | 'timeline';

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
}

export type ApprovalType = 'budget' | 'quote' | 'contract' | 'public_post' | 'outreach' | 'permission';

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
  stepType?: 'otp' | 'captcha' | '2fa' | 'kyc' | 'payment' | 'general';
  resumeAction?: {
    type: 'channel_setup' | 'social_escalation';
    channelId?: string;
    nextStep?: number;
    commentId?: string;
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
}

export type AutonomyLevel = 1 | 2 | 3;
export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface CompanySettings {
  id: 'default';
  companyName: string;
  // Multi-Provider AI Brain settings
  primaryProvider: ProviderId;
  fallbackProvider: ProviderId;
  geminiApiKey: string; // Optional manual fallback if env GEMINI_API_KEY not provided
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
  dayNumber: number; // 1..30 on the 30-day calendar
  scheduledTime: string; // e.g. '19:30'
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
