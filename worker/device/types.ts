export type DeviceDriverType = 'adb_usb' | 'adb_wifi' | 'emulator' | 'mock';
export type DeviceConnectionStatus = 'unauthorized' | 'device' | 'offline' | 'controlled' | 'error';
export type DeviceControlMode = 'view_only' | 'approved_actions' | 'policy_auto';

export interface DeviceTaskCheckpoint {
  taskId: string;
  taskTitle: string;
  stepIndex: number;
  totalSteps: number;
  stepLabel: string;
  progressPercent: number;
  pausedReason?: string;
  pausedAt?: number;
}

export interface UiElementNode {
  text: string;
  contentDesc: string;
  resourceId: string;
  className: string;
  bounds: string;
  centerX: number;
  centerY: number;
  clickable: boolean;
}

export interface DeviceDescriptor {
  id: string;
  serial: string;
  modelName: string;
  manufacturer?: string;
  androidVersion: string;
  locale?: string;
  storageFreeMb?: number;
  installedPackages?: string[];
  driverType: DeviceDriverType;
  status: DeviceConnectionStatus;
  controlMode: DeviceControlMode;
  assignedAgentId?: string;
  assignedDepartment?: string;
  suggestedAgentId?: string;
  batteryPercent: number;
  temperatureC: number;
  screenWidth: number;
  screenHeight: number;
  foregroundPackage: string;
  isStreaming: boolean;
  screenLocked?: boolean;
  adbKeyboardInstalled?: boolean;
  lastScreenshotDataUrl?: string;
  lastOcrTextMasked?: string;
  blockedReason?: string;
  lastError?: string;
  pausedTask?: DeviceTaskCheckpoint | null;
  lastSeenAt: number;
}

export interface DevicePolicy {
  allowedPackages: string[];
  blockedPackages: string[];
  blockedAppLabels?: string[];
  maxActionsPerMinute: number;
  maxContinuousMinutes: number;
  minActionDelayMs?: number;
  maskPasswordAndOtpRegions: boolean;
  requireCeoForInstallApk: boolean;
  stopBatteryBelowPercent: number;
  stopTempAboveC: number;
  logRetentionDays?: number;
  keepAwakeWhileActive?: boolean;
}

export type DeviceCommandAction =
  | 'tap'
  | 'swipe'
  | 'input_text'
  | 'back'
  | 'home'
  | 'open_app'
  | 'screenshot'
  | 'ocr_read'
  | 'find_element'
  | 'wait_for'
  | 'install_apk'
  | 'push_file'
  | 'pull_file';

export interface DeviceCommandRequest {
  deviceId: string;
  agentId: string;
  action: DeviceCommandAction;
  x?: number;
  y?: number;
  x2?: number;
  y2?: number;
  text?: string;
  packageName?: string;
  query?: string;
  timeoutMs?: number;
  localPath?: string;
  remoteSubpath?: string;
  ceoConfirmed?: boolean;
  policy?: DevicePolicy;
}

export interface PlaybookStep {
  action: DeviceCommandAction;
  label?: string;
  packageName?: string;
  x?: number;
  y?: number;
  x2?: number;
  y2?: number;
  text?: string;
  query?: string;
  timeoutMs?: number;
  verifyText?: string;
}

export interface PlaybookRunResult {
  ok: boolean;
  completedSteps: number;
  totalSteps: number;
  pausedForDisconnect?: boolean;
  askCeoOtp?: boolean;
  error?: string;
  stepResults: Array<{
    stepIndex: number;
    label: string;
    ok: boolean;
    error?: string;
  }>;
}

export interface DeviceActionAudit {
  id: string;
  deviceId: string;
  serial: string;
  agentId: string;
  action: string;
  foregroundPackage: string;
  result: 'ok' | 'blocked_policy' | 'blocked_killswitch' | 'blocked_mode' | 'ask_ceo_otp' | 'error';
  reason?: string;
  beforeScreenshotDataUrl?: string;
  afterScreenshotDataUrl?: string;
  timestamp: number;
}

export interface DeviceCommandResult {
  ok: boolean;
  error?: string;
  askCeoOtp?: boolean;
  screenshotDataUrl?: string;
  ocrText?: string;
  elements?: UiElementNode[];
  matchedElement?: UiElementNode | null;
  filePath?: string;
  device?: DeviceDescriptor;
  log?: DeviceActionAudit;
}

export interface AdbDoctorReport {
  nodeVersion: string;
  os: string;
  arch: string;
  adbFound: boolean;
  adbPath: string | null;
  adbVersion: string | null;
  adbSource?: string;
  deviceCount: number;
  devices: Array<{
    id: string;
    serial: string;
    modelName: string;
    status: DeviceConnectionStatus;
    batteryPercent: number;
    temperatureC: number;
    adbKeyboardInstalled: boolean;
  }>;
  troubleshootingTips: string[];
  platformToolsDownload: {
    url: string;
    hint: string;
  };
}

export interface DeviceDriver {
  readonly driverType: DeviceDriverType;
  listDevices(): Promise<DeviceDescriptor[]>;
  getForegroundPackage(serial: string): Promise<string>;
  getTelemetry(serial: string): Promise<{ batteryPercent: number; temperatureC: number }>;
  screenshot(serial: string): Promise<string | undefined>;
  readOcrText(serial: string): Promise<string>;
  tap(serial: string, x: number, y: number): Promise<void>;
  swipe(serial: string, x1: number, y1: number, x2: number, y2: number, durationMs?: number): Promise<void>;
  inputText(serial: string, text: string): Promise<void>;
  keyEvent(serial: string, keyCode: number): Promise<void>;
  openApp(serial: string, packageName: string): Promise<void>;
  findElement?(serial: string, query: string): Promise<UiElementNode[]>;
  waitForElement?(serial: string, query: string, timeoutMs?: number): Promise<UiElementNode | null>;
  installApk?(serial: string, apkPath: string): Promise<void>;
  pushFile?(serial: string, localPath: string, remoteSubpath: string): Promise<string>;
  pullFile?(serial: string, remoteSubpath: string, localPath: string): Promise<string>;
  isScreenLocked?(serial: string): Promise<boolean>;
  keepAwake?(serial: string, enabled: boolean): Promise<void>;
  listInstalledPackages?(serial: string): Promise<string[]>;
}
