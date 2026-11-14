import { create } from 'zustand';
import {
  AdCampaignItem,
  AgentAccount,
  AgentAppearance,
  AgentMemory,
  AgentRuntimeState,
  AgentStatus,
  ApprovalRequest,
  AskCeoQuestion,
  AuditLogEntry,
  BrandLaunchKit,
  ChatChannelId,
  ChatMessage,
  CompanySettings,
  DocumentItem,
  LeadItem,
  LeadStage,
  MarketingChannelRecord,
  OutreachLogEntry,
  Permission,
  ProviderId,
  RoleRouteEntry,
  RoleType,
  RoutingPresetId,
  RoutingTaskGroup,
  Scene3dDiagnostics,
  ScheduledSocialPost,
  SocialCommentInboxItem,
  SocialPostLogEntry,
  TaskItem,
  TaskStatus,
  TokenUsageRecord,
  VaultAccountStatus,
  WorkflowTrace,
} from '../types';
import { AGENTS, getAgentById } from '../agents';
import { ROOMS } from '../config/departments';
import { CompanyMemoryRecord, createDefaultSettings, repository } from '../db/repository';
import { buildWalkWaypoints, MEETING_SEATS, Vec3 } from '../engine/waypoints';
import { generateHashedAgentToken, generateSalt, hashPasswordPBKDF2 } from '../engine/auth';
import { getDefaultAppearance } from '../engine/characterAppearance';
import { buildRoutingPreset, llmClient } from '../engine/llm';
import { buildDefaultBrandLaunchKit } from '../engine/marketingSeeds';

export type RightPanelTab =
  | 'chat'
  | 'marketing'
  | 'tasks'
  | 'crm'
  | 'logs'
  | 'docs'
  | 'approvals'
  | 'rbac'
  | 'vault'
  | 'tokens'
  | 'customizer'
  | 'settings';

export interface CameraTargetState {
  position: [number, number, number];
  lookAt: [number, number, number];
  nonce: number;
}

export interface CompanyState {
  initialized: boolean;
  loading: boolean;
  settings: CompanySettings;
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
  onAskCeoResolvedHook?: (q: AskCeoQuestion, answer: string) => Promise<void> | void;

  // UI HUD State
  activeTab: RightPanelTab;
  activeChannel: ChatChannelId;
  peekMode: boolean;
  selectedAgentId: string | null;
  selectedRoomId: string | null;
  visibleFloor: 'all' | 1 | 2;
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
  setActiveTab: (tab: RightPanelTab) => void;
  setActiveChannel: (channel: ChatChannelId) => void;
  setPeekMode: (peek: boolean) => void;
  selectAgent: (agentId: string | null, flyCamera?: boolean) => void;
  selectRoom: (roomId: string | null) => void;
  setVisibleFloor: (floor: 'all' | 1 | 2) => void;
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
  setAgentPostingSocial: (agentId: string, isPostingSocial: boolean, bubbleText?: string) => void;
  walkAgentToRoom: (agentId: string, toRoomId: string, targetPos?: Vec3) => void;
  walkAgentToMeetingSeat: (agentId: string, seatIndex: number) => void;
  returnAgentToDesk: (agentId: string) => void;
  advanceAgentPositions: (deltaSec: number) => void;

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
}

function buildInitialRuntimes(): Record<string, AgentRuntimeState> {
  const map: Record<string, AgentRuntimeState> = {};
  const now = Date.now();
  for (const agent of AGENTS) {
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

function buildDefaultAppearancesMap(): Record<string, AgentAppearance> {
  const map: Record<string, AgentAppearance> = {};
  for (const agent of AGENTS) {
    map[agent.id] = getDefaultAppearance(agent);
  }
  return map;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  initialized: false,
  loading: true,
  settings: {
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
    ceoPasswordHash: '',
    ceoPasswordSalt: '',
    mustChangeDefaultPassword: true,
    marketingAutopilotEnabled: false,
    marketingPostsPerWeek: 3,
    marketingDailyPostCap: 2,
    marketingDailyAdBudgetVnd: 500000,
  },
  accounts: [],
  agentAppearances: buildDefaultAppearancesMap(),
  runtimes: buildInitialRuntimes(),
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

  activeTab: 'chat',
  activeChannel: 'all',
  peekMode: false,
  selectedAgentId: null,
  selectedRoomId: null,
  visibleFloor: 'all',
  followAgentMode: false,
  dealCelebrationNonce: 0,
  cameraTarget: {
    position: [20, 17, 21],
    lookAt: [0, 1.8, 0],
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
      text: '[Zalo OA Giả lập] Sẵn sàng nhận câu hỏi khẩn & digest từ các Agent khi cần CEO quyết định.',
      timestamp: Date.now(),
    },
  ],
  serverHealth: null,

  init: async () => {
    set({ loading: true });
    const settings = await repository.getSettings();
    const savedDeepSeekKey = typeof window !== 'undefined' ? localStorage.getItem('aicompany_deepseek_key') || '' : '';
    const savedGeminiKey = typeof window !== 'undefined' ? localStorage.getItem('aicompany_gemini_key') || '' : '';
    const mergedSettings: CompanySettings = {
      ...settings,
      deepseekApiKey: savedDeepSeekKey || settings.deepseekApiKey,
      geminiApiKey: savedGeminiKey || settings.geminiApiKey,
    };

    const [
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
    ] = await Promise.all([
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
    ]);

    const agentMemories: Record<string, AgentMemory> = {};
    for (const m of agentMemsArr) {
      agentMemories[m.agentId] = m;
    }

    const agentAppearances = buildDefaultAppearancesMap();
    for (const app of appearancesArr) {
      agentAppearances[app.agentId] = app;
    }

    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', mergedSettings.theme === 'dark');
    }

    // Configure Multi-Provider LLMRouter
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
            content: `⚠️ **Thông báo chuyển dự phòng AI:** ${msg}`,
            busType: 'escalation',
          });
        }
      },
    });

    const health = await llmClient.detectEnvironment();

    set({
      initialized: true,
      loading: false,
      settings: mergedSettings,
      accounts,
      agentAppearances,
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
      agentMemories,
      companyMemories,
      workflows,
      brandKit: brandKit || buildDefaultBrandLaunchKit(mergedSettings.companyName),
      marketingChannels,
      scheduledPosts,
      adCampaigns,
      socialComments,
      socialLogs,
      serverHealth: {
        mode: health.mode,
        hasGeminiEnvKey: health.hasGeminiEnvKey,
        hasDeepSeekEnvKey: health.hasDeepSeekEnvKey,
        hasSearchKey: health.hasSearchKey,
      },
      unreadNotifications:
        approvals.filter((a) => a.status === 'pending').length +
        askCeoQuestions.filter((q) => q.status === 'pending').length,
    });
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
        : { position: [20, 17, 21] as [number, number, number], lookAt: [0, 1.8, 0] as [number, number, number] };
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
    const agent = getAgentById(agentId);
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
    const room = ROOMS.find((r) => r.id === roomId);
    if (room) {
      set((s) => ({
        selectedRoomId: roomId,
        followAgentMode: false,
        visibleFloor: s.visibleFloor === 'all' ? 'all' : room.floor,
        cameraTarget: {
          position: room.cameraOffset,
          lookAt: room.center,
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
          : status === 'idle'
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
    const agent = getAgentById(agentId);
    const room = ROOMS.find((r) => r.id === toRoomId);
    if (!agent || !room) return;
    const runtime = get().runtimes[agentId];
    const fromPos = runtime?.currentPosition || agent.deskPosition;
    const fromRoomId =
      fromPos[1] > 1.9 ? (agent.floor === 2 ? agent.roomId : 'room-exec') : agent.floor === 1 ? agent.roomId : 'room-sales';
    const dest = targetPos || room.center;
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
    const agent = getAgentById(agentId);
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
    const currentRoom =
      runtime.currentPosition[1] < 1.9 && runtime.currentPosition[0] > -1.5 && runtime.currentPosition[2] < -1.2
        ? 'room-meeting'
        : agent.roomId;
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

  saveAgentAppearance: async (app) => {
    set((s) => ({
      agentAppearances: { ...s.agentAppearances, [app.agentId]: app },
    }));
    await repository.putAgentAppearance(app);
  },

  resetAgentAppearance: async (agentId) => {
    const agent = getAgentById(agentId);
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
    const next = {
      ...get().settings,
      killSwitchActive: true,
      autopilotEnabled: false,
      marketingAutopilotEnabled: false,
      paused: true,
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
    set({
      settings: next,
      runtimes: nextRuntimes,
      bannerAlert: 'KILL SWITCH ĐÃ KÍCH HOẠT: Toàn bộ agent, Autopilot và cuộc gọi LLM đã dừng ngay lập tức.',
    });
    await repository.saveSettings(next);
    await get().addMessage({
      channelId: 'all',
      senderId: 'system',
      senderName: 'Hệ thống An toàn',
      senderTitle: 'KILL SWITCH',
      department: 'exec',
      content: '🛑 **KILL SWITCH kích hoạt bởi CEO.** Mọi tác vụ chạy ngầm và Autopilot đã dừng tức thì.',
      busType: 'escalation',
    });
  },

  resumeFromKillSwitch: async () => {
    const next = { ...get().settings, killSwitchActive: false, paused: false };
    set({ settings: next, bannerAlert: null });
    await repository.saveSettings(next);
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
    set((s) => {
      const idx = s.tasks.findIndex((t) => t.id === task.id);
      const next = idx >= 0 ? s.tasks.map((t) => (t.id === task.id ? task : t)) : [task, ...s.tasks];
      return { tasks: next };
    });
    await repository.putTask(task);
  },

  moveTaskStatus: async (taskId, status) => {
    const existing = get().tasks.find((t) => t.id === taskId);
    if (!existing) return;
    await get().putTask({ ...existing, status, updatedAt: Date.now() });
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

    // Activate approved Social Post or Paid Ad Campaign seamlessly
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

    const agent = getAgentById(req.requestedBy);
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

    const agent = getAgentById(q.agentId);
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
    const acc = get().accounts.find((a) => a.agentId === agentId);
    if (!acc) return;
    const updated: AgentAccount = {
      ...acc,
      status: acc.status === 'active' ? 'suspended' : 'active',
    };
    set((s) => ({ accounts: s.accounts.map((a) => (a.agentId === agentId ? updated : a)) }));
    await repository.putAccount(updated);
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
}));
